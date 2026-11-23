import { normalizeUniversalAluminumFamilyKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { normalizeGlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { LINE_4000_SOURCE_REFERENCE_2H } from "../fixtures/line-4000-corredera-recipe";
import type { FabricacionIdentidadReceta } from "../types/fabricacion-domain";
import type { FabricationRecipeRecord } from "../types/fabricacion-persistence";
import type { FabricacionCotizacionSnapshot } from "../types/fabricacion-snapshot";
import { isIndependentWorkshopRecipe } from "./documentary-recipe-provenance.service";

export const LINE_4000_PENDING_MESSAGE =
  "Pauta de Línea 4000 de dos hojas pendiente de confirmar. Revisa la procedencia de la receta.";
const documentary = { id: "ventora:universal:l4000:2h", reference: LINE_4000_SOURCE_REFERENCE_2H, requireTraceableCopy: true };

export function isLine4000TwoLeafIdentity(catalogKey: string | null, identity: FabricacionIdentidadReceta) {
  return identity.hojas === 2 && identity.tipologia === "corredera" &&
    (normalizeUniversalAluminumFamilyKey(catalogKey) === "universal:aluminio:l4000" || identity.codigo === "LINE-4000-2H-V1");
}

function isLine4000TwoLeafRecipe(catalogKey: string | null, recipe: FabricationRecipeRecord) {
  const identity = recipe.definition.identidad;
  // El fallback también usa la referencia documental 2H para variantes de más hojas.
  if (identity.hojas !== 2 || identity.tipologia !== "corredera") return false;
  return isLine4000TwoLeafIdentity(catalogKey, identity) || recipe.id === documentary.id ||
    recipe.sourceReference === documentary.reference || recipe.sourceReference === documentary.id ||
    recipe.parentRecipeId === documentary.id;
}

export function blocksLine4000Recipe(catalogKey: string | null, recipe: FabricationRecipeRecord,
  recipes: readonly FabricationRecipeRecord[], organizationId: number | null) {
  return isLine4000TwoLeafRecipe(catalogKey, recipe) &&
    !isIndependentWorkshopRecipe(recipe, recipes, organizationId, documentary);
}

export function matchesLine4000FrozenInputs(frozen: FabricacionCotizacionSnapshot, current: {
  widthMm: number | null; heightMm: number | null; quantity: number; lineTemplateId: number | null;
  fabricationRecipeId?: string | null; fabricacionVariante?: string | null; vidrio?: string | null;
  fabricacionHojas?: number | null; fabricacionModulos?: number | null;
  fabricacionApertura?: string | null; fabricacionHerraje?: string | null;
  vidrioLineTemplateId?: string | null; glassTechnicalSpec?: NonNullable<FabricacionCotizacionSnapshot["glassSelection"]>["technicalSpec"];
}) {
  const glass = frozen.glassSelection;
  return frozen.input.anchoTotalMm === current.widthMm && frozen.input.altoTotalMm === current.heightMm &&
    frozen.input.cantidad === current.quantity &&
    (!current.lineTemplateId || !frozen.lineTemplateId || frozen.lineTemplateId === current.lineTemplateId) &&
    (!current.fabricationRecipeId || current.fabricationRecipeId === frozen.recipeId) &&
    (!current.fabricacionHojas || current.fabricacionHojas === frozen.input.hojas) &&
    (!current.fabricacionModulos || current.fabricacionModulos === frozen.input.modulos) &&
    (!current.fabricacionApertura || current.fabricacionApertura === frozen.recipeIdentity.apertura) &&
    (!current.fabricacionHerraje || current.fabricacionHerraje === frozen.recipeIdentity.herraje) &&
    (!current.fabricacionVariante || current.fabricacionVariante === frozen.selectedVariant) &&
    (!glass || (
      (!glass.displayName || glass.displayName.trim() === current.vidrio?.trim()) &&
      (glass.productId ?? "") === (current.vidrioLineTemplateId ?? "") &&
      JSON.stringify(normalizeGlassTechnicalSpec(glass.technicalSpec)) ===
        JSON.stringify(normalizeGlassTechnicalSpec(current.glassTechnicalSpec))
    ));
}
