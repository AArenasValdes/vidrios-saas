/**
 * Receta de fabricación V1 — componentes reales (riel, jamba, etc.)
 * con reglas de corte guiadas. Vive en catalog_metadata.fabricationRecipe.
 */

export const FABRICATION_TYPES = [
  "corredera_2_hojas",
  "corredera_3_hojas",
  "corredera_4_hojas",
  "proyectante",
  "abatible",
  "pano_fijo",
  "puerta_abatible",
  "puerta_corredera",
  "shower_corredera",
  "shower_abatible",
  "cierre_logia",
  "personalizado",
] as const;

export type FabricationType = (typeof FABRICATION_TYPES)[number];

export const FABRICATION_TYPE_LABELS: Record<FabricationType, string> = {
  corredera_2_hojas: "Corredera 2 hojas",
  corredera_3_hojas: "Corredera 3 hojas",
  corredera_4_hojas: "Corredera 4 hojas",
  proyectante: "Proyectante",
  abatible: "Abatible",
  pano_fijo: "Paño fijo",
  puerta_abatible: "Puerta abatible",
  puerta_corredera: "Puerta corredera",
  shower_corredera: "Shower corredera",
  shower_abatible: "Shower abatible",
  cierre_logia: "Cierre de logia o balcón",
  personalizado: "Configuración personalizada",
};

export const RECIPE_STATUSES = [
  "sin_configurar",
  "en_configuracion",
  "lista_para_validar",
  "en_validacion",
  "validada",
  "requiere_revision",
] as const;

export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export const RECIPE_STATUS_LABELS: Record<RecipeStatus, string> = {
  sin_configurar: "Sin configurar",
  en_configuracion: "En configuración",
  lista_para_validar: "Lista para validar",
  en_validacion: "En validación",
  validada: "Validada",
  requiere_revision: "Requiere revisión",
};

export const RECIPE_COMPONENT_FUNCTIONS = [
  "riel_superior",
  "riel_inferior",
  "jamba",
  "cabezal",
  "zocalo",
  "pierna",
  "traslapo",
  "marco",
  "hoja",
  "junquillo",
  "palillo",
  "travesano",
  "vidrio",
  "accesorio",
  "otro",
] as const;

export type RecipeComponentFunction = (typeof RECIPE_COMPONENT_FUNCTIONS)[number];

export const RECIPE_COMPONENT_FUNCTION_LABELS: Record<RecipeComponentFunction, string> = {
  riel_superior: "Riel superior",
  riel_inferior: "Riel inferior",
  jamba: "Jamba",
  cabezal: "Cabezal",
  zocalo: "Zócalo",
  pierna: "Pierna",
  traslapo: "Traslapo",
  marco: "Marco",
  hoja: "Hoja",
  junquillo: "Junquillo",
  palillo: "Palillo",
  travesano: "Travesaño",
  vidrio: "Vidrio",
  accesorio: "Accesorio",
  otro: "Otro perfil",
};

export const MEASURE_BASES = [
  "vano_width",
  "vano_height",
  "half_vano_width",
  "sash_width",
  "sash_height",
  "module_width",
  "module_height",
  "glass_width",
  "glass_height",
  "fixed",
] as const;

export type MeasureBase = (typeof MEASURE_BASES)[number];

export const MEASURE_BASE_LABELS: Record<MeasureBase, string> = {
  vano_width: "Ancho total",
  vano_height: "Alto total",
  half_vano_width: "Mitad del ancho total",
  sash_width: "Ancho de hoja",
  sash_height: "Alto de hoja",
  module_width: "Ancho de módulo",
  module_height: "Alto de módulo",
  glass_width: "Ancho de vidrio",
  glass_height: "Alto de vidrio",
  fixed: "Medida fija",
};

export const QUANTITY_RULES = [
  "fixed",
  "per_sash",
  "two_per_sash",
  "per_module",
  "two_per_module",
  "custom",
] as const;

export type QuantityRule = (typeof QUANTITY_RULES)[number];

export const QUANTITY_RULE_LABELS: Record<QuantityRule, string> = {
  fixed: "Cantidad fija",
  per_sash: "Una por hoja",
  two_per_sash: "Dos por hoja",
  per_module: "Una por módulo",
  two_per_module: "Dos por módulo",
  custom: "Cantidad personalizada",
};

export const ADJUST_MODES = ["none", "subtract", "add"] as const;
export type AdjustMode = (typeof ADJUST_MODES)[number];

