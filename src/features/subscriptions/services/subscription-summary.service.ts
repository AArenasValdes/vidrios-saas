import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMercadoPagoChileBillingReady } from "@/features/subscriptions/config/mercadopago-cl.config";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import { resolveOrganizationSubscriptionState } from "@/features/subscriptions/services/subscription-status.service";
import type { OrganizationSubscriptionSnapshot } from "@/features/subscriptions/types/subscription";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function getSubscriptionSummary(
  organizationId: number
): Promise<SubscriptionSummary | null> {
  const admin = createAdminClient() as AnyClient;

  const { data: profile } = (await admin
    .from("organization_profile")
    .select(
      "plan_code, billing_period, payment_method, subscription_status, trial_started_at, trial_ends_at, subscription_started_at, subscription_ends_at, plan_type, founder_price_locked"
    )
    .eq("organization_id", organizationId)
    .single()) as {
    data: Record<string, unknown> | null;
  };

  if (!profile) return null;

  const [{ data: lastPayment }, recurringSubscription] = await Promise.all([
    admin
      .from("pagos_suscripcion")
      .select("amount_clp")
      .eq("organization_id", organizationId)
      .eq("status", "aprobado")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle() as Promise<{ data: Record<string, unknown> | null }>,
    createOrganizationSubscriptionRepository().getLatestByOrganizationId(
      organizationId
    ),
  ]);

  const planCode =
    readOptionalString(profile.plan_code) ?? recurringSubscription?.plan_code ?? null;
  const paymentMethod =
    readOptionalString(profile.payment_method) ??
    recurringSubscription?.provider ??
    null;
  const subscriptionEndsAt =
    recurringSubscription?.current_period_ends_at ??
    readOptionalString(profile.subscription_ends_at) ??
    null;
  const resolvedSubscription = resolveOrganizationSubscriptionState({
    subscriptionStatus: readOptionalString(profile.subscription_status),
    trialStartedAt: readOptionalString(profile.trial_started_at),
    trialEndsAt: readOptionalString(profile.trial_ends_at),
    subscriptionStartedAt: readOptionalString(profile.subscription_started_at),
    subscriptionEndsAt: readOptionalString(profile.subscription_ends_at),
    planType: readOptionalString(profile.plan_type),
    planCode: readOptionalString(profile.plan_code),
    billingPeriod: readOptionalString(profile.billing_period),
    paymentMethod: readOptionalString(profile.payment_method),
    lastPaymentAt: null,
    founderPriceLocked: Boolean(profile.founder_price_locked),
  } as Partial<OrganizationSubscriptionSnapshot>);
  const subscriptionStatus =
    resolvedSubscription.effectiveStatus ??
    readOptionalString(profile.subscription_status) ??
    recurringSubscription?.status ??
    null;

  return {
    planCode,
    planLabel: getPlanLabel(planCode),
    amountClp:
      (typeof lastPayment?.amount_clp === "number"
        ? lastPayment.amount_clp
        : null) ??
      recurringSubscription?.amount ??
      null,
    billingPeriod:
      readOptionalString(profile.billing_period) ??
      recurringSubscription?.billing_period ??
      null,
    paymentMethod,
    subscriptionStatus,
    subscriptionEndsAt,
    recurringProvider: recurringSubscription?.provider ?? null,
    recurringStatus: recurringSubscription?.status ?? null,
    currentPeriodStartsAt: recurringSubscription?.current_period_starts_at ?? null,
    currentPeriodEndsAt: recurringSubscription?.current_period_ends_at ?? null,
    nextPaymentAt: recurringSubscription?.next_payment_at ?? null,
    cancelAtPeriodEnd: recurringSubscription?.cancel_at_period_end ?? false,
    cancelledAt: recurringSubscription?.cancelled_at ?? null,
    canCancelRecurringSubscription:
      recurringSubscription?.provider === "mercadopago" &&
      recurringSubscription.status === "active" &&
      isMercadoPagoChileBillingReady(),
    founderPriceLocked: Boolean(profile.founder_price_locked),
  };
}
