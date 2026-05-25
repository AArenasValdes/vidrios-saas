"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuCopy, LuDownload, LuPrinter, LuShare2 } from "react-icons/lu";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import {
  composeComponentReference,
  splitComponentReference,
} from "@/features/cotizaciones/services/component-catalog.service";
import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { resolveComponentColorName } from "@/constants/component-colors";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { resolveOrganizationProfile } from "@/features/organization-profile/services/organization-profile.service";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";
import {
  buildDocumentCompanyName,
  buildDocumentContactLine,
  buildDocumentInitials,
  formatDocumentCompanyPhoneNumber,
  normalizeDocumentOptionalText,
  resolveDocumentConditionsText,
  resolveDocumentPaymentTerms,
} from "@/utils/cotizacion-document";
import { buildReadableCotizacionPdfFileName } from "@/utils/cotizacion-pdf";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { buildCotizacionWhatsappMessage, buildCotizacionWhatsappUrl } from "@/utils/whatsapp";
import { generateComponentSVG } from "@/utils/window-drawings";

import { VisorPdfLoadingShell } from "./_components/visor-pdf-loading-shell";
import { buildPrintPlan } from "./_utils/print-plan";
import s from "./page.module.css";

const APP_NAME = "Ventora";
const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const CLP = (value: number) => clpFormatter.format(value);
type CotizacionPdfModule = typeof import("@/utils/cotizacion-pdf");

function resolvePrintRuntimeMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = ["message", "error", "details", "hint", "code"].find((key) => {
      const value = Reflect.get(error, key);
      return typeof value === "string" && value.trim().length > 0;
    });

    if (candidate) {
      return String(Reflect.get(error, candidate));
    }
  }

  return fallback;
}

// Compat temporal: mantener mapa local hasta limpiar encoding histórico de este bloque.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COLOR_NAMES: Record<string, string> = {
  "#a8a8a8": "Aluminio mate",
  "#f0eeeb": "Blanco",
  "#b7bcc4": "Gris",
  "#b7834a": "Roble Dorado",
  "#6f4a34": "Nogal",
  "#dfd5c4": "Blanco hueso",
  "#4f555d": "Gris Antracita",
  "#2a2a2a": "Negro",
  "#444444": "Negro mate",
  "#8b5e3c": "Madera",
  "#7d8791": "Titanio",
  "#1f8c5a": "Verde (Eléctrico)",
  "#2968c8": "Azul (Alta presión)",
  "#e7842a": "Naranja (Ventilación)",
};

type ItemPresentation = {
  colorHex: string;
  material: string;
  referencia: string;
  sistema: string;
  configuracion: string;
  colorName: string;
  surface: string;
  specs: Array<{ key: string; value: string }>;
  drawingSvg: string;
};

