import { crearRecetasSodalCatalogo2026 } from "@/features/fabricacion/fixtures/sodal-catalogo-2026-recipes";
import { crearRecetasSodalP2A } from "@/features/fabricacion/fixtures/sodal-p2a-recipes";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const SODAL_2026_CATALOG_KEYS = new Set([
  "ventora:optima-s28-corredera-2h",
  "ventora:optima-s28-corredera-3h",
  "ventora:s38-rpt-proyectante",
  "ventora:multislide-s83-4h",
  "ventora:multislide-s83-8h",
  "ventora:serie-3200-puerta-abatible-1h",
  "ventora:serie-4600-puerta-vaiven",
]);

const SODAL_P2A_CATALOG_KEYS = new Set([
  "ventora:serie-4800-corredera-2h",
  "ventora:s33-corredera-2h",
  "ventora:s33-rpt-corredera-2h",
]);

export const SODAL_EDITOR_RECIPE_SOURCE_PREFIX = "sodal:editor-catalog:";

function resolveSodalCatalogKey(input: {
  catalogKey: string | null | undefined;
  lineName: string;
  providerName?: string | null;
}): string | null {
  const catalogKey = input.catalogKey?.trim();
  if (catalogKey && (SODAL_2026_CATALOG_KEYS.has(catalogKey) || SODAL_P2A_CATALOG_KEYS.has(catalogKey))) {
    return catalogKey;
  }

  const provider = input.providerName?.trim().toLocaleLowerCase("es-CL") ?? "";
  const name = input.lineName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL");
  const explicitSodalSystemName = /optima|multi.?slide|s-?28|s-?33|s-?38/.test(name);
  if (provider && !provider.includes("sodal") && !explicitSodalSystemName) return null;

  if (/s-?28|s28/.test(name) && /corredera/.test(name)) {
    return /3\s*(hojas|h)/.test(name)
      ? "ventora:optima-s28-corredera-3h"
      : "ventora:optima-s28-corredera-2h";
  }
  if (/s-?38|s38/.test(name) && /rpt/.test(name) && /proyectante|fijo/.test(name)) {
    return "ventora:s38-rpt-proyectante";
  }
  if (/s-?83|s83/.test(name) && /multi.?slide/.test(name)) {
    return /8\s*(hojas|h)/.test(name) ? "ventora:multislide-s83-8h" : "ventora:multislide-s83-4h";
  }
  if (/3200/.test(name) && /puerta|abatible/.test(name)) return "ventora:serie-3200-puerta-abatible-1h";
  if (/4600/.test(name) && /puerta|vaiven|vaiven/.test(name)) return "ventora:serie-4600-puerta-vaiven";
  if (/s-?33|s33/.test(name) && /corredera/.test(name)) {
    return /rpt/.test(name) ? "ventora:s33-rpt-corredera-2h" : "ventora:s33-corredera-2h";
  }
  if (/4800/.test(name) && /corredera/.test(name)) return "ventora:serie-4800-corredera-2h";
  return null;
}

function createDefinitions(catalogKey: string, lineName: string): FabricacionReceta[] {
  if (
    catalogKey === "ventora:optima-s28-corredera-2h" ||
    catalogKey === "ventora:optima-s28-corredera-3h" ||
    catalogKey === "ventora:s38-rpt-proyectante"
  ) {
    return crearRecetasSodalCatalogo2026({
      catalogKey,
      lineName,
    });
  }

  if (catalogKey === "ventora:multislide-s83-4h") {
    return crearRecetasSodalP2A({ catalogKey, lineName });
  }
  if (catalogKey === "ventora:multislide-s83-8h") {
    return crearRecetasSodalP2A({ catalogKey, lineName });
  }
  if (catalogKey === "ventora:serie-3200-puerta-abatible-1h") {
    return crearRecetasSodalP2A({ catalogKey, lineName });
  }
  if (catalogKey === "ventora:serie-4600-puerta-vaiven") {
    return crearRecetasSodalP2A({ catalogKey, lineName }).filter((recipe) =>
      recipe.identidad.variante.toLocaleLowerCase("es-CL").includes("hidráulico mab")
    );
  }
  if (catalogKey === "ventora:serie-4800-corredera-2h") {
    return crearRecetasSodalP2A({ catalogKey, lineName });
  }
  if (catalogKey === "ventora:s33-corredera-2h") {
    return crearRecetasSodalP2A({ catalogKey, lineName });
  }
  if (catalogKey === "ventora:s33-rpt-corredera-2h") {
    return crearRecetasSodalP2A({ catalogKey, lineName });
  }
  return [];
}

