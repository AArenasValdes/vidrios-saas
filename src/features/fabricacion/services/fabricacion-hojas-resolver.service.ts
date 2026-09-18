import { countLeafModules } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { resolveCommercialFabricacionHojas } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import type { CotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

type PresentationHojasInput = Pick<
  CotizacionItemPresentationMeta,
  "fabricacionHojas" | "hojasBase" | "guidedVisualConfig" | "sistema" | "sheetScheme"
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
  const sistema = (presentation.sistema ?? "").trim().toLowerCase();
  const guidedVisualLeafCount = presentation.guidedVisualConfig?.root
    ? countLeafModules(presentation.guidedVisualConfig.root)
    : null;

  const fromCommercial = resolveCommercialFabricacionHojas({
    sheetScheme: presentation.sheetScheme,
    fabricacionHojas: presentation.fabricacionHojas,
    hojasBase:
      sistema === "personalizado" || sistema === "personalizada"
        ? null
        : presentation.hojasBase,
    guidedVisualLeafCount:
      guidedVisualLeafCount && guidedVisualLeafCount > 0 ? guidedVisualLeafCount : null,
  });
  if (fromCommercial != null) return fromCommercial;

  const source = `${item.tipo} ${item.nombre} ${item.descripcion}`.toLowerCase();
  const match = source.match(/(\d+)\s*(?:hoja|hojas|h)/);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  if (sistema === "personalizado" || sistema === "personalizada") {
    return null;
  }

  return null;
}