function getColorName(colorHex: string) {
  return resolveComponentColorName(colorHex);
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

function formatPageNumber(current: number, total: number) {
  return `${String(current).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
}

async function loadCotizacionPdfModule(): Promise<CotizacionPdfModule> {
  return import("@/utils/cotizacion-pdf");
}

function buildPrintPdfFileName(record: {
  codigo: string;
  clienteNombre: string;
  obra: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}) {
  return buildReadableCotizacionPdfFileName(record);
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

function hasWorkflowItemData(record: {
  items: Array<unknown>;
}) {
  return record.items.length > 0;
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

function estimatePillWidth(text: string, base = 18, perChar = 4.3) {
  return Math.max(base, Math.ceil(base + text.length * perChar));
}

function ExportBadge({ label }: { label: string }) {
  const width = estimatePillWidth(label, 24, 4.9);

  return (
    <svg
      aria-hidden
      className={s.exportBadgeSvg}
      viewBox={`0 0 ${width} 22`}
      width={width}
      height={22}
    >
      <rect width={width} height={22} rx={6} fill="var(--brand)" />
      <text
        x={width / 2}
        y="11"
        fill="#ffffff"
        fontFamily="Montserrat, Arial, sans-serif"
        fontSize="8.2"
        fontWeight="700"
        letterSpacing="0.4"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </svg>
  );
}

function ExportTitleRow({
  name,
}: {
  name: string;
}) {
  const nameWidth = estimatePillWidth(name, 92, 7);
  const totalWidth = nameWidth;

  return (
    <svg
      aria-hidden
      className={s.exportTitleSvg}
      viewBox={`0 0 ${totalWidth} 22`}
      width={totalWidth}
      height={22}
    >
      <text
        x="0"
        y="11.4"
        fill="#111111"
        fontFamily="Georgia, Times New Roman, serif"
        fontSize="12"
        fontWeight="700"
        dominantBaseline="middle"
      >
        {name}
      </text>
    </svg>
  );
}

function ExportPager({
  current,
  total,
}: {
  current: string;
  total: string;
}) {
  return (
    <svg aria-hidden className={s.exportPagerSvg} viewBox="0 0 56 18" width={56} height={18}>
      <rect x="0" y="0" width="24" height="18" rx="4" fill="var(--brand)" />
      <rect x="24" y="0" width="32" height="18" rx="4" fill="#eef2f7" />
      <text
        x="12"
        y="9.4"
        fill="#ffffff"
        fontFamily="Montserrat, Arial, sans-serif"
        fontSize="9.2"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {current}
      </text>
      <text
        x="40"
        y="9.4"
        fill="#6b7280"
        fontFamily="Montserrat, Arial, sans-serif"
        fontSize="8"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        /{total}
      </text>
    </svg>
  );
}

export default function CotizacionPrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { getCotizacionById, loadCotizacionById, markQuoteAsSent, isReady } =
    useCotizacionesStore({ autoLoadSummary: false });
  const { profile: rawOrganizationProfile, isReady: isProfileReady } = useOrganizationProfile();
  const cotizacion = getCotizacionById(params.id);
  const [hasResolvedDetailRecord, setHasResolvedDetailRecord] = useState(
    Boolean(cotizacion && hasWorkflowItemData(cotizacion))
  );
  const renderableCotizacion =
    cotizacion && (hasWorkflowItemData(cotizacion) || hasResolvedDetailRecord)
      ? cotizacion
      : null;
  const sheetViewportRef = useRef<HTMLDivElement | null>(null);
  const sheetScaleFrameRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const exportSheetRef = useRef<HTMLElement | null>(null);
  const buildPdfPromiseRef = useRef<Promise<{ blob: Blob; file: File }> | null>(null);
  const prewarmedCacheKeyRef = useRef<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [recordLoadError, setRecordLoadError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showWhatsappFallbackActions, setShowWhatsappFallbackActions] = useState(false);
  const [isHydratingRecord, setIsHydratingRecord] = useState(
    !Boolean(cotizacion && hasWorkflowItemData(cotizacion))
  );
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [sheetPreviewScale, setSheetPreviewScale] = useState(1);
  const [sheetPreviewWidth, setSheetPreviewWidth] = useState(0);
  const [sheetPreviewHeight, setSheetPreviewHeight] = useState(0);
  const shareIntent = searchParams.get("intent");
  const previewMode = searchParams.get("preview");
  const fromWizard = searchParams.get("from") === "wizard";
  const wasJustCreated = searchParams.get("created") === "1";
  const isEmbeddedPreview = previewMode === "embed";

  useEffect(() => {
    let isCancelled = false;

    async function ensureFullRecord() {
      if (!params.id) {
        return;
      }

      const hasWarmRecord = Boolean(cotizacion && hasWorkflowItemData(cotizacion));

      if (hasWarmRecord) {
        setHasResolvedDetailRecord(true);
        setRecordLoadError(null);
        setIsHydratingRecord(false);
        return;
      }

      setIsHydratingRecord(true);

      try {
        await loadCotizacionById(params.id);
        if (!isCancelled) {
          setHasResolvedDetailRecord(true);
          setRecordLoadError(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setRecordLoadError(
            resolvePrintRuntimeMessage(
              error,
              "No pudimos abrir el presupuesto en este momento. Revisa tu conexion y vuelve a intentar."
            )
          );
        }
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

  const retryLoadRecord = useCallback(async () => {
    if (!params.id) {
      return;
    }

    setRecordLoadError(null);
    setIsHydratingRecord(true);

    try {
      await loadCotizacionById(params.id);
      setHasResolvedDetailRecord(true);
    } catch (error) {
      setRecordLoadError(
        resolvePrintRuntimeMessage(
          error,
          "No pudimos volver a cargar el presupuesto. Intenta nuevamente en unos segundos."
        )
      );
    } finally {
      setIsHydratingRecord(false);
    }
  }, [loadCotizacionById, params.id]);

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

  const organizationProfile = resolveOrganizationProfile(
    rawOrganizationProfile?.organizationId ?? null,
    rawOrganizationProfile
  );
  const visibleCotizacion = renderableCotizacion;
  const companyName = buildDocumentCompanyName(organizationProfile.empresaNombre);
  const companyLogoFallbackLabel = buildDocumentInitials(companyName);
  const companyLogoUrl = organizationProfile.empresaLogoUrl;
  const shouldShowCompanyLogo =
    Boolean(companyLogoUrl) && failedLogoUrl !== companyLogoUrl;

  const pageStyle = {
    "--brand": organizationProfile.brandColor,
    "--carbon": "#111827",
  } as CSSProperties;

  const exportFileName = visibleCotizacion ? buildPrintPdfFileName(visibleCotizacion) : "cotizacion.pdf";
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
  const isAppleMobile =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const shouldWarmPdf = wasJustCreated || shareIntent === "warm";
  const whatsappActionLabel = "Enviar link por WhatsApp";
  const shareHintText =
    "Para mantener aprobacion y rechazo rastreables, este boton abre WhatsApp con el link publico de la cotizacion. Si ademas necesitas archivo, usa Descargar PDF.";
  const companyAddressPrimaryDisplay = normalizeDocumentOptionalText(
    organizationProfile.empresaDireccion
  );
  const companyAddressSecondaryClean = buildDocumentContactLine([
    formatDocumentCompanyPhoneNumber(organizationProfile.empresaTelefono),
    organizationProfile.empresaEmail,
  ]);
  const hasNormalizedCompanyAddress = Boolean(
    companyAddressPrimaryDisplay || companyAddressSecondaryClean
  );
  const paymentTermsDisplay = resolveDocumentPaymentTerms(
    organizationProfile.formaPago
  );

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
      const { colorHex, material, referencia, sistema, configuracion } =
        decodeCotizacionItemPresentationMeta(item.observaciones);
      const colorName = getColorName(colorHex);
      const surface = formatSurface(item.ancho, item.alto, item.cantidad);
      const referenceParts = splitComponentReference(referencia, item.tipo);
      const resolvedSystem = sistema || referenceParts.sistema;
      const resolvedConfiguration = configuracion || referenceParts.configuracion;
      const systemLabel =
        composeComponentReference(resolvedSystem, resolvedConfiguration) ||
        resolvedSystem ||
        "-";
      const lineLabel = item.lineaComercial?.trim() || referencia || "-";
      map.set(item.id, {
        colorHex,
        material,
        referencia,
        sistema: resolvedSystem,
        configuracion: resolvedConfiguration,
        colorName,
        surface,
        specs: [
          { key: "Dimensiones", value: formatDimensions(item.ancho, item.alto) },
          { key: "Material", value: material },
          { key: "Color", value: colorName },
          { key: "Sistema", value: systemLabel },
          { key: "Línea", value: lineLabel },
          { key: "Vidrio", value: item.vidrio || "-" },
          { key: "Superficie", value: surface },
        ],
        drawingSvg: generateComponentSVG({
          tipo: item.tipo,
          sistema: resolvedSystem,
          configuracion: resolvedConfiguration,
          referencia,
          ancho: item.ancho,
          alto: item.alto,
          colorHex,
          maxW: 156,
          maxH: 138,
          variant: "pdf",
        }),
      });
    }

    return map;
  }, [visibleCotizacion?.items]);

  const markQuoteAsSentInBackground = useCallback(() => {
    if (!visibleCotizacion) {
      return;
    }

    void markQuoteAsSent(String(visibleCotizacion.id)).catch(() => {
      return;
    });
  }, [markQuoteAsSent, visibleCotizacion]);

  const buildPdfFile = useCallback(async () => {
    if (buildPdfPromiseRef.current) {
      return buildPdfPromiseRef.current;
    }

    if (!exportSheetRef.current || !visibleCotizacion) {
      throw new Error("La cotizacion aun no esta lista para exportar");
    }

    buildPdfPromiseRef.current = (async () => {
      exportSheetRef.current?.classList.add(s.sheetExporting);

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

        const sourceSheet = exportSheetRef.current;

        if (!sourceSheet) {
          throw new Error("La hoja de impresion ya no esta disponible para exportar");
        }

        const { exportCotizacionElementToPdf } = await loadCotizacionPdfModule();
        const result = await exportCotizacionElementToPdf({
          element: sourceSheet,
          fileName: exportFileName,
          pageSelector: `.${s.pdfPage}`,
          format: "legal",
          cacheKey: pdfCacheKey ?? undefined,
        });

                return result;
      } finally {
        exportSheetRef.current?.classList.remove(s.sheetExporting);
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
      !exportSheetRef.current ||
      printPages.length === 0
    ) {
      return;
    }

    const scheduleWarmPdf = () => {
      prewarmedCacheKeyRef.current = pdfCacheKey;
      void buildPdfFile().catch(() => {
        prewarmedCacheKeyRef.current = null;
        // El precalentado del PDF es solo una optimizacion. Si falla, no
        // debemos ensuciar la UI con un error porque el archivo aun puede
        // abrirse o descargarse manualmente unos segundos despues.
      });
    };

    const idleTimeout = wasJustCreated ? 500 : 1200;
    const fallbackDelay = wasJustCreated ? 180 : 900;
    const idleCallback =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(scheduleWarmPdf, { timeout: idleTimeout })
        : null;
    const timer =
      idleCallback === null
        ? window.setTimeout(scheduleWarmPdf, fallbackDelay)
        : null;

    return () => {
      if (idleCallback !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleCallback);
      }

      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [
    buildPdfFile,
    isHydratingRecord,
    isProfileReady,
    pdfCacheKey,
    printPages.length,
    shouldWarmPdf,
    wasJustCreated,
  ]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setShowWhatsappFallbackActions(false);
      const { blob } = await buildPdfFile();
      const { downloadPdfBlob, requiresPdfOpenFallback } =
        await loadCotizacionPdfModule();
      const downloadResult = await downloadPdfBlob(blob, exportFileName);

      if (downloadResult === "failed") {
        setExportError(
          "No pudimos abrir el PDF en este telefono. Intenta nuevamente y, si sigue fallando, envia el link por WhatsApp y comparte el archivo manualmente."
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
      const { formatCotizacionPdfError } = await loadCotizacionPdfModule();
      setExportError(formatCotizacionPdfError(error));
    } finally {
      setIsExporting(false);
    }
  }, [buildPdfFile, exportFileName]);

  const handleWhatsappShare = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setCopyFeedback(null);
      setShowWhatsappFallbackActions(false);

      if (!whatsappUrl) {
        setExportError("El cliente no tiene un telefono valido para WhatsApp.");
        return;
      }

      const openedWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        setShowWhatsappFallbackActions(true);
        setExportError(
          "No pudimos abrir WhatsApp desde este navegador. Usa Copiar mensaje o Abrir WhatsApp como respaldo."
        );
        return;
      }

      markQuoteAsSentInBackground();
    } catch (error) {
      setShowWhatsappFallbackActions(true);
      const { formatCotizacionPdfError } = await loadCotizacionPdfModule();
      setExportError(formatCotizacionPdfError(error));
    } finally {
      setIsExporting(false);
    }
  }, [
    markQuoteAsSentInBackground,
    whatsappUrl,
  ]);

  const handleCopyWhatsappMessage = useCallback(async () => {
    if (!whatsappMessage) {
      return;
    }

    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopyFeedback("Mensaje copiado. Puedes pegarlo en WhatsApp.");
      setExportError(null);
      window.setTimeout(() => {
        setCopyFeedback(null);
      }, 2500);
    } catch {
      setExportError(
        "No pudimos copiar el mensaje automaticamente en este navegador."
      );
    }
  }, [whatsappMessage]);

  const handleOpenWhatsappMessage = useCallback(() => {
    if (!whatsappUrl) {
      setExportError("El cliente no tiene un telefono valido para WhatsApp.");
      return;
    }

    const openedWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
      setShowWhatsappFallbackActions(true);
      setExportError("No pudimos abrir WhatsApp automaticamente en este navegador.");
      return;
    }

    markQuoteAsSentInBackground();
  }, [markQuoteAsSentInBackground, whatsappUrl]);

  const renderPrintPages = useCallback(
    (mode: "preview" | "export"): ReactNode => {
      if (!visibleCotizacion) {
        return null;
      }

      return printPages.map((pagePlan, pageIndex) => {
        const totalPages = printPages.length;
        const pageNumber = pageIndex + 1;
        const isLastPage = pageIndex === totalPages - 1;
        const isSpaciousCoverPage =
          pagePlan.kind === "cover" && pagePlan.items.length === 2 && !isLastPage;
        const dueDate = formatDueDate(visibleCotizacion.updatedAt, visibleCotizacion.validez);

        return (
          <article
            key={`${mode}-${pagePlan.kind}-${pageNumber}`}
            className={[
              s.pdfPage,
              mode === "export" ? s.exportPdfPage : "",
              isSpaciousCoverPage ? s.spaciousCoverPage : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className={s.softwareSignature}>
              <span className={s.softwareSignaturePrefix}>Powered by</span>
              <strong className={s.softwareSignatureName}>{APP_NAME}</strong>
              <span className={s.softwareSignatureVersion}>v2.0</span>
            </div>

            <header className={s.pageHeader}>
              <div className={s.companyBlock}>
                <div className={s.companyLogoWrap}>
                  {shouldShowCompanyLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={companyName}
                      className={s.companyLogo}
                      loading="eager"
                      onError={() => setFailedLogoUrl(companyLogoUrl)}
                      src={companyLogoUrl ?? undefined}
                    />
                  ) : (
                    <div className={s.companyLogoFallback}>{companyLogoFallbackLabel}</div>
                  )}
                </div>

                        <div className={s.companyMeta}>
                          <strong className={s.companyName}>{companyName}</strong>
                          <div className={s.companyAddress}>
                            {hasNormalizedCompanyAddress ? (
                              <>
                                {companyAddressPrimaryDisplay ? (
                                  <span className={s.companyAddressPrimary}>
                                    {companyAddressPrimaryDisplay}
                                  </span>
                                ) : null}
                                {companyAddressSecondaryClean ? (
                                  <span className={s.companyAddressSecondary}>
                                    {companyAddressSecondaryClean}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className={s.companyAddressSecondary}>
                                Perfil comercial aún no configurado
                              </span>
                            )}
                          </div>
                        </div>
              </div>

              <div className={s.quoteMeta}>
                <span className={s.quoteMetaEyebrow}>Cotización N°</span>
                <strong>{visibleCotizacion.codigo}</strong>
                <span className={s.quoteMetaDate}>
                  Fecha: {formatCotizacionDate(visibleCotizacion.updatedAt)}
                </span>
                <span className={s.quoteMetaDue}>Vigencia: hasta {dueDate}</span>
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
              {pagePlan.items.length === 0 ? (
                <p className={s.emptyText}>
                  Esta cotizacion aun no tiene items cargados. Puedes volver al detalle y
                  completarla antes de compartir el PDF definitivo.
                </p>
              ) : null}
              {pagePlan.items.map((item, itemIndex) => {
                const absoluteIndex = pagePlan.startIndex + itemIndex + 1;
                const presentation = itemPresentationMap.get(item.id);
                const colorHex = presentation?.colorHex ?? "#a8a8a8";
                const material = presentation?.material ?? "Material a definir";
                const colorName = presentation?.colorName ?? "Color a definir";
                const surface = presentation?.surface ?? "-";
                const specs =
                  presentation?.specs ?? [
                    { key: "Dimensiones", value: formatDimensions(item.ancho, item.alto) },
                    { key: "Material", value: material },
                    { key: "Color", value: colorName },
                    { key: "Línea", value: "-" },
                    { key: "Vidrio", value: item.vidrio || "-" },
                    { key: "Superficie", value: surface },
                  ];
                const drawingSvg =
                  presentation?.drawingSvg ??
                  generateComponentSVG({
                    tipo: item.tipo,
                    referencia: presentation?.referencia,
                    ancho: item.ancho,
                    alto: item.alto,
                    colorHex,
                            maxW: 156,
                            maxH: 138,
                    variant: "pdf",
                  });
                const itemBadgeLabel = `ITEM ${String(absoluteIndex).padStart(2, "0")}`;

                return (
                  <article key={item.id} className={s.componentCard}>
                    <div className={s.itemBadge}>
                      {mode === "export" ? <ExportBadge label={itemBadgeLabel} /> : itemBadgeLabel}
                    </div>

                    <div className={s.componentHeader}>
                      <div className={s.componentTitleRow}>
                        {mode === "export" ? (
                          <ExportTitleRow name={item.nombre} />
                        ) : (
                          <>
                            <h2 className={s.itemName}>{item.nombre}</h2>
                          </>
                        )}
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
                {paymentTermsDisplay ? (
                  <section className={s.paymentBand}>
                    <span className={s.paymentLabel}>Forma de pago:</span>
                    <span className={s.paymentValue}>{paymentTermsDisplay}</span>
                  </section>
                ) : null}

                <section className={s.summarySection}>
                  <section className={s.conditionsColumn}>
                    <span className={s.summaryLabel}>CONDICIONES</span>
                    <p className={s.conditionsText}>
                      {resolveDocumentConditionsText(visibleCotizacion.observaciones)}
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
                      <span>Carpintería total</span>
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
                  {mode === "export" ? (
                    <ExportPager
                      current={String(pageNumber).padStart(2, "0")}
                      total={String(totalPages).padStart(2, "0")}
                    />
                  ) : (
                    <div className={s.footerPagerValue}>
                      <span className={s.footerPagerCurrent}>{String(pageNumber).padStart(2, "0")}</span>
                      <span className={s.footerPagerTotal}>/{String(totalPages).padStart(2, "0")}</span>
                    </div>
                  )}
                </div>
              </div>
            </footer>
          </article>
        );
      });
    },
    [
      companyAddressPrimaryDisplay,
      companyAddressSecondaryClean,
      companyName,
      companyLogoFallbackLabel,
      companyLogoUrl,
      hasNormalizedCompanyAddress,
      itemPresentationMap,
      failedLogoUrl,
      paymentTermsDisplay,
      printPages,
      shouldShowCompanyLogo,
      totalSurfaceM2,
      visibleCotizacion,
    ]
  );

  if (!visibleCotizacion && recordLoadError && !isHydratingRecord) {
    return (
      <main className={s.page} style={pageStyle}>
        <div className={s.toolbar}>
          <Link className={s.actionSecondary} href={fromWizard ? "/cotizaciones" : `/cotizaciones/${params.id}`}>
            <LuArrowLeft aria-hidden />
            {fromWizard ? "Volver a cotizaciones" : "Volver"}
          </Link>
        </div>

        <section className={s.viewerLoadingShell}>
          <div className={s.loadingHero}>
            <div className={s.loadingBrand}>
              <div className={s.loadingLogoWrap}>
                <div className={s.companyLogoFallback}>V</div>
              </div>
              <div className={s.loadingBrandText}>
                <strong>Ventora</strong>
                <span>No pudimos abrir el presupuesto</span>
              </div>
            </div>
            <div className={s.loadingHeroBody}>
              <div className={s.loadingErrorIcon} aria-hidden>
                !
              </div>
              <div className={s.loadingCopy}>
                <h1 className={s.emptyTitle}>Error al preparar el visor</h1>
                <p className={s.emptyText}>{recordLoadError}</p>
                <div className={s.loadingActions}>
                  <button
                    className={s.actionPrimary}
                    onClick={() => void retryLoadRecord()}
                    type="button"
                  >
                    Reintentar
                  </button>
                  <Link
                    className={s.actionSecondary}
                    href={fromWizard ? "/cotizaciones" : `/cotizaciones/${params.id}`}
                  >
                    Volver
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

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

  if (!visibleCotizacion) {
    return (
      <main className={s.page} style={pageStyle}>
        <VisorPdfLoadingShell />
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
              {whatsappActionLabel}
            </button>
            {showWhatsappFallbackActions ? (
              <>
                <button
                  className={s.actionSecondary}
                  onClick={() => void handleCopyWhatsappMessage()}
                  type="button"
                  disabled={!whatsappMessage || isExporting}
                >
                  <LuCopy aria-hidden />
                  Copiar mensaje
                </button>
                <button
                  className={s.actionSecondary}
                  onClick={handleOpenWhatsappMessage}
                  type="button"
                  disabled={!whatsappUrl || isExporting}
                >
                  <LuShare2 aria-hidden />
                  Abrir WhatsApp
                </button>
              </>
            ) : null}
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
      {isEmbeddedPreview ? null : copyFeedback ? <div className={s.successTicket}>{copyFeedback}</div> : null}
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
            {renderPrintPages("preview")}
          </section>
        </div>
      </div>

      <div className={s.exportRenderHost} aria-hidden>
        <section ref={exportSheetRef} className={`${s.sheet} ${s.exportSheet}`}>
          {renderPrintPages("export")}
        </section>
      </div>
    </main>
  );
}
