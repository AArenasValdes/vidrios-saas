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
  sin_configurar: "Borrador",
  en_configuracion: "Borrador",
  lista_para_validar: "Lista para probar",
  en_validacion: "Lista para probar",
  validada: "Validada por la empresa",
  requiere_revision: "Requiere revisión",
};

/** Apertura / tipología de movimiento de la receta. */
export const APERTURA_TIPOS = [
  "fija",
  "corredera",
  "abatible",
  "proyectante",
  "puerta_abatible",
  "puerta_corredera",
  "otro",
] as const;

export type AperturaTipo = (typeof APERTURA_TIPOS)[number];

export const APERTURA_TIPO_LABELS: Record<AperturaTipo, string> = {
  fija: "Paño fijo",
  corredera: "Corredera",
  abatible: "Abatible",
  proyectante: "Proyectante",
  puerta_abatible: "Puerta abatible",
  puerta_corredera: "Puerta corredera",
  otro: "Otra apertura",
};

/** Herraje / cierre de la receta (separado de apertura). */
export const HERRAJE_TIPOS = [
  "caracol",
  "open_lock",
  "manilla",
  "cremona",
  "cerradura",
  "ninguno",
  "otro",
] as const;

export type HerrajeTipo = (typeof HERRAJE_TIPOS)[number];

export const HERRAJE_TIPO_LABELS: Record<HerrajeTipo, string> = {
  caracol: "Caracol",
  open_lock: "Open Lock",
  manilla: "Manilla",
  cremona: "Cremona",
  cerradura: "Cerradura",
  ninguno: "Sin herraje",
  otro: "Otro",
};

export function herrajeDisplayLabel(
  herrajeTipo: HerrajeTipo,
  herrajeLabel?: string | null
): string {
  if (herrajeTipo === "otro") {
    const custom = (herrajeLabel ?? "").trim();
    return custom || "Otro (sin nombre)";
  }
  return HERRAJE_TIPO_LABELS[herrajeTipo];
}

export function aperturaFromFabricationType(type: FabricationType): AperturaTipo {
  if (type === "pano_fijo") return "fija";
  if (type.startsWith("corredera") || type === "shower_corredera" || type === "cierre_logia") {
    return "corredera";
  }
  if (type === "abatible" || type === "shower_abatible") return "abatible";
  if (type === "proyectante") return "proyectante";
  if (type === "puerta_abatible") return "puerta_abatible";
  if (type === "puerta_corredera") return "puerta_corredera";
  return "otro";
}

export function fabricationTypeMatchesApertura(
  type: FabricationType,
  apertura: AperturaTipo
): boolean {
  return aperturaFromFabricationType(type) === apertura;
}

