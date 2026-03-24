"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  LuCopy,
  LuDownload,
  LuEye,
  LuFilePlus2,
  LuFilterX,
  LuPencil,
  LuSearch,
  LuSend,
  LuTrash2,
} from "react-icons/lu";

import { useCotizacionesStore } from "@/hooks/useCotizacionesStore";
import { formatCotizacionDate } from "@/services/cotizaciones-workflow.service";

import s from "./page.module.css";

const ESTADOS = [
  "Todos",
  "Borrador",
  "Creada",
  "Enviada",
  "Aprobada",
  "Rechazada",
  "Terminada",
];
const ORDENES = [
  { value: "updated_desc", label: "Ultima edicion" },
  { value: "total_desc", label: "Monto mayor" },
  { value: "codigo_desc", label: "Codigo reciente" },
  { value: "estado", label: "Estado" },
] as const;
const PERIODOS = [
  { value: "all", label: "Todos" },
  { value: "this_month", label: "Este mes" },
  { value: "last_month", label: "Mes pasado" },
  { value: "last_90_days", label: "Ultimos 90 dias" },
] as const;
const COTIZACIONES_ORDER_STORAGE_KEY = "vidrios-saas:cotizaciones:order";

const ESTADO_META: Record<string, { cls: string; label: string }> = {
  aprobada: { cls: "stAprobada", label: "Aprobada" },
  enviada: { cls: "stEnviada", label: "Enviada" },
  borrador: { cls: "stBorrador", label: "Borrador" },
  creada: { cls: "stCreada", label: "Creada" },
  rechazada: { cls: "stRechazada", label: "Rechazada" },
  terminada: { cls: "stTerminada", label: "Terminada" },
};

const ESTADO_SORT_PRIORITY: Record<string, number> = {
  creada: 0,
  enviada: 1,
  borrador: 2,
  aprobada: 3,
  rechazada: 4,
  terminada: 5,
};

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const CLP = (value: number) => clpFormatter.format(value);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "No se pudo actualizar la respuesta del presupuesto";
}

type ManualResponseStatus = "pendiente" | "aprobada" | "rechazada" | "terminada";

function getManualResponseValue(estado: string): ManualResponseStatus {
  if (estado === "terminada") {
    return "terminada";
  }

  if (estado === "aprobada") {
    return "aprobada";
  }

  if (estado === "rechazada") {
    return "rechazada";
  }

  return "pendiente";
}

function isWithinPeriod(
  value: string,
  period: (typeof PERIODOS)[number]["value"],
  now: Date
) {
  if (period === "all") {
    return true;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (period === "this_month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  if (period === "last_month") {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return (
      date.getFullYear() === lastMonth.getFullYear() &&
      date.getMonth() === lastMonth.getMonth()
    );
  }

  const diffMs = now.getTime() - date.getTime();
  return diffMs <= 90 * 24 * 60 * 60 * 1000;
}

const PAGE_SIZE = 8;

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

