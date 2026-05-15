"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LuCopy,
  LuDownload,
  LuEye,
  LuFilePlus2,
  LuFilterX,
  LuPlus,
  LuPencil,
  LuSearch,
  LuSend,
  LuSlidersHorizontal,
  LuTrash2,
} from "react-icons/lu";

import { PremiumPageReveal, PremiumPageSection } from "@/components/motion/premium-page-reveal";
import { useCotizacionesResumenPage } from "@/features/cotizaciones/hooks/useCotizacionesResumenPage";
import { useCotizacionesStore } from "@/hooks/useCotizacionesStore";
import { formatCotizacionDate } from "@/services/cotizaciones-workflow.service";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";
import { buildCotizacionWhatsappUrl } from "@/utils/whatsapp";

import { CotizacionMobileCard } from "./_components/cotizacion-mobile-card";
import { CotizacionesFilterFields } from "./_components/cotizaciones-filter-fields";
import { CotizacionesMobileSummary } from "./_components/cotizaciones-mobile-summary";
import type { CotizacionesMobileSummaryKey } from "./_components/cotizaciones-page.types";
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

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const CLP = (value: number) => clpFormatter.format(value);

function formatCompactAmount(value: number) {
  if (value >= 1_000_000) {
    return `$${Math.floor(value / 1_000_000)}M`;
  }

  if (value >= 1_000) {
    return `$${Math.floor(value / 1_000)} mil`;
  }

  return CLP(value);
}

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
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const {
    clientes: clientesDisponibles,
    isReady,
    isRefreshing,
    isSaving,
    deleteWorkflow,
    markQuoteAsSent,
    prefetchCotizacionById,
    updateManualResponseStatus,
    loadCotizacionById,
    ensureClientesLoaded,
  } = useCotizacionesStore({ autoLoadSummary: false });
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [clienteFiltro, setClienteFiltro] = useState("Todos");
  const [periodoFiltro, setPeriodoFiltro] = useState<(typeof PERIODOS)[number]["value"]>(
    "all"
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
  const [atajoEstado, setAtajoEstado] = useState<CotizacionesMobileSummaryKey>("todos");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [responseUpdatingId, setResponseUpdatingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: string;
    codigo: string;
  } | null>(null);
  const {
    cotizaciones,
    totalCount,
    isReady: resumenReady,
    isRefreshing: resumenRefreshing,
    refreshCotizacionesResumen,
  } = useCotizacionesResumenPage({
    page: currentPage,
    pageSize: PAGE_SIZE,
    estado: estadoFiltro,
    cliente: clienteFiltro,
    period: periodoFiltro,
    order: ordenFiltro,
    search: busquedaDiferida,
  });
  const isInitialSync = (!resumenReady || resumenRefreshing) && cotizaciones.length === 0;
  const {
    clientes,
    filtradas,
    filtrosActivos,
    kpis,
    mobileStats,
    montoFiltrado,
  } = useMemo(() => {
    const nextFiltradas = cotizaciones;
    const nextMontoFiltrado = nextFiltradas.reduce(
      (accumulator, cotizacion) => accumulator + cotizacion.total,
      0
    );
    const aprobadas = nextFiltradas.filter((item) => item.estado === "aprobada");
    const rechazadas = nextFiltradas.filter((item) => item.estado === "rechazada");
    const pendientes = nextFiltradas.filter((item) =>
      ["enviada", "borrador", "creada"].includes(item.estado)
    );
    const mobileStatsBase = [
      {
        key: "todos",
        label: "Total",
        value: formatCompactAmount(nextMontoFiltrado),
        tone: "blue",
      },
      {
        key: "aprobadas",
        label: "Aprob.",
        value: String(aprobadas.length),
        tone: "green",
      },
      {
        key: "pendientes",
        label: "Pend.",
        value: String(pendientes.length),
        tone: "amber",
      },
      {
        key: "rechazadas",
        label: "Rech.",
        value: String(rechazadas.length),
        tone: "red",
      },
    ] as const;

    return {
      clientes: [
        "Todos",
        ...Array.from(new Set(clientesDisponibles.map((cliente) => cliente.nombre))),
      ],
      filtradas: nextFiltradas,
      montoFiltrado: nextMontoFiltrado,
      filtrosActivos: [
        atajoEstado === "aprobadas"
          ? "Atajo: aprobadas"
          : atajoEstado === "pendientes"
          ? "Atajo: pendientes"
          : atajoEstado === "rechazadas"
          ? "Atajo: rechazadas"
          : null,
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
          value: String(totalCount),
          sub: "cotizaciones",
          tone: "blue",
        },
        {
          label: "Aprobadas",
          value: String(aprobadas.length),
          sub: "este mes",
          tone: "green",
        },
        {
          label: "Pendientes",
          value: String(pendientes.length),
          sub: "por revisar",
          tone: "amber",
        },
        {
          label: "Terminadas",
          value: String(nextFiltradas.filter((item) => item.estado === "terminada").length),
          sub: "obras cerradas",
          tone: "strong",
        },
        {
          label: "Aprobado",
          value: CLP(aprobadas.reduce((accumulator, item) => accumulator + item.total, 0)),
          sub: "monto total",
          tone: "blue",
          mono: true,
        },
      ],
      mobileStats: mobileStatsBase.map((item) => ({
        ...item,
        active: atajoEstado === item.key,
      })),
    };
  }, [
    atajoEstado,
    busquedaDiferida,
    clienteFiltro,
    clientesDisponibles,
    cotizaciones,
    estadoFiltro,
    ordenFiltro,
    periodoFiltro,
    totalCount,
  ]);

  const limpiar = () => {
    setAtajoEstado("todos");
    setEstadoFiltro("Todos");
    setClienteFiltro("Todos");
    setPeriodoFiltro("all");
    setOrdenFiltro("updated_desc");
    setBusqueda("");
    setIsFilterPanelOpen(false);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageNumbers = useMemo(
    () => buildPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const pageStart = (currentPage - 1) * PAGE_SIZE;

  useEffect(() => {
    void ensureClientesLoaded();
  }, [ensureClientesLoaded]);

  useEffect(() => {
    setCurrentPage(1);
  }, [atajoEstado, estadoFiltro, clienteFiltro, periodoFiltro, ordenFiltro, busqueda]);

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

  const handleAtajoEstadoSelect = useCallback((key: CotizacionesMobileSummaryKey) => {
    setAtajoEstado(key);

    if (key === "todos") {
      setEstadoFiltro("Todos");
      return;
    }

    if (key === "aprobadas") {
      setEstadoFiltro("Aprobada");
      return;
    }

    if (key === "rechazadas") {
      setEstadoFiltro("Rechazada");
      return;
    }

    setEstadoFiltro("Todos");
  }, []);

  const handlePrefetchDetail = useCallback((id: string) => {
    void prefetchCotizacionById(id);
  }, [prefetchCotizacionById]);

  const visibleRows = useMemo(
    () =>
      filtradas.map((cotizacion) => {
        const meta = ESTADO_META[cotizacion.estado] ?? {
          cls: "stBorrador",
          label: cotizacion.estado,
        };
        const manualResponse = getManualResponseValue(cotizacion.estado);
        const responseMeta =
          manualResponse === "aprobada"
            ? { cls: "stAprobada", label: "Aprobada" }
            : manualResponse === "rechazada"
              ? { cls: "stRechazada", label: "Rechazada" }
              : manualResponse === "terminada"
                ? { cls: "stTerminada", label: "Terminada" }
                : { cls: "stEnviada", label: "Pendiente" };
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
          responseMeta,
          isUpdatingResponse,
          hasWhatsappPhone,
          isSending,
          rowClassName: `${s.tr}${manualResponse !== "pendiente" ? ` ${s.trWithResponse}` : ""}`,
          cardClassName: `${s.cotCard}${manualResponse !== "pendiente" ? ` ${s.cotCardWithResponse}` : ""}`,
          detailHref: `/cotizaciones/${cotizacion.id}`,
          editHref: `/cotizaciones/nueva?edit=${cotizacion.id}`,
          onPrefetchDetail: () => handlePrefetchDetail(cotizacion.id),
          deleteDisabled: isSaving,
        };
      }),
    [filtradas, handlePrefetchDetail, isSaving, responseUpdatingId, sendingId]
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
      await refreshCotizacionesResumen();
      setDeleteCandidate(null);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la cotizacion"
      );
    }
  }, [deleteCandidate, deleteWorkflow, refreshCotizacionesResumen]);

  const handleManualResponseChange = useCallback(async (
    id: string,
    estado: ManualResponseStatus
  ) => {
    try {
      setResponseUpdatingId(id);
      await updateManualResponseStatus(id, estado);
      await refreshCotizacionesResumen();
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setResponseUpdatingId(null);
    }
  }, [refreshCotizacionesResumen, updateManualResponseStatus]);

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

      const approvalUrl = record.approvalToken
        ? buildCotizacionApprovalUrl(record.approvalToken)
        : null;
      const whatsappUrl = buildCotizacionWhatsappUrl(record, { approvalUrl });

      if (!whatsappUrl) {
        throw new Error("No se pudo preparar el enlace de WhatsApp.");
      }

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      await markQuoteAsSent(String(record.id)).catch(() => {
        return null;
      });
      await refreshCotizacionesResumen();
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setSendingId(null);
    }
  }, [cotizaciones, loadCotizacionById, markQuoteAsSent, refreshCotizacionesResumen]);

  if (!isReady || !resumenReady) {
    return (
      <PremiumPageReveal className={s.root}>
        <PremiumPageSection className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuFilePlus2 aria-hidden />
          </div>
          <p className={s.emptyTitle}>Cargando cotizaciones</p>
          <p className={s.emptySub}>
            Estamos preparando tus presupuestos y el resumen comercial.
          </p>
        </PremiumPageSection>
      </PremiumPageReveal>
    );
  }

  return (
    <PremiumPageReveal className={s.root}>
      <PremiumPageSection className={s.header}>
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
          <motion.div
            whileHover={reduceMotion ? undefined : { y: -1 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <Link className={s.btnPrimary} href="/cotizaciones/nueva">
              <LuPlus aria-hidden />
              Nueva cotizacion
            </Link>
          </motion.div>
        </div>
      </PremiumPageSection>

      <PremiumPageSection>
        <CotizacionesMobileSummary
          items={mobileStats}
          onSelect={handleAtajoEstadoSelect}
        />
      </PremiumPageSection>

      <PremiumPageSection className={s.kpiRow}>
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
      </PremiumPageSection>

      <motion.div
        className={s.mobileToolbar}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className={s.searchWrap}>
          <span className={s.searchIcon}>
            <LuSearch aria-hidden />
          </span>
          <input
            className={s.searchInput}
            placeholder="Buscar cliente o codigo"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>
        <button
          className={`${s.filterToggleBtn}${isFilterPanelOpen ? ` ${s.filterToggleBtnActive}` : ""}`}
          type="button"
          onClick={() => setIsFilterPanelOpen((current) => !current)}
          aria-expanded={isFilterPanelOpen}
          aria-pressed={isFilterPanelOpen}
          aria-controls="cotizaciones-mobile-filter-panel"
          aria-label="Mostrar filtros"
        >
          <LuSlidersHorizontal aria-hidden />
        </button>
      </motion.div>

      <PremiumPageSection className={s.filterBar}>
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

        <CotizacionesFilterFields
          estados={ESTADOS}
          clientes={clientes}
          periodos={PERIODOS}
          ordenes={ORDENES}
          estadoFiltro={estadoFiltro}
          clienteFiltro={clienteFiltro}
          periodoFiltro={periodoFiltro}
          ordenFiltro={ordenFiltro}
          onEstadoChange={(value) => {
            setAtajoEstado("todos");
            setEstadoFiltro(value);
          }}
          onClienteChange={setClienteFiltro}
          onPeriodoChange={(value) =>
            setPeriodoFiltro(value as (typeof PERIODOS)[number]["value"])
          }
          onOrdenChange={(value) =>
            setOrdenFiltro(value as (typeof ORDENES)[number]["value"])
          }
          onLimpiar={limpiar}
        />
      </PremiumPageSection>

      <AnimatePresence initial={false}>
        {isFilterPanelOpen ? (
          <motion.div
            id="cotizaciones-mobile-filter-panel"
            data-testid="cotizaciones-mobile-filter-panel"
            className={s.mobileFilterPanel}
            initial={reduceMotion ? false : { opacity: 0, height: 0, y: -6 }}
            animate={reduceMotion ? undefined : { opacity: 1, height: "auto", y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <CotizacionesFilterFields
              estados={ESTADOS}
              clientes={clientes}
              periodos={PERIODOS}
              ordenes={ORDENES}
              estadoFiltro={estadoFiltro}
              clienteFiltro={clienteFiltro}
              periodoFiltro={periodoFiltro}
              ordenFiltro={ordenFiltro}
              onEstadoChange={(value) => {
                setAtajoEstado("todos");
                setEstadoFiltro(value);
              }}
              onClienteChange={setClienteFiltro}
              onPeriodoChange={(value) =>
                setPeriodoFiltro(value as (typeof PERIODOS)[number]["value"])
              }
              onOrdenChange={(value) =>
                setOrdenFiltro(value as (typeof ORDENES)[number]["value"])
              }
              onLimpiar={limpiar}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <PremiumPageSection className={s.resultsBar}>
        <div className={s.resultsSummary}>
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
        <div className={s.resultsCompactMobile}>
          <strong>{filtradas.length} cotizaciones</strong>
          <span>&middot;</span>
          <span>Total {CLP(montoFiltrado)}</span>
        </div>
      </PremiumPageSection>

      {filtradas.length === 0 ? (
        <PremiumPageSection className={s.emptyState}>
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
        </PremiumPageSection>
      ) : (
        <>
          <PremiumPageSection className={s.tableWrap}>
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
                              onPointerEnter={row.onPrefetchDetail}
                              onFocus={row.onPrefetchDetail}
                              onTouchStart={row.onPrefetchDetail}
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
                                title="Enviar link por WhatsApp"
                                aria-label="Enviar link por WhatsApp"
                                data-tooltip="Enviar link por WhatsApp"
                                type="button"
                                disabled={row.isSending}
                              >
                                <span className={s.accionSrOnly}>Enviar link por WhatsApp</span>
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
          </PremiumPageSection>

          <PremiumPageSection className={s.cardList}>
            {visibleRows.map((row, index) => (
              <CotizacionMobileCard key={row.id} row={row} index={index} />
            ))}
          </PremiumPageSection>

          {totalPages > 1 ? (
            <PremiumPageSection className={s.pagination}>
              <span className={s.pagInfo}>
                Mostrando {pageStart + 1} - {Math.min(pageStart + PAGE_SIZE, filtradas.length)} de{" "}
                {totalCount} cotizaciones
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
    </PremiumPageReveal>
  );
}
