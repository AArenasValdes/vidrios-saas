import type { AdminClientSource } from "@/features/admin/types/admin-client";
import s from "./source-badge.module.css";

const SOURCE_LABELS: Record<AdminClientSource, string> = {
  sistema: "Sistema",
  manual: "Manual",
  local: "Local",
};

type SourceBadgeProps = {
  source: AdminClientSource;
  label?: string;
};

export function SourceBadge({ source, label }: SourceBadgeProps) {
  const className = `${s.badge} ${s[source]}`;

  return <span className={className}>{label ?? SOURCE_LABELS[source]}</span>;
}