export const ADJUST_MODE_LABELS: Record<AdjustMode, string> = {
  none: "Sin ajuste",
  subtract: "Restar milímetros",
  add: "Sumar milímetros",
};

export const COMPONENT_KINDS = ["profile", "glass", "accessory"] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export type RecipeComponent = {
  id: string;
  functionKey: RecipeComponentFunction;
  functionLabel: string;
  kind: ComponentKind;
  profileCode: string;
  profileName: string;
  quantityRule: QuantityRule;
  quantityValue: number;
  measureBase: MeasureBase;
  adjustMode: AdjustMode;
  adjustMm: number;
  fixedMeasureMm: number;
  required: boolean;
  barLengthMm: number | null;
  kerfMm: number | null;
  notes: string;
};

export type RecipeVariant = "estandar" | "reforzada" | "termopanel" | string;

export type RecipeValidationCase = {
  widthMm: number;
  heightMm: number;
  sashCount: number;
  moduleCount: number;
  realCuts: Array<{
    componentId: string;
    lengthMm: number;
    widthMm?: number;
    heightMm?: number;
  }>;
};

export type FabricationRecipe = {
  v: 1;
  fabricationType: FabricationType;
  variant: RecipeVariant;
  sashCount: number;
  moduleCount: number;
  status: RecipeStatus;
  components: RecipeComponent[];
  validatedAt: string | null;
  validationCase: RecipeValidationCase | null;
};

export type WorkshopProfile = {
  code: string;
  name: string;
  proveedor: string | null;
  barLengthMm: number;
  kerfMm: number;
  costo: number | null;
};

