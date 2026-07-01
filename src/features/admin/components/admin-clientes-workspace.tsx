"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { LuDownload, LuFilter, LuSearch, LuX } from "react-icons/lu";

import { AdminClientAttentionActions } from "@/features/admin/components/admin-client-attention-actions";
import { AdminClientesKpiRow } from "@/features/admin/components/admin-clientes-kpi-row";
import { AdminClientesFiltersPanel } from "@/features/admin/components/admin-clientes-filters-panel";
import { useAdminHeaderActions } from "@/features/admin/components/admin-header-context";
import { ClientStatusBadge } from "@/features/admin/components/client-status-badge";
import {
  buildClientesAttentionRows,
  buildClientesKpis,
  filtersIncludeAttentionRow,
  EMPTY_CLIENTES_FILTERS,
  QUICK_FILTER_CHIPS,
  applyQuickView,
  buildActiveFilterChips,
  filterAndSortClientesList,
  filtersToSearchParams,
  hasActiveFilters,
  isQuickChipActive,
  parseClientesFiltersFromSearchParams,
  pluralizeCotizaciones,
  formatOperationalExpiry,
  formatRelativeActivity,
  removeFilterChip,
  toggleQuickFilterChip,
  type ClientesFiltersState,
  type ClientesSortField,
  type QuickViewId,
  type ClientesAttentionRow,
  type ClientesKpiCard,
} from "@/features/admin/services/admin-clientes-filters.service";
import {
  buildProvisionCredentialsText,
  buildProvisionWhatsAppMessage,
} from "@/features/admin/services/admin-provision-message";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { BillingPlanCode } from "@/features/billing/types/plans";
import s from "./admin-clientes-workspace.module.css";

const PLAN_OPTIONS: Array<{ value: BillingPlanCode; label: string }> = [
  { value: "founder_monthly", label: "Founder mensual ($8.990)" },
  { value: "founder_full_annual", label: "Founder anual ($79.990)" },
  { value: "quote_only_annual", label: "Solo cotización anual ($59.990)" },
];

const SORT_OPTIONS: Array<{ value: ClientesSortField; label: string }> = [
  { value: "lastActivity", label: "Última actividad" },
  { value: "expiry", label: "Vencimiento / renovación" },
  { value: "cotizaciones", label: "Cotizaciones" },
  { value: "estado", label: "Estado" },
  { value: "createdAt", label: "Fecha de creación" },
];

