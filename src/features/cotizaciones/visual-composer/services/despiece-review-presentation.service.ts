import { VERATEC_7400_CATALOG_KEY } from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import type { FabricacionDespieceCotizacionResult } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

export type DespieceReviewSelectionPrompt = {
  label: string;
  message: string | null;
};

export type DespieceGlassSummaryMetrics = {
  /** Superficie técnica de corte de vidrio calculada; null si vidrios está vacío o pendiente. */
  areaVidrioCalculadaM2: number | null;
  /** Superficie comercial proyectada del vano; diferenciada de la superficie técnica de vidrio. */
  areaComercialVanoM2: number | null;
  /** Aprovechamiento vidrio/vano en %, o null si falta superficie de vidrio acreditada. */
  aprovechamientoVidrioPct: number | null;
};

/**
 * Deriva métricas de vidrio para el resumen de despiece sin convertir el área
 * comercial del vano en superficie técnica de vidrio ni reportar 100% sin vidrios.
 */
export function resolveDespieceGlassSummaryMetrics(input: {
  previewGlassTotalM2?: number | null;
  areaVidrioM2?: number | null;
  areaVanoM2?: number | null;
}): DespieceGlassSummaryMetrics {
  const areaVidrioCalculadaM2 =
    input.previewGlassTotalM2 != null && input.previewGlassTotalM2 > 0
      ? input.previewGlassTotalM2
      : input.areaVidrioM2 != null && input.areaVidrioM2 > 0
        ? input.areaVidrioM2
        : null;
  const areaComercialVanoM2 =
    input.areaVanoM2 != null && input.areaVanoM2 > 0 ? input.areaVanoM2 : null;
  const aprovechamientoVidrioPct =
    areaVidrioCalculadaM2 != null &&
    areaComercialVanoM2 != null &&
    areaComercialVanoM2 > 0
      ? Math.min(100, Math.round((areaVidrioCalculadaM2 / areaComercialVanoM2) * 100))
      : null;

  return {
    areaVidrioCalculadaM2,
    areaComercialVanoM2,
    aprovechamientoVidrioPct,
  };
}

export type MissingPresentationGroup = {
  technicalCode: string;
  finishKey: string;
  reason: string;
  supplierSku?: string | null;
  cutCount: number;
};

/** Agrupa el mismo faltante repetido por cada corte sin ocultar su trazabilidad. */
export function groupMissingPresentations(
  entries: FabricacionTrabajoSnapshot["missingPresentations"]
): MissingPresentationGroup[] {
  const groups = new Map<string, MissingPresentationGroup>();
  for (const entry of entries ?? []) {
    const key = JSON.stringify([
      entry.technicalCode,
      entry.finishKey,
      entry.reason,
      entry.supplierSku ?? null,
    ]);
    const current = groups.get(key);
    if (current) {
      current.cutCount += 1;
      continue;
    }
    groups.set(key, {
      technicalCode: entry.technicalCode,
      finishKey: entry.finishKey,
      reason: entry.reason,
      supplierSku: entry.supplierSku,
      cutCount: 1,
    });
  }
  return [...groups.values()];
}

export function resolveDespieceReviewSelectionPrompt(input: {
  resolution: FabricacionDespieceCotizacionResult | null;
  catalogKey: string | null | undefined;
  glassName: string | null | undefined;
}): DespieceReviewSelectionPrompt | null {
  if (input.resolution?.estado !== "multiples_recetas") return null;

  if (
    input.catalogKey === VERATEC_7400_CATALOG_KEY &&
    !input.glassName?.trim()
  ) {
    return {
      label: "Elegir vidrio",
      message:
        "Vuelve a Componentes y elige vidrio monolítico de 4 mm para calcular Veratec 7400. Las variantes de termopanel siguen pendientes de validación.",
    };
  }

  return {
    label: "Elegir variante",
    message: input.resolution.message ?? "Hay varias recetas compatibles; elige variante o herraje.",
  };
}