export type RecipeMeasureContext = {
  widthMm: number;
  heightMm: number;
  sashCount: number;
  moduleCount: number;
  quantity: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asPositiveInt(value: unknown, fallback: number): number {
  const parsed = Math.round(asNumber(value, fallback));
  return parsed > 0 ? parsed : fallback;
}

function asNonNeg(value: unknown, fallback: number): number {
  const parsed = asNumber(value, fallback);
  return parsed >= 0 ? parsed : fallback;
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyRecipe(
  fabricationType: FabricationType = "personalizado"
): FabricationRecipe {
  return {
    v: 1,
    fabricationType,
    variant: "estandar",
    sashCount: fabricationType.includes("corredera_3")
      ? 3
      : fabricationType.includes("corredera_4")
        ? 4
        : fabricationType.includes("corredera") || fabricationType.includes("puerta")
          ? 2
          : 1,
    moduleCount: 1,
    status: "sin_configurar",
    components: [],
    validatedAt: null,
    validationCase: null,
  };
}

export function createRecipeComponent(
  partial: Partial<RecipeComponent> & {
    functionKey: RecipeComponentFunction;
  }
): RecipeComponent {
  const functionLabel =
    partial.functionLabel?.trim() ||
    RECIPE_COMPONENT_FUNCTION_LABELS[partial.functionKey];
  const kind: ComponentKind =
    partial.kind ??
    (partial.functionKey === "vidrio"
      ? "glass"
      : partial.functionKey === "accesorio"
        ? "accessory"
        : "profile");

  return {
    id: partial.id ?? createId(partial.functionKey),
    functionKey: partial.functionKey,
    functionLabel,
    kind,
    profileCode: partial.profileCode?.trim() ?? "",
    profileName: partial.profileName?.trim() ?? "",
    quantityRule: partial.quantityRule ?? "fixed",
    quantityValue: Math.max(1, Math.round(partial.quantityValue ?? 1)),
    measureBase:
      partial.measureBase ??
      (kind === "glass"
        ? "glass_width"
        : kind === "accessory"
          ? "fixed"
          : "vano_width"),
    adjustMode: partial.adjustMode ?? "none",
    adjustMm: Math.max(0, Math.round(partial.adjustMm ?? 0)),
    fixedMeasureMm: Math.max(0, Math.round(partial.fixedMeasureMm ?? 0)),
    required: partial.required ?? true,
    barLengthMm: partial.barLengthMm ?? null,
    kerfMm: partial.kerfMm ?? null,
    notes: partial.notes?.trim() ?? "",
  };
}

export function parseFabricationRecipe(value: unknown): FabricationRecipe | null {
  if (!isRecord(value) || value.v !== 1) return null;

  const fabricationType = FABRICATION_TYPES.includes(value.fabricationType as FabricationType)
    ? (value.fabricationType as FabricationType)
    : "personalizado";
  const status = RECIPE_STATUSES.includes(value.status as RecipeStatus)
    ? (value.status as RecipeStatus)
    : "sin_configurar";

  const components = Array.isArray(value.components)
    ? value.components
        .map((entry) => parseRecipeComponent(entry))
        .filter((entry): entry is RecipeComponent => Boolean(entry))
    : [];

  return {
    v: 1,
    fabricationType,
    variant: asText(value.variant, "estandar") || "estandar",
    sashCount: asPositiveInt(value.sashCount, 1),
    moduleCount: asPositiveInt(value.moduleCount, 1),
    status,
    components,
    validatedAt: asText(value.validatedAt) || null,
    validationCase: parseValidationCase(value.validationCase),
  };
}

function parseRecipeComponent(value: unknown): RecipeComponent | null {
  if (!isRecord(value)) return null;
  const functionKey = RECIPE_COMPONENT_FUNCTIONS.includes(
    value.functionKey as RecipeComponentFunction
  )
    ? (value.functionKey as RecipeComponentFunction)
    : "otro";
  const kind = COMPONENT_KINDS.includes(value.kind as ComponentKind)
    ? (value.kind as ComponentKind)
    : functionKey === "vidrio"
      ? "glass"
      : functionKey === "accesorio"
        ? "accessory"
        : "profile";
  const quantityRule = QUANTITY_RULES.includes(value.quantityRule as QuantityRule)
    ? (value.quantityRule as QuantityRule)
    : "fixed";
  const measureBase = MEASURE_BASES.includes(value.measureBase as MeasureBase)
    ? (value.measureBase as MeasureBase)
    : "vano_width";
  const adjustMode = ADJUST_MODES.includes(value.adjustMode as AdjustMode)
    ? (value.adjustMode as AdjustMode)
    : "none";

  return createRecipeComponent({
    id: asText(value.id) || createId(functionKey),
    functionKey,
    functionLabel: asText(value.functionLabel) || RECIPE_COMPONENT_FUNCTION_LABELS[functionKey],
    kind,
    profileCode: asText(value.profileCode),
    profileName: asText(value.profileName),
    quantityRule,
    quantityValue: asPositiveInt(value.quantityValue, 1),
    measureBase,
    adjustMode,
    adjustMm: asNonNeg(value.adjustMm, 0),
    fixedMeasureMm: asNonNeg(value.fixedMeasureMm, 0),
    required: value.required !== false,
    barLengthMm:
      value.barLengthMm === null || value.barLengthMm === undefined
        ? null
        : asPositiveInt(value.barLengthMm, 6000),
    kerfMm:
      value.kerfMm === null || value.kerfMm === undefined
        ? null
        : asNonNeg(value.kerfMm, 3),
    notes: asText(value.notes),
  });
}

function parseValidationCase(value: unknown): RecipeValidationCase | null {
  if (!isRecord(value)) return null;
  return {
    widthMm: asPositiveInt(value.widthMm, 1200),
    heightMm: asPositiveInt(value.heightMm, 1000),
    sashCount: asPositiveInt(value.sashCount, 1),
    moduleCount: asPositiveInt(value.moduleCount, 1),
    realCuts: Array.isArray(value.realCuts)
      ? value.realCuts
          .filter(isRecord)
          .map((cut) => ({
            componentId: asText(cut.componentId),
            lengthMm: asNonNeg(cut.lengthMm, 0),
            widthMm:
              cut.widthMm === undefined ? undefined : asPositiveInt(cut.widthMm, 1),
            heightMm:
              cut.heightMm === undefined ? undefined : asPositiveInt(cut.heightMm, 1),
          }))
          .filter((cut) => cut.componentId)
      : [],
  };
}

export function parseWorkshopProfiles(value: unknown): WorkshopProfile[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((entry) => ({
      code: asText(entry.code),
      name: asText(entry.name),
      proveedor: asText(entry.proveedor) || null,
      barLengthMm: asPositiveInt(entry.barLengthMm, 6000),
      kerfMm: asNonNeg(entry.kerfMm, 3),
      costo:
        entry.costo === null || entry.costo === undefined
          ? null
          : asNonNeg(entry.costo, 0),
    }))
    .filter((entry) => entry.code || entry.name);
}

export function getFabricationRecipeFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): FabricationRecipe | null {
  if (!metadata) return null;
  return parseFabricationRecipe(metadata.fabricationRecipe);
}

export function mergeFabricationRecipeIntoMetadata(
  metadata: Record<string, unknown> | null | undefined,
  recipe: FabricationRecipe | null
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(metadata ?? {}) };
  if (!recipe) {
    delete next.fabricationRecipe;
    return next;
  }
  next.fabricationRecipe = recipe;
  return next;
}

