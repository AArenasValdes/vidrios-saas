import { BILLING_PLANS } from "@/features/billing/types/plans";

describe("billing plans", () => {
  it("expone las cuatro variantes oficiales V2", () => {
    expect(BILLING_PLANS.founder_full_annual).toMatchObject({
      subscriptionPlanCode: "founder_full",
      billingPeriod: "yearly",
      amountClp: 89990,
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
    expect(BILLING_PLANS.founder_monthly).toMatchObject({
      billingPeriod: "monthly",
      amountClp: 9990,
      durationMonths: 1,
      checkoutEnabled: true,
    });
    expect(BILLING_PLANS.quote_only_monthly).toMatchObject({
      billingPeriod: "monthly",
      amountClp: 6990,
      durationMonths: 1,
      checkoutEnabled: true,
    });
  });

  it("calcula equivalentes, ahorros y badges anuales", () => {
    expect(Math.round(BILLING_PLANS.quote_only_annual.amountClp / 12)).toBe(4999);
    expect(6990 * 12 - 59990).toBe(23890);
    expect(Math.round((23890 / (6990 * 12)) * 100)).toBe(28);
    expect(Math.round(BILLING_PLANS.founder_full_annual.amountClp / 12)).toBe(7499);
    expect(9990 * 12 - 89990).toBe(29890);
    expect(Math.round((29890 / (9990 * 12)) * 100)).toBe(25);
  });
});
