import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import {
  SERIE_4800_CATALOG_KEY,
  SERIE_4800_VARIANT_NORMAL,
  SERIE_4800_VARIANT_REFORZADA,
  isCurrentSerie4800CorrederaRecipe,
  isSerie4800FormulaSourceReference,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
import { isZeta4800SourceReference } from "@/features/fabricacion/fixtures/sodal-4800-zeta-catalog";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export type Serie4800GlassSupport =
  | { kind: "compatible_monolithic_float" }
  | { kind: "tempered_cti5_not_equated"; reason: string }
  | { kind: "incompatible_glazing"; reason: string }
  | { kind: "unresolved_glazing"; reason: string };

const INCOMPATIBLE_GLAZING_RE = /\b(dvh|termopanel|doble\s+vidriado|doble\s+vidrio|laminad[oa]|espejo)\b/;
const TEMPERED_GLAZING_RE = /\b(cti5|templad[oa]|blindex)\b/;
const MONOLITHIC_FLOAT_RE = /\b(monolitic[oa]|float|crudo|simple|incoloro)\b/;
const UNRESOLVED_GLASS_RE = /^(?:|vidrio\s+por\s+definir|por\s+definir|pendiente|sin\s+definir)$/;

function normalizeGlassText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Identifica si una receta Serie 4800 pertenece al propio taller y debe
 * preservarse sin aplicar las restricciones documentales de Diamond o Zeta.
 */
export function isWorkshopOwnedSerie4800Recipe(
  recipe: Pick<FabricationRecipeRecord, "scope" | "sourceType" | "sourceReference" | "status" | "version">,
): boolean {
  const source = recipe.sourceReference?.trim() ?? "";
  if (source.startsWith("taller:personalizada:")) return true;
  if (isSerie4800FormulaSourceReference(source) || isZeta4800SourceReference(source)) {
    return recipe.status === "validated" && recipe.scope === "organization";
  }
  if (
    source.startsWith("ventora") ||
    source.startsWith("sodal:") ||
    source.toUpperCase().startsWith("SODAL-P2A")
  ) {
    return false;
  }
  return (
    recipe.scope === "organization" &&
    (recipe.status === "validated" ||
      recipe.version > 1 ||
      recipe.sourceType === "workshop" ||
      recipe.sourceType === "manual")
  );
}

/** Identifica borradores documentales/obsoletos de 4800 reemplazables por fallback. */
export function isDocumentarySerie4800Recipe(
  recipe: Pick<FabricationRecipeRecord, "scope" | "sourceType" | "sourceReference" | "status" | "version" | "definition">,
): boolean {
  if (isWorkshopOwnedSerie4800Recipe(recipe)) return false;
  const source = recipe.sourceReference?.trim() ?? "";
  return (
    isSerie4800FormulaSourceReference(source) ||
    isZeta4800SourceReference(source) ||
    isCurrentSerie4800CorrederaRecipe(recipe.definition) ||
    source.startsWith("sodal:editor-catalog:") ||
    source.toUpperCase().includes("SODAL-4800") ||
    source.toUpperCase().includes("SODAL-P2A-4800")
  );
}

/**
 * Clasifica el vidrio elegido para Serie 4800 documental.
 * Separa float monolítico (Diamond) de cristal templado CTI5 (PA-56 Zeta) y
 * rechaza termopanel/laminado/espejo para no emitir cortes inseguros.
 */
export function classifySerie4800GlassSupport(input: {
  glassName: string | null | undefined;
  technicalSpec?: GlassTechnicalSpec | null;
}): Serie4800GlassSupport {
  const normalized = normalizeGlassText(input.glassName);
  const spec = input.technicalSpec;

  if (spec?.hasConflict) {
    return {
      kind: "unresolved_glazing",
      reason:
        "La especificación técnica del vidrio registra conflicto. Confirmar composición monolítica float antes de generar despiece en Serie 4800.",
    };
  }

  if (
    spec?.category === "dvh" ||
    spec?.category === "laminado" ||
    spec?.category === "espejo" ||
    spec?.category === "otro" ||
    INCOMPATIBLE_GLAZING_RE.test(normalized)
  ) {
    return {
      kind: "incompatible_glazing",
      reason:
        "Serie 4800 documental admite únicamente vidrio monolítico float compatible; no admite termopanel (DVH), laminado ni espejo.",
    };
  }

  if (spec?.category === "templado" || TEMPERED_GLAZING_RE.test(normalized)) {
    return {
      kind: "tempered_cti5_not_equated",
      reason:
        "El cristal templado (como CTI5) no se equipara automáticamente al vidrio float monolítico de la fórmula Diamond, y la referencia Zeta PA-56 (1800×1500) mantiene trazabilidad parcial sin validación física.",
    };
  }

  if (UNRESOLVED_GLASS_RE.test(normalized) && spec?.category !== "monolitico") {
    return {
      kind: "unresolved_glazing",
      reason:
        "Selecciona un vidrio monolítico float compatible para calcular el despiece documental de Serie 4800 Normal 2H.",
    };
  }

  if (spec?.category === "monolitico" || MONOLITHIC_FLOAT_RE.test(normalized)) {
    return { kind: "compatible_monolithic_float" };
  }

  return {
    kind: "unresolved_glazing",
    reason:
      "El vidrio seleccionado no identifica composición monolítica float inequívoca para Serie 4800 Diamond; la configuración queda pendiente.",
  };
}

/**
 * Evalúa si una cotización sobre `ventora:serie-4800-corredera-2h` puede usar
 * la referencia documental Diamond 2H Normal o debe quedar pendiente/bloqueada.
 */
export function evaluateSerie4800DocumentaryQuoteGuard(input: {
  catalogKey: string | null | undefined;
  organizationId?: number | null;
  typology?: string | null;
  hojas?: number | null;
  variante?: string | null;
  glassName: string | null | undefined;
  technicalSpec?: GlassTechnicalSpec | null;
  activeRecipes?: readonly FabricationRecipeRecord[];
  matchedRecipe?: FabricationRecipeRecord | null;
}): {
  blockedEstado: "composicion_sin_receta" | "receta_incompleta";
  message: string;
} | null {
  if (input.catalogKey !== SERIE_4800_CATALOG_KEY) return null;

  if (input.matchedRecipe && isWorkshopOwnedSerie4800Recipe(input.matchedRecipe)) {
    return null;
  }

  const normalizedVariant = normalizeGlassText(input.variante);
  const workshopOwnedForVariant =
    !input.matchedRecipe &&
    (input.activeRecipes ?? []).some(
      (recipe) =>
        isWorkshopOwnedSerie4800Recipe(recipe) &&
        (recipe.scope !== "organization" ||
          input.organizationId == null ||
          recipe.organizationId === input.organizationId) &&
        (!normalizedVariant ||
          normalizeGlassText(recipe.variant ?? recipe.definition.identidad.variante) ===
            normalizedVariant),
    );
  if (workshopOwnedForVariant) {
    return null;
  }

  if (input.typology && input.typology !== "corredera") {
    return {
      blockedEstado: "composicion_sin_receta",
      message:
        "La cobertura documental de Serie 4800 en esta etapa cubre exclusivamente corredera normal de 2 hojas.",
    };
  }

  if (input.hojas != null && input.hojas !== 2) {
    return {
      blockedEstado: "composicion_sin_receta",
      message:
        "Las configuraciones de 3 o 4 hojas de Serie 4800 están fuera de la cobertura paramétrica habilitada; la configuración queda pendiente.",
    };
  }

  if (normalizedVariant === SERIE_4800_VARIANT_REFORZADA) {
    return {
      blockedEstado: "receta_incompleta",
      message:
        "La variante Reforzada (4810/4811) de Serie 4800 sigue pendiente de validación; actualmente solo está habilitada Corredera Normal 2H.",
    };
  }

  if (normalizedVariant && normalizedVariant !== SERIE_4800_VARIANT_NORMAL) {
    return {
      blockedEstado: "receta_incompleta",
      message:
        `La variante "${input.variante}" de Serie 4800 no tiene equivalencia inequívoca confirmada; la configuración queda pendiente.`,
    };
  }

  const glassSupport = classifySerie4800GlassSupport({
    glassName: input.glassName,
    technicalSpec: input.technicalSpec,
  });

  if (glassSupport.kind === "incompatible_glazing") {
    return {
      blockedEstado: "composicion_sin_receta",
      message: glassSupport.reason,
    };
  }

  if (
    glassSupport.kind === "tempered_cti5_not_equated" ||
    glassSupport.kind === "unresolved_glazing"
  ) {
    return {
      blockedEstado: "receta_incompleta",
      message: glassSupport.reason,
    };
  }

  return null;
}
