import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getDefaultLineCatalogMetadata } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";
import { listLeafModules, type GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

export type LineCompatibilityContext = {
  componentType?: string | null;
  openingType?: string | null;
  leavesCount?: number | null;
  movingLeavesCount?: number | null;
  material?: string | null;
};

export type RecipeAvailability =
  | "not_checked"
  | "price_only"
  | "available"
  | "ready_to_test"
  | "validated";

export type LineCompatibilityResult = {
  commercial: "compatible" | "incompatible" | "insufficient_data";
  commercialEvidence: "explicit" | "legacy_material" | "incomplete_declaration";
  recipe: RecipeAvailability;
  commercialPrice: "configured" | "pending";
  reason: string | null;
};

export type CatalogProductConfiguration = {
  id: string;
  componentType: string;
  openingType: string;
  label: string;
  typology: FabricacionTipologia;
  variant: string;
  leavesCounts?: number[];
  movingLeavesCounts?: number[];
  /** Sin composición declarada, el editor debe pedir una elección del taller. */
  compositionPending?: boolean;
  /** Procedencia de identidad. Las composiciones privadas usan "workshop". */
  source?: "catalog" | "workshop";
};

type CompatibilityDeclaration = {
  componentTypes?: string[];
  openingTypes?: string[];
  leavesCounts?: number[];
  movingLeavesCounts?: number[];
  materials?: string[];
  configurations?: CatalogProductConfiguration[];
};

const FABRICATION_TYPOLOGIES = new Set<FabricacionTipologia>([
  "pano_fijo", "corredera", "abatible", "proyectante", "puerta_abatible",
  "puerta_vaiven", "puerta_corredera", "pvc_monorriel", "shower", "personalizada",
]);

/** Pares exactos publicados por el catálogo; las hojas se agregan solo con fuente que las declare. */
export function getCatalogProductConfigurations(
  catalogKey: string | null | undefined
): CatalogProductConfiguration[] {
  const metadata = getDefaultLineCatalogMetadata(catalogKey);
  const raw = metadata?.compatibility;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const values = (raw as { configurations?: unknown }).configurations;
  if (Array.isArray(values)) {
    return values.filter((value): value is CatalogProductConfiguration =>
    typeof value === "object" && value !== null &&
    typeof (value as CatalogProductConfiguration).id === "string" &&
    typeof (value as CatalogProductConfiguration).componentType === "string" &&
    typeof (value as CatalogProductConfiguration).openingType === "string" &&
    typeof (value as CatalogProductConfiguration).label === "string" &&
    typeof (value as CatalogProductConfiguration).variant === "string" &&
    FABRICATION_TYPOLOGIES.has((value as CatalogProductConfiguration).typology) &&
    (!("leavesCounts" in (value as object)) ||
      (Array.isArray((value as CatalogProductConfiguration).leavesCounts) &&
        (value as CatalogProductConfiguration).leavesCounts?.every((count) => Number.isInteger(count) && count > 0) === true)) &&
    (!("movingLeavesCounts" in (value as object)) ||
      (Array.isArray((value as CatalogProductConfiguration).movingLeavesCounts) &&
        (value as CatalogProductConfiguration).movingLeavesCounts?.every((count) => Number.isInteger(count) && count > 0) === true))
    ).map((configuration) => ({
    ...configuration,
    source: "catalog" as const,
      compositionPending: configuration.compositionPending ?? true,
    ...(Array.isArray(configuration.leavesCounts) ? { leavesCounts: [...configuration.leavesCounts] } : {}),
    ...(Array.isArray(configuration.movingLeavesCounts) ? { movingLeavesCounts: [...configuration.movingLeavesCounts] } : {}),
    }));
  }

  // The legacy declaration represents one exact pair only when each axis has
  // one value. Multiple independent arrays do not identify valid pairings.
  const declaration = raw as CompatibilityDeclaration;
  const componentType = declaration.componentTypes?.length === 1 ? declaration.componentTypes[0] : null;
  const openingType = declaration.openingTypes?.length === 1 ? declaration.openingTypes[0] : null;
  if (!catalogKey || !componentType || !openingType) return [];
  const typology = resolveConfigurationTypology(componentType, openingType);
  if (!typology) return [];
  const configurationId = `${catalogKey}:configuration:${typology}:${normalizeOpeningType(openingType)}`
    .replaceAll(/[^a-z0-9:_-]+/g, "-");
  return [{
    id: configurationId,
    componentType,
    openingType,
    label: `${componentType} ${openingType.toLocaleLowerCase("es-CL")}`,
    typology,
    variant: configurationId,
    ...(declaration.leavesCounts?.length ? { leavesCounts: [...declaration.leavesCounts] } : {}),
    ...(declaration.movingLeavesCounts?.length ? { movingLeavesCounts: [...declaration.movingLeavesCounts] } : {}),
    source: "catalog",
  }];
}

function resolveConfigurationTypology(
  componentType: string,
  openingType: string
): FabricacionTipologia | null {
  const component = normalize(componentType);
  const opening = normalizeOpeningType(openingType);
  if (opening === "fijo") return "pano_fijo";
  if (opening === "corredera") {
    if (component.includes("puerta")) return "puerta_corredera";
    return "corredera";
  }
  if (opening === "abatible" || opening === "proyectante") {
    if (component.includes("puerta")) return "puerta_abatible";
    return opening;
  }
  if (opening === "vaiven" && component.includes("puerta")) return "puerta_vaiven";
  if (opening === "shower") return "shower";
  return null;
}

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
  const isCanonicalConfiguration = typeof getDefaultLineCatalogMetadata(template.catalogKey)?.configurationKey === "string";
  const isBahar5200Line = template.catalogKey?.startsWith("ventora:veratec-bahar-5200-") === true;
  const isElegansFixedLine = template.catalogKey === "ventora:veratec-elegans-60-fijo";
  const value = isCanonicalConfiguration && defaultDeclaration
    ? defaultDeclaration
    :
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
          movingLeavesCounts: Array.from(new Set([
            ...(storedDeclaration.movingLeavesCounts ?? []),
            ...(defaultDeclaration.movingLeavesCounts ?? []),
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
            movingLeavesCounts: storedDeclaration.movingLeavesCounts ?? defaultDeclaration.movingLeavesCounts,
            materials: storedDeclaration.materials ?? defaultDeclaration.materials,
            configurations: storedDeclaration.configurations ?? defaultDeclaration.configurations,
          }
        : storedDeclaration ?? defaultDeclaration;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function matchesText(values: string[] | undefined, input: string | null | undefined) {
  if (!values?.length || !input?.trim()) return true;
  return values.some((value) => normalize(value) === normalize(input));
}

export function normalizeOpeningType(value: string | null | undefined) {
  const normalized = normalize(value);
  // “Shower corredera” describes a shower product with sliding opening;
  // classify it by the opening so L12's explicit Corredera declaration matches.
  if (normalized.includes("shower") && normalized.includes("corredera")) return "corredera";
  if (normalized.includes("shower")) return "shower";
  if (normalized.includes("plegable")) return "plegable";
  if (normalized.includes("corredera")) return "corredera";
  if (normalized.includes("proyectante")) return "proyectante";
  if (normalized.includes("abatible") || normalized.includes("abatir") || normalized.includes("abrir")) return "abatible";
  if (normalized.includes("pivotante")) return "pivotante";
  if (normalized.includes("vaiven")) return "vaiven";
  if (normalized.includes("fijo")) return "fijo";
  return normalized;
}

export function resolveLineCompatibilityOpeningType(
  system: string | null | undefined,
  configuration: string | null | undefined,
  guidedVisualConfig?: GuidedVisualConfig | null,
): string | null {
  const knownOpenings = new Set(["corredera", "abatible", "proyectante", "fijo", "vaiven", "plegable", "pivotante", "shower", "guillotina", "celosia"]);
  const systemOpening = normalizeOpeningType(system);
  const moduleTypes = guidedVisualConfig?.root
    ? listLeafModules(guidedVisualConfig.root).map((module) => module.type)
    : [];
  if (systemOpening === "shower") {
    const configurationOpening = normalizeOpeningType(configuration);
    if (configurationOpening === "corredera") return configuration?.trim() ?? "Corredera";
    if (moduleTypes.length > 0 && moduleTypes.every((type) => type === "shower_corredera")) return "Corredera";
  }
  if (knownOpenings.has(systemOpening)) return system?.trim() ?? null;

  const configurationOpening = normalizeOpeningType(configuration);
  if (knownOpenings.has(configurationOpening)) return configuration?.trim() ?? null;

  if (moduleTypes.length === 0) return null;

  const types = new Set(moduleTypes);
  // Una corredera puede tener paños fijos dentro del mismo vano. En cambio,
  // aperturas distintas mezcladas no permiten afirmar compatibilidad de línea.
  if (types.has("corredera") && [...types].every((type) => type === "corredera" || type === "fijo")) return "Corredera";
  if (types.size !== 1) return null;

  const [moduleType] = types;
  if (moduleType === "fijo") return "Fijo";
  if (moduleType === "corredera" || moduleType === "puerta_corredera") return "Corredera";
  if (moduleType === "abatible" || moduleType === "oscilobatiente" || moduleType === "puerta") return "Abatible";
  if (moduleType === "proyectante") return "Proyectante";
  if (moduleType === "shower_frontal" || moduleType === "shower_corredera") return "Shower";
  if (moduleType === "guillotina") return "Guillotina";
  if (moduleType === "celosia") return "Celosía";
  return null;
}

function matchesOpeningType(values: string[] | undefined, input: string | null | undefined) {
  if (!values?.length || !input?.trim()) return true;
  return values.some((value) => normalizeOpeningType(value) === normalizeOpeningType(input));
}

function declarationCoversContext(
  declared: CompatibilityDeclaration,
  context: LineCompatibilityContext,
  line: CotizacionLineTemplate,
): boolean {
  const hasConfigurations = Boolean(declared.configurations?.length);
  if (context.componentType?.trim() && !hasConfigurations && !declared.componentTypes?.length) return false;
  if (context.openingType?.trim() && !hasConfigurations && !declared.openingTypes?.length) return false;
  // An omitted leaf count means the catalogue has not constrained that axis;
  // it must not hide an otherwise explicitly compatible commercial line.
  // Explicit counts are still enforced by leavesCompatible / configuration matching.
  if (context.material?.trim() && !declared.materials?.length && !line.material?.trim()) return false;
  return true;
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
  const leavesCompatible = context.leavesCount == null || declared?.leavesCounts?.length
    ? context.leavesCount == null || Boolean(declared?.leavesCounts?.includes(context.leavesCount))
    : true;
  const movingLeavesCompatible = context.movingLeavesCount == null || declared?.movingLeavesCounts?.length
    ? context.movingLeavesCount == null || Boolean(declared?.movingLeavesCounts?.includes(context.movingLeavesCount))
    : true;
  const hasEvidence = declared
    ? declarationCoversContext(declared, context, line)
    : !line.catalogKey;
  const compatible = !hasEvidence
    ? false
    : declared
    ? (declared.configurations?.length
        ? declared.configurations.some((configuration) =>
            matchesText([configuration.componentType], context.componentType) &&
            matchesOpeningType([configuration.openingType], context.openingType) &&
            (context.leavesCount == null || !configuration.leavesCounts?.length || configuration.leavesCounts.includes(context.leavesCount)) &&
            (context.movingLeavesCount == null || !configuration.movingLeavesCounts?.length || configuration.movingLeavesCounts.includes(context.movingLeavesCount))
          )
        : matchesText(declared.componentTypes, context.componentType) &&
          matchesOpeningType(declared.openingTypes, context.openingType)) &&
      leavesCompatible &&
      movingLeavesCompatible &&
      matchesText(declared.materials, context.material)
    : line.catalogKey
      ? normalize(line.material) === normalize(context.material)
      : true;

  return {
    commercial: !hasEvidence ? "insufficient_data" : compatible ? "compatible" : "incompatible",
    commercialEvidence: !hasEvidence
      ? "incomplete_declaration"
      : declared ? "explicit" : "legacy_material",
    recipe: input.recipe ?? (line.catalogKey ? "not_checked" : "price_only"),
    commercialPrice: line.precioM2Sugerido > 0 ? "configured" : "pending",
    reason: compatible
      ? null
      : !hasEvidence
        ? "Faltan datos de compatibilidad para confirmar esta configuración."
        : "La línea no declara compatibilidad con esta configuración.",
  };
}
