"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuDownload } from "react-icons/lu";

import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { resolveComponentColorName } from "@/constants/component-colors";
import { downloadPdfBlob, exportCotizacionElementToPdf } from "@/utils/cotizacion-pdf";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { generateComponentSVG } from "@/utils/window-drawings";

import printStyles from "../../../print/cotizaciones/[id]/page.module.css";
import s from "./page.module.css";

const FIRST_PAGE_COMPONENTS = 3;
const NEXT_PAGE_COMPONENTS = 3;
const APP_NAME = "Ventora";

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

type PublicPreviewItem = {
  id: string;
  codigo: string;
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
  createdAt: string | null;
  updatedAt: string | null;
  items: PublicPreviewItem[];
  organizationProfile: {
    empresaNombre: string;
    empresaLogoUrl: string | null;
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
  colorName: string;
  surface: string;
  specs: Array<{ key: string; value: string }>;
  drawingSvg: string;
};

// Compat temporal: mantener mapa local hasta limpiar encoding histórico de este bloque.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COLOR_NAMES: Record<string, string> = {
  "#a8a8a8": "Aluminio natural",
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

function CLP(value: number) {
  return clpFormatter.format(value);
}

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

function formatCompanyPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const normalized = digits.startsWith("56")
    ? digits
    : digits.startsWith("9") && digits.length === 9
      ? `56${digits}`
      : digits;

  if (normalized.length === 11 && normalized.startsWith("569")) {
    return `+56 9 ${normalized.slice(3, 7)} ${normalized.slice(7)}`;
  }

  return phone.trim();
}

