import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import { lineUsesVariantProductPicker } from "@/features/fabricacion/services/line-variant-picker.service";
import { buildSodalEditorRecipeDefaults } from "@/features/fabricacion/services/sodal-editor-recipes.service";
import {
  getCatalogProductConfigurations,
  type CatalogProductConfiguration,
} from "@/features/cotizaciones/line-templates/services/line-template-compatibility.service";

type FabricationTemplateContext = Pick<CotizacionLineTemplate, "catalogKey"> &
  Partial<Pick<CotizacionLineTemplate, "nombre" | "proveedor">>;

export type FabricacionWorkflowStepId =
  | "base"
  | "components"
  | "rules"
  | "test"
  | "plan"
  | "validation";

type DeclaredCatalogComposition = {
  configuration: CatalogProductConfiguration;
  compositionId: string;
  leavesCount: number;
};

/** Devuelve una configuración y composición solo si el catálogo las declara sin ambigüedad. */
export function resolveUniqueDeclaredCatalogComposition(
  catalogKey: string | null | undefined
): DeclaredCatalogComposition | null {
  const configurations = getCatalogProductConfigurations(catalogKey);
  if (configurations.length !== 1) return null;

  const configuration = configurations[0];
  const leaves = configuration.leavesCounts ?? [];
  if (leaves.length !== 1) return null;
  const leavesCount = leaves[0];
  if (!Number.isInteger(leavesCount) || leavesCount < 1) return null;

  const opening = configuration.openingType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL");
  let compositionId: string | null = null;

  if (opening.includes("corredera")) {
    const moving = configuration.movingLeavesCounts ?? [];
    if (moving.length !== 1) return null;
    const movingCount = moving[0];
    if (leavesCount === 2 && movingCount === 1) compositionId = "fijo-1-movil";
    else if (leavesCount === 2 && movingCount === 2) compositionId = "2-moviles";
    else if (leavesCount === 3 && movingCount === 3) compositionId = "3-moviles";
    else if (leavesCount === 4 && movingCount === 4) compositionId = "4-moviles";
  } else if (opening.includes("fijo")) {
    if (leavesCount === 1) compositionId = "1-fijo";
  } else if (leavesCount === 1) {
    compositionId = "1-hoja";
  } else if (leavesCount === 2) {
    compositionId = "2-hojas";
  }

  return compositionId
    ? { configuration, compositionId, leavesCount }
    : null;
}

/** Prepara identidad de catálogo para una receta nueva/vacía sin persistirla. */
export function applyUniqueDeclaredCatalogComposition(
  recipe: FabricacionReceta,
  catalogKey: string | null | undefined
): FabricacionReceta {
  const resolved = resolveUniqueDeclaredCatalogComposition(catalogKey);
  if (!resolved || recipe.identidad.configurationId || recipe.identidad.compositionId) {
    return recipe;
  }

  return {
    ...recipe,
    identidad: {
      ...recipe.identidad,
      tipologia: resolved.configuration.typology,
      hojas: resolved.leavesCount,
      modulos: resolved.leavesCount,
      apertura: resolved.configuration.openingType,
      variante: resolved.configuration.variant,
      configurationId: resolved.configuration.id,
      compositionId: resolved.compositionId,
      configurationRevision: 1,
    },
  };
}

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

  if (resolveUniqueDeclaredCatalogComposition(template.catalogKey)) {
    return "components";
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
