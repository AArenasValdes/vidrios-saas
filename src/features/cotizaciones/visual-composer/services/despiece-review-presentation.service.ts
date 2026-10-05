import { VERATEC_7400_CATALOG_KEY } from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import type { FabricacionDespieceCotizacionResult } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

export type DespieceReviewSelectionPrompt = {
  label: string;
  message: string | null;
};

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
