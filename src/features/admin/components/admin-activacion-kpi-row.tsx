"use client";

import type { ComponentType } from "react";
import {
  LuCircleCheck,
  LuClock,
  LuFileWarning,
  LuRocket,
  LuUserPlus,
} from "react-icons/lu";

import type { ActivacionKpi } from "@/features/admin/types/admin-activacion";
import type { ClientesKpiTone } from "@/features/admin/services/admin-clientes-filters.service";
import s from "./admin-activacion-kpi-row.module.css";

const KPI_ICONS: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  new_accounts: LuUserPlus,
  no_first_quote: LuRocket,
  quote_no_pdf: LuFileWarning,
  trials_at_risk: LuClock,
  completed: LuCircleCheck,
};

type AdminActivacionKpiRowProps = {
  kpis: ActivacionKpi[];
  activeKpiId: string | null;
  onKpiClick: (kpiId: string) => void;
};

function toneClass(tone: ClientesKpiTone) {
  return s[`tone_${tone}`];
}

export function AdminActivacionKpiRow({
  kpis,
  activeKpiId,
  onKpiClick,
}: AdminActivacionKpiRowProps) {
  return (
    <section className={s.kpiRow} aria-label="Resumen de activación">
      {kpis.map((kpi) => {
        const Icon = KPI_ICONS[kpi.id];

        return (
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
                  {Icon ? <Icon className={s.kpiIcon} aria-hidden /> : null}
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
        );
      })}
    </section>
  );
}
