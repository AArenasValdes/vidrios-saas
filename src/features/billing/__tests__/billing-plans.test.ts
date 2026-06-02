import { BILLING_PLANS } from "@/features/billing/types/plans";

describe("billing plans", () => {
  it("mantiene precios oficiales de planes anuales Flow v1", () => {
    expect(BILLING_PLANS.founder_full_annual).toMatchObject({
      subscriptionPlanCode: "founder_full",
      billingPeriod: "yearly",
      amountClp: 79990,
      durationMonths: 12,
      checkoutEnabled: true,
    });
    expect(BILLING_PLANS.quote_only_annual).toMatchObject({
      subscriptionPlanCode: "quote_only",
      billingPeriod: "yearly",
      amountClp: 59990,
      durationMonths: 12,
      checkoutEnabled: true,
    });
  });

  it("deja founder_monthly fuera de checkout automatico", () => {
    expect(BILLING_PLANS.founder_monthly).toMatchObject({
      billingPeriod: "monthly",
      amountClp: 8990,
      durationMonths: 1,
      checkoutEnabled: false,
    });
  });
});
