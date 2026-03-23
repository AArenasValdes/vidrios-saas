"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuDownload, LuPrinter, LuShare2 } from "react-icons/lu";

import { useCotizacionesStore } from "@/hooks/useCotizacionesStore";
import { useOrganizationProfile } from "@/hooks/useOrganizationProfile";
import { formatCotizacionDate } from "@/services/cotizaciones-workflow.service";
import { resolveOrganizationProfile } from "@/services/organization-profile.service";
import {
  buildCotizacionPdfFileName,
  downloadPdfBlob,
  exportCotizacionElementToPdf,
  formatCotizacionPdfError,
  requiresPdfOpenFallback,
  shareCotizacionPdf,
} from "@/utils/cotizacion-pdf";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { getCotizacionShareExperience } from "@/utils/share-capabilities";
import { buildCotizacionWhatsappMessage, buildCotizacionWhatsappUrl } from "@/utils/whatsapp";
import { generateComponentSVG } from "@/utils/window-drawings";
import type { CotizacionWorkflowItem } from "@/types/cotizacion-workflow";

import s from "./page.module.css";

const FIRST_PAGE_COMPONENTS = 2;
const NEXT_PAGE_COMPONENTS = 3;
const APP_NAME = "Vidrios SaaS";
const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const CLP = (value: number) => clpFormatter.format(value);

const COLOR_NAMES: Record<string, string> = {
  "#a8a8a8": "Aluminio natural",
  "#f0eeeb": "Blanco",
  "#dfd5c4": "Blanco hueso",
  "#2a2a2a": "Negro",
  "#444444": "Negro mate",
  "#b87333": "Bronce",
};

type PrintPagePlan =
  | {
      kind: "cover";
      startIndex: number;
      items: CotizacionWorkflowItem[];
    }
  | {
      kind: "components";
      startIndex: number;
      items: CotizacionWorkflowItem[];
    };

type ItemPresentation = {
  colorHex: string;
  material: string;
  referencia: string;
  colorName: string;
  surface: string;
  specs: Array<{ key: string; value: string }>;
  drawingSvg: string;
};

function getColorName(colorHex: string) {
  return COLOR_NAMES[colorHex.toLowerCase()] ?? "Color a definir";
}

function formatDimensions(ancho: number | null, alto: number | null) {
  if (!ancho || !alto) {
    return "Por definir";
  }

  return `${ancho} x ${alto} mm`;
}

function formatSurface(ancho: number | null, alto: number | null, cantidad: number) {
  if (!ancho || !alto) {
    return "-";
  }

  const totalM2 = (ancho * alto * cantidad) / 1_000_000;
  return `${totalM2.toFixed(2)} m2 aprox.`;
}

function chunkItems<T>(items: T[], chunkSize: number) {
  if (items.length === 0) {
    return [] as T[][];
  }

  const groups: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    groups.push(items.slice(index, index + chunkSize));
  }

  return groups;
}

