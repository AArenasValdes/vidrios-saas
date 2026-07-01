"use client";

import type { ComponentType } from "react";
import {
  LuCircleDollarSign,
  LuClock,
  LuHourglass,
  LuTriangleAlert,
  LuZap,
} from "react-icons/lu";

import type { AdminPaymentsKpi } from "@/features/admin/types/admin-payments";
import type { ClientesKpiTone } from "@/features/admin/services/admin-clientes-filters.service";
import s from "./admin-clientes-kpi-row.module.css";

const KPI_ICONS: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  revenue: LuCircleDollarSign,
  pending: LuHourglass,
  renewals: LuClock,
  expired: LuTriangleAlert,
  activation: LuZap,
};

type AdminPaymentsKpiRowProps = {
  kpis: AdminPaymentsKpi[];
  activeKpiId: string | null;
  onKpiClick: (kpiId: string) => void;
};

function toneClass(tone: ClientesKpiTone) {
  return s[`tone_${tone}`];
}

export function AdminPaymentsKpiRow({ kpis, activeKpiId, onKpiClick }: AdminPaymentsKpiRowProps) {
  return (
    <section className={s.kpiRow} aria-label="Resumen de cobros y planes">
      {kpis.map((kpi) => (
        <button
          key={kpi.id}
          type="button"
          className={`${s.kpiCard} ${toneClass(kpi.tone)} ${activeKpiId === kpi.id ? s.kpiCardActive : ""}`}
          onClick={() => onKpiClick(kpi.id)}
          aria-pressed={activeKpiId === kpi.id}
        >
          <div className={s.kpiTop}>
            <div className={s.kpiTitleGroup}>
              <span className={s.kpiIconWrap} aria-hidden>
                {(() => {
                  const Icon = KPI_ICONS[kpi.id];
                  return Icon ? <Icon className={s.kpiIcon} aria-hidden /> : null;
                })()}
              </span>
              <span className={s.kpiLabel}>{kpi.label}</span>
            </div>
            {kpi.badge ? <span className={s.kpiBadge}>{kpi.badge}</span> : null}
          </div>
          <strong className={s.kpiValue}>{kpi.displayValue}</strong>
          <div className={s.kpiFooter}>
            <span className={s.kpiSubtitle}>{kpi.subtitle}</span>
            <span className={s.kpiInsight}>{kpi.insight}</span>
          </div>
        </button>
      ))}
    </section>
  );
}
