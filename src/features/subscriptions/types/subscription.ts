export type SubscriptionStatus =
  | "trial_active"
  | "trial_expiring"
  | "trial_expired"
  | "active"
  | "past_due"
  | "cancelled";

export type PlanType = "trial" | "monthly" | "yearly" | "founder";
export type BillingPeriod = "monthly" | "yearly" | "none";
export type PaymentMethod = "manual_transfer" | "manual_other" | "none";

export type OrganizationSubscriptionSnapshot = {
  subscriptionStatus: SubscriptionStatus | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  planType: PlanType | null;
  billingPeriod: BillingPeriod | null;
  paymentMethod: PaymentMethod | null;
  lastPaymentAt: string | null;
  founderPriceLocked: boolean;
};

export type EffectiveSubscriptionState = OrganizationSubscriptionSnapshot & {
  effectiveStatus: SubscriptionStatus;
  isConfigured: boolean;
  isActive: boolean;
  isTrial: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
  isWriteBlocked: boolean;
  daysRemaining: number | null;
  isLastTrialDay: boolean;
  shouldShowTrialBanner: boolean;
  shouldShowExpiredBanner: boolean;
};
