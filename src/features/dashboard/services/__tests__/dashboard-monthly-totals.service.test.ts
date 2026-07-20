import {
  buildLastMonthBuckets,
  hasMeaningfulMonthlyTrend,
} from "@/features/dashboard/services/dashboard-monthly-totals.service";

describe("dashboard-monthly-totals.service", () => {
  it("arma 6 buckets consecutivos terminando en el mes actual", () => {
    const buckets = buildLastMonthBuckets(6, new Date("2026-07-18T12:00:00.000Z"));

    expect(buckets).toHaveLength(6);
    expect(buckets[0]?.key).toBe("2026-02");
    expect(buckets[5]?.key).toBe("2026-07");
    expect(buckets[5]?.startIso).toBe(new Date(2026, 6, 1).toISOString());
  });

  it("detecta tendencia con al menos un mes con valor", () => {
    expect(
      hasMeaningfulMonthlyTrend([
        { key: "2026-06", label: "Jun", total: 0 },
        { key: "2026-07", label: "Jul", total: 1200 },
      ])
    ).toBe(true);
    expect(
      hasMeaningfulMonthlyTrend([{ key: "2026-07", label: "Jul", total: 0 }])
    ).toBe(false);
  });
});
