import type { AdminOrganizationProfileRow } from "@/features/admin/repositories/admin-clients.repository";
import type { OrganizationSubscriptionSnapshot } from "@/features/subscriptions/types/subscription";

export function mapAdminProfileSubscription(
  profile: AdminOrganizationProfileRow | null
): OrganizationSubscriptionSnapshot | null {
  if (!profile) {
    return null;
  }

  return {
    subscriptionStatus: (profile.subscription_status ??
      null) as OrganizationSubscriptionSnapshot["subscriptionStatus"],
    trialStartedAt: profile.trial_started_at ?? null,
    trialEndsAt: profile.trial_ends_at ?? null,
    subscriptionStartedAt: profile.subscription_started_at ?? null,
    subscriptionEndsAt: profile.subscription_ends_at ?? null,
    planType: (profile.plan_type ??
      null) as OrganizationSubscriptionSnapshot["planType"],
    planCode: (profile.plan_code ??
      null) as OrganizationSubscriptionSnapshot["planCode"],
    billingPeriod: (profile.billing_period ??
      null) as OrganizationSubscriptionSnapshot["billingPeriod"],
    paymentMethod: (profile.payment_method ??
      null) as OrganizationSubscriptionSnapshot["paymentMethod"],
    lastPaymentAt: profile.last_payment_at ?? null,
    founderPriceLocked: profile.founder_price_locked ?? false,
  };
}
