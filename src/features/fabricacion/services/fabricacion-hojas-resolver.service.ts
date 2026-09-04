import { countLeafModules } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

type PresentationHojasInput = Pick<
  CotizacionItemPresentationMeta,
  "fabricacionHojas" | "hojasBase" | "guidedVisualConfig" | "sistema"
>;

/**
 * Hojas usadas para emparejar receta de fabricación.
 * Prioriza contexto explícito y topología del constructor sobre el default
 * legacy de Ventana (2 hojas), que no aplica a proyectante/abatible de 1 hoja.
 */
export function resolveFabricacionHojasForRecipeMatch(
  item: CotizacionWorkflowItem,
  presentation: PresentationHojasInput
): number | null {
  if (presentation.fabricacionHojas != null && presentation.fabricacionHojas > 0) {
    return presentation.fabricacionHojas;
  }

  if (presentation.guidedVisualConfig?.root) {
    const leafCount = countLeafModules(presentation.guidedVisualConfig.root);
    if (leafCount > 0) return leafCount;
  }

  const source = `${item.tipo} ${item.nombre} ${item.descripcion}`.toLowerCase();
  const match = source.match(/(\d+)\s*(?:hoja|hojas|h)/);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  const sistema = (presentation.sistema ?? "").trim().toLowerCase();
  if (sistema === "personalizado" || sistema === "personalizada") {
    return null;
  }

  if (presentation.hojasBase != null && presentation.hojasBase > 0) {
    return presentation.hojasBase;
  }

  return null;
}
