"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { buildWorkMaterialsDocument } from "@/features/fabricacion/services/fabrication-work-materials.service";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { normalizeQuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { DespieceReviewSurface } from "@/features/cotizaciones/visual-composer/components/despiece-review-surface";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";

import { FabricacionResumenMovil } from "./fabricacion-resumen-movil";
import { FabricacionResumenView } from "./fabricacion-resumen-view";
import { CostoTecnicoParcialPanel } from "./costo-tecnico-parcial-panel";
import s from "./page.module.css";

async function loadVentoraPdfLogo() {
  let objectUrl: string | null = null;
  try {
    const response = await fetch("/brand/ventora-logo-boot.svg");
    if (!response.ok) return null;
    const svg = await response.text();
    const image = new window.Image();
    objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 212;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Print interno de fabricación / pauta.
 * Separado del PDF comercial del cliente.
 */
export default function CotizacionFabricacionPrintPage() {
  const params = useParams<{ id: string }>();
  const { getCotizacionById, loadCotizacionById, isReady } = useCotizacionesStore({
    autoLoadSummary: false,
  });
  const cotizacion = getCotizacionById(params.id);
  const { templates: lineTemplates } = useCotizacionLineTemplates({ activeOnly: true });
  const { profile: organizationProfile } = useOrganizationProfile();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [despieceOpen, setDespieceOpen] = useState(false);
  const [despieceItemId, setDespieceItemId] = useState<string | null>(null);
  const [despieceSession, setDespieceSession] = useState(0);
  const [technicalCostSnapshot, setTechnicalCostSnapshot] = useState<TechnicalCostSnapshot | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean | null>(null);
  const documentRef = useRef<HTMLElement | null>(null);
  const printRootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const printRoot = printRootRef.current;
    if (!printRoot) return;

    printRoot.classList.toggle(
      s.iphonePrintRoot,
      /iPhone|iPod/i.test(window.navigator.userAgent)
    );
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 719px)");
    const syncViewport = () => setIsMobileViewport(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await loadCotizacionById(params.id);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "No pudimos cargar la cotización."
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadCotizacionById, params.id]);

  const summary = useMemo(
    () =>
      buildFabricationQuoteSummary(cotizacion?.items ?? [], {
        trabajoSnapshot: cotizacion?.fabricacionTrabajoSnapshot ?? null,
      }),
    [cotizacion?.items, cotizacion?.fabricacionTrabajoSnapshot]
  );

  const materialsDocument = useMemo(
    () => buildWorkMaterialsDocument({
      summary,
      items: cotizacion?.items ?? [],
      lineTemplates,
      technicalCostSnapshot,
    }),
    [summary, cotizacion?.items, lineTemplates, technicalCostSnapshot]
  );
  const issueDate = (() => {
    if (!cotizacion?.createdAt) return "—";
    const date = new Date(cotizacion.createdAt);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(date);
  })();
  const technicalCostPanel: ReactNode = isMobileViewport === null ? null : (
    <CostoTecnicoParcialPanel
      quoteId={String(cotizacion?.id ?? params.id)}
      onSnapshotChange={setTechnicalCostSnapshot}
    />
  );

  const expandedInitializedForQuote = useRef<string | null>(null);

  useEffect(() => {
    if (expandedInitializedForQuote.current === params.id) return;
    const firstId = summary.items[0]?.itemId;
    if (!firstId) return;
    setExpandedItemId(firstId);
    expandedInitializedForQuote.current = params.id;
  }, [params.id, summary.items]);

  const handleToggleItem = useCallback((itemId: string) => {
    setExpandedItemId((current) => (current === itemId ? null : itemId));
  }, []);

  const handleOpenDespiece = useCallback((itemId: string) => {
    setDespieceItemId(itemId);
    setDespieceSession((value) => value + 1);
    setDespieceOpen(true);
  }, []);

  const handleCloseDespiece = useCallback(() => {
    setDespieceOpen(false);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadDocumentPdf = useCallback(
    async (kind: "materials" | "glass-order", element: HTMLElement) => {
      setIsExporting(true);
      setExportError(null);
      let exportHost: HTMLDivElement | null = null;
      try {
        const prefix = kind === "materials" ? "materiales" : "orden-vidrios";
        const documentFileName = `${prefix}-${sanitizeFileNamePart(cotizacion?.codigo || "cotizacion", 36)}.pdf`;
        const { downloadPdfBlob } = await import("@/utils/cotizacion-pdf");
        let blob: Blob;
        if (kind === "materials") {
          const { createWorkMaterialsPdf } = await import("@/features/fabricacion/services/work-materials-pdf-export.service");
          const logoDataUrl = await loadVentoraPdfLogo();
          blob = createWorkMaterialsPdf(materialsDocument, {
            companyName: organizationProfile?.empresaNombre ?? "",
            quoteCode: cotizacion?.codigo ?? "",
            workName: cotizacion?.obra ?? "",
            issueDate,
          }, logoDataUrl).output("blob");
        } else {
          exportHost = window.document.createElement("div");
          const exportElement = element.cloneNode(true) as HTMLElement;
          exportHost.setAttribute("aria-hidden", "true");
          exportHost.style.cssText = "position:fixed;left:-12000px;top:0;width:794px;pointer-events:none;z-index:-1;";
          exportElement.classList.add(s.pdfDocumentExport);
          exportElement.querySelectorAll<HTMLElement>(`.${s.printHide}`).forEach((node) => node.remove());
          exportHost.appendChild(exportElement);
          window.document.body.appendChild(exportHost);
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
          });
          const { exportCotizacionElementToPdf } = await import("@/utils/cotizacion-pdf");
          ({ blob } = await exportCotizacionElementToPdf({
            element: exportElement,
            fileName: documentFileName,
            format: "a4",
            protectedSelectors: [`.${s.materialDocHeader}`, `.${s.materialTableSection} h3`, `.${s.materialTableScroll} thead tr`, `.${s.materialTableScroll} tbody tr`],
          }));
        }
        const result = await downloadPdfBlob(blob, documentFileName);
        if (result === "failed") setExportError("No pudimos descargar el documento. Intenta imprimir y guardar como PDF.");
      } catch (error) {
        const { formatCotizacionPdfError } = await import("@/utils/cotizacion-pdf");
        setExportError(formatCotizacionPdfError(error));
      } finally {
        exportHost?.remove();
        setIsExporting(false);
      }
    },
    [cotizacion, issueDate, materialsDocument, organizationProfile]
  );

  const handleDownload = useCallback(() => {
    const materialsElements = printRootRef.current?.querySelectorAll<HTMLElement>(
      '[data-work-document="materials"]'
    );
    const materialsElement = materialsElements
      ? Array.from(materialsElements).find((element) => element.getClientRects().length > 0) ??
        materialsElements.item(window.matchMedia("(max-width: 719px)").matches ? 1 : 0)
      : null;
    if (!materialsElement) {
      setExportError("No encontramos la lista de materiales para descargar.");
      return;
    }
    void handleDownloadDocumentPdf("materials", materialsElement);
  }, [handleDownloadDocumentPdf]);

  if (!isReady && !cotizacion) {
    return <p className={s.loadingState}>Cargando resumen de fabricación…</p>;
  }

  if (loadError) {
    return (
      <main className={s.printRoot}>
        <p>{loadError}</p>
        <Link href={`/cotizaciones/${params.id}`}>Volver</Link>
      </main>
    );
  }

  if (!cotizacion) {
    return (
      <main className={s.printRoot}>
        <p>No encontramos esta cotización.</p>
        <Link href="/cotizaciones">Ir a cotizaciones</Link>
      </main>
    );
  }

  return (
    <main ref={printRootRef} className={s.printRoot} data-fabricacion-print="1">
      {!summary.trabajoSnapshot && summary.items.length === 0 ? (
        <p role="status" data-testid="fabricacion-historica-ausente">
          Esta cotización no conserva una pauta técnica histórica.
        </p>
      ) : null}
      <div className={s.workspace}>
        <div className={s.desktopFabricacion} data-testid="fabricacion-desktop">
          <FabricacionResumenView
            backHref={`/cotizaciones/${params.id}`}
            pdfHref={`/print/cotizaciones/${params.id}`}
            codigo={cotizacion.codigo}
            clienteNombre={cotizacion.clienteNombre}
            obra={cotizacion.obra}
            summary={summary}
            items={cotizacion.items}
            materialsDocument={materialsDocument}
            companyName={organizationProfile?.empresaNombre ?? ""}
            issueDate={issueDate}
            technicalCostPanel={isMobileViewport ? technicalCostPanel : null}
            onDownloadDocumentPdf={(kind, element) => void handleDownloadDocumentPdf(kind, element)}
            expandedItemId={expandedItemId}
            onToggleItem={handleToggleItem}
            onOpenDespiece={handleOpenDespiece}
            isExporting={isExporting}
            exportError={exportError}
            documentRef={documentRef}
            onDownload={() => void handleDownload()}
            onPrint={handlePrint}
          />
        </div>
        <div className={s.mobileFabricacion}>
          <FabricacionResumenMovil
            backHref={`/cotizaciones/${params.id}`}
            pdfHref={`/print/cotizaciones/${params.id}`}
            codigo={cotizacion.codigo}
            clienteNombre={cotizacion.clienteNombre}
            obra={cotizacion.obra}
            summary={summary}
            items={cotizacion.items}
            materialsDocument={materialsDocument}
            companyName={organizationProfile?.empresaNombre ?? ""}
            issueDate={issueDate}
            technicalCostPanel={isMobileViewport === false ? technicalCostPanel : null}
            onDownloadDocumentPdf={(kind, element) => void handleDownloadDocumentPdf(kind, element)}
            isExporting={isExporting}
            exportError={exportError}
            onDownload={() => void handleDownload()}
            onPrint={handlePrint}
          />
        </div>
      </div>
      <DespieceReviewSurface
        key={despieceSession}
        open={despieceOpen}
        items={cotizacion.items}
        lineTemplates={lineTemplates}
        quotePricingMode={normalizeQuotePricingMode(cotizacion.quotePricingMode)}
        activeItemId={despieceItemId}
        onActiveItemChange={setDespieceItemId}
        onUpdateItem={() => undefined}
        onClose={handleCloseDespiece}
        recipes={[]}
        organizationId={null}
      />
    </main>
  );
}
