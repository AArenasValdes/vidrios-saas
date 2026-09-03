import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export type FabricacionWorkflowStepId =
  | "base"
  | "components"
  | "rules"
  | "test"
  | "plan"
  | "validation";

/**
 * Líneas del catálogo Ventora ya traen tipología y piezas estructurales:
 * al entrar a fabricación conviene abrir en Componentes, no en Base.
 */
export function resolveInitialFabricationStepForTemplate(
  template: Pick<CotizacionLineTemplate, "catalogKey"> | null,
  recipe: FabricationRecipeRecord
): FabricacionWorkflowStepId {
  if (!template || !isVentoraCatalogKey(template.catalogKey)) {
    return "base";
  }

  if (recipe.definition.perfiles.length === 0) {
    return "base";
  }

  return "components";
}
