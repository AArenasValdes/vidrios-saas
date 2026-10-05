import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export type LineCompatibilityContext = {
  componentType?: string | null;
  openingType?: string | null;
  leavesCount?: number | null;
  material?: string | null;
};

export type RecipeAvailability =
  | "not_checked"
  | "price_only"
  | "available"
  | "ready_to_test"
  | "validated";

export type LineCompatibilityResult = {
  commercial: "compatible" | "incompatible";
  commercialEvidence: "explicit" | "legacy_material";
  recipe: RecipeAvailability;
  commercialPrice: "configured" | "pending";
  reason: string | null;
};

type CompatibilityDeclaration = {
  componentTypes?: string[];
  openingTypes?: string[];
  leavesCounts?: number[];
  materials?: string[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function declaration(template: CotizacionLineTemplate): CompatibilityDeclaration | null {
  const value = template.catalogMetadata?.compatibility;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as CompatibilityDeclaration;
}

function matchesText(values: string[] | undefined, input: string | null | undefined) {
  if (!values?.length || !input?.trim()) return true;
  return values.some((value) => normalize(value) === normalize(input));
}

/**
 * Contrato único de selección. La compatibilidad comercial permanece separada
 * de la receta; el campo de familia/insumo puede evolucionar sin introducir SKUs.
 */
export function evaluateLineCompatibility(input: {
  line: CotizacionLineTemplate;
  context: LineCompatibilityContext;
  recipe?: RecipeAvailability;
}): LineCompatibilityResult {
  const { line, context } = input;
  const declared = declaration(line);
  const isExplicitFamilyConfiguration = typeof line.catalogMetadata?.configurationKey === "string";
  const leavesCompatible = context.leavesCount == null
    ? true
    : declared?.leavesCounts?.length
      ? declared.leavesCounts.includes(context.leavesCount)
      : !isExplicitFamilyConfiguration;
  const compatible = declared
    ? matchesText(declared.componentTypes, context.componentType) &&
      matchesText(declared.openingTypes, context.openingType) &&
      leavesCompatible &&
      matchesText(declared.materials, context.material)
    : !isExplicitFamilyConfiguration;

  return {
    commercial: compatible ? "compatible" : "incompatible",
    commercialEvidence: declared ? "explicit" : "legacy_material",
    recipe: input.recipe ?? (line.catalogKey ? "not_checked" : "price_only"),
    commercialPrice: line.precioM2Sugerido > 0 ? "configured" : "pending",
    reason: compatible ? null : "La línea no declara compatibilidad con esta configuración.",
  };
}
