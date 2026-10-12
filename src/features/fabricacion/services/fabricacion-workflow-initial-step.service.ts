import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { lineUsesVariantProductPicker } from "@/features/fabricacion/services/line-variant-picker.service";
import { buildSodalEditorRecipeDefaults } from "@/features/fabricacion/services/sodal-editor-recipes.service";

type FabricationTemplateContext = Pick<CotizacionLineTemplate, "catalogKey"> &
  Partial<Pick<CotizacionLineTemplate, "nombre" | "proveedor">>;

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
  template: FabricationTemplateContext | null,
  recipe: FabricationRecipeRecord
): FabricacionWorkflowStepId {
  const sodalDefaults = template
    ? buildSodalEditorRecipeDefaults({
        catalogKey: template.catalogKey,
        lineTemplateId: recipe.lineTemplateId ?? 0,
        lineName: template.nombre ?? recipe.lineName,
        providerName: template.proveedor ?? recipe.providerName,
      })
    : [];

  if (sodalDefaults.length > 1) {
    return "base";
  }

  if (lineUsesVariantProductPicker(template?.catalogKey ?? null)) {
    return "base";
  }

  if (!template || !isVentoraCatalogKey(template.catalogKey)) {
    return "base";
  }

  if (recipe.definition.perfiles.length === 0) {
    return "base";
  }

  return "components";
}

/** Líneas con variaciones abren en Producto para elegir construcción. */
export function resolveMobileVariantTreeEntryStep(
  template: Pick<CotizacionLineTemplate, "catalogKey"> | null,
  recipe: FabricationRecipeRecord
): FabricacionWorkflowStepId {
  if (lineUsesVariantProductPicker(template?.catalogKey ?? null)) {
    return "base";
  }

  if (recipe.status === "validated") {
    return "validation";
  }

  if (
    isVentoraCatalogKey(template?.catalogKey ?? null) &&
    recipe.definition.perfiles.length > 0
  ) {
    return "components";
  }

  const initial = resolveInitialFabricationStepForTemplate(template, recipe);
  return initial === "base" && recipe.definition.perfiles.length > 0
    ? "components"
    : initial;
}
