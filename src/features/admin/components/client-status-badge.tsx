import type { SubscriptionStatus } from "@/features/subscriptions/types/subscription";
import s from "./client-status-badge.module.css";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Activo",
  trial_active: "Trial activo",
  trial_expiring: "Trial por vencer",
  trial_expired: "Trial vencido",
  past_due: "Suscripción vencida",
  cancelled: "Cancelada",
};

function getStatusClass(status: SubscriptionStatus | null | undefined) {
  if (!status) {
    return s.neutral;
  }

  if (status === "active" || status === "trial_active") {
    return s.active;
  }

  if (status === "trial_expiring") {
    return s.warning;
  }

  if (
    status === "trial_expired" ||
    status === "past_due" ||
    status === "cancelled"
  ) {
    return s.expired;
  }

  return s.neutral;
}

type ClientStatusBadgeProps = {
  status: SubscriptionStatus | null | undefined;
  label?: string;
};

export function ClientStatusBadge({
  status,
  label,
}: ClientStatusBadgeProps) {
  return (
    <span className={`${s.badge} ${getStatusClass(status)}`}>
      {label ?? (status ? STATUS_LABELS[status] : "Sin estado")}
    </span>
  );
}
