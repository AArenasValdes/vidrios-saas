"use client";

import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";

import s from "./subscription-detail.module.css";

function formatClp(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
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

const STATUS_CLASSES: Record<string, string> = {
  active: s.statusActive,
  trial_active: s.statusActive,
  trial_expiring: s.statusWarning,
  trial_expired: s.statusExpired,
  past_due: s.statusExpired,
  cancelled: s.statusExpired,
};

const PAYMENT_LABELS: Record<string, string> = {
  webpay_plus: "Webpay Plus",
  manual_transfer: "Transferencia manual",
  manual_other: "Otro",
  none: "—",
};

export function SubscriptionDetail({
  summary,
}: {
  summary: SubscriptionSummary | null;
}) {
  if (!summary) {
    return <p className={s.empty}>No hay informacion de suscripcion.</p>;
  }

  const statusLabel = summary.subscriptionStatus
    ? STATUS_LABELS[summary.subscriptionStatus] ?? summary.subscriptionStatus
    : "—";
  const statusClass = summary.subscriptionStatus
    ? STATUS_CLASSES[summary.subscriptionStatus] ?? s.statusNeutral
    : s.statusNeutral;
  const paymentLabel = summary.paymentMethod
    ? PAYMENT_LABELS[summary.paymentMethod] ?? summary.paymentMethod
    : "—";

  return (
    <div className={s.detail}>
      <div className={s.row}>
        <span className={s.label}>Plan</span>
        <strong className={s.value}>{summary.planLabel}</strong>
      </div>

      <div className={s.row}>
        <span className={s.label}>Monto pagado</span>
        <span className={s.value}>
          {summary.amountClp ? formatClp(summary.amountClp) : "—"}
        </span>
      </div>

      <div className={s.row}>
        <span className={s.label}>Estado</span>
        <span className={`${s.statusBadge} ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className={s.row}>
        <span className={s.label}>Metodo de pago</span>
        <span className={s.value}>{paymentLabel}</span>
      </div>

      <div className={s.row}>
        <span className={s.label}>Ultimo pago</span>
        <span className={s.value}>
          {formatDate(summary.subscriptionEndsAt)}
        </span>
      </div>

      <div className={s.row}>
        <span className={s.label}>Vence</span>
        <span className={s.value}>
          {formatDate(summary.subscriptionEndsAt)}
        </span>
      </div>

      {summary.founderPriceLocked ? (
        <div className={s.row}>
          <span className={s.label}>Precio fundador</span>
          <span className={s.founderBadge}>Bloqueado</span>
        </div>
      ) : null}

      <div className={s.actions}>
        <a
          className={s.supportButton}
          href="mailto:ventora.cl@gmail.com?subject=Soporte%20suscripcion"
          target="_blank"
          rel="noreferrer"
        >
          Contactar soporte
        </a>
      </div>
    </div>
  );
}