export const RECIPE_COMPONENT_FUNCTIONS = [
  "riel_superior",
  "riel_inferior",
  "jamba",
  "zocalo",
  "cabezal",
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

/**
 * Orden de taller / pauta Corredera 2 hojas:
 * Riel sup → Riel inf → Jamba → Zócalo → Cabezal → Pierna → Traslapo.
 * No ordenar alfabético en despiece consolidado.
 */
export function recipeFunctionWorkshopOrder(
  functionKeyOrLabel: string | null | undefined
): number {
  const raw = (functionKeyOrLabel ?? "").trim().toLowerCase();
  if (!raw) return RECIPE_COMPONENT_FUNCTIONS.length + 1;

  const byKey = RECIPE_COMPONENT_FUNCTIONS.indexOf(
    raw as RecipeComponentFunction
  );
  if (byKey >= 0) return byKey;

  const byLabel = RECIPE_COMPONENT_FUNCTIONS.findIndex(
    (key) => RECIPE_COMPONENT_FUNCTION_LABELS[key].toLowerCase() === raw
  );
  if (byLabel >= 0) return byLabel;

  // Aliases frecuentes en pautas legacy / taller
  if (raw.includes("riel") && raw.includes("sup")) return 0;
  if (raw.includes("riel") && raw.includes("inf")) return 1;
  if (raw.startsWith("jamba")) return 2;
  if (raw.startsWith("zócalo") || raw.startsWith("zocalo")) return 3;
  if (raw.startsWith("cabezal")) return 4;
  if (raw.startsWith("pierna") || raw.startsWith("batiente")) return 5;
  if (raw.startsWith("traslapo") || raw.startsWith("enganche")) return 6;

  return RECIPE_COMPONENT_FUNCTIONS.length;
}

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
  /** Id estable de la variante dentro del pack de la línea. */
  id: string;
  /** Versión de contenido; sube en el primer cambio tras validar (V1 sin historial navegable). */
  recipeVersion: number;
  fabricationType: FabricationType;
  aperturaTipo: AperturaTipo;
  herrajeTipo: HerrajeTipo;
  /** Obligatorio cuando herrajeTipo === "otro". */
  herrajeLabel: string;
  variant: RecipeVariant;
  sashCount: number;
  moduleCount: number;
  /** Largo comercial predeterminado de barra (mm). Los perfiles lo heredan si no tienen override. */
  defaultBarLengthMm: number;
  /** Pérdida por corte / kerf (mm). Aplica a todos los perfiles. */
  defaultKerfMm: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  status: RecipeStatus;
  components: RecipeComponent[];
  validatedAt: string | null;
  validationCase: RecipeValidationCase | null;
  /** Origen comercial: plantilla sugerida | base tipológica | propia. */
  sourceKind: "plantilla_sugerida" | "base_tipologica" | "propia" | "migrada";
  /** true si ya se hizo bump de versión en el ciclo actual post-validación. */
  versionBumpedSinceValidation: boolean;
};

