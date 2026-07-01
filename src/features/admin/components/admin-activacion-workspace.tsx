"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuFilter, LuSearch, LuX, LuFileText, LuDownload, LuCircleCheck, LuRefreshCw } from "react-icons/lu";

import { AdminActivacionActionCell } from "@/features/admin/components/admin-activacion-action-cell";
import { AdminActivacionFiltersPanel } from "@/features/admin/components/admin-activacion-filters-panel";
import { AdminActivacionKpiRow } from "@/features/admin/components/admin-activacion-kpi-row";
import { useAdminHeaderActions } from "@/features/admin/components/admin-header-context";
import {
  ACTIVACION_WHATSAPP_TEMPLATES,
} from "@/features/admin/services/admin-activacion-messages";
import {
  EMPTY_ACTIVACION_FILTERS,
  activacionFiltersToSearchParams,
  applyActivacionKpiFilter,
  buildActivacionFilterChips,
  filterActivacionAttentionRows,
  hasActivacionActiveFilters,
  mapAccountStatusLabel,
  parseActivacionFiltersFromSearchParams,
  removeActivacionFilterChip,
} from "@/features/admin/services/admin-activacion-filters.service";
import type { ActivacionTimelineEvent, ActivacionWorkspace } from "@/features/admin/types/admin-activacion";
import type { BillingPlanCode } from "@/features/billing/types/plans";
import s from "./admin-activacion-workspace.module.css";

