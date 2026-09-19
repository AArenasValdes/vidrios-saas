import { SODAL_L25_CATALOG_KEY } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import {
  buildAllSodalL25Recipes,
  type SodalL25RecipeBundle,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { isZetaConfirmedSourceReference } from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export type LineTemplateSodalSeedRow = {
  id: number | string;
  catalog_key?: string | null;
  nombre: string;
  proveedor?: string | null;
};

export type SeedSodalL25RecipesDeps = {
  listVentoraLineTemplates: (
    organizationId: string | number
  ) => Promise<LineTemplateSodalSeedRow[]>;
  listRecipesForOrganization: (
    organizationId: string | number
  ) => Promise<FabricationRecipeRecord[]>;
  insertSodalRecipe: (payload: Record<string, unknown>) => Promise<void>;
  archiveLegacyRecipe?: (recipeId: string) => Promise<void>;
};

function buildInsertPayload(input: {
  organizationId: string | number;
  lineTemplateId: string | number;
  lineName: string;
  providerName: string | null | undefined;
  bundle: SodalL25RecipeBundle;
}): Record<string, unknown> {
  const { definition, identity, sourceReference } = input.bundle;
  return {
    organization_id: input.organizationId,
    line_template_id: input.lineTemplateId,
    scope: "organization",
    provider_name: input.providerName?.trim() || "SODAL",
    line_name: input.lineName,
    typology: identity.typology,
    leaves_count: identity.leaves,
    variant: identity.variantSlug,
    version: 1,
    status: "validated",
    definition,
    source_type: "manufacturer",
    source_name: "SODAL",
    source_reference: sourceReference,
    source_revision: SODAL_L25_FORMULA_VERSION,
    validated_at: new Date().toISOString(),
  };
}

export async function seedSodalL25RecipesForOrganization(
  organizationId: string | number,
  deps: SeedSodalL25RecipesDeps
): Promise<{ seeded: number; archived: number; skipped: number }> {
  const templates = await deps.listVentoraLineTemplates(organizationId);
  const l25Line = templates.find((row) => row.catalog_key === SODAL_L25_CATALOG_KEY);
  if (!l25Line) {
    return { seeded: 0, archived: 0, skipped: 0 };
  }

  const recipes = await deps.listRecipesForOrganization(organizationId);
  const lineRecipes = recipes.filter(
    (recipe) => String(recipe.lineTemplateId) === String(l25Line.id)
  );

  const existingZetaRefs = new Set(
    lineRecipes
      .filter((recipe) => isZetaConfirmedSourceReference(recipe.sourceReference))
      .map((recipe) => recipe.sourceReference)
  );

  let seeded = 0;
  let archived = 0;
  let skipped = 0;

  const bundles = buildAllSodalL25Recipes({ lineName: l25Line.nombre });

  for (const bundle of bundles) {
    if (existingZetaRefs.has(bundle.sourceReference)) {
      skipped += 1;
      continue;
    }

    try {
      await deps.insertSodalRecipe(
        buildInsertPayload({
          organizationId,
          lineTemplateId: l25Line.id,
          lineName: l25Line.nombre,
          providerName: l25Line.proveedor,
          bundle,
        })
      );
      existingZetaRefs.add(bundle.sourceReference);
      seeded += 1;
    } catch (error) {
      console.warn(
        "[seedSodalL25RecipesForOrganization] insert failed",
        bundle.sourceReference,
        error
      );
      skipped += 1;
    }
  }

  if (deps.archiveLegacyRecipe) {
    for (const recipe of lineRecipes) {
      if (recipe.eliminadoEn || recipe.status === "archived") continue;
      if (isZetaConfirmedSourceReference(recipe.sourceReference)) continue;
      try {
        await deps.archiveLegacyRecipe(recipe.id);
        archived += 1;
      } catch (error) {
        console.warn(
          "[seedSodalL25RecipesForOrganization] archive failed",
          recipe.id,
          error
        );
      }
    }
  }

  return { seeded, archived, skipped };
}
