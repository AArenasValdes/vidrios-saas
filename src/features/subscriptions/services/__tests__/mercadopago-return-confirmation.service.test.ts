import {
  isPaidSubscriptionActivated,
  resolveSubscriptionPlanLabel,
} from "@/features/subscriptions/services/mercadopago-return-confirmation.service";
import type { EffectiveSubscriptionState } from "@/features/subscriptions/types/subscription";

function subscription(
  overrides: Partial<EffectiveSubscriptionState> = {}
): EffectiveSubscriptionState {
  return {
    subscriptionStatus: "active",
    trialStartedAt: null,
    trialEndsAt: null,
    subscriptionStartedAt: "2026-08-14T00:00:00.000Z",
    subscriptionEndsAt: null,
    planType: "monthly",
    planCode: "founder_full",
    billingPeriod: "monthly",
    paymentMethod: "mercadopago",
    lastPaymentAt: "2026-08-14T00:00:00.000Z",
    founderPriceLocked: false,
    effectiveStatus: "active",
    isConfigured: true,
    isActive: true,
    isTrial: false,
    isExpiringSoon: false,
    isExpired: false,
    isWriteBlocked: false,
    daysRemaining: null,
    isLastTrialDay: false,
    shouldShowTrialBanner: false,
    shouldShowExpiredBanner: false,
    isInPaymentGracePeriod: false,
    paymentGraceEndsAt: null,
    ...overrides,
  };
}

describe("mercadopago return confirmation", () => {
  it("resuelve el label mensual de founder full", () => {
    expect(
      resolveSubscriptionPlanLabel({
        planCode: "founder_full",
        billingPeriod: "monthly",
        planType: "monthly",
      })
    ).toBe("Founder Mensual");
  });

  it("resuelve el label anual de founder full", () => {
    expect(
      resolveSubscriptionPlanLabel({
        planCode: "founder_full",
        billingPeriod: "yearly",
        planType: "founder",
      })
    ).toBe("Founder Full Anual");
  });

  it("detecta suscripcion pagada activa", () => {
    expect(isPaidSubscriptionActivated(subscription())).toBe(true);
    expect(
      isPaidSubscriptionActivated(
        subscription({ effectiveStatus: "trial_expired", isWriteBlocked: true })
      )
    ).toBe(false);
  });
});
