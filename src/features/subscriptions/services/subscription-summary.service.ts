import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMercadoPagoChileBillingReady } from "@/features/subscriptions/config/mercadopago-cl.config";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import { resolveOrganizationSubscriptionState } from "@/features/subscriptions/services/subscription-status.service";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

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
    (profile.plan_code as string) ?? recurringSubscription?.plan_code ?? null;
  const paymentMethod =
    (profile.payment_method as string) ?? recurringSubscription?.provider ?? null;
  const subscriptionEndsAt =
    recurringSubscription?.current_period_ends_at ??
    (profile.subscription_ends_at as string) ??
    null;
  const resolvedSubscription = resolveOrganizationSubscriptionState({
    subscriptionStatus: (profile.subscription_status as string) ?? null,
    trialStartedAt: (profile.trial_started_at as string) ?? null,
    trialEndsAt: (profile.trial_ends_at as string) ?? null,
    subscriptionStartedAt: (profile.subscription_started_at as string) ?? null,
    subscriptionEndsAt: (profile.subscription_ends_at as string) ?? null,
    planType: (profile.plan_type as string) ?? null,
    planCode: (profile.plan_code as string) ?? null,
    billingPeriod: (profile.billing_period as string) ?? null,
    paymentMethod: (profile.payment_method as string) ?? null,
    lastPaymentAt: null,
    founderPriceLocked: (profile.founder_price_locked as boolean) ?? false,
  });
  const subscriptionStatus =
    resolvedSubscription.effectiveStatus ??
    (profile.subscription_status as string) ??
    recurringSubscription?.status ??
    null;

  return {
    planCode,
    planLabel: getPlanLabel(planCode),
    amountClp:
      (lastPayment?.amount_clp as number) ?? recurringSubscription?.amount ?? null,
    billingPeriod:
      (profile.billing_period as string) ?? recurringSubscription?.billing_period ?? null,
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
    founderPriceLocked: (profile.founder_price_locked as boolean) ?? false,
  };
}
