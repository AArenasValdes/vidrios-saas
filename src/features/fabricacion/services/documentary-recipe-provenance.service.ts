import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export function isIndependentWorkshopRecipe(
  recipe: FabricationRecipeRecord,
  recipes: readonly FabricationRecipeRecord[],
  organizationId: number | null,
  disputed: { id: string; reference: string; requireTraceableCopy?: boolean },
): boolean {
  if (organizationId == null || recipe.scope !== "organization" || recipe.organizationId !== organizationId) return false;
  const visiting = new Set<string>();
  const checked = new Map<string, boolean>();
  const visit = (current: FabricationRecipeRecord): boolean => {
    const known = checked.get(current.id);
    if (known !== undefined) return known;
    if (visiting.has(current.id)) return false;
    visiting.add(current.id);
    if (current.scope !== "organization" || current.organizationId !== organizationId || current.lineTemplateId !== recipe.lineTemplateId) return false;
    const resolveReference = (reference: string): boolean => {
      if (reference === disputed.reference || reference === disputed.id) return false;
      if (reference.startsWith("taller:personalizada:")) {
        try { return resolveReference(decodeURIComponent(reference.slice("taller:personalizada:".length))); }
        catch { return false; }
      }
      const parent = recipes.find((candidate) => candidate.id === reference);
      if (parent) return visit(parent);
      if (disputed.requireTraceableCopy && current.sourceType !== "manual" && !current.parentRecipeId) return false;
      return reference === "blank-start" || reference.startsWith("configuracion-taller:") || reference.startsWith("configuracion-catalogo-taller:");
    };
    const reference = current.sourceReference?.trim() ?? "";
    const result = current.id !== disputed.id &&
      (!disputed.requireTraceableCopy || !current.parentRecipeId || recipes.some((candidate) => candidate.id === current.parentRecipeId)) &&
      (!current.parentRecipeId || resolveReference(current.parentRecipeId)) &&
      Boolean(reference) && resolveReference(reference);
    visiting.delete(current.id);
    checked.set(current.id, result);
    return result;
  };
  return visit(recipe);
}