export type FabricationRecipePack = {
  v: 1;
  recipes: FabricationRecipe[];
  defaultRecipeId: string | null;
  lastUsedRecipeId: string | null;
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

export function createRecipeId() {
  return createId("recipe");
}

export function createEmptyRecipe(
  fabricationType: FabricationType = "personalizado"
): FabricationRecipe {
  const aperturaTipo = aperturaFromFabricationType(fabricationType);
  return {
    v: 1,
    id: createRecipeId(),
    recipeVersion: 1,
    fabricationType,
    aperturaTipo,
    herrajeTipo: "ninguno",
    herrajeLabel: "",
    variant: "estandar",
    sashCount: fabricationType.includes("corredera_3")
      ? 3
      : fabricationType.includes("corredera_4")
        ? 4
        : fabricationType.includes("corredera") || fabricationType === "puerta_corredera"
          ? 2
          : 1,
    moduleCount: 1,
    defaultBarLengthMm: 6000,
    defaultKerfMm: 3,
    isActive: true,
    usageCount: 0,
    lastUsedAt: null,
    status: "sin_configurar",
    components: [],
    validatedAt: null,
    validationCase: null,
    sourceKind: "propia",
    versionBumpedSinceValidation: false,
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
  const aperturaTipo = APERTURA_TIPOS.includes(value.aperturaTipo as AperturaTipo)
    ? (value.aperturaTipo as AperturaTipo)
    : aperturaFromFabricationType(fabricationType);
  const herrajeTipo = HERRAJE_TIPOS.includes(value.herrajeTipo as HerrajeTipo)
    ? (value.herrajeTipo as HerrajeTipo)
    : "ninguno";
  const sourceKind =
    value.sourceKind === "plantilla_sugerida" ||
    value.sourceKind === "base_tipologica" ||
    value.sourceKind === "propia" ||
    value.sourceKind === "migrada"
      ? value.sourceKind
      : "migrada";

  const components = Array.isArray(value.components)
    ? value.components
        .map((entry) => parseRecipeComponent(entry))
        .filter((entry): entry is RecipeComponent => Boolean(entry))
    : [];

  return {
    v: 1,
    id: asText(value.id) || createRecipeId(),
    recipeVersion: asPositiveInt(value.recipeVersion, 1),
    fabricationType,
    aperturaTipo,
    herrajeTipo,
    herrajeLabel: asText(value.herrajeLabel),
    variant: asText(value.variant, "estandar") || "estandar",
    sashCount: asPositiveInt(value.sashCount, 1),
    moduleCount: asPositiveInt(value.moduleCount, 1),
    defaultBarLengthMm: asPositiveInt(value.defaultBarLengthMm, 6000),
    defaultKerfMm: asNonNeg(value.defaultKerfMm, 3),
    isActive: value.isActive !== false,
    usageCount: asNonNeg(value.usageCount, 0),
    lastUsedAt: asText(value.lastUsedAt) || null,
    status,
    components,
    validatedAt: asText(value.validatedAt) || null,
    validationCase: parseValidationCase(value.validationCase),
    sourceKind,
    versionBumpedSinceValidation: value.versionBumpedSinceValidation === true,
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
  const pack = getFabricationRecipePackFromMetadata(metadata);
  if (!pack || pack.recipes.length === 0) return null;
  const defaultId = pack.defaultRecipeId;
  const fromDefault = defaultId
    ? pack.recipes.find((recipe) => recipe.id === defaultId && recipe.isActive)
    : null;
  if (fromDefault) return fromDefault;
  const active = listActiveRecipes(pack);
  if (active.length === 0) return pack.recipes[0] ?? null;
  return pickPreferredActiveRecipe(pack, active);
}

export function mergeFabricationRecipeIntoMetadata(
  metadata: Record<string, unknown> | null | undefined,
  recipe: FabricationRecipe | null
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(metadata ?? {}) };
  if (!recipe) {
    delete next.fabricationRecipe;
    delete next.fabricationRecipePack;
    return next;
  }
  const existing = getFabricationRecipePackFromMetadata(metadata);
  const recipes = existing
    ? existing.recipes.some((entry) => entry.id === recipe.id)
      ? existing.recipes.map((entry) => (entry.id === recipe.id ? recipe : entry))
      : [...existing.recipes, recipe]
    : [recipe];
  const pack: FabricationRecipePack = {
    v: 1,
    recipes,
    defaultRecipeId: existing?.defaultRecipeId ?? recipe.id,
    lastUsedRecipeId: existing?.lastUsedRecipeId ?? null,
  };
  return mergeFabricationRecipePackIntoMetadata(next, pack);
}

export function parseFabricationRecipePack(value: unknown): FabricationRecipePack | null {
  if (!isRecord(value) || value.v !== 1) return null;
  const recipes = Array.isArray(value.recipes)
    ? value.recipes
        .map((entry) => parseFabricationRecipe(entry))
        .filter((entry): entry is FabricationRecipe => Boolean(entry))
    : [];
  if (recipes.length === 0) return null;
  const defaultRecipeId = asText(value.defaultRecipeId) || null;
  const lastUsedRecipeId = asText(value.lastUsedRecipeId) || null;
  return {
    v: 1,
    recipes,
    defaultRecipeId:
      defaultRecipeId && recipes.some((recipe) => recipe.id === defaultRecipeId)
        ? defaultRecipeId
        : recipes.find((recipe) => recipe.isActive)?.id ?? recipes[0]?.id ?? null,
    lastUsedRecipeId:
      lastUsedRecipeId && recipes.some((recipe) => recipe.id === lastUsedRecipeId)
        ? lastUsedRecipeId
        : null,
  };
}

export function getFabricationRecipePackFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): FabricationRecipePack | null {
  if (!metadata) return null;
  const pack = parseFabricationRecipePack(metadata.fabricationRecipePack);
  if (pack) return pack;
  const legacy = parseFabricationRecipe(metadata.fabricationRecipe);
  if (!legacy) return null;
  return {
    v: 1,
    recipes: [{ ...legacy, sourceKind: legacy.sourceKind === "propia" ? "migrada" : legacy.sourceKind }],
    defaultRecipeId: legacy.id,
    lastUsedRecipeId: null,
  };
}

export function mergeFabricationRecipePackIntoMetadata(
  metadata: Record<string, unknown> | null | undefined,
  pack: FabricationRecipePack | null
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(metadata ?? {}) };
  if (!pack || pack.recipes.length === 0) {
    delete next.fabricationRecipePack;
    delete next.fabricationRecipe;
    return next;
  }
  const normalized = normalizeRecipePack(pack);
  next.fabricationRecipePack = normalized;
  const mirror =
    (normalized.defaultRecipeId
      ? normalized.recipes.find(
          (recipe) => recipe.id === normalized.defaultRecipeId && recipe.isActive
        )
      : null) ??
    listActiveRecipes(normalized)[0] ??
    normalized.recipes[0] ??
    null;
  if (mirror) next.fabricationRecipe = mirror;
  else delete next.fabricationRecipe;
  return next;
}

