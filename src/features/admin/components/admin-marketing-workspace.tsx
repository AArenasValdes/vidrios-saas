"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuFilter,
  LuSearch,
  LuSettings2,
} from "react-icons/lu";

import { AdminMarketingDashboard } from "@/features/admin/components/admin-marketing-dashboard";
import { AdminMarketingFiltersPanel } from "@/features/admin/components/admin-marketing-filters-panel";
import { AdminMarketingKpiRow } from "@/features/admin/components/admin-marketing-kpi-row";
import { AdminMarketingPublicActionCell } from "@/features/admin/components/admin-marketing-public-action-cell";
import { AdminMarketingContentControl } from "@/features/admin/components/admin-marketing-content-control";
import { useAdminHeaderActions } from "@/features/admin/components/admin-header-context";
import { CONFIGURED_ACQUISITION_SOURCES } from "@/features/admin/services/admin-marketing.logic";
import {
  applyMarketingChannelFilter,
  applyMarketingFunnelFilter,
  applyMarketingKpiFilter,
  buildMarketingFilterChips,
  EMPTY_MARKETING_FILTERS,
  filterMarketingPublicCompanies,
  hasMarketingActiveFilters,
  marketingFiltersToSearchParams,
  parseMarketingFiltersFromSearchParams,
  removeMarketingFilterChip,
} from "@/features/admin/services/admin-marketing-filters.service";
import type { MarketingWorkspace } from "@/features/admin/types/admin-marketing";
import s from "./admin-marketing-workspace.module.css";

