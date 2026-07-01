import {
  buildWeeklyConfirmedRevenue,
  type RevenuePaymentInput,
} from "@/features/admin/services/admin-payments-revenue.service";

describe("admin-payments-revenue.service", () => {
  const testOrgIds = new Set<number>();
  const referenceNow = new Date("2026-06-27T15:00:00.000Z");

  const payments: RevenuePaymentInput[] = [
    {
      status: "aprobado",
      organization_id: 1,
      amount_clp: 79990,
      paid_at: "2026-06-08T12:00:00.000Z",
      creado_en: "2026-06-08T12:00:00.000Z",
    },
    {
      status: "aprobado",
      organization_id: 2,
      amount_clp: 8990,
      paid_at: "2026-06-15T12:00:00.000Z",
      creado_en: "2026-06-15T12:00:00.000Z",
    },
    {
      status: "aprobado",
      organization_id: 3,
      amount_clp: 59990,
      paid_at: "2026-06-15T14:00:00.000Z",
      creado_en: "2026-06-15T14:00:00.000Z",
    },
    {
      status: "aprobado",
      organization_id: 4,
      amount_clp: 8990,
      paid_at: "2026-06-15T16:00:00.000Z",
      creado_en: "2026-06-15T16:00:00.000Z",
    },
    {
      status: "aprobado",
      organization_id: 5,
      amount_clp: 8990,
      paid_at: "2026-06-19T12:00:00.000Z",
      creado_en: "2026-06-19T12:00:00.000Z",
    },
    {
      status: "pendiente",
      organization_id: 6,
      amount_clp: 50000,
      paid_at: null,
      creado_en: "2026-06-16T12:00:00.000Z",
    },
  ];

  it("agrupa ingresos confirmados por semana calendario Chile", () => {
    const result = buildWeeklyConfirmedRevenue(payments, testOrgIds, 30, referenceNow);
    const byLabel = Object.fromEntries(
      result.buckets.map((item) => [item.label.replace(/\./g, ""), item.amountClp])
    );

    expect(byLabel["7 jun"]).toBe(79990);
    expect(byLabel["14 jun"]).toBe(86960);
    expect(byLabel["21 jun"]).toBe(0);
    expect(result.buckets.some((item) => item.label.replace(/\./g, "") === "28 jun")).toBe(false);
  });

  it("resume total del período y cantidad de pagos confirmados", () => {
    const result = buildWeeklyConfirmedRevenue(payments, testOrgIds, 30, referenceNow);

    expect(result.summary.totalClp).toBe(166950);
    expect(result.summary.confirmedCount).toBe(5);
  });

  it("excluye pagos pendientes y cuentas de prueba", () => {
    const withTest = buildWeeklyConfirmedRevenue(
      [
        ...payments,
        {
          status: "aprobado",
          organization_id: 99,
          amount_clp: 100000,
          paid_at: "2026-06-10T12:00:00.000Z",
          creado_en: "2026-06-10T12:00:00.000Z",
        },
      ],
      new Set([99]),
      30,
      referenceNow
    );

    expect(withTest.summary.totalClp).toBe(166950);
    expect(withTest.summary.confirmedCount).toBe(5);
  });
});
