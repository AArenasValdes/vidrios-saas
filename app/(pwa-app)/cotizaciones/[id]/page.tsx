"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuCalendarDays,
  LuEye,
  LuMapPin,
  LuPencil,
  LuPhone,
  LuReceiptText,
  LuSave,
  LuTrash2,
} from "react-icons/lu";

import { useCotizacionesStore } from "@/hooks/useCotizacionesStore";
import { formatCotizacionDate } from "@/services/cotizaciones-workflow.service";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";
import { buildCotizacionWhatsappUrl } from "@/utils/whatsapp";

import s from "./page.module.css";

const ESTADO_META: Record<string, { cls: string; label: string }> = {
  aprobada: { cls: "stAprobada", label: "Aprobada" },
  enviada: { cls: "stEnviada", label: "Enviada" },
  borrador: { cls: "stBorrador", label: "Borrador" },
  creada: { cls: "stCreada", label: "Creada" },
  rechazada: { cls: "stRechazada", label: "Rechazada" },
};

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const CLP = (value: number) => clpFormatter.format(value);

function normalizeComparableComponentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isLegacyAutoComponentLabel(tipo: string, descripcion: string) {
  const normalizedDescription = normalizeComparableComponentText(descripcion);
  const normalizedTipo = normalizeComparableComponentText(tipo);

  if (!normalizedDescription || !normalizedTipo) {
    return false;
  }

  const parts = normalizedDescription.split(" ");
  const tipoParts = normalizedTipo.split(" ");

  if (parts.length !== tipoParts.length + 1) {
    return false;
  }

  const trailingCode = parts.at(-1) ?? "";

  if (!/^[a-z]{1,3}\d{1,4}$/.test(trailingCode)) {
    return false;
  }

  const labelWithoutCode = parts.slice(0, -1).join(" ");

  return labelWithoutCode === normalizedTipo;
}

function getVisibleComponentDescription(tipo: string, nombre: string, descripcion: string) {
  const trimmedDescription = descripcion.trim();

  if (!trimmedDescription) {
    return "";
  }

  return (
    normalizeComparableComponentText(trimmedDescription) ===
      normalizeComparableComponentText(nombre) ||
    isLegacyAutoComponentLabel(tipo, trimmedDescription)
  )
    ? ""
    : trimmedDescription;
}

const DETAIL_VIRTUALIZATION_THRESHOLD = 10;
const DETAIL_VIRTUALIZATION_OVERSCAN = 3;
const DETAIL_DEFAULT_ROW_HEIGHT = 234;
const DETAIL_DEFAULT_GAP = 12;

