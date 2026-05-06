const UNITS = [
  { label: "año", seconds: 31536000, limit: 100000 },
  { label: "mes", seconds: 2592000, limit: 12 },
  { label: "semana", seconds: 604800, limit: 4 },
  { label: "día", seconds: 86400, limit: 7 },
  { label: "hora", seconds: 3600, limit: 24 },
  { label: "min", seconds: 60, limit: 60 },
] as const;

export function relativeTime(value: string | null | undefined, now = new Date()) {
  if (!value) return "hace un momento";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "hace un momento";

  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 1000) return "justo ahora";

  const diffSeconds = Math.floor(diffMs / 1000);

  for (const unit of UNITS) {
    if (diffSeconds >= unit.seconds) {
      const count = Math.floor(diffSeconds / unit.seconds);
      return `hace ${count} ${unit.label}${count !== 1 ? "s" : ""}`;
    }
  }

  return "hace un momento";
}
