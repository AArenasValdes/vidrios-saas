"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuFilter, LuSearch, LuX } from "react-icons/lu";

import { AdminPaymentActionCell } from "@/features/admin/components/admin-payment-action-cell";
import { AdminPaymentDetailDrawer } from "@/features/admin/components/admin-payment-detail-drawer";
import { AdminPaymentsFiltersPanel } from "@/features/admin/components/admin-payments-filters-panel";
import { AdminPaymentsKpiRow } from "@/features/admin/components/admin-payments-kpi-row";
import { useAdminHeaderActions } from "@/features/admin/components/admin-header-context";
import { ClientStatusBadge } from "@/features/admin/components/client-status-badge";
import {
  buildRevenueChartScaleMax,
  formatRevenueBarHeight,
  formatWeeklyRevenueTooltip,
} from "@/features/admin/services/admin-payments-revenue.service";
import {
  applyPagosKpiFilter,
  buildPagosFilterChips,
  filterPagosMovements,
  formatPaymentStatusLabel,
  hasPagosActiveFilters,
  mapProviderLabel,
  parsePagosFiltersFromSearchParams,
  pagosFiltersToSearchParams,
  removePagosFilterChip,
  EMPTY_PAGOS_FILTERS,
  type PagosFiltersState,
} from "@/features/admin/services/admin-payments-filters.service";
import type {
  AdminPaymentActionRow,
  AdminPaymentsWorkspace,
} from "@/features/admin/types/admin-payments";
import type { BillingPlanCode } from "@/features/billing/types/plans";
import s from "./admin-payments-workspace.module.css";

const PLAN_OPTIONS: Array<{ value: BillingPlanCode; label: string }> = [
  { value: "founder_monthly", label: "Founder mensual ($8.990)" },
  { value: "founder_full_annual", label: "Founder anual ($79.990)" },
  { value: "quote_only_annual", label: "Solo cotización anual ($59.990)" },
];

