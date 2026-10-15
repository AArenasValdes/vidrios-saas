import "server-only";

import { getMercadoPagoChileConfig, getMercadoPagoChilePlan } from "@/features/subscriptions/config/mercadopago-cl.config";
import { createMercadoPagoClient } from "@/features/subscriptions/providers/mercadopago/mercadopago.client";
import { normalizeMercadoPagoTransactionAmount } from "@/features/subscriptions/providers/mercadopago/mercadopago-amount";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import type { BillingPlanCode } from "@/features/billing/types/plans";

type OrganizationBillingProfile = {
  organization_id: number;
  plan_code: "founder_full" | "quote_only" | "trial" | null;
  billing_period: "monthly" | "yearly" | "none" | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
};

type ManualSubscriptionCandidate = {
  id: number;
  organization_id: number;
  provider: string;
  plan_code: "founder_full" | "quote_only";
  billing_period: "monthly" | "yearly";
  amount: number;
  currency_code: string;
  status: string;
  current_period_ends_at: string | null;
  provider_subscription_id: string | null;
};

const PLAN_BY_PROFILE: Record<string, BillingPlanCode> = {
  "quote_only:monthly": "quote_only_monthly",
  "quote_only:yearly": "quote_only_annual",
  "founder_full:monthly": "founder_monthly",
  "founder_full:yearly": "founder_full_annual",
};

export class MercadoPagoSubscriptionLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercadoPagoSubscriptionLinkError";
  }
}

function sameInstant(first: string | null, second: string | null) {
  if (!first || !second) return false;
  const firstTime = new Date(first).getTime();
  const secondTime = new Date(second).getTime();
  return Number.isFinite(firstTime) && firstTime === secondTime;
}

export async function linkExistingMercadoPagoSubscription(input: {
  organizationId: number;
  providerSubscriptionId: string;
}) {
  if (!Number.isInteger(input.organizationId) || input.organizationId <= 0) {
    throw new MercadoPagoSubscriptionLinkError("Organización no válida.");
  }

  const providerSubscriptionId = input.providerSubscriptionId.trim();
  if (!providerSubscriptionId || providerSubscriptionId.length > 160) {
    throw new MercadoPagoSubscriptionLinkError("ID de suscripción Mercado Pago no válido.");
  }

  const config = getMercadoPagoChileConfig();
  if (!config.accessToken) {
    throw new MercadoPagoSubscriptionLinkError("Mercado Pago no tiene credenciales configuradas.");
  }

  const admin = createAdminClient();
  const { data: profileData, error: profileError } = await admin
    .from("organization_profile")
    .select("organization_id, plan_code, billing_period, subscription_status, subscription_ends_at")
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (profileError) {
    throw new MercadoPagoSubscriptionLinkError("No pudimos leer el plan actual de la organización.");
  }

  const profile = profileData as OrganizationBillingProfile | null;
  if (!profile || profile.subscription_status !== "active" || !profile.subscription_ends_at) {
    throw new MercadoPagoSubscriptionLinkError(
      "Solo se puede vincular una cuenta con un periodo pagado vigente."
    );
  }

  const billingPlanCode = PLAN_BY_PROFILE[`${profile.plan_code}:${profile.billing_period}`];
  if (!billingPlanCode) {
    throw new MercadoPagoSubscriptionLinkError("El plan actual no corresponde a un plan recurrente de Mercado Pago.");
  }

  const billingPlan = getMercadoPagoChilePlan(billingPlanCode);
  if (!billingPlan.providerPlanId) {
    throw new MercadoPagoSubscriptionLinkError("El ID del plan de Mercado Pago no está configurado en Ventora.");
  }

  const { data: rows, error: subscriptionError } = await admin
    .from("suscripciones_organizacion")
    .select("id, organization_id, provider, plan_code, billing_period, amount, currency_code, status, current_period_ends_at, provider_subscription_id")
    .eq("organization_id", input.organizationId)
    .eq("provider", "manual")
    .eq("status", "active")
    .is("eliminado_en", null);

  if (subscriptionError) {
    throw new MercadoPagoSubscriptionLinkError("No pudimos leer el periodo manual vigente.");
  }

  const matchingRows = ((rows ?? []) as ManualSubscriptionCandidate[]).filter((row) =>
    row.plan_code === profile.plan_code &&
    row.billing_period === profile.billing_period &&
    sameInstant(row.current_period_ends_at, profile.subscription_ends_at)
  );

  if (matchingRows.length !== 1) {
    throw new MercadoPagoSubscriptionLinkError(
      matchingRows.length === 0
        ? "No encontramos un único pago manual que corresponda al periodo vigente de esta cuenta."
        : "Hay más de un pago manual para el periodo vigente; revisa la cuenta antes de vincularla."
    );
  }

  const subscription = matchingRows[0];
  const existingById = await createOrganizationSubscriptionRepository()
    .getByProviderSubscriptionId(providerSubscriptionId);
  if (existingById && (existingById.id !== subscription.id || existingById.organization_id !== input.organizationId)) {
    throw new MercadoPagoSubscriptionLinkError("Ese ID de Mercado Pago ya está vinculado a otra cuenta.");
  }

  const resource = await createMercadoPagoClient(config.accessToken)
    .getPreapproval(providerSubscriptionId);
  const amount = normalizeMercadoPagoTransactionAmount(resource.auto_recurring?.transaction_amount);
  const currency = resource.auto_recurring?.currency_id?.trim().toUpperCase();

  if (
    resource.status !== "authorized" ||
    resource.id !== providerSubscriptionId ||
    resource.preapproval_plan_id !== billingPlan.providerPlanId ||
    amount !== subscription.amount ||
    amount !== billingPlan.amount ||
    currency !== "CLP" ||
    currency !== subscription.currency_code
  ) {
    throw new MercadoPagoSubscriptionLinkError(
      "La suscripción de Mercado Pago no coincide con el plan, monto, moneda o estado vigente de esta cuenta."
    );
  }

  const subscriptionId = await createOrganizationSubscriptionRepository()
    .linkActiveManualSubscriptionToMercadoPago({
      subscriptionId: subscription.id,
      providerSubscriptionId: resource.id,
      providerPlanId: billingPlan.providerPlanId,
      providerStatus: resource.status,
      nextPaymentAt: resource.next_payment_date ?? null,
    });

  return {
    subscriptionId,
    providerSubscriptionId: resource.id,
    planLabel: billingPlan.label,
    nextPaymentAt: resource.next_payment_date ?? null,
  };
}