export default function CotizacionDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getCotizacionById, loadCotizacionById, isReady, isSaving, deleteWorkflow } =
    useCotizacionesStore();
  const cotizacion = getCotizacionById(params.id);
  const printUrl = `/print/cotizaciones/${params.id}`;
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(() => !cotizacion);
  const itemListScrollRef = useRef<HTMLDivElement | null>(null);
  const [itemListScrollTop, setItemListScrollTop] = useState(0);
  const [itemListViewportHeight, setItemListViewportHeight] = useState(0);
  const [itemListRowHeight, setItemListRowHeight] = useState(DETAIL_DEFAULT_ROW_HEIGHT);
  const [itemListGap, setItemListGap] = useState(DETAIL_DEFAULT_GAP);

  useEffect(() => {
    let cancelled = false;

    if (!params.id) {
      setIsLoadingItems(false);
      return;
    }

    if (cotizacion && cotizacion.items.length > 0) {
      setIsLoadingItems(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingItems(true);

    void loadCotizacionById(params.id).finally(() => {
      if (!cancelled) {
        setIsLoadingItems(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cotizacion, loadCotizacionById, params.id]);

  useEffect(() => {
    router.prefetch(printUrl);
  }, [printUrl, router]);

  const { status, approvalUrl, whatsappUrl, itemCards } = useMemo(() => {
    if (!cotizacion) {
      return {
        status: ESTADO_META.borrador,
        approvalUrl: null,
        whatsappUrl: null,
        itemCards: [],
      };
    }

    const nextStatus = ESTADO_META[cotizacion.estado] ?? ESTADO_META.borrador;
    const nextApprovalUrl = cotizacion.approvalToken
      ? buildCotizacionApprovalUrl(cotizacion.approvalToken)
      : null;

    return {
      status: nextStatus,
      approvalUrl: nextApprovalUrl,
      whatsappUrl: buildCotizacionWhatsappUrl(cotizacion, { approvalUrl: nextApprovalUrl }),
      itemCards: cotizacion.items.map((item, index) => ({
        id: item.id,
        badge: item.codigo || `I${index + 1}`,
        total: CLP(item.precioTotal),
        nombre: item.nombre,
        descripcion: getVisibleComponentDescription(item.tipo, item.nombre, item.descripcion),
        meta: [
          item.tipo,
          item.ancho && item.alto ? `${item.ancho} x ${item.alto} mm` : null,
          `${item.cantidad} ud.`,
        ]
          .filter(Boolean)
          .join(" - "),
        costoProveedor: CLP(item.costoProveedorTotal),
        utilidad: CLP(item.precioTotal - item.costoProveedorTotal),
        margen: `${item.margenPct}%`,
        venta: CLP(item.precioTotal),
      })),
    };
  }, [cotizacion]);

  const shouldVirtualizeItemList =
    !isLoadingItems && itemCards.length >= DETAIL_VIRTUALIZATION_THRESHOLD;

  const handleItemCardMeasure = useCallback((node: HTMLElement | null) => {
    if (!node || typeof window === "undefined") {
      return;
    }

    const nextRowHeight = node.getBoundingClientRect().height;
    if (nextRowHeight > 0) {
      setItemListRowHeight(nextRowHeight);
    }

    const parentStyles = window.getComputedStyle(node.parentElement ?? node);
    const nextGap =
      Number.parseFloat(parentStyles.rowGap || "") ||
      Number.parseFloat(parentStyles.gap || "") ||
      DETAIL_DEFAULT_GAP;

    if (Number.isFinite(nextGap) && nextGap >= 0) {
      setItemListGap(nextGap);
    }
  }, []);

  useEffect(() => {
    if (!shouldVirtualizeItemList) {
      setItemListScrollTop(0);
      setItemListViewportHeight(0);
      return;
    }

    const scrollNode = itemListScrollRef.current;
    if (!scrollNode) {
      return;
    }

    const syncMetrics = () => {
      setItemListScrollTop(scrollNode.scrollTop);
      setItemListViewportHeight(scrollNode.clientHeight);
    };

    syncMetrics();
    scrollNode.addEventListener("scroll", syncMetrics, { passive: true });

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncMetrics);
      resizeObserver.observe(scrollNode);
    } else {
      window.addEventListener("resize", syncMetrics);
    }

    return () => {
      scrollNode.removeEventListener("scroll", syncMetrics);
      resizeObserver?.disconnect();
      if (!resizeObserver) {
        window.removeEventListener("resize", syncMetrics);
      }
    };
  }, [shouldVirtualizeItemList]);

  const visibleItemCardsState = useMemo(() => {
    if (!shouldVirtualizeItemList) {
      return {
        cards: itemCards,
        paddingTop: 0,
        paddingBottom: 0,
        startIndex: 0,
      };
    }

    const rowSpan = Math.max(1, itemListRowHeight + itemListGap);
    const viewportHeight = Math.max(itemListViewportHeight, rowSpan);
    const startIndex = Math.max(
      0,
      Math.floor(itemListScrollTop / rowSpan) - DETAIL_VIRTUALIZATION_OVERSCAN
    );
    const visibleCount = Math.min(
      itemCards.length - startIndex,
      Math.ceil(viewportHeight / rowSpan) + DETAIL_VIRTUALIZATION_OVERSCAN * 2
    );
    const endIndex = startIndex + visibleCount;
    const remainingCount = Math.max(0, itemCards.length - endIndex);

    return {
      cards: itemCards.slice(startIndex, endIndex),
      paddingTop: startIndex * rowSpan,
      paddingBottom: remainingCount * rowSpan,
      startIndex,
    };
  }, [
    itemCards,
    itemListGap,
    itemListRowHeight,
    itemListScrollTop,
    itemListViewportHeight,
    shouldVirtualizeItemList,
  ]);

  if (isReady && !cotizacion) {
    return (
      <div className={s.root}>
        <div className={s.header}>
          <div>
            <Link href="/cotizaciones" className={s.backLink}>
              <LuArrowLeft aria-hidden />
              Volver a cotizaciones
            </Link>
            <h1 className={s.title}>Cotizacion no encontrada</h1>
            <p className={s.subtitle}>No existe una cotizacion guardada con ese identificador.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className={s.root}>
        <section className={s.mainCard}>
          <div className={s.itemsLoadingState}>
            <span className={s.loadingSpinner} aria-hidden />
            <div>
              <strong>Cargando cotizacion</strong>
              <p>Estamos trayendo el detalle completo del presupuesto y sus componentes.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Vas a eliminar la cotizacion ${cotizacion.codigo}. Desaparecera del sistema operativo de la app.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteWorkflow(cotizacion.id);
      router.push("/cotizaciones");
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "No se pudo eliminar la cotizacion"
      );
    }
  };

  const handleOpenPdf = async () => {
    try {
      setIsPreparingPdf(true);

      if (cotizacion.items.length === 0) {
        await loadCotizacionById(cotizacion.id);
      }

      router.push(printUrl);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "No se pudo abrir la vista final del PDF"
      );
    } finally {
      setIsPreparingPdf(false);
    }
  };

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <Link href="/cotizaciones" className={s.backLink}>
            <LuArrowLeft aria-hidden />
            Volver a cotizaciones
          </Link>
          <h1 className={s.title}>{cotizacion.codigo}</h1>
          <p className={s.subtitle}>
            Vista operativa del presupuesto. Puedes revisar componentes, precios y volver a
            emitirlo cuando sea necesario.
          </p>
        </div>

        <div className={s.headerActionsWrap}>
          <div className={s.headerActions}>
            <button
              className={s.btnGhost}
              onClick={() => void handleOpenPdf()}
              type="button"
              disabled={isPreparingPdf}
            >
              <LuEye aria-hidden />
              {isPreparingPdf
                ? "Preparando PDF..."
                : "Abrir visor PDF"}
            </button>
            {whatsappUrl ? (
              <Link className={s.btnGhost} href={whatsappUrl} rel="noreferrer" target="_blank">
                <LuPhone aria-hidden />
                WhatsApp
              </Link>
            ) : (
              <button className={`${s.btnGhost} ${s.btnDisabled}`} type="button" disabled>
                <LuPhone aria-hidden />
                WhatsApp
              </button>
            )}
            <Link className={s.btnPrimary} href={`/cotizaciones/nueva?edit=${cotizacion.id}`}>
              <LuPencil aria-hidden />
              Editar cotizacion
            </Link>
            <button
              className={s.btnDanger}
              onClick={() => void handleDelete()}
              type="button"
              disabled={isSaving}
            >
              <LuTrash2 aria-hidden />
              Eliminar cotizacion
            </button>
          </div>
        </div>
      </div>

      <div className={s.topGrid}>
        <section className={s.heroCard}>
          <div className={s.heroHeader}>
            <div>
              <span className={s.eyebrow}>Cliente</span>
              <h2>{cotizacion.clienteNombre}</h2>
            </div>
            <span className={`${s.badge} ${s[status.cls]}`}>{status.label}</span>
          </div>

          <div className={s.metaGrid}>
            <div className={s.metaCard}>
              <LuPhone aria-hidden />
              <div>
                <span>Telefono</span>
                <strong>{cotizacion.clienteTelefono || "Sin telefono"}</strong>
              </div>
            </div>
            <div className={s.metaCard}>
              <LuMapPin aria-hidden />
              <div>
                <span>Direccion</span>
                <strong>{cotizacion.direccion || "Sin direccion"}</strong>
              </div>
            </div>
            <div className={s.metaCard}>
              <LuCalendarDays aria-hidden />
              <div>
                <span>Ultima actualizacion</span>
                <strong>{formatCotizacionDate(cotizacion.updatedAt)}</strong>
              </div>
            </div>
            <div className={s.metaCard}>
              <LuSave aria-hidden />
              <div>
                <span>Validez</span>
                <strong>{cotizacion.validez}</strong>
              </div>
            </div>
          </div>
        </section>

        <aside className={s.sideCard}>
          <div className={s.sideTitle}>Resumen comercial</div>
          <div className={s.sideRow}>
            <span>Obra</span>
            <strong>{cotizacion.obra}</strong>
          </div>
          <div className={s.sideRow}>
            <span>Componentes</span>
            <strong>{cotizacion.items.length}</strong>
          </div>
          <div className={s.sideRow}>
            <span>Neto</span>
            <strong>{CLP(cotizacion.neto)}</strong>
          </div>
          <div className={s.sideRow}>
            <span>IVA</span>
            <strong>{CLP(cotizacion.iva)}</strong>
          </div>
          <div className={s.sideRow}>
            <span>Cliente vio</span>
            <strong>
              {cotizacion.clienteVioEn ? formatCotizacionDate(cotizacion.clienteVioEn) : "Pendiente"}
            </strong>
          </div>
          <div className={s.sideRow}>
            <span>Respuesta cliente</span>
            <strong>
              {cotizacion.clienteRespondioEn
                ? `${status.label} · ${formatCotizacionDate(cotizacion.clienteRespondioEn)}`
                : "Sin respuesta"}
            </strong>
          </div>
          <div className={s.sideTotal}>
            <span>Total</span>
            <strong>{CLP(cotizacion.total)}</strong>
          </div>
        </aside>
      </div>

      <div className={s.layout}>
        <section className={s.mainCard}>
          <div className={s.sectionHeader}>
            <div>
              <span className={s.eyebrow}>Componentes</span>
              <h3>Detalle del presupuesto</h3>
            </div>
            <Link
              href={`/cotizaciones/nueva?edit=${cotizacion.id}&step=2`}
              className={s.inlineAction}
            >
              <LuPencil aria-hidden />
              Corregir componentes
            </Link>
          </div>

          <div className={s.itemListScroll} ref={itemListScrollRef}>
            <div className={s.itemList}>
              {isLoadingItems ? (
                <div className={s.itemsLoadingState}>
                  <span className={s.loadingSpinner} aria-hidden />
                  <div>
                    <strong>Cargando componentes</strong>
                    <p>Estamos armando el detalle del presupuesto para que puedas revisarlo.</p>
                  </div>
                </div>
              ) : cotizacion.items.length === 0 ? (
                <div className={s.itemsLoadingState}>
                  <div>
                    <strong>No hay componentes cargados</strong>
                    <p>Esta cotizacion no tiene items visibles todavia o necesita ser corregida.</p>
                  </div>
                </div>
              ) : (
                <>
                  {shouldVirtualizeItemList && visibleItemCardsState.paddingTop > 0 ? (
                    <div
                      className={s.itemListVirtualSpacer}
                      style={{ height: `${visibleItemCardsState.paddingTop}px` }}
                      aria-hidden
                    />
                  ) : null}

                  <div className={s.itemListCards}>
                    {visibleItemCardsState.cards.map((item, index) => (
                      <article
                        key={item.id}
                        className={s.itemCard}
                        ref={
                          shouldVirtualizeItemList && index === 0 ? handleItemCardMeasure : undefined
                        }
                      >
                        <div className={s.itemTop}>
                          <span className={s.itemBadge}>{item.badge}</span>
                          <strong>{item.total}</strong>
                        </div>
                        <h4>{item.nombre}</h4>
                        {item.descripcion ? <p>{item.descripcion}</p> : null}
                        <p>{item.meta}</p>
                        <div className={s.itemFinance}>
                          <div className={s.itemFinanceTitle}>Resumen interno</div>
                          <div className={s.itemFinanceGrid}>
                            <div className={s.itemFinanceCell}>
                              <span>Costo proveedor</span>
                              <strong>{item.costoProveedor}</strong>
                            </div>
                            <div className={s.itemFinanceCell}>
                              <span>Utilidad</span>
                              <strong>{item.utilidad}</strong>
                            </div>
                            <div className={s.itemFinanceCell}>
                              <span>Margen</span>
                              <strong>{item.margen}</strong>
                            </div>
                            <div className={s.itemFinanceCell}>
                              <span>Venta</span>
                              <strong>{item.venta}</strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  {shouldVirtualizeItemList && visibleItemCardsState.paddingBottom > 0 ? (
                    <div
                      className={s.itemListVirtualSpacer}
                      style={{ height: `${visibleItemCardsState.paddingBottom}px` }}
                      aria-hidden
                    />
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>

        <aside className={s.mainCard}>
          <div className={s.sectionHeader}>
            <div>
              <span className={s.eyebrow}>Condiciones</span>
              <h3>Observaciones y cierre</h3>
            </div>
          </div>

          <div className={s.noteCard}>
            <LuReceiptText aria-hidden />
            <p>{cotizacion.observaciones || "Sin observaciones registradas todavia."}</p>
          </div>

          <div className={s.summaryAdjustmentCard}>
            <div className={s.summaryAdjustmentHeader}>
              <div>
                <span className={s.summaryAdjustmentEyebrow}>Ajuste final</span>
                <strong>Flete opcional</strong>
              </div>
              <span className={s.summaryAdjustmentValue}>
                {cotizacion.flete > 0 ? CLP(cotizacion.flete) : "No incluido"}
              </span>
            </div>
            <p className={s.summaryAdjustmentHelp}>
              Se suma al total final y solo aparece en el PDF cuando es mayor a 0.
            </p>
          </div>

          <div className={s.totalsCard}>
            <div className={s.totalRow}>
              <span>Subtotal</span>
              <strong>{CLP(cotizacion.subtotal)}</strong>
            </div>
            <div className={s.totalRow}>
              <span>Descuento</span>
              <strong>- {CLP(cotizacion.descuentoValor)}</strong>
            </div>
            <div className={s.totalRow}>
              <span>IVA</span>
              <strong>{CLP(cotizacion.iva)}</strong>
            </div>
            {cotizacion.flete > 0 ? (
              <div className={s.totalRow}>
                <span>Flete</span>
                <strong>{CLP(cotizacion.flete)}</strong>
              </div>
            ) : null}
            <div className={s.totalStrong}>
              <span>Total</span>
              <strong>{CLP(cotizacion.total)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
