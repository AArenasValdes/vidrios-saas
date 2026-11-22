import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { SERIE_45_CATALOG_KEY } from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function matchesSerie45DocumentarySignature(recipe: FabricacionReceta): boolean {
  const codes = new Set(recipe.perfiles.map((profile) => profile.codigoPerfil.trim()));
  const glass = recipe.vidrios[0];
  return (
    codes.has("4522") &&
    codes.has("4531") &&
    codes.has("4534") &&
    glass?.reglaAncho.ajusteMm === -170 &&
    glass?.reglaAlto.ajusteMm === -183
  );
}

export type Serie45GlassSupport =
  | { kind: "compatible_monolithic"; beadNote: string }
  | { kind: "compatible_dvh_pending_bead"; beadNote: string }
  | { kind: "incompatible_glazing"; reason: string }
  | { kind: "unresolved_glazing"; reason: string };

const INCOMPATIBLE_GLAZING_RE = /\b(espejo|policarbonato|acrilico)\b/;
const LAMINATED_GLAZING_RE = /\b(laminad[oa]s?|pvb|sgp|triplex)\b/;
const LAMINATED_TWO_PLY_RE = /\b\d+(?:[.,]\d+)?\s*\+\s*\d+(?:[.,]\d+)?\b/;
const DVH_GLAZING_RE = /\b(dvh|termopanel|doble\s+vidriado|doble\s+vidrio)\b/;
const DVH_THREE_PART_RE = /\b\d+(?:[.,]\d+)?\s*\+\s*\d+(?:[.,]\d+)?\s*\+\s*\d+(?:[.,]\d+)?\b/;
const MONOLITHIC_GLAZING_RE =
  /(?:\b(?:monolitic[oa]|float|crudo|simple|templad[oa]|blindex)\b|^\d+(?:[.,]\d+)?\s*mm$|^(?:incoloro|claro|bronce|gris|verde|azul)\s+\d+(?:[.,]\d+)?\s*mm$)/;
const UNRESOLVED_GLASS_RE = /^(?:|vidrio\s+por\s+definir)$|\b(?:por\s+definir|sin\s+definir|sin\s+confirmar|pendiente)\b/;

export const SERIE_45_BEAD_MONOLITHIC_NOTE =
  "Cálculo preliminar. Junquillo 4534 es referencia base; confirmar espesor y junquillo en taller.";
export const SERIE_45_BEAD_DVH_NOTE =
  "Línea 45 admite termopanel (DVH), pero el junquillo 4534 es referencia base preliminar: confirmar código y espesor de junquillo en taller antes de cortar.";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Identifica si una receta Línea 45 pertenece al propio taller y debe
 * preservarse sin aplicar restricciones documentales de la pauta base.
 */
export function isWorkshopOwnedSerie45Recipe(
  recipe: Pick<FabricationRecipeRecord, "scope" | "sourceType" | "sourceReference" | "status" | "version" | "definition">,
): boolean {
  const source = recipe.sourceReference?.trim() ?? "";
  if (source.startsWith("taller:personalizada:")) return true;
  if (recipe.status === "validated" && recipe.scope === "organization") return true;
  if (
    source.startsWith("ventora:") ||
    source.startsWith("sodal+indalum:serie-45-practicable") ||
    matchesSerie45DocumentarySignature(recipe.definition)
  ) {
    return false;
  }
  return (
    recipe.scope === "organization" &&
    (recipe.version > 1 ||
      recipe.sourceType === "workshop" ||
      recipe.sourceType === "manual")
  );
}

/** Identifica recetas documentales base de Línea 45 (incluso si la plantilla legacy no guarda catalogKey). */
export function isDocumentarySerie45Recipe(
  recipe: Pick<FabricationRecipeRecord, "scope" | "sourceType" | "sourceReference" | "status" | "version" | "definition">,
): boolean {
  if (isWorkshopOwnedSerie45Recipe(recipe)) return false;
  const source = recipe.sourceReference?.trim() ?? "";
  return (
    source.startsWith("sodal+indalum:serie-45-practicable") ||
    matchesSerie45DocumentarySignature(recipe.definition)
  );
}

/**
 * Clasifica el vidrio para Línea 45 documental.
 * Admite monolítico y DVH en estado preliminar, advirtiendo siempre que el
 * junquillo 4534 no acredita compatibilidad para todo espesor sin evidencia física.
 */
