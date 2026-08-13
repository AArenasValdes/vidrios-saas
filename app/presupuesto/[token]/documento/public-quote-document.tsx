"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuDownload } from "react-icons/lu";

import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { splitComponentReference } from "@/features/cotizaciones/services/component-catalog.service";
import { resolveComponentColorName } from "@/constants/component-colors";
import {
  buildDocumentCompanyName,
  buildDocumentContactLine,
  buildDocumentInitials,
  formatDocumentCompanyPhoneNumber,
  resolveDocumentConditionsText,
  resolveDocumentPaymentTerms,
} from "@/utils/cotizacion-document";
import {
  buildReadableCotizacionPdfFileName,
  downloadPdfBlob,
  exportCotizacionElementToPdf,
  formatCotizacionPdfError,
} from "@/utils/cotizacion-pdf";
import { resolveCotizacionItemDrawingSvg } from "@/features/cotizaciones/visual-composer/services/resolve-item-drawing-svg";
import {
  formatQuoteCurrency,
  formatQuoteTaxLabel,
  resolveQuoteRegionSnapshotForDisplay,
} from "@/features/organization-region/services/quote-region-display.service";
import type { QuoteRegionSnapshot } from "@/features/organization-region/types/quote-region-snapshot";
import {
  buildCotizacionItemSheetSchemeLabel,
  decodeCotizacionItemPresentationMeta,
  shouldShowCotizacionItemSheetSchemeSpec,
} from "@/utils/cotizacion-item-presentation";

import printStyles from "../../../print/cotizaciones/[id]/page.module.css";
import { buildCotizacionItemPrintSpecs } from "../../../print/cotizaciones/[id]/_utils/item-print-specs";
import s from "./page.module.css";

const FIRST_PAGE_COMPONENTS = 3;
const NEXT_PAGE_COMPONENTS = 3;
const APP_NAME = "Ventora";
const DEFAULT_DOCUMENT_BRAND_COLOR = "#335ea9";

type PublicPreviewItem = {
  id: string;
  codigo: string;
  tipoItem?: string | null;
  tipo: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  vidrio: string;
  ancho: number | null;
  alto: number | null;
  precioUnitario: number;
  precioTotal: number;
  observaciones: string;
};

type PublicPreviewQuote = {
  codigo: string;
  clienteNombre: string;
  obra: string;
  validez: string;
  observaciones: string;
  subtotal: number;
  descuentoPct: number;
  iva: number;
  flete: number;
  total: number;
  regionalSnapshot?: QuoteRegionSnapshot | null;
  pricingMode?: "por_item" | "total_global";
  createdAt: string | null;
  updatedAt: string | null;
  items: PublicPreviewItem[];
  organizationProfile: {
    empresaNombre: string;
    empresaLogoUrl: string | null;
    responsableComercial?: string;
    empresaDireccion: string;
    empresaTelefono: string;
    empresaEmail: string;
    brandColor: string;
    formaPago: string;
  };
};

type PublicQuoteDocumentProps = {
  quote: PublicPreviewQuote;
  backHref: string;
  downloadOnLoad: boolean;
  embedded: boolean;
};

type PrintPagePlan =
  | {
      kind: "cover";
      startIndex: number;
      items: PublicPreviewItem[];
    }
  | {
      kind: "components";
      startIndex: number;
      items: PublicPreviewItem[];
    };

type ItemPresentation = {
  colorHex: string;
  material: string;
  referencia: string;
  hojasBase: 1 | 2 | null;
  sheetScheme: string;
  sheetVariant: string;
  customSchemeDescription: string;
  isCustomScheme: boolean;
  colorName: string;
  surface: string;
  specs: Array<{ key: string; value: string }>;
  drawingSvg: string;
};

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

