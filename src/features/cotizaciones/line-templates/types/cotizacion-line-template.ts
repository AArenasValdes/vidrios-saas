import type { EntityId } from "@/types/common";
import {
  deriveRecipeStatus,
  getFabricationRecipeFromMetadata,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";

export const LINE_TEMPLATE_MATERIALS = ["Aluminio", "PVC", "Cristal"] as const;
export type CotizacionLineTemplateMaterial = (typeof LINE_TEMPLATE_MATERIALS)[number];

export const LINE_TEMPLATE_CATEGORIAS = [
  "aluminio",
  "pvc",
  "vidrio",
  "shower",
  "accesorios",
  "otros",
] as const;
export type CotizacionLineTemplateCategoria = (typeof LINE_TEMPLATE_CATEGORIAS)[number];

export const LINE_TEMPLATE_UNIDADES_COBRO = [
  "m2",
  "metro_lineal",
  "unidad",
  "valor_manual",
] as const;
export type CotizacionLineTemplateUnidadCobro = (typeof LINE_TEMPLATE_UNIDADES_COBRO)[number];

export type CotizacionLineTemplate = {
  id: EntityId;
  organizationId: EntityId;
  nombre: string;
  categoria: CotizacionLineTemplateCategoria;
  unidadCobro: CotizacionLineTemplateUnidadCobro;
  material: CotizacionLineTemplateMaterial;
  vidrioPrincipalRecomendado: string | null;
  costoBase: number;
  precioM2Sugerido: number;
  minimoCobrable: number;
  redondeoPrecio: number;
  mermaPct: number;
  margenObjetivoPct: number | null;
  proveedor: string | null;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  catalogMetadata: CotizacionLineTemplateCatalogMetadata;
  isActive: boolean;
  sortOrder: number;
  creadoEn: string | null;
  actualizadoEn: string | null;
  eliminadoEn: string | null;
};

/** Escalares + objetos anidados conocidos (fabricationRecipe, workshopProfiles). */
export type CotizacionLineTemplateCatalogMetadataValue =
  | string
  | number
  | boolean
  | null
  | object;

export type CotizacionLineTemplateCatalogMetadata = Record<
  string,
  CotizacionLineTemplateCatalogMetadataValue
>;

export type CotizacionGlassProductMetadata = {
  espesor: string | null;
  terminacion: string | null;
};

export type CotizacionLineTemplateSystemMetadata = {
  lineSystem: string | null;
};

export const LINE_TEMPLATE_CUBICATION_SYSTEMS = [
  "pano_fijo",
  "corredera_2_hojas",
  "puerta_abatible_1_hoja",
] as const;
export type CotizacionLineTemplateCubicationSystem =
  (typeof LINE_TEMPLATE_CUBICATION_SYSTEMS)[number];

export const LINE_TEMPLATE_CUBICATION_SYSTEM_LABELS: Record<
  CotizacionLineTemplateCubicationSystem,
  string
> = {
  pano_fijo: "Paño fijo",
  corredera_2_hojas: "Corredera 2 hojas",
  puerta_abatible_1_hoja: "Puerta abatible 1 hoja",
};

export const LINE_TEMPLATE_CUBICATION_STATUSES = [
  "sin_configurar",
  "lista_para_probar",
  "en_calibracion",
  "validada",
  "revisar_cambios",
] as const;
export type CotizacionLineTemplateCubicationStatus =
  (typeof LINE_TEMPLATE_CUBICATION_STATUSES)[number];

export const LINE_TEMPLATE_CUBICATION_STATUS_LABELS: Record<
  CotizacionLineTemplateCubicationStatus,
  string
> = {
  sin_configurar: "Sin configurar",
  lista_para_probar: "Lista para probar",
  en_calibracion: "En calibración",
  validada: "Validada",
  revisar_cambios: "Revisar cambios",
};

export type CotizacionLineTemplateCubicationConfig = {
  system: CotizacionLineTemplateCubicationSystem;
  status: CotizacionLineTemplateCubicationStatus;
  profileFrame: string;
  profileSash: string;
  profileMeeting: string | null;
  profileGlazingBead: string | null;
  profileSill: string | null;
  profileAccessory: string | null;
  deductionFrameHorizontalMm: number;
  deductionFrameVerticalMm: number;
  deductionSashHorizontalMm: number;
  deductionSashVerticalMm: number;
  deductionGlassWidthMm: number;
  deductionGlassHeightMm: number;
};

export const LINE_TEMPLATE_ESTIMATION_MODES = [
  "vidrio",
  "marco_simple",
  "marco_hojas",
] as const;
export type CotizacionLineTemplateEstimationMode =
  (typeof LINE_TEMPLATE_ESTIMATION_MODES)[number];

export type CotizacionLineTemplateEstimationRules = {
  enabled: boolean;
  mode: CotizacionLineTemplateEstimationMode;
  frameFactor: number;
  sashFactor: number;
  accessoryUnits: number;
};

export const LINE_TEMPLATE_CUTTING_MODES = [
  "sin_corte",
  "marco",
  "marco_hojas",
] as const;
export type CotizacionLineTemplateCuttingMode =
  (typeof LINE_TEMPLATE_CUTTING_MODES)[number];

export type CotizacionLineTemplateCuttingRules = {
  enabled: boolean;
  mode: CotizacionLineTemplateCuttingMode;
  barLengthMm: number;
  sawKerfMm: number;
  sashCount: number;
};

export type CotizacionLineTemplateCut = {
  label: string;
  functionLabel: string;
  quantity: number;
  lengthMm: number;
  totalLinealMm: number;
  /** Trazabilidad breve: p. ej. "Alto total 1.000 mm − 3 mm = 997 mm". */
  measureExplanation?: string | null;
};

export type CotizacionLineTemplateCuttingBar = {
  index: number;
  usedMm: number;
  wasteMm: number;
  cuts: CotizacionLineTemplateCut[];
};

export type CotizacionLineTemplateGlassPiece = {
  widthMm: number;
  heightMm: number;
  quantity: number;
  totalM2: number;
};

export type CotizacionLineTemplateCuttingPreview = {
  cuts: CotizacionLineTemplateCut[];
  bars: CotizacionLineTemplateCuttingBar[];
  totalUsedMm: number;
  totalWasteMm: number;
  wastePct: number;
  totalProfilesLinealMm: number;
  glass: CotizacionLineTemplateGlassPiece | null;
  accessoryUnits: number;
};

function normalizeMetadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeMetadataNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeEstimationMode(value: unknown): CotizacionLineTemplateEstimationMode {
  return value === "vidrio" || value === "marco_hojas" ? value : "marco_simple";
}

function normalizeCuttingMode(value: unknown): CotizacionLineTemplateCuttingMode {
  if (value === "sin_corte" || value === "marco") return value;
  return "marco_hojas";
}

function normalizeCubicationSystem(value: unknown): CotizacionLineTemplateCubicationSystem {
  if (
    value === "pano_fijo" ||
    value === "corredera_2_hojas" ||
    value === "puerta_abatible_1_hoja"
  ) {
    return value;
  }

  const normalized = normalizeMetadataText(value)?.toLowerCase() ?? "";
  if (normalized.includes("fija") || normalized.includes("fijo")) return "pano_fijo";
  if (normalized.includes("puerta")) return "puerta_abatible_1_hoja";
  return "corredera_2_hojas";
}

function normalizeCubicationStatus(value: unknown): CotizacionLineTemplateCubicationStatus {
  return value === "lista_para_probar" ||
    value === "en_calibracion" ||
    value === "validada" ||
    value === "revisar_cambios"
    ? value
    : "sin_configurar";
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeCutLength(value: number) {
  return Math.max(Math.round(value), 1);
}

function normalizeRoleLabel(value: unknown, fallback: string | null) {
  return normalizeMetadataText(value) ?? fallback;
}

export function getLineTemplateGlassMetadata(
  metadata: CotizacionLineTemplate["catalogMetadata"] | null | undefined
): CotizacionGlassProductMetadata {
  return {
    espesor: normalizeMetadataText(metadata?.espesor),
    terminacion:
      normalizeMetadataText(metadata?.terminacion) ??
      normalizeMetadataText(metadata?.descripcion),
  };
}

export function mergeLineTemplateGlassMetadata(
  metadata: CotizacionLineTemplateCatalogMetadata | null | undefined,
  input: Partial<CotizacionGlassProductMetadata>
): CotizacionLineTemplateCatalogMetadata {
  const next: CotizacionLineTemplateCatalogMetadata = { ...(metadata ?? {}) };

  if (input.espesor !== undefined) {
    const value = input.espesor?.trim() ?? "";
    if (value) next.espesor = value.slice(0, 40);
    else delete next.espesor;
  }

  if (input.terminacion !== undefined) {
    const value = input.terminacion?.trim() ?? "";
    if (value) next.terminacion = value.slice(0, 160);
    else delete next.terminacion;
  }

  return next;
}

export function getLineTemplateEstimationRules(
  metadata: CotizacionLineTemplate["catalogMetadata"] | null | undefined
): CotizacionLineTemplateEstimationRules {
  return {
    enabled: metadata?.estimationEnabled === true,
    mode: normalizeEstimationMode(metadata?.estimationMode),
    frameFactor: normalizeMetadataNumber(metadata?.estimationFrameFactor, 1),
    sashFactor: normalizeMetadataNumber(metadata?.estimationSashFactor, 0),
    accessoryUnits: normalizeMetadataNumber(metadata?.estimationAccessoryUnits, 0),
  };
}

export function mergeLineTemplateEstimationRules(
  metadata: CotizacionLineTemplateCatalogMetadata | null | undefined,
  input: CotizacionLineTemplateEstimationRules
): CotizacionLineTemplateCatalogMetadata {
  const next: CotizacionLineTemplateCatalogMetadata = { ...(metadata ?? {}) };

  next.estimationEnabled = input.enabled;

  if (!input.enabled) {
    delete next.estimationMode;
    delete next.estimationFrameFactor;
    delete next.estimationSashFactor;
    delete next.estimationAccessoryUnits;
    return next;
  }

  next.estimationMode = input.mode;
  next.estimationFrameFactor = input.mode === "vidrio" ? 0 : input.frameFactor;
  next.estimationSashFactor = input.mode === "marco_hojas" ? input.sashFactor : 0;
  next.estimationAccessoryUnits = input.accessoryUnits;

  return next;
}

export function getLineTemplateSystemMetadata(
  metadata: CotizacionLineTemplate["catalogMetadata"] | null | undefined
): CotizacionLineTemplateSystemMetadata {
  return {
    lineSystem: normalizeMetadataText(metadata?.lineSystem),
  };
}

export function mergeLineTemplateSystemMetadata(
  metadata: CotizacionLineTemplateCatalogMetadata | null | undefined,
  input: Partial<CotizacionLineTemplateSystemMetadata>
): CotizacionLineTemplateCatalogMetadata {
  const next: CotizacionLineTemplateCatalogMetadata = { ...(metadata ?? {}) };

  if (input.lineSystem !== undefined) {
    const value = input.lineSystem?.trim() ?? "";
    if (value) next.lineSystem = value.slice(0, 80);
    else delete next.lineSystem;
  }

  return next;
}

export function getLineTemplateCubicationConfig(
  metadata: CotizacionLineTemplate["catalogMetadata"] | null | undefined
): CotizacionLineTemplateCubicationConfig {
  return {
    system: normalizeCubicationSystem(metadata?.cubicationSystem ?? metadata?.lineSystem),
    status: normalizeCubicationStatus(metadata?.cubicationStatus),
    profileFrame: normalizeRoleLabel(metadata?.profileFrame, "Marco") ?? "Marco",
    profileSash: normalizeRoleLabel(metadata?.profileSash, "Hoja") ?? "Hoja",
    profileMeeting: normalizeRoleLabel(metadata?.profileMeeting, "Encuentro"),
    profileGlazingBead: normalizeRoleLabel(metadata?.profileGlazingBead, "Junquillo"),
    profileSill: normalizeRoleLabel(metadata?.profileSill, null),
    profileAccessory: normalizeRoleLabel(metadata?.profileAccessory, null),
    deductionFrameHorizontalMm: normalizeMetadataNumber(
      metadata?.deductionFrameHorizontalMm,
      0
    ),
    deductionFrameVerticalMm: normalizeMetadataNumber(metadata?.deductionFrameVerticalMm, 0),
    deductionSashHorizontalMm: normalizeMetadataNumber(
      metadata?.deductionSashHorizontalMm,
      0
    ),
    deductionSashVerticalMm: normalizeMetadataNumber(metadata?.deductionSashVerticalMm, 0),
    deductionGlassWidthMm: normalizeMetadataNumber(metadata?.deductionGlassWidthMm, 0),
    deductionGlassHeightMm: normalizeMetadataNumber(metadata?.deductionGlassHeightMm, 0),
  };
}

export function mergeLineTemplateCubicationConfig(
  metadata: CotizacionLineTemplateCatalogMetadata | null | undefined,
  input: Partial<CotizacionLineTemplateCubicationConfig>
): CotizacionLineTemplateCatalogMetadata {
  const next: CotizacionLineTemplateCatalogMetadata = { ...(metadata ?? {}) };
  const current = getLineTemplateCubicationConfig(metadata);
  const normalized: CotizacionLineTemplateCubicationConfig = {
    ...current,
    ...input,
    system: normalizeCubicationSystem(input.system ?? current.system),
    status: normalizeCubicationStatus(input.status ?? current.status),
    profileFrame: normalizeRoleLabel(input.profileFrame, current.profileFrame) ?? "Marco",
    profileSash: normalizeRoleLabel(input.profileSash, current.profileSash) ?? "Hoja",
    profileMeeting: normalizeRoleLabel(input.profileMeeting, current.profileMeeting),
    profileGlazingBead: normalizeRoleLabel(
      input.profileGlazingBead,
      current.profileGlazingBead
    ),
    profileSill: normalizeRoleLabel(input.profileSill, current.profileSill),
    profileAccessory: normalizeRoleLabel(input.profileAccessory, current.profileAccessory),
    deductionFrameHorizontalMm: normalizeMetadataNumber(
      input.deductionFrameHorizontalMm,
      current.deductionFrameHorizontalMm
    ),
    deductionFrameVerticalMm: normalizeMetadataNumber(
      input.deductionFrameVerticalMm,
      current.deductionFrameVerticalMm
    ),
    deductionSashHorizontalMm: normalizeMetadataNumber(
      input.deductionSashHorizontalMm,
      current.deductionSashHorizontalMm
    ),
    deductionSashVerticalMm: normalizeMetadataNumber(
      input.deductionSashVerticalMm,
      current.deductionSashVerticalMm
    ),
    deductionGlassWidthMm: normalizeMetadataNumber(
      input.deductionGlassWidthMm,
      current.deductionGlassWidthMm
    ),
    deductionGlassHeightMm: normalizeMetadataNumber(
      input.deductionGlassHeightMm,
      current.deductionGlassHeightMm
    ),
  };

  const configurationChanged =
    normalized.system !== current.system ||
    normalized.profileFrame !== current.profileFrame ||
    normalized.profileSash !== current.profileSash ||
    normalized.profileMeeting !== current.profileMeeting ||
    normalized.profileGlazingBead !== current.profileGlazingBead ||
    normalized.profileSill !== current.profileSill ||
    normalized.profileAccessory !== current.profileAccessory ||
    normalized.deductionFrameHorizontalMm !== current.deductionFrameHorizontalMm ||
    normalized.deductionFrameVerticalMm !== current.deductionFrameVerticalMm ||
    normalized.deductionSashHorizontalMm !== current.deductionSashHorizontalMm ||
    normalized.deductionSashVerticalMm !== current.deductionSashVerticalMm ||
    normalized.deductionGlassWidthMm !== current.deductionGlassWidthMm ||
    normalized.deductionGlassHeightMm !== current.deductionGlassHeightMm;

  next.cubicationSystem = normalized.system;
  next.cubicationStatus =
    input.status ??
    (current.status === "validada" && configurationChanged
      ? "revisar_cambios"
      : normalized.status);
  next.profileFrame = normalized.profileFrame.slice(0, 80);
  next.profileSash = normalized.profileSash.slice(0, 80);

  const optionalTextKeys: Array<[
    keyof CotizacionLineTemplateCubicationConfig,
    string,
    string | null,
  ]> = [
    ["profileMeeting", "profileMeeting", normalized.profileMeeting],
    ["profileGlazingBead", "profileGlazingBead", normalized.profileGlazingBead],
    ["profileSill", "profileSill", normalized.profileSill],
    ["profileAccessory", "profileAccessory", normalized.profileAccessory],
  ];
  optionalTextKeys.forEach(([, key, value]) => {
    if (value) next[key] = value.slice(0, 80);
    else delete next[key];
  });

  next.deductionFrameHorizontalMm = normalized.deductionFrameHorizontalMm;
  next.deductionFrameVerticalMm = normalized.deductionFrameVerticalMm;
  next.deductionSashHorizontalMm = normalized.deductionSashHorizontalMm;
  next.deductionSashVerticalMm = normalized.deductionSashVerticalMm;
  next.deductionGlassWidthMm = normalized.deductionGlassWidthMm;
  next.deductionGlassHeightMm = normalized.deductionGlassHeightMm;

  return next;
}

export function getLineTemplateCuttingRules(
  metadata: CotizacionLineTemplate["catalogMetadata"] | null | undefined
): CotizacionLineTemplateCuttingRules {
  const wantsCutting = metadata?.cuttingEnabled === true;
  // Con receta de fabricación: la pauta operativa solo si está validada.
  // Sin receta (legacy Marco/Hoja): basta cuttingEnabled.
  const recipe = metadata
    ? getFabricationRecipeFromMetadata(metadata as Record<string, unknown>)
    : null;
  const recipeAllowsCutting =
    !recipe || deriveRecipeStatus(recipe) === "validada";

  return {
    enabled: wantsCutting && recipeAllowsCutting,
    mode: normalizeCuttingMode(metadata?.cuttingMode),
    barLengthMm: normalizePositiveInteger(metadata?.cuttingBarLengthMm, 6000),
    sawKerfMm: normalizeMetadataNumber(metadata?.cuttingSawKerfMm, 3),
    sashCount: normalizePositiveInteger(metadata?.cuttingSashCount, 2),
  };
}

export function mergeLineTemplateCuttingRules(
  metadata: CotizacionLineTemplateCatalogMetadata | null | undefined,
  input: CotizacionLineTemplateCuttingRules
): CotizacionLineTemplateCatalogMetadata {
  const next: CotizacionLineTemplateCatalogMetadata = { ...(metadata ?? {}) };

  next.cuttingEnabled = input.enabled;

  if (!input.enabled) {
    delete next.cuttingMode;
    delete next.cuttingBarLengthMm;
    delete next.cuttingSawKerfMm;
    delete next.cuttingSashCount;
    return next;
  }

  next.cuttingMode = input.mode;
  next.cuttingBarLengthMm = input.barLengthMm;
  next.cuttingSawKerfMm = input.sawKerfMm;
  next.cuttingSashCount = input.mode === "marco_hojas" ? input.sashCount : 1;

  return next;
}

export function buildLineTemplateCuttingPreview(
  rules: CotizacionLineTemplateCuttingRules,
  dimensions: { widthMm: number; heightMm: number; quantity?: number } = {
    widthMm: 1200,
    heightMm: 1000,
    quantity: 1,
  },
  cubicationConfig?: CotizacionLineTemplateCubicationConfig
): CotizacionLineTemplateCuttingPreview {
  if (!rules.enabled || rules.mode === "sin_corte") {
    return {
      cuts: [],
      bars: [],
      totalUsedMm: 0,
      totalWasteMm: 0,
      wastePct: 0,
      totalProfilesLinealMm: 0,
      glass: null,
      accessoryUnits: 0,
    };
  }

  const widthMm = normalizePositiveInteger(dimensions.widthMm, 1200);
  const heightMm = normalizePositiveInteger(dimensions.heightMm, 1000);
  const quantity = normalizePositiveInteger(dimensions.quantity, 1);
  const sashCount = normalizePositiveInteger(rules.sashCount, 2);
  const barLengthMm = Math.max(normalizePositiveInteger(rules.barLengthMm, 6000), 1000);
  const sawKerfMm = normalizeMetadataNumber(rules.sawKerfMm, 3);
  const config =
    cubicationConfig ??
    getLineTemplateCubicationConfig({
      cubicationSystem: rules.mode === "marco" ? "pano_fijo" : "corredera_2_hojas",
    });
  const sashWidthMm = normalizeCutLength(widthMm / sashCount);
  const cuts: CotizacionLineTemplateCut[] = [];

  const addCut = (
    label: string,
    functionLabel: string,
    cutQuantity: number,
    lengthMm: number
  ) => {
    const normalizedLength = normalizeCutLength(lengthMm);
    const normalizedQuantity = normalizePositiveInteger(cutQuantity, 1);
    cuts.push({
      label,
      functionLabel,
      quantity: normalizedQuantity,
      lengthMm: normalizedLength,
      totalLinealMm: normalizedLength * normalizedQuantity,
    });
  };

  const frameHorizontalMm = widthMm - config.deductionFrameHorizontalMm;
  const frameVerticalMm = heightMm - config.deductionFrameVerticalMm;
  const sashHorizontalMm = sashWidthMm - config.deductionSashHorizontalMm;
  const sashVerticalMm = heightMm - config.deductionSashVerticalMm;

  if (config.system === "corredera_2_hojas" && rules.mode === "marco_hojas") {
    addCut(config.profileFrame, "Riel superior", quantity, frameHorizontalMm);
    addCut(config.profileFrame, "Riel inferior", quantity, frameHorizontalMm);
    addCut(config.profileFrame, "Jamba", 2 * quantity, frameVerticalMm);
    addCut(config.profileSash, "Hoja vertical", sashCount * 2 * quantity, sashVerticalMm);
    addCut(config.profileSash, "Hoja horizontal", sashCount * 2 * quantity, sashHorizontalMm);
    if (config.profileMeeting) {
      addCut(config.profileMeeting, "Encuentro / traslapo", sashCount * quantity, sashVerticalMm);
    }
    if (config.profileGlazingBead) {
      addCut(config.profileGlazingBead, "Junquillo", sashCount * 2 * quantity, sashHorizontalMm);
    }
    if (config.profileSill) {
      addCut(config.profileSill, "Zócalo", sashCount * quantity, sashHorizontalMm);
    }
  } else if (config.system === "puerta_abatible_1_hoja") {
    addCut(config.profileFrame, "Marco horizontal", 2 * quantity, frameHorizontalMm);
    addCut(config.profileFrame, "Marco vertical", 2 * quantity, frameVerticalMm);
    addCut(config.profileSash, "Hoja horizontal", 2 * quantity, widthMm - config.deductionSashHorizontalMm);
    addCut(config.profileSash, "Hoja vertical", 2 * quantity, sashVerticalMm);
    if (config.profileGlazingBead) {
      addCut(config.profileGlazingBead, "Junquillo", 4 * quantity, widthMm - config.deductionGlassWidthMm);
    }
  } else {
    addCut(config.profileFrame, "Marco horizontal", 2 * quantity, frameHorizontalMm);
    addCut(config.profileFrame, "Marco vertical", 2 * quantity, frameVerticalMm);
  }

  const expandedCuts = cuts
    .flatMap((cut) =>
      Array.from({ length: cut.quantity }, () => ({
        ...cut,
        quantity: 1,
        totalLinealMm: cut.lengthMm,
      }))
    )
    .sort((a, b) => b.lengthMm - a.lengthMm);
  const bars: CotizacionLineTemplateCuttingBar[] = [];

  expandedCuts.forEach((cut) => {
    const existingBar = bars.find((bar) => {
      const kerf = bar.cuts.length > 0 ? sawKerfMm : 0;
      return bar.usedMm + kerf + cut.lengthMm <= barLengthMm;
    });
    const targetBar =
      existingBar ??
      ({
        index: bars.length + 1,
        usedMm: 0,
        wasteMm: barLengthMm,
        cuts: [],
      } satisfies CotizacionLineTemplateCuttingBar);

    if (!existingBar) bars.push(targetBar);

    const kerf = targetBar.cuts.length > 0 ? sawKerfMm : 0;
    targetBar.usedMm += kerf + cut.lengthMm;
    targetBar.wasteMm = Math.max(barLengthMm - targetBar.usedMm, 0);
    targetBar.cuts.push(cut);
  });

  const totalUsedMm = bars.reduce((sum, bar) => sum + bar.usedMm, 0);
  const totalWasteMm = bars.reduce((sum, bar) => sum + bar.wasteMm, 0);
  const totalAvailableMm = bars.length * barLengthMm;
  const glassWidthMm =
    config.system === "corredera_2_hojas"
      ? normalizeCutLength(sashWidthMm - config.deductionGlassWidthMm)
      : normalizeCutLength(widthMm - config.deductionGlassWidthMm);
  const glassHeightMm = normalizeCutLength(heightMm - config.deductionGlassHeightMm);
  const glassQuantity = config.system === "corredera_2_hojas" ? sashCount * quantity : quantity;
  const totalProfilesLinealMm = cuts.reduce((sum, cut) => sum + cut.totalLinealMm, 0);

  return {
    cuts,
    bars,
    totalUsedMm,
    totalWasteMm,
    wastePct: totalAvailableMm > 0 ? (totalWasteMm / totalAvailableMm) * 100 : 0,
    totalProfilesLinealMm,
    glass: {
      widthMm: glassWidthMm,
      heightMm: glassHeightMm,
      quantity: glassQuantity,
      totalM2: (glassWidthMm * glassHeightMm * glassQuantity) / 1_000_000,
    },
    accessoryUnits: config.profileAccessory ? quantity : 0,
  };
}

export function lineTemplateNeedsCommercialPrice(
  template: Pick<CotizacionLineTemplate, "precioM2Sugerido" | "catalogMetadata">
) {
  return (
    template.catalogMetadata?.needsCommercialPrice === true ||
    Number(template.precioM2Sugerido) <= 0
  );
}

export function isLineTemplateReadyForQuote(
  template: Pick<CotizacionLineTemplate, "isActive" | "precioM2Sugerido">
) {
  return Boolean(template.isActive) && Number(template.precioM2Sugerido) > 0;
}

export function clearNeedsCommercialPriceFlag(
  metadata: CotizacionLineTemplateCatalogMetadata | null | undefined,
  precioM2Sugerido: number
): CotizacionLineTemplateCatalogMetadata {
  const next: CotizacionLineTemplateCatalogMetadata = { ...(metadata ?? {}) };
  if (precioM2Sugerido > 0) {
    delete next.needsCommercialPrice;
  }
  return next;
}

export type CreateCotizacionLineTemplateInput = {
  organizationId: EntityId;
  nombre: string;
  categoria?: CotizacionLineTemplateCategoria;
  unidadCobro?: CotizacionLineTemplateUnidadCobro;
  material: CotizacionLineTemplateMaterial;
  vidrioPrincipalRecomendado?: string | null;
  costoBase?: number;
  precioM2Sugerido: number;
  minimoCobrable?: number;
  redondeoPrecio?: number;
  mermaPct?: number;
  margenObjetivoPct?: number | null;
  proveedor?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  catalogMetadata?: CotizacionLineTemplateCatalogMetadata;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateCotizacionLineTemplateInput = {
  nombre?: string;
  categoria?: CotizacionLineTemplateCategoria;
  unidadCobro?: CotizacionLineTemplateUnidadCobro;
  material?: CotizacionLineTemplateMaterial;
  vidrioPrincipalRecomendado?: string | null;
  costoBase?: number;
  precioM2Sugerido?: number;
  minimoCobrable?: number;
  redondeoPrecio?: number;
  mermaPct?: number;
  margenObjetivoPct?: number | null;
  proveedor?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  catalogMetadata?: CotizacionLineTemplateCatalogMetadata;
  isActive?: boolean;
  sortOrder?: number;
};

export type LineTemplateImportDuplicateMode = "skip" | "update" | "create";

export type LineTemplateImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
};
