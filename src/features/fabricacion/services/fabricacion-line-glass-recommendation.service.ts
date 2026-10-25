import { isPlaceholderRecipeGlassName } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

/**
 * Propone vidrio habitual solo cuando las recetas de la línea coinciden en un
 * único nombre comercial. Variantes con vidrios distintos quedan sin cambio.
 */
export function resolveUniqueRecipeGlassRecommendation(
  recipes: FabricationRecipeRecord[],
  selectedRecipeId: string,
  savedRecipe: FabricacionReceta
): string | null {
  const definitions = [
    savedRecipe,
    ...recipes
      .filter((recipe) => recipe.id !== selectedRecipeId)
      .map((recipe) => recipe.definition),
  ];
  const names = new Map<string, string>();

  for (const definition of definitions) {
    for (const glass of definition.vidrios) {
      const name = glass.nombre.trim().replace(/\s+/g, " ");
      if (isPlaceholderRecipeGlassName(name)) continue;
      const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
      if (!names.has(key)) names.set(key, name);
    }
  }

  return names.size === 1 ? [...names.values()][0] : null;
}
