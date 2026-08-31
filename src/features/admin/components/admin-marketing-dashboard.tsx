"use client";

import Link from "next/link";
import {
  LuBadgePercent,
  LuFileText,
  LuLightbulb,
  LuTarget,
  LuUsers,
  LuVideo,
  LuZap,
} from "react-icons/lu";

import {
  MarketingDonutChart,
  MarketingFunnelChart,
  MarketingTrendChart,
  MarketingUtmBars,
} from "@/features/admin/components/admin-marketing-charts";
import type { MarketingKpi, MarketingWorkspace } from "@/features/admin/types/admin-marketing";
import s from "./admin-marketing-dashboard.module.css";

const KPI_ICONS = {
  new_prospects: LuUsers,
  demos: LuVideo,
  trials: LuZap,
  paid: LuBadgePercent,
  trial_to_paid: LuTarget,
} as const;

function formatDelta(changePct: number | null) {
  if (changePct === null) return { label: "Sin base previa", tone: s.kpiFlat };
  if (changePct > 0) return { label: `+${changePct}%`, tone: s.kpiUp };
  if (changePct < 0) return { label: `${changePct}%`, tone: s.kpiDown };
  return { label: "0%", tone: s.kpiFlat };
}

function DashKpi({
  kpi,
  onClick,
}: {
  kpi: MarketingKpi;
  onClick: (id: string) => void;
}) {
  const Icon = KPI_ICONS[kpi.id as keyof typeof KPI_ICONS] ?? LuFileText;
  const delta = formatDelta(kpi.changePct);

  return (
    <button type="button" className={s.kpiCard} onClick={() => onClick(kpi.id)}>
      <div className={s.kpiTop}>
        <span className={s.kpiLabel}>{kpi.label}</span>
        <span className={s.kpiIcon} aria-hidden>
          <Icon />
        </span>
      </div>
      <strong className={s.kpiValue}>{kpi.displayValue}</strong>
      <span className={`${s.kpiDelta} ${delta.tone}`}>{delta.label} vs. período anterior</span>
    </button>
  );
}

type AdminMarketingDashboardProps = {
  workspace: MarketingWorkspace;
  onKpiClick: (kpiId: string) => void;
};

