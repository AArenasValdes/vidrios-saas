"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuDownload,
  LuFilter,
  LuSearch,
  LuUpload,
  LuX,
} from "react-icons/lu";

import { useAdminHeaderActions } from "@/features/admin/components/admin-header-context";
import { useGrowthDashboard } from "@/features/growth/hooks/useGrowthDashboard";
import {
  buildProspectListRow,
  buildProspectosKpis,
  buildProspectosPipeline,
  buildProspectosQueue,
  buildProspectosRecentMoves,
  exportProspectsCsv,
  filterProspectosQueue,
  filterProspectsByPipelineStage,
  getEmptyQueueMessage,
  getProspectStatusLabel,
  type ProspectosPipelineStage,
  type ProspectosQueueFilter,
} from "@/features/growth/services/prospectos-workspace.service";
import type { GrowthProspect } from "@/features/growth/types/growth-dashboard";
import { ProspectDetailDrawer } from "./prospect-detail-drawer";
import s from "./prospectos-workspace.module.css";

const SPREADSHEET_ACCEPT =
  ".csv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

const QUEUE_FILTERS: Array<{ id: ProspectosQueueFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "alta", label: "Alta prioridad" },
  { id: "nuevos", label: "Nuevos" },
  { id: "followups", label: "Follow-ups" },
  { id: "demos", label: "Demos" },
  { id: "trials", label: "Trials" },
  { id: "pagos", label: "Pagos" },
];

function priorityClass(priority: "alta" | "media" | "baja") {
  if (priority === "alta") return s.priorityHigh;
  if (priority === "media") return s.priorityMedium;
  return s.priorityLow;
}

function buildEmptyProspectForm() {
  return {
    nombre: "",
    empresa: "",
    whatsapp: "+56 9 ",
    ciudad: "",
    origen: "Manual",
    estado: "nuevo" as const,
    proximoPaso: "Primer contacto",
    fechaProximoSeguimiento: new Date().toISOString().slice(0, 10),
    notas: "",
  };
}