const PLAN_OPTIONS: Array<{ value: BillingPlanCode; label: string }> = [
  { value: "founder_monthly", label: "Founder mensual ($8.990)" },
  { value: "founder_full_annual", label: "Founder anual ($79.990)" },
  { value: "quote_only_annual", label: "Solo cotización anual ($59.990)" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function UsageBadges({
  cotizaciones,
  pdfs,
}: {
  cotizaciones: number;
  pdfs: number;
}) {
  return (
    <div className={s.usageBadges}>
      <span className={s.usageBadge}>{cotizaciones} cotizaciones</span>
      <span className={s.usageBadge}>{pdfs} PDF</span>
    </div>
  );
}

function TimelineEventIcon({ type }: { type: ActivacionTimelineEvent["type"] }) {
  const className = s.timelineIcon;
  switch (type) {
    case "first_quote":
      return <LuFileText aria-hidden className={className} />;
    case "first_pdf":
      return <LuDownload aria-hidden className={className} />;
    case "activation_complete":
      return <LuCircleCheck aria-hidden className={className} />;
    case "account_reactivated":
      return <LuRefreshCw aria-hidden className={className} />;
  }
}

export function AdminActivacionWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const [workspace, setWorkspace] = useState<ActivacionWorkspace | null>(null);
  const [filters, setFilters] = useState(() =>
    parseActivacionFiltersFromSearchParams(new URLSearchParams(searchParams.toString()))
  );
  const [activeKpiId, setActiveKpiId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    planCode: "founder_monthly" as BillingPlanCode,
    reference: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/activacion");
      const payload = (await response.json()) as {
        workspace?: ActivacionWorkspace;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar activación.");
      setWorkspace(payload.workspace ?? null);
      setSyncedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const filteredRows = useMemo(
    () =>
      filterActivacionAttentionRows(
        workspace?.attentionRows ?? [],
        workspace?.accounts ?? [],
        filters
      ),
    [workspace?.attentionRows, workspace?.accounts, filters]
  );

  const viewCounts = useMemo(() => {
    const rows = workspace?.attentionRows ?? [];
    return {
      activation: rows.filter((row) => row.segment === "activation").length,
      postActivation: rows.filter((row) => row.segment === "post_activation").length,
    };
  }, [workspace?.attentionRows]);

  const guideClientHref = useMemo(() => {
    const firstActivationRow =
      filteredRows.find((row) => row.segment === "activation") ??
      workspace?.attentionRows.find((row) => row.segment === "activation");
    return firstActivationRow
      ? `/admin/clientes/${firstActivationRow.organizationId}`
      : "/admin/clientes";
  }, [filteredRows, workspace?.attentionRows]);

  const handleExport = useCallback(() => {
    const header = [
      "id",
      "empresa",
      "estado",
      "etapa",
      "uso",
      "ultima_actividad",
      "vencimiento",
      "bloqueo",
      "proxima_accion",
    ];
    const csv = [
      header.join(","),
      ...filteredRows.map((row) =>
        [
          row.organizationId,
          row.empresaNombre,
          row.accountStatus,
          row.stageLabel,
          row.usageLabel,
          row.lastActivityLabel,
          row.expiryLabel,
          row.bloqueo,
          row.proximaAccion,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `activacion-ventora-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [filteredRows]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    setHeaderState({
      syncedAt,
      isRefreshing,
      onRefresh: () => void loadWorkspace(),
      customPrimaryAction: {
        label: "Ver plantillas de WhatsApp",
        onClick: () => setIsTemplatesOpen(true),
      },
      customSecondaryAction: {
        label: "Extender trial",
        onClick: () => setIsExtendOpen(true),
      },
      customTertiaryAction: {
        label: "Exportar",
        onClick: handleExport,
      },
      hideDefaultPrimaryActions: true,
    });
    return () => resetHeaderState();
  }, [
    handleExport,
    isRefreshing,
    loadWorkspace,
    resetHeaderState,
    setHeaderState,
    syncedAt,
  ]);

  useEffect(() => {
    setFilters(parseActivacionFiltersFromSearchParams(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  const activeChips = useMemo(() => buildActivacionFilterChips(filters), [filters]);

  function syncFiltersToUrl(next: typeof filters) {
    const params = activacionFiltersToSearchParams(next);
    router.replace(params.toString() ? `/admin/activacion?${params}` : "/admin/activacion", {
      scroll: false,
    });
  }

  function updateFilters(next: typeof filters) {
    setFilters(next);
    syncFiltersToUrl(next);
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
      if (!response.ok) throw new Error(payload.error ?? "No pudimos extender el trial.");
      setMessage("Trial extendido 7 días.");
      setIsExtendOpen(false);
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al extender.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleActivatePayment() {
    const organizationId = Number(targetOrgId);
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
      if (!response.ok) throw new Error(payload.error ?? "No pudimos activar el plan.");
      setMessage("Plan activado correctamente.");
      setIsActivateOpen(false);
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al activar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openActivatePlan(organizationId: number) {
    setTargetOrgId(String(organizationId));
    setIsActivateOpen(true);
  }

  function openRegisterPayment(organizationId: number) {
    router.push(`/admin/pagos-y-planes?org=${organizationId}`);
  }

  function handleFunnelClick(stageId: string) {
    if (stageId === "account_access") {
      updateFilters({
        ...filters,
        view: "activation",
        stages: [],
        accountTypes: ["real"],
      });
      return;
    }
    if (stageId === "first_quote") {
      updateFilters({
        ...filters,
        view: "activation",
        stages: ["first_quote"],
        accountTypes: ["real"],
      });
      return;
    }
    if (stageId === "pdf_generated") {
      updateFilters({
        ...applyActivacionKpiFilter(filters, "quote_no_pdf"),
        view: "activation",
      });
      return;
    }
    if (stageId === "activation_complete") {
      updateFilters({
        ...filters,
        view: "post_activation",
        stages: ["activation_complete"],
        accountTypes: ["real"],
      });
      return;
    }
    updateFilters(applyActivacionKpiFilter(filters, stageId));
  }

  function switchTableView(view: "activation" | "post_activation") {
    updateFilters({
      ...filters,
      view,
      stages: view === "post_activation" ? [] : filters.stages,
    });
  }

  if (isLoading) {
    return <div className={s.stateCard}>Cargando activación…</div>;
  }

  if (!workspace) {
    return <div className={s.stateCard}>No hay datos de activación disponibles.</div>;
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
            placeholder="Buscar empresa, contacto, correo o ID"
            aria-label="Buscar cuentas"
          />
        </label>
        <div className={s.toolbarActions}>
          <button type="button" className={s.secondaryBtn} onClick={() => setIsFiltersOpen(true)}>
            <LuFilter aria-hidden /> Filtros
          </button>
          {hasActivacionActiveFilters(filters) ? (
            <button
              type="button"
              className={s.ghostBtn}
              onClick={() =>
                updateFilters({ ...EMPTY_ACTIVACION_FILTERS, view: filters.view })
              }
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
              onClick={() => updateFilters(removeActivacionFilterChip(filters, chip))}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.resultsMeta}>
        Mostrando {filteredRows.length} de{" "}
        {filters.view === "post_activation"
          ? viewCounts.postActivation
          : viewCounts.activation}{" "}
        cuentas
        {filters.view === "post_activation" ? " en seguimiento post-activación" : ""}
      </div>

      <AdminActivacionKpiRow
        kpis={workspace.kpis}
        activeKpiId={activeKpiId}
        onKpiClick={(kpiId) => {
          setActiveKpiId(kpiId);
          updateFilters(applyActivacionKpiFilter(filters, kpiId));
        }}
      />

      <section className={s.panel}>
        <div className={s.panelHeader}>
          <div className={s.tableHeaderMain}>
            <div className={s.viewTabs} role="tablist" aria-label="Vista de cuentas">
              <button
                type="button"
                role="tab"
                aria-selected={filters.view === "activation"}
                className={
                  filters.view === "activation" ? s.viewTabActive : s.viewTab
                }
                onClick={() => switchTableView("activation")}
              >
                Cuentas que necesitan activación
                <span className={s.viewTabCount}>{viewCounts.activation}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filters.view === "post_activation"}
                className={
                  filters.view === "post_activation" ? s.viewTabActive : s.viewTab
                }
                onClick={() => switchTableView("post_activation")}
              >
                Seguimiento post-activación
                <span className={s.viewTabCount}>{viewCounts.postActivation}</span>
              </button>
            </div>
          </div>
          <span>{filteredRows.length}</span>
        </div>
        {filteredRows.length === 0 ? (
          <div className={s.emptyCompact}>
            {filters.view === "post_activation"
              ? "No hay clientes activos con actividad baja para seguimiento."
              : "No hay cuentas accionables con los filtros actuales."}
          </div>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Estado de cuenta</th>
                    <th>Etapa actual</th>
                    <th>Uso</th>
                    <th>Última actividad</th>
                    <th>Trial / vencimiento</th>
                    <th>Bloqueo principal</th>
                    <th>Próxima acción</th>
                    <th>Resolver</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/admin/clientes/${row.organizationId}`}>{row.empresaNombre}</Link>
                      </td>
                      <td>
                        <span className={s.statusBadge}>{mapAccountStatusLabel(row.accountStatus)}</span>
                      </td>
                      <td>{row.stageLabel}</td>
                      <td>
                        <UsageBadges
                          cotizaciones={row.cotizacionesCount}
                          pdfs={row.pdfsGeneradosCount}
                        />
                      </td>
                      <td>{row.lastActivityLabel}</td>
                      <td>{row.expiryLabel}</td>
                      <td>{row.bloqueo}</td>
                      <td>{row.proximaAccion}</td>
                      <td>
                        <AdminActivacionActionCell
                          row={row}
                          appOrigin={appOrigin}
                          onExtendTrial={handleExtendTrial}
                          onActivatePlan={openActivatePlan}
                          onRegisterPayment={openRegisterPayment}
                          onMarkLost={() =>
                            setMessage("Registra el seguimiento comercial desde Clientes.")
                          }
                          onArchiveTest={async (organizationId) => {
                            await fetch("/api/admin/clientes/set-test-account", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ organizationId, isTestAccount: true }),
                            });
                            await loadWorkspace();
                          }}
                          onMarkActivated={() =>
                            setMessage(
                              "La activación se registra cuando hay primer PDF generado en la cuenta."
                            )
                          }
                          onCopyPublicLink={(url) => {
                            void navigator.clipboard.writeText(url).then(() => {
                              setMessage("Enlace copiado.");
                            });
                          }}
                          onOpenTemplates={() => setIsTemplatesOpen(true)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={s.mobileCards}>
              {filteredRows.map((row) => (
                <article key={row.id} className={s.mobileCard}>
                  <div className={s.mobileCardHeader}>
                    <strong>{row.empresaNombre}</strong>
                    <span className={s.statusBadge}>{mapAccountStatusLabel(row.accountStatus)}</span>
                  </div>
                  <div className={s.mobileMeta}>
                    {row.stageLabel}
                  </div>
                  <UsageBadges
                    cotizaciones={row.cotizacionesCount}
                    pdfs={row.pdfsGeneradosCount}
                  />
                  <div className={s.mobileMeta}>{row.bloqueo}</div>
                  <AdminActivacionActionCell
                    row={row}
                    appOrigin={appOrigin}
                    onExtendTrial={handleExtendTrial}
                    onActivatePlan={openActivatePlan}
                    onRegisterPayment={openRegisterPayment}
                    onMarkLost={() => setMessage("Registra el seguimiento comercial desde Clientes.")}
                    onArchiveTest={async (organizationId) => {
                      await fetch("/api/admin/clientes/set-test-account", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ organizationId, isTestAccount: true }),
                      });
                      await loadWorkspace();
                    }}
                    onMarkActivated={() =>
                      setMessage("La activación se registra cuando hay primer PDF generado.")
                    }
                    onCopyPublicLink={(url) => {
                      void navigator.clipboard.writeText(url).then(() => setMessage("Enlace copiado."));
                    }}
                    onOpenTemplates={() => setIsTemplatesOpen(true)}
                  />
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <div className={s.secondaryGrid}>
        <section className={`${s.panel} ${s.panelCompact}`}>
          <h2 className={s.panelTitle}>Embudo de activación</h2>
          {workspace.funnel.length === 0 ? (
            <div className={s.emptyCompact}>No hay cuentas en esta etapa.</div>
          ) : (
            <>
              <div className={s.funnelList}>
                {workspace.funnel.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    className={s.funnelItem}
                    onClick={() => handleFunnelClick(step.id)}
                    title={step.fallbackNote}
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
                        style={{ width: `${Math.max(step.pct, 2)}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              {workspace.funnelDropStageId ? (
                <p className={s.funnelInsight}>
                  Principal caída detectada:{" "}
                  {workspace.funnel.find((step) => step.id === workspace.funnelDropStageId)
                    ?.label ?? workspace.funnelDropStageId}
                </p>
              ) : (
                <p className={s.funnelInsightMuted}>No hay caída significativa detectada.</p>
              )}
            </>
          )}
        </section>

        <section className={`${s.panel} ${s.panelCompact}`}>
          <h2 className={s.panelTitle}>Activaciones recientes</h2>
          {workspace.timelineLimited || workspace.recentEvents.length === 0 ? (
            <div className={s.emptyCompact}>No hay activaciones recientes.</div>
          ) : (
            <div className={s.timelineScroll}>
              <div className={s.timelineList}>
                {workspace.recentEvents.map((event) => (
                  <div key={event.id} className={s.timelineItem}>
                    <div className={s.timelineIconWrap}>
                      <TimelineEventIcon type={event.type} />
                    </div>
                    <div className={s.timelineBody}>
                      <strong>{event.label}</strong>
                      <span>
                        {event.empresaNombre} · {formatDate(event.fecha)}
                      </span>
                    </div>
                    <Link
                      href={`/admin/clientes/${event.organizationId}`}
                      className={s.timelineLink}
                    >
                      Ver ficha
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className={`${s.panel} ${s.panelCompact}`}>
        <h2 className={s.panelTitle}>Guía de activación</h2>
        <div className={s.guideStepsRow}>
          <div className={s.guideStep}>
            <span className={s.guideStepNum}>1</span>
            <div className={s.guideStepCopy}>
              <strong>Contactar</strong>
              <p>Confirmar que la cuenta puede entrar al producto.</p>
            </div>
            <button
              type="button"
              className={s.guideStepAction}
              onClick={() => setIsTemplatesOpen(true)}
            >
              Abrir plantilla
            </button>
          </div>
          <div className={s.guideStep}>
            <span className={s.guideStepNum}>2</span>
            <div className={s.guideStepCopy}>
              <strong>Configurar</strong>
              <p>Datos básicos y página pública si aplica.</p>
            </div>
            <Link href={guideClientHref} className={s.guideStepAction}>
              Ver ficha
            </Link>
          </div>
          <div className={s.guideStep}>
            <span className={s.guideStepNum}>3</span>
            <div className={s.guideStepCopy}>
              <strong>Primera cotización y PDF</strong>
              <p>Lograr el primer resultado compartible con el cliente.</p>
            </div>
            <Link href="/cotizaciones" className={s.guideStepAction}>
              Ver cotizaciones
            </Link>
          </div>
        </div>
      </section>

      <AdminActivacionFiltersPanel
        filters={filters}
        onChange={updateFilters}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />

      {isTemplatesOpen ? (
        <div className={s.modalBackdrop} onClick={() => setIsTemplatesOpen(false)}>
          <div className={s.modal} onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Plantillas de WhatsApp</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsTemplatesOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <div className={s.templateList}>
              {ACTIVACION_WHATSAPP_TEMPLATES.map((template) => {
                const message = template.buildMessage({
                  appOrigin: appOrigin || "https://app.ventora.cl",
                  empresaNombre: "tu empresa",
                });
                return (
                  <article key={template.id} className={s.templateCard}>
                    <strong>{template.title}</strong>
                    <p>{template.description}</p>
                    <pre className={s.templatePreview}>{message}</pre>
                    <button
                      type="button"
                      className={s.secondaryBtn}
                      onClick={() => {
                        void navigator.clipboard.writeText(message).then(() => {
                          setMessage(`Plantilla "${template.title}" copiada.`);
                        });
                      }}
                    >
                      Copiar mensaje
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {isExtendOpen ? (
        <div className={s.modalBackdrop} onClick={() => setIsExtendOpen(false)}>
          <div className={s.modal} onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Extender trial 7 días</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsExtendOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <div className={s.form}>
              <label>
                Organización ID
                <input value={targetOrgId} onChange={(event) => setTargetOrgId(event.target.value)} />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => setIsExtendOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={s.primaryBtn}
                  disabled={isSubmitting}
                  onClick={() => void handleExtendTrial(Number(targetOrgId))}
                >
                  Extender trial
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isActivateOpen ? (
        <div className={s.modalBackdrop} onClick={() => setIsActivateOpen(false)}>
          <div className={s.modal} onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Activar plan</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsActivateOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <div className={s.form}>
              <label>
                Organización ID
                <input value={targetOrgId} onChange={(event) => setTargetOrgId(event.target.value)} />
              </label>
              <label>
                Plan
                <select
                  value={paymentForm.planCode}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      planCode: event.target.value as BillingPlanCode,
                    }))
                  }
                >
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Referencia
                <input
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, reference: event.target.value }))
                  }
                />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => setIsActivateOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={s.primaryBtn}
                  disabled={isSubmitting}
                  onClick={() => void handleActivatePayment()}
                >
                  Activar plan
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
