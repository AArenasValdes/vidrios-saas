"use client";

import type { ComponentType } from "react";
import {
  LuClock,
  LuRocket,
  LuShieldCheck,
  LuTriangleAlert,
  LuZap,
} from "react-icons/lu";

import type {
  ClientesFiltersState,
  ClientesKpiCard,
  ClientesKpiTone,
} from "@/features/admin/services/admin-clientes-filters.service";
import s from "./admin-clientes-kpi-row.module.css";

const KPI_ICONS: Record<
  ClientesKpiCard["id"],
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  active: LuShieldCheck,
  trials: LuRocket,
  expiring: LuClock,
  expired: LuTriangleAlert,
  "no-quote": LuZap,
};

type AdminClientesKpiRowProps = {
  kpis: ClientesKpiCard[];
  filters: ClientesFiltersState;
  onKpiClick: (kpi: ClientesKpiCard) => void;
};

function isKpiFilterActive(filters: ClientesFiltersState, kpi: ClientesKpiCard) {
  const { toggle } = kpi;

  if (toggle.accountTypes?.length) {
    if (!toggle.accountTypes.every((item) => filters.accountTypes.includes(item))) {
      return false;
    }
  }

  if (toggle.subscriptionStatuses?.length) {
    if (
      !toggle.subscriptionStatuses.every((item) =>
        filters.subscriptionStatuses.includes(item)
      )
    ) {
      return false;
    }
  }

  if (toggle.usage?.length) {
    if (!toggle.usage.every((item) => filters.usage.includes(item))) {
      return false;
    }
  }

  return Boolean(
    toggle.accountTypes?.length ||
      toggle.subscriptionStatuses?.length ||
      toggle.usage?.length
  );
}

function toneClass(tone: ClientesKpiTone) {
  return s[`tone_${tone}`];
}

export function AdminClientesKpiRow({ kpis, filters, onKpiClick }: AdminClientesKpiRowProps) {
  return (
    <section className={s.kpiRow} aria-label="Resumen ejecutivo de cartera">
      {kpis.map((kpi) => {
        const Icon = KPI_ICONS[kpi.id];
        const isActive = isKpiFilterActive(filters, kpi);

        return (
          <button
            key={kpi.id}
            type="button"
            className={`${s.kpiCard} ${toneClass(kpi.tone)} ${isActive ? s.kpiCardActive : ""}`}
            onClick={() => onKpiClick(kpi)}
            aria-pressed={isActive}
            aria-label={`${kpi.label}: ${kpi.value}. ${kpi.subtitle}. ${kpi.insight}`}
          >
            <div className={s.kpiTop}>
              <div className={s.kpiTitleGroup}>
                <span className={s.kpiIconWrap} aria-hidden>
                  <Icon className={s.kpiIcon} aria-hidden />
                </span>
                <span className={s.kpiLabel}>{kpi.label}</span>
              </div>
              {kpi.badge ? <span className={s.kpiBadge}>{kpi.badge}</span> : null}
            </div>

            <strong className={s.kpiValue}>{kpi.value}</strong>

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
