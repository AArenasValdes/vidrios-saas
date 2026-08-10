"use client";

import {
  isGeometricFallbackSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { PieceDomainView } from "@/features/cotizaciones/new-quote/quote-piece-domain";

import styles from "./despiece-review-surface.module.css";

type DespieceUiStatus =
  | "calculado_con_receta"
  | "configuracion_incompleta"
  | "estimacion_geometrica"
  | "sin_reglas";

const DESPIECE_UI_STATUS_LABELS: Record<DespieceUiStatus, string> = {
  calculado_con_receta: "Despiece calculado",
  configuracion_incompleta: "Fabricación no configurada",
  estimacion_geometrica: "Estimación geométrica",
  sin_reglas: "Fabricación no configurada",
};

const BARS_NOT_CALCULABLE_HINT =
  "Agrega largos comerciales para calcular barras y sobrantes.";

function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
}

function formatM2(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m²`;
}

function formatMl(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ml`;
}

function despieceStatusToneClass(status: DespieceUiStatus) {
  switch (status) {
    case "calculado_con_receta":
      return styles.statusOk;
    case "configuracion_incompleta":
    case "estimacion_geometrica":
      return styles.statusWarn;
    case "sin_reglas":
    default:
      return styles.statusMuted;
  }
}

/** Resumen compacto para el inspector del Constructor (sin tabla). */
export function DespieceInspectorSummary({
  view,
  canRecalculate,
  onOpenReview,
  onRecalculate,
  barsHint,
}: {
  view: PieceDomainView;
  canRecalculate: boolean;
  onOpenReview: () => void;
  onRecalculate: () => void;
  barsHint?: string | null;
}) {
  const summary = view.technicalSummary;
  const barsCalculableHere = summary.hasSnapshot && summary.barras > 0;
  const badgeStatus: DespieceUiStatus =
    view.technicalStatus === "sin_reglas"
      ? "sin_reglas"
      : view.cubicationSnapshot && isGeometricFallbackSnapshot(view.cubicationSnapshot)
        ? "estimacion_geometrica"
        : summary.hasSnapshot
          ? "calculado_con_receta"
          : view.technicalStatus === "sin_configurar"
            ? "sin_reglas"
            : "sin_reglas";

  return (
    <div className={styles.inspectorSummary}>
      <em className={despieceStatusToneClass(badgeStatus)}>
        {DESPIECE_UI_STATUS_LABELS[badgeStatus]}
      </em>
      <dl className={styles.inspectorMetrics}>
        <div>
          <dt>Área</dt>
          <dd>
            {summary.areaVanoM2 != null ? formatM2(summary.areaVanoM2) : "—"}
          </dd>
        </div>
        <div>
          <dt>Perfiles</dt>
          <dd>{summary.hasSnapshot ? formatMl(summary.mlPerfiles) : "—"}</dd>
        </div>
        <div>
          <dt>Barras</dt>
          <dd className={!barsCalculableHere ? styles.notCalculable : undefined}>
            {summary.hasSnapshot ? (barsCalculableHere ? summary.barras : "—") : "—"}
          </dd>
        </div>
        <div>
          <dt>Cortes</dt>
          <dd>{summary.hasSnapshot ? summary.cortes : "—"}</dd>
        </div>
        <div>
          <dt>Accesorios</dt>
          <dd>{summary.hasSnapshot ? summary.accesorios : "—"}</dd>
        </div>
        <div>
          <dt>Sobrantes</dt>
          <dd className={!barsCalculableHere ? styles.notCalculable : undefined}>
            {summary.hasSnapshot
              ? barsCalculableHere
                ? formatMm(summary.sobranteMm)
                : "—"
              : "—"}
          </dd>
        </div>
      </dl>
      {summary.hasSnapshot && !barsCalculableHere ? (
        <p className={styles.compactWarning} role="status">
          {barsHint || BARS_NOT_CALCULABLE_HINT}
        </p>
      ) : null}
      <div className={styles.inspectorActions}>
        <button type="button" className={styles.inspectorPrimary} onClick={onOpenReview}>
          Abrir despiece
        </button>
        <button
          type="button"
          className={styles.inspectorSecondary}
          onClick={onRecalculate}
          disabled={!canRecalculate}
        >
          Recalcular
        </button>
      </div>
    </div>
  );
}
