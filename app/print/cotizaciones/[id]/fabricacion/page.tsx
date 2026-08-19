"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuDownload, LuPrinter } from "react-icons/lu";
import { toast } from "sonner";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import {
  buildFabricationQuoteSummary,
  formatFabricationItemLineCaption,
} from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { herrajeDisplayLabel } from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";

import s from "./page.module.css";

function formatMl(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ml`;
}

function formatM2(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m²`;
}

function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
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
    () => buildFabricationQuoteSummary(cotizacion?.items ?? []),
    [cotizacion?.items]
  );

  const fileName = `fabricacion-${sanitizeFileNamePart(cotizacion?.codigo || "cotizacion", 36)}.pdf`;

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    setExportError(null);
    documentRef.current.classList.add(s.exporting);
    try {
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve())
      );
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
      <div className={s.toolbar} data-print-hide="1">
        <Link href={`/cotizaciones/${params.id}`} className={s.backLink}>
          <LuArrowLeft aria-hidden />
          <span>Volver</span>
        </Link>
        <Link href={`/print/cotizaciones/${params.id}`} className={s.secondaryButton}>
          PDF cliente
        </Link>
      </div>

      <article ref={documentRef} className={s.document}>
        <header className={s.docHeader}>
          <div className={s.docHeaderCopy}>
            <p className={s.docEyebrow}>Uso interno · no enviar al cliente</p>
            <h1>Resumen de fabricación</h1>
            <p className={s.docContext}>
              {cotizacion.codigo}
              <span aria-hidden>·</span>
              {cotizacion.clienteNombre || "Sin cliente"}
              {cotizacion.obra ? (
                <>
                  <span aria-hidden>·</span>
                  {cotizacion.obra}
                </>
              ) : null}
            </p>
          </div>
          <div className={s.docHeaderActions} data-print-hide="1">
            <button
              type="button"
              className={s.primaryButton}
              onClick={() => void handleDownload()}
              disabled={isExporting}
            >
              <LuDownload aria-hidden />
              <span>{isExporting ? "Generando..." : "Descargar resumen"}</span>
            </button>
            <button type="button" className={s.secondaryButton} onClick={handlePrint}>
              <LuPrinter aria-hidden />
              <span>Imprimir</span>
            </button>
          </div>
        </header>

        {exportError ? (
          <p className={s.exportNotice} data-print-hide="1">
            {exportError}
          </p>
        ) : null}

        <section className={s.totalsStrip} aria-label="Resumen general">
          <div>
            <span>Perfiles totales</span>
            <strong>{formatMl(summary.totalProfilesMl)}</strong>
          </div>
          <div>
            <span>Vidrio total</span>
            <strong>{formatM2(summary.totalGlassM2)}</strong>
          </div>
          <div>
            <span>Accesorios</span>
            <strong>{summary.totalAccessoryUnits} unidades</strong>
          </div>
          <div>
            <span>Tiras totales</span>
            <strong>{summary.totalBars} sugeridas</strong>
          </div>
          <div>
            <span>Componentes con pauta</span>
            <strong>
              {summary.items.length} de {summary.totalItems}
            </strong>
          </div>
        </section>

        {summary.items.length === 0 ? (
          <p className={s.emptyState}>
            Esta cotización aún no tiene pauta de fabricación congelada en las piezas.
          </p>
        ) : (
          summary.items.map((row) => {
            const lineCaption = formatFabricationItemLineCaption(row.lineName, row.material);
            const herraje =
              row.recipe
                ? herrajeDisplayLabel(row.recipe.herrajeTipo, row.recipe.herrajeLabel)
                : row.herrajeLabel;
            return (
              <section key={row.itemId} className={s.itemCard}>
                <header className={s.itemHead}>
                  <div>
                    <h2>
                      {row.codigo} · {row.nombre}
                    </h2>
                    <p className={s.itemLine}>{lineCaption}</p>
                    <p className={s.itemMeta}>
                      {row.widthMm} × {row.heightMm} mm · {row.quantity}{" "}
                      {row.quantity === 1 ? "unidad" : "unidades"}
                      {herraje && herraje !== "-" ? ` · ${herraje}` : ""}
                    </p>
                  </div>
                  <em data-tone={row.statusLabel === "Validada" || row.statusLabel.startsWith("Validada") ? "ok" : "neutral"}>
                    {row.statusLabel}
                  </em>
                </header>

                <section className={s.block} aria-label={`Cubicación de ${row.codigo}`}>
                  <h3>
                    <span>1.</span> Cubicación
                  </h3>
                  <p className={s.blockHint}>Material necesario para fabricar esta pieza.</p>
                  <div className={s.cubicMetrics}>
                    <div>
                      <span>Perfiles</span>
                      <strong>{formatMl(row.profilesMl)}</strong>
                    </div>
                    <div>
                      <span>Vidrio</span>
                      <strong>{formatM2(row.glassM2)}</strong>
                    </div>
                    <div>
                      <span>Accesorios</span>
                      <strong>{row.accessoryUnits} unidades</strong>
                    </div>
                    <div>
                      <span>Tiras necesarias</span>
                      <strong>{row.barCount}</strong>
                    </div>
                  </div>
                </section>

                <section className={s.block} aria-label={`Despiece de ${row.codigo}`}>
                  <h3>
                    <span>2.</span> Despiece
                  </h3>
                  <ul className={s.cutsList}>
                    {row.snapshot.cuts.map((cut, index) => (
                      <li key={`${row.itemId}-m-${cut.label}-${index}`}>
                        <div className={s.cutMain}>
                          <strong>{cut.functionLabel || cut.label || "Corte"}</strong>
                          <span>
                            {cut.label && cut.functionLabel && cut.label !== "Por asignar"
                              ? cut.label
                              : cut.label === "Por asignar"
                                ? "Perfil por asignar"
                                : cut.label || "Perfil"}
                          </span>
                        </div>
                        <dl className={s.cutMetrics}>
                          <div>
                            <dt>Medida</dt>
                            <dd>{formatMm(cut.lengthMm)}</dd>
                          </div>
                          <div>
                            <dt>Cant.</dt>
                            <dd>{cut.quantity}</dd>
                          </div>
                          <div>
                            <dt>Total</dt>
                            <dd>{formatMm(cut.totalLinealMm)}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                  <div className={s.tableScroll}>
                    <table className={s.cutsTable}>
                      <thead>
                        <tr>
                          <th>Perfil</th>
                          <th>Función</th>
                          <th>Medida mm</th>
                          <th>Cant.</th>
                          <th>Total lineal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.snapshot.cuts.map((cut, index) => (
                          <tr key={`${row.itemId}-${cut.label}-${index}`}>
                            <td>{cut.label || "Por asignar"}</td>
                            <td>{cut.functionLabel || "—"}</td>
                            <td>{Math.round(cut.lengthMm).toLocaleString("es-CL")}</td>
                            <td>{cut.quantity}</td>
                            <td>{Math.round(cut.totalLinealMm).toLocaleString("es-CL")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {row.snapshot.bars.length > 0 ? (
                  <section className={s.block} aria-label={`Pauta de corte de ${row.codigo}`}>
                    <h3>
                      <span>3.</span> Pauta de corte
                    </h3>
                    <p className={s.blockHint}>Pauta sugerida de tiras. Verificar en obra antes de cortar.</p>
                    <div className={s.barsGrid}>
                      {row.snapshot.bars.map((bar) => (
                        <article key={`${row.itemId}-bar-${bar.index}`} className={s.barCard}>
                          <strong>Tira {bar.index}</strong>
                          <dl>
                            <div>
                              <dt>Usado</dt>
                              <dd>{formatMm(bar.usedMm)}</dd>
                            </div>
                            <div>
                              <dt>Sobra</dt>
                              <dd>{formatMm(bar.wasteMm)}</dd>
                            </div>
                            <div>
                              <dt>Cortes</dt>
                              <dd>{bar.cuts.length}</dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </section>
            );
          })
        )}

        <footer className={s.docFooter}>
          <p>
            Las longitudes incluyen cortes según la pauta sugerida. Verificar medidas en
            obra antes de fabricar. Documento interno: no enviar al cliente.
          </p>
        </footer>
      </article>
    </main>
  );
}