export function hasWorkshopProfileAssigned(component: RecipeComponent): boolean {
  if (component.kind === "glass") return true;
  const code = sanitizeWorkshopProfileCode(component.profileCode);
  if (code) return true;
  const name = sanitizeWorkshopProfileCode(component.profileName);
  return Boolean(name && name !== component.functionLabel.trim());
}

export function isComponentConfigured(component: RecipeComponent): boolean {
  if (component.kind === "accessory") {
    return component.quantityValue > 0;
  }
  if (component.kind === "glass") {
    return (
      component.measureBase === "glass_width" ||
      component.measureBase === "glass_height" ||
      component.measureBase === "fixed" ||
      component.adjustMode !== "none" ||
      Boolean(component.profileName)
    );
  }
  const hasMeasure =
    component.measureBase === "fixed"
      ? component.fixedMeasureMm > 0
      : MEASURE_BASES.includes(component.measureBase);
  // Cortes se pueden estimar sin código de taller; el estado de receta exige perfil real.
  return hasMeasure && component.quantityValue > 0;
}

export function deriveRecipeStatus(recipe: FabricationRecipe): RecipeStatus {
  if (recipe.components.length === 0) return "sin_configurar";

  const required = recipe.components.filter((component) => component.required);
  const requiredOk =
    required.length > 0 && required.every((component) => isComponentConfigured(component));

  if (!requiredOk) return "en_configuracion";

  const profilesOk = required.every(
    (component) => component.kind === "glass" || hasWorkshopProfileAssigned(component)
  );
  if (!profilesOk) return "en_configuracion";

  if (recipe.status === "validada" && recipe.validatedAt) return "validada";
  if (recipe.status === "requiere_revision") return "requiere_revision";
  if (recipe.status === "en_validacion") return "en_validacion";
  if (recipe.validationCase) return "en_validacion";
  return "lista_para_validar";
}

export function markRecipeDirtyAfterEdit(recipe: FabricationRecipe): FabricationRecipe {
  const nextStatus =
    recipe.status === "validada" || recipe.status === "requiere_revision"
      ? "requiere_revision"
      : deriveRecipeStatus({ ...recipe, status: "en_configuracion" });

  return {
    ...recipe,
    status: nextStatus === "lista_para_validar" ? "lista_para_validar" : nextStatus,
    validatedAt:
      nextStatus === "requiere_revision" || nextStatus === "validada"
        ? recipe.validatedAt
        : null,
  };
}

export function duplicateRecipeAsVariant(
  recipe: FabricationRecipe,
  variantName: string
): FabricationRecipe {
  return {
    ...recipe,
    variant: variantName.trim() || "variante",
    status: "en_configuracion",
    validatedAt: null,
    validationCase: null,
    components: recipe.components.map((component) => ({
      ...component,
      id: createId(component.functionKey),
    })),
  };
}

/** Etiquetas de rol legacy (Marco/Hoja/…) — no son códigos de perfil de taller. */
const GENERIC_ROLE_PROFILE_LABELS = new Set([
  "marco",
  "hoja",
  "encuentro",
  "junquillo",
  "zocalo",
  "accesorio",
  "riel",
  "jamba",
  "vidrio",
]);

export function isGenericRoleProfileLabel(value: string): boolean {
  const normalized = value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return GENERIC_ROLE_PROFILE_LABELS.has(normalized);
}

/** Solo acepta códigos/nombres reales de taller; descarta placeholders Marco/Hoja. */
export function sanitizeWorkshopProfileCode(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || isGenericRoleProfileLabel(trimmed)) return "";
  return trimmed;
}

/** Etiqueta visible cuando falta código de taller (pauta / despiece). */
export const RECIPE_MISSING_PROFILE_LABEL = "Perfil sin código";

export function recipeDisplayProfile(component: RecipeComponent): string {
  const code = sanitizeWorkshopProfileCode(component.profileCode);
  if (code) return code;
  const name = sanitizeWorkshopProfileCode(component.profileName);
  if (name && name !== component.functionLabel.trim()) return name;
  return RECIPE_MISSING_PROFILE_LABEL;
}

export function hasWorkshopProfileCode(component: RecipeComponent): boolean {
  return Boolean(
    sanitizeWorkshopProfileCode(component.profileCode) ||
      (sanitizeWorkshopProfileCode(component.profileName) &&
        sanitizeWorkshopProfileCode(component.profileName) !==
          component.functionLabel.trim())
  );
}
