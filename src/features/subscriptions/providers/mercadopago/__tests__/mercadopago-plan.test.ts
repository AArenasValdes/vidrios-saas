import { buildPendingAutoRecurringFromPlan, readMercadoPagoPlanAmount } from "../mercadopago-plan";

describe("Mercado Pago plan helpers", () => {
  it("usa fallback mensual cuando el plan del panel no trae auto_recurring", () => {
    expect(
      buildPendingAutoRecurringFromPlan(
        { id: "plan-1", status: "active" },
        {
          amount: 8_990,
          currency: "CLP",
          billingPeriod: "monthly",
        }
      )
    ).toEqual({
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 8_990,
      currency_id: "CLP",
    });
  });

  it("normaliza planes anuales del panel a 12 meses", () => {
    expect(
      buildPendingAutoRecurringFromPlan(
        {
          id: "plan-annual",
          status: "active",
          auto_recurring: {
            frequency: 1,
            frequency_type: "years",
            transaction_amount: "79990",
            currency_id: "CLP",
          },
        },
        {
          amount: 79_990,
          currency: "CLP",
          billingPeriod: "yearly",
        }
      )
    ).toEqual({
      frequency: 12,
      frequency_type: "months",
      transaction_amount: 79_990,
      currency_id: "CLP",
    });
  });

  it("lee montos string del plan real de Mercado Pago", () => {
    expect(
      readMercadoPagoPlanAmount({
        id: "plan-1",
        auto_recurring: { transaction_amount: "8990" },
      })
    ).toBe(8_990);
  });
});
