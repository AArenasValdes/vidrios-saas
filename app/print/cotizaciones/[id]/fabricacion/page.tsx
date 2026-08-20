"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { normalizeQuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { DespieceReviewSurface } from "@/features/cotizaciones/visual-composer/components/despiece-review-surface";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";

import { FabricacionResumenView } from "./fabricacion-resumen-view";
import s from "./page.module.css";

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
  const {
    organizationId,
    recipes,
    isLoading: isLoadingRecipes,
  } = useFabricationRecipes({ enabled: Boolean(cotizacion) });
  const recipesReady = !isLoadingRecipes && organizationId != null;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [despieceOpen, setDespieceOpen] = useState(false);
  const [despieceItemId, setDespieceItemId] = useState<string | null>(null);
  const [despieceSession, setDespieceSession] = useState(0);
  const documentRef = useRef<HTMLElement | null>(null);

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
        recipes: recipesReady ? recipes : undefined,
        organizationId,
      }),
    [cotizacion?.items, recipes, recipesReady, organizationId]
  );

  const expandedInitializedForQuote = useRef<string | null>(null);

  useEffect(() => {
    if (expandedInitializedForQuote.current === params.id) return;
    const firstId = summary.items[0]?.itemId;
    if (!firstId) return;
    setExpandedItemId(firstId);
    expandedInitializedForQuote.current = params.id;
  }, [params.id, summary.items]);

  const fileName = `fabricacion-${sanitizeFileNamePart(cotizacion?.codigo || "cotizacion", 36)}.pdf`;

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

  const handleDownload = useCallback(async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    setExportError(null);
    documentRef.current.classList.add(s.exporting);
    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });
      const { downloadPdfBlob, exportCotizacionElementToPdf } =
        await import("@/utils/cotizacion-pdf");
      const { blob } = await exportCotizacionElementToPdf({
        element: documentRef.current,
        fileName,
        format: "a4",
        protectedSelectors: [`.${s.itemCard}`, `.${s.totalsStrip}`],
      });
      const result = await downloadPdfBlob(blob, fileName);
      if (result === "failed") {
        setExportError("No pudimos descargar el resumen. Intenta imprimir y guardar como PDF.");
        return;
      }
      toast("Resumen descargado");
    } catch (error) {
      const { formatCotizacionPdfError } = await import("@/utils/cotizacion-pdf");
      setExportError(formatCotizacionPdfError(error));
    } finally {
      documentRef.current?.classList.remove(s.exporting);
      setIsExporting(false);
    }
  }, [fileName]);

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
    <main className={s.printRoot} data-fabricacion-print="1">
      <div className={s.workspace}>
        <FabricacionResumenView
          backHref={`/cotizaciones/${params.id}`}
          pdfHref={`/print/cotizaciones/${params.id}`}
          codigo={cotizacion.codigo}
          clienteNombre={cotizacion.clienteNombre}
          obra={cotizacion.obra}
          summary={summary}
          items={cotizacion.items}
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
      />
    </main>
  );
}