function formatClp(value: number) {
  return `$${value.toLocaleString("es-CL")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminPaymentsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();

  const [workspace, setWorkspace] = useState<AdminPaymentsWorkspace | null>(null);
  const [filters, setFilters] = useState<PagosFiltersState>(() =>
    parsePagosFiltersFromSearchParams(new URLSearchParams(searchParams.toString()))
  );
  const [activeKpiId, setActiveKpiId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<AdminPaymentActionRow | null>(null);
  const [paymentOrgId, setPaymentOrgId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    planCode: "founder_monthly" as BillingPlanCode,
    reference: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openPaymentModal = useCallback((organizationId?: number) => {
    if (organizationId) setPaymentOrgId(String(organizationId));
    setIsPaymentOpen(true);
  }, []);

  const openActivateModal = useCallback((organizationId?: number) => {
    if (organizationId) setPaymentOrgId(String(organizationId));
    setIsActivateOpen(true);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/admin/pagos?periodDays=${periodDays}`);
      const payload = (await response.json()) as {
        workspace?: AdminPaymentsWorkspace;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar pagos.");
      setWorkspace(payload.workspace ?? null);
      setSyncedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [periodDays]);

  const filteredMovements = useMemo(
    () => filterPagosMovements(workspace?.movements ?? [], filters),
    [workspace?.movements, filters]
  );

  const handleExportMovements = useCallback(() => {
    const rows = filteredMovements;
    const header = ["id", "empresa", "estado_pago", "plan", "monto", "medio", "referencia", "fecha"];
    const csv = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.id,
          row.empresaNombre,
          row.paymentStatus,
          row.planLabel,
          row.amountClp,
          row.paymentProvider,
          row.reference ?? "",
          row.fecha,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pagos-ventora-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [filteredMovements]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    setHeaderState({
      syncedAt,
      isRefreshing,
      onRefresh: () => void loadWorkspace(),
      customPrimaryAction: { label: "Registrar pago", onClick: () => openPaymentModal() },
      customSecondaryAction: { label: "Activar plan", onClick: () => openActivateModal() },
      customTertiaryAction: { label: "Exportar", onClick: handleExportMovements },
      hideDefaultPrimaryActions: true,
    });
    return () => resetHeaderState();
  }, [
    handleExportMovements,
    isRefreshing,
    loadWorkspace,
    openActivateModal,
    openPaymentModal,
    resetHeaderState,
    setHeaderState,
    syncedAt,
  ]);

  useEffect(() => {
    setFilters(parsePagosFiltersFromSearchParams(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  const activeChips = useMemo(() => buildPagosFilterChips(filters), [filters]);
  const revenueScaleMax = useMemo(
    () => buildRevenueChartScaleMax(workspace?.revenueByPeriod ?? []),
    [workspace?.revenueByPeriod]
  );
  const hasConfirmedRevenue = (workspace?.revenueSummary.confirmedCount ?? 0) > 0;

  function syncFiltersToUrl(next: PagosFiltersState) {
    const params = pagosFiltersToSearchParams(next);
    router.replace(params.toString() ? `/admin/pagos-y-planes?${params}` : "/admin/pagos-y-planes", {
      scroll: false,
    });
  }

  function updateFilters(next: PagosFiltersState) {
    setFilters(next);
    syncFiltersToUrl(next);
  }

  async function handleActivatePayment() {
    const organizationId = Number(paymentOrgId);
    if (!organizationId) {
      setError("Indica la organización.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/clientes/activate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          planCode: paymentForm.planCode,
          reference: paymentForm.reference,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos registrar el pago.");
      setMessage("Pago registrado y plan activado.");
      setIsPaymentOpen(false);
      setIsActivateOpen(false);
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al activar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmPayment(paymentId: number) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/pagos/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos confirmar.");
      setMessage("Pago confirmado y cuenta activada.");
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al confirmar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRejectPayment(paymentId: number) {
    if (!window.confirm("¿Marcar este pago como rechazado?")) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/pagos/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos rechazar.");
      setMessage("Pago marcado como rechazado.");
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al rechazar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtendTrial(organizationId: number) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/clientes/extend-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, extraDays: 7 }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos extender.");
      setMessage("Trial extendido 7 días.");
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al extender.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyPublicLink(url: string) {
    void navigator.clipboard.writeText(url).then(() => setMessage("Enlace copiado."));
  }

  if (isLoading) {
    return <div className={s.stateCard}>Cargando pagos y planes…</div>;
  }

  if (!workspace) {
    return <div className={s.stateCard}>No hay datos de pagos disponibles.</div>;
  }

  return (
    <div className={s.page}>
      {error ? <div className={s.bannerError}>{error}</div> : null}
      {message ? <div className={s.bannerSuccess}>{message}</div> : null}

      <div className={s.toolbar}>
        <label className={s.searchField}>
          <LuSearch aria-hidden />
          <input
            value={filters.search}
            onChange={(event) => updateFilters({ ...filters, search: event.target.value })}
            placeholder="Buscar empresa, correo, referencia o ID"
            aria-label="Buscar pagos"
          />
        </label>
        <div className={s.toolbarActions}>
          <button type="button" className={s.secondaryBtn} onClick={() => setIsFiltersOpen(true)}>
            <LuFilter aria-hidden /> Filtros
          </button>
          {hasPagosActiveFilters(filters) ? (
            <button type="button" className={s.ghostBtn} onClick={() => updateFilters({ ...EMPTY_PAGOS_FILTERS })}>
              Limpiar filtros
            </button>
          ) : null}
          <label className={s.periodField}>
            Período
            <select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))}>
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
          </label>
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className={s.activeFiltersRow}>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={s.activeFilterChip}
              onClick={() => updateFilters(removePagosFilterChip(filters, chip))}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.resultsMeta}>
        Mostrando {filteredMovements.length} de {workspace.movements.length} movimientos
      </div>

      <AdminPaymentsKpiRow
        kpis={workspace.kpis}
        activeKpiId={activeKpiId}
        onKpiClick={(kpiId) => {
          setActiveKpiId(kpiId);
          updateFilters(applyPagosKpiFilter(filters, kpiId));
        }}
      />

      <section className={s.panel}>
        <div className={s.panelHeader}>
          <h2>Pagos que requieren acción</h2>
          <span>{workspace.actionRows.length}</span>
        </div>
        {workspace.actionRows.length === 0 ? (
          <div className={s.emptyCompact}>No hay pagos accionables ahora mismo.</div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Plan</th>
                  <th>Monto</th>
                  <th>Medio</th>
                  <th>Referencia</th>
                  <th>Situación</th>
                  <th>Fecha</th>
                  <th>Próxima acción</th>
                  <th>Resolver</th>
                </tr>
              </thead>
              <tbody>
                {workspace.actionRows.map((row) => (
                  <tr key={row.id} onClick={() => setDetailRow(row)} className={s.clickableRow}>
                    <td>{row.empresaNombre}</td>
                    <td>
                      {row.paymentStatus ? (
                        <span className={s.statusBadge}>{formatPaymentStatusLabel(row.paymentStatus)}</span>
                      ) : (
                        <ClientStatusBadge status={row.accountStatus} />
                      )}
                    </td>
                    <td>{row.planLabel}</td>
                    <td>{row.amountClp ? formatClp(row.amountClp) : "—"}</td>
                    <td>{row.paymentProvider ? mapProviderLabel(row.paymentProvider) : "—"}</td>
                    <td>{row.reference ?? "—"}</td>
                    <td>{row.situation}</td>
                    <td>{row.fecha ? formatDate(row.fecha) : "—"}</td>
                    <td>{row.proximaAccion}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <AdminPaymentActionCell
                        row={row}
                        onConfirmPayment={handleConfirmPayment}
                        onActivatePlan={openActivateModal}
                        onExtendTrial={handleExtendTrial}
                        onRejectPayment={handleRejectPayment}
                        onMarkLost={() => setMessage("Exporta la cuenta desde Clientes para seguimiento de perdidos.")}
                        onArchiveTest={async (organizationId) => {
                          await fetch("/api/admin/clientes/set-test-account", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ organizationId, isTestAccount: true }),
                          });
                          await loadWorkspace();
                        }}
                        onCopyPublicLink={handleCopyPublicLink}
                        onOpenDetail={setDetailRow}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className={s.mobileCards}>
          {workspace.actionRows.map((row) => (
            <article key={row.id} className={s.mobileCard} onClick={() => setDetailRow(row)}>
              <div className={s.mobileCardHeader}>
                <strong>{row.empresaNombre}</strong>
                {row.paymentStatus ? (
                  <span className={s.statusBadge}>{formatPaymentStatusLabel(row.paymentStatus)}</span>
                ) : (
                  <ClientStatusBadge status={row.accountStatus} />
                )}
              </div>
              <div className={s.mobileMeta}>
                <span>{row.planLabel}</span>
                <span>{row.amountClp ? formatClp(row.amountClp) : "—"}</span>
              </div>
              <div className={s.mobileMeta}>{row.situation}</div>
              <div onClick={(event) => event.stopPropagation()}>
                <AdminPaymentActionCell
                  row={row}
                  onConfirmPayment={handleConfirmPayment}
                  onActivatePlan={openActivateModal}
                  onExtendTrial={handleExtendTrial}
                  onRejectPayment={handleRejectPayment}
                  onMarkLost={() => setMessage("Exporta la cuenta desde Clientes para seguimiento de perdidos.")}
                  onArchiveTest={async (organizationId) => {
                    await fetch("/api/admin/clientes/set-test-account", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ organizationId, isTestAccount: true }),
                    });
                    await loadWorkspace();
                  }}
                  onCopyPublicLink={handleCopyPublicLink}
                  onOpenDetail={setDetailRow}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className={s.secondaryGrid}>
        <section className={s.panel}>
          <h2>Distribución de planes</h2>
          {workspace.planDistribution.length === 0 ? (
            <div className={s.emptyCompact}>Sin cuentas con plan asignado.</div>
          ) : (
            <div className={s.distributionList}>
              {workspace.planDistribution.map((item) => (
                <div key={item.id} className={s.distributionRow}>
                  <div className={s.distributionMeta}>
                    <strong>{item.label}</strong>
                    <span>{item.count} cuentas · {item.pct}%</span>
                  </div>
                  <div className={s.distributionBarTrack}>
                    <div className={s.distributionBarFill} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={s.panel}>
          <div className={s.panelHeader}>
            <div className={s.chartHeading}>
              <h2>Ingresos cobrados por semana</h2>
              {hasConfirmedRevenue ? (
                <p className={s.chartSummary}>
                  Total período: {formatClp(workspace.revenueSummary.totalClp)} ·{" "}
                  {workspace.revenueSummary.confirmedCount}{" "}
                  {workspace.revenueSummary.confirmedCount === 1
                    ? "pago confirmado"
                    : "pagos confirmados"}
                </p>
              ) : null}
            </div>
          </div>
          {!hasConfirmedRevenue ? (
            <div className={s.emptyCompact}>No hay ingresos confirmados en este período.</div>
          ) : (
            <div className={s.chart}>
              {workspace.revenueByPeriod.map((item) => {
                const barHeight = formatRevenueBarHeight(item.amountClp, revenueScaleMax);
                const hasIncome = item.amountClp > 0;

                return (
                  <div
                    key={item.id}
                    className={s.chartBarWrap}
                    title={formatWeeklyRevenueTooltip(item)}
                  >
                    <span
                      className={`${s.chartBarAmount} ${hasIncome ? "" : s.chartBarAmountZero}`}
                    >
                      {hasIncome ? formatClp(item.amountClp) : "$0"}
                    </span>
                    <div className={s.chartBarTrack} aria-hidden>
                      <div
                        className={`${s.chartBar} ${hasIncome ? "" : s.chartBarEmpty}`}
                        style={hasIncome ? { height: `${barHeight}%` } : undefined}
                      />
                    </div>
                    <span className={s.chartBarLabel}>Sem. {item.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className={s.secondaryGrid}>
        <section className={s.panel}>
          <h2>Renovaciones próximas</h2>
          {workspace.upcomingRenewals.length === 0 ? (
            <div className={s.emptyCompact}>No hay renovaciones en la ventana operativa.</div>
          ) : (
            <div className={s.compactTableWrap}>
              <table className={s.compactTable}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Plan</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.upcomingRenewals.map((row) => (
                    <tr key={row.id}>
                      <td>{row.empresaNombre}</td>
                      <td>{row.planLabel}</td>
                      <td>{row.venceLabel}</td>
                      <td><ClientStatusBadge status={row.accountStatus} /></td>
                      <td>
                        {row.whatsappUrl ? (
                          <a href={row.whatsappUrl} target="_blank" rel="noreferrer" className={s.linkAction}>
                            Notificar
                          </a>
                        ) : (
                          <Link href={`/admin/clientes/${row.organizationId}`} className={s.linkAction}>
                            Ver ficha
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={s.panel}>
          <div className={s.panelHeader}>
            <h2>Historial reciente</h2>
            <button type="button" className={s.linkAction} onClick={() => updateFilters({ ...EMPTY_PAGOS_FILTERS, paymentStatuses: ["confirmado"] })}>
              Ver todos los pagos
            </button>
          </div>
          {workspace.recentPayments.length === 0 ? (
            <div className={s.emptyCompact}>No hay pagos registrados todavía.</div>
          ) : (
            <div className={s.compactTableWrap}>
              <table className={s.compactTable}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Empresa</th>
                    <th>Monto</th>
                    <th>Medio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.recentPayments.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.fecha)}</td>
                      <td>{row.empresaNombre}</td>
                      <td>{formatClp(row.amountClp)}</td>
                      <td>{mapProviderLabel(row.paymentProvider)}</td>
                      <td>{formatPaymentStatusLabel(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AdminPaymentsFiltersPanel
        filters={filters}
        onChange={updateFilters}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />

      <AdminPaymentDetailDrawer
        row={detailRow}
        onClose={() => setDetailRow(null)}
        onConfirmPayment={handleConfirmPayment}
        onActivatePlan={openActivateModal}
        onExtendTrial={handleExtendTrial}
        onRejectPayment={handleRejectPayment}
      />

      {(isPaymentOpen || isActivateOpen) ? (
        <div className={s.modalBackdrop} onClick={() => { setIsPaymentOpen(false); setIsActivateOpen(false); }}>
          <div className={s.modal} onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>{isPaymentOpen ? "Registrar pago" : "Activar plan"}</h3>
              <button type="button" className={s.iconBtn} onClick={() => { setIsPaymentOpen(false); setIsActivateOpen(false); }}>
                <LuX aria-hidden />
              </button>
            </div>
            <div className={s.form}>
              <label>
                Organización ID
                <input value={paymentOrgId} onChange={(event) => setPaymentOrgId(event.target.value)} />
              </label>
              <label>
                Plan
                <select value={paymentForm.planCode} onChange={(event) => setPaymentForm((current) => ({ ...current, planCode: event.target.value as BillingPlanCode }))}>
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Referencia
                <input value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => { setIsPaymentOpen(false); setIsActivateOpen(false); }}>Cancelar</button>
                <button type="button" className={s.primaryBtn} disabled={isSubmitting} onClick={() => void handleActivatePayment()}>
                  {isPaymentOpen ? "Registrar pago" : "Activar plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
