"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  LuEllipsis,
  LuEye,
  LuFilterX,
  LuMapPin,
  LuPencil,
  LuPhone,
  LuSearch,
  LuTrash2,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";

import { PremiumPageReveal, PremiumPageSection } from "@/components/motion/premium-page-reveal";
import { useClientes } from "@/hooks/useClientes";

import s from "./page.module.css";

const ESTADOS = ["Todos", "Activo", "Seguimiento", "Prospecto", "Inactivo"];
const MOBILE_ESTADO_CHIPS = [
  { label: "Todos", value: "Todos" },
  { label: "Activos", value: "Activo" },
  { label: "Seguim.", value: "Seguimiento" },
  { label: "Prospectos", value: "Prospecto" },
  { label: "Inactivos", value: "Inactivo" },
] as const;

const ESTADO_META: Record<string, { cls: string; label: string }> = {
  activo: { cls: "stActivo", label: "Activo" },
  seguimiento: { cls: "stSeguimiento", label: "Seguimiento" },
  prospecto: { cls: "stProspecto", label: "Prospecto" },
  inactivo: { cls: "stInactivo", label: "Inactivo" },
};

const PAGE_SIZE = 4;

function buildPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  const normalizedStart = Math.max(1, end - 2);
  const pages: number[] = [];

  for (let page = normalizedStart; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

function getClienteMeta(estado: string) {
  return ESTADO_META[estado] ?? {
    cls: "stSeguimiento",
    label: estado,
  };
}

function isInteractiveRowTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a, button, input, select, textarea, label, details, summary, [role='menu']"
      )
    )
  );
}

