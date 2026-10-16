import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { resolveUniversalAluminumLineKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import {
  isReplaceableUniversalStructuralRecipe,
  USER_CONFIRMED_UNIVERSAL_WORKSHOP_SOURCE_PREFIX,
} from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "id")
      .map(([key, nested]) => [key, stableValue(nested)] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function hasSameTechnicalDefinition(
  left: FabricationRecipeRecord,
  right: FabricationRecipeRecord,
): boolean {
  const technicalSignature = (recipe: FabricationRecipeRecord) => {
    const definition = recipe.definition;
    const { identidad, perfiles, accesorios } = definition;
    const legacyDefinition = definition as typeof definition & { vidrio?: typeof definition.vidrios };
    const profileSignature = perfiles
      .map((profile) => {
        const profileTechnicalFields = Object.fromEntries(
          Object.entries(profile).filter(([key]) => key !== "id" && key !== "nombrePerfil"),
        );
        const observaciones = typeof profileTechnicalFields.observaciones === "string"
          ? profileTechnicalFields.observaciones
          : undefined;
        return {
          ...profileTechnicalFields,
          observaciones: observaciones
          ?.replace(/\s*Base y descuento confirmados por el taller\.?/gi, "")
          .replace(/\s*Función y medida base sugeridas por Ventora\.?/gi, "")
          .trim(),
        };
      })
      .map((profile) => JSON.stringify(stableValue(profile)))
      .sort();
    const glassSignature = (definition.vidrios ?? legacyDefinition.vidrio ?? [])
      .map((glass) => {
        const { id, ...glassTechnicalFields } = glass;
        void id;
        return JSON.stringify(stableValue(glassTechnicalFields));
      })
      .sort();
    const accessorySignature = accesorios
      .map((accessory) => {
        const { id, ...accessoryTechnicalFields } = accessory;
        void id;
        return JSON.stringify(stableValue(accessoryTechnicalFields));
      })
      .sort();

    return JSON.stringify(stableValue({
      identidad: {
        ...identidad,
        recetaId: undefined,
        nombre: undefined,
        codigo: undefined,
      },
      perfiles: profileSignature,
      vidrios: glassSignature,
      accesorios: accessorySignature,
      configuracionCorte: definition.configuracionCorte,
      contratoTecnico: definition.contratoTecnico,
      alcanceCalculo: definition.alcanceCalculo,
      permitirCalculoPreliminarConPendientes: definition.permitirCalculoPreliminarConPendientes,
      datosPendientes: definition.datosPendientes,
    }));
  };

  return technicalSignature(left) === technicalSignature(right);
}

function isSameRecipeIdentity(left: FabricationRecipeRecord, right: FabricationRecipeRecord): boolean {
  const leftIdentity = left.definition.identidad;
  const rightIdentity = right.definition.identidad;
  return leftIdentity.tipologia === rightIdentity.tipologia &&
    leftIdentity.hojas === rightIdentity.hojas &&
    leftIdentity.modulos === rightIdentity.modulos &&
    leftIdentity.apertura === rightIdentity.apertura &&
    leftIdentity.herraje === rightIdentity.herraje &&
    leftIdentity.variante === rightIdentity.variante &&
    leftIdentity.topology === rightIdentity.topology &&
    leftIdentity.hardwareMode === rightIdentity.hardwareMode &&
    leftIdentity.configurationId === rightIdentity.configurationId &&
    leftIdentity.compositionId === rightIdentity.compositionId;
}

function isRedundantStructuralCopy(
  stored: FabricationRecipeRecord,
  canonical: FabricationRecipeRecord,
): boolean {
  return canonical.status === "validated" &&
    isReplaceableUniversalStructuralRecipe(stored) &&
    canonical.sourceReference?.startsWith(USER_CONFIRMED_UNIVERSAL_WORKSHOP_SOURCE_PREFIX) === true &&
    isSameRecipeIdentity(stored, canonical) &&
    hasSameTechnicalDefinition(stored, canonical);
}

function isUniversalAluminumVentoraCatalogKey(catalogKey: string | null | undefined): boolean {
  return resolveUniversalAluminumLineKey(catalogKey) !== null;
}

function isWorkshopAuthoredVariant(recipe: FabricationRecipeRecord): boolean {
  return recipe.sourceReference?.startsWith("taller:personalizada:") === true;
}

function isVentoraCatalogVariant(recipe: FabricationRecipeRecord): boolean {
  const provider = recipe.providerName?.trim().toLocaleLowerCase("es-CL");
  return recipe.scope === "ventora" || provider === "ventora";
}

function isConfirmedSodalL25Variant(recipe: FabricationRecipeRecord): boolean {
  return recipe.sourceReference?.startsWith("zeta:confirmed:sodal/l25/") === true;
}

/**
 * Compatibility name retained for existing callers. Recipes are never merged
 * from formula/name similarity: provider, identity, status and history remain
 * independently selectable until an explicit canonical equivalence exists.
 */
export function dedupeConstructorRecipeCandidates(
  candidates: readonly FabricationRecipeRecord[],
  _preferredRecipeId?: string | null
): FabricationRecipeRecord[] {
  void _preferredRecipeId;
  return [...candidates];
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

export function resolveConstructorRecipeCandidates(input: {
  storedCandidates: readonly FabricationRecipeRecord[];
  universalFallbackCandidates: readonly FabricationRecipeRecord[];
  preferredRecipeId?: string | null;
  catalogKey?: string | null;
}): FabricationRecipeRecord[] {
  const byPersistedId = new Map<string, FabricationRecipeRecord>();
  const sourceScopedCandidates = isUniversalAluminumVentoraCatalogKey(input.catalogKey)
    ? input.storedCandidates.filter((recipe) =>
        isVentoraCatalogVariant(recipe) ||
        isWorkshopAuthoredVariant(recipe) ||
        (input.catalogKey === "ventora:l25" && isConfirmedSodalL25Variant(recipe)) ||
        recipe.id === input.preferredRecipeId,
      )
    : [...input.storedCandidates];
  const storedCandidates = sourceScopedCandidates.filter((stored) =>
    !input.universalFallbackCandidates.some((canonical) =>
      isRedundantStructuralCopy(stored, canonical),
    ),
  );
  [...storedCandidates, ...input.universalFallbackCandidates].forEach((recipe) => {
    if (!byPersistedId.has(recipe.id)) byPersistedId.set(recipe.id, recipe);
  });
  return Array.from(byPersistedId.values());
}

/** Only an explicit ID or one unambiguous technical variant can be selected. */
export function resolveConstructorRecipeSelection(input: {
  selection: string;
  candidates: readonly FabricationRecipeRecord[];
}): FabricationRecipeRecord | null {
  if (input.selection.startsWith("recipe:")) {
    const recipeId = input.selection.slice("recipe:".length);
    const matching = input.candidates.filter((recipe) => recipe.id === recipeId);
    return matching.length === 1 ? matching[0] ?? null : null;
  }

  if (input.selection.startsWith("variant:")) {
    const variant = input.selection.slice("variant:".length).trim().toLocaleLowerCase("es");
    const matching = input.candidates.filter(
      (recipe) => recipe.definition.identidad.variante.trim().toLocaleLowerCase("es") === variant
    );
    return matching.length === 1 ? matching[0] ?? null : null;
  }

  if (input.selection !== "" || input.candidates.length !== 1) return null;
  const onlyCandidate = input.candidates[0];
  return onlyCandidate?.status === "validated" ? onlyCandidate : null;
}
