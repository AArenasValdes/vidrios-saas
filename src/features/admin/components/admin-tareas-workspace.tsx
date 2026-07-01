"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuFilter, LuSearch, LuX } from "react-icons/lu";

import { AdminTareasActionCell } from "@/features/admin/components/admin-tareas-action-cell";
import { AdminTareasFiltersPanel } from "@/features/admin/components/admin-tareas-filters-panel";
import { AdminTareasKpiRow } from "@/features/admin/components/admin-tareas-kpi-row";
import { useAdminHeaderActions } from "@/features/admin/components/admin-header-context";
import { ORIGIN_LABELS } from "@/features/admin/services/admin-tareas-labels";
import {
  EMPTY_TAREAS_FILTERS,
  TAREAS_QUICK_VIEWS,
  applyTareasKpiFilter,
  applyTareasQuickView,
  buildTareasFilterChips,
  filterTareas,
  hasTareasActiveFilters,
  parseTareasFiltersFromSearchParams,
  removeTareasFilterChip,
  tareasFiltersToSearchParams,
} from "@/features/admin/services/admin-tareas-filters.service";
import type { AdminTask, AdminTareasWorkspace } from "@/features/admin/types/admin-tareas";
import s from "./admin-tareas-workspace.module.css";

function priorityClass(priority: AdminTask["priority"]) {
  return s[`priority_${priority}`];
}

