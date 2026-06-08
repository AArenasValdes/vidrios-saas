import "server-only";

import {
  activateOrganizationSubscriptionFromPayment,
  buildBillingPeriod,
} from "@/features/billing/services/billing-subscription.service";
import {
  BILLING_PLANS,
  type BillingPlanCode,
  isBillingPlanCode,
} from "@/features/billing/types/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PagoSuscripcionRow } from "@/features/subscriptions/types/pago-suscripcion";

export class ManualPaymentActivationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualPaymentActivationError";
  }
}

function buildManualBuyOrder(organizationId: number, planCode: BillingPlanCode) {
  const stamp = Date.now();
  return `manual-${organizationId}-${planCode}-${stamp}`;
}

export async function activateManualOrganizationPayment(input: {
  organizationId: number;
  planCode: BillingPlanCode;
  reference?: string | null;
  paidAt?: Date;
}) {
  if (!Number.isInteger(input.organizationId) || input.organizationId <= 0) {
    throw new ManualPaymentActivationError("organization_id invalido.");
  }

  if (!isBillingPlanCode(input.planCode)) {
    throw new ManualPaymentActivationError("Plan no valido.");
  }

  const plan = BILLING_PLANS[input.planCode];
  const paidAt = input.paidAt ?? new Date();
  const period = buildBillingPeriod({ plan, paidAt });
  const admin = createAdminClient();

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id, eliminado_en")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (organizationError) {
    throw new ManualPaymentActivationError(
      `No pudimos validar la organizacion: ${organizationError.message}`
    );
  }

  if (!organization || organization.eliminado_en) {
    throw new ManualPaymentActivationError("La organizacion no existe.");
  }

  const buyOrder = buildManualBuyOrder(input.organizationId, input.planCode);
  const providerResponse = {
    source: "manual_transfer",
    reference: input.reference?.trim() || null,
    activated_at: paidAt.toISOString(),
  };

  const { data: payment, error: paymentError } = await admin
    .from("pagos_suscripcion")
    .insert({
      organization_id: input.organizationId,
      plan_code: plan.subscriptionPlanCode,
      billing_period: plan.billingPeriod,
      amount_clp: plan.amountClp,
      currency: "CLP",
      payment_provider: "manual_transfer",
      provider_status: "manual_approved",
      provider_response: providerResponse,
      buy_order: buyOrder,
      status: "aprobado",
      paid_at: period.paidAt,
      period_starts_at: period.periodStartsAt,
      period_ends_at: period.periodEndsAt,
    })
    .select("*")
    .single();

  if (paymentError || !payment) {
    throw new ManualPaymentActivationError(
      `No pudimos registrar el pago: ${paymentError?.message ?? "sin respuesta"}`
    );
  }

  await activateOrganizationSubscriptionFromPayment(
    payment as PagoSuscripcionRow
  );

  return {
    paymentId: Number(payment.id),
    organizationId: input.organizationId,
    planCode: input.planCode,
    amountClp: plan.amountClp,
    periodEndsAt: period.periodEndsAt,
    buyOrder,
  };
}

export async function extendOrganizationTrial(input: {
  organizationId: number;
  extraDays?: number;
}) {
  const extraDays = input.extraDays ?? 7;

  if (!Number.isInteger(input.organizationId) || input.organizationId <= 0) {
    throw new ManualPaymentActivationError("organization_id invalido.");
  }

  if (!Number.isInteger(extraDays) || extraDays <= 0 || extraDays > 30) {
    throw new ManualPaymentActivationError(
      "extraDays debe estar entre 1 y 30."
    );
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("organization_profile")
    .select(
      "organization_id, subscription_status, trial_ends_at, plan_code, subscription_ends_at"
    )
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (profileError) {
    throw new ManualPaymentActivationError(
      `No pudimos leer el perfil: ${profileError.message}`
    );
  }

  if (!profile) {
    throw new ManualPaymentActivationError("La organizacion no tiene perfil.");
  }

  if (
    profile.subscription_status === "active" &&
    profile.subscription_ends_at &&
    new Date(profile.subscription_ends_at).getTime() > Date.now()
  ) {
    throw new ManualPaymentActivationError(
      "La cuenta ya tiene una suscripcion activa pagada."
    );
  }

  const currentTrialEnd = profile.trial_ends_at
    ? new Date(profile.trial_ends_at)
    : new Date();
  const base =
    currentTrialEnd.getTime() > Date.now() ? currentTrialEnd : new Date();
  const nextTrialEnd = new Date(base);
  nextTrialEnd.setUTCDate(nextTrialEnd.getUTCDate() + extraDays);

  const { error: updateError } = await admin
    .from("organization_profile")
    .update({
      subscription_status: "trial_active",
      plan_code: "trial",
      plan_type: "trial",
      billing_period: "none",
      payment_method: "none",
      trial_ends_at: nextTrialEnd.toISOString(),
      actualizado_en: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId);

  if (updateError) {
    throw new ManualPaymentActivationError(
      `No pudimos extender el trial: ${updateError.message}`
    );
  }

  return {
    organizationId: input.organizationId,
    trialEndsAt: nextTrialEnd.toISOString(),
    extraDays,
  };
}