export function listActiveRecipes(pack: FabricationRecipePack): FabricationRecipe[] {
  return pack.recipes
    .filter((recipe) => recipe.isActive)
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) return right.usageCount - left.usageCount;
      const leftUsed = left.lastUsedAt ? Date.parse(left.lastUsedAt) : 0;
      const rightUsed = right.lastUsedAt ? Date.parse(right.lastUsedAt) : 0;
      return rightUsed - leftUsed;
    });
}

export function pickPreferredActiveRecipe(
  pack: FabricationRecipePack,
  active = listActiveRecipes(pack)
): FabricationRecipe | null {
  if (active.length === 0) return null;
  if (pack.defaultRecipeId) {
    const preferred = active.find((recipe) => recipe.id === pack.defaultRecipeId);
    if (preferred) return preferred;
  }
  if (pack.lastUsedRecipeId) {
    const last = active.find((recipe) => recipe.id === pack.lastUsedRecipeId);
    if (last) return last;
  }
  return active[0] ?? null;
}

export function normalizeRecipePack(pack: FabricationRecipePack): FabricationRecipePack {
  const recipes = pack.recipes.map((recipe) => ({
    ...recipe,
    id: recipe.id || createRecipeId(),
  }));
  const active = recipes.filter((recipe) => recipe.isActive);
  let defaultRecipeId = pack.defaultRecipeId;
  if (defaultRecipeId && !active.some((recipe) => recipe.id === defaultRecipeId)) {
    defaultRecipeId = active.sort((a, b) => b.usageCount - a.usageCount)[0]?.id ?? null;
  }
  if (!defaultRecipeId && active.length === 1) {
    defaultRecipeId = active[0]?.id ?? null;
  }
  return {
    v: 1,
    recipes,
    defaultRecipeId,
    lastUsedRecipeId:
      pack.lastUsedRecipeId && recipes.some((recipe) => recipe.id === pack.lastUsedRecipeId)
        ? pack.lastUsedRecipeId
        : null,
  };
}

export function canDeactivateRecipe(
  pack: FabricationRecipePack,
  recipeId: string
): { ok: boolean; warning: string | null } {
  const target = pack.recipes.find((recipe) => recipe.id === recipeId);
  if (!target) return { ok: false, warning: "Receta no encontrada." };
  if (!target.isActive) return { ok: true, warning: null };
  const activeCount = pack.recipes.filter((recipe) => recipe.isActive).length;
  if (activeCount <= 1) {
    return {
      ok: false,
      warning: "No puedes desactivar la única receta activa de esta línea.",
    };
  }
  return { ok: true, warning: null };
}

export function recipesCompatibleWithApertura(
  pack: FabricationRecipePack,
  apertura: AperturaTipo
): FabricationRecipe[] {
  return listActiveRecipes(pack).filter((recipe) => recipe.aperturaTipo === apertura);
}

export function recipesCompatibleWithFabricationType(
  pack: FabricationRecipePack,
  fabricationType: FabricationType
): FabricationRecipe[] {
  return listActiveRecipes(pack).filter(
    (recipe) =>
      recipe.fabricationType === fabricationType ||
      fabricationTypeMatchesApertura(fabricationType, recipe.aperturaTipo)
  );
}

export function isHerrajeLabelValid(recipe: Pick<FabricationRecipe, "herrajeTipo" | "herrajeLabel">) {
  if (recipe.herrajeTipo !== "otro") return true;
  return recipe.herrajeLabel.trim().length > 0;
}

