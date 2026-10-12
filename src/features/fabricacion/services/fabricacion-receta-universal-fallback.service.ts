import {
  crearRecetaPlantillaVentoraCorredera2H,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { crearRecetaSerie32ProyectanteNormal, crearRecetaSerie42Proyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { crearRecetasP2U, P2U_CATALOG_KEYS } from "@/features/fabricacion/fixtures/traditional-p2u-recipes";
import { crearRecetasSodalP2A } from "@/features/fabricacion/fixtures/sodal-p2a-recipes";
import {
  crearRecetasSodalCatalogo2026,
  type SodalCatalogo2026RecipeKey,
} from "@/features/fabricacion/fixtures/sodal-catalogo-2026-recipes";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const UNIVERSAL_ALUMINUM_LINE_KEYS = {
  "ventora:l20": "L20",
  "ventora:arquetipo-l20-corredera-2h": "L20",
  "ventora:l32": "L32",
  "ventora:arquetipo-l32-proyectante": "L32",
  "ventora:l42": "L42",
  "ventora:arquetipo-l42-proyectante": "L42",
  "ventora:l5000": "L5000",
  "ventora:serie-12-shower-corredera": "L12",
  "ventora:serie-15-corredera-2h": "L15",
  "ventora:arquetipo-l15-corredera-2h": "L15",
  "ventora:serie-4000-corredera-2h": "L4000",
  "ventora:arquetipo-l4000-corredera-2h": "L4000",
  "ventora:serie-45-puerta": "L45",
  "ventora:arquetipo-l45-puerta": "L45",
  "ventora:s33-corredera-2h": "S33",
  "ventora:s33-rpt-corredera-2h": "S33-RPT",
  "ventora:optima-s28-corredera-2h": "S28",
  "ventora:optima-s28-corredera-3h": "S28",
  "ventora:s38-rpt-proyectante": "S38-RPT",
  "ventora:multislide-s83-4h": "S83",
  "ventora:multislide-s83-8h": "S83",
  "ventora:serie-3200-puerta-abatible-1h": "S3200",
  "ventora:serie-4600-puerta-vaiven": "S4600",
} as const;

const SODAL_CATALOGO_2026_KEYS = new Set<string>([
  "ventora:optima-s28-corredera-2h",
  "ventora:optima-s28-corredera-3h",
  "ventora:s38-rpt-proyectante",
  "ventora:multislide-s83-4h",
  "ventora:multislide-s83-8h",
  "ventora:serie-3200-puerta-abatible-1h",
  "ventora:serie-4600-puerta-vaiven",
]);

export const SODAL_CATALOGO_2026_SOURCE_PREFIX = "sodal:catalogo-sodal-2026:";

export function isSodalCatalogo2026UniversalFallbackKey(catalogKey: string | null): boolean {
  return Boolean(catalogKey && SODAL_CATALOGO_2026_KEYS.has(catalogKey));
}

export function isReplaceableUniversalStructuralRecipe(input: {
  sourceReference: string | null;
}): boolean {
  const sourceReference = input.sourceReference;
  return Boolean(
    sourceReference?.startsWith("base-ventora:") ||
    sourceReference?.startsWith("ventora-arquetipo:") ||
    sourceReference?.startsWith(SODAL_CATALOGO_2026_SOURCE_PREFIX) ||
    // ALAR's catalog variant is a provider-specific draft. The owner-confirmed
    // universal L42 recipe is the canonical recipe for quote calculation.
    sourceReference?.startsWith("user-provided:alar-linea42:proyectante-4201:"),
  );
}

export function resolveConfirmedUniversalFallbackVariant(input: {
  catalogKey: string | null;
  variant: string | null;
  selectedRecipe: Pick<FabricationRecipeRecord, "sourceReference"> | null;
}): string | null {
  const isL42 = input.catalogKey === "ventora:l42" ||
    input.catalogKey === "ventora:arquetipo-l42-proyectante";
  const isAlarFrameVariant = input.selectedRecipe?.sourceReference?.startsWith(
    "user-provided:alar-linea42:proyectante-4201:",
  );
  return isL42 && isAlarFrameVariant ? "normal" : input.variant;
}

/**
 * These aluminum profile-cut recipes were explicitly confirmed as workshop
 * validated by the Ventora owner, based on the rules reviewed with his father.
 * The key is intentionally separate from the broader set of calculable lines.
 */
export const USER_CONFIRMED_UNIVERSAL_WORKSHOP_LINE_KEYS = new Set([
  "ventora:l20",
  "ventora:arquetipo-l20-corredera-2h",
  "ventora:l32",
  "ventora:arquetipo-l32-proyectante",
  "ventora:l42",
  "ventora:arquetipo-l42-proyectante",
  "ventora:l5000",
  "ventora:serie-12-shower-corredera",
]);

export const USER_CONFIRMED_UNIVERSAL_WORKSHOP_SOURCE_PREFIX =
  "ventora:taller-confirmado:universal:";

function markUserConfirmedProfileCutRecipe(definition: FabricationRecipeRecord["definition"]) {
  const accessoryNote = definition.identidad.tipologia === "shower"
    ? ["La confirmación cubre el despiece de perfiles; vidrio y quincallería se gestionan aparte."]
    : [];

  return {
    ...definition,
    estado: "validada" as const,
    permitirCalculoPreliminarConPendientes: undefined,
    datosPendientes: undefined,
    perfiles: definition.perfiles.map((profile) => ({
      ...profile,
      datosPendientes: undefined,
      observaciones: [
        profile.observaciones
          ?.replace(/Función y medida base sugeridas por Ventora\./gi, "")
          .replace(/Descuento documentado[^.]*\./gi, "")
          .replace(/validar (?:con )?una fabricación real[^.]*\./gi, "")
          .trim(),
        "Base y descuento confirmados por el taller.",
      ]
        .filter(Boolean)
        .join(" "),
    })),
    notasValidacion: [
      ...definition.notasValidacion.filter(
        (note) => !/validar.*(real|taller)|pendiente de validaci[oó]n|no equivale a validaci[oó]n/i.test(note),
      ),
      "Despiece de perfiles validado por el taller; confirmado por el titular de Ventora.",
      ...accessoryNote,
    ],
  };
}

type UniversalPricedLineKey = keyof typeof UNIVERSAL_ALUMINUM_LINE_KEYS;

type UniversalFallbackInput = {
  catalogKey: UniversalPricedLineKey;
  lineTemplateId: number;
  organizationId: number | null;
  lineName: string;
  variant: string | null;
  leavesCount?: number | null;
  typology?: string | null;
  glassName?: string | null;
};

function buildSodalCatalogo2026Recipes(input: UniversalFallbackInput): FabricationRecipeRecord[] {
  if (!SODAL_CATALOGO_2026_KEYS.has(input.catalogKey)) return [];

  let definitions: FabricacionReceta[];
  if (
    input.catalogKey === "ventora:optima-s28-corredera-2h" ||
    input.catalogKey === "ventora:optima-s28-corredera-3h" ||
    input.catalogKey === "ventora:s38-rpt-proyectante"
  ) {
    definitions = crearRecetasSodalCatalogo2026({
      catalogKey: input.catalogKey as SodalCatalogo2026RecipeKey,
      lineName: input.lineName,
    });
  } else {
    const sodalKey = input.catalogKey as
      | "ventora:multislide-s83-4h"
      | "ventora:multislide-s83-8h"
      | "ventora:serie-3200-puerta-abatible-1h"
      | "ventora:serie-4600-puerta-vaiven";
    definitions = crearRecetasSodalP2A({ catalogKey: sodalKey, lineName: input.lineName });
    if (input.catalogKey === "ventora:serie-4600-puerta-vaiven") {
      // El catálogo SODAL 2026 documenta el quicio hidráulico MAB, no la
      // alternativa mecánica que existe en la referencia antigua.
      definitions = definitions.filter((definition) =>
        definition.identidad.variante.toLocaleLowerCase("es-CL").includes("hidráulico mab"),
      );
    }
  }

  const normalizedVariant = input.variant?.trim().toLocaleLowerCase("es-CL") ?? "";
  const normalizedGlass = input.glassName?.trim().toLocaleLowerCase("es-CL") ?? "";
  const s28 = input.catalogKey.startsWith("ventora:optima-s28-");
  const s38Rpt = input.catalogKey === "ventora:s38-rpt-proyectante";
  const compatible = definitions.filter((definition) => {
    if (input.typology && definition.identidad.tipologia !== input.typology) return false;
    if (input.leavesCount != null && definition.identidad.hojas !== input.leavesCount) return false;
    if ((s28 || s38Rpt) && normalizedGlass) {
      const termopanel = /termopanel|\bdvh\b/i.test(normalizedGlass);
      if (!termopanel) return false;
      if (s28 && !/20\s*mm|4\s*[+/]\s*12\s*[+/]\s*4/i.test(normalizedGlass)) return false;
    }
    return true;
  });
  const explicitVariantMatches = normalizedVariant
    ? compatible.filter((definition) =>
        definition.identidad.variante.toLocaleLowerCase("es-CL").includes(normalizedVariant),
      )
    : [];
  const candidates = explicitVariantMatches.length > 0 ? explicitVariantMatches : compatible;

  return candidates.map((definition): FabricationRecipeRecord => ({
    id: `ventora:universal:${input.catalogKey.replace("ventora:", "")}:${definition.identidad.variante}`,
    organizationId: input.organizationId,
    lineTemplateId: input.lineTemplateId,
    scope: "ventora",
    providerName: "Ventora",
    lineName: input.lineName,
    typology: definition.identidad.tipologia,
    leavesCount: definition.identidad.hojas,
    variant: definition.identidad.variante,
    version: definition.version,
    status: "testing",
    definition,
    sourceType: "manufacturer",
    sourceReference: `${SODAL_CATALOGO_2026_SOURCE_PREFIX}${input.catalogKey.replace("ventora:", "")}`,
    sourceName: "SODAL",
    sourceRevision: "2026",
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-10-07T00:00:00.000Z",
    updatedAt: "2026-10-07T00:00:00.000Z",
    eliminadoEn: null,
  }));
}

function buildReferenceRecipe(input: UniversalFallbackInput): FabricationRecipeRecord | null {
  const line = UNIVERSAL_ALUMINUM_LINE_KEYS[input.catalogKey];
  if (SODAL_CATALOGO_2026_KEYS.has(input.catalogKey)) {
    const sodal2026 = buildSodalCatalogo2026Recipes(input);
    return sodal2026.length === 1 ? sodal2026[0]! : null;
  }
  const workshopValidated = USER_CONFIRMED_UNIVERSAL_WORKSHOP_LINE_KEYS.has(input.catalogKey);
  let definition: FabricationRecipeRecord["definition"];
  let sourceReference: string;
  let sourceType: FabricationRecipeRecord["sourceType"] = "ventora_reference";
  let sourceName = "Referencia Ventora";

  if (line === "L12") {
    if ((input.typology && input.typology !== "shower") || (input.leavesCount != null && input.leavesCount !== 2)) {
      return null;
    }
    definition = crearRecetasP2U({
      catalogKey: P2U_CATALOG_KEYS.line12,
      lineName: input.lineName,
    })[0]!;
    // En el cotizador, “corredera frontal” describe la disposición comercial
    // del shower. La receta confirmada es única para Shower 2H, aunque la
    // etiqueta comercial no use el nombre histórico “Tina”.
    if (input.variant?.trim()) {
      definition = {
        ...definition,
        identidad: { ...definition.identidad, variante: input.variant.trim() },
      };
    }
    sourceType = "manufacturer";
    sourceName = "Referencia universal de taller";
    sourceReference = "arquetipo:linea-12-shower:reglas-usuario:5-reglas-9-cortes";
  } else if (line === "S33" || line === "S33-RPT") {
    definition = crearRecetasSodalP2A({
      catalogKey: input.catalogKey as "ventora:s33-corredera-2h" | "ventora:s33-rpt-corredera-2h",
      lineName: input.lineName,
    })[0]!;
    sourceType = "manufacturer";
    sourceName = "SODAL";
    sourceReference = line === "S33"
      ? "sodal:catalogo-general-2018:p41:s33-2h"
      : "sodal:catalogo-rpt:s33-rpt-2h";
  } else if (line === "L15" || line === "L4000" || line === "L45") {
    const catalogKey = line === "L15"
      ? P2U_CATALOG_KEYS.line15
      : line === "L4000"
        ? P2U_CATALOG_KEYS.line4000
        : P2U_CATALOG_KEYS.line45;
    const candidates = crearRecetasP2U({ catalogKey, lineName: input.lineName });
    const matching = candidates.filter((candidate) => {
      if (input.variant && candidate.identidad.variante !== input.variant) return false;
      return line === "L45" || input.leavesCount == null || candidate.identidad.hojas === input.leavesCount;
    });
    if (matching.length !== 1) return null;
    definition = matching[0]!;
    sourceType = line === "L15" ? "supplier" : "manufacturer";
    sourceName = line === "L15" ? "ALAR" : line === "L4000" ? "Columbia" : "SODAL / Indalum";
    sourceReference = line === "L15"
      ? "ventora:line-15-corredera:2h:v1"
      : line === "L4000"
        ? "ventora:line-4000-corredera:2h:v1"
        : "sodal+indalum:serie-45-practicable:puerta:1h";
  } else if (line === "L20" || line === "L5000") {
    const templateId = line as PlantillaVentoraCorrederaId;
    const acceptedVariants = line === "L20"
      ? new Set(["estandar", "pierna_abierta_jamba_2009"])
      : new Set(["estandar", "caracol"]);
    if (input.variant && !acceptedVariants.has(input.variant)) return null;
    definition = crearRecetaPlantillaVentoraCorredera2H(templateId);
    if (input.variant) {
      definition = {
        ...definition,
        identidad: { ...definition.identidad, variante: input.variant },
      };
    }
    sourceReference = `ventora:base-tipologica:${templateId.toLowerCase()}:referencia`;
  } else if (line === "L32") {
    if (input.variant && input.variant !== "normal") return null;
    definition = crearRecetaSerie32ProyectanteNormal({ lineName: input.lineName });
    sourceReference = "ventora:serie-32-proyectante:normal:referencia";
  } else {
    const normalizedVariant = input.variant?.trim().toLocaleLowerCase("es-CL") ?? "";
    const acceptedNormalVariants = new Set(["normal", "estandar", "estándar", "al-42 normal"]);
    if (normalizedVariant && !acceptedNormalVariants.has(normalizedVariant)) return null;
    if (input.typology && input.typology !== "proyectante") return null;
    if (input.leavesCount != null && input.leavesCount !== 1) return null;
    definition = crearRecetaSerie42Proyectante({
      variant: "normal",
      lineName: input.lineName,
    });
    sourceReference = "ventora:serie-42-proyectante:normal:referencia";
  }

  if (workshopValidated) {
    definition = markUserConfirmedProfileCutRecipe(definition);
    sourceType = "workshop";
    sourceName = "Taller · confirmación del titular";
    sourceReference = `${USER_CONFIRMED_UNIVERSAL_WORKSHOP_SOURCE_PREFIX}${line.toLowerCase()}:2026-10-07`;
  }

  return {
    id: `ventora:universal:${line.toLowerCase()}:${definition.identidad.variante}`,
    organizationId: input.organizationId,
    lineTemplateId: input.lineTemplateId,
    scope: "ventora",
    providerName: "Ventora",
    lineName: input.lineName,
    typology: definition.identidad.tipologia,
    leavesCount: definition.identidad.hojas,
    variant: definition.identidad.variante,
    version: definition.version,
    status: workshopValidated ? "validated" : "testing",
    definition,
    sourceType,
    sourceReference,
    sourceName,
    sourceRevision: null,
    parentRecipeId: null,
    validatedAt: workshopValidated ? "2026-10-07T00:00:00.000Z" : null,
    validatedBy: null,
    createdAt: "2026-10-07T00:00:00.000Z",
    updatedAt: "2026-10-07T00:00:00.000Z",
    eliminadoEn: null,
  };
}

/**
 * Provides the confirmed universal recipe when the selected variant lacks a
 * validated organization recipe. For the owner-confirmed subset this replaces
 * stale drafts; a validated organization recipe for the same variant wins.
 * L25 continues through its dedicated evidence-backed resolver.
 */
export function resolveUniversalPricedLineFallback(input: {
  catalogKey: string | null;
  lineTemplateId: number;
  organizationId: number | null;
  lineName: string;
  variant: string | null;
  leavesCount?: number | null;
  recipes: readonly FabricationRecipeRecord[];
}): FabricationRecipeRecord | null {
  const candidates = resolveUniversalPricedLineFallbacks(input);
  return candidates.length === 1 ? candidates[0]! : null;
}

export function resolveUniversalPricedLineFallbacks(input: {
  catalogKey: string | null;
  lineTemplateId: number;
  organizationId: number | null;
  lineName: string;
  variant: string | null;
  leavesCount?: number | null;
  typology?: string | null;
  glassName?: string | null;
  recipes: readonly FabricationRecipeRecord[];
}): FabricationRecipeRecord[] {
  if (!(input.catalogKey && input.catalogKey in UNIVERSAL_ALUMINUM_LINE_KEYS)) {
    return [];
  }
  const activeLineRecipes = input.recipes.filter(
    (recipe) =>
      recipe.lineTemplateId === input.lineTemplateId &&
      !recipe.eliminadoEn &&
      recipe.status !== "archived",
  );
  const workshopConfirmedLine = USER_CONFIRMED_UNIVERSAL_WORKSHOP_LINE_KEYS.has(input.catalogKey);
  const hasWorkshopCustomizedRecipe = activeLineRecipes.some((recipe) => {
    if (!recipe.sourceReference?.startsWith("taller:personalizada:")) return false;
    if (input.variant && recipe.variant !== input.variant) return false;
    if (input.leavesCount != null && recipe.leavesCount !== input.leavesCount) return false;
    if (input.typology && recipe.typology !== input.typology) return false;
    return true;
  });
  if (hasWorkshopCustomizedRecipe) return [];

  const isSodal2026 = SODAL_CATALOGO_2026_KEYS.has(input.catalogKey);
  const replaceableStructuralDrafts = isSodal2026 && activeLineRecipes.every(
    (recipe) => recipe.status !== "validated" && isReplaceableUniversalStructuralRecipe(recipe),
  );
  if (
    activeLineRecipes.some(
      (recipe) =>
        recipe.status === "validated" &&
        !(workshopConfirmedLine && isReplaceableUniversalStructuralRecipe(recipe)) &&
        (!isSodal2026 || !input.typology || recipe.typology === input.typology) &&
        (!input.variant || recipe.variant === input.variant) &&
        (input.leavesCount == null || recipe.leavesCount === input.leavesCount),
    ) ||
    (activeLineRecipes.length > 0 &&
      !USER_CONFIRMED_UNIVERSAL_WORKSHOP_LINE_KEYS.has(input.catalogKey) &&
      !replaceableStructuralDrafts)
  ) {
    return [];
  }

  if (isSodal2026) {
    const candidates = buildSodalCatalogo2026Recipes({
      catalogKey: input.catalogKey as UniversalPricedLineKey,
      lineTemplateId: input.lineTemplateId,
      organizationId: input.organizationId,
      lineName: input.lineName,
      variant: input.variant,
      leavesCount: input.leavesCount,
      typology: input.typology,
      glassName: input.glassName,
    });
    return candidates.filter((candidate) =>
      !activeLineRecipes.some((recipe) =>
        recipe.status !== "archived" &&
        recipe.lineTemplateId === input.lineTemplateId &&
        recipe.definition.identidad.tipologia === candidate.definition.identidad.tipologia &&
        recipe.definition.identidad.hojas === candidate.definition.identidad.hojas &&
        recipe.definition.identidad.variante === candidate.definition.identidad.variante,
      ),
    );
  }

  const fallback = buildReferenceRecipe({
    catalogKey: input.catalogKey as UniversalPricedLineKey,
    lineTemplateId: input.lineTemplateId,
    organizationId: input.organizationId,
    lineName: input.lineName,
    variant: input.variant,
    leavesCount: input.leavesCount,
    typology: input.typology,
    glassName: input.glassName,
  });
  return fallback ? [fallback] : [];
}
