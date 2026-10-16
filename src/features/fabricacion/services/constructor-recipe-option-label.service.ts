import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export function getConstructorRecipeSourceLabel(recipe: FabricationRecipeRecord): string {
  if (recipe.sourceReference?.startsWith("taller:personalizada:")) return "Variante del taller";

  const sourceName = recipe.sourceName?.trim();
  if (sourceName) {
    const normalized = sourceName.toLocaleLowerCase("es-CL");
    if (normalized.includes("confirmación del titular")) return "Ventora";
    if (normalized.includes("referencia ventora")) return "Ventora";
    if (normalized.includes("referencia universal de taller")) return "Configuración del taller";
    return sourceName;
  }

  const providerName = recipe.providerName?.trim();
  if (providerName && providerName.toLocaleLowerCase("es-CL") !== "ventora") {
    return providerName;
  }

  return recipe.scope === "organization" ? "Configuración del taller" : "Ventora";
}

export function getConstructorRecipeProfileCodeLabel(
  recipe: FabricationRecipeRecord
): string | null {
  const codes = Array.from(
    new Set(
      recipe.definition.perfiles
        .map((profile) => profile.codigoPerfil.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "es", { numeric: true }));

  return codes.length > 0 ? `Perfiles ${codes.join(", ")}` : null;
}
