import type { EffectiveSubscriptionState } from "@/features/subscriptions/types/subscription";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";

export function resolveSubscriptionPlanLabel(input: {
  planCode?: string | null;
  billingPeriod?: string | null;
  planType?: string | null;
}) {
  if (input.planCode === "quote_only") {
    return input.billingPeriod === "monthly"
      ? "Ventora Cotización Mensual"
      : "Ventora Cotización Anual";
  }

  if (input.planCode === "founder_full") {
    if (input.billingPeriod === "monthly" || input.planType === "monthly") {
      return "Ventora Comercial Mensual";
    }

    return "Ventora Comercial Anual";
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