export function buildSodalEditorRecipeDefaults(input: {
  catalogKey: string | null | undefined;
  lineTemplateId: number;
  lineName: string;
  providerName?: string | null;
}): FabricationRecipeRecord[] {
  const catalogKey = resolveSodalCatalogKey(input);
  if (
    !catalogKey ||
    (!SODAL_2026_CATALOG_KEYS.has(catalogKey) && !SODAL_P2A_CATALOG_KEYS.has(catalogKey))
  ) {
    return [];
  }

  return createDefinitions(catalogKey, input.lineName).map((definition) => {
    const sourceReference = `${SODAL_EDITOR_RECIPE_SOURCE_PREFIX}${catalogKey}:${definition.identidad.codigo}`;
    const identitySlug = encodeURIComponent(definition.identidad.variante);
    return {
      id: `ventora:system:${catalogKey}:${identitySlug}`,
      organizationId: null,
      lineTemplateId: input.lineTemplateId,
      scope: "ventora",
      providerName: "SODAL",
      lineName: input.lineName,
      typology: definition.identidad.tipologia,
      leavesCount: definition.identidad.hojas,
      variant: definition.identidad.variante,
      version: definition.version,
      status: "testing",
      definition,
      sourceType: "manufacturer",
      sourceReference,
      sourceName: "SODAL",
      sourceRevision: "2026",
      parentRecipeId: null,
      validatedAt: null,
      validatedBy: null,
      createdAt: "2026-10-08T00:00:00.000Z",
      updatedAt: "2026-10-08T00:00:00.000Z",
      eliminadoEn: null,
    };
  });
}

export function isSodalEditorRecipe(recipe: FabricationRecipeRecord): boolean {
  return recipe.scope === "ventora" && Boolean(
    recipe.sourceReference?.startsWith(SODAL_EDITOR_RECIPE_SOURCE_PREFIX)
  );
}

function recipeIdentity(recipe: FabricationRecipeRecord): string {
  return `${recipe.definition.identidad.tipologia}::${recipe.definition.identidad.hojas}::${recipe.definition.identidad.variante}`;
}

function isAvailableRecipe(recipe: FabricationRecipeRecord): boolean {
  const sourceReference = recipe.sourceReference ?? "";
  return (
    !recipe.eliminadoEn &&
    recipe.status !== "archived" &&
    sourceReference !== "blank-start" &&
    !sourceReference.startsWith("base-ventora:") &&
    !sourceReference.startsWith("ventora-arquetipo:")
  );
}

/**
 * Keeps manufacturer defaults as the system variant choices. A workshop recipe
 * replaces a default only when both represent the same tipology/leaves/variant;
 * unrelated workshop recipes remain available in their own section.
 */
export function buildSodalEditorRecipeChoices(input: {
  organization: FabricationRecipeRecord[];
  defaults: FabricationRecipeRecord[];
}): {
  system: FabricationRecipeRecord[];
  workshop: FabricationRecipeRecord[];
} {
  const organization = input.organization.filter(
    (recipe) => recipe.scope === "organization" && isAvailableRecipe(recipe)
  );
  const defaults = input.defaults.filter(isAvailableRecipe);
  const defaultIdentities = new Set(defaults.map(recipeIdentity));

  const system = defaults.map(
    (recipe) =>
      organization.find((candidate) => recipeIdentity(candidate) === recipeIdentity(recipe)) ?? recipe
  );

  return {
    system,
    workshop: organization.filter((recipe) => !defaultIdentities.has(recipeIdentity(recipe))),
  };
}

export function mergeSodalEditorRecipeDefaults(input: {
  organization: FabricationRecipeRecord[];
  defaults: FabricationRecipeRecord[];
}): FabricationRecipeRecord[] {
  const choices = buildSodalEditorRecipeChoices(input);
  return [...choices.system, ...choices.workshop];
}
