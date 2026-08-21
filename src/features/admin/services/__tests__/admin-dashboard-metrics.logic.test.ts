import type { AdminOrganizationPaymentRow } from "@/features/admin/repositories/admin-clients.repository";
import {
  buildMonthlyCashSummary,
  resolveSantiagoCalendarMonth,
} from "@/features/admin/services/admin-dashboard-metrics.logic";

function payment(input: Partial<AdminOrganizationPaymentRow> & Pick<AdminOrganizationPaymentRow, "id" | "organization_id" | "amount_clp" | "paid_at">): AdminOrganizationPaymentRow {
  return {
    id: input.id,
    organization_id: input.organization_id,
    amount_clp: input.amount_clp,
    paid_at: input.paid_at,
    plan_code: "founder_full",
    billing_period: "monthly",
    currency: "CLP",
    payment_provider: "manual_transfer",
    provider_status: null,
    status: "aprobado",
    period_starts_at: null,
    period_ends_at: null,
    creado_en: input.paid_at ?? "2026-08-01T12:00:00.000Z",
    buy_order: null,
    eliminado_en: null,
    ...input,
  };
}

describe("admin-dashboard-metrics.logic", () => {
  it("separa caja de mes calendario, ventas nuevas y renovaciones", () => {
    const month = resolveSantiagoCalendarMonth(new Date("2026-08-21T18:00:00.000Z"));
    const summary = buildMonthlyCashSummary({
      month,
      testOrganizationIds: new Set([99]),
      payments: [
        payment({ id: 1, organization_id: 10, amount_clp: 79_990, paid_at: "2026-07-22T16:00:00.000Z" }),
        payment({ id: 2, organization_id: 10, amount_clp: 8_990, paid_at: "2026-08-01T16:00:00.000Z" }),
        payment({ id: 3, organization_id: 11, amount_clp: 79_990, paid_at: "2026-08-10T16:00:00.000Z" }),
        payment({ id: 4, organization_id: 99, amount_clp: 79_990, paid_at: "2026-08-12T16:00:00.000Z" }),
      ],
    });

    expect(summary).toMatchObject({
      collectedClp: 88_980,
      previousMonthCollectedClp: 79_990,
      newSalesClp: 79_990,
      renewalsClp: 8_990,
      newCustomers: 1,
      renewalPayments: 1,
    });
  });
});