export function canValidateRecipe(recipe: FabricationRecipe): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isHerrajeLabelValid(recipe)) {
    errors.push("Indica el nombre del herraje cuando eliges “Otro”.");
  }
  const required = recipe.components.filter((component) => component.required);
  if (required.length === 0) {
    errors.push("Agrega al menos un componente obligatorio.");
  }
  required.forEach((component) => {
    if (!isComponentConfigured(component)) {
      errors.push(`${component.functionLabel}: falta configurar medida o cantidad.`);
    }
    if (
      component.kind === "profile" &&
      !hasWorkshopProfileAssigned(component)
    ) {
      errors.push(`${component.functionLabel}: falta código o nombre de perfil de taller.`);
    }
  });
  return { ok: errors.length === 0, errors };
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
  const leavingValidated =
    recipe.status === "validada" || recipe.status === "requiere_revision";
  const shouldBump =
    recipe.status === "validada" &&
    Boolean(recipe.validatedAt) &&
    !recipe.versionBumpedSinceValidation;

  const nextStatus = leavingValidated
    ? "requiere_revision"
    : deriveRecipeStatus({ ...recipe, status: "en_configuracion" });

  return {
    ...recipe,
    status: nextStatus === "lista_para_validar" ? "lista_para_validar" : nextStatus,
    recipeVersion: shouldBump ? recipe.recipeVersion + 1 : recipe.recipeVersion,
    versionBumpedSinceValidation:
      shouldBump || recipe.versionBumpedSinceValidation || leavingValidated,
    validatedAt: leavingValidated ? recipe.validatedAt : null,
  };
}

export function duplicateRecipeAsVariant(
  recipe: FabricationRecipe,
  variantName: string,
  patch: Partial<
    Pick<FabricationRecipe, "herrajeTipo" | "herrajeLabel" | "aperturaTipo" | "fabricationType">
  > = {}
): FabricationRecipe {
  return {
    ...recipe,
    id: createRecipeId(),
    recipeVersion: 1,
    variant: variantName.trim() || "variante",
    herrajeTipo: patch.herrajeTipo ?? recipe.herrajeTipo,
    herrajeLabel: patch.herrajeLabel ?? recipe.herrajeLabel,
    aperturaTipo: patch.aperturaTipo ?? recipe.aperturaTipo,
    fabricationType: patch.fabricationType ?? recipe.fabricationType,
    status: "en_configuracion",
    validatedAt: null,
    validationCase: null,
    usageCount: 0,
    lastUsedAt: null,
    isActive: true,
    sourceKind: "propia",
    versionBumpedSinceValidation: false,
    components: recipe.components.map((component) => ({
      ...component,
      id: createId(component.functionKey),
    })),
  };
}

export function touchRecipeUsage(recipe: FabricationRecipe): FabricationRecipe {
  return {
    ...recipe,
    usageCount: Math.max(0, recipe.usageCount) + 1,
    lastUsedAt: new Date().toISOString(),
  };
}

/**
 * Infiera apertura desde tipología ya elegida en la pieza (tipo + sistema).
 * No re-pide tipología en cotización.
 */
export function inferAperturaFromPiece(
  tipo: string | null | undefined,
  sistema: string | null | undefined
): AperturaTipo | null {
  const t = (tipo ?? "").trim().toLocaleLowerCase("es");
  const s = (sistema ?? "").trim().toLocaleLowerCase("es");

  if (t.includes("puerta")) {
    if (s.includes("corredera")) return "puerta_corredera";
    if (s.includes("abatible") || !s) return "puerta_abatible";
  }
  if (t.includes("ventana") || t.includes("ventana corredera") || !t) {
    if (s.includes("corredera") || s.includes("bow")) return "corredera";
    if (s.includes("proyectante")) return "proyectante";
    if (s.includes("abatible")) return "abatible";
    if (
      s.includes("paño fijo") ||
      s.includes("pano fijo") ||
      s.includes("fijo") ||
      s === "paño fijo"
    ) {
      return "fija";
    }
  }
  if (t.includes("paño") || t.includes("pano")) return "fija";
  if (s.includes("corredera")) return "corredera";
  if (s.includes("proyectante")) return "proyectante";
  if (s.includes("abatible")) return "abatible";
  return null;
}

export type SelectRecipeForQuoteInput = {
  pack: FabricationRecipePack;
  /** Tipología de la pieza (ya elegida). */
  apertura?: AperturaTipo | null;
  fabricationType?: FabricationType | null;
  preferredRecipeId?: string | null;
};