export function AdminMarketingDashboard({ workspace, onKpiClick }: AdminMarketingDashboardProps) {
  const paidStep = workspace.acquisitionFunnel.find((step) => step.id === "pagado");
  const conversionPct = paidStep?.pctOfTotal ?? null;
  const utmTotal = workspace.publicUtmRows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className={s.dashboard}>
      <section className={s.nowBanner} aria-label="Qué hacer ahora">
        <div className={s.nowHead}>
          <span className={s.nowIcon} aria-hidden>
            <LuTarget />
          </span>
          <h2>Qué hacer ahora</h2>
        </div>
        <div className={s.nowSteps}>
          {workspace.nowActions.map((action, index) => (
            <article key={action.id} className={`${s.nowStep} ${action.done ? s.nowStepDone : ""}`}>
              <span className={s.nowIndex}>{index + 1}</span>
              <div className={s.nowCopy}>
                <strong>{action.title}</strong>
                <span>{action.detail}</span>
              </div>
              <Link
                href={action.href}
                className={index === 0 ? s.nowCta : s.nowCtaGhost}
              >
                {action.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={s.kpiRow} aria-label="Indicadores de adquisición">
        {workspace.acquisitionKpis.map((kpi) => (
          <DashKpi key={kpi.id} kpi={kpi} onClick={onKpiClick} />
        ))}
      </section>

      <section className={s.analyticsRow}>
        <article className={s.panel}>
          <div className={s.panelHead}>
            <h2>Actividad comercial</h2>
            <span className={s.chip}>Diario</span>
          </div>
          <div className={s.legendRow}>
            <span className={s.legendKey}>
              <i className={s.legendSwatch} style={{ background: "#1e88ff" }} /> Prospectos
            </span>
            <span className={s.legendKey}>
              <i className={s.legendSwatch} style={{ background: "#a78bfa" }} /> Trials
            </span>
            <span className={s.legendKey}>
              <i className={s.legendSwatch} style={{ background: "#fbbf24" }} /> Pagos
            </span>
          </div>
          <MarketingTrendChart series={workspace.trendSeries} />
        </article>

        <article className={s.panel}>
          <div className={s.panelHead}>
            <h2>Prospectos por canal</h2>
          </div>
          <MarketingDonutChart rows={workspace.channelRows} />
        </article>

        <article className={s.panel}>
          <div className={s.panelHead}>
            <h2>Próximas acciones</h2>
          </div>
          <div className={s.nextList}>
            {workspace.nextActions.map((action) => {
              const ratio =
                action.target && action.target > 0
                  ? Math.min(100, (action.current / action.target) * 100)
                  : action.current > 0
                    ? 100
                    : 0;
              return (
                <Link key={action.id} href={action.href} className={s.nextItem}>
                  <div className={s.nextTop}>
                    <strong>{action.title}</strong>
                    <span>{action.detail}</span>
                  </div>
                  <div className={s.nextBar}>
                    <div
                      className={`${s.nextBarFill} ${action.id === "seguimientos" && action.current > 0 ? s.nextAlert : ""}`}
                      style={{ width: `${Math.max(action.current > 0 ? 8 : 0, ratio)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </article>
      </section>

      <section className={s.conversionRow}>
        <article className={s.panel}>
          <div className={s.panelHead}>
            <h2>Embudo de adquisición</h2>
          </div>
          <MarketingFunnelChart steps={workspace.acquisitionFunnel} conversionPct={conversionPct} />
        </article>

        <article className={s.panel}>
          <div className={s.panelHead}>
            <h2>Piezas publicadas</h2>
          </div>
          {workspace.contentHighlights.length === 0 ? (
            <p className={s.emptyNote}>Aún no hay piezas publicadas o programadas.</p>
          ) : (
            <ul className={s.pieceList}>
              {workspace.contentHighlights.map((item) => (
                <li key={item.id} className={s.piece}>
                  <span className={s.thumb}>{item.formatLabel.slice(0, 2)}</span>
                  <div className={s.pieceCopy}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.channelLabel} · {item.publishedLabel}
                    </span>
                  </div>
                  <span className={item.utmComplete ? s.utmOk : s.utmBad}>
                    {item.utmComplete ? "UTM ok" : "Falta UTM"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={s.panel}>
          <div className={s.panelHead}>
            <h2>Solicitudes desde páginas públicas</h2>
          </div>
          <MarketingUtmBars rows={workspace.publicUtmRows} />
        </article>
      </section>

      <section className={s.bottomRow}>
        <article className={s.panel}>
          <div className={s.panelHead}>
            <h2>Uso real del cotizador</h2>
          </div>
          <div className={s.statRow}>
            {workspace.quoteUsageKpis.slice(0, 4).map((kpi) => (
              <div key={kpi.id} className={s.stat}>
                <span>{kpi.label}</span>
                <strong>{kpi.displayValue}</strong>
              </div>
            ))}
          </div>
          <div className={s.insight}>
            <LuLightbulb aria-hidden />
            <p>{workspace.quoteUsageInsight.text}</p>
            {workspace.quoteUsageInsight.ctaHref && workspace.quoteUsageInsight.ctaLabel ? (
              <Link href={workspace.quoteUsageInsight.ctaHref} className={s.nowCtaGhost}>
                {workspace.quoteUsageInsight.ctaLabel}
              </Link>
            ) : null}
          </div>
        </article>

        <article className={s.panel}>
          <div className={s.panelHead}>
            <h2>Páginas públicas</h2>
          </div>
          <div className={s.publicStats}>
            <div className={s.stat}>
              <span>Publicadas</span>
              <strong>{workspace.periodSummary.publishedPages}</strong>
            </div>
            <div className={s.stat}>
              <span>Solicitudes</span>
              <strong>{workspace.periodSummary.totalPublicSolicitudes}</strong>
            </div>
            <div className={s.stat}>
              <span>Pendientes</span>
              <strong>{workspace.pendingPublicSolicitudes}</strong>
            </div>
          </div>
          {utmTotal > 0 ? (
            <ul className={s.tagRow}>
              {workspace.publicUtmRows.slice(0, 4).map((row) => (
                <li key={row.id} className={s.tag}>
                  <span>{row.label}</span>
                  <strong>{Math.round((row.count / utmTotal) * 100)}%</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.emptyNote}>Sin UTM en solicitudes de clientes todavía.</p>
          )}
        </article>
      </section>

      <p className={s.footnote}>
        Las métricas de solicitudes corresponden a páginas públicas de clientes, no a anuncios de Ventora.
      </p>
    </div>
  );
}
