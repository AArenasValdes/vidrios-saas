import {
  buildAlumetricaHaciendoTestingBundles,
  buildMergedL4800ZetaTestingBundles,
  type ExternalTestingBundle,
} from "@/features/fabricacion/fixtures/alumetrica-haciendoventanas-testing";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export type SeedExternalRecipeLine = {
  id: number | string;
  catalog_key?: string | null;
  nombre: string;
  proveedor?: string | null;
};

export type SeedExternalRecipeDeps = {
  listVentoraLineTemplates: (
    organizationId: number,
  ) => Promise<SeedExternalRecipeLine[]>;
  listRecipesForOrganization: (
    organizationId: number,
  ) => Promise<FabricationRecipeRecord[]>;
  insertRecipe: (payload: Record<string, unknown>) => Promise<void>;
};

export type SeedExternalRecipeOptions = {
  organizationId: number;
  lineAllowlist?: string[];
};

export type SeedExternalRecipeResult = {
  seeded: string[];
  skipped: string[];
  conflicts: Array<{ sourceReference: string; reason: string }>;
  missingLines: string[];
};

function assertOrganizationId(organizationId: number): void {
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    throw new Error(
      "El seed Alumétrica/Haciendo Ventanas requiere organizationId entero y explícito.",
    );
  }
}

function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForComparison);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeForComparison(
          (value as Record<string, unknown>)[key],
        );
        return result;
      }, {});
  }
  return value;
}

function sameDefinition(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeForComparison(left)) ===
    JSON.stringify(normalizeForComparison(right))
  );
}

function buildPayload(input: {
  organizationId: number;
  line: SeedExternalRecipeLine;
  bundle: ExternalTestingBundle;
  version: number;
  parentRecipeId: string | null;
}): Record<string, unknown> {
  const { bundle, line } = input;
  return {
    organization_id: input.organizationId,
    line_template_id: line.id,
    scope: "organization",
    provider_name: line.proveedor?.trim() || bundle.providerName,
    line_name: line.nombre || bundle.lineName,
    typology: bundle.definition.identidad.tipologia,
    leaves_count: bundle.definition.identidad.hojas,
    variant: bundle.definition.identidad.variante,
    version: input.version,
    status: "testing",
    definition: {
      ...bundle.definition,
      version: input.version,
      estado: "lista_para_validar",
    },
    source_type: "manufacturer",
    source_name: "Alumétrica + Haciendo Ventanas + Zeta",
    source_reference: bundle.sourceReference,
    source_revision: bundle.sourceRevision,
    parent_recipe_id: input.parentRecipeId,
    validated_at: null,
    validated_by: null,
  };
}

function isSameVariant(
  recipe: FabricationRecipeRecord,
  bundle: ExternalTestingBundle,
  lineTemplateId: number | string,
): boolean {
  return (
    String(recipe.lineTemplateId) === String(lineTemplateId) &&
    recipe.definition.identidad.tipologia === bundle.definition.identidad.tipologia &&
    recipe.definition.identidad.hojas === bundle.definition.identidad.hojas &&
    recipe.definition.identidad.variante === bundle.definition.identidad.variante
  );
}

/**
 * Seed explícito, por organización, de recetas documentales en testing.
 * No archiva, no actualiza y nunca crea recetas scope=ventora.
 */
export async function seedAlumetricaHaciendoVentanasRecipes(
  options: SeedExternalRecipeOptions,
  deps: SeedExternalRecipeDeps,
): Promise<SeedExternalRecipeResult> {
  assertOrganizationId(options.organizationId);

  const templates = await deps.listVentoraLineTemplates(options.organizationId);
  const allowlist = options.lineAllowlist
    ? new Set(options.lineAllowlist)
    : null;
  const bundles = [
    ...buildAlumetricaHaciendoTestingBundles(),
    ...buildMergedL4800ZetaTestingBundles(),
  ].filter((bundle) => !allowlist || allowlist.has(bundle.catalogKey));
  const matchingTemplates = new Map(
    templates
      .filter((template) => template.catalog_key)
      .map((template) => [template.catalog_key!, template]),
  );
  const existing = await deps.listRecipesForOrganization(options.organizationId);
  const result: SeedExternalRecipeResult = {
    seeded: [],
    skipped: [],
    conflicts: [],
    missingLines: [],
  };

  for (const bundle of bundles) {
    const line = matchingTemplates.get(bundle.catalogKey);
    if (!line) {
      result.missingLines.push(bundle.catalogKey);
      continue;
    }

    const lineRecipes = existing.filter((recipe) =>
      isSameVariant(recipe, bundle, line.id),
    );
    const sameReference = lineRecipes.find(
      (recipe) => recipe.sourceReference === bundle.sourceReference,
    );
    if (sameReference) {
      if (sameDefinition(sameReference.definition, bundle.definition)) {
        result.skipped.push(bundle.sourceReference);
      } else {
        result.conflicts.push({
          sourceReference: bundle.sourceReference,
          reason:
            "La misma referencia ya existe con una definición diferente; no se sobrescribe.",
        });
      }
      continue;
    }

    const latestVersion = existing
      .filter((recipe) => String(recipe.lineTemplateId) === String(line.id))
      .reduce((max, recipe) => Math.max(max, recipe.version), 0);
    const parent = [...lineRecipes]
      .filter((recipe) => recipe.status !== "archived" && !recipe.eliminadoEn)
      .sort((left, right) => right.version - left.version)[0];
    const version = latestVersion + 1;
    await deps.insertRecipe(
      buildPayload({
        organizationId: options.organizationId,
        line,
        bundle,
        version,
        parentRecipeId: parent?.id ?? null,
      }),
    );
    result.seeded.push(bundle.sourceReference);
    existing.push({
      id: `seeded:${bundle.sourceReference}`,
      organizationId: options.organizationId,
      lineTemplateId: Number(line.id),
      scope: "organization",
      providerName: bundle.providerName,
      lineName: line.nombre,
      typology: bundle.definition.identidad.tipologia,
      leavesCount: bundle.definition.identidad.hojas,
      variant: bundle.definition.identidad.variante,
      version,
      status: "testing",
      definition: { ...bundle.definition, version },
      sourceType: "manufacturer",
      sourceReference: bundle.sourceReference,
      sourceName: "Alumétrica + Haciendo Ventanas + Zeta",
      sourceRevision: bundle.sourceRevision,
      parentRecipeId: parent?.id ?? null,
      validatedAt: null,
      validatedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eliminadoEn: null,
    });
  }

  return result;
}
