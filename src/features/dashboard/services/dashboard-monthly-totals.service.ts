export type DashboardMonthBucket = {
  key: string;
  label: string;
  startIso: string;
  endIso: string;
};

export type DashboardMonthlyQuotedPoint = {
  key: string;
  label: string;
  total: number;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Últimos N meses calendario (incluye el mes actual), del más antiguo al más reciente. */
export function buildLastMonthBuckets(count: number, now = new Date()): DashboardMonthBucket[] {
  const safeCount = Math.max(1, Math.min(12, Math.floor(count)));
  const currentMonth = startOfMonth(now);
  const buckets: DashboardMonthBucket[] = [];

  for (let offset = safeCount - 1; offset >= 0; offset -= 1) {
    const start = addMonths(currentMonth, -offset);
    const end = addMonths(start, 1);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("es-CL", { month: "short" })
      .format(start)
      .replace(".", "")
      .slice(0, 3);

    buckets.push({
      key,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
  }

  return buckets;
}

export function hasMeaningfulMonthlyTrend(points: DashboardMonthlyQuotedPoint[]): boolean {
  return points.some((point) => point.total > 0);
}