export default function CotizacionesPage() {
  const router = useRouter();
  const {
    cotizaciones,
    isReady,
    isRefreshing,
    isSaving,
    deleteWorkflow,
    updateManualResponseStatus,
    loadCotizacionById,
  } = useCotizacionesStore();
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [clienteFiltro, setClienteFiltro] = useState("Todos");
  const [periodoFiltro, setPeriodoFiltro] = useState<(typeof PERIODOS)[number]["value"]>(
    "this_month"
  );
  const [ordenFiltro, setOrdenFiltro] = useState<(typeof ORDENES)[number]["value"]>(() => {
    if (typeof window === "undefined") {
      return "updated_desc";
    }

    try {
      const stored = window.sessionStorage.getItem(COTIZACIONES_ORDER_STORAGE_KEY);
      const isValid = ORDENES.some((item) => item.value === stored);

      return isValid
        ? (stored as (typeof ORDENES)[number]["value"])
        : "updated_desc";
    } catch {
      return "updated_desc";
    }
  });
  const [busqueda, setBusqueda] = useState("");
  const busquedaDiferida = useDeferredValue(busqueda);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [responseUpdatingId, setResponseUpdatingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: string;
    codigo: string;
  } | null>(null);
  const isInitialSync = isRefreshing && cotizaciones.length === 0;
  const now = useMemo(() => new Date(), []);
  const { clientes, filtradas, filtrosActivos, kpis, ordenadas, montoFiltrado } = useMemo(() => {
    let aprobadasCount = 0;
    let aprobadasMonto = 0;
    let pendientesCount = 0;
    let terminadasCount = 0;
    const clientesSet = new Set<string>();

    for (const item of cotizaciones) {
      clientesSet.add(item.clienteNombre);

      if (item.estado === "aprobada") {
        aprobadasCount += 1;
        aprobadasMonto += item.total;
      }

      if (item.estado === "terminada") {
        terminadasCount += 1;
      }

      if (
        item.estado === "enviada" ||
        item.estado === "borrador" ||
        item.estado === "creada"
      ) {
        pendientesCount += 1;
      }
    }

    const query = busquedaDiferida.trim().toLowerCase();
    const nextFiltradas = cotizaciones.filter((cotizacion) => {
      const matchEstado =
        estadoFiltro === "Todos" || cotizacion.estado === estadoFiltro.toLowerCase();
      const matchCliente =
        clienteFiltro === "Todos" || cotizacion.clienteNombre === clienteFiltro;
      const matchPeriodo = isWithinPeriod(cotizacion.updatedAt, periodoFiltro, now);
      const matchBusqueda =
        !query ||
        cotizacion.clienteNombre.toLowerCase().includes(query) ||
        cotizacion.codigo.toLowerCase().includes(query) ||
        cotizacion.obra.toLowerCase().includes(query);

      return matchEstado && matchCliente && matchPeriodo && matchBusqueda;
    });
    const nextOrdenadas = [...nextFiltradas].sort((left, right) => {
      if (ordenFiltro === "total_desc") {
        return right.total - left.total;
      }

      if (ordenFiltro === "codigo_desc") {
        return right.codigo.localeCompare(left.codigo, "es-CL", {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (ordenFiltro === "estado") {
        const leftPriority = ESTADO_SORT_PRIORITY[left.estado] ?? 99;
        const rightPriority = ESTADO_SORT_PRIORITY[right.estado] ?? 99;

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
    const nextMontoFiltrado = nextFiltradas.reduce(
      (accumulator, cotizacion) => accumulator + cotizacion.total,
      0
    );

    return {
      clientes: ["Todos", ...clientesSet],
      filtradas: nextFiltradas,
      ordenadas: nextOrdenadas,
      montoFiltrado: nextMontoFiltrado,
      filtrosActivos: [
        estadoFiltro !== "Todos" ? `Estado: ${estadoFiltro}` : null,
        clienteFiltro !== "Todos" ? `Cliente: ${clienteFiltro}` : null,
        periodoFiltro !== "this_month"
          ? `Periodo: ${
              PERIODOS.find((item) => item.value === periodoFiltro)?.label ?? ""
            }`
          : null,
        ordenFiltro !== "updated_desc"
          ? `Orden: ${
              ORDENES.find((item) => item.value === ordenFiltro)?.label ?? ""
            }`
          : null,
        busquedaDiferida.trim() ? `Busqueda: ${busquedaDiferida.trim()}` : null,
      ].filter(Boolean) as string[],
      kpis: [
        {
          label: "Total",
          value: String(cotizaciones.length),
          sub: "cotizaciones",
          tone: "blue",
        },
        {
          label: "Aprobadas",
          value: String(aprobadasCount),
          sub: "este mes",
          tone: "green",
        },
        {
          label: "Pendientes",
          value: String(pendientesCount),
          sub: "por revisar",
          tone: "amber",
        },
        {
          label: "Terminadas",
          value: String(terminadasCount),
          sub: "obras cerradas",
          tone: "strong",
        },
        {
          label: "Aprobado",
          value: CLP(aprobadasMonto),
          sub: "monto total",
          tone: "blue",
          mono: true,
        },
      ],
    };
  }, [
    busquedaDiferida,
    clienteFiltro,
    cotizaciones,
    estadoFiltro,
    now,
    ordenFiltro,
    periodoFiltro,
  ]);

  const limpiar = () => {
    setEstadoFiltro("Todos");
    setClienteFiltro("Todos");
    setPeriodoFiltro("this_month");
    setOrdenFiltro("updated_desc");
    setBusqueda("");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(ordenadas.length / PAGE_SIZE));
  const pageNumbers = useMemo(
    () => buildPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedCotizaciones = useMemo(
    () => ordenadas.slice(pageStart, pageStart + PAGE_SIZE),
    [ordenadas, pageStart]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [estadoFiltro, clienteFiltro, periodoFiltro, ordenFiltro, busqueda]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(COTIZACIONES_ORDER_STORAGE_KEY, ordenFiltro);
    } catch {
      return;
    }
  }, [ordenFiltro]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleRows = useMemo(
    () =>
      paginatedCotizaciones.map((cotizacion) => {
        const meta = ESTADO_META[cotizacion.estado] ?? {
          cls: "stBorrador",
          label: cotizacion.estado,
        };
        const manualResponse = getManualResponseValue(cotizacion.estado);
        const isUpdatingResponse = responseUpdatingId === cotizacion.id;
        const hasWhatsappPhone = Boolean(cotizacion.clienteTelefono?.trim());
        const isSending = sendingId === cotizacion.id;

        return {
          id: cotizacion.id,
          codigo: cotizacion.codigo,
          clienteNombre: cotizacion.clienteNombre,
          obra: cotizacion.obra,
          fecha: formatCotizacionDate(cotizacion.updatedAt),
          total: CLP(cotizacion.total),
          manualResponse,
          meta,
          isUpdatingResponse,
          hasWhatsappPhone,
          isSending,
          rowClassName: `${s.tr}${manualResponse !== "pendiente" ? ` ${s.trWithResponse}` : ""}`,
          cardClassName: `${s.cotCard}${manualResponse !== "pendiente" ? ` ${s.cotCardWithResponse}` : ""}`,
          detailHref: `/cotizaciones/${cotizacion.id}`,
          editHref: `/cotizaciones/nueva?edit=${cotizacion.id}`,
          deleteDisabled: isSaving,
        };
      }),
    [isSaving, paginatedCotizaciones, responseUpdatingId, sendingId]
  );

  const handleDuplicate = useCallback((id: string) => {
    router.push(`/cotizaciones/nueva?duplicate=${id}`);
  }, [router]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const { downloadCotizacionesListCsv } = await import("@/utils/pdf");
      downloadCotizacionesListCsv(filtradas, "Listado de cotizaciones");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = useCallback(async (id: string, codigo: string) => {
    setDeleteCandidate({ id, codigo });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteCandidate) {
      return;
    }

    try {
      await deleteWorkflow(deleteCandidate.id);
      setDeleteCandidate(null);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la cotizacion"
      );
    }
  }, [deleteCandidate, deleteWorkflow]);

  const handleManualResponseChange = useCallback(async (
    id: string,
    estado: ManualResponseStatus
  ) => {
    try {
      setResponseUpdatingId(id);
      await updateManualResponseStatus(id, estado);
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setResponseUpdatingId(null);
    }
  }, [updateManualResponseStatus]);

  const handleSendQuote = useCallback(async (id: string) => {
    try {
      setSendingId(id);
      const fullRecord = await loadCotizacionById(id);
      const record = fullRecord ?? cotizaciones.find((item) => item.id === id) ?? null;

      if (!record) {
        throw new Error("No se pudo recuperar la cotizacion para enviarla.");
      }

      if (!record.clienteTelefono?.trim()) {
        throw new Error("El cliente no tiene un telefono valido para WhatsApp.");
      }

      router.push(`/print/cotizaciones/${record.id}?intent=whatsapp`);
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setSendingId(null);
    }
  }, [cotizaciones, loadCotizacionById, router]);

  if (!isReady) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuFilePlus2 aria-hidden />
          </div>
          <p className={s.emptyTitle}>Cargando cotizaciones</p>
          <p className={s.emptySub}>
            Estamos preparando tus presupuestos y el resumen comercial.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Cotizaciones</h1>
          <p className={s.subtitle}>
            Gestiona presupuestos, corrige borradores y vuelve a editar cualquier cotizacion terminada si el maestro se equivoco.
          </p>
        </div>

        <div className={s.headerActions}>
          <button
            className={s.btnGhostAction}
            onClick={() => void handleExport()}
            type="button"
            disabled={isExporting}
          >
            <LuDownload aria-hidden />
            {isExporting ? "Preparando..." : "Exportar CSV"}
          </button>
          <Link className={s.btnPrimary} href="/cotizaciones/nueva">
            <LuFilePlus2 aria-hidden />
            Nueva cotizacion
          </Link>
        </div>
      </div>

      <div className={s.kpiRow}>
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className={`${s.kpiCard}${
              kpis.length % 2 === 1 && index === kpis.length - 1 ? ` ${s.kpiCardCentered}` : ""
            }`}
          >
            <span className={s.kpiLabel}>{kpi.label}</span>
            <span
              className={`${s.kpiValue}${kpi.mono ? ` ${s.kpiMono}` : ""} ${s[`tone${kpi.tone[0].toUpperCase()}${kpi.tone.slice(1)}`]}`}
            >
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
            placeholder="Buscar por cliente, codigo u obra..."
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
          <label className={s.filterLabel}>Periodo</label>
          <select
            className={s.filterSelect}
            value={periodoFiltro}
            onChange={(event) =>
              setPeriodoFiltro(event.target.value as (typeof PERIODOS)[number]["value"])
            }
          >
            {PERIODOS.map((periodo) => (
              <option key={periodo.value} value={periodo.value}>
                {periodo.label}
              </option>
            ))}
          </select>
        </div>

        <div className={s.filterGroup}>
          <label className={s.filterLabel}>Cliente</label>
          <select
            className={s.filterSelect}
            value={clienteFiltro}
            onChange={(event) => setClienteFiltro(event.target.value)}
          >
            {clientes.map((cliente) => (
              <option key={cliente}>{cliente}</option>
            ))}
          </select>
        </div>

        <div className={s.filterGroup}>
          <label className={s.filterLabel}>Ordenar por</label>
          <select
            className={s.filterSelect}
            value={ordenFiltro}
            onChange={(event) =>
              setOrdenFiltro(event.target.value as (typeof ORDENES)[number]["value"])
            }
          >
            {ORDENES.map((orden) => (
              <option key={orden.value} value={orden.value}>
                {orden.label}
              </option>
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
            <strong>{filtradas.length}</strong>
            <span>cotizaciones visibles</span>
          </div>
        </div>

        <div className={s.resultsMeta}>
          <span>Monto filtrado: {CLP(montoFiltrado)}</span>
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

      {filtradas.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuFilePlus2 aria-hidden />
          </div>
          <p className={s.emptyTitle}>
            {isInitialSync
              ? "Sincronizando cotizaciones"
              : cotizaciones.length === 0
              ? "Todavia no tienes cotizaciones"
              : "Sin cotizaciones para mostrar"}
          </p>
          <p className={s.emptySub}>
            {isInitialSync
              ? "Estamos cargando tus presupuestos guardados. Espera un momento antes de crear uno nuevo."
              : cotizaciones.length === 0
              ? "Crea tu primer presupuesto para empezar a generar PDF y compartirlo por WhatsApp."
              : "No encontramos resultados con los filtros actuales. Ajusta la busqueda o limpia los filtros para volver a ver todas las cotizaciones."}
          </p>
          {isInitialSync ? null : filtrosActivos.length > 0 ? (
            <button className={s.btnPrimary} onClick={limpiar} type="button">
              <LuFilterX aria-hidden />
              Limpiar filtros
            </button>
          ) : (
            <Link className={s.btnPrimary} href="/cotizaciones/nueva">
              <LuFilePlus2 aria-hidden />
              Nueva cotizacion
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <colgroup>
                <col className={s.colCode} />
                <col className={s.colClienteResumen} />
                <col className={s.colRespuesta} />
                <col className={s.colResumen} />
                <col className={s.colAcciones} />
              </colgroup>
              <thead>
                <tr>
                  <th className={s.th}>Codigo</th>
                  <th className={s.th}>Cliente y obra</th>
                  <th className={s.th}>Respuesta</th>
                  <th className={s.th}>Resumen</th>
                  <th className={`${s.th} ${s.thC}`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  return (
                    <tr key={row.id} className={row.rowClassName}>
                      <td className={s.tdCode}>
                        <span className={s.codeValue}>{row.codigo}</span>
                      </td>
                      <td className={s.tdCliente}>
                        <div className={s.clienteBlock}>
                          <span className={s.clienteNombreValue}>{row.clienteNombre}</span>
                          <span className={s.obraValue}>{row.obra}</span>
                        </div>
                      </td>
                      <td className={s.tdResponse}>
                        <select
                          className={`${s.responseSelect}${row.isUpdatingResponse ? ` ${s.responseSelectUpdating}` : ""}`}
                          value={row.manualResponse}
                          onChange={(event) =>
                            void handleManualResponseChange(
                              row.id,
                              event.target.value as ManualResponseStatus
                            )
                          }
                          disabled={row.isUpdatingResponse || isSaving}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="aprobada">Aprobada</option>
                          <option value="rechazada">Rechazada</option>
                          <option value="terminada">Proyecto terminado</option>
                        </select>
                      </td>
                      <td className={s.tdResumen}>
                        <div className={s.resumenBlock}>
                          <span className={s.resumenFecha}>{row.fecha}</span>
                          <span className={s.resumenTotal}>{row.total}</span>
                          <span className={`${s.badge} ${s[row.meta.cls]}`}>{row.meta.label}</span>
                        </div>
                      </td>
                      <td className={s.tdAcciones}>
                        <div className={s.accionesRow}>
                          <div className={`${s.acciones} ${s.accionesDock}`}>
                            <Link
                              className={s.accionBtn}
                              href={row.detailHref}
                              title="Ver detalle"
                              aria-label="Ver detalle"
                              data-tooltip="Ver detalle"
                            >
                              <span className={s.accionSrOnly}>Ver detalle</span>
                              <LuEye aria-hidden />
                            </Link>
                            <Link className={s.accionBtn} href={row.editHref} title="Editar" aria-label="Editar" data-tooltip="Editar">
                              <span className={s.accionSrOnly}>Editar</span>
                              <LuPencil aria-hidden />
                            </Link>
                            {row.hasWhatsappPhone ? (
                              <button
                                className={s.accionBtn}
                                onClick={() => void handleSendQuote(row.id)}
                                title="Enviar por WhatsApp"
                                aria-label="Enviar por WhatsApp"
                                data-tooltip="Enviar por WhatsApp"
                                type="button"
                                disabled={row.isSending}
                              >
                                <span className={s.accionSrOnly}>Enviar por WhatsApp</span>
                                <LuSend aria-hidden />
                              </button>
                            ) : (
                              <button
                                className={`${s.accionBtn} ${s.accionBtnDisabled}`}
                                title="Sin telefono para enviar"
                                aria-label="Sin telefono para enviar"
                                data-tooltip="Sin telefono para enviar"
                                type="button"
                                disabled
                              >
                                <span className={s.accionSrOnly}>Sin telefono para enviar</span>
                                <LuSend aria-hidden />
                              </button>
                            )}
                            <button
                              className={s.accionBtn}
                              onClick={() => handleDuplicate(row.id)}
                              title="Duplicar"
                              aria-label="Duplicar"
                              data-tooltip="Duplicar"
                              type="button"
                            >
                                <span className={s.accionSrOnly}>Duplicar</span>
                                <LuCopy aria-hidden />
                            </button>
                          </div>
                          <button
                            className={`${s.accionBtn} ${s.accionBtnDanger} ${s.accionBtnDelete}`}
                            onClick={() => handleDelete(row.id, row.codigo)}
                            title="Eliminar"
                            aria-label="Eliminar"
                            data-tooltip="Eliminar"
                            type="button"
                            disabled={row.deleteDisabled}
                          >
                            <span className={s.accionSrOnly}>Eliminar</span>
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
            {visibleRows.map((row) => {
              return (
                <div key={row.id} className={row.cardClassName}>
                  <div className={s.cotCardTop}>
                    <span className={s.cotCardNum}>{row.codigo}</span>
                    <span className={`${s.badge} ${s[row.meta.cls]}`}>{row.meta.label}</span>
                  </div>
                  <div className={s.cotCardNombre}>{row.clienteNombre}</div>
                  <div className={s.cotCardObra}>{row.obra}</div>
                  <div className={s.responseCardWrap}>
                    <span className={s.responseCardLabel}>Respuesta</span>
                    <select
                      className={`${s.responseSelect}${row.isUpdatingResponse ? ` ${s.responseSelectUpdating}` : ""}`}
                      value={row.manualResponse}
                      onChange={(event) =>
                        void handleManualResponseChange(
                          row.id,
                          event.target.value as ManualResponseStatus
                        )
                      }
                      disabled={row.isUpdatingResponse || isSaving}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobada">Aprobada</option>
                      <option value="rechazada">Rechazada</option>
                      <option value="terminada">Proyecto terminado</option>
                    </select>
                  </div>
                  <div className={s.cotCardBottom}>
                    <span className={s.cotCardFecha}>{row.fecha}</span>
                    <span className={s.cotCardTotal}>{row.total}</span>
                  </div>
                  <div className={s.cotCardAcciones}>
                    <Link className={s.accionBtnMobile} href={row.detailHref}>
                      <LuEye aria-hidden />
                      Ver detalle
                    </Link>
                    <Link
                      className={s.accionBtnMobile}
                      href={row.editHref}
                    >
                      <LuPencil aria-hidden />
                      Editar
                    </Link>
                    {row.hasWhatsappPhone ? (
                      <button
                        className={s.accionBtnMobile}
                        onClick={() => void handleSendQuote(row.id)}
                        type="button"
                        disabled={row.isSending}
                      >
                        <LuSend aria-hidden />
                        {row.isSending ? "Preparando envio..." : "Enviar por WhatsApp"}
                      </button>
                    ) : (
                      <button className={`${s.accionBtnMobile} ${s.accionBtnMobileDisabled}`} type="button" disabled>
                        <LuSend aria-hidden />
                        Sin telefono para enviar
                      </button>
                    )}
                    <button
                      className={s.accionBtnMobile}
                      onClick={() => handleDuplicate(row.id)}
                      type="button"
                    >
                      <LuCopy aria-hidden />
                      Duplicar
                    </button>
                    <button
                      className={`${s.accionBtnMobile} ${s.accionBtnMobileDanger}`}
                      onClick={() => void handleDelete(row.id, row.codigo)}
                      type="button"
                      disabled={row.deleteDisabled}
                    >
                      <LuTrash2 aria-hidden />
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className={s.pagination}>
              <span className={s.pagInfo}>
                Mostrando {pageStart + 1} - {Math.min(pageStart + PAGE_SIZE, filtradas.length)} de{" "}
                {ordenadas.length} cotizaciones
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
            aria-labelledby="delete-quote-title"
            aria-describedby="delete-quote-description"
          >
            <div className={s.modalIconWrap}>
              <LuTrash2 aria-hidden />
            </div>
            <p id="delete-quote-title" className={s.modalTitle}>
              Eliminar cotizacion
            </p>
            <p id="delete-quote-description" className={s.modalDescription}>
              Vas a eliminar la cotizacion <strong>{deleteCandidate.codigo}</strong>. Desaparecera del panel operativo, pero podras seguir controlando este tipo de limpieza desde administracion y base de datos.
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