export function AdminTareasWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();

  const [workspace, setWorkspace] = useState<AdminTareasWorkspace | null>(null);
  const [filters, setFilters] = useState(() =>
    parseTareasFiltersFromSearchParams(new URLSearchParams(searchParams.toString()))
  );
  const [activeKpiId, setActiveKpiId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    titulo: "",
    prioridad: "media" as "alta" | "media" | "baja",
    venceEn: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/tareas");
      const payload = (await response.json()) as {
        workspace?: AdminTareasWorkspace;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar tareas.");
      setWorkspace(payload.workspace ?? null);
      setSyncedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const handleExport = useCallback(() => {
    if (!workspace) return;
    const rows = filterTareas(workspace.tasks, filters);
    const header = [
      "id",
      "prioridad",
      "empresa",
      "tarea",
      "origen",
      "vence",
      "contexto",
      "accion",
    ];
    const csv = [
      header.join(","),
      ...rows.map((task) =>
        [
          task.id,
          task.priority,
          task.empresaNombre,
          task.title,
          ORIGIN_LABELS[task.origin],
          task.dueLabel,
          task.contexto,
          task.primaryActionLabel,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tareas-ventora-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [filters, workspace]);

  const activeChips = useMemo(() => buildTareasFilterChips(filters), [filters]);

  function syncFiltersToUrl(next: typeof filters) {
    const params = tareasFiltersToSearchParams(next);
    router.replace(params.toString() ? `/admin/tareas?${params}` : "/admin/tareas", {
      scroll: false,
    });
  }

  function updateFilters(next: typeof filters) {
    setFilters(next);
    syncFiltersToUrl(next);
  }

  useEffect(() => {
    setHeaderState({
      syncedAt,
      isRefreshing,
      onRefresh: () => void loadWorkspace(),
      customPrimaryAction: {
        label: "Nueva tarea",
        onClick: () => setIsCreateOpen(true),
      },
      customSecondaryAction: {
        label: "Ver completadas",
        onClick: () =>
          updateFilters({
            ...EMPTY_TAREAS_FILTERS,
            showCompleted: true,
            statuses: ["completada"],
          }),
      },
      customTertiaryAction: {
        label: "Exportar",
        onClick: handleExport,
      },
      hideDefaultPrimaryActions: true,
    });
    return () => resetHeaderState();
  }, [handleExport, isRefreshing, loadWorkspace, resetHeaderState, setHeaderState, syncedAt]);

  useEffect(() => {
    setFilters(parseTareasFiltersFromSearchParams(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  const filteredTasks = useMemo(() => {
    if (!workspace) return [];
    const pool =
      filters.showCompleted || hasTareasActiveFilters(filters)
        ? workspace.tasks
        : workspace.tasks.filter((task) => workspace.priorityTodayIds.includes(task.id));
    return filterTareas(pool, filters);
  }, [filters, workspace]);

  async function handleCreateManualTask() {
    if (!manualForm.titulo.trim()) {
      setError("Indica un título para la tarea.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/growth/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: manualForm.titulo.trim(),
          tipo: "otro",
          prioridad: manualForm.prioridad,
          vence_en: manualForm.venceEn ? new Date(manualForm.venceEn).toISOString() : null,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos crear la tarea.");
      setMessage("Tarea manual creada.");
      setIsCreateOpen(false);
      setManualForm({ titulo: "", prioridad: "media", venceEn: "" });
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al crear.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteTask(task: AdminTask) {
    if (task.kind === "automatic" && !task.manualTaskId) {
      setMessage("La tarea automática desaparecerá cuando se resuelva la condición subyacente.");
      return;
    }
    if (!task.manualTaskId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/growth/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.manualTaskId, completada: true }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos completar la tarea.");
      setMessage("Tarea marcada como completada.");
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al completar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePostponeTask(task: AdminTask) {
    if (!task.manualTaskId) {
      setMessage("Posponer aplica por ahora a tareas manuales del pipeline.");
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/growth/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.manualTaskId,
          vence_en: tomorrow.toISOString(),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos posponer la tarea.");
      setMessage("Tarea pospuesta para mañana.");
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al posponer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteManualTask(task: AdminTask) {
    if (!task.manualTaskId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/growth/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.manualTaskId,
          eliminado_en: new Date().toISOString(),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos eliminar la tarea.");
      setMessage("Tarea manual eliminada.");
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al eliminar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className={s.stateCard}>Cargando tareas…</div>;
  }

  if (!workspace) {
    return <div className={s.stateCard}>No hay datos de tareas disponibles.</div>;
  }

  const openCount = workspace.tasks.filter((task) => task.status !== "completada").length;

  return (
    <div className={s.page}>
      {error ? <div className={s.bannerError}>{error}</div> : null}
      {message ? <div className={s.bannerSuccess}>{message}</div> : null}

      <AdminTareasKpiRow
        kpis={workspace.kpis}
        activeKpiId={activeKpiId}
        onKpiClick={(kpiId) => {
          setActiveKpiId(kpiId);
          updateFilters(applyTareasKpiFilter(filters, kpiId));
        }}
      />

      <div className={s.toolbar}>
        <label className={s.searchField}>
          <LuSearch aria-hidden />
          <input
            value={filters.search}
            onChange={(event) => updateFilters({ ...filters, search: event.target.value })}
            placeholder="Buscar empresa, contacto, tarea o referencia"
            aria-label="Buscar tareas"
          />
        </label>
        <div className={s.toolbarActions}>
          <button type="button" className={s.secondaryBtn} onClick={() => setIsFiltersOpen(true)}>
            <LuFilter aria-hidden /> Filtros
          </button>
          {hasTareasActiveFilters(filters) || filters.showCompleted ? (
            <button
              type="button"
              className={s.ghostBtn}
              onClick={() => updateFilters({ ...EMPTY_TAREAS_FILTERS })}
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>

      <div className={s.quickFiltersRow}>
        {TAREAS_QUICK_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={s.quickChip}
            onClick={() => {
              setActiveKpiId(null);
              updateFilters(applyTareasQuickView(filters, view.id));
            }}
          >
            {view.label}
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
              onClick={() => updateFilters(removeTareasFilterChip(filters, chip))}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.resultsMeta}>
        Mostrando {filteredTasks.length} de {openCount} tareas
      </div>

      <section className={s.panel}>
        <div className={s.panelHeader}>
          <h2 className={s.panelTitle}>Prioridades de hoy</h2>
          <span>{filteredTasks.length}</span>
        </div>
        {filteredTasks.length === 0 ? (
          <div className={s.emptyCompact}>
            {filters.showCompleted
              ? "No hay tareas completadas con estos filtros."
              : "No tienes tareas pendientes para hoy."}{" "}
            <button type="button" className={s.ghostBtn} onClick={() => setIsCreateOpen(true)}>
              Crear tarea manual
            </button>
          </div>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Prioridad</th>
                    <th>Empresa / contacto</th>
                    <th>Tarea</th>
                    <th>Origen</th>
                    <th>Vence</th>
                    <th>Contexto</th>
                    <th>Resolver</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <span
                          className={`${s.priorityDot} ${priorityClass(task.priority)}`}
                          aria-label={`Prioridad ${task.priority}`}
                        />
                      </td>
                      <td>
                        <div className={s.empresaCell}>
                          <strong>{task.empresaNombre}</strong>
                          {task.contactoLabel ? <span>{task.contactoLabel}</span> : null}
                        </div>
                      </td>
                      <td>
                        {task.title}
                        <span className={s.kindBadge}>
                          {task.kind === "manual" ? "Manual" : "Automática"}
                        </span>
                      </td>
                      <td>
                        <span className={s.originBadge}>{ORIGIN_LABELS[task.origin]}</span>
                      </td>
                      <td>{task.dueLabel}</td>
                      <td>{task.contexto}</td>
                      <td>
                        <AdminTareasActionCell
                          task={task}
                          onComplete={handleCompleteTask}
                          onPostpone={handlePostponeTask}
                          onDeleteManual={handleDeleteManualTask}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={s.mobileCards}>
              {filteredTasks.map((task) => (
                <article key={task.id} className={s.mobileCard}>
                  <strong>{task.empresaNombre}</strong>
                  <div>{task.title}</div>
                  <div>{ORIGIN_LABELS[task.origin]} · {task.dueLabel}</div>
                  <AdminTareasActionCell
                    task={task}
                    onComplete={handleCompleteTask}
                    onPostpone={handlePostponeTask}
                    onDeleteManual={handleDeleteManualTask}
                  />
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <div className={s.secondaryGrid}>
        <section className={`${s.panel} ${s.panelCompact}`}>
          <h2 className={s.panelTitle}>Próximas tareas</h2>
          {workspace.upcomingGroups.length === 0 ? (
            <div className={s.emptyCompact}>No hay seguimientos programados esta semana.</div>
          ) : (
            workspace.upcomingGroups.map((group) => (
              <div key={group.id} className={s.upcomingGroup}>
                <h3>{group.label}</h3>
                {group.tasks.map((task) => (
                  <div key={task.id} className={s.upcomingItem}>
                    <strong>{task.title}</strong>
                    <span>
                      {task.empresaNombre} · {task.dueLabel}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </section>

        <section className={`${s.panel} ${s.panelCompact}`}>
          <div className={s.panelHeader}>
            <h2 className={s.panelTitle}>Actividad completada</h2>
            <button
              type="button"
              className={s.ghostBtn}
              onClick={() =>
                updateFilters({
                  ...EMPTY_TAREAS_FILTERS,
                  showCompleted: true,
                  statuses: ["completada"],
                })
              }
            >
              Ver todas
            </button>
          </div>
          {workspace.completedEvents.length === 0 ? (
            <div className={s.emptyCompact}>Aún no hay cierres recientes registrados.</div>
          ) : (
            workspace.completedEvents.map((event) => (
              <div key={event.id} className={s.timelineItem}>
                <div className={s.timelineBody}>
                  <strong>{event.label}</strong>
                  <span>
                    {event.empresaNombre} · {event.relativeAt}
                  </span>
                </div>
                <Link href={event.href} className={s.timelineLink}>
                  Ver ficha
                </Link>
              </div>
            ))
          )}
        </section>
      </div>

      <section className={`${s.panel} ${s.panelCompact}`}>
        <h2 className={s.panelTitle}>Pendientes por origen</h2>
        <div className={s.originBars}>
          {workspace.originSummary.map((item) => (
            <div key={item.origin} className={s.originRow}>
              <span>{item.label}</span>
              <div className={s.originTrack}>
                <div className={s.originFill} style={{ width: `${Math.max(item.pct, 2)}%` }} />
              </div>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      </section>

      <AdminTareasFiltersPanel
        filters={filters}
        onChange={updateFilters}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />

      {isCreateOpen ? (
        <div className={s.modalBackdrop} onClick={() => setIsCreateOpen(false)}>
          <div className={s.modal} onClick={(event) => event.stopPropagation()}>
            <div className={s.panelHeader}>
              <h3 className={s.panelTitle}>Nueva tarea manual</h3>
              <button type="button" className={s.ghostBtn} onClick={() => setIsCreateOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <div className={s.form}>
              <label>
                Título
                <input
                  value={manualForm.titulo}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, titulo: event.target.value }))
                  }
                />
              </label>
              <label>
                Prioridad
                <select
                  value={manualForm.prioridad}
                  onChange={(event) =>
                    setManualForm((current) => ({
                      ...current,
                      prioridad: event.target.value as "alta" | "media" | "baja",
                    }))
                  }
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </label>
              <label>
                Vence
                <input
                  type="date"
                  value={manualForm.venceEn}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, venceEn: event.target.value }))
                  }
                />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={s.primaryBtn}
                  disabled={isSubmitting}
                  onClick={() => void handleCreateManualTask()}
                >
                  Crear tarea
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