export default function ClientesPage() {
  const router = useRouter();
  const {
    clientes,
    isReady,
    isSaving,
    deleteCliente,
    loadClienteDetalleById,
  } = useClientes();
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [direccionFiltro, setDireccionFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const busquedaDiferida = useDeferredValue(busqueda);
  const isColdBoot = !isReady && clientes.length === 0;

  const { direcciones, filtrados, filtrosActivos, kpis, mobileKpis, obrasFiltradas } = useMemo(() => {
    const query = busquedaDiferida.trim().toLowerCase();
    let seguimientoCount = 0;
    let prospectosCount = 0;
    let obrasActivas = 0;
    const direccionesSet = new Set<string>();

    for (const cliente of clientes) {
      direccionesSet.add(cliente.direccion);
      obrasActivas += cliente.obras;

      if (cliente.estado === "seguimiento") {
        seguimientoCount += 1;
      }

      if (cliente.estado === "prospecto") {
        prospectosCount += 1;
      }
    }

    const nextFiltrados = clientes.filter((cliente) => {
      const matchEstado =
        estadoFiltro === "Todos" || cliente.estado === estadoFiltro.toLowerCase();
      const matchDireccion =
        direccionFiltro === "Todas" || cliente.direccion === direccionFiltro;
      const matchBusqueda =
        !query ||
        cliente.nombre.toLowerCase().includes(query) ||
        cliente.referencia.toLowerCase().includes(query) ||
        (cliente.telefono ?? "").toLowerCase().includes(query) ||
        cliente.direccion.toLowerCase().includes(query);

      return matchEstado && matchDireccion && matchBusqueda;
    });

    return {
      direcciones: ["Todas", ...direccionesSet],
      filtrados: nextFiltrados,
      obrasFiltradas: nextFiltrados.reduce((acc, item) => acc + item.obras, 0),
      filtrosActivos: [
        estadoFiltro !== "Todos" ? `Estado: ${estadoFiltro}` : null,
        direccionFiltro !== "Todas" ? `Direccion: ${direccionFiltro}` : null,
        busquedaDiferida.trim() ? `Busqueda: ${busquedaDiferida.trim()}` : null,
      ].filter(Boolean) as string[],
      kpis: [
        {
          label: "Clientes",
          value: String(clientes.length),
          sub: "registros visibles",
          tone: "blue",
        },
        {
          label: "En seguimiento",
          value: String(seguimientoCount),
          sub: "requieren contacto",
          tone: "amber",
        },
        {
          label: "Obras activas",
          value: String(obrasActivas),
          sub: "entre todos los clientes",
          tone: "green",
        },
        {
          label: "Prospectos",
          value: String(prospectosCount),
          sub: "por convertir",
          tone: "strong",
        },
      ],
      mobileKpis: [
        {
          label: "Clientes",
          value: String(clientes.length),
          tone: "blue",
        },
        {
          label: "Seguimiento",
          value: String(seguimientoCount),
          tone: "amber",
        },
        {
          label: "Obras activas",
          value: String(obrasActivas),
          tone: "green",
        },
        {
          label: "Prospectos",
          value: String(prospectosCount),
          tone: "danger",
        },
      ],
    };
  }, [busquedaDiferida, clientes, direccionFiltro, estadoFiltro]);

  const limpiar = () => {
    setEstadoFiltro("Todos");
    setDireccionFiltro("Todas");
    setBusqueda("");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const pageNumbers = buildPageNumbers(visiblePage, totalPages);
  const pageStart = (visiblePage - 1) * PAGE_SIZE;
  const paginatedClientes = filtrados.slice(pageStart, pageStart + PAGE_SIZE);
  const selectedCount = selectedIds.size;
  const hasActiveFilters = filtrosActivos.length > 0;
  const visibleClienteIds = useMemo(
    () => paginatedClientes.map((cliente) => String(cliente.id)),
    [paginatedClientes]
  );
  const filteredClienteIds = useMemo(
    () => filtrados.map((cliente) => String(cliente.id)),
    [filtrados]
  );
  const allVisibleSelected =
    visibleClienteIds.length > 0 && visibleClienteIds.every((id) => selectedIds.has(id));
  const visibleRows = useMemo(
    () =>
      paginatedClientes.map((cliente) => {
        const meta = getClienteMeta(cliente.estado);

        return {
          id: String(cliente.id),
          nombre: cliente.nombre,
          referencia: cliente.referencia,
          telefono: cliente.telefono || "Sin telefono",
          telefonoHref: cliente.telefono ? `tel:${cliente.telefono}` : undefined,
          direccion: cliente.direccion,
          obrasCount: String(cliente.obras),
          obrasLabel: `${cliente.obras} obras`,
          ultimaGestion: cliente.ultimaGestion,
          detailHref: `/clientes/${cliente.id}`,
          editHref: `/clientes/${cliente.id}/editar`,
          metaClassName: s[meta.cls],
          metaLabel: meta.label,
          isSelected: selectedIds.has(String(cliente.id)),
        };
      }),
    [paginatedClientes, selectedIds]
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const allowed = new Set(filteredClienteIds);
      const next = new Set(Array.from(current).filter((id) => allowed.has(id)));

      return next.size === current.size ? current : next;
    });
  }, [filteredClienteIds]);

  const handleBusquedaChange = (value: string) => {
    setBusqueda(value);
    setCurrentPage(1);
  };

  const handleEstadoFiltroChange = (value: string) => {
    setEstadoFiltro(value);
    setCurrentPage(1);
  };

  const handleDireccionFiltroChange = (value: string) => {
    setDireccionFiltro(value);
    setCurrentPage(1);
  };

  const handleDelete = (id: string, nombre: string) => {
    setDeleteCandidate({ id, nombre });
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode((current) => {
      if (current) {
        setSelectedIds(new Set());
      }

      return !current;
    });
  };

  const toggleSelectedId = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        const next = new Set(current);
        for (const id of visibleClienteIds) {
          next.delete(id);
        }
        return next;
      }

      return new Set([...current, ...visibleClienteIds]);
    });
  };

  const handlePrefetchDetail = (id: string) => {
    void loadClienteDetalleById(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) {
      return;
    }

    try {
      const result = await deleteCliente(deleteCandidate.id);
      setFeedbackMessage(
        `Cliente eliminado. Tambien se ocultaron ${result.deletedCotizaciones} cotizacion(es) y ${result.deletedProjects} proyecto(s).`
      );
      setDeleteCandidate(null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "No se pudo eliminar el cliente"
      );
    }
  };

  const handleConfirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      return;
    }

    setIsBulkDeleting(true);

    try {
      let deletedCotizaciones = 0;
      let deletedProjects = 0;

      for (const id of ids) {
        const result = await deleteCliente(id);
        deletedCotizaciones += result.deletedCotizaciones;
        deletedProjects += result.deletedProjects;
      }

      setFeedbackMessage(
        `${ids.length} cliente(s) eliminado(s). Tambien se ocultaron ${deletedCotizaciones} cotizacion(es) y ${deletedProjects} proyecto(s).`
      );
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setIsBulkDeleteModalOpen(false);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudieron eliminar los clientes seleccionados"
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <PremiumPageReveal className={s.root}>
      <PremiumPageSection className={s.header}>
        <div className={s.desktopHeaderCopy}>
          <h1 className={s.title}>Clientes</h1>
          <p className={s.subtitle}>
            Organiza tus contactos, revisa sus obras y accede rápidamente a su historial.
          </p>
        </div>
        <div className={s.headerActions}>
          <Link className={s.btnPrimary} href="/clientes/nuevo">
            <LuUserPlus aria-hidden />
            Nuevo cliente
          </Link>
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={s.mobileKpiGrid}>
        {isColdBoot
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={`clientes-kpi-skeleton-${index}`} className={s.mobileKpiCardSkeleton}>
                <span className={s.mobileSkeletonValue} aria-hidden />
                <span className={s.mobileSkeletonLabel} aria-hidden />
              </div>
            ))
          : mobileKpis.map((kpi) => (
              <div key={kpi.label} className={`${s.mobileKpiCard} ${s[`mobileKpi${kpi.tone[0].toUpperCase()}${kpi.tone.slice(1)}`]}`}>
                <strong>{kpi.value}</strong>
                <span>{kpi.label}</span>
              </div>
            ))}
      </PremiumPageSection>

      <PremiumPageSection className={s.mobileSearchSection}>
        <div className={s.mobileSearchWrap}>
          <span className={s.searchIcon}>
            <LuSearch aria-hidden />
          </span>
          <input
            className={s.searchInput}
            placeholder="Buscar cliente"
            value={busqueda}
            onChange={(event) => handleBusquedaChange(event.target.value)}
            disabled={isColdBoot}
          />
        </div>

        <div className={s.mobileFilterChips}>
          {MOBILE_ESTADO_CHIPS.map((chip) => (
            <button
              key={chip.value}
              className={`${s.mobileFilterChip}${estadoFiltro === chip.value ? ` ${s.mobileFilterChipActive}` : ""}`}
              onClick={() => handleEstadoFiltroChange(chip.value)}
              type="button"
              aria-pressed={estadoFiltro === chip.value}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className={s.mobileResultsLine}>
          {isColdBoot ? (
            <>
              <span className={s.mobileSkeletonInline} aria-hidden />
              <span className={s.mobileSkeletonInlineShort} aria-hidden />
            </>
          ) : (
            <>
              <span className={s.mobileResultsCopy}>
                <strong>{filtrados.length} clientes</strong>
                <span>{obrasFiltradas} obras activas</span>
              </span>
              <button
                className={`${s.inlineSelectButton} ${isSelectionMode ? s.inlineSelectButtonActive : ""}`}
                onClick={toggleSelectionMode}
                type="button"
                disabled={isColdBoot || isSaving || isBulkDeleting}
                aria-pressed={isSelectionMode}
              >
                {isSelectionMode ? "Cancelar" : "Seleccionar"}
              </button>
            </>
          )}
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={s.kpiRow}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={s.kpiCard}>
            <span className={s.kpiLabel}>{kpi.label}</span>
            <span className={`${s.kpiValue} ${s[`tone${kpi.tone[0].toUpperCase()}${kpi.tone.slice(1)}`]}`}>
              {kpi.value}
            </span>
            <span className={s.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </PremiumPageSection>

      <PremiumPageSection className={s.filterBar}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon}>
            <LuSearch aria-hidden />
          </span>
          <input
            className={s.searchInput}
            placeholder="Buscar por nombre, referencia, telefono o direccion..."
            value={busqueda}
            onChange={(event) => handleBusquedaChange(event.target.value)}
          />
        </div>

        <div className={s.filterGroup}>
          <label className={s.filterLabel}>Estado</label>
          <select
            className={s.filterSelect}
            value={estadoFiltro}
            onChange={(event) => handleEstadoFiltroChange(event.target.value)}
          >
            {ESTADOS.map((estado) => (
              <option key={estado}>{estado}</option>
            ))}
          </select>
        </div>

        <div className={s.filterGroup}>
          <label className={s.filterLabel}>Direccion</label>
          <select
            className={s.filterSelect}
            value={direccionFiltro}
            onChange={(event) => handleDireccionFiltroChange(event.target.value)}
          >
            {direcciones.map((direccion) => (
              <option key={direccion}>{direccion}</option>
            ))}
          </select>
        </div>

        <button
          className={s.btnGhost}
          onClick={limpiar}
          type="button"
          aria-disabled={!hasActiveFilters}
          data-active={hasActiveFilters}
        >
          <LuFilterX aria-hidden />
          Limpiar
        </button>
      </PremiumPageSection>

      <PremiumPageSection className={s.resultsBar}>
        <div>
          <p className={s.resultsLabel}>Resultados</p>
          <div className={s.resultsMain}>
            <strong>{filtrados.length}</strong>
            <span>clientes visibles</span>
          </div>
        </div>

        <div className={s.resultsMeta}>
          <div className={s.resultsActions}>
            <span>{obrasFiltradas} obras asociadas</span>
            <button
              className={`${s.inlineSelectButton} ${isSelectionMode ? s.inlineSelectButtonActive : ""}`}
              onClick={toggleSelectionMode}
              type="button"
              disabled={isColdBoot || isSaving || isBulkDeleting}
              aria-pressed={isSelectionMode}
            >
              {isSelectionMode ? "Cancelar seleccion" : "Seleccionar"}
            </button>
          </div>
          {hasActiveFilters ? (
            <div className={s.activeFilters}>
              {filtrosActivos.map((filtro) => (
                <span key={filtro} className={s.filterPill}>
                  {filtro}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </PremiumPageSection>

      {feedbackMessage ? (
        <PremiumPageSection className={s.feedbackBanner}>
          <span>{feedbackMessage}</span>
          <button className={s.feedbackClose} onClick={() => setFeedbackMessage(null)} type="button">
            Cerrar
          </button>
        </PremiumPageSection>
      ) : null}

      {isColdBoot ? (
        <>
          <PremiumPageSection className={s.loadingTableState}>
            <div className={s.loadingTableHeader}>
              <span className={s.mobileLoadingLineStrong} aria-hidden />
              <span className={s.mobileLoadingLineMedium} aria-hidden />
            </div>
            <div className={s.loadingTableGrid}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`clientes-table-skeleton-${index}`} className={s.loadingTableRow}>
                  <span className={s.mobileLoadingBadge} aria-hidden />
                  <span className={s.mobileLoadingLineStrong} aria-hidden />
                  <span className={s.mobileLoadingLineMedium} aria-hidden />
                </div>
              ))}
            </div>
          </PremiumPageSection>
          <PremiumPageSection className={s.mobileLoadingList}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`clientes-card-skeleton-${index}`} className={s.mobileLoadingCard}>
                <div className={s.mobileLoadingCardTop}>
                  <span className={s.mobileLoadingAvatar} aria-hidden />
                  <div className={s.mobileLoadingCopy}>
                    <span className={s.mobileLoadingLineStrong} aria-hidden />
                    <span className={s.mobileLoadingLine} aria-hidden />
                  </div>
                  <span className={s.mobileLoadingBadge} aria-hidden />
                </div>
                <span className={s.mobileLoadingLineMedium} aria-hidden />
                <span className={s.mobileLoadingLine} aria-hidden />
              </div>
            ))}
          </PremiumPageSection>
        </>
      ) : filtrados.length === 0 ? (
        <PremiumPageSection className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuUsers aria-hidden />
          </div>
          <p className={s.emptyTitle}>
            {clientes.length === 0
                ? "Todavia no tienes clientes"
                : "Sin clientes para mostrar"}
          </p>
          <p className={s.emptySub}>
            {clientes.length === 0
              ? "Crea tu primer cliente para empezar a registrar obras y generar presupuestos mas rapido."
              : "No encontramos clientes con los filtros actuales. Ajusta la busqueda o limpia filtros para ver todo el padron."}
          </p>
          {filtrosActivos.length > 0 ? (
            <button className={s.btnPrimary} onClick={limpiar} type="button">
              <LuFilterX aria-hidden />
              Limpiar filtros
            </button>
          ) : (
            <Link className={s.btnPrimary} href="/clientes/nuevo">
              <LuUserPlus aria-hidden />
              Nuevo cliente
            </Link>
          )}
        </PremiumPageSection>
      ) : (
        <>
          <PremiumPageSection className={s.tableWrap}>
            {isSelectionMode ? (
              <div className={s.selectionBar}>
                <div>
                  <strong>{selectedCount} seleccionado(s)</strong>
                  <span>{allVisibleSelected ? "Todos los visibles" : "Selecciona clientes"}</span>
                </div>
                <div className={s.selectionActions}>
                  <button className={s.btnGhost} type="button" onClick={toggleSelectAllVisible}>
                    {allVisibleSelected ? "Quitar selección" : "Seleccionar visibles"}
                  </button>
                  <button
                    className={s.bulkDeleteBtn}
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    disabled={selectedCount === 0 || isSaving || isBulkDeleting}
                  >
                    <LuTrash2 aria-hidden />
                    Eliminar
                  </button>
                </div>
              </div>
            ) : null}
            <table className={s.table}>
              <colgroup>
                {isSelectionMode ? <col className={s.colSelect} /> : null}
                <col className={s.colCliente} />
                <col className={s.colContacto} />
                <col className={s.colResumen} />
                <col className={s.colEstado} />
                <col className={s.colAcciones} />
              </colgroup>
              <thead>
                <tr>
                  {isSelectionMode ? (
                    <th className={`${s.th} ${s.thSelect}`}>Sel.</th>
                  ) : null}
                  <th className={s.th}>Cliente</th>
                  <th className={s.th}>Contacto</th>
                  <th className={s.th}>Ultima obra</th>
                  <th className={`${s.th} ${s.thC}`}>Estado</th>
                  <th className={`${s.th} ${s.thC}`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      className={`${s.tr}${
                        !isSelectionMode ? ` ${s.trNavigable}` : ""
                      }${row.isSelected ? ` ${s.trSelected}` : ""}`}
                      tabIndex={isSelectionMode ? -1 : 0}
                      aria-label={`Abrir ficha de ${row.nombre}`}
                      onPointerEnter={() => handlePrefetchDetail(row.id)}
                      onClick={(event) => {
                        if (!isSelectionMode && !isInteractiveRowTarget(event.target)) {
                          router.push(row.detailHref);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          !isSelectionMode &&
                          event.currentTarget === event.target &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          router.push(row.detailHref);
                        }
                      }}
                    >
                      {isSelectionMode ? (
                        <td className={s.tdSelect}>
                          <button
                            className={`${s.selectionCircleButton} ${row.isSelected ? s.selectionCircleButtonActive : ""}`}
                            type="button"
                            onClick={() => toggleSelectedId(row.id)}
                            aria-label={`Seleccionar ${row.nombre}`}
                            aria-pressed={row.isSelected}
                          />
                        </td>
                      ) : null}
                      <td className={s.tdPrimary}>
                        <div className={s.clientIdentity}>
                          <span className={s.clientNameValue}>{row.nombre}</span>
                        </div>
                      </td>
                      <td className={s.tdContacto}>
                        <div className={s.contactBlock}>
                          <span className={s.contactPhone}>{row.telefono}</span>
                          <span className={s.contactAddress}>{row.direccion}</span>
                        </div>
                      </td>
                      <td className={s.tdResumen}>
                        <div className={s.resumenBlock}>
                          <span className={s.resumenReferencia}>{row.referencia}</span>
                          <span className={s.resumenMeta}>{row.obrasLabel}</span>
                          <span className={s.resumenGestion}>{row.ultimaGestion}</span>
                        </div>
                      </td>
                      <td className={s.tdCenter}>
                        <span className={`${s.badge} ${row.metaClassName}`}>{row.metaLabel}</span>
                      </td>
                      <td className={s.tdCenter}>
                        <div className={s.accionesStack}>
                          <div className={`${s.acciones} ${s.accionesDock}`}>
                            <Link
                              className={s.accionBtn}
                              href={row.detailHref}
                              title="Ver detalle"
                              aria-label="Ver detalle"
                              data-tooltip="Ver detalle"
                              onPointerEnter={() => handlePrefetchDetail(row.id)}
                              onFocus={() => handlePrefetchDetail(row.id)}
                              onTouchStart={() => handlePrefetchDetail(row.id)}
                            >
                              <LuEye aria-hidden />
                            </Link>
                            <Link
                              className={s.accionBtn}
                              href={row.editHref}
                              title="Editar"
                              aria-label="Editar"
                              data-tooltip="Editar"
                            >
                              <LuPencil aria-hidden />
                            </Link>
                            {row.telefonoHref ? (
                              <a
                                className={s.accionBtn}
                                href={row.telefonoHref}
                                title="Llamar"
                                aria-label="Llamar"
                                data-tooltip="Llamar"
                              >
                                <LuPhone aria-hidden />
                              </a>
                            ) : (
                              <button
                                className={`${s.accionBtn} ${s.accionBtnDisabled}`}
                                type="button"
                                title="Sin telefono"
                                aria-label="Sin telefono"
                                data-tooltip="Sin telefono"
                                disabled
                              >
                                <LuPhone aria-hidden />
                              </button>
                            )}
                            <details className={s.desktopRowMenu}>
                              <summary
                                className={s.accionBtn}
                                title="Mas acciones"
                                aria-label="Mas acciones"
                                data-tooltip="Mas acciones"
                              >
                                <LuEllipsis aria-hidden />
                              </summary>
                              <div className={s.desktopRowMenuContent} role="menu">
                                <button
                                  className={s.desktopRowMenuDanger}
                                  onClick={() => handleDelete(row.id, row.nombre)}
                                  type="button"
                                  role="menuitem"
                                  disabled={isSaving}
                                >
                                  <LuTrash2 aria-hidden />
                                  Eliminar cliente
                                </button>
                              </div>
                            </details>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PremiumPageSection>

          <PremiumPageSection className={s.cardList}>
            {isSelectionMode ? (
              <div className={s.mobileSelectionBar}>
                <div>
                  <strong>{selectedCount} seleccionado(s)</strong>
                  <span>{allVisibleSelected ? "Todos los visibles" : "Toca las tarjetas"}</span>
                </div>
                <div className={s.mobileSelectionActions}>
                  <button className={s.btnGhost} type="button" onClick={toggleSelectAllVisible}>
                    {allVisibleSelected ? "Quitar" : "Todos"}
                  </button>
                  <button
                    className={s.bulkDeleteBtn}
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    disabled={selectedCount === 0 || isSaving || isBulkDeleting}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : null}
            {visibleRows.map((row) => {
              return (
                <div key={row.id} className={`${s.clientCard}${isSelectionMode ? ` ${s.clientCardSelectable}` : ""}${row.isSelected ? ` ${s.clientCardSelected}` : ""}`}>
                  {isSelectionMode ? (
                    <button
                      className={s.clientCardSelectButton}
                      type="button"
                      onClick={() => toggleSelectedId(row.id)}
                      aria-pressed={row.isSelected}
                    >
                      <span className={`${s.selectionCircle} ${row.isSelected ? s.selectionCircleActive : ""}`} aria-hidden />
                      <span className={s.accionSrOnly}>Seleccionar {row.nombre}</span>
                    </button>
                  ) : null}
                  <div className={s.clientCardTop}>
                    <div className={s.clientCardIdentity}>
                      <div className={s.clientCardName}>{row.nombre}</div>
                      <span className={`${s.badge} ${row.metaClassName}`}>{row.metaLabel}</span>
                    </div>
                    <div className={s.clientCardObras}>
                      <strong>{row.obrasCount}</strong>
                      <span>obras</span>
                    </div>
                  </div>

                  <div className={s.clientCardMeta}>
                    <span>
                      <LuPhone aria-hidden />
                      {row.telefono}
                    </span>
                    <span>
                      <LuMapPin aria-hidden />
                      {row.direccion}
                    </span>
                  </div>

                  <div className={s.clientCardSince}>Ultima gestion: {row.ultimaGestion}</div>

                  <div className={s.clientCardBottom}>
                    {isSelectionMode ? (
                      <button
                        className={s.clientCardPrimaryAction}
                        type="button"
                        onClick={() => toggleSelectedId(row.id)}
                        aria-pressed={row.isSelected}
                      >
                        {row.isSelected ? "Seleccionado" : "Seleccionar"}
                      </button>
                    ) : (
                      <Link
                        className={s.clientCardPrimaryAction}
                        href={row.detailHref}
                        onPointerEnter={() => handlePrefetchDetail(row.id)}
                        onFocus={() => handlePrefetchDetail(row.id)}
                        onTouchStart={() => handlePrefetchDetail(row.id)}
                      >
                        <LuEye aria-hidden />
                        Ver ficha
                      </Link>
                    )}
                    {!isSelectionMode ? <div className={s.clientCardSecondaryActions}>
                      <a
                        className={s.clientCardIconAction}
                        href={row.telefonoHref}
                        aria-label={row.telefonoHref ? "Llamar cliente" : "Cliente sin telefono"}
                      >
                        <LuPhone aria-hidden />
                      </a>
                      <details className={s.clientMenu}>
                        <summary className={s.clientCardIconAction}>
                          <LuEllipsis aria-hidden />
                        </summary>
                        <div className={s.clientMenuContent}>
                          <Link className={s.accionBtnMobile} href={row.editHref}>
                            <LuPencil aria-hidden />
                            Editar
                          </Link>
                          <button
                            className={`${s.accionBtnMobile} ${s.accionBtnMobileDanger}`}
                            onClick={() => handleDelete(row.id, row.nombre)}
                            type="button"
                            disabled={isSaving}
                          >
                            <LuTrash2 aria-hidden />
                            Eliminar
                          </button>
                        </div>
                      </details>
                    </div> : null}
                  </div>
                </div>
              );
            })}
          </PremiumPageSection>

          {totalPages > 1 ? (
            <PremiumPageSection className={s.pagination}>
              <span className={s.pagInfo}>
                Mostrando {pageStart + 1} - {Math.min(pageStart + PAGE_SIZE, filtrados.length)} de{" "}
                {filtrados.length} clientes
              </span>
              <div className={s.pagBtns}>
                <button
                  className={s.pagBtn}
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={visiblePage === 1}
                  aria-label="Pagina anterior"
                >
                  {"‹"}
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    className={`${s.pagBtn}${page === visiblePage ? ` ${s.pagActive}` : ""}`}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-current={page === visiblePage ? "page" : undefined}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className={s.pagBtn}
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={visiblePage === totalPages}
                  aria-label="Pagina siguiente"
                >
                  {"›"}
                </button>
              </div>
            </PremiumPageSection>
          ) : null}
        </>
      )}

      {deleteCandidate ? (
        <div className={s.modalOverlay} role="presentation">
          <div
            className={s.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-client-title"
            aria-describedby="delete-client-description"
          >
            <div className={s.modalIconWrap}>
              <LuTrash2 aria-hidden />
            </div>
            <p id="delete-client-title" className={s.modalTitle}>
              Eliminar cliente
            </p>
            <p id="delete-client-description" className={s.modalDescription}>
              Vas a eliminar a <strong>{deleteCandidate.nombre}</strong>. Esto ocultara tambien sus proyectos y todas las cotizaciones relacionadas dentro del panel operativo.
            </p>
            <div className={s.modalActions}>
              <button
                className={s.btnGhost}
                onClick={() => setDeleteCandidate(null)}
                type="button"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                className={s.modalDangerBtn}
                onClick={() => void handleConfirmDelete()}
                type="button"
                disabled={isSaving}
              >
                {isSaving ? "Eliminando..." : "Si, eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isBulkDeleteModalOpen ? (
        <div className={s.modalOverlay} role="presentation">
          <div
            className={s.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-client-title"
            aria-describedby="bulk-delete-client-description"
          >
            <div className={s.modalIconWrap}>
              <LuTrash2 aria-hidden />
            </div>
            <p id="bulk-delete-client-title" className={s.modalTitle}>
              Eliminar clientes
            </p>
            <p id="bulk-delete-client-description" className={s.modalDescription}>
              Vas a eliminar <strong>{selectedCount}</strong> cliente(s) seleccionado(s). Tambien se ocultaran sus proyectos y cotizaciones asociadas.
            </p>
            <div className={s.modalActions}>
              <button
                className={s.btnGhost}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                type="button"
                disabled={isBulkDeleting}
              >
                Cancelar
              </button>
              <button
                className={s.modalDangerBtn}
                onClick={() => void handleConfirmBulkDelete()}
                type="button"
                disabled={isBulkDeleting || selectedCount === 0}
              >
                {isBulkDeleting ? "Eliminando..." : "Si, eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PremiumPageReveal>
  );
}