export function ProspectosWorkspace() {
  const growth = useGrowthDashboard();
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();
  const [queueFilter, setQueueFilter] = useState<ProspectosQueueFilter>("all");
  const [pipelineStageFilter, setPipelineStageFilter] =
    useState<ProspectosPipelineStage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [prospectForm, setProspectForm] = useState(buildEmptyProspectForm);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const openAddProspect = useCallback(() => {
    setIsAddOpen(true);
  }, []);

  useEffect(() => {
    setHeaderState({
      syncedAt: growth.workspace?.updatedAt ?? null,
      onRefresh: () => {
        void growth.reload();
      },
      onNewProspect: openAddProspect,
    });

    return () => resetHeaderState();
  }, [
    growth.workspace?.updatedAt,
    growth.reload,
    openAddProspect,
    resetHeaderState,
    setHeaderState,
  ]);

  const workspace = growth.workspace;

  const kpis = useMemo(
    () => (workspace ? buildProspectosKpis(workspace, growth.viewModel?.workToday ?? null) : []),
    [workspace, growth.viewModel?.workToday]
  );

  const queue = useMemo(
    () => (workspace ? buildProspectosQueue(workspace.prospects) : []),
    [workspace]
  );

  const pipeline = useMemo(
    () => (workspace ? buildProspectosPipeline(workspace.prospects) : []),
    [workspace]
  );

  const recentMoves = useMemo(
    () => (workspace ? buildProspectosRecentMoves(workspace) : []),
    [workspace]
  );

  const displayRows = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const rows = pipelineStageFilter
      ? filterProspectsByPipelineStage(workspace.prospects, pipelineStageFilter)
          .map(buildProspectListRow)
          .filter((row): row is NonNullable<typeof row> => row !== null)
      : filterProspectosQueue(queue, queueFilter);

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter(
      (row) =>
        row.empresa.toLowerCase().includes(query) ||
        row.contacto.toLowerCase().includes(query) ||
        row.estadoLabel.toLowerCase().includes(query)
    );
  }, [pipelineStageFilter, queue, queueFilter, searchQuery, workspace]);

  const selectedProspect = useMemo<GrowthProspect | null>(() => {
    if (!workspace || !selectedProspectId) {
      return null;
    }

    return workspace.prospects.find((p) => p.id === selectedProspectId) ?? null;
  }, [selectedProspectId, workspace]);

  const showGlobalEmpty =
    queue.length === 0 &&
    queueFilter === "all" &&
    !pipelineStageFilter &&
    !searchQuery.trim();

  const handleKpiClick = useCallback((filter: ProspectosQueueFilter | "activos") => {
    setPipelineStageFilter(null);
    setQueueFilter(filter === "activos" ? "all" : filter);
  }, []);

  const handlePipelineClick = useCallback((stage: ProspectosPipelineStage) => {
    setQueueFilter("all");
    setPipelineStageFilter((current) => (current === stage ? null : stage));
  }, []);

  async function runImportFile(file: File | null | undefined) {
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    if (
      !fileName.endsWith(".csv") &&
      !fileName.endsWith(".txt") &&
      !fileName.endsWith(".xlsx") &&
      !fileName.endsWith(".xls")
    ) {
      setActionSuccess(null);
      setActionError("Formato no soportado. Usa Excel (.xlsx) o CSV.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await growth.importSpreadsheet(file);
      setIsImportOpen(false);
      setImportFile(null);

      if (result.imported === 0) {
        setActionError(
          result.errors[0] ??
            "No se importó ningún prospecto. Revisa que la primera fila tenga encabezados y que exista la columna Empresa."
        );
        return;
      }

      const parts = [`${result.imported} prospecto${result.imported === 1 ? "" : "s"} importado${result.imported === 1 ? "" : "s"}`];
      if (result.skipped > 0) {
        parts.push(`${result.skipped} fila${result.skipped === 1 ? "" : "s"} omitida${result.skipped === 1 ? "" : "s"}`);
      }
      if (result.errors.length > 0) {
        parts.push(`${result.errors.length} con error`);
      }
      setActionSuccess(parts.join(" · "));
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No pudimos importar el archivo."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExport() {
    if (!workspace) {
      return;
    }

    if (workspace.prospects.length === 0) {
      setActionSuccess(null);
      setActionError("No hay prospectos para exportar todavía. Importa tu Excel primero.");
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    try {
      const XLSX = await import("xlsx");
      const rows = workspace.prospects.map((prospect) => ({
        Empresa: prospect.empresa,
        Contacto: prospect.nombre,
        WhatsApp: prospect.whatsapp,
        Ciudad: prospect.ciudad,
        Origen: prospect.origen,
        Estado: prospect.estado,
        "Próximo paso": prospect.proximoPaso,
        "Fecha seguimiento": prospect.fechaProximoSeguimiento,
        Notas: prospect.notas,
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Prospectos");
      const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `prospectos-ventora-${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setActionSuccess(
        `Exportados ${workspace.prospects.length} prospecto${workspace.prospects.length === 1 ? "" : "s"} a Excel.`
      );
    } catch {
      const csv = exportProspectsCsv(workspace.prospects);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `prospectos-ventora-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setActionSuccess(
        `Exportados ${workspace.prospects.length} prospecto${workspace.prospects.length === 1 ? "" : "s"} a CSV.`
      );
    }
  }

  async function handleAddProspect(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setActionError(null);

    try {
      await growth.addProspect(prospectForm);
      setIsAddOpen(false);
      setProspectForm(buildEmptyProspectForm());
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No pudimos crear el prospecto."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleImport(event: React.FormEvent) {
    event.preventDefault();
    await runImportFile(importFile);
  }

  if (growth.isLoading) {
    return <div className={s.stateCard}>Cargando pipeline comercial…</div>;
  }

  if (growth.error || !workspace) {
    return (
      <div className={`${s.stateCard} ${s.stateError}`}>
        {growth.error ?? "No pudimos cargar los prospectos."}
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.toolbar}>
        <label className={s.searchField}>
          <LuSearch aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar prospecto"
            aria-label="Buscar prospecto"
          />
        </label>
        <div className={s.toolbarActions}>
          <button
            type="button"
            className={`${s.secondaryBtn} ${showFilters ? s.toolbarBtnActive : ""}`}
            onClick={() => setShowFilters((current) => !current)}
          >
            <LuFilter aria-hidden />
            Filtros
          </button>
          <label className={`${s.secondaryBtn} ${s.fileInputLabel}`}>
            <LuUpload aria-hidden />
            {isSubmitting ? "Importando…" : "Importar Excel/CSV"}
            <input
              ref={importInputRef}
              type="file"
              accept={SPREADSHEET_ACCEPT}
              disabled={isSubmitting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                void runImportFile(file);
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" className={s.secondaryBtn} onClick={() => void handleExport()}>
            <LuDownload aria-hidden />
            Exportar Excel
          </button>
        </div>
      </div>

      {actionSuccess ? <div className={s.bannerSuccess}>{actionSuccess}</div> : null}
      {actionError ? <div className={s.bannerError}>{actionError}</div> : null}

      <section className={s.kpiRow}>
        {kpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            className={`${s.kpiCard} ${queueFilter === kpi.filter && !pipelineStageFilter ? s.kpiActive : ""}`}
            onClick={() => handleKpiClick(kpi.filter)}
          >
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
          </button>
        ))}
      </section>

      <section className={s.mainGrid}>
        <article className={`${s.panel} ${s.queuePanel}`}>
          <div className={s.panelHeader}>
            <h2>Cola de trabajo</h2>
            <span>{displayRows.length} casos</span>
          </div>

          <div
            className={`${s.filterRow} ${showFilters ? s.filterRowVisible : s.filterRowHidden}`}
          >
            {QUEUE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`${s.filterChip} ${queueFilter === filter.id && !pipelineStageFilter ? s.filterChipActive : ""}`}
                onClick={() => {
                  setPipelineStageFilter(null);
                  setQueueFilter(filter.id);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {pipelineStageFilter ? (
            <div className={s.activePipelineHint}>
              Filtrando pipeline:{" "}
              <strong>
                {pipeline.find((column) => column.id === pipelineStageFilter)?.label}
              </strong>
              <button type="button" onClick={() => setPipelineStageFilter(null)}>
                Quitar
              </button>
            </div>
          ) : null}

          {displayRows.length === 0 ? (
            showGlobalEmpty ? (
              <div className={s.emptyQueue}>
                <strong>No hay acciones pendientes</strong>
                <p>
                  Crea un prospecto o importa contactos para comenzar el seguimiento
                  comercial.
                </p>
                <div className={s.emptyActions}>
                  <button type="button" className={s.primaryBtn} onClick={openAddProspect}>
                    Nuevo prospecto
                  </button>
                  <label className={`${s.secondaryBtn} ${s.fileInputLabel}`}>
                    Importar Excel/CSV
                    <input
                      type="file"
                      accept={SPREADSHEET_ACCEPT}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        void runImportFile(file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className={s.emptyCompact}>
                {pipelineStageFilter
                  ? "No hay prospectos en esta etapa del pipeline."
                  : getEmptyQueueMessage(queueFilter)}
              </div>
            )
          ) : (
            <>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Prioridad</th>
                      <th>Empresa</th>
                      <th>Estado</th>
                      <th>Motivo</th>
                      <th>Última interacción</th>
                      <th>Próxima acción</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className={`${s.priorityBadge} ${priorityClass(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={s.linkButton}
                            onClick={() => setSelectedProspectId(item.prospectId)}
                          >
                            {item.empresa}
                          </button>
                        </td>
                        <td>{item.estadoLabel}</td>
                        <td>{item.motivo}</td>
                        <td>{item.ultimaInteraccion}</td>
                        <td>{item.proximaAccion}</td>
                        <td>
                          <button
                            type="button"
                            className={s.tableAction}
                            onClick={() => setSelectedProspectId(item.prospectId)}
                          >
                            {item.actionLabel}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={s.mobileCards}>
                {displayRows.map((item) => (
                  <article key={`mobile-${item.id}`} className={s.mobileCard}>
                    <div className={s.mobileCardTop}>
                      <span className={`${s.priorityBadge} ${priorityClass(item.priority)}`}>
                        {item.priority}
                      </span>
                      <strong>{item.empresa}</strong>
                    </div>
                    <p>
                      {item.estadoLabel} · {item.motivo}
                    </p>
                    <div className={s.mobileMeta}>
                      <span>{item.ultimaInteraccion}</span>
                      <span>{item.proximaAccion}</span>
                    </div>
                    <button
                      type="button"
                      className={s.tableAction}
                      onClick={() => setSelectedProspectId(item.prospectId)}
                    >
                      {item.actionLabel}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </article>

        <aside className={s.sideColumn}>
          <article className={s.panel}>
            <div className={s.panelHeader}>
              <h2>Pipeline</h2>
            </div>
            <div className={s.pipelineGrid}>
              {pipeline.map((column, index) => (
                <button
                  key={column.id}
                  type="button"
                  className={`${s.pipelineColumn} ${pipelineStageFilter === column.id ? s.pipelineColumnActive : ""}`}
                  onClick={() => handlePipelineClick(column.id)}
                >
                  <span>{column.label}</span>
                  <strong>{column.count}</strong>
                  {index > 0 && column.conversionPct !== null ? (
                    <em>{column.conversionPct}% desde etapa anterior</em>
                  ) : null}
                </button>
              ))}
            </div>
          </article>

          <article className={`${s.panel} ${s.movesPanel}`}>
            <div className={s.panelHeader}>
              <h2>Últimos movimientos</h2>
            </div>
            {recentMoves.length === 0 ? (
              <div className={s.emptyCompact}>
                Todavía no hay movimientos comerciales registrados.
              </div>
            ) : (
              <ul className={s.moveList}>
                {recentMoves.map((move) => (
                  <li key={move.id}>
                    <button
                      type="button"
                      className={s.moveItem}
                      onClick={() => {
                        if (move.prospectId) {
                          setSelectedProspectId(move.prospectId);
                        }
                      }}
                      disabled={!move.prospectId}
                    >
                      <strong>{move.label}</strong>
                      <span>{new Date(move.at).toLocaleString("es-CL")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </aside>
      </section>

      {isAddOpen ? (
        <div className={s.modalBackdrop}>
          <div className={s.modal} role="dialog" aria-labelledby="add-prospect-title">
            <div className={s.modalHeader}>
              <h3 id="add-prospect-title">Nuevo prospecto</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsAddOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <form className={s.form} onSubmit={handleAddProspect}>
              <label>
                Empresa
                <input
                  required
                  value={prospectForm.empresa}
                  onChange={(e) =>
                    setProspectForm((current) => ({ ...current, empresa: e.target.value }))
                  }
                />
              </label>
              <label>
                Contacto
                <input
                  value={prospectForm.nombre}
                  onChange={(e) =>
                    setProspectForm((current) => ({ ...current, nombre: e.target.value }))
                  }
                />
              </label>
              <label>
                WhatsApp
                <input
                  value={prospectForm.whatsapp}
                  onChange={(e) =>
                    setProspectForm((current) => ({ ...current, whatsapp: e.target.value }))
                  }
                />
              </label>
              <label>
                Ciudad
                <input
                  value={prospectForm.ciudad}
                  onChange={(e) =>
                    setProspectForm((current) => ({ ...current, ciudad: e.target.value }))
                  }
                />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={s.primaryBtn} disabled={isSubmitting}>
                  Guardar prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isImportOpen ? (
        <div className={s.modalBackdrop}>
          <div className={s.modal} role="dialog" aria-labelledby="import-title">
            <div className={s.modalHeader}>
              <h3 id="import-title">Importar prospectos</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsImportOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <form className={s.form} onSubmit={handleImport}>
              <p className={s.modalHint}>
                Sube un Excel (.xlsx) o CSV con encabezados como Empresa, Contacto, WhatsApp y Origen.
                Los datos se guardan en Supabase.
              </p>
              <input
                type="file"
                accept={SPREADSHEET_ACCEPT}
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              />
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => setIsImportOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={s.primaryBtn}
                  disabled={isSubmitting || !importFile}
                >
                  Importar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ProspectDetailDrawer
        prospect={selectedProspect}
        onClose={() => setSelectedProspectId(null)}
        onAdvance={async (id) => {
          await growth.advanceProspect(id);
        }}
        onUpdate={async (id, patch) => {
          await growth.updateProspect(id, patch);
        }}
        onRegisterContact={async (id, input) => {
          await growth.registerContact(id, input);
        }}
        statusLabel={selectedProspect ? getProspectStatusLabel(selectedProspect.estado) : ""}
      />
    </div>
  );
}