type ProvisionSuccess = {
  organizationId: number;
  empresaNombre: string;
  email: string;
  password: string;
  trialEndsAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() > 2100) return "—";
  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function AdminClientesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();

  const [clients, setClients] = useState<AdminClientListItem[]>([]);
  const [filters, setFilters] = useState<ClientesFiltersState>(() =>
    parseClientesFiltersFromSearchParams(new URLSearchParams(searchParams.toString()))
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTrialOpen, setIsTrialOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"archive" | "lost" | null>(null);
  const [paymentOrgId, setPaymentOrgId] = useState("");
  const [provisionSuccess, setProvisionSuccess] = useState<ProvisionSuccess | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [provisionForm, setProvisionForm] = useState({
    email: "",
    password: "",
    empresaNombre: "",
    isTestAccount: false,
  });
  const [paymentForm, setPaymentForm] = useState({
    planCode: "founder_monthly" as BillingPlanCode,
    reference: "",
  });

  const syncFiltersToUrl = useCallback(
    (next: ClientesFiltersState) => {
      const params = filtersToSearchParams(next);
      const query = params.toString();
      router.replace(query ? `/admin/clientes?${query}` : "/admin/clientes", {
        scroll: false,
      });
    },
    [router]
  );

  const updateFilters = useCallback(
    (next: ClientesFiltersState) => {
      setFilters(next);
      syncFiltersToUrl(next);
      setSelectedIds([]);
    },
    [syncFiltersToUrl]
  );

  const openTrialModal = useCallback(() => setIsTrialOpen(true), []);
  const openPaymentModal = useCallback((organizationId?: number) => {
    if (organizationId) {
      setPaymentOrgId(String(organizationId));
    }
    setIsPaymentOpen(true);
  }, []);

  const loadClients = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/clientes");
      const payload = (await response.json()) as {
        clients?: AdminClientListItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar clientes.");
      }
      setClients(payload.clients ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    setHeaderState({
      onRefresh: () => void loadClients(),
      customPrimaryAction: {
        label: "Crear cuenta trial",
        onClick: openTrialModal,
      },
      customSecondaryAction: {
        label: "Registrar pago",
        onClick: () => openPaymentModal(),
      },
      hideDefaultPrimaryActions: true,
    });
    return () => resetHeaderState();
  }, [loadClients, openPaymentModal, openTrialModal, resetHeaderState, setHeaderState]);

  useEffect(() => {
    const parsed = parseClientesFiltersFromSearchParams(
      new URLSearchParams(searchParams.toString())
    );
    setFilters(parsed);
  }, [searchParams]);

  const kpis = useMemo(() => buildClientesKpis(clients), [clients]);
  const filteredClients = useMemo(
    () => filterAndSortClientesList(clients, filters),
    [clients, filters]
  );
  const attentionRows = useMemo(
    () =>
      buildClientesAttentionRows(clients).filter((row) =>
        filtersIncludeAttentionRow(filters, row, clients)
      ),
    [clients, filters]
  );
  const activeChips = useMemo(() => buildActiveFilterChips(filters), [filters]);
  const allFilteredSelected =
    filteredClients.length > 0 &&
    filteredClients.every((client) => selectedIds.includes(client.organizationId));

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredClients.map((client) => client.organizationId));
  }

  function toggleSelect(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function clearFilters() {
    updateFilters({ ...EMPTY_CLIENTES_FILTERS });
  }

  function applyQuickViewPreset(viewId: QuickViewId) {
    updateFilters({
      ...applyQuickView(viewId),
      search: filters.search,
      sortField: filters.sortField,
      sortDirection: filters.sortDirection,
    });
  }

  function exportClients(rows: AdminClientListItem[], suffix: string) {
    const header = ["id", "empresa", "correo", "estado", "plan", "cotizaciones"];
    const csvRows = rows.map((client) =>
      [
        client.organizationId,
        client.empresaNombre,
        client.correoPrincipal ?? "",
        client.estadoEfectivo,
        client.planLabel,
        client.cotizacionesCount,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...csvRows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `clientes-ventora-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleProvision(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const submittedCredentials = { ...provisionForm };
    try {
      const response = await fetch("/api/admin/clientes/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedCredentials),
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: ProvisionSuccess;
      };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos crear la cuenta.");
      if (payload.result) {
        setProvisionSuccess({
          ...payload.result,
          password: submittedCredentials.password,
        });
        setPaymentOrgId(String(payload.result.organizationId));
      }
      setProvisionForm({ email: "", password: "", empresaNombre: "", isTestAccount: false });
      setIsTrialOpen(false);
      await loadClients();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al crear.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleActivatePayment() {
    const organizationId = Number(paymentOrgId);
    if (!organizationId) {
      setError("Selecciona una organización.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
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
      const payload = (await response.json()) as {
        error?: string;
        result?: { periodEndsAt: string };
      };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos registrar el pago.");
      setMessage(`Pago activo hasta ${formatDate(payload.result?.periodEndsAt ?? null)}.`);
      setIsPaymentOpen(false);
      await loadClients();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al pagar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtendTrial(organizationIds: number[]) {
    setIsSubmitting(true);
    setError(null);
    try {
      for (const organizationId of organizationIds) {
        const response = await fetch("/api/admin/clientes/extend-trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, extraDays: 7 }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? `No pudimos extender el trial #${organizationId}.`);
        }
      }
      setMessage(
        organizationIds.length === 1
          ? "Trial extendido 7 días."
          : `Trial extendido en ${organizationIds.length} cuentas.`
      );
      setSelectedIds([]);
      await loadClients();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al extender.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivateTrial(organizationId: number) {
    const client = clients.find((item) => item.organizationId === organizationId);
    const empresa = client?.empresaNombre ?? `Cuenta #${organizationId}`;

    if (
      !window.confirm(
        `¿Desactivar el trial de ${empresa}? La cuenta quedará vencida. Si fue un error al crearla, también puedes marcarla como cuenta de prueba.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/clientes/deactivate-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos desactivar el trial.");
      }
      setMessage(`Trial desactivado para ${empresa}.`);
      await loadClients();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al desactivar trial.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchiveTestAccounts(organizationIds: number[]) {
    setIsSubmitting(true);
    setError(null);
    try {
      for (const organizationId of organizationIds) {
        const response = await fetch("/api/admin/clientes/set-test-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, isTestAccount: true }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? `No pudimos archivar #${organizationId}.`);
        }
      }
      setMessage(`Marcadas ${organizationIds.length} cuentas como prueba.`);
      setSelectedIds([]);
      setConfirmAction(null);
      await loadClients();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al archivar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleMarkLostSingle(organizationId: number) {
    setSelectedIds([organizationId]);
    setConfirmAction("lost");
  }

  function handleCopyPublicLink(url: string) {
    void copyToClipboard(url).then(() => setMessage("Enlace de página pública copiado."));
  }

  function renderAttentionAction(row: ClientesAttentionRow) {
    const client = clients.find((item) => item.organizationId === row.organizationId);
    if (!client) {
      return (
        <Link href={`/admin/clientes/${row.organizationId}`} className={s.tableAction}>
          Ver ficha
        </Link>
      );
    }

    return (
      <AdminClientAttentionActions
        row={row}
        client={client}
        appOrigin={appOrigin}
        onRegisterPayment={openPaymentModal}
        onExtendTrial={(organizationId) => void handleExtendTrial([organizationId])}
        onArchiveTest={(organizationId) => {
          setSelectedIds([organizationId]);
          setConfirmAction("archive");
        }}
        onMarkLost={handleMarkLostSingle}
        onCopyPublicLink={handleCopyPublicLink}
        onDeactivateTrial={(organizationId) => void handleDeactivateTrial(organizationId)}
      />
    );
  }

  function handleKpiClick(kpi: ClientesKpiCard) {
    updateFilters({
      ...filters,
      accountTypes: kpi.toggle.accountTypes
        ? [...new Set([...filters.accountTypes, ...kpi.toggle.accountTypes])]
        : filters.accountTypes,
      subscriptionStatuses: kpi.toggle.subscriptionStatuses
        ? [
            ...new Set([
              ...filters.subscriptionStatuses,
              ...kpi.toggle.subscriptionStatuses,
            ]),
          ]
        : filters.subscriptionStatuses,
      usage: kpi.toggle.usage
        ? [...new Set([...filters.usage, ...kpi.toggle.usage])]
        : filters.usage,
    });
  }

  if (isLoading) {
    return <div className={s.stateCard}>Cargando cuentas SaaS…</div>;
  }

  return (
    <div className={s.page}>
      {error ? <div className={s.bannerError}>{error}</div> : null}
      {message ? <div className={s.bannerSuccess}>{message}</div> : null}

      {provisionSuccess ? (
        <div className={s.bannerSuccess}>
          Cuenta #{provisionSuccess.organizationId} creada · trial hasta{" "}
          {formatDate(provisionSuccess.trialEndsAt)}
          <div className={s.emptyActions}>
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={() =>
                void copyToClipboard(
                  buildProvisionCredentialsText({
                    email: provisionSuccess.email,
                    password: provisionSuccess.password,
                  })
                ).then(() => setCopyFeedback("Credenciales copiadas."))
              }
            >
              Copiar credenciales
            </button>
            <button
              type="button"
              className={s.primaryBtn}
              onClick={() =>
                void copyToClipboard(
                  buildProvisionWhatsAppMessage({
                    appOrigin,
                    empresaNombre: provisionSuccess.empresaNombre,
                    email: provisionSuccess.email,
                    password: provisionSuccess.password,
                    trialEndsAt: provisionSuccess.trialEndsAt,
                  })
                ).then(() => setCopyFeedback("Mensaje WhatsApp copiado."))
              }
            >
              Copiar WhatsApp
            </button>
          </div>
          {copyFeedback ? <span>{copyFeedback}</span> : null}
        </div>
      ) : null}

      <div className={s.toolbar}>
        <label className={s.searchField}>
          <LuSearch aria-hidden />
          <input
            value={filters.search}
            onChange={(event) =>
              updateFilters({ ...filters, search: event.target.value })
            }
            placeholder="Buscar empresa, contacto, correo o ID"
            aria-label="Buscar clientes"
          />
        </label>
        <div className={s.toolbarActions}>
          <button type="button" className={s.secondaryBtn} onClick={() => setIsFiltersOpen(true)}>
            <LuFilter aria-hidden />
            Filtros
          </button>
          {hasActiveFilters(filters) ? (
            <button type="button" className={s.ghostBtn} onClick={clearFilters}>
              Limpiar filtros
            </button>
          ) : null}
          <button
            type="button"
            className={s.secondaryBtn}
            onClick={() => exportClients(filteredClients, "filtrados")}
          >
            <LuDownload aria-hidden />
            Exportar
          </button>
        </div>
      </div>

      <div className={s.filterRow}>
        {QUICK_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className={`${s.filterChip} ${isQuickChipActive(filters, chip.apply) ? s.filterChipActive : ""}`}
            onClick={() => updateFilters(toggleQuickFilterChip(filters, chip.apply))}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {activeChips.length > 0 ? (
        <div className={s.activeFiltersRow}>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={s.activeFilterChip}
              onClick={() => updateFilters(removeFilterChip(filters, chip))}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.resultsMeta}>
        <span>
          Mostrando {filteredClients.length} de {clients.length} cuentas
        </span>
        <label className={s.sortField}>
          Ordenar
          <select
            value={`${filters.sortField}:${filters.sortDirection}`}
            onChange={(event) => {
              const [sortField, sortDirection] = event.target.value.split(":") as [
                ClientesSortField,
                "asc" | "desc",
              ];
              updateFilters({ ...filters, sortField, sortDirection });
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <optgroup key={option.value} label={option.label}>
                <option value={`${option.value}:desc`}>{option.label} ↓</option>
                <option value={`${option.value}:asc`}>{option.label} ↑</option>
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <AdminClientesKpiRow kpis={kpis} filters={filters} onKpiClick={handleKpiClick} />

      {selectedIds.length > 0 ? (
        <div className={s.bulkBar}>
          <strong>{selectedIds.length} seleccionadas</strong>
          <div className={s.bulkActions}>
            <button
              type="button"
              className={s.secondaryBtn}
              disabled={isSubmitting}
              onClick={() => void handleExtendTrial(selectedIds)}
            >
              Extender trial
            </button>
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={() => {
                if (selectedIds.length === 1) {
                  openPaymentModal(selectedIds[0]);
                } else {
                  setError("Selecciona una sola cuenta para registrar pago.");
                }
              }}
            >
              Registrar pago
            </button>
            <button
              type="button"
              className={s.ghostBtn}
              onClick={() => setConfirmAction("lost")}
            >
              Marcar como perdido
            </button>
            <button
              type="button"
              className={s.ghostBtn}
              onClick={() => setConfirmAction("archive")}
            >
              Archivar prueba
            </button>
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={() =>
                exportClients(
                  clients.filter((client) => selectedIds.includes(client.organizationId)),
                  "seleccion"
                )
              }
            >
              Exportar selección
            </button>
          </div>
        </div>
      ) : null}

      <section className={s.panel}>
        <div className={s.panelHeader}>
          <h2>Cuentas que requieren atención</h2>
          <span>{attentionRows.length}</span>
        </div>
        {attentionRows.length === 0 ? (
          <div className={s.emptyCompact}>No hay cuentas accionables con los filtros actuales.</div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th aria-label="Seleccionar" />
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Plan</th>
                  <th>Uso</th>
                  <th>Última actividad</th>
                  <th>Vencimiento</th>
                  <th>Próxima acción</th>
                  <th className={s.actionCol}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {attentionRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.organizationId)}
                        onChange={() => toggleSelect(row.organizationId)}
                        aria-label={`Seleccionar ${row.empresa}`}
                      />
                    </td>
                    <td>{row.empresa}</td>
                    <td><ClientStatusBadge status={row.estadoEfectivo} /></td>
                    <td>{row.planLabel}</td>
                    <td>{row.usoLabel}</td>
                    <td>{row.ultimaActividad}</td>
                    <td>{row.vencimiento}</td>
                    <td>{row.proximaAccion}</td>
                    <td className={s.actionCol}>{renderAttentionAction(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={s.panel}>
        <div className={s.panelHeader}>
          <h2>Todos los clientes</h2>
          <span>{filteredClients.length}</span>
        </div>
        {filteredClients.length === 0 ? (
          <div className={s.emptyQueue}>
            <strong>No hay clientes que coincidan</strong>
            <p>Ajusta filtros o crea una cuenta trial.</p>
            <div className={s.emptyActions}>
              <button type="button" className={s.primaryBtn} onClick={openTrialModal}>
                Crear cuenta trial
              </button>
              {hasActiveFilters(filters) ? (
                <button type="button" className={s.secondaryBtn} onClick={clearFilters}>
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        aria-label="Seleccionar todas las filas visibles"
                      />
                    </th>
                    <th>Empresa / contacto</th>
                    <th>Estado</th>
                    <th>Plan</th>
                    <th>Cotizaciones</th>
                    <th>Canal público</th>
                    <th>Última actividad</th>
                    <th>Vence / renovación</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.organizationId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(client.organizationId)}
                          onChange={() => toggleSelect(client.organizationId)}
                          aria-label={`Seleccionar ${client.empresaNombre}`}
                        />
                      </td>
                      <td>
                        #{client.organizationId} · {client.empresaNombre}
                        {client.isTestAccount ? <span className={s.testBadge}>Prueba</span> : null}
                        <div className={s.mobileMeta}>{client.correoPrincipal ?? "—"}</div>
                      </td>
                      <td><ClientStatusBadge status={client.estadoEfectivo} /></td>
                      <td>{client.planLabel}</td>
                      <td>{pluralizeCotizaciones(client.cotizacionesCount)}</td>
                      <td>
                        <strong>{client.publicChannel.pageStatusLabel}</strong>
                        {client.publicChannel.lastSolicitudLabel ? (
                          <div className={s.subtleMeta}>{client.publicChannel.lastSolicitudLabel}</div>
                        ) : (
                          <div className={s.subtleMeta}>Sin solicitudes recientes</div>
                        )}
                      </td>
                      <td>
                        {formatRelativeActivity(client.lastActivityAt)}
                        {client.lastActivityAt ? (
                          <div className={s.subtleMeta}>{formatDate(client.lastActivityAt)}</div>
                        ) : null}
                      </td>
                      <td>{formatOperationalExpiry(client)}</td>
                      <td>
                        <Link href={`/admin/clientes/${client.organizationId}`} className={s.tableAction}>
                          Ver ficha
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={s.mobileCards}>
              {filteredClients.map((client) => (
                <article key={`m-${client.organizationId}`} className={s.mobileCard}>
                  <strong>{client.empresaNombre}</strong>
                  <ClientStatusBadge status={client.estadoEfectivo} />
                  <div className={s.mobileMeta}>
                    <span>{client.planLabel}</span>
                    <span>{pluralizeCotizaciones(client.cotizacionesCount)}</span>
                    <span>
                      {client.publicChannel.pageStatusLabel}
                      {client.publicChannel.lastSolicitudLabel
                        ? ` · ${client.publicChannel.lastSolicitudLabel}`
                        : ""}
                    </span>
                  </div>
                  <span>{formatOperationalExpiry(client)}</span>
                  <Link href={`/admin/clientes/${client.organizationId}`} className={s.tableAction}>
                    Ver ficha
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <AdminClientesFiltersPanel
        filters={filters}
        onChange={updateFilters}
        onApplyQuickView={applyQuickViewPreset}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />

      {confirmAction ? (
        <div className={s.modalBackdrop} onClick={() => setConfirmAction(null)}>
          <div className={s.modal} role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>
                {confirmAction === "archive"
                  ? "Archivar cuentas de prueba"
                  : "Marcar como perdido"}
              </h3>
              <button type="button" className={s.iconBtn} onClick={() => setConfirmAction(null)}>
                <LuX aria-hidden />
              </button>
            </div>
            <p className={s.modalHint}>
              {confirmAction === "archive"
                ? `Se marcarán ${selectedIds.length} cuentas como prueba y quedarán fuera de métricas reales.`
                : "No hay cierre automático en backend. Exporta la selección y registra el seguimiento comercial manualmente."}
            </p>
            <div className={s.modalActions}>
              <button type="button" className={s.secondaryBtn} onClick={() => setConfirmAction(null)}>
                Cancelar
              </button>
              {confirmAction === "archive" ? (
                <button
                  type="button"
                  className={s.primaryBtn}
                  disabled={isSubmitting}
                  onClick={() => void handleArchiveTestAccounts(selectedIds)}
                >
                  Confirmar archivado
                </button>
              ) : (
                <button
                  type="button"
                  className={s.primaryBtn}
                  onClick={() => {
                    exportClients(
                      clients.filter((client) => selectedIds.includes(client.organizationId)),
                      "perdidos"
                    );
                    setConfirmAction(null);
                    setMessage("Selección exportada para seguimiento de cuentas perdidas.");
                  }}
                >
                  Exportar y continuar
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isTrialOpen ? (
        <div className={s.modalBackdrop} onClick={() => setIsTrialOpen(false)}>
          <div className={s.modal} role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Crear cuenta trial</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsTrialOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <form className={s.form} onSubmit={handleProvision}>
              <label>
                Empresa
                <input required value={provisionForm.empresaNombre} onChange={(e) => setProvisionForm((c) => ({ ...c, empresaNombre: e.target.value }))} />
              </label>
              <label>
                Correo admin
                <input required type="email" value={provisionForm.email} onChange={(e) => setProvisionForm((c) => ({ ...c, email: e.target.value }))} />
              </label>
              <label>
                Contraseña inicial
                <input required type="password" minLength={8} value={provisionForm.password} onChange={(e) => setProvisionForm((c) => ({ ...c, password: e.target.value }))} />
              </label>
              <label className={s.checkboxField}>
                <input type="checkbox" checked={provisionForm.isTestAccount} onChange={(e) => setProvisionForm((c) => ({ ...c, isTestAccount: e.target.checked }))} />
                Marcar como cuenta de prueba
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => setIsTrialOpen(false)}>Cancelar</button>
                <button type="submit" className={s.primaryBtn} disabled={isSubmitting}>Crear cuenta</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isPaymentOpen ? (
        <div className={s.modalBackdrop} onClick={() => setIsPaymentOpen(false)}>
          <div className={s.modal} role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Registrar pago / activar plan</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsPaymentOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <div className={s.form}>
              <label>
                Organización ID
                <input value={paymentOrgId} onChange={(e) => setPaymentOrgId(e.target.value)} placeholder="Ej: 12" />
              </label>
              <label>
                Plan
                <select value={paymentForm.planCode} onChange={(e) => setPaymentForm((c) => ({ ...c, planCode: e.target.value as BillingPlanCode }))}>
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Referencia (opcional)
                <input value={paymentForm.reference} onChange={(e) => setPaymentForm((c) => ({ ...c, reference: e.target.value }))} />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => setIsPaymentOpen(false)}>Cancelar</button>
                <button type="button" className={s.primaryBtn} disabled={isSubmitting} onClick={() => void handleActivatePayment()}>
                  Registrar pago
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