function buildPublicQuotePdfFileName(quote: PublicPreviewQuote) {
  const slug = `${quote.codigo}-${quote.obra}`
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "presupuesto"}.pdf`;
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
  const [embeddedScale, setEmbeddedScale] = useState(1);
  const [embeddedWidth, setEmbeddedWidth] = useState(0);
  const [embeddedHeight, setEmbeddedHeight] = useState(0);

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

        const fileName = buildPublicQuotePdfFileName(quote);
        const { blob } = await exportCotizacionElementToPdf({
          element: sheetRef.current,
          fileName,
          cacheKey: `public-document-${quote.codigo}-${quote.updatedAt ?? quote.createdAt ?? "0"}`,
          pageSelector: `.${printStyles.pdfPage}`,
        });

        downloadPdfBlob(blob, fileName);
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

  const companyAddressPrimary = quote.organizationProfile.empresaDireccion;
  const companyAddressSecondary = [
    formatCompanyPhoneNumber(quote.organizationProfile.empresaTelefono),
    quote.organizationProfile.empresaEmail,
  ]
    .filter(Boolean)
    .join(" · ");
  const hasCompanyAddress = Boolean(companyAddressPrimary || companyAddressSecondary);
  const companyAddressSecondaryDisplay = companyAddressSecondary.replaceAll("Â·", "·");
  const paymentTerms = quote.organizationProfile.formaPago.trim();
  const baseDate = quote.updatedAt ?? quote.createdAt ?? new Date().toISOString();
  const dueDate = formatDueDate(baseDate, quote.validez);

  const discountValue = useMemo(
    () => Math.round(quote.subtotal * (quote.descuentoPct / 100)),
    [quote.descuentoPct, quote.subtotal]
  );
  const neto = Math.max(0, quote.subtotal - discountValue);

  const { printPages, totalSurfaceM2 } = useMemo(() => {
    const nextPrintPages = buildPrintPlan(quote.items);
    const nextTotalSurfaceM2 = quote.items.reduce((accumulator, item) => {
      if (item.ancho && item.alto) {
        return accumulator + (item.ancho * item.alto * item.cantidad) / 1_000_000;
      }

      return accumulator;
    }, 0);

    return {
      printPages: nextPrintPages,
      totalSurfaceM2: nextTotalSurfaceM2,
    };
  }, [quote.items]);

  const itemPresentationMap = useMemo(() => {
    const map = new Map<string, ItemPresentation>();

    for (const item of quote.items) {
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
  }, [quote.items]);

  return (
    <main className={`${s.page} ${embedded ? s.pageEmbedded : ""}`}>
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
            {downloadOnLoad
              ? "Estamos preparando el PDF para que puedas guardarlo desde el telefono."
              : "Aqui ves la propuesta completa lista para revisar, guardar o imprimir."}
          </p>
        ) : null}

        <div
          ref={embedded ? viewportRef : undefined}
          className={`${s.sheetWrap} ${embedded ? s.embeddedViewport : ""}`}
        >
          <div
            className={embedded ? s.embeddedScaleFrame : undefined}
            style={
              embedded && embeddedWidth > 0 && embeddedHeight > 0
                ? {
                    width: `${Math.round(embeddedWidth * embeddedScale)}px`,
                    height: `${Math.round(embeddedHeight * embeddedScale)}px`,
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
                        {quote.organizationProfile.empresaLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={quote.organizationProfile.empresaNombre}
                            className={printStyles.companyLogo}
                            loading="eager"
                            src={quote.organizationProfile.empresaLogoUrl}
                          />
                        ) : (
                          <div className={printStyles.companyLogoFallback}>
                            {quote.organizationProfile.empresaNombre.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className={printStyles.companyMeta}>
                        <strong className={printStyles.companyName}>
                          {quote.organizationProfile.empresaNombre}
                        </strong>
                        <div className={printStyles.companyAddress}>
                          {hasCompanyAddress ? (
                            <>
                              {companyAddressPrimary ? (
                                <span className={printStyles.companyAddressPrimary}>
                                  {companyAddressPrimary}
                                </span>
                              ) : null}
                              {companyAddressSecondary ? (
                                <span className={printStyles.companyAddressSecondary}>
                                  {companyAddressSecondaryDisplay}
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

                  <section className={printStyles.detailHeading}>
                    <span className={printStyles.detailLabel}>
                      COMPONENTES COTIZADOS - OFERTA CLIENTE
                    </span>
                  </section>

                  <div className={printStyles.componentList}>
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
                          { key: "Referencia", value: "-" },
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

                      return (
                        <article key={item.id} className={printStyles.componentCard}>
                          <div className={printStyles.itemBadge}>
                            {`ITEM ${String(absoluteIndex).padStart(2, "0")}`}
                          </div>

                          <div className={printStyles.componentHeader}>
                            <div className={printStyles.componentTitleRow}>
                              <h2 className={printStyles.itemName}>{item.nombre}</h2>
                            </div>

                            <div className={printStyles.itemChips}>
                              <span className={printStyles.itemChip}>{item.tipo}</span>
                              <span className={printStyles.itemChip}>{material}</span>
                              <span className={printStyles.itemChip}>
                                <i
                                  className={printStyles.itemChipDot}
                                  style={{ backgroundColor: colorHex }}
                                  aria-hidden
                                />
                                {colorName}
                              </span>
                              <span className={printStyles.itemChip}>
                                {item.cantidad} {item.cantidad === 1 ? "unidad" : "unidades"}
                              </span>
                              <span className={printStyles.itemChip}>{surface}</span>
                            </div>
                          </div>

                          <div className={printStyles.componentBody}>
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

                            <div className={printStyles.specsColumn}>
                              {specs.map((spec) => (
                                <div key={spec.key} className={printStyles.specRow}>
                                  <span className={printStyles.specBullet} aria-hidden />
                                  <span className={printStyles.specKey}>{spec.key}</span>
                                  <span className={printStyles.specValue}>{spec.value}</span>
                                </div>
                              ))}
                            </div>

                            <aside className={printStyles.pricesColumn}>
                              <div className={printStyles.pricesHeading}>VALOR COMERCIAL</div>
                              <div className={printStyles.pricesSubheading}>MONTOS EN CLP</div>

                              <div className={printStyles.priceRow}>
                                <span>Precio unitario</span>
                                <strong>{CLP(item.precioUnitario)}</strong>
                              </div>
                              <div className={printStyles.priceRow}>
                                <span>Cantidad</span>
                                <strong>{item.cantidad}</strong>
                              </div>

                              <div className={printStyles.priceTotal}>
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
                        <section className={printStyles.paymentBand}>
                          <span className={printStyles.paymentLabel}>Forma de pago:</span>
                          <span className={printStyles.paymentValue}>{paymentTerms}</span>
                        </section>
                      ) : null}

                      <section className={printStyles.summarySection}>
                        <section className={printStyles.conditionsColumn}>
                          <span className={printStyles.summaryLabel}>CONDICIONES</span>
                          <p className={printStyles.conditionsText}>
                            {quote.observaciones.trim() || "Sin observaciones adicionales."}
                          </p>
                        </section>

                        <aside className={printStyles.totalsColumn}>
                          <span className={printStyles.summaryLabel}>RESUMEN FINAL</span>
                          <div className={printStyles.totalRow}>
                            <span>Subtotal</span>
                            <strong>{CLP(quote.subtotal)}</strong>
                          </div>
                          <div className={printStyles.totalRow}>
                            <span>Descuento</span>
                            <strong>- {CLP(discountValue)}</strong>
                          </div>
                          <div className={`${printStyles.totalRow} ${printStyles.totalRowStrong}`}>
                            <span>Neto</span>
                            <strong>{CLP(neto)}</strong>
                          </div>
                          <div className={printStyles.totalRow}>
                            <span>IVA 19%</span>
                            <strong>{CLP(quote.iva)}</strong>
                          </div>
                          {quote.flete > 0 ? (
                            <div className={printStyles.totalRow}>
                              <span>Flete</span>
                              <strong>{CLP(quote.flete)}</strong>
                            </div>
                          ) : null}
                          <div className={`${printStyles.totalRow} ${printStyles.totalRowStrong}`}>
                            <span>Carpinteria total</span>
                            <strong>{totalSurfaceM2.toFixed(2)} m2</strong>
                          </div>
                        </aside>
                      </section>

                      <section className={printStyles.grandTotal}>
                        <span>Total presupuesto</span>
                        <strong>{CLP(quote.total)}</strong>
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
