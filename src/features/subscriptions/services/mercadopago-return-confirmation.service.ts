import type { EffectiveSubscriptionState } from "@/features/subscriptions/types/subscription";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";

export function resolveSubscriptionPlanLabel(input: {
  planCode?: string | null;
  billingPeriod?: string | null;
  planType?: string | null;
}) {
  if (input.planCode === "quote_only") {
    return getPlanLabel("quote_only");
  }

  if (input.planCode === "founder_full") {
    if (input.billingPeriod === "monthly" || input.planType === "monthly") {
      return "Founder Mensual";
    }

    return "Founder Full Anual";
  }

  return getPlanLabel(input.planCode);
}

export function isPaidSubscriptionActivated(
  subscription: EffectiveSubscriptionState | null | undefined
) {
  if (!subscription) {
    return false;
  }

  return (
    subscription.effectiveStatus === "active" &&
    !subscription.isWriteBlocked &&
    subscription.planCode !== "trial"
  );
}
