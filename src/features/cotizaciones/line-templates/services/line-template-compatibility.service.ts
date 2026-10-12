import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getDefaultLineCatalogMetadata } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

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
  const storedValue = template.catalogMetadata?.compatibility;
  const defaultValue = getDefaultLineCatalogMetadata(template.catalogKey)?.compatibility;
  const storedDeclaration =
    storedValue && typeof storedValue === "object" && !Array.isArray(storedValue)
      ? (storedValue as CompatibilityDeclaration)
      : null;
  const defaultDeclaration =
    defaultValue && typeof defaultValue === "object" && !Array.isArray(defaultValue)
      ? (defaultValue as CompatibilityDeclaration)
      : null;
  const isBahar5200Line = template.catalogKey?.startsWith("ventora:veratec-bahar-5200-") === true;
  const isElegansFixedLine = template.catalogKey === "ventora:veratec-elegans-60-fijo";
  const value =
    (isBahar5200Line || isElegansFixedLine) &&
    storedDeclaration &&
    defaultDeclaration
      ? {
          ...defaultDeclaration,
          ...storedDeclaration,
          componentTypes: Array.from(new Set([
            ...(storedDeclaration.componentTypes ?? []),
            ...(defaultDeclaration.componentTypes ?? []),
          ])),
          openingTypes: Array.from(new Set([
            ...(storedDeclaration.openingTypes ?? []),
            ...(defaultDeclaration.openingTypes ?? []),
          ])),
          leavesCounts: Array.from(new Set([
            ...(storedDeclaration.leavesCounts ?? []),
            ...(defaultDeclaration.leavesCounts ?? []),
          ])),
          materials: Array.from(new Set([
            ...(storedDeclaration.materials ?? []),
            ...(defaultDeclaration.materials ?? []),
          ])),
        }
      : storedDeclaration && defaultDeclaration
        ? {
            componentTypes: storedDeclaration.componentTypes ?? defaultDeclaration.componentTypes,
            openingTypes: storedDeclaration.openingTypes ?? defaultDeclaration.openingTypes,
            leavesCounts: storedDeclaration.leavesCounts ?? defaultDeclaration.leavesCounts,
            materials: storedDeclaration.materials ?? defaultDeclaration.materials,
          }
        : storedDeclaration ?? defaultDeclaration;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function matchesText(values: string[] | undefined, input: string | null | undefined) {
  if (!values?.length || !input?.trim()) return true;
  return values.some((value) => normalize(value) === normalize(input));
}

function normalizeOpeningType(value: string | null | undefined) {
  const normalized = normalize(value);
  if (normalized.includes("plegable")) return "plegable";
  if (normalized.includes("corredera")) return "corredera";
  if (normalized.includes("proyectante")) return "proyectante";
  if (normalized.includes("abatible") || normalized.includes("abatir") || normalized.includes("abrir")) return "abatible";
  if (normalized.includes("pivotante")) return "pivotante";
  if (normalized.includes("vaiven")) return "vaiven";
  if (normalized.includes("fijo")) return "fijo";
  return normalized;
}

function matchesOpeningType(values: string[] | undefined, input: string | null | undefined) {
  if (!values?.length || !input?.trim()) return true;
  return values.some((value) => normalizeOpeningType(value) === normalizeOpeningType(input));
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
  const isExplicitFamilyConfiguration =
    typeof (line.catalogMetadata?.configurationKey ?? getDefaultLineCatalogMetadata(line.catalogKey)?.configurationKey) ===
    "string";
  const leavesCompatible = context.leavesCount == null
    ? true
    : declared?.leavesCounts?.length
      ? declared.leavesCounts.includes(context.leavesCount)
      : !isExplicitFamilyConfiguration;
  const compatible = declared
    ? matchesText(declared.componentTypes, context.componentType) &&
      matchesOpeningType(declared.openingTypes, context.openingType) &&
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