export function classifySerie45GlassSupport(input: {
  glassName: string | null | undefined;
  technicalSpec?: GlassTechnicalSpec | null;
}): Serie45GlassSupport {
  const normalized = normalizeText(input.glassName);
  const spec = input.technicalSpec;

  if (spec?.hasConflict) {
    return {
      kind: "unresolved_glazing",
      reason:
        "La especificación técnica del vidrio registra conflicto. Confirmar espesor y junquillo adecuado antes de cortar Línea 45.",
    };
  }

  const isDvh = spec?.category === "dvh" || DVH_GLAZING_RE.test(normalized);
  const isTwoPlyWithoutDvh =
    !isDvh &&
    !DVH_THREE_PART_RE.test(normalized) &&
    LAMINATED_TWO_PLY_RE.test(normalized);

  if (spec?.category === "laminado" || LAMINATED_GLAZING_RE.test(normalized) || isTwoPlyWithoutDvh) {
    return {
      kind: "incompatible_glazing",
      reason:
        "Vidrio laminado no cuenta con validación documental en Línea 45 (espesor y junquillo 4534 por confirmar); la composición queda pendiente de revisión.",
    };
  }

  if (
    spec?.category === "espejo" ||
    spec?.category === "otro" ||
    INCOMPATIBLE_GLAZING_RE.test(normalized)
  ) {
    return {
      kind: "incompatible_glazing",
      reason:
        "Línea 45 documental admite únicamente vidrio monolítico o termopanel (DVH) con junquillo compatible.",
    };
  }

  if (spec?.category === "pendiente" || UNRESOLVED_GLASS_RE.test(normalized)) {
    return {
      kind: "unresolved_glazing",
      reason:
        "Selecciona y confirma un vidrio monolítico o DVH para calcular el despiece preliminar de Línea 45 y verificar junquillo 4534.",
    };
  }

  if (isDvh) {
    return {
      kind: "compatible_dvh_pending_bead",
      beadNote: SERIE_45_BEAD_DVH_NOTE,
    };
  }

  if (spec?.category === "monolitico" || spec?.category === "templado") {
    return {
      kind: "compatible_monolithic",
      beadNote: SERIE_45_BEAD_MONOLITHIC_NOTE,
    };
  }

  if (!spec && MONOLITHIC_GLAZING_RE.test(normalized)) {
    return {
      kind: "compatible_monolithic",
      beadNote: SERIE_45_BEAD_MONOLITHIC_NOTE,
    };
  }

  return {
    kind: "unresolved_glazing",
    reason:
      "El vidrio seleccionado no identifica si es monolítico o DVH para verificar compatibilidad del junquillo 4534; la configuración queda pendiente.",
  };
}

/**
 * Evalúa si una cotización sobre `ventora:serie-45-puerta` puede usar la pauta
 * documental preliminar de puerta abatible 1H o debe quedar bloqueada/pendiente.
 */
export function evaluateSerie45DocumentaryQuoteGuard(input: {
  catalogKey: string | null | undefined;
  organizationId?: number | null;
  typology?: string | null;
  hojas?: number | null;
  glassName: string | null | undefined;
  technicalSpec?: GlassTechnicalSpec | null;
  activeRecipes?: readonly FabricationRecipeRecord[];
  matchedRecipe?: FabricationRecipeRecord | null;
}): {
  blockedEstado: "composicion_sin_receta" | "receta_incompleta";
  message: string;
} | null {
  const isSerie45Target =
    input.catalogKey === SERIE_45_CATALOG_KEY ||
    Boolean(input.matchedRecipe && isDocumentarySerie45Recipe(input.matchedRecipe)) ||
    (input.activeRecipes ?? []).some(
      (recipe) =>
        isDocumentarySerie45Recipe(recipe) &&
        (recipe.scope !== "organization" ||
          input.organizationId == null ||
          recipe.organizationId === input.organizationId),
    );
  if (!isSerie45Target) return null;

  if (input.matchedRecipe && isWorkshopOwnedSerie45Recipe(input.matchedRecipe)) {
    return null;
  }

  const workshopOwnedForOrg =
    !input.matchedRecipe &&
    (input.activeRecipes ?? []).some(
      (recipe) =>
        isWorkshopOwnedSerie45Recipe(recipe) &&
        (recipe.scope !== "organization" ||
          input.organizationId == null ||
          recipe.organizationId === input.organizationId),
    );
  if (workshopOwnedForOrg) {
    return null;
  }

  if (input.typology && input.typology !== "puerta_abatible") {
    return {
      blockedEstado: "composicion_sin_receta",
      message:
        "La cobertura documental de Línea 45 cubre exclusivamente puerta abatible de 1 hoja.",
    };
  }

  if (input.hojas != null && input.hojas !== 1) {
    return {
      blockedEstado: "composicion_sin_receta",
      message:
        "Línea 45 documental cubre exclusivamente puerta abatible de 1 hoja; configuraciones de 2 o más hojas quedan pendientes.",
    };
  }

  const glassSupport = classifySerie45GlassSupport({
    glassName: input.glassName,
    technicalSpec: input.technicalSpec,
  });

  if (glassSupport.kind === "incompatible_glazing") {
    return {
      blockedEstado: "composicion_sin_receta",
      message: glassSupport.reason,
    };
  }

  if (glassSupport.kind === "unresolved_glazing") {
    return {
      blockedEstado: "receta_incompleta",
      message: glassSupport.reason,
    };
  }

  return null;
}
