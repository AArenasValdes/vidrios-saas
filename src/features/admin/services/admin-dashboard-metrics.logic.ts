import type { AdminOrganizationPaymentRow } from "@/features/admin/repositories/admin-clients.repository";

const MS_DAY = 24 * 60 * 60 * 1000;
const SANTIAGO_TIME_ZONE = "America/Santiago";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export type AdminCalendarMonthWindow = {
  start: Date;
  endExclusive: Date;
  previousStart: Date;
  previousEndExclusive: Date;
  label: string;
  previousLabel: string;
};

export type MonthlyCashSummary = {
  collectedClp: number;
  previousMonthCollectedClp: number;
  newSalesClp: number;
  renewalsClp: number;
  newCustomers: number;
  renewalPayments: number;
};

function getSantiagoDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SANTIAGO_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: valueFor("year"),
    month: valueFor("month"),
    day: valueFor("day"),
  };
}

function getSantiagoOffsetMinutes(date: Date) {
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: SANTIAGO_TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = timeZoneName?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;

  const direction = match[1] === "-" ? -1 : 1;
  return direction * (Number(match[2]) * 60 + Number(match[3]));
}

function santiagoMidnightAsUtc(year: number, monthIndex: number) {
  const provisional = new Date(Date.UTC(year, monthIndex, 1));
  return new Date(provisional.getTime() - getSantiagoOffsetMinutes(provisional) * 60_000);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: SANTIAGO_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

function isWithinMonth(iso: string | null, start: Date, endExclusive: Date) {
  if (!iso) return false;
  const value = new Date(iso).getTime();
  return value >= start.getTime() && value < endExclusive.getTime();
}

function paymentDate(payment: AdminOrganizationPaymentRow) {
  return payment.paid_at ?? payment.creado_en;
}

function isApprovedRealPayment(
  payment: AdminOrganizationPaymentRow,
  testOrganizationIds: Set<number>
) {
  return payment.status === "aprobado" && !testOrganizationIds.has(Number(payment.organization_id));
}

function sumPaymentsInMonth(
  payments: AdminOrganizationPaymentRow[],
  testOrganizationIds: Set<number>,
  start: Date,
  endExclusive: Date
) {
  return payments.reduce((total, payment) => {
    if (!isApprovedRealPayment(payment, testOrganizationIds)) return total;
    return isWithinMonth(paymentDate(payment), start, endExclusive)
      ? total + Number(payment.amount_clp ?? 0)
      : total;
  }, 0);
}

export function resolveSantiagoCalendarMonth(now = new Date()): AdminCalendarMonthWindow {
  const parts = getSantiagoDateParts(now);
  const start = santiagoMidnightAsUtc(parts.year, parts.month - 1);
  const endExclusive = santiagoMidnightAsUtc(parts.year, parts.month);
  const previousStart = santiagoMidnightAsUtc(parts.year, parts.month - 2);

  return {
    start,
    endExclusive,
    previousStart,
    previousEndExclusive: start,
    label: formatMonthLabel(now),
    previousLabel: formatMonthLabel(new Date(previousStart.getTime() + MS_DAY)),
  };
}

export function buildMonthlyCashSummary(input: {
  payments: AdminOrganizationPaymentRow[];
  testOrganizationIds: Set<number>;
  month: AdminCalendarMonthWindow;
}): MonthlyCashSummary {
  const validPayments = input.payments.filter((payment) =>
    isApprovedRealPayment(payment, input.testOrganizationIds)
  );
  const firstPaymentIdByOrganization = new Map<number, string>();

  for (const payment of [...validPayments].sort(
    (left, right) => new Date(paymentDate(left)).getTime() - new Date(paymentDate(right)).getTime()
  )) {
    const organizationId = Number(payment.organization_id);
    if (!firstPaymentIdByOrganization.has(organizationId)) {
      firstPaymentIdByOrganization.set(organizationId, String(payment.id));
    }
  }

  let newSalesClp = 0;
  let renewalsClp = 0;
  let newCustomers = 0;
  let renewalPayments = 0;

  for (const payment of validPayments) {
    if (!isWithinMonth(paymentDate(payment), input.month.start, input.month.endExclusive)) continue;

    if (firstPaymentIdByOrganization.get(Number(payment.organization_id)) === String(payment.id)) {
      newSalesClp += Number(payment.amount_clp ?? 0);
      newCustomers += 1;
    } else {
      renewalsClp += Number(payment.amount_clp ?? 0);
      renewalPayments += 1;
    }
  }

  return {
    collectedClp: newSalesClp + renewalsClp,
    previousMonthCollectedClp: sumPaymentsInMonth(
      input.payments,
      input.testOrganizationIds,
      input.month.previousStart,
      input.month.previousEndExclusive
    ),
    newSalesClp,
    renewalsClp,
    newCustomers,
    renewalPayments,
  };
}
