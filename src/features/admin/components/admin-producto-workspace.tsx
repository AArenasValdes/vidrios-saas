"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuFilter, LuSearch } from "react-icons/lu";

import { AdminMarketingKpiRow } from "@/features/admin/components/admin-marketing-kpi-row";
import { useAdminHeaderActions } from "@/features/admin/components/admin-header-context";
import {
  EMPTY_PRODUCTO_FILTERS,
  applyProductoBottleneckFilter,
  applyProductoFunnelFilter,
  applyProductoKpiFilter,
  buildProductoFilterChips,
  filterProductoAccounts,
  hasProductoActiveFilters,
  parseProductoFiltersFromSearchParams,
  productoFiltersToSearchParams,
  removeProductoFilterChip,
} from "@/features/admin/services/admin-producto-filters.service";
import type { ProductoSetupStep, ProductoWorkspace } from "@/features/admin/types/admin-producto";
import s from "./admin-producto-workspace.module.css";

function SetupChips({ steps }: { steps: ProductoSetupStep[] }) {
  return (
    <div className={s.setupChips}>
      {steps.map((step) => (
        <span
          key={step.key}
          className={`${s.setupChip} ${step.completed ? s.setupChipDone : ""}`}
        >
          {step.label}
        </span>
      ))}
    </div>
  );
}

