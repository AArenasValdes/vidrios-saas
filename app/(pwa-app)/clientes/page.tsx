"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  LuBuilding2,
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

import { useClientes } from "@/hooks/useClientes";

import s from "./page.module.css";

const ESTADOS = ["Todos", "Activo", "Seguimiento", "Prospecto", "Inactivo"];

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

export default function ClientesPage() {
  const { clientes, isReady, isRefreshing, isSaving, deleteCliente } = useClientes();
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [direccionFiltro, setDireccionFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const busquedaDiferida = useDeferredValue(busqueda);
  const isInitialSync = isRefreshing && clientes.length === 0;

  const { direcciones, filtrados, filtrosActivos, kpis, obrasFiltradas } = useMemo(() => {
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
    };
  }, [busquedaDiferida, clientes, direccionFiltro, estadoFiltro]);

  const limpiar = () => {
    setEstadoFiltro("Todos");
    setDireccionFiltro("Todas");
    setBusqueda("");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageNumbers = buildPageNumbers(currentPage, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedClientes = filtrados.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [estadoFiltro, direccionFiltro, busqueda]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleDelete = (id: string, nombre: string) => {
    setDeleteCandidate({ id, nombre });
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

  if (!isReady) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuUsers aria-hidden />
          </div>
          <p className={s.emptyTitle}>Cargando clientes</p>
          <p className={s.emptySub}>Estamos preparando el padron comercial de tu organizacion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Clientes</h1>
          <p className={s.subtitle}>
            Centraliza contactos, obras y seguimiento comercial para no perder oportunidades.
          </p>
          {isRefreshing ? <p className={s.subtitle}>Sincronizando clientes...</p> : null}
        </div>

        <div className={s.headerActions}>
          <Link className={s.btnPrimary} href="/clientes/nuevo">
            <LuUserPlus aria-hidden />
            Nuevo cliente
          </Link>
        </div>
      </div>

      <div className={s.kpiRow}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={s.kpiCard}>
            <span className={s.kpiLabel}>{kpi.label}</span>
            <span className={`${s.kpiValue} ${s[`tone${kpi.tone[0].toUpperCase()}${kpi.tone.slice(1)}`]}`}>
              {kpi.value}
            </span>
            <span className={s.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon}>
            <LuSearch aria-hidden />
          </span>
          <input
            className={s.searchInput}
            placeholder="Buscar por nombre, referencia, telefono o direccion..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>

        <div className={s.filterGroup}>
          <label className={s.filterLabel}>Estado</label>
          <select
            className={s.filterSelect}
            value={estadoFiltro}
            onChange={(event) => setEstadoFiltro(event.target.value)}
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
            onChange={(event) => setDireccionFiltro(event.target.value)}
          >
            {direcciones.map((direccion) => (
              <option key={direccion}>{direccion}</option>
            ))}
          </select>
        </div>

        <button className={s.btnGhost} onClick={limpiar} type="button">
          <LuFilterX aria-hidden />
          Limpiar
        </button>
      </div>

      <div className={s.resultsBar}>
        <div>
          <p className={s.resultsLabel}>Resultados</p>
          <div className={s.resultsMain}>
            <strong>{filtrados.length}</strong>
            <span>clientes visibles</span>
          </div>
        </div>

        <div className={s.resultsMeta}>
          <span>{obrasFiltradas} obras asociadas</span>
          {filtrosActivos.length > 0 ? (
            <div className={s.activeFilters}>
              {filtrosActivos.map((filtro) => (
                <span key={filtro} className={s.filterPill}>
                  {filtro}
                </span>
              ))}
            </div>
          ) : (
            <span className={s.resultsHint}>Sin filtros activos</span>
          )}
        </div>
      </div>

      {feedbackMessage ? (
        <div className={s.feedbackBanner}>
          <span>{feedbackMessage}</span>
          <button className={s.feedbackClose} onClick={() => setFeedbackMessage(null)} type="button">
            Cerrar
          </button>
        </div>
      ) : null}

      {filtrados.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuUsers aria-hidden />
          </div>
          <p className={s.emptyTitle}>
            {isInitialSync
              ? "Sincronizando clientes"
              : clientes.length === 0
                ? "Todavia no tienes clientes"
                : "Sin clientes para mostrar"}
          </p>
          <p className={s.emptySub}>
            {isInitialSync
              ? "Estamos cargando tu padron comercial. Espera un momento antes de asumir que no hay registros."
              : clientes.length === 0
              ? "Crea tu primer cliente para empezar a registrar obras y generar presupuestos mas rapido."
              : "No encontramos clientes con los filtros actuales. Ajusta la busqueda o limpia filtros para ver todo el padron."}
          </p>
          {isInitialSync ? null : filtrosActivos.length > 0 ? (
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
        </div>
      ) : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <colgroup>
                <col className={s.colCliente} />
                <col className={s.colContacto} />
                <col className={s.colResumen} />
                <col className={s.colEstado} />
                <col className={s.colAcciones} />
              </colgroup>
              <thead>
                <tr>
                  <th className={s.th}>Cliente</th>
                  <th className={s.th}>Contacto</th>
                  <th className={s.th}>Ultima obra</th>
                  <th className={`${s.th} ${s.thC}`}>Estado</th>
                  <th className={`${s.th} ${s.thC}`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClientes.map((cliente) => {
                  const meta = ESTADO_META[cliente.estado] ?? {
                    cls: "stSeguimiento",
                    label: cliente.estado,
                  };

                  return (
                    <tr key={cliente.id} className={s.tr}>
                      <td className={s.tdPrimary}>
                        <div className={s.clientIdentity}>
                          <span className={s.clientNameValue}>{cliente.nombre}</span>
                        </div>
                      </td>
                      <td className={s.tdContacto}>
                        <div className={s.contactBlock}>
                          <span className={s.contactPhone}>{cliente.telefono || "Sin telefono"}</span>
                          <span className={s.contactAddress}>{cliente.direccion}</span>
                        </div>
                      </td>
                      <td className={s.tdResumen}>
                        <div className={s.resumenBlock}>
                          <span className={s.resumenReferencia}>{cliente.referencia}</span>
                          <span className={s.resumenMeta}>{cliente.obras} obras</span>
                          <span className={s.resumenGestion}>{cliente.ultimaGestion}</span>
                        </div>
                      </td>
                      <td className={s.tdCenter}>
                        <span className={`${s.badge} ${s[meta.cls]}`}>{meta.label}</span>
                      </td>
                      <td className={s.tdCenter}>
                        <div className={s.accionesStack}>
                          <div className={`${s.acciones} ${s.accionesDock}`}>
                          <Link
                            className={s.accionBtn}
                            href={`/clientes/${cliente.id}`}
                            title="Ver detalle"
                            aria-label="Ver detalle"
                            data-tooltip="Ver detalle"
                          >
                            <LuEye aria-hidden />
                          </Link>
                          <Link
                            className={s.accionBtn}
                            href={`/clientes/${cliente.id}/editar`}
                            title="Editar"
                            aria-label="Editar"
                            data-tooltip="Editar"
                          >
                            <LuPencil aria-hidden />
                          </Link>
                          <a
                            className={s.accionBtn}
                            href={cliente.telefono ? `tel:${cliente.telefono}` : undefined}
                            title="Llamar"
                            aria-label="Llamar"
                            data-tooltip={cliente.telefono ? "Llamar" : "Sin telefono"}
                          >
                            <LuPhone aria-hidden />
                          </a>
                          </div>
                          <button
                            className={`${s.accionBtn} ${s.accionBtnDanger} ${s.accionBtnDelete}`}
                            onClick={() => handleDelete(String(cliente.id), cliente.nombre)}
                            title="Eliminar cliente"
                            aria-label="Eliminar cliente"
                            data-tooltip="Eliminar cliente"
                            type="button"
                            disabled={isSaving}
                          >
                            <LuTrash2 aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={s.cardList}>
            {paginatedClientes.map((cliente) => {
              const meta = ESTADO_META[cliente.estado] ?? {
                cls: "stSeguimiento",
                label: cliente.estado,
              };

              return (
                <div key={cliente.id} className={s.clientCard}>
                  <div className={s.clientCardTop}>
                    <div>
                      <div className={s.clientCardName}>{cliente.nombre}</div>
                      <div className={s.clientCardRef}>{cliente.referencia}</div>
                    </div>
                    <span className={`${s.badge} ${s[meta.cls]}`}>{meta.label}</span>
                  </div>

                  <div className={s.clientCardMeta}>
                    <span>
                      <LuPhone aria-hidden />
                      {cliente.telefono || "Sin telefono"}
                    </span>
                    <span>
                      <LuMapPin aria-hidden />
                      {cliente.direccion}
                    </span>
                    <span>
                      <LuBuilding2 aria-hidden />
                      {cliente.obras} obras
                    </span>
                  </div>

                  <div className={s.clientCardBottom}>
                    <span className={s.clientCardLast}>{cliente.ultimaGestion}</span>
                    <div className={s.acciones}>
                      <Link className={s.accionBtnMobile} href={`/clientes/${cliente.id}`}>
                        <LuEye aria-hidden />
                        Ver ficha
                      </Link>
                      <a
                        className={s.accionBtnMobile}
                        href={cliente.telefono ? `tel:${cliente.telefono}` : undefined}
                      >
                        <LuPhone aria-hidden />
                        Llamar cliente
                      </a>
                      <button
                        className={`${s.accionBtnMobile} ${s.accionBtnMobileDanger}`}
                        onClick={() => handleDelete(String(cliente.id), cliente.nombre)}
                        type="button"
                        disabled={isSaving}
                      >
                        <LuTrash2 aria-hidden />
                        Eliminar cliente
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className={s.pagination}>
              <span className={s.pagInfo}>
                Mostrando {pageStart + 1} - {Math.min(pageStart + PAGE_SIZE, filtrados.length)} de{" "}
                {filtrados.length} clientes
              </span>
              <div className={s.pagBtns}>
                <button
                  className={s.pagBtn}
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  {"<"}
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    className={`${s.pagBtn}${page === currentPage ? ` ${s.pagActive}` : ""}`}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className={s.pagBtn}
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  {">"}
                </button>
              </div>
            </div>
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
    </div>
  );
}
