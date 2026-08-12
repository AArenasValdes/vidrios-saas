"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuPrinter } from "react-icons/lu";

import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { herrajeDisplayLabel } from "@/features/cotizaciones/line-templates/types/fabrication-recipe";

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
  const [loadError, setLoadError] = useState<string | null>(null);

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
        <div className={s.toolbarActions}>
          <Link href={`/print/cotizaciones/${params.id}`} className={s.secondaryButton}>
            PDF cliente
          </Link>
          <button type="button" className={s.primaryButton} onClick={() => window.print()}>
            <LuPrinter aria-hidden />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      <article className={s.document}>
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
          <div className={s.docMeta}>
            <strong>{summary.items.length}</strong>
            <span>con pauta</span>
          </div>
        </header>

        <section className={s.totalsStrip} aria-label="Totales de fabricación">
          <div>
            <span>Perfiles</span>
            <strong>{summary.totalProfilesMl.toFixed(2)} ml</strong>
          </div>
          <div>
            <span>Vidrio</span>
            <strong>
              {summary.totalGlassM2.toLocaleString("es-CL", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              m²
            </strong>
          </div>
          <div>
            <span>Accesorios</span>
            <strong>{summary.totalAccessoryUnits}</strong>
          </div>
          <div>
            <span>Tiras (pauta sugerida)</span>
            <strong>{summary.totalBars}</strong>
          </div>
        </section>

        {summary.items.length === 0 ? (
          <p className={s.emptyState}>
            Esta cotización aún no tiene pauta de fabricación congelada en las piezas.
          </p>
        ) : (
          summary.items.map((row) => (
            <section key={row.itemId} className={s.itemBlock}>
              <header className={s.itemHead}>
                <div>
                  <div className={s.itemTitleRow}>
                    <strong>
                      {row.codigo} · {row.nombre}
                    </strong>
                    <em data-tone={row.statusLabel === "Validada" ? "ok" : "neutral"}>
                      {row.statusLabel}
                    </em>
                  </div>
                  <p>
                    {row.widthMm} × {row.heightMm} mm · {row.quantity}{" "}
                    {row.quantity === 1 ? "unidad" : "unidades"}
                    {row.recipe
                      ? ` · ${herrajeDisplayLabel(
                          row.recipe.herrajeTipo,
                          row.recipe.herrajeLabel
                        )} · ${row.recipe.variant}`
                      : ""}
                  </p>
                </div>
              </header>

              <ul className={s.cutsList} aria-label={`Cortes de ${row.codigo}`}>
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
                        <dd>{Math.round(cut.lengthMm).toLocaleString("es-CL")} mm</dd>
                      </div>
                      <div>
                        <dt>Cant.</dt>
                        <dd>{cut.quantity}</dd>
                      </div>
                      <div>
                        <dt>Total</dt>
                        <dd>{Math.round(cut.totalLinealMm).toLocaleString("es-CL")} mm</dd>
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

              {row.snapshot.bars.length > 0 ? (
                <div className={s.barsBlock}>
                  <strong>Pauta sugerida de tiras</strong>
                  <ul>
                    {row.snapshot.bars.map((bar) => (
                      <li key={`${row.itemId}-bar-${bar.index}`}>
                        Tira {bar.index}: usados {Math.round(bar.usedMm)} mm · sobra{" "}
                        {Math.round(bar.wasteMm)} mm · {bar.cuts.length} cortes
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))
        )}

        <footer className={s.docFooter}>
          <p>
            Documento interno de taller. No incluye precios. Las tiras siguen una pauta
            sugerida físicamente válida (kerf/despunte); no es una optimización óptima.
          </p>
        </footer>
      </article>
    </main>
  );
}
