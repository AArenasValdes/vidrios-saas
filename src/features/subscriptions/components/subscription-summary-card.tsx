"use client";

import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";

import s from "./subscription-summary-card.module.css";

function formatClp(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  trial_active: "Prueba activa",
  trial_expiring: "Prueba por vencer",
  trial_expired: "Prueba vencida",
  past_due: "Vencida",
  cancelled: "Cancelada",
};

function getStatusLabel(status: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status;
}

const STATUS_CLASSES: Record<string, string> = {
  active: s.statusActive,
  trial_active: s.statusActive,
  trial_expiring: s.statusWarning,
  trial_expired: s.statusExpired,
  past_due: s.statusExpired,
  cancelled: s.statusExpired,
};

function getStatusClass(status: string | null): string {
  if (!status) return s.statusNeutral;
  return STATUS_CLASSES[status] ?? s.statusNeutral;
}

const PAYMENT_LABELS: Record<string, string> = {
  webpay_plus: "Webpay Plus",
  manual_transfer: "Transferencia",
  manual_other: "Otro",
  none: "—",
};

function getPaymentLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_LABELS[method] ?? method;
}

export function SubscriptionSummaryCard({
  summary,
}: {
  summary: SubscriptionSummary | null;
}) {
  if (!summary) return null;

  return (
    <article className={s.card}>
      <span className={s.eyebrow}>Plan actual</span>

      <div className={s.body}>
        <strong className={s.planName}>{summary.planLabel}</strong>

        <div className={s.meta}>
          {summary.amountClp ? (
            <span className={s.amount}>{formatClp(summary.amountClp)}</span>
          ) : null}
          <span className={s.payment}>
            {getPaymentLabel(summary.paymentMethod)}
          </span>
          <span className={`${s.status} ${getStatusClass(summary.subscriptionStatus)}`}>
            {getStatusLabel(summary.subscriptionStatus)}
          </span>
        </div>

        <div className={s.dates}>
          <span className={s.dateLabel}>Vence:</span>
          <span>{formatDate(summary.subscriptionEndsAt)}</span>
        </div>

        {summary.founderPriceLocked ? (
          <p className={s.locked}>Precio fundador bloqueado</p>
        ) : null}
      </div>
    </article>
  );
}