function buildPrintPlan(items: PublicPreviewItem[]): PrintPagePlan[] {
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

function formatPageNumber(current: number, total: number) {
  return `${String(current).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
}

function formatDueDate(baseDateValue: string | null, validez: string) {
  const fallbackDate = new Date().toISOString();
  const baseDate = new Date(baseDateValue ?? fallbackDate);

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

function buildPublicQuotePdfFileName(quote: PublicPreviewQuote) {
  return buildReadableCotizacionPdfFileName(quote);
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function resolveDocumentBrandColor(value: string) {
  const normalized = value.trim();

  return isHexColor(normalized) ? normalized : DEFAULT_DOCUMENT_BRAND_COLOR;
}

function hexToRgbChannels(value: string) {
  const normalized = resolveDocumentBrandColor(value).replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

function ClientField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={printStyles.clientField}>
      <span className={printStyles.clientBullet} aria-hidden />
      <div className={printStyles.clientFieldBody}>
        <span className={printStyles.clientLabel}>{label}</span>
        <strong className={printStyles.clientValue}>{value || "Por definir"}</strong>
      </div>
    </div>
  );
}

export function PublicQuoteDocument({
  quote,
  backHref,
  downloadOnLoad,
  embedded,
}: PublicQuoteDocumentProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const didAutoDownloadRef = useRef(false);
  const quoteRegion = resolveQuoteRegionSnapshotForDisplay(quote.regionalSnapshot);
  const formatMoney = (value: number) => formatQuoteCurrency(value, quote.regionalSnapshot);
  const taxLabel = formatQuoteTaxLabel(quote.regionalSnapshot);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [embeddedScale, setEmbeddedScale] = useState(1);
  const [embeddedWidth, setEmbeddedWidth] = useState(0);
  const [embeddedHeight, setEmbeddedHeight] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(0);
  const companyName = buildDocumentCompanyName(
    quote.organizationProfile.empresaNombre
  );
  const commercialResponsibleDisplay = quote.organizationProfile.responsableComercial?.trim()
    ? `Cotiza: ${quote.organizationProfile.responsableComercial.trim()}`
    : "";
  const companyLogoFallbackLabel = buildDocumentInitials(companyName);
  const companyLogoUrl = quote.organizationProfile.empresaLogoUrl;
  const shouldShowCompanyLogo =
    Boolean(companyLogoUrl) && failedLogoUrl !== companyLogoUrl;
  const brandColor = resolveDocumentBrandColor(quote.organizationProfile.brandColor);
  const brandRgb = hexToRgbChannels(brandColor);
  const documentStyle = {
    "--brand": brandColor,
    "--brand-soft": `rgba(${brandRgb}, 0.1)`,
    "--brand-ring": `rgba(${brandRgb}, 0.14)`,
  } as CSSProperties;

  useEffect(() => {
    if (!downloadOnLoad || didAutoDownloadRef.current) {
      return;
    }

    didAutoDownloadRef.current = true;

    const timer = window.setTimeout(() => {
      const run = async () => {
        if (!sheetRef.current) {
          return;
        }

        try {
          setDownloadError(null);
          const fileName = buildPublicQuotePdfFileName(quote);
          const { blob } = await exportCotizacionElementToPdf({
            element: sheetRef.current,
            fileName,
            cacheKey: `public-document-${quote.codigo}-${quote.updatedAt ?? quote.createdAt ?? "0"}`,
            pageSelector: `.${printStyles.pdfPage}`,
          });

      await downloadPdfBlob(blob, fileName);
        } catch (error) {
          setDownloadError(formatCotizacionPdfError(error));
        }
      };

      void run();
    }, 320);

    return () => window.clearTimeout(timer);
  }, [downloadOnLoad, quote]);

  useEffect(() => {
    if (!embedded || typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      return;
    }

    const viewportNode = viewportRef.current;
    const sheetNode = sheetRef.current;

    if (!viewportNode || !sheetNode) {
      return;
    }

    const updateMetrics = () => {
      const nextWidth = sheetNode.scrollWidth;
      const nextHeight = sheetNode.scrollHeight;
      const availableWidth = viewportNode.clientWidth;

      if (!nextWidth || !nextHeight || !availableWidth) {
        return;
      }

      setEmbeddedWidth(nextWidth);
      setEmbeddedHeight(nextHeight);
      setEmbeddedScale(Math.min(0.82, Math.max(0.56, availableWidth / nextWidth)));
    };

    updateMetrics();

    const observer = new ResizeObserver(() => updateMetrics());
    observer.observe(viewportNode);
    observer.observe(sheetNode);
    window.addEventListener("resize", updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [embedded, quote.codigo, quote.items.length]);

  useEffect(() => {
    if (embedded || typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      return;
    }

    const viewportNode = viewportRef.current;
    const sheetNode = sheetRef.current;

    if (!viewportNode || !sheetNode) {
      return;
    }

    const updateMetrics = () => {
      const nextWidth = sheetNode.scrollWidth;
      const nextHeight = sheetNode.scrollHeight;
      const availableWidth = viewportNode.clientWidth;

      if (!nextWidth || !nextHeight || !availableWidth) {
        return;
      }

      setPreviewWidth(nextWidth);
      setPreviewHeight(nextHeight);
      setPreviewScale(Math.min(1, Math.max(0.34, availableWidth / nextWidth)));
    };

    updateMetrics();

    const observer = new ResizeObserver(() => updateMetrics());
    observer.observe(viewportNode);
    observer.observe(sheetNode);
    window.addEventListener("resize", updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [embedded, quote.codigo, quote.items.length]);

  const baseDate = quote.updatedAt ?? quote.createdAt ?? new Date().toISOString();
  const dueDate = formatDueDate(baseDate, quote.validez);
  const companyAddressPrimaryDisplay = quote.organizationProfile.empresaDireccion.trim();
  const companyAddressSecondaryClean = buildDocumentContactLine([
    formatDocumentCompanyPhoneNumber(quote.organizationProfile.empresaTelefono),
    quote.organizationProfile.empresaEmail,
  ]);
  const hasNormalizedCompanyAddress = Boolean(
    companyAddressPrimaryDisplay || companyAddressSecondaryClean
  );
  const hasCompanyHeaderDetails = Boolean(
    commercialResponsibleDisplay || hasNormalizedCompanyAddress
  );
  const paymentTermsDisplay = resolveDocumentPaymentTerms(
    quote.organizationProfile.formaPago
  );

  const discountValue = useMemo(
    () => Math.round(quote.subtotal * (quote.descuentoPct / 100)),
    [quote.descuentoPct, quote.subtotal]
  );
  const neto = Math.max(0, quote.subtotal - discountValue);
  const showItemPrices = quote.pricingMode !== "total_global";
  const totalGlobalLeadItem = useMemo(() => {
    if (quote.pricingMode !== "total_global") {
      return null;
    }

    return (
      quote.items.find((item) => {
        const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
        return item.tipoItem === "item_libre_con_valor" || meta.displayMode === "item_libre";
      }) ?? null
    );
  }, [quote.items, quote.pricingMode]);
  const printableItems = useMemo(() => {
    if (quote.pricingMode !== "total_global" || !totalGlobalLeadItem) {
      return quote.items;
    }

    return quote.items.filter((item) => item.id !== totalGlobalLeadItem.id);
  }, [quote.items, quote.pricingMode, totalGlobalLeadItem]);
  const globalIvaLabel = quote.pricingMode === "total_global" && quote.iva > 0 ? "IVA incluido" : "Sin IVA";
  const detailHeadingLabel = showItemPrices
    ? "COMPONENTES COTIZADOS - OFERTA CLIENTE"
    : "DETALLES INCLUIDOS - OFERTA CLIENTE";

  const { printPages, totalSurfaceM2 } = useMemo(() => {
    const nextPrintPages = buildPrintPlan(printableItems);
    const nextTotalSurfaceM2 = printableItems.reduce((accumulator, item) => {
      if (item.ancho && item.alto) {
        return accumulator + (item.ancho * item.alto * item.cantidad) / 1_000_000;
      }

      return accumulator;
    }, 0);

    return {
      printPages: nextPrintPages,
      totalSurfaceM2: nextTotalSurfaceM2,
    };
  }, [printableItems]);

  const itemPresentationMap = useMemo(() => {
    const map = new Map<string, ItemPresentation>();

    for (const item of quote.items) {
      const {
        colorHex,
        material,
        referencia,
        catalogCategoria,
        catalogEspesor,
        catalogTerminacion,
        sistema,
        configuracion,
        hojasBase,
        sheetScheme,
        sheetVariant,
        customSchemeDescription,
        isCustomScheme,
        guidedVisualConfig,
      } = decodeCotizacionItemPresentationMeta(item.observaciones);
      const colorName = getColorName(colorHex);
      const surface = formatSurface(item.ancho, item.alto, item.cantidad);
      const referenceParts = splitComponentReference(referencia, item.tipo);
      const resolvedSystem = sistema || referenceParts.sistema;
      const resolvedConfiguration = configuracion || referenceParts.configuracion;
      const systemLabel = resolvedSystem || "-";
      const lineLabel = referencia || "-";
      const sheetSchemeLabel = buildCotizacionItemSheetSchemeLabel({
        sheetScheme,
        sheetVariant,
        customSchemeDescription,
        isCustomScheme,
      });
      const shouldShowSheetSchemeSpec = shouldShowCotizacionItemSheetSchemeSpec({
        itemName: item.nombre,
        sheetSchemeLabel,
        sheetScheme,
        sheetVariant,
        customSchemeDescription,
      });
      const specs = [
        { key: "Dimensiones", value: formatDimensions(item.ancho, item.alto) },
        ...(shouldShowSheetSchemeSpec ? [{ key: "Esquema", value: sheetSchemeLabel }] : []),
        { key: "Sistema", value: systemLabel },
        { key: "Línea", value: lineLabel },
        { key: "Material", value: material },
        { key: "Color", value: colorName },
        { key: "Vidrio", value: item.vidrio || "-" },
        { key: "Superficie", value: surface },
      ];

      const glassSpecs = buildCotizacionItemPrintSpecs({
        tipo: item.tipo,
        dimensionsLabel: formatDimensions(item.ancho, item.alto),
        surfaceLabel: surface,
        vidrio: item.vidrio || "-",
        material,
        catalogCategoria,
        catalogEspesor,
        catalogTerminacion,
        colorName,
        systemLabel,
        lineLabel,
        configuracion: configuracion || undefined,
        sheetSchemeLabel,
        shouldShowSheetSchemeSpec,
      });
      const itemSpecs =
        catalogCategoria === "vidrio" || material === "Cristal" ? glassSpecs : specs;

      map.set(item.id, {
        colorHex,
        material,
        referencia,
        hojasBase,
        sheetScheme,
        sheetVariant,
        customSchemeDescription,
        isCustomScheme,
        colorName,
        surface,
        specs: itemSpecs,
        drawingSvg: resolveCotizacionItemDrawingSvg({
          tipo: item.tipo,
          sistema: resolvedSystem,
          configuracion: resolvedConfiguration,
          hojasBase,
          sheetScheme,
          sheetVariant,
          customSchemeDescription,
          isCustomScheme,
          referencia,
          ancho: item.ancho,
          alto: item.alto,
          colorHex,
          guidedVisualConfig,
          maxW: 470,
          maxH: 260,
          variant: "pdf",
        }),
      });
    }

    return map;
  }, [quote.items]);

  return (
    <main className={`${s.page} ${embedded ? s.pageEmbedded : ""}`} style={documentStyle}>
      <div className={s.shell}>
        {!embedded ? (
          <div className={s.toolbar}>
            <Link className={s.toolbarLink} href={backHref}>
              <LuArrowLeft aria-hidden />
              Volver al presupuesto
            </Link>
            <div className={s.toolbarInfo}>
              <span className={s.eyebrow}>Documento publico</span>
              <h1 className={s.title}>{quote.codigo}</h1>
            </div>
            <button className={s.toolbarAction} type="button" onClick={() => window.print()}>
              <LuDownload aria-hidden />
              Descargar / imprimir
            </button>
          </div>
        ) : null}

        {!embedded ? (
          <p className={s.note}>
            {downloadError
              ? `No pudimos generar el PDF automaticamente: ${downloadError}`
              : downloadOnLoad
              ? "Estamos preparando el PDF para que puedas guardarlo desde el telefono."
              : "Aqui ves la propuesta completa lista para revisar, guardar o imprimir."}
          </p>
        ) : null}

        <div
          ref={viewportRef}
          className={`${s.sheetWrap} ${embedded ? s.embeddedViewport : ""}`}
          style={
            !embedded && previewWidth > 0 && previewHeight > 0
              ? {
                  height: `${Math.round(previewHeight * previewScale)}px`,
                }
              : undefined
          }
        >
          <div
            className={embedded ? s.embeddedScaleFrame : s.sheetScaleFrame}
            style={
              embedded && embeddedWidth > 0 && embeddedHeight > 0
                ? {
                    width: `${Math.round(embeddedWidth * embeddedScale)}px`,
                    height: `${Math.round(embeddedHeight * embeddedScale)}px`,
                  }
                : !embedded && previewWidth > 0 && previewHeight > 0
                  ? {
                      width: `${previewWidth}px`,
                      height: `${previewHeight}px`,
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                    }
                : undefined
            }
          >
            <section
              ref={sheetRef}
              className={printStyles.sheet}
              style={
                embedded && embeddedWidth > 0
                  ? {
                      width: `${embeddedWidth}px`,
                      transform: `scale(${embeddedScale})`,
                      transformOrigin: "top left",
                    }
                  : undefined
              }
            >
            {printPages.map((pagePlan, pageIndex) => {
              const pageNumber = pageIndex + 1;
              const totalPages = printPages.length;
              const isLastPage = pageNumber === totalPages;

              return (
                <article key={`${pagePlan.kind}-${pageNumber}`} className={printStyles.pdfPage}>
                  <div className={printStyles.softwareSignature}>
                    <span className={printStyles.softwareSignaturePrefix}>Powered by</span>
                    <strong className={printStyles.softwareSignatureName}>{APP_NAME}</strong>
                    <span className={printStyles.softwareSignatureVersion}>v2.0</span>
                  </div>

                  <header className={printStyles.pageHeader}>
                    <div className={printStyles.companyBlock}>
                      <div className={printStyles.companyLogoWrap}>
                        {shouldShowCompanyLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={companyName}
                            className={printStyles.companyLogo}
                            height={76}
                            loading="eager"
                            onError={() => setFailedLogoUrl(companyLogoUrl)}
                            src={companyLogoUrl ?? undefined}
                            width={76}
                          />
                        ) : (
                          <div className={printStyles.companyLogoFallback}>
                            {companyLogoFallbackLabel}
                          </div>
                        )}
                      </div>

                      <div className={printStyles.companyMeta}>
                        <strong className={printStyles.companyName}>
                          {companyName}
                        </strong>
                        <div className={printStyles.companyAddress}>
                          {commercialResponsibleDisplay ? (
                            <span className={printStyles.companyAddressPrimary}>
                              {commercialResponsibleDisplay}
                            </span>
                          ) : null}
                          {hasCompanyHeaderDetails ? (
                            <>
                              {companyAddressPrimaryDisplay ? (
                                <span className={printStyles.companyAddressPrimary}>
                                  {companyAddressPrimaryDisplay}
                                </span>
                              ) : null}
                              {companyAddressSecondaryClean ? (
                                <span className={printStyles.companyAddressSecondary}>
                                  {companyAddressSecondaryClean}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className={printStyles.companyAddressSecondary}>
                              Perfil comercial aún no configurado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={printStyles.quoteMeta}>
                      <span className={printStyles.quoteMetaEyebrow}>Cotización N°</span>
                      <strong>{quote.codigo}</strong>
                      <span className={printStyles.quoteMetaDate}>
                        Fecha: {formatCotizacionDate(baseDate)}
                      </span>
                      <span className={printStyles.quoteMetaDue}>Vigencia: hasta {dueDate}</span>
                    </div>
                  </header>

                  {pagePlan.kind === "cover" ? (
                    <section className={printStyles.clientPanel}>
                      <div className={printStyles.clientPanelHeader}>
                        <span className={printStyles.sectionLabel}>DATOS DEL CLIENTE</span>
                      </div>

                      <div className={printStyles.clientGrid}>
                        <ClientField label="Cliente" value={quote.clienteNombre} />
                        <ClientField label="Obra" value={quote.obra} />
                        <ClientField label="Version" value={quote.codigo} />
                        <ClientField label="Fecha" value={formatCotizacionDate(baseDate)} />
                      </div>
                    </section>
                  ) : null}

                  {pagePlan.kind === "cover" && totalGlobalLeadItem ? (
                    <section className={printStyles.globalWorkSummary}>
                      <div className={printStyles.globalWorkSummaryHeader}>
                        <span className={printStyles.sectionLabel}>TRABAJO GENERAL</span>
                      </div>
                      <strong className={printStyles.globalWorkSummaryTitle}>
                        {totalGlobalLeadItem.nombre}
                      </strong>
                      <p className={printStyles.globalWorkSummaryDescription}>
                        {totalGlobalLeadItem.descripcion?.trim() || totalGlobalLeadItem.nombre}
                      </p>
                      <div className={printStyles.globalWorkSummaryMeta}>
                        <span>{globalIvaLabel}</span>
                        <span>Precio final visible para cliente</span>
                      </div>
                    </section>
                  ) : null}

                  <section className={printStyles.detailHeading}>
                    <span className={printStyles.detailLabel}>{detailHeadingLabel}</span>
                  </section>

                  <div className={printStyles.componentList}>
                    {pagePlan.items.length === 0 ? (
                      <p className={printStyles.conditionsText}>
                        {totalGlobalLeadItem
                          ? "Sin detalles incluidos adicionales en este presupuesto."
                          : "Esta cotizacion aun no tiene items cargados. Vuelve al detalle si necesitas completarla antes de compartir el PDF definitivo."}
                      </p>
                    ) : null}
                    {pagePlan.items.map((item, itemIndex) => {
                      const absoluteIndex = pagePlan.startIndex + itemIndex + 1;
                      const presentation = itemPresentationMap.get(item.id);
                      const itemMeta = decodeCotizacionItemPresentationMeta(item.observaciones);
                      const isFreeValueItem =
                        item.tipoItem === "item_libre_con_valor" ||
                        itemMeta.displayMode === "item_libre";
                      const shouldShowItemPrice =
                        showItemPrices || (isFreeValueItem && item.precioTotal > 0);
                      const colorHex = presentation?.colorHex ?? "#a8a8a8";
                      const material = presentation?.material ?? "Material a definir";
                      const colorName = presentation?.colorName ?? "Color a definir";
                      const surface = presentation?.surface ?? "-";
                      const fallbackSpecs = buildCotizacionItemPrintSpecs({
                        tipo: item.tipo,
                        dimensionsLabel: formatDimensions(item.ancho, item.alto),
                        surfaceLabel: surface,
                        vidrio: item.vidrio || "-",
                        material,
                        catalogCategoria: itemMeta.catalogCategoria,
                        catalogEspesor: itemMeta.catalogEspesor,
                        catalogTerminacion: itemMeta.catalogTerminacion,
                        colorName,
                        systemLabel: "-",
                        lineLabel: "-",
                      });
                      const specs =
                        presentation?.specs ?? fallbackSpecs ?? [
                          { key: "Dimensiones", value: formatDimensions(item.ancho, item.alto) },
                          { key: "Material", value: material },
                          { key: "Color", value: colorName },
                          { key: "Referencia", value: "-" },
                          { key: "Vidrio", value: item.vidrio || "-" },
                          { key: "Superficie", value: surface },
                        ];
                      const drawingSvg =
                        presentation?.drawingSvg ??
                        resolveCotizacionItemDrawingSvg({
                          tipo: item.tipo,
                          hojasBase: presentation?.hojasBase,
                          sheetScheme: presentation?.sheetScheme,
                          sheetVariant: presentation?.sheetVariant,
                          customSchemeDescription: presentation?.customSchemeDescription,
                          isCustomScheme: presentation?.isCustomScheme,
                          referencia: presentation?.referencia,
                          ancho: item.ancho,
                          alto: item.alto,
                          colorHex,
                          guidedVisualConfig: itemMeta.guidedVisualConfig,
                          maxW: 470,
                          maxH: 260,
                          variant: "pdf",
                        });

                      return (
                        <article key={item.id} className={printStyles.componentCard}>
                          <div className={printStyles.itemBadge}>
                            {`ITEM ${String(absoluteIndex).padStart(2, "0")}`}
                          </div>

                          <div className={printStyles.componentHeader}>
                            <div className={printStyles.componentTitleRow}>
                              <h2 className={printStyles.itemName}>{item.nombre}</h2>
                            </div>

                          </div>

                          <div className={printStyles.componentBody}>
                            {isFreeValueItem ? (
                              <div className={printStyles.drawingColumn}>
                                <div className={printStyles.drawingFrame}>
                                  <div className={printStyles.itemTextOnlyBox}>
                                    <strong>{item.nombre}</strong>
                                    <span>{item.descripcion || "Trabajo incluido en el presupuesto."}</span>
                                  </div>
                                </div>
                                <span className={printStyles.drawingCaption}>
                                  DESCRIPCION COMERCIAL
                                </span>
                              </div>
                            ) : (
                              <div className={printStyles.drawingColumn}>
                                <div className={printStyles.drawingFrame}>
                                  <div
                                    className={printStyles.drawingSvg}
                                    dangerouslySetInnerHTML={{ __html: drawingSvg }}
                                  />
                                </div>
                                <span className={printStyles.drawingCaption}>
                                  VISTA INTERIOR REFERENCIAL
                                </span>
                              </div>
                            )}

                            <div className={printStyles.componentInfoColumn}>
                              <div className={printStyles.specsColumn}>
                                <div className={printStyles.infoSectionHeading}>
                                  CARACTERÍSTICAS
                                </div>
                                {specs.map((spec) => (
                                  <div
                                    key={spec.key}
                                    className={[
                                      printStyles.specRow,
                                      spec.key === "Dimensiones"
                                        ? printStyles.specDimensionRow
                                        : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  >
                                    <span className={printStyles.specBullet} aria-hidden />
                                    <span className={printStyles.specKey}>{spec.key}</span>
                                    <span className={printStyles.specValue}>{spec.value}</span>
                                  </div>
                                ))}
                              </div>

                              {shouldShowItemPrice ? (
                              <aside className={printStyles.pricesColumn}>
                                <div className={printStyles.pricesHeading}>VALOR COMERCIAL</div>
                                <div className={printStyles.pricesSubheading}>
                                  MONTOS EN {quoteRegion.currencyCode}
                                </div>

                                <div className={printStyles.priceRow}>
                                  <span>Precio unitario</span>
                                  <strong>{formatMoney(item.precioUnitario)}</strong>
                                </div>
                                <div className={printStyles.priceRow}>
                                  <span>Cantidad</span>
                                  <strong>{item.cantidad}</strong>
                                </div>

                                <div className={printStyles.priceTotal}>
                                  <span>Total ítem</span>
                                  <strong>{formatMoney(item.precioTotal)}</strong>
                                </div>
                              </aside>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {isLastPage ? (
                    <>
                        {paymentTermsDisplay ? (
                          <section className={printStyles.paymentBand}>
                            <span className={printStyles.paymentLabel}>Forma de pago:</span>
                            <span className={printStyles.paymentValue}>
                              {paymentTermsDisplay}
                            </span>
                          </section>
                        ) : null}

                      <section className={printStyles.summarySection}>
                        {showItemPrices ? (
                          <section className={printStyles.conditionsColumn}>
                            <span className={printStyles.summaryLabel}>CONDICIONES</span>
                            <p className={printStyles.conditionsText}>
                              {resolveDocumentConditionsText(quote.observaciones)}
                            </p>
                          </section>
                        ) : null}

                        <aside className={printStyles.totalsColumn}>
                          <span className={printStyles.summaryLabel}>RESUMEN FINAL</span>
                          <div className={printStyles.totalRow}>
                            <span>Subtotal</span>
                            <strong>{formatMoney(quote.subtotal)}</strong>
                          </div>
                          <div className={printStyles.totalRow}>
                            <span>Descuento</span>
                            <strong>- {formatMoney(discountValue)}</strong>
                          </div>
                          <div className={`${printStyles.totalRow} ${printStyles.totalRowStrong}`}>
                            <span>Neto</span>
                            <strong>{formatMoney(neto)}</strong>
                          </div>
                          <div className={printStyles.totalRow}>
                            <span>{taxLabel}</span>
                            <strong>{formatMoney(quote.iva)}</strong>
                          </div>
                          {showItemPrices && quote.flete > 0 ? (
                            <div className={printStyles.totalRow}>
                              <span>Flete</span>
                              <strong>{formatMoney(quote.flete)}</strong>
                            </div>
                          ) : null}
                          {showItemPrices ? (
                            <div className={`${printStyles.totalRow} ${printStyles.totalRowStrong}`}>
                              <span>Carpinteria total</span>
                              <strong>{totalSurfaceM2.toFixed(2)} m2</strong>
                            </div>
                          ) : null}
                        </aside>
                      </section>

                      <section className={printStyles.grandTotal}>
                        <span>{showItemPrices ? "Total presupuesto" : "Precio final"}</span>
                        <strong>{formatMoney(quote.total)}</strong>
                      </section>
                    </>
                  ) : null}

                  <footer className={printStyles.pageFooter}>
                    <span className={printStyles.footerBranding}>
                      Sistema generado por <strong>{APP_NAME}</strong>
                    </span>
                    <div className={printStyles.footerMeta}>
                      <div
                        className={printStyles.footerPager}
                        aria-label={`Pagina ${formatPageNumber(pageNumber, totalPages)}`}
                      >
                        <div className={printStyles.footerPagerValue}>
                          <span className={printStyles.footerPagerCurrent}>
                            {String(pageNumber).padStart(2, "0")}
                          </span>
                          <span className={printStyles.footerPagerTotal}>
                            /{String(totalPages).padStart(2, "0")}
                          </span>
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
      </div>
    </main>
  );
}
