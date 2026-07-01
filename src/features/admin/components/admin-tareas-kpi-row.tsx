"use client";

import type { ComponentType } from "react";
import {
  LuCalendarDays,
  LuCircleCheck,
  LuClock,
  LuTriangleAlert,
} from "react-icons/lu";

import type { AdminTaskKpi } from "@/features/admin/types/admin-tareas";
import type { ClientesKpiTone } from "@/features/admin/services/admin-clientes-filters.service";
import s from "./admin-tareas-kpi-row.module.css";

const KPI_ICONS: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  today: LuCalendarDays,
  overdue: LuTriangleAlert,
  high_priority: LuClock,
  completed_week: LuCircleCheck,
};

type AdminTareasKpiRowProps = {
  kpis: AdminTaskKpi[];
  activeKpiId: string | null;
  onKpiClick: (kpiId: string) => void;
};

function toneClass(tone: ClientesKpiTone) {
  return s[`tone_${tone}`];
}

export function AdminTareasKpiRow({ kpis, activeKpiId, onKpiClick }: AdminTareasKpiRowProps) {
  return (
    <section className={s.kpiRow} aria-label="Resumen de tareas">
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
            </div>
            <strong className={s.kpiValue}>{kpi.displayValue}</strong>
            <div className={s.kpiFooter}>
              <span className={s.kpiSubtitle}>{kpi.subtitle}</span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
