"use client";

import type { ComponentType } from "react";
import {
  LuArrowUpRight,
  LuBadgePercent,
  LuFileText,
  LuGlobe,
  LuMegaphone,
  LuTarget,
  LuUsers,
  LuZap,
} from "react-icons/lu";

import type { MarketingKpi } from "@/features/admin/types/admin-marketing";
import s from "./admin-marketing-kpi-row.module.css";

const KPI_ICONS: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  new_prospects: LuTarget,
  demos: LuMegaphone,
  trials: LuUsers,
  paid: LuBadgePercent,
  conversion: LuArrowUpRight,
  published_pages: LuGlobe,
  not_configured: LuGlobe,
  public_requests: LuMegaphone,
  clients_with_requests: LuUsers,
  pending_review: LuTarget,
  real_quotes: LuFileText,
  items_quotes: LuFileText,
  constructor_items: LuZap,
  guided_items: LuFileText,
  constructor_pdf: LuBadgePercent,
};

type AdminMarketingKpiRowProps = {
  kpis: MarketingKpi[];
  activeKpiId: string | null;
  onKpiClick: (kpiId: string) => void;
  ariaLabel: string;
};

function toneClass(tone: MarketingKpi["tone"]) {
  return s[`tone_${tone}`];
}

export function AdminMarketingKpiRow({
  kpis,
  activeKpiId,
  onKpiClick,
  ariaLabel,
}: AdminMarketingKpiRowProps) {
  return (
    <section className={s.kpiRow} aria-label={ariaLabel}>
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