function formatPageNumber(current: number, total: number) {
  return `${String(current).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
}

function formatDueDate(baseDateValue: string, validez: string) {
  const baseDate = new Date(baseDateValue);

  if (Number.isNaN(baseDate.getTime())) {
    return "Por definir";
  }

  const normalized = validez.trim().toLowerCase();
  const rawDays = Number.parseInt(normalized, 10);
  const days =
    normalized.includes("30") ? 30 : normalized.includes("7") ? 7 : rawDays || 15;

  baseDate.setDate(baseDate.getDate() + days);

  return formatCotizacionDate(baseDate.toISOString());
}

function buildPrintPlan(items: CotizacionWorkflowItem[]): PrintPagePlan[] {
  const firstItems = items.slice(0, Math.min(items.length, FIRST_PAGE_COMPONENTS));
  const remainingItems = items.slice(firstItems.length);
  const remainingPages = chunkItems(remainingItems, NEXT_PAGE_COMPONENTS);
  const pages: PrintPagePlan[] = [
    {
      kind: "cover",
      startIndex: 0,
      items: Array.from(firstItems),
    },
  ];

  let startIndex = firstItems.length;

  remainingPages.forEach((group) => {
    pages.push({
      kind: "components",
      startIndex,
      items: group,
    });
    startIndex += group.length;
  });

  return pages;
}

function ClientField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={s.clientField}>
      <span className={s.clientBullet} aria-hidden />
      <div className={s.clientFieldBody}>
        <span className={s.clientLabel}>{label}</span>
        <strong className={s.clientValue}>{value || "Por definir"}</strong>
      </div>
    </div>
  );
}

export default function CotizacionPrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { getCotizacionById, loadCotizacionById, isReady } = useCotizacionesStore();
  const { profile: rawOrganizationProfile, isReady: isProfileReady } = useOrganizationProfile();
  const cotizacion = getCotizacionById(params.id);
  const hasRenderableRecord = Boolean(cotizacion && cotizacion.items.length > 0);
  const hasRenderedViewerRef = useRef(hasRenderableRecord);
  const lastRenderableCotizacionRef = useRef(cotizacion);
  const sheetViewportRef = useRef<HTMLDivElement | null>(null);
  const sheetScaleFrameRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const buildPdfPromiseRef = useRef<Promise<{ blob: Blob; file: File }> | null>(null);
  const prewarmedCacheKeyRef = useRef<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isHydratingRecord, setIsHydratingRecord] = useState(!hasRenderableRecord);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [sheetPreviewScale, setSheetPreviewScale] = useState(1);
  const [sheetPreviewWidth, setSheetPreviewWidth] = useState(0);
  const [sheetPreviewHeight, setSheetPreviewHeight] = useState(0);
  const [shareExperience] = useState(getCotizacionShareExperience);

  useEffect(() => {
    let isCancelled = false;

    async function ensureFullRecord() {
      if (!params.id) {
        return;
      }

      if (cotizacion && cotizacion.items.length > 0) {
        setIsHydratingRecord(false);
        return;
      }

      setIsHydratingRecord(true);

      try {
        await loadCotizacionById(params.id);
      } finally {
        if (!isCancelled) {
          setIsHydratingRecord(false);
        }
      }
    }

    void ensureFullRecord();

    return () => {
      isCancelled = true;
    };
  }, [cotizacion, loadCotizacionById, params.id]);

  useEffect(() => {
    if (cotizacion && cotizacion.items.length > 0) {
      lastRenderableCotizacionRef.current = cotizacion;
      hasRenderedViewerRef.current = true;
    }
  }, [cotizacion]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      return;
    }

    const viewportNode = sheetViewportRef.current;
    const sheetNode = sheetRef.current;

    if (!viewportNode || !sheetNode) {
      return;
    }

    const updatePreviewMetrics = () => {
      const nextWidth = sheetNode.scrollWidth;
      const nextHeight = sheetNode.scrollHeight;
      const availableWidth = viewportNode.clientWidth;

      if (!nextWidth || !nextHeight || !availableWidth) {
        return;
      }

      setSheetPreviewWidth(nextWidth);
      setSheetPreviewHeight(nextHeight);
      setSheetPreviewScale(Math.min(1, Math.max(0.42, availableWidth / nextWidth)));
    };

    updatePreviewMetrics();

    const observer = new ResizeObserver(() => {
      updatePreviewMetrics();
    });

    observer.observe(viewportNode);
    observer.observe(sheetNode);
    window.addEventListener("resize", updatePreviewMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePreviewMetrics);
    };
  }, [cotizacion, isHydratingRecord, isProfileReady]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const syncViewport = () => {
      setIsCompactViewport(mediaQuery.matches);
    };

    syncViewport();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => {
        mediaQuery.removeEventListener("change", syncViewport);
      };
    }

    mediaQuery.addListener(syncViewport);

    return () => {
      mediaQuery.removeListener(syncViewport);
    };
  }, []);

  const organizationProfile = resolveOrganizationProfile(
    rawOrganizationProfile?.organizationId ?? null,
    rawOrganizationProfile
  );
  const visibleCotizacion = cotizacion ?? lastRenderableCotizacionRef.current;

  const pageStyle = {
    "--brand": organizationProfile.brandColor,
    "--carbon": "#111827",
  } as CSSProperties;

  const exportFileName = visibleCotizacion ? buildCotizacionPdfFileName(visibleCotizacion) : "cotizacion.pdf";
  const pdfCacheKey = visibleCotizacion
    ? `${visibleCotizacion.id}:${visibleCotizacion.updatedAt}:${organizationProfile.brandColor}`
    : null;
  const approvalUrl =
    visibleCotizacion?.approvalToken ? buildCotizacionApprovalUrl(visibleCotizacion.approvalToken) : null;
  const whatsappMessage = visibleCotizacion
    ? buildCotizacionWhatsappMessage(visibleCotizacion, { approvalUrl })
    : "";
  const whatsappUrl = visibleCotizacion
    ? buildCotizacionWhatsappUrl(visibleCotizacion, { approvalUrl })
    : null;
  const shareIntent = searchParams.get("intent");
  const previewMode = searchParams.get("preview");
  const fromWizard = searchParams.get("from") === "wizard";
  const wasJustCreated = searchParams.get("created") === "1";
  const isEmbeddedPreview = previewMode === "embed";
  const shouldWarmPdf = shareIntent === "warm";
  const isAppleMobile =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const shareHintText =
    shareIntent === "whatsapp"
      ? "En celular, toca el boton 'Compartir por WhatsApp' de arriba. Si WhatsApp no acepta el adjunto, enviaremos el mensaje con un enlace directo al PDF."
      : isAppleMobile
        ? "En iPhone, el boton abre el archivo PDF para que luego puedas guardarlo o compartirlo desde Safari."
        : shareExperience.helperText;
  const companyAddressLine = [
    organizationProfile.empresaDireccion,
    organizationProfile.empresaTelefono,
    organizationProfile.empresaEmail,
  ]
    .filter(Boolean)
    .join(" | ");
  const paymentTerms = organizationProfile.formaPago.trim();

  const { printPages, totalSurfaceM2 } = useMemo(() => {
    const items = visibleCotizacion?.items ?? [];
    const nextPrintPages = buildPrintPlan(items);
    const nextTotalSurfaceM2 = items.reduce((accumulator, item) => {
      if (item.areaM2 !== null) {
        return accumulator + item.areaM2 * item.cantidad;
      }

      if (item.ancho && item.alto) {
        return accumulator + (item.ancho * item.alto * item.cantidad) / 1_000_000;
      }

      return accumulator;
    }, 0);

    return {
      printPages: nextPrintPages,
      totalSurfaceM2: nextTotalSurfaceM2,
    };
  }, [visibleCotizacion?.items]);
  const itemPresentationMap = useMemo(() => {
    const map = new Map<string, ItemPresentation>();

    for (const item of visibleCotizacion?.items ?? []) {
      const { colorHex, material, referencia } = decodeCotizacionItemPresentationMeta(
        item.observaciones
      );
      const colorName = getColorName(colorHex);
      const surface = formatSurface(item.ancho, item.alto, item.cantidad);
      map.set(item.id, {
        colorHex,
        material,
        referencia,
        colorName,
        surface,
        specs: [
          { key: "Dimensiones", value: formatDimensions(item.ancho, item.alto) },
          { key: "Material", value: material },
          { key: "Color", value: colorName },
          { key: "Referencia", value: referencia || "-" },
          { key: "Vidrio", value: item.vidrio || "-" },
          { key: "Superficie", value: surface },
        ],
        drawingSvg: generateComponentSVG({
          tipo: item.tipo,
          ancho: item.ancho,
          alto: item.alto,
          colorHex,
          maxW: 108,
          maxH: 94,
          variant: "pdf",
        }),
      });
    }

    return map;
  }, [visibleCotizacion?.items]);

  const buildPdfFile = useCallback(async () => {
    if (buildPdfPromiseRef.current) {
      return buildPdfPromiseRef.current;
    }

    if (!sheetRef.current || !visibleCotizacion) {
      throw new Error("La cotizacion aun no esta lista para exportar");
    }

    buildPdfPromiseRef.current = (async () => {
      sheetRef.current?.classList.add(s.sheetExporting);

      try {
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(() => resolve())
          )
        );

        if (
          isHydratingRecord ||
          !isProfileReady ||
          printPages.length === 0
        ) {
          throw new Error("El presupuesto todavia se esta preparando. Intenta de nuevo en unos segundos.");
        }

        const sourceSheet = sheetRef.current;

        if (!sourceSheet) {
          throw new Error("La hoja de impresion ya no esta disponible para exportar");
        }

        return exportCotizacionElementToPdf({
          element: sourceSheet,
          fileName: exportFileName,
          pageSelector: `.${s.pdfPage}`,
          format: "legal",
          cacheKey: pdfCacheKey ?? undefined,
        });
      } finally {
        sheetRef.current?.classList.remove(s.sheetExporting);
        buildPdfPromiseRef.current = null;
      }
    })();

    return buildPdfPromiseRef.current;
  }, [
    visibleCotizacion,
    exportFileName,
    isHydratingRecord,
    isProfileReady,
    pdfCacheKey,
    printPages.length,
  ]);

  useEffect(() => {
    if (
      !shouldWarmPdf ||
      !pdfCacheKey ||
      prewarmedCacheKeyRef.current === pdfCacheKey ||
      isHydratingRecord ||
      !isProfileReady ||
      !sheetRef.current ||
      printPages.length === 0
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      prewarmedCacheKeyRef.current = pdfCacheKey;
      void buildPdfFile().catch(() => {
        prewarmedCacheKeyRef.current = null;
      });
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    buildPdfFile,
    isHydratingRecord,
    isProfileReady,
    pdfCacheKey,
    printPages.length,
    shouldWarmPdf,
  ]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      const { blob } = await buildPdfFile();
      const downloadResult = downloadPdfBlob(blob, exportFileName);

      if (downloadResult === "failed") {
        setExportError(
          "No pudimos abrir el PDF en este telefono. Intenta nuevamente y, si sigue fallando, usa Compartir por WhatsApp para abrir el archivo final."
        );
      } else if (
        downloadResult !== "downloaded" &&
        typeof navigator !== "undefined" &&
        requiresPdfOpenFallback(navigator.userAgent)
      ) {
        setExportError(
          "En iPhone abrimos el archivo PDF para que lo guardes o compartas usando las opciones del navegador."
        );
      }
    } catch (error) {
      setExportError(formatCotizacionPdfError(error));
    } finally {
      setIsExporting(false);
    }
  }, [buildPdfFile, exportFileName]);

  const handleWhatsappShare = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      const { blob, file } = await buildPdfFile();
      const shareText = visibleCotizacion
        ? buildCotizacionWhatsappMessage(visibleCotizacion, {
            approvalUrl,
          })
        : whatsappMessage;
      const shared = await shareCotizacionPdf({
        file,
        title: visibleCotizacion?.codigo ?? "Cotizacion",
        text: shareText,
      });

      if (!shared) {
        downloadPdfBlob(blob, exportFileName);

        const fallbackWhatsappUrl = visibleCotizacion
          ? buildCotizacionWhatsappUrl(visibleCotizacion, {
            approvalUrl,
            })
          : whatsappUrl;

        if (fallbackWhatsappUrl) {
          window.open(fallbackWhatsappUrl, "_blank", "noopener,noreferrer");
        }

        setExportError(
          "Tu navegador no pudo adjuntar el PDF directo a WhatsApp. Dejamos el archivo abierto o descargado y abrimos el mensaje como respaldo."
        );
      }
    } catch (error) {
      setExportError(formatCotizacionPdfError(error));
    } finally {
      setIsExporting(false);
    }
  }, [
    approvalUrl,
    buildPdfFile,
    visibleCotizacion,
    visibleCotizacion?.codigo,
    exportFileName,
    whatsappMessage,
    whatsappUrl,
  ]);

  if (isReady && !visibleCotizacion && !isHydratingRecord) {
    return (
      <main className={s.page}>
        <div className={s.toolbar}>
          <Link className={s.actionSecondary} href="/cotizaciones">
            <LuArrowLeft aria-hidden />
            Volver a cotizaciones
          </Link>
        </div>

        <section className={s.emptySheet}>
          <h1 className={s.emptyTitle}>Cotizacion no encontrada</h1>
          <p className={s.emptyText}>
            No existe una cotizacion disponible para imprimir con ese identificador.
          </p>
        </section>
      </main>
    );
  }

  if (!visibleCotizacion || (isHydratingRecord && !hasRenderedViewerRef.current) || (!isProfileReady && !hasRenderedViewerRef.current)) {
    return (
      <main className={s.page} style={pageStyle}>
        <div className={s.toolbar}>
          <Link className={s.actionSecondary} href={fromWizard ? "/cotizaciones" : `/cotizaciones/${params.id}`}>
            <LuArrowLeft aria-hidden />
            {fromWizard ? "Volver a cotizaciones" : "Volver al detalle"}
          </Link>
        </div>

        <section className={s.viewerLoadingShell}>
          <div className={s.loadingHero}>
            <div className={s.loadingBrand}>
            <div className={s.loadingLogoWrap}>
              {organizationProfile.empresaLogoUrl ? (
               // El componente Image de Next.js no soporta bien la generación de PDF, ya que no se renderiza en el canvas. Por eso usamos la etiqueta img nativa del HTML para mostrar el logo en el PDF exportado, y dejamos el componente Image para la vista previa en pantalla, donde sí puede optimizar la carga.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={organizationProfile.empresaNombre}
                  className={s.loadingLogo}
                  loading="eager"
                  src={organizationProfile.empresaLogoUrl}
                />
              ) : (
                <div className={s.companyLogoFallback}>
                  {organizationProfile.empresaNombre.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className={s.loadingBrandText}>
              <strong>{organizationProfile.empresaNombre}</strong>
              <span>{visibleCotizacion?.codigo ?? "Preparando cotizacion"}</span>
            </div>
          </div>
            <div className={s.loadingHeroBody}>
              <div className={s.loadingPulse} aria-hidden />
              <div className={s.loadingCopy}>
                <h1 className={s.emptyTitle}>Preparando visor PDF</h1>
                <p className={s.emptyText}>
                  Estamos ordenando la hoja final para que aparezca completa y lista para compartir.
                </p>
              </div>
            </div>
          </div>

          <div className={s.loadingPreviewCard} aria-hidden>
            <div className={s.loadingPreviewBar} />
            <div className={s.loadingPreviewGrid}>
              <div className={s.loadingPreviewBlock} />
              <div className={s.loadingPreviewBlock} />
              <div className={s.loadingPreviewWide} />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={s.page} style={pageStyle}>
      {isEmbeddedPreview ? null : (
        <div className={s.toolbar}>
          <Link className={s.actionSecondary} href={fromWizard ? "/cotizaciones" : `/cotizaciones/${visibleCotizacion.id}`}>
            <LuArrowLeft aria-hidden />
            {fromWizard ? "Volver a cotizaciones" : "Volver al detalle"}
          </Link>

          <div className={s.toolbarActions}>
            <button
              className={s.actionSecondary}
              onClick={() => window.print()}
              type="button"
              disabled={isExporting}
            >
              <LuPrinter aria-hidden />
              Imprimir
            </button>
            <button
              className={s.actionSecondary}
              onClick={() => void handleWhatsappShare()}
              type="button"
              disabled={isExporting}
            >
              <LuShare2 aria-hidden />
              {shareExperience.actionLabel}
            </button>
            <button
              className={s.actionPrimary}
              onClick={() => void handleDownloadPdf()}
              type="button"
              disabled={isExporting}
            >
              <LuDownload aria-hidden />
              {isExporting
                ? "Generando PDF..."
                : isAppleMobile
                  ? "Guardar / compartir PDF"
                  : "Descargar PDF"}
            </button>
          </div>
        </div>
      )}

      {isEmbeddedPreview || !wasJustCreated ? null : (
        <div className={s.successTicket}>
          <strong>Cotizacion creada</strong>
          <span>
            Ya puedes compartirla por WhatsApp, imprimirla o guardar el PDF. Si luego quieres revisar precios y componentes,
            vuelve a tus cotizaciones.
          </span>
        </div>
      )}
      {isEmbeddedPreview ? null : exportError ? <div className={s.notice}>{exportError}</div> : null}
      {isEmbeddedPreview ? null : <div className={s.shareHint}>{shareHintText}</div>}

      <div
        ref={sheetViewportRef}
        className={s.sheetViewport}
        style={{
          height:
            sheetPreviewWidth > 0 && sheetPreviewHeight > 0
              ? `${Math.round(sheetPreviewHeight * sheetPreviewScale)}px`
              : undefined,
        }}
      >
        <div
          ref={sheetScaleFrameRef}
          className={s.sheetScaleFrame}
          style={{
            width: sheetPreviewWidth > 0 ? `${sheetPreviewWidth}px` : undefined,
            height: sheetPreviewHeight > 0 ? `${sheetPreviewHeight}px` : undefined,
            transform: `scale(${sheetPreviewScale})`,
            transformOrigin: "top left",
          }}
        >
          <section ref={sheetRef} className={s.sheet}>
            {printPages.map((pagePlan, pageIndex) => {
          const totalPages = printPages.length;
          const pageNumber = pageIndex + 1;
          const isLastPage = pageIndex === totalPages - 1;
          const dueDate = formatDueDate(visibleCotizacion.updatedAt, visibleCotizacion.validez);

          return (
            <article key={`${pagePlan.kind}-${pageNumber}`} className={s.pdfPage}>
              <div className={s.softwareSignature}>
                <span className={s.softwareSignaturePrefix}>Powered by</span>
                <strong className={s.softwareSignatureName}>{APP_NAME}</strong>
                <span className={s.softwareSignatureVersion}>v2.0</span>
              </div>

              <header className={s.pageHeader}>
                <div className={s.companyBlock}>
                  <div className={s.companyLogoWrap}>
                    {organizationProfile.empresaLogoUrl ? (
                     /// El componente Image de Next.js no soporta bien la generación de PDF, ya que no se renderiza en el canvas. Por eso usamos la etiqueta img nativa del HTML para mostrar el logo en el PDF exportado, y dejamos el componente Image para la vista previa en pantalla, donde sí puede optimizar la carga.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={organizationProfile.empresaNombre}
                        className={s.companyLogo}
                        loading="eager"
                        src={organizationProfile.empresaLogoUrl}
                      />
                    ) : (
                      <div className={s.companyLogoFallback}>
                        {organizationProfile.empresaNombre.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className={s.companyMeta}>
                    <strong className={s.companyName}>{organizationProfile.empresaNombre}</strong>
                    <span className={s.companyAddress}>
                      {companyAddressLine || "Perfil comercial aun no configurado"}
                    </span>
                  </div>
                </div>

                <div className={s.quoteMeta}>
                  <span className={s.quoteMetaDate}>Creada {formatCotizacionDate(visibleCotizacion.updatedAt)}</span>
                  <span className={s.quoteMetaDue}>Vence {dueDate}</span>
                  <strong>{visibleCotizacion.codigo}</strong>
                </div>
              </header>

              {pagePlan.kind === "cover" ? (
                <section className={s.clientPanel}>
                  <div className={s.clientPanelHeader}>
                    <span className={s.sectionLabel}>DATOS DEL CLIENTE</span>
                  </div>

                  <div className={s.clientGrid}>
                    <ClientField label="Cliente" value={visibleCotizacion.clienteNombre} />
                    <ClientField label="Obra" value={visibleCotizacion.obra} />
                    <ClientField label="Version" value={visibleCotizacion.codigo} />
                    <ClientField label="Fecha" value={formatCotizacionDate(visibleCotizacion.updatedAt)} />
                  </div>
                </section>
              ) : null}

              <section className={s.detailHeading}>
                <span className={s.detailLabel}>COMPONENTES COTIZADOS · OFERTA CLIENTE</span>
              </section>

              <div className={s.componentList}>
                {pagePlan.items.map((item, itemIndex) => {
                  const absoluteIndex = pagePlan.startIndex + itemIndex + 1;
                  const presentation = itemPresentationMap.get(item.id);
                  const componentCode = item.codigo || `I${absoluteIndex}`;
                  const colorHex = presentation?.colorHex ?? "#a8a8a8";
                  const material = presentation?.material ?? "Material a definir";
                  const colorName = presentation?.colorName ?? "Color a definir";
                  const surface = presentation?.surface ?? "-";
                  const specs =
                    presentation?.specs ?? [
                      { key: "Dimensiones", value: formatDimensions(item.ancho, item.alto) },
                      { key: "Material", value: material },
                      { key: "Color", value: colorName },
                      { key: "Referencia", value: "-" },
                      { key: "Vidrio", value: item.vidrio || "-" },
                      { key: "Superficie", value: surface },
                    ];
                  const drawingSvg =
                    presentation?.drawingSvg ??
                    generateComponentSVG({
                      tipo: item.tipo,
                      ancho: item.ancho,
                      alto: item.alto,
                      colorHex,
                      maxW: 108,
                      maxH: 94,
                      variant: "pdf",
                    });

                  return (
                    <article key={item.id} className={s.componentCard}>
                      <div className={s.itemBadge}>
                        ITEM {String(absoluteIndex).padStart(2, "0")}
                      </div>

                      <div className={s.componentHeader}>
                        <div className={s.componentTitleRow}>
                          <span className={s.itemCode}>{componentCode}</span>
                          <h2 className={s.itemName}>{item.nombre}</h2>
                        </div>

                        <div className={s.itemChips}>
                          <span className={s.itemChip}>{item.tipo}</span>
                          <span className={s.itemChip}>{material}</span>
                          <span className={`${s.itemChip} ${s.itemChipColor}`}>
                            <i
                              className={s.itemChipDot}
                              style={{ backgroundColor: colorHex }}
                              aria-hidden
                            />
                            {colorName}
                          </span>
                          <span className={s.itemChip}>
                            {item.cantidad} {item.cantidad === 1 ? "unidad" : "unidades"}
                          </span>
                          <span className={s.itemChip}>{surface}</span>
                        </div>
                      </div>

                      <div className={s.componentBody}>
                        <div className={s.drawingColumn}>
                          <div className={s.drawingFrame}>
                            <div
                              className={s.drawingSvg}
                              dangerouslySetInnerHTML={{ __html: drawingSvg }}
                            />
                          </div>
                          <span className={s.drawingCaption}>VISTA INTERIOR REFERENCIAL</span>
                        </div>

                        <div className={s.specsColumn}>
                          {specs.map((spec) => (
                            <div key={spec.key} className={s.specRow}>
                              <span className={s.specBullet} aria-hidden />
                              <span className={s.specKey}>{spec.key}</span>
                              <span className={s.specValue}>{spec.value}</span>
                            </div>
                          ))}
                        </div>

                        <aside className={s.pricesColumn}>
                          <div className={s.pricesHeading}>VALOR COMERCIAL</div>
                          <div className={s.pricesSubheading}>MONTOS EN CLP</div>

                          <div className={s.priceRow}>
                            <span>Precio unitario</span>
                            <strong>{CLP(item.precioUnitario)}</strong>
                          </div>
                          <div className={s.priceRow}>
                            <span>Cantidad</span>
                            <strong>{item.cantidad}</strong>
                          </div>

                          <div className={s.priceTotal}>
                            <span>Valor</span>
                            <strong>{CLP(item.precioTotal)}</strong>
                          </div>
                        </aside>
                      </div>
                    </article>
                  );
                })}
              </div>

              {isLastPage ? (
                <>
                  {paymentTerms ? (
                    <section className={s.paymentBand}>
                      <span className={s.paymentLabel}>Forma de pago:</span>
                      <span className={s.paymentValue}>{paymentTerms}</span>
                    </section>
                  ) : null}

                  {approvalUrl ? (
                    <section className={s.approvalBand}>
                      <span className={s.approvalLabel}>Revisar y responder presupuesto:</span>
                      <span className={s.approvalValue}>{approvalUrl}</span>
                    </section>
                  ) : null}

                  <section className={s.summarySection}>
                    <section className={s.conditionsColumn}>
                      <span className={s.summaryLabel}>CONDICIONES</span>
                      <p className={s.conditionsText}>
                        {visibleCotizacion.observaciones.trim() || "Sin observaciones adicionales."}
                      </p>
                    </section>

                    <aside className={s.totalsColumn}>
                      <span className={s.summaryLabel}>RESUMEN FINAL</span>
                      <div className={s.totalRow}>
                        <span>Subtotal</span>
                        <strong>{CLP(visibleCotizacion.subtotal)}</strong>
                      </div>
                      <div className={s.totalRow}>
                        <span>Descuento</span>
                        <strong>- {CLP(visibleCotizacion.descuentoValor)}</strong>
                      </div>
                      <div className={`${s.totalRow} ${s.totalRowStrong}`}>
                        <span>Neto</span>
                        <strong>{CLP(visibleCotizacion.neto)}</strong>
                      </div>
                      <div className={s.totalRow}>
                        <span>IVA 19%</span>
                        <strong>{CLP(visibleCotizacion.iva)}</strong>
                      </div>
                      {visibleCotizacion.flete > 0 ? (
                        <div className={s.totalRow}>
                          <span>Flete</span>
                          <strong>{CLP(visibleCotizacion.flete)}</strong>
                        </div>
                      ) : null}
                      <div className={`${s.totalRow} ${s.totalRowStrong}`}>
                        <span>Carpinteria total</span>
                        <strong>{totalSurfaceM2.toFixed(2)} m2</strong>
                      </div>
                    </aside>
                  </section>

                  <section className={s.grandTotal}>
                    <span>Total presupuesto</span>
                    <strong>{CLP(visibleCotizacion.total)}</strong>
                  </section>
                </>
              ) : null}

              <footer className={s.pageFooter}>
                <span className={s.footerBranding}>
                  Sistema generado por <strong>{APP_NAME}</strong>
                </span>
                <div className={s.footerMeta}>
                  <div className={s.footerPager} aria-label={`Pagina ${formatPageNumber(pageNumber, totalPages)}`}>
                    <div className={s.footerPagerValue}>
                      <span className={s.footerPagerCurrent}>{String(pageNumber).padStart(2, "0")}</span>
                      <span className={s.footerPagerTotal}>/{String(totalPages).padStart(2, "0")}</span>
                    </div>
                  </div>
                </div>
              </footer>
            </article>
          );
        })}
          </section>
        </div>
      </div>
    </main>
  );
}