export type SelectRecipeForQuoteResult = {
  recipe: FabricationRecipe | null;
  candidates: FabricationRecipe[];
  /** true si la UI debe pedir solo herraje/variante. */
  needsVariantChoice: boolean;
};

/**
 * Cotización: filtra por tipología de pieza; auto-usa si hay 1; pide variante si hay varias.
 */
export function selectRecipeForQuote(
  input: SelectRecipeForQuoteInput
): SelectRecipeForQuoteResult {
  const { pack, preferredRecipeId } = input;
  let candidates = listActiveRecipes(pack);

  if (input.apertura) {
    const byApertura = candidates.filter((recipe) => recipe.aperturaTipo === input.apertura);
    if (byApertura.length > 0) candidates = byApertura;
  } else if (input.fabricationType) {
    const byType = candidates.filter(
      (recipe) =>
        recipe.fabricationType === input.fabricationType ||
        fabricationTypeMatchesApertura(input.fabricationType!, recipe.aperturaTipo)
    );
    if (byType.length > 0) candidates = byType;
  }

  if (candidates.length === 0) {
    return { recipe: null, candidates: [], needsVariantChoice: false };
  }

  if (preferredRecipeId) {
    const preferred = candidates.find((recipe) => recipe.id === preferredRecipeId);
    if (preferred) {
      return {
        recipe: preferred,
        candidates,
        needsVariantChoice: candidates.length > 1,
      };
    }
  }

  if (candidates.length === 1) {
    return { recipe: candidates[0] ?? null, candidates, needsVariantChoice: false };
  }

  // Varias activas: pedir herraje/variante; no forzar default.
  return {
    recipe: null,
    candidates,
    needsVariantChoice: true,
  };
}

export function upsertRecipeInPack(
  pack: FabricationRecipePack | null,
  recipe: FabricationRecipe,
  options?: { setAsDefault?: boolean }
): FabricationRecipePack {
  const base: FabricationRecipePack = pack ?? {
    v: 1,
    recipes: [],
    defaultRecipeId: null,
    lastUsedRecipeId: null,
  };
  const exists = base.recipes.some((entry) => entry.id === recipe.id);
  const recipes = exists
    ? base.recipes.map((entry) => (entry.id === recipe.id ? recipe : entry))
    : [...base.recipes, recipe];
  return normalizeRecipePack({
    ...base,
    recipes,
    defaultRecipeId: options?.setAsDefault
      ? recipe.id
      : base.defaultRecipeId ?? recipe.id,
  });
}

export const PLANTILLA_SUGERIDA_COPY =
  "Plantilla inicial sugerida por Ventora. Revísala y valídala según tu proveedor y forma de fabricación.";

export const BASE_TIPOLOGICA_COPY =
  "Base pendiente de validación del taller";

/** Largo comercial efectivo del perfil: override o default de la receta. */
export function resolveComponentBarLengthMm(
  component: RecipeComponent,
  recipe: Pick<FabricationRecipe, "defaultBarLengthMm">
): number | null {
  if (component.kind !== "profile") return null;
  const override = component.barLengthMm;
  if (override != null && override >= 1000) return Math.round(override);
  const fallback = Math.round(recipe.defaultBarLengthMm || 0);
  return fallback >= 1000 ? fallback : null;
}

export function resolveRecipeKerfMm(
  recipe: Pick<FabricationRecipe, "defaultKerfMm">,
  component?: RecipeComponent | null
): number {
  if (component?.kerfMm != null && component.kerfMm >= 0) {
    return Math.round(component.kerfMm);
  }
  return Math.max(0, Math.round(recipe.defaultKerfMm ?? 3));
}

/** True si el perfil puede entrar al cálculo de barras (código + largo comercial). */
export function canCalculateBarsForComponent(
  component: RecipeComponent,
  recipe: Pick<FabricationRecipe, "defaultBarLengthMm">
): boolean {
  if (component.kind !== "profile") return false;
  return (
    hasWorkshopProfileCode(component) &&
    resolveComponentBarLengthMm(component, recipe) != null
  );
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