function buildExportCsv(workspace: ProductoWorkspace) {
  const lines = [
    "Empresa,Estado,Uso dominante,Cotizaciones,PDF,Solicitudes 30d,Pendientes,Setup incompleto,Acción",
    ...workspace.accounts.map(
      (row) =>
        `${row.empresaNombre},${row.accountStatusLabel},${row.dominantSurfaceLabel},${row.cotizacionesCount},${row.pdfsGeneradosCount},${row.solicitudesLast30Days},${row.solicitudesPending},${row.setupIncompleteCount},${row.recommendedAction}`
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

export function AdminProductoWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();

  const [workspace, setWorkspace] = useState<ProductoWorkspace | null>(null);
  const [filters, setFilters] = useState(() =>
    parseProductoFiltersFromSearchParams(new URLSearchParams(searchParams.toString()))
  );
  const [activeKpiId, setActiveKpiId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const params = productoFiltersToSearchParams(filters);
      const response = await fetch(`/api/admin/producto?${params.toString()}`);
      const payload = (await response.json()) as {
        workspace?: ProductoWorkspace;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar uso del producto.");
      }
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
      const params = productoFiltersToSearchParams(next);
      router.replace(`/admin/producto?${params.toString()}`, { scroll: false });
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
    });
    return () => resetHeaderState();
  }, [filters, syncedAt, isRefreshing, loadWorkspace, resetHeaderState, setHeaderState, updateFilters]);

  const filteredAccounts = useMemo(
    () => (workspace ? filterProductoAccounts(workspace.accounts, filters) : []),
    [workspace, filters]
  );

  const activeChips = useMemo(() => buildProductoFilterChips(filters), [filters]);
  const maxFunnelCount = useMemo(
    () => Math.max(...(workspace?.funnel.map((step) => step.count) ?? [1]), 1),
    [workspace]
  );

  if (isLoading) {
    return <div className={s.stateCard}>Cargando uso del producto…</div>;
  }

  if (!workspace) {
    return <div className={s.stateCard}>No hay datos de uso del producto disponibles.</div>;
  }

  return (
    <div className={s.page}>
      {error ? <div className={s.bannerError}>{error}</div> : null}

      <section className={s.intro}>
        <h1>Uso del producto</h1>
        <p>
          Adopción real del cotizador, páginas públicas y setup de cuentas. Cuentas de prueba
          excluidas.
        </p>
      </section>

      <section className={s.sectionBlock} aria-label="KPIs de uso del producto">
        <AdminMarketingKpiRow
          kpis={workspace.kpis}
          activeKpiId={activeKpiId}
          ariaLabel="KPIs de uso del producto"
          onKpiClick={(kpiId) => {
            setActiveKpiId(kpiId);
            updateFilters(applyProductoKpiFilter(filters, kpiId));
          }}
        />
        {workspace.quoteUsage.historicalUnclassifiedQuotes > 0 ? (
          <p className={s.funnelInsightMuted}>
            {workspace.quoteUsage.historicalUnclassifiedQuotes} cotizaciones históricas no tienen
            superficie clasificada y se excluyen del split guiada/constructor.
          </p>
        ) : null}
      </section>

      <div className={s.toolbar}>
        <label className={s.searchField}>
          <LuSearch aria-hidden />
          <input
            value={filters.search}
            onChange={(event) => updateFilters({ ...filters, search: event.target.value })}
            placeholder="Buscar empresa"
            aria-label="Buscar empresa"
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
              {period === "7d" ? "7 días" : period === "30d" ? "30 días" : "Este mes"}
            </button>
          ))}
          {hasProductoActiveFilters(filters) ? (
            <button
              type="button"
              className={s.ghostBtn}
              onClick={() => updateFilters(EMPTY_PRODUCTO_FILTERS)}
            >
              Limpiar filtros
            </button>
          ) : null}
          <button
            type="button"
            className={s.ghostBtn}
            onClick={() => downloadCsv(`ventora-producto-${Date.now()}.csv`, buildExportCsv(workspace))}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className={s.activeFiltersRow}>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={s.activeFilterChip}
              onClick={() => updateFilters(removeProductoFilterChip(filters, chip))}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.resultsMeta}>
        Período: {workspace.period.label} · {filteredAccounts.length} cuenta
        {filteredAccounts.length === 1 ? "" : "s"} visibles
      </div>

      <div className={s.secondaryGrid}>
        <section className={s.panel} aria-label="Embudo de producto">
          <h2 className={s.panelTitle}>Embudo de producto</h2>
          <div className={s.funnelList}>
            {workspace.funnel.map((step) => (
              <button
                key={step.id}
                type="button"
                className={`${s.funnelItem} ${filters.funnelStage === step.id ? s.funnelItemActive : ""}`}
                onClick={() => updateFilters(applyProductoFunnelFilter(filters, step.id))}
              >
                <div className={s.funnelItemTop}>
                  <span className={s.funnelLabel}>{step.label}</span>
                  <span className={s.funnelStats}>
                    {step.count} · {step.pct}%
                    {step.conversionFromPrevious !== null
                      ? ` · ${step.conversionFromPrevious}% ant.`
                      : ""}
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
        </section>

        <section className={s.panel} aria-label="Cuellos de botella">
          <h2 className={s.panelTitle}>Cuellos de botella</h2>
          {workspace.bottlenecks.length === 0 ? (
            <div className={s.emptyCompact}>No hay cuellos de botella relevantes ahora.</div>
          ) : (
            <div className={s.bottleneckList}>
              {workspace.bottlenecks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${s.bottleneckItem} ${filters.tableFilters.includes(item.filterKey) ? s.bottleneckItemActive : ""}`}
                  onClick={() =>
                    updateFilters(applyProductoBottleneckFilter(filters, item.filterKey))
                  }
                >
                  <div className={s.bottleneckTop}>
                    <span className={s.bottleneckLabel}>{item.label}</span>
                    <span className={s.bottleneckCount}>{item.count}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={s.panel} aria-label="Cuentas y setup">
        <div className={s.panelHeader}>
          <h2 className={s.panelTitle}>Cuentas y setup</h2>
          <span>{filteredAccounts.length}</span>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className={s.emptyCompact}>No hay cuentas con los filtros actuales.</div>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Estado</th>
                    <th>Última actividad</th>
                    <th>Uso dominante</th>
                    <th>Cotiz. / PDF</th>
                    <th>Solicitudes</th>
                    <th>Setup</th>
                    <th>Próxima acción</th>
                    <th>Ficha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link href={row.href}>{row.empresaNombre}</Link>
                      </td>
                      <td>
                        <span className={s.statusBadge}>{row.accountStatusLabel}</span>
                      </td>
                      <td>{row.lastActivityLabel}</td>
                      <td>{row.dominantSurfaceLabel}</td>
                      <td>
                        {row.cotizacionesCount} / {row.pdfsGeneradosCount}
                      </td>
                      <td>
                        {row.solicitudesLast30Days} recientes
                        {row.solicitudesPending > 0
                          ? ` · ${row.solicitudesPending} pend.`
                          : ""}
                      </td>
                      <td>
                        <SetupChips steps={row.setupSteps} />
                      </td>
                      <td>{row.recommendedAction}</td>
                      <td>
                        <Link href={row.href} className={s.linkAction}>
                          Ver ficha
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={s.mobileCards}>
              {filteredAccounts.map((row) => (
                <article key={row.id} className={s.mobileCard}>
                  <div className={s.mobileCardHeader}>
                    <strong>{row.empresaNombre}</strong>
                    <span className={s.statusBadge}>{row.accountStatusLabel}</span>
                  </div>
                  <div className={s.mobileMeta}>
                    {row.dominantSurfaceLabel} · {row.cotizacionesCount} cotiz. ·{" "}
                    {row.pdfsGeneradosCount} PDF
                  </div>
                  <SetupChips steps={row.setupSteps} />
                  <div className={s.mobileMeta}>{row.recommendedAction}</div>
                  <Link href={row.href} className={s.linkAction}>
                    Ver ficha
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