function buildExportCsv(workspace: MarketingWorkspace) {
  const lines = [
    "Canal,Prospectos,Trials,Pagados,Conversion",
    ...workspace.channelRows.map(
      (row) =>
        `${row.label},${row.prospects},${row.trials},${row.paid},${row.conversionPct ?? ""}`
    ),
    "",
    "UTM pagina publica,Solicitudes",
    ...workspace.publicUtmRows.map((row) => `${row.label},${row.count}`),
    "",
    "Empresa,Estado pagina,Solicitudes periodo,Ultima solicitud,Cotizaciones,Estado recomendado",
    ...workspace.publicCompanies.map(
      (row) =>
        `${row.empresaNombre},${row.pageStatusLabel},${row.solicitudesInPeriod},${row.lastSolicitudLabel},${row.cotizacionesCount},${row.recommendedLabel}`
    ),
  ];
  return lines.join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AdminMarketingWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();
  const measurementRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [composerRequestId, setComposerRequestId] = useState(0);
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const [workspace, setWorkspace] = useState<MarketingWorkspace | null>(null);
  const [filters, setFilters] = useState(() =>
    parseMarketingFiltersFromSearchParams(new URLSearchParams(searchParams.toString()))
  );
  const [activeAcquisitionKpiId, setActiveAcquisitionKpiId] = useState<string | null>(null);
  const [activePublicKpiId, setActivePublicKpiId] = useState<string | null>(null);
  const [activeQuoteUsageKpiId, setActiveQuoteUsageKpiId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const params = marketingFiltersToSearchParams(filters);
      const response = await fetch(`/api/admin/marketing?${params.toString()}`);
      const payload = (await response.json()) as {
        workspace?: MarketingWorkspace;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar marketing.");
      setWorkspace(payload.workspace ?? null);
      setSyncedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const updateFilters = useCallback(
    (next: typeof filters) => {
      setFilters(next);
      const params = marketingFiltersToSearchParams(next);
      router.replace(`/admin/marketing?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const periodDays = filters.period === "7d" ? 7 : filters.period === "month" ? 90 : 30;
    setHeaderState({
      syncedAt,
      isRefreshing,
      periodDays,
      onPeriodChange: (days) => {
        updateFilters({
          ...filters,
          period: days === 7 ? "7d" : days === 90 ? "month" : "30d",
        });
      },
      onRefresh: () => void loadWorkspace(),
      hideDefaultPrimaryActions: true,
      customPrimaryAction: {
        label: "Crear publicación",
        onClick: () => {
          setComposerRequestId((current) => current + 1);
          contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
      },
    });
    return () => resetHeaderState();
  }, [filters, syncedAt, isRefreshing, loadWorkspace, resetHeaderState, setHeaderState, updateFilters, workspace]);

  const filteredPublicCompanies = useMemo(
    () => (workspace ? filterMarketingPublicCompanies(workspace.publicCompanies, filters) : []),
    [workspace, filters]
  );

  const activeChips = useMemo(() => buildMarketingFilterChips(filters), [filters]);

  const maxFunnelCount = useMemo(
    () => Math.max(...(workspace?.acquisitionFunnel.map((step) => step.count) ?? [1]), 1),
    [workspace]
  );

  async function copyPublicLink(slug: string | null) {
    if (!slug) return;
    const url = `${appOrigin}/solicitud/${slug}`;
    await navigator.clipboard.writeText(url);
  }

  if (isLoading) {
    return (
      <div className={s.page} aria-busy="true" aria-live="polite">
        <p className={s.visuallyHidden}>Cargando marketing…</p>
        <div className={s.skeletonBanner} />
        <div className={s.skeletonEditorial} />
        <div className={s.skeletonKpis}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return <div className={s.stateCard}>No hay datos de marketing disponibles.</div>;
  }

  return (
    <div className={s.page}>
      {error ? <div className={s.bannerError}>{error}</div> : null}

      <AdminMarketingDashboard workspace={workspace}>
        <div id="contenido" ref={contentRef}>
          <AdminMarketingContentControl composerRequestId={composerRequestId} />
        </div>
      </AdminMarketingDashboard>

      <details className={s.detailDisclosure}>
        <summary>
          <span>Datos secundarios</span>
          <small>Prospección saliente, páginas públicas y calidad de medición</small>
        </summary>
        <div className={s.detailContent}>

      <section className={s.sectionBlock} aria-label="Uso real del cotizador">
        <div className={s.sectionHeading}>
          <h2>Uso real del cotizador</h2>
          <p>Solo cuentas reales · {workspace.period.label}. Dentro de por ítems: Guiada o Constructor de piezas.</p>
        </div>
        <AdminMarketingKpiRow
          kpis={workspace.quoteUsageKpis}
          activeKpiId={activeQuoteUsageKpiId}
          ariaLabel="KPIs de adopción del cotizador"
          onKpiClick={setActiveQuoteUsageKpiId}
        />
        {workspace.quoteUsage.historicalUnclassifiedItemQuotes > 0 ? (
          <p className={s.funnelInsightMuted}>
            {workspace.quoteUsage.historicalUnclassifiedItemQuotes} cotizaciones históricas por ítems
            no distinguen Guiada de Constructor. Se excluyen de esa comparación.
          </p>
        ) : null}
      </section>

      <div className={s.toolbar}>
        <label className={s.searchField}>
          <LuSearch aria-hidden />
          <input
            value={filters.q}
            onChange={(event) => updateFilters({ ...filters, q: event.target.value })}
            placeholder="Buscar canal, campaña, empresa o página pública"
            aria-label="Buscar en marketing"
          />
        </label>
        <div className={s.toolbarActions}>
          {(["7d", "30d", "month"] as const).map((period) => (
            <button
              key={period}
              type="button"
              className={`${s.periodChip} ${filters.period === period ? s.periodChipActive : ""}`}
              onClick={() => updateFilters({ ...filters, period })}
            >
              {period === "7d"
                ? "7 días"
                : period === "30d"
                  ? "30 días"
                  : "Este mes"}
            </button>
          ))}
          <button type="button" className={s.secondaryBtn} onClick={() => setIsFiltersOpen(true)}>
            <LuFilter aria-hidden /> Filtrar
          </button>
          <button
            type="button"
            className={s.ghostBtn}
            onClick={() => downloadCsv(`ventora-marketing-${Date.now()}.csv`, buildExportCsv(workspace))}
          >
            Exportar
          </button>
          <Link href="/admin/marketing/onboarding" className={s.secondaryBtn}>
            Onboarding automático
          </Link>
          {hasMarketingActiveFilters(filters) ? (
            <button
              type="button"
              className={s.ghostBtn}
              onClick={() => updateFilters(EMPTY_MARKETING_FILTERS)}
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className={s.activeFiltersRow}>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={s.activeFilterChip}
              onClick={() => updateFilters(removeMarketingFilterChip(filters, chip))}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.resultsMeta}>
        Período: {workspace.period.label} · {workspace.periodSummary.label}
        {workspace.periodSummary.totalPublicSolicitudes > 0
          ? ` · ${workspace.periodSummary.totalPublicSolicitudes} solicitudes públicas`
          : ""}
      </div>

      <section className={s.sectionBlock} aria-label="Prospección saliente de Ventora">
        <div className={s.sectionHeading}>
          <h2>Prospección saliente</h2>
          <p>Lista manual de contactos a trabajar. No equivale a leads captados ni a ventas atribuidas.</p>
        </div>

        <AdminMarketingKpiRow
          kpis={workspace.acquisitionKpis}
          activeKpiId={activeAcquisitionKpiId}
          ariaLabel="KPIs de prospección saliente"
          onKpiClick={(kpiId) => {
            setActiveAcquisitionKpiId(kpiId);
            const kpi = workspace.acquisitionKpis.find((item) => item.id === kpiId);
            updateFilters(applyMarketingKpiFilter(filters, kpi?.filterKey));
          }}
        />

        {workspace.hasAcquisitionMeasurementBase ? (
          <div className={s.splitGrid}>
            <article className={s.panel}>
              <div className={s.panelHeader}>
                <h3>Avance de la lista</h3>
              </div>
              <div className={s.funnelList}>
                {workspace.acquisitionFunnel.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    className={s.funnelItem}
                    onClick={() =>
                      updateFilters(applyMarketingFunnelFilter(filters, step.id))
                    }
                  >
                    <div className={s.funnelItemTop}>
                      <span className={s.funnelLabel}>{step.label}</span>
                      <span className={s.funnelStats}>
                        {step.count}
                        {step.pctOfPrevious !== null ? ` · ${step.pctOfPrevious}%` : ""}
                      </span>
                    </div>
                    <div className={s.funnelTrack}>
                      <div
                        className={s.funnelFill}
                        style={{ width: `${Math.max(8, (step.count / maxFunnelCount) * 100)}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              <p
                className={
                  workspace.funnelDropStageId ? s.funnelInsight : s.funnelInsightMuted
                }
              >
                {workspace.funnelInsight}
              </p>
            </article>

            <article className={s.panel}>
              <div className={s.panelHeader}>
                <h3>Origen declarado en la lista</h3>
              </div>
              {workspace.channelRows.length === 0 ? (
                <div className={s.emptyCompact}>
                  Aún no hay contactos con origen registrado en el período.
                  <Link href="/admin/prospectos" className={s.emptyAction}>
                    Completar origen
                  </Link>
                </div>
              ) : (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Canal</th>
                        <th>Prospectos</th>
                        <th>Trials</th>
                        <th>Pagados</th>
                        <th>Conversión</th>
                        <th>Última actividad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.channelRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <button
                              type="button"
                              className={s.linkAction}
                              onClick={() =>
                                updateFilters(applyMarketingChannelFilter(filters, row.id))
                              }
                            >
                              {row.label}
                            </button>
                            {workspace.bestConversionChannelId === row.id ? (
                              <span className={s.bestBadge}>Mejor conversión</span>
                            ) : null}
                          </td>
                          <td>{row.prospects}</td>
                          <td>{row.trials}</td>
                          <td>{row.paid}</td>
                          <td>
                            <div className={s.conversionCell}>
                              <span>{row.conversionPct === null ? "—" : `${row.conversionPct}%`}</span>
                              {row.conversionPct !== null ? (
                                <div className={s.conversionBar}>
                                  <div
                                    className={s.conversionFill}
                                    style={{ width: `${Math.min(100, row.conversionPct)}%` }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td>{row.lastActivityLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {workspace.prospectsWithoutOrigin > 0 ? (
                <div className={s.originAlert}>
                  {workspace.prospectsWithoutOrigin} prospecto
                  {workspace.prospectsWithoutOrigin === 1 ? "" : "s"} no tienen origen registrado.
                  <Link href="/admin/prospectos" className={s.emptyAction}>
                    Completar origen
                  </Link>
                </div>
              ) : null}
            </article>
          </div>
        ) : (
          <article className={s.acquisitionEmptyPanel}>
            <h3>Sin atribución de marketing todavía</h3>
            <p className={s.acquisitionEmptyLead}>
              {workspace.prospectsWithOriginInPeriod} contacto
              {workspace.prospectsWithOriginInPeriod === 1 ? "" : "s"} con origen registrado en
              este período.
            </p>
            <p>
              Registra el origen de cada contacto para comparar tu prospección saliente. Para medir
              marketing real, el lead debe llegar con un origen trazable.
            </p>
            <p className={s.acquisitionEmptyMuted}>
              No uses esta sección para decidir inversión en anuncios hasta tener esa trazabilidad.
            </p>
            <div className={s.acquisitionEmptyActions}>
              <Link href="/admin/prospectos" className={s.secondaryBtn}>
                Completar origen
              </Link>
              <Link href="/admin/prospectos" className={s.ghostBtn}>
                Ver prospectos
              </Link>
            </div>
            <p className={s.sourceList}>
              {CONFIGURED_ACQUISITION_SOURCES.join(" · ")}
            </p>
          </article>
        )}
      </section>

      <section className={s.sectionBlock} aria-label="Rendimiento de páginas públicas">
        <div className={`${s.sectionHeading} ${s.sectionHeadingPublic}`}>
          <h2>Rendimiento de páginas públicas</h2>
          <p>Solicitudes recibidas por empresas clientes desde sus enlaces públicos.</p>
        </div>

        <AdminMarketingKpiRow
          kpis={workspace.publicKpis}
          activeKpiId={activePublicKpiId}
          ariaLabel="KPIs de páginas públicas"
          onKpiClick={(kpiId) => {
            setActivePublicKpiId(kpiId);
            const kpi = workspace.publicKpis.find((item) => item.id === kpiId);
            updateFilters(applyMarketingKpiFilter(filters, kpi?.filterKey));
          }}
        />

        <div className={s.splitGrid}>
          <article className={`${s.panel} ${s.panelPublic}`}>
            <div className={s.panelHeader}>
              <h3>Empresas con movimiento público</h3>
              <span>{filteredPublicCompanies.length}</span>
            </div>
            {filteredPublicCompanies.length === 0 ? (
              <div className={s.emptyCompact}>
                {filters.publicPageFilters.includes("con_solicitudes")
                  ? "No hay solicitudes públicas en el período seleccionado."
                  : "Todavía no hay clientes con página pública publicada."}
                <Link href="/admin/clientes" className={s.emptyAction}>
                  {filters.publicPageFilters.includes("con_solicitudes")
                    ? "Ver páginas publicadas"
                    : "Configurar páginas"}
                </Link>
              </div>
            ) : (
              <>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Empresa cliente</th>
                        <th>Estado página</th>
                        <th>Solicitudes</th>
                        <th>Última solicitud</th>
                        <th>Cotizaciones vinculadas</th>
                        <th>Estado recomendado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPublicCompanies.map((row) => (
                        <tr key={row.organizationId}>
                          <td>{row.empresaNombre}</td>
                          <td>
                            <span
                              className={`${s.statusBadge} ${
                                row.pageStatus === "publicada"
                                  ? s.statusPublished
                                  : row.solicitudesPending > 0
                                    ? s.statusPending
                                    : s.statusDraft
                              }`}
                            >
                              {row.pageStatusLabel}
                            </span>
                          </td>
                          <td>{row.solicitudesInPeriod}</td>
                          <td>{row.lastSolicitudLabel}</td>
                          <td className={s.cotizacionesCell}>{row.cotizacionesLinkedLabel}</td>
                          <td>
                            <div className={s.recommendedCell}>
                              <span>{row.recommendedLabel}</span>
                              {row.recommendedDetail ? (
                                <span className={s.recommendedDetail}>{row.recommendedDetail}</span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <AdminMarketingPublicActionCell
                              row={row}
                              appOrigin={appOrigin}
                              quotesFromRequestsAvailable={workspace.quotesFromRequestsAvailable}
                              onCopyPublicLink={(slug) => void copyPublicLink(slug)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={s.mobileCardList}>
                  {filteredPublicCompanies.map((row) => (
                    <article key={row.organizationId} className={s.mobileCard}>
                      <div className={s.mobileCardTitle}>{row.empresaNombre}</div>
                      <div className={s.mobileCardMeta}>
                        {row.pageStatusLabel} · {row.solicitudesInPeriod} solicitudes
                      </div>
                      <div className={s.mobileCardMeta}>{row.recommendedLabel}</div>
                      <div className={s.mobileCardActions}>
                        <AdminMarketingPublicActionCell
                          row={row}
                          appOrigin={appOrigin}
                          quotesFromRequestsAvailable={workspace.quotesFromRequestsAvailable}
                          onCopyPublicLink={(slug) => void copyPublicLink(slug)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </article>

          <div className={s.sideStack}>
            <article className={`${s.panel} ${s.panelPublic}`}>
              <div className={s.panelHeader}>
                <h3>Solicitudes públicas recientes</h3>
                {workspace.recentSolicitudes.length > 0 ? (
                  <Link href="/admin/clientes" className={s.linkAction}>
                    Ver todas las solicitudes
                  </Link>
                ) : null}
              </div>
              {workspace.recentSolicitudes.length === 0 ? (
                <div className={s.emptyCompact}>
                  No hay solicitudes públicas en el período seleccionado.
                  <Link href="/admin/clientes" className={s.emptyAction}>
                    Ver páginas publicadas
                  </Link>
                </div>
              ) : (
                <div className={s.timelineList}>
                  {workspace.recentSolicitudes.map((event) => (
                    <article key={event.id} className={s.timelineItem}>
                      <div className={s.timelineCompany}>{event.empresaNombre}</div>
                      <div className={s.timelineTitle}>
                        Nueva solicitud pública de {event.solicitanteNombre}
                      </div>
                      <div className={s.timelineMeta}>
                        {event.relativeAt} · Página pública
                      </div>
                      <div className={s.timelineActions}>
                        <Link href={event.solicitudHref} className={s.linkAction}>
                          Ver solicitud
                        </Link>
                        <Link href={event.cuentaHref} className={s.linkAction}>
                          Ver cuenta
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className={s.panel} ref={measurementRef}>
              <div className={s.panelHeader}>
                <h3>
                  <LuSettings2 aria-hidden /> Datos pendientes de medir
                </h3>
              </div>
              {workspace.measurementGaps.length === 0 ? (
                <div className={s.emptyCompact}>No hay alertas de calidad de medición por ahora.</div>
              ) : (
                <div className={s.gapList}>
                  {workspace.measurementGaps.map((gap) => (
                    <div
                      key={gap.id}
                      className={`${s.gapItem} ${
                        gap.priority === "alta" || gap.priority === "media" ? s.gapItemAmber : ""
                      }`}
                    >
                      <div className={s.gapItemTop}>
                        <span className={s.gapPriority}>
                          {gap.priority === "alta"
                            ? "Alta prioridad"
                            : gap.priority === "media"
                              ? "Media prioridad"
                              : "Baja prioridad"}
                        </span>
                        <strong className={s.gapTitle}>{gap.title}</strong>
                      </div>
                      <span>{gap.label}</span>
                      <Link href={gap.ctaHref} className={s.emptyAction}>
                        {gap.ctaLabel}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>
      </section>
        </div>
      </details>

      <AdminMarketingFiltersPanel
        filters={filters}
        onChange={updateFilters}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />
    </div>
  );
}
