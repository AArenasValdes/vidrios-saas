"use client";

import type { CotizacionLineTemplateGlassPiece } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { VidrioPlanchaOptimizacion } from "@/features/fabricacion/services/vidrio-plancha-optimizacion.service";
import { formatCurrency } from "@/utils/formatCurrency";

import styles from "./despiece-review-surface.module.css";

function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
}

function formatM2(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m²`;
}

function formatPct(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function GlassDespieceList({
  vidrioLabel,
  pieces,
  totalM2,
}: {
  vidrioLabel: string;
  pieces: CotizacionLineTemplateGlassPiece[];
  totalM2: number;
}) {
  if (pieces.length === 0) return null;

  return (
    <section className={styles.glassDespieceSection} aria-label="Despiece de vidrio">
      <header className={styles.glassDespieceHead}>
        <div>
          <strong>Despiece de vidrio</strong>
          <span>{vidrioLabel}</span>
        </div>
        <em>{formatM2(totalM2)}</em>
      </header>
      <div className={styles.glassDespieceTable} role="table" aria-label="Piezas de vidrio">
        <div className={styles.glassDespieceHeadRow} role="row">
          <span role="columnheader">Medida</span>
          <span role="columnheader">Cantidad</span>
          <span role="columnheader">Total m²</span>
        </div>
        {pieces.map((piece, index) => (
          <div
            key={`${piece.widthMm}x${piece.heightMm}-${index}`}
            className={styles.glassDespieceRow}
            role="row"
          >
            <strong role="cell">
              {formatMm(piece.widthMm)} × {formatMm(piece.heightMm)}
            </strong>
            <span role="cell" className={styles.numCell}>
              {piece.quantity}
            </span>
            <span role="cell" className={`${styles.numCell} ${styles.alignRight}`}>
              {formatM2(piece.totalM2)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GlassOptimizationBlock({
  optimization,
  showUseOptimizedCostAction = false,
  onUseOptimizedCost,
}: {
  optimization: VidrioPlanchaOptimizacion;
  showUseOptimizedCostAction?: boolean;
  onUseOptimizedCost?: () => void;
}) {
  return (
    <section className={styles.glassOptimizationBlock} aria-label="Estimación de vidrio por superficie">
      <header>
        <p className={styles.glassOptimizationEyebrow}>Aprovechamiento estimado</p>
        <strong>Estimación por superficie</strong>
        <span>{optimization.vidrioLabel}</span>
      </header>

      <dl className={styles.glassOptimizationGrid}>
        <div>
          <dt>Formato de plancha</dt>
          <dd>{optimization.sheetFormatLabel}</dd>
        </div>
        <div>
          <dt>Superficie requerida</dt>
          <dd>{formatM2(optimization.requiredM2)}</dd>
        </div>
        <div>
          <dt>Merma configurada</dt>
          <dd>{formatPct(optimization.mermaPct)}</dd>
        </div>
        <div>
          <dt>Superficie con merma</dt>
          <dd>{formatM2(optimization.requiredWithMermaM2)}</dd>
        </div>
        <div>
          <dt>Plancha equivalente estimada</dt>
          <dd>{optimization.billableFractionLabel}</dd>
        </div>
        <div>
          <dt>Aprovechamiento</dt>
          <dd>{formatPct(optimization.sheetUtilizationPct)}</dd>
        </div>
        <div>
          <dt>Desperdicio</dt>
          <dd>{formatPct(optimization.wastePct)}</dd>
        </div>
        {optimization.estimatedSheetCost != null ? (
          <div className={styles.glassOptimizationCost}>
            <dt>Costo estimado del vidrio</dt>
            <dd>{formatCurrency(optimization.estimatedSheetCost)}</dd>
          </div>
        ) : null}
      </dl>

      {showUseOptimizedCostAction ? (
        <div className={styles.glassOptimizationActions}>
          <button
            type="button"
            className={styles.glassOptimizationFutureAction}
            disabled={optimization.estimatedSheetCost == null}
            onClick={onUseOptimizedCost}
            title="Acción reservada para una siguiente etapa comercial"
          >
            Usar costo optimizado
          </button>
          <p className={styles.glassOptimizationNote}>
            Referencia técnica. No modifica el precio de venta de la cotización.
          </p>
        </div>
      ) : (
        <p className={styles.glassOptimizationNote}>
          Estimación por m² y merma; no verifica encaje geométrico en plancha. No modifica el
          precio de venta de la cotización.
        </p>
      )}
    </section>
  );
}
