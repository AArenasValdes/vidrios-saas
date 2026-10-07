import {
  crearRecetaVeratecCompactSliding,
  crearRecetaVeratec7400Workbook3H,
  crearRecetaVeratec7400Monorriel,
  crearRecetaVeratecElegansBatiente,
  crearRecetaVeratecElegansFijo,
  VERATEC_COMPACT_SLIDING_VARIANTS,
  VERATEC_7400_WORKBOOK_3H_VARIANTS,
  VERATEC_7400_MONORAIL_VARIANTS,
  VERATEC_ELEGANS_BATIENTE_VARIANTS,
  VERATEC_ELEGANS_FIXED_VARIANTS,
  VERATEC_WORKBOOK_SOURCE_REVISION,
} from "@/features/fabricacion/fixtures/veratec-workbook-recipes";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function createRecord(input: {
  lineTemplateId: number;
  organizationId: number | null;
  lineName: string;
  definition: FabricationRecipeRecord["definition"];
  sourceReference: string;
}): FabricationRecipeRecord {
  const now = new Date().toISOString();
  return {
    id: `veratec:workbook:${input.definition.identidad.variante}`,
    organizationId: input.organizationId,
    lineTemplateId: input.lineTemplateId,
    scope: "ventora",
    providerName: "VERATEC",
    lineName: input.lineName,
    typology: input.definition.identidad.tipologia,
    leavesCount: input.definition.identidad.hojas,
    variant: input.definition.identidad.variante,
    version: input.definition.version,
    status: "testing",
    definition: input.definition,
    sourceType: "supplier",
    sourceReference: input.sourceReference,
    sourceName: "Veratec · pauta de corte facilitada",
    sourceRevision: VERATEC_WORKBOOK_SOURCE_REVISION,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: now,
    updatedAt: now,
    eliminadoEn: null,
  };
}

/**
 * Ventora-wide, non-persisted calculation base for documented Veratec workbook
 * variants. It is only used when the company has not saved its own recipe for
 * the selected line; it never changes a persisted recipe or marks it validated.
 */
export function resolveVeratecWorkbookFallback(input: {
  catalogKey: string | null;
  lineTemplateId: number;
  organizationId: number | null;
  lineName: string;
  variant: string | null;
  recipes: readonly FabricationRecipeRecord[];
}): FabricationRecipeRecord[] {
  if (!input.catalogKey) return [];
  if (input.recipes.some((recipe) =>
    recipe.scope === "organization" &&
    recipe.organizationId === input.organizationId &&
    recipe.lineTemplateId === input.lineTemplateId &&
    !recipe.eliminadoEn &&
    recipe.status !== "archived"
  )) return [];

  const compact = VERATEC_COMPACT_SLIDING_VARIANTS.find((candidate) =>
    input.catalogKey === `ventora:veratec-compact-sliding-${candidate.leaves}h`
  );
  if (compact) {
    const definition = crearRecetaVeratecCompactSliding({ lineName: input.lineName, variant: compact.slug });
    return [createRecord({
      lineTemplateId: input.lineTemplateId,
      organizationId: input.organizationId,
      lineName: input.lineName,
      definition,
      sourceReference: compact.sourceReference,
    })];
  }

  const elegans = VERATEC_ELEGANS_BATIENTE_VARIANTS.find(
    (candidate) => candidate.catalogKey === input.catalogKey,
  );
  if (elegans) {
    const definition = crearRecetaVeratecElegansBatiente({ lineName: input.lineName, variant: elegans.slug });
    return [createRecord({
      lineTemplateId: input.lineTemplateId,
      organizationId: input.organizationId,
      lineName: input.lineName,
      definition,
      sourceReference: elegans.sourceReference,
    })];
  }

  if (input.catalogKey === "ventora:veratec-elegans-60-fijo") {
    const variants = VERATEC_ELEGANS_FIXED_VARIANTS.filter((candidate) =>
      !input.variant || candidate.slug === input.variant
    );
    return variants.map((fixed) => {
      const definition = crearRecetaVeratecElegansFijo({ lineName: input.lineName, variant: fixed.slug });
      return createRecord({
        lineTemplateId: input.lineTemplateId,
        organizationId: input.organizationId,
        lineName: input.lineName,
        definition,
        sourceReference: fixed.sourceReference,
      });
    });
  }

  if (input.catalogKey === "ventora:veratec-7400-corredera-3h") {
    const variants = VERATEC_7400_WORKBOOK_3H_VARIANTS.filter((candidate) =>
      !input.variant || candidate.slug === input.variant
    );
    return variants.map((variant) => {
      const definition = crearRecetaVeratec7400Workbook3H({ lineName: input.lineName, variant: variant.slug });
      return createRecord({
        lineTemplateId: input.lineTemplateId,
        organizationId: input.organizationId,
        lineName: input.lineName,
        definition,
        sourceReference: variant.sourceReference,
      });
    });
  }

  if (input.catalogKey === "ventora:veratec-7400-monorriel") {
    const variants = VERATEC_7400_MONORAIL_VARIANTS.filter((candidate) =>
      !input.variant || candidate.slug === input.variant
    );
    return variants.map((variant) => {
      const definition = crearRecetaVeratec7400Monorriel({ lineName: input.lineName, variant: variant.slug });
      return createRecord({
        lineTemplateId: input.lineTemplateId,
        organizationId: input.organizationId,
        lineName: input.lineName,
        definition,
        sourceReference: variant.sourceReference,
      });
    });
  }

  return [];
}
