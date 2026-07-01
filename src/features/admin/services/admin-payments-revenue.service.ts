import type { AdminRevenuePeriodItem } from "@/features/admin/types/admin-payments";

const CL_TZ = "America/Santiago";

export type RevenuePaymentInput = {
  status: string;
  organization_id: number | string;
  amount_clp: number | string | null;
  paid_at: string | null;
  creado_en: string;
  eliminado_en?: string | null;
};

export type WeeklyRevenueSummary = {
  totalClp: number;
  confirmedCount: number;
};

export type WeeklyRevenueResult = {
  buckets: AdminRevenuePeriodItem[];
  summary: WeeklyRevenueSummary;
};

type SantiagoDateParts = {
  year: number;
  month: number;
  day: number;
};

function getSantiagoParts(instant: Date): SantiagoDateParts {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: CL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

function toDateKey(parts: SantiagoDateParts) {
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

function addDays(parts: SantiagoDateParts, days: number): SantiagoDateParts {
  const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return {
    year: anchor.getUTCFullYear(),
    month: anchor.getUTCMonth() + 1,
    day: anchor.getUTCDate(),
  };
}

function startOfWeekSunday(parts: SantiagoDateParts): SantiagoDateParts {
  const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  return addDays(parts, -anchor.getUTCDay());
}

function formatShortDate(parts: SantiagoDateParts) {
  const labelDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: CL_TZ,
    day: "numeric",
    month: "short",
  }).format(labelDate);
}

function formatClp(value: number) {
  return `$${value.toLocaleString("es-CL")}`;
}

function resolvePaymentDateParts(payment: RevenuePaymentInput): SantiagoDateParts | null {
  const iso = payment.paid_at ?? payment.creado_en;
  if (!iso) {
    return null;
  }

  return getSantiagoParts(new Date(iso));
}

function isConfirmedPayment(payment: RevenuePaymentInput, testOrgIds: Set<number>) {
  if (payment.eliminado_en) {
    return false;
  }

  if (payment.status !== "aprobado") {
    return false;
  }

  return !testOrgIds.has(Number(payment.organization_id));
}

export function buildWeeklyConfirmedRevenue(
  payments: RevenuePaymentInput[],
  testOrgIds: Set<number>,
  periodDays: number,
  now: Date = new Date()
): WeeklyRevenueResult {
  const periodEndParts = getSantiagoParts(now);
  const periodStartParts = addDays(periodEndParts, -Math.max(1, periodDays));
  const periodStartKey = toDateKey(periodStartParts);
  const periodEndKey = toDateKey(periodEndParts);

  const weekStarts: SantiagoDateParts[] = [];
  let cursor = startOfWeekSunday(periodStartParts);

  while (toDateKey(cursor) <= periodEndKey) {
    weekStarts.push(cursor);
    cursor = addDays(cursor, 7);
  }

  const bucketMap = new Map<
    number,
    { amountClp: number; paymentCount: number; weekStart: SantiagoDateParts }
  >();

  for (const weekStart of weekStarts) {
    bucketMap.set(toDateKey(weekStart), {
      amountClp: 0,
      paymentCount: 0,
      weekStart,
    });
  }

  let totalClp = 0;
  let confirmedCount = 0;

  for (const payment of payments) {
    if (!isConfirmedPayment(payment, testOrgIds)) {
      continue;
    }

    const paymentParts = resolvePaymentDateParts(payment);
    if (!paymentParts) {
      continue;
    }

    const paymentKey = toDateKey(paymentParts);
    if (paymentKey < periodStartKey || paymentKey > periodEndKey) {
      continue;
    }

    const weekStart = startOfWeekSunday(paymentParts);
    const weekKey = toDateKey(weekStart);
    const bucket = bucketMap.get(weekKey);

    if (!bucket) {
      continue;
    }

    const amount = Number(payment.amount_clp ?? 0);
    bucket.amountClp += amount;
    bucket.paymentCount += 1;
    totalClp += amount;
    confirmedCount += 1;
  }

  const buckets: AdminRevenuePeriodItem[] = weekStarts.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const bucket = bucketMap.get(toDateKey(weekStart)) ?? {
      amountClp: 0,
      paymentCount: 0,
      weekStart,
    };

    return {
      id: `week-${toDateKey(weekStart)}`,
      label: formatShortDate(weekStart),
      weekStartLabel: formatShortDate(weekStart),
      weekEndLabel: formatShortDate(weekEnd),
      amountClp: bucket.amountClp,
      paymentCount: bucket.paymentCount,
    };
  });

  return {
    buckets,
    summary: {
      totalClp,
      confirmedCount,
    },
  };
}

export function buildRevenueChartScaleMax(buckets: AdminRevenuePeriodItem[], headroomPct = 12) {
  const maxAmount = Math.max(...buckets.map((item) => item.amountClp), 0);
  if (maxAmount <= 0) {
    return 0;
  }

  return maxAmount * (1 + headroomPct / 100);
}

export function formatRevenueBarHeight(amountClp: number, scaleMax: number) {
  if (amountClp <= 0 || scaleMax <= 0) {
    return 0;
  }

  return Math.min(100, (amountClp / scaleMax) * 100);
}

export function formatWeeklyRevenueTooltip(item: AdminRevenuePeriodItem) {
  const range = `${item.weekStartLabel} – ${item.weekEndLabel}`;
  const total = formatClp(item.amountClp);
  const countLabel =
    item.paymentCount === 1
      ? "1 pago confirmado"
      : `${item.paymentCount} pagos confirmados`;

  return `${range}\nTotal cobrado: ${total}\n${countLabel}`;
}
