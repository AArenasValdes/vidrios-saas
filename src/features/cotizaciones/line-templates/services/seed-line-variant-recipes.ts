import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import {
  buildSeedPayloadForVariantSlot,
  findRecipeForVariantSlot,
  listMissingVariantSlots,
} from "@/features/fabricacion/services/fabricacion-line-variant.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export type LineTemplateVariantSeedRow = {
  id: number | string;
  catalog_key?: string | null;
  nombre: string;
  proveedor?: string | null;
};

export type SeedLineVariantRecipesDeps = {
  listVentoraLineTemplates: (
    organizationId: string | number
  ) => Promise<LineTemplateVariantSeedRow[]>;
  listRecipesForOrganization: (
    organizationId: string | number
  ) => Promise<FabricationRecipeRecord[]>;
  insertVariantRecipe: (payload: Record<string, unknown>) => Promise<void>;
};

/**
 * Inserta recetas faltantes por variante documentada (idempotente).
 * No sobrescribe recetas existentes ni variantes ya presentes.
 */
export async function seedLineVariantRecipesForOrganization(
  organizationId: string | number,
  deps: SeedLineVariantRecipesDeps
): Promise<{ seeded: number; skipped: number }> {
  const templates = await deps.listVentoraLineTemplates(organizationId);
  const ventoraLines = templates.filter((row) => isVentoraCatalogKey(row.catalog_key));
  if (ventoraLines.length === 0) {
    return { seeded: 0, skipped: 0 };
  }

  const recipes = await deps.listRecipesForOrganization(organizationId);
  const recipesByLine = new Map<string, FabricationRecipeRecord[]>();
  recipes.forEach((recipe) => {
    if (recipe.lineTemplateId == null) return;
    const key = String(recipe.lineTemplateId);
    const bucket = recipesByLine.get(key) ?? [];
    bucket.push(recipe);
    recipesByLine.set(key, bucket);
  });

  let seeded = 0;
  let skipped = 0;

  for (const line of ventoraLines) {
    const lineRecipes = recipesByLine.get(String(line.id)) ?? [];
    const missingSlots = listMissingVariantSlots({
      catalogKey: line.catalog_key,
      recipes: lineRecipes,
    });

    if (missingSlots.length === 0) {
      skipped += 1;
      continue;
    }

    for (const slot of missingSlots) {
      if (findRecipeForVariantSlot(lineRecipes, slot)) {
        skipped += 1;
        continue;
      }

      try {
        const payload = buildSeedPayloadForVariantSlot({
          organizationId,
          lineTemplateId: line.id,
          lineName: line.nombre,
          providerName: line.proveedor,
          catalogKey: line.catalog_key,
          slot,
        });
        await deps.insertVariantRecipe(payload);
        seeded += 1;
      } catch (error) {
        console.warn(
          "[seedLineVariantRecipesForOrganization] insert failed",
          line.catalog_key,
          slot.sourceReference,
          error
        );
        skipped += 1;
      }
    }
  }

  return { seeded, skipped };
}
