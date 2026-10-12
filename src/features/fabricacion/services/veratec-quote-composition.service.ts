import {
  listLeafModules,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import type { QuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import { VERATEC_7400_4H_CATALOG_KEY } from "@/features/fabricacion/fixtures/veratec-preliminary-recipes";

export type VeratecQuoteComposition = {
  catalogLineKey?: string | null;
  fabricacionTipologia?: string | null;
  fabricacionHojas?: number | null;
  fabricacionModulos?: number | null;
  sheetScheme?: string | null;
  sheetVariant?: string | null;
  guidedVisualConfig?: GuidedVisualConfig | null;
  quickCompositionAdjustment?: QuickCompositionAdjustment | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Una composición visual modificada puede usar la base preliminar 7400 4H
 * solo si sigue representando cuatro hojas correderas móviles. La receta
 * conserva sus propias fórmulas y los ajustes visuales siguen requiriendo
 * revisión antes de confirmar la pauta.
 */
export function isVeratec7400FourMobileComposition(
  input: VeratecQuoteComposition,
  catalogKey = input.catalogLineKey
): boolean {
  if (
    catalogKey !== VERATEC_7400_4H_CATALOG_KEY ||
    normalize(input.fabricacionTipologia) !== "corredera" ||
    input.fabricacionHojas !== 4 ||
    input.fabricacionModulos !== 4 ||
    !/^4 hojas(?: correderas)?$/.test(normalize(input.sheetScheme)) ||
    normalize(input.sheetVariant) !== "4 moviles"
  ) {
    return false;
  }

  const visualLeaves = input.guidedVisualConfig
    ? listLeafModules(input.guidedVisualConfig.root)
    : null;
  if (
    visualLeaves &&
    (visualLeaves.length !== 4 || visualLeaves.some((leaf) => leaf.type !== "corredera"))
  ) {
    return false;
  }

  const adjustment = input.quickCompositionAdjustment;
  if (
    adjustment &&
    (adjustment.fixedTopMm != null ||
      adjustment.fixedBottomMm != null ||
      adjustment.fixedLeftMm != null ||
      adjustment.fixedRightMm != null ||
      (adjustment.paneCount != null && adjustment.paneCount !== 4) ||
      Object.values(adjustment.paneTypes ?? {}).some((type) => type !== "sliding") ||
      (adjustment.leafWidths != null && adjustment.leafWidths.length !== 4))
  ) {
    return false;
  }

  return true;
}
