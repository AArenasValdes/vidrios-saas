import {
  crearRecetaPlantillaVentoraCorredera2H,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { crearRecetaSerie32ProyectanteNormal, crearRecetaSerie42Proyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const UNIVERSAL_ALUMINUM_LINE_KEYS = {
  "ventora:l20": "L20",
  "ventora:l32": "L32",
  "ventora:l42": "L42",
  "ventora:l5000": "L5000",
} as const;

type UniversalPricedLineKey = keyof typeof UNIVERSAL_ALUMINUM_LINE_KEYS;

function buildReferenceRecipe(input: {
  catalogKey: UniversalPricedLineKey;
  lineTemplateId: number;
  organizationId: number | null;
  lineName: string;
  variant: string | null;
}): FabricationRecipeRecord | null {
  const line = UNIVERSAL_ALUMINUM_LINE_KEYS[input.catalogKey];
  let definition: FabricationRecipeRecord["definition"];
  let sourceReference: string;
  let sourceType: FabricationRecipeRecord["sourceType"] = "ventora_reference";
  let sourceName = "Referencia Ventora";

  if (line === "L20" || line === "L5000") {
    const templateId = line as PlantillaVentoraCorrederaId;
    if (input.variant && input.variant !== "estandar") return null;
    definition = crearRecetaPlantillaVentoraCorredera2H(templateId);
    sourceReference = `ventora:base-tipologica:${templateId.toLowerCase()}:referencia`;
  } else if (line === "L32") {
    if (input.variant && input.variant !== "normal") return null;
    definition = crearRecetaSerie32ProyectanteNormal({ lineName: input.lineName });
    sourceReference = "ventora:serie-32-proyectante:normal:referencia";
  } else {
    if (input.variant && input.variant !== "normal") return null;
    definition = crearRecetaSerie42Proyectante({
      variant: "normal",
      lineName: input.lineName,
    });
    sourceReference = "ventora:serie-42-proyectante:normal:referencia";
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
    status: "testing",
    definition,
    sourceType,
    sourceReference,
    sourceName,
    sourceRevision: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-10-07T00:00:00.000Z",
    updatedAt: "2026-10-07T00:00:00.000Z",
    eliminadoEn: null,
  };
}

/**
 * Returns a repository reference only when an organization has no saved recipe
 * for one of the priced universal lines with a self-contained Ventora fixture.
 * It remains a testing recipe, not a workshop-validated recipe. L25 uses its
 * evidence-backed saved recipe because its source loader is server-only.
 */
export function resolveUniversalPricedLineFallback(input: {
  catalogKey: string | null;
  lineTemplateId: number;
  organizationId: number | null;
  lineName: string;
  variant: string | null;
  recipes: readonly FabricationRecipeRecord[];
}): FabricationRecipeRecord | null {
  if (!(input.catalogKey && input.catalogKey in UNIVERSAL_ALUMINUM_LINE_KEYS)) {
    return null;
  }
  if (
    input.recipes.some(
      (recipe) =>
        recipe.lineTemplateId === input.lineTemplateId &&
        !recipe.eliminadoEn &&
        recipe.status !== "archived",
    )
  ) {
    return null;
  }

  return buildReferenceRecipe({
    catalogKey: input.catalogKey as UniversalPricedLineKey,
    lineTemplateId: input.lineTemplateId,
    organizationId: input.organizationId,
    lineName: input.lineName,
    variant: input.variant,
  });
}
