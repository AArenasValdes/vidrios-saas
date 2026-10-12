import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function getTechnicalRecipeSignature(recipe: FabricationRecipeRecord): string {
  const { identidad, ...calculation } = recipe.definition;
  const technicalIdentity = Object.fromEntries(
    Object.entries(identidad).filter(
      ([key]) => !["recetaId", "nombre", "codigo", "variante"].includes(key)
    )
  );

  const normalizeCalculation = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalizeCalculation);
    if (value === null || typeof value !== "object") return value;

    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) =>
        ![
          "id",
          "recetaId",
          "observaciones",
          "datosPendientes",
          "notasValidacion",
          "sourceReference",
          "sourceRevision",
        ].includes(key)
      )
      .sort(([left], [right]) => left.localeCompare(right));

    return Object.fromEntries(
      entries.map(([key, entry]) => [key, normalizeCalculation(entry)])
    );
  };

  return JSON.stringify({ identidad: technicalIdentity, calculo: normalizeCalculation(calculation) });
}

function compareRecipePreference(left: FabricationRecipeRecord, right: FabricationRecipeRecord): number {
  const statusRank = (status: FabricationRecipeRecord["status"]) =>
    status === "validated" ? 0 : status === "review_required" ? 1 : status === "testing" ? 2 : 3;
  const scopeRank = (scope: FabricationRecipeRecord["scope"]) =>
    scope === "organization" ? 0 : 1;

  return (
    statusRank(left.status) - statusRank(right.status) ||
    scopeRank(left.scope) - scopeRank(right.scope) ||
    right.version - left.version
  );
}

export function getRecipeTechnicalHint(recipe: FabricationRecipeRecord): string {
  return Array.from(
    new Set(
      recipe.definition.perfiles.map((profile) => {
        const code = profile.codigoPerfil.trim();
        const adjustment = profile.reglaMedida.ajusteMm;
        return adjustment == null ? code : `${code} ${adjustment} mm`;
      })
    )
  ).join(" / ");
}

/**
 * Collapses duplicated copies of the same technical rule while keeping recipes
 * that share a label but differ in profile codes or calculation rules.
 */
export function dedupeConstructorRecipeCandidates(
  candidates: readonly FabricationRecipeRecord[],
  preferredRecipeId?: string | null
): FabricationRecipeRecord[] {
  const preferredBySignature = new Map<string, FabricationRecipeRecord>();

  candidates.forEach((recipe) => {
    const signature = getTechnicalRecipeSignature(recipe);
    const current = preferredBySignature.get(signature);
    if (
      !current ||
      recipe.id === preferredRecipeId ||
      (current.id !== preferredRecipeId && compareRecipePreference(recipe, current) < 0)
    ) {
      preferredBySignature.set(signature, recipe);
    }
  });

  return Array.from(preferredBySignature.values());
}

/**
 * Keep every compatible route available in the Constructor. A universal
 * fallback may complement a workshop recipe, but must not hide it: the quote
 * snapshot resolver receives both sources and can resolve either selection.
 * Exact technical duplicates are collapsed, preferring validated workshop
 * recipes via compareRecipePreference.
 */
export function resolveConstructorRecipeCandidates(input: {
  storedCandidates: readonly FabricationRecipeRecord[];
  universalFallbackCandidates: readonly FabricationRecipeRecord[];
  preferredRecipeId?: string | null;
}): FabricationRecipeRecord[] {
  return dedupeConstructorRecipeCandidates(
    [...input.storedCandidates, ...input.universalFallbackCandidates],
    input.preferredRecipeId
  );
}

/**
 * El selector del Constructor permite elegir entre varias recetas.
 * Si la línea solo tiene una receta compatible, esa receta es inequívoca y
 * debe conservarse al guardar, aunque la selección explícita quede vacía.
 */
export function resolveConstructorRecipeSelection(input: {
  selection: string;
  candidates: readonly FabricationRecipeRecord[];
}): FabricationRecipeRecord | null {
  if (input.selection.startsWith("recipe:")) {
    const recipeId = input.selection.slice("recipe:".length);
    return input.candidates.find((recipe) => recipe.id === recipeId) ?? null;
  }

  const preferredRecipeId = input.selection.startsWith("recipe:")
    ? input.selection.slice("recipe:".length)
    : null;
  const candidates = dedupeConstructorRecipeCandidates(input.candidates, preferredRecipeId);
  if (!input.selection && candidates.length === 1) {
    return candidates[0] ?? null;
  }

  return null;
}
