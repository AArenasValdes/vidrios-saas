"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuCopy, LuDownload, LuPrinter, LuShare2 } from "react-icons/lu";

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

const FIRST_PAGE_COMPONENTS = 3;
const NEXT_PAGE_COMPONENTS = 3;
const APP_NAME = "Ventora";
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

function ExportChip({
  label,
  dotColor,
}: {
  label: string;
  dotColor?: string;
}) {
  const dotSpace = dotColor ? 14 : 0;
  const width = estimatePillWidth(label, 17 + dotSpace, 3.85);
  const textX = dotColor ? width / 2 + 5 : width / 2;

  return (
    <svg
      aria-hidden
      className={s.exportChipSvg}
      viewBox={`0 0 ${width} 18`}
      width={width}
      height={18}
    >
      <rect x="0.5" y="0.5" width={width - 1} height={17} rx={9} fill="#ffffff" stroke="#d1d5db" />
      {dotColor ? <circle cx="16" cy="9" r="4" fill={dotColor} stroke="rgba(17,24,39,0.16)" /> : null}
      <text
        x={textX}
        y="9.2"
        fill="#4b5563"
        fontFamily="Montserrat, Arial, sans-serif"
        fontSize="7"
        fontWeight="500"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </svg>
  );
}

function ExportTitleRow({
  code,
  name,
}: {
  code: string;
  name: string;
}) {
  const codeWidth = estimatePillWidth(code, 12, 4.2);
  const nameWidth = estimatePillWidth(name, 76, 6.8);
  const totalWidth = codeWidth + nameWidth + 10;

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
        y="11"
        fill="#6b7280"
        fontFamily="Montserrat, Arial, sans-serif"
        fontSize="8.5"
        fontWeight="500"
        dominantBaseline="middle"
      >
        {code}
      </text>
      <text
        x={codeWidth + 6}
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
    useCotizacionesStore();
  const { profile: rawOrganizationProfile, isReady: isProfileReady } = useOrganizationProfile();
  const cotizacion = getCotizacionById(params.id);
  const renderableCotizacion = cotizacion && cotizacion.items.length > 0 ? cotizacion : null;
  const hasRenderableRecord = Boolean(renderableCotizacion);
  const lastRenderableCotizacionRef = useRef(renderableCotizacion);
  const hasForcedFreshLoadRef = useRef(false);
  const sheetViewportRef = useRef<HTMLDivElement | null>(null);
  const sheetScaleFrameRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const exportSheetRef = useRef<HTMLElement | null>(null);
  const buildPdfPromiseRef = useRef<Promise<{ blob: Blob; file: File }> | null>(null);
  const prewarmedCacheKeyRef = useRef<string | null>(null);
  const sentPushNotifiedQuoteRef = useRef<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showWhatsappFallbackActions, setShowWhatsappFallbackActions] = useState(false);
  const [isHydratingRecord, setIsHydratingRecord] = useState(!hasRenderableRecord);
  const [sheetPreviewScale, setSheetPreviewScale] = useState(1);
  const [sheetPreviewWidth, setSheetPreviewWidth] = useState(0);
  const [sheetPreviewHeight, setSheetPreviewHeight] = useState(0);
  const [shareExperience] = useState(getCotizacionShareExperience);
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

      const shouldForceFreshLoad = fromWizard && wasJustCreated;
      const hasWarmRecord = Boolean(cotizacion && cotizacion.items.length > 0);

      if (hasWarmRecord && !shouldForceFreshLoad) {
        setIsHydratingRecord(false);
        return;
      }

      if (hasWarmRecord && shouldForceFreshLoad) {
        if (hasForcedFreshLoadRef.current) {
          setIsHydratingRecord(false);
          return;
        }

        hasForcedFreshLoadRef.current = true;
        setIsHydratingRecord(false);
        void loadCotizacionById(params.id).catch(() => {
          return;
        });
        return;
      }

      setIsHydratingRecord(true);
      hasForcedFreshLoadRef.current = true;

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
  }, [cotizacion, fromWizard, loadCotizacionById, params.id, wasJustCreated]);

  useEffect(() => {
    if (renderableCotizacion) {
      lastRenderableCotizacionRef.current = renderableCotizacion;
    }
  }, [renderableCotizacion]);

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
  const visibleCotizacion = renderableCotizacion ?? lastRenderableCotizacionRef.current;

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
  const shouldWarmPdf = shareIntent === "warm" || shareIntent === "whatsapp";
  const isAppleMobile =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroidMobile =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const shouldSharePdfToWhatsapp = shareExperience.canSharePdf && isAndroidMobile;
  const whatsappActionLabel = shouldSharePdfToWhatsapp
    ? "Enviar PDF por WhatsApp"
    : "Enviar link por WhatsApp";
  const shareHintText =
    shareIntent === "whatsapp"
      ? shouldSharePdfToWhatsapp
        ? "En Android, toca 'Enviar PDF por WhatsApp' para adjuntar el archivo. Si el sistema no lo permite, abrimos WhatsApp con el link publico como respaldo."
        : "Toca 'Enviar link por WhatsApp' para abrir el mensaje listo con el enlace publico de la cotizacion."
      : isAppleMobile
        ? "En iPhone, el boton abre el archivo PDF para que luego puedas guardarlo o compartirlo desde Safari."
        : shouldSharePdfToWhatsapp
          ? "En Android puedes enviar el PDF por WhatsApp desde aqui. Si el telefono no deja adjuntar el archivo, abrimos el mensaje de respaldo."
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

  useEffect(() => {
    if (!visibleCotizacion?.id) {
      sentPushNotifiedQuoteRef.current = null;
      return;
    }

    if (visibleCotizacion.estado !== "enviada") {
      sentPushNotifiedQuoteRef.current = null;
    }
  }, [visibleCotizacion?.estado, visibleCotizacion?.id]);

  const notifyQuoteSent = useCallback(
    async (input: {
      cotizacionId: string;
      codigo: string;
      clienteNombre: string;
    }) => {
      if (sentPushNotifiedQuoteRef.current === input.cotizacionId) {
        return;
      }

      const response = await fetch("/api/pwa/quote-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(
          payload?.error ?? "No pudimos enviar la alerta al celular del maestro."
        );
      }

      sentPushNotifiedQuoteRef.current = input.cotizacionId;
    },
    []
  );

  const markQuoteAsSentWithAlert = useCallback(async () => {
    if (!visibleCotizacion) {
      return;
    }

    const wasAlreadySent = visibleCotizacion.estado === "enviada";

    await markQuoteAsSent(String(visibleCotizacion.id));

    if (wasAlreadySent) {
      sentPushNotifiedQuoteRef.current = String(visibleCotizacion.id);
      return;
    }

    try {
      await notifyQuoteSent({
        cotizacionId: String(visibleCotizacion.id),
        codigo: visibleCotizacion.codigo,
        clienteNombre: visibleCotizacion.clienteNombre,
      });
    } catch (error) {
      console.error("No pudimos enviar el push de cotizacion enviada.", error);
    }
  }, [markQuoteAsSent, notifyQuoteSent, visibleCotizacion]);

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

        return exportCotizacionElementToPdf({
          element: sourceSheet,
          fileName: exportFileName,
          pageSelector: `.${s.pdfPage}`,
          format: "legal",
          cacheKey: pdfCacheKey ?? undefined,
        });
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
      setShowWhatsappFallbackActions(false);
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
      setShowWhatsappFallbackActions(false);

      if (!shouldSharePdfToWhatsapp) {
        if (!whatsappUrl) {
          setExportError("El cliente no tiene un telefono valido para WhatsApp.");
          return;
        }

        if (visibleCotizacion) {
          await markQuoteAsSentWithAlert();
        }
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const { blob, file } = await buildPdfFile();
      const shareText = visibleCotizacion
        ? buildCotizacionWhatsappMessage(visibleCotizacion, {
            approvalUrl,
            deliveryMode: "attachment",
          })
        : whatsappMessage;
      const shared = await shareCotizacionPdf({
        file,
        title: visibleCotizacion?.codigo ?? "Cotizacion",
        text: shareText,
      });

      if (!shared) {
        setShowWhatsappFallbackActions(true);
        downloadPdfBlob(blob, exportFileName);

        const fallbackWhatsappUrl = visibleCotizacion
          ? buildCotizacionWhatsappUrl(visibleCotizacion, {
              approvalUrl,
              deliveryMode: "message",
            })
          : whatsappUrl;

        if (fallbackWhatsappUrl) {
          if (visibleCotizacion) {
            await markQuoteAsSentWithAlert();
          }
          window.open(fallbackWhatsappUrl, "_blank", "noopener,noreferrer");
        }

        setExportError(
          "Tu navegador actual no pudo adjuntar el PDF directo a WhatsApp desde la web. Dejamos el archivo descargado o abierto y abrimos el mensaje con el link publico como respaldo. En Chrome Android o con la PWA instalada suele funcionar mejor."
        );
      }
      if (visibleCotizacion) {
        await markQuoteAsSentWithAlert();
      }
    } catch (error) {
      setShowWhatsappFallbackActions(true);
      setExportError(formatCotizacionPdfError(error));
    } finally {
      setIsExporting(false);
    }
  }, [
    approvalUrl,
    buildPdfFile,
    markQuoteAsSentWithAlert,
    visibleCotizacion,
    exportFileName,
    shouldSharePdfToWhatsapp,
    whatsappMessage,
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

    if (visibleCotizacion) {
      void markQuoteAsSentWithAlert();
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, [markQuoteAsSentWithAlert, visibleCotizacion, whatsappUrl]);

  const renderPrintPages = useCallback(
    (mode: "preview" | "export"): ReactNode => {
      if (!visibleCotizacion) {
        return null;
      }

      return printPages.map((pagePlan, pageIndex) => {
        const totalPages = printPages.length;
        const pageNumber = pageIndex + 1;
        const isLastPage = pageIndex === totalPages - 1;
        const dueDate = formatDueDate(visibleCotizacion.updatedAt, visibleCotizacion.validez);

        return (
          <article
            key={`${mode}-${pagePlan.kind}-${pageNumber}`}
            className={`${s.pdfPage} ${mode === "export" ? s.exportPdfPage : ""}`}
          >
            <div className={s.softwareSignature}>
              <span className={s.softwareSignaturePrefix}>Powered by</span>
              <strong className={s.softwareSignatureName}>{APP_NAME}</strong>
              <span className={s.softwareSignatureVersion}>v2.0</span>
            </div>

            <header className={s.pageHeader}>
              <div className={s.companyBlock}>
                <div className={s.companyLogoWrap}>
                  {organizationProfile.empresaLogoUrl ? (
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
                <span className={s.quoteMetaDate}>
                  Creada {formatCotizacionDate(visibleCotizacion.updatedAt)}
                </span>
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
                const itemBadgeLabel = `ITEM ${String(absoluteIndex).padStart(2, "0")}`;

                return (
                  <article key={item.id} className={s.componentCard}>
                    <div className={s.itemBadge}>
                      {mode === "export" ? <ExportBadge label={itemBadgeLabel} /> : itemBadgeLabel}
                    </div>

                    <div className={s.componentHeader}>
                      <div className={s.componentTitleRow}>
                        {mode === "export" ? (
                          <ExportTitleRow code={componentCode} name={item.nombre} />
                        ) : (
                          <>
                            <span className={s.itemCode}>{componentCode}</span>
                            <h2 className={s.itemName}>{item.nombre}</h2>
                          </>
                        )}
                      </div>

                      <div className={s.itemChips}>
                        {mode === "export" ? (
                          <>
                            <ExportChip label={item.tipo} />
                            <ExportChip label={material} />
                            <ExportChip label={colorName} dotColor={colorHex} />
                            <ExportChip label={`${item.cantidad} ${item.cantidad === 1 ? "unidad" : "unidades"}`} />
                            <ExportChip label={surface} />
                          </>
                        ) : (
                          <>
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
                {paymentTerms ? (
                  <section className={s.paymentBand}>
                    <span className={s.paymentLabel}>Forma de pago:</span>
                    <span className={s.paymentValue}>{paymentTerms}</span>
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
      companyAddressLine,
      itemPresentationMap,
      organizationProfile.empresaLogoUrl,
      organizationProfile.empresaNombre,
      paymentTerms,
      printPages,
      totalSurfaceM2,
      visibleCotizacion,
    ]
  );

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
              <span>Preparando cotizacion</span>
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
