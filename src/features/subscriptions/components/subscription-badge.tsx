"use client";

import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import type { EffectiveSubscriptionState } from "@/features/subscriptions/types/subscription";

import s from "./subscription-badge.module.css";

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

const STATUS_CLASSES: Record<string, string> = {
  active: s.statusActive,
  trial_active: s.statusActive,
  trial_expiring: s.statusWarning,
  trial_expired: s.statusExpired,
  past_due: s.statusExpired,
  cancelled: s.statusExpired,
};

export function SubscriptionBadge({
  subscription,
  planCode,
  variant = "default",
}: {
  subscription: EffectiveSubscriptionState | null | undefined;
  planCode: string | null | undefined;
  variant?: "default" | "compact";
}) {
  if (!subscription) return null;

  const planLabel = getPlanLabel(planCode);
  const statusLabel = subscription.effectiveStatus
    ? STATUS_LABELS[subscription.effectiveStatus] ?? subscription.effectiveStatus
    : "—";
  const statusClass = subscription.effectiveStatus
    ? STATUS_CLASSES[subscription.effectiveStatus] ?? s.statusNeutral
    : s.statusNeutral;

  const showDate =
    subscription.isActive ||
    subscription.effectiveStatus === "trial_active" ||
    subscription.effectiveStatus === "trial_expiring";

  const date =
    subscription.subscriptionEndsAt ?? subscription.trialEndsAt ?? null;

  return (
    <span className={`${s.badge} ${variant === "compact" ? s.badgeCompact : ""}`}>
      <strong className={s.plan}>{planLabel}</strong>
      <span className={`${s.status} ${statusClass}`}>{statusLabel}</span>
      {showDate && date ? (
        <span className={s.date}>Vence: {formatDate(date)}</span>
      ) : null}
    </span>
  );
}
