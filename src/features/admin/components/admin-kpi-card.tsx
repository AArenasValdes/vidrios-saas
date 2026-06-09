import Link from "next/link";
import s from "./admin-kpi-card.module.css";

type AdminKpiCardProps = {
  eyebrow: string;
  value: string;
  hint: string;
  href?: string;
  linkLabel?: string;
};

export function AdminKpiCard({
  eyebrow,
  value,
  hint,
  href,
  linkLabel,
}: AdminKpiCardProps) {
  return (
    <article className={s.card}>
      <span className={s.eyebrow}>{eyebrow}</span>
      <strong className={s.value}>{value}</strong>
      <p className={s.hint}>{hint}</p>
      {href && linkLabel ? (
        <Link href={href} className={s.link}>
          {linkLabel}
        </Link>
      ) : null}
    </article>
  );
}
