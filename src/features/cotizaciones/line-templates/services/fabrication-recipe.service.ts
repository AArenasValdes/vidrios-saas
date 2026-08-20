import type {
  CotizacionLineTemplateCatalogMetadata,
  CotizacionLineTemplateCubicationConfig,
  CotizacionLineTemplateCuttingPreview,
  CotizacionLineTemplateCuttingRules,
  CotizacionLineTemplateCut,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  getLineTemplateCubicationConfig,
  getLineTemplateCuttingRules,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  createRecipeComponent,
  deriveRecipeStatus,
  getFabricationRecipeFromMetadata,
  getFabricationRecipePackFromMetadata,
  hasWorkshopProfileCode,
  isComponentConfigured,
  markRecipeDirtyAfterEdit,
  MEASURE_BASE_LABELS,
  parseFabricationRecipe,
  RECIPE_MISSING_PROFILE_LABEL,
  recipeDisplayProfile,
  resolveComponentBarLengthMm,
  resolveRecipeKerfMm,
  sanitizeWorkshopProfileCode,
  selectRecipeForQuote,
  type AperturaTipo,
  type FabricationRecipe,
  type FabricationType,
  type RecipeComponent,
  type RecipeMeasureContext,
  type RecipeStatus,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import {
  createStructuralRecipeTemplate,
  fabricationTypeFromLegacySystem,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe-templates";

export type RecipeCutPreviewRow = {
  componentId: string;
  profileCode: string;
  functionLabel: string;
  kind: RecipeComponent["kind"];
  quantity: number;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  totalLinealMm: number;
  pending: boolean;
  error: string | null;
  measureExplanation: string | null;
  hasProfileCode: boolean;
};

export type RecipeBarSuggestion = {
  profileCode: string;
  profileName: string;
  index: number;
  /** Suma de largos de corte (sin kerf). */
  usedMm: number;
  /** Pérdida total por cortes en la barra (kerf × cantidad de cortes). */
  kerfTotalMm: number;
  /** Sobrante = largo comercial − usado − pérdida. */
  wasteMm: number;
  barLengthMm: number;
  utilizationPct: number;
  cuts: Array<{ functionLabel: string; lengthMm: number }>;
};

export type RecipeBarsStatus = "no_calculable" | "pauta_parcial" | "calculado";

export type RecipeProfileBarPlan = {
  key: string;
  profileCode: string;
  profileName: string;
  barLengthMm: number | null;
  kerfMm: number;
  cutCount: number;
  barsNeeded: number;
  bars: RecipeBarSuggestion[];
  calculable: boolean;
  /** Si no calculable: mensaje para el maestro (p. ej. Pauta pendiente). */
  pendingLabel: string | null;
  functionLabels: string[];
};

export type RecipeCuttingPreview = {
  rows: RecipeCutPreviewRow[];
  profileCuts: CotizacionLineTemplateCut[];
  glasses: Array<{
    label: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
    totalM2: number;
  }>;
  accessories: Array<{ label: string; quantity: number }>;
  barSuggestions: RecipeBarSuggestion[];
  profileBarPlans: RecipeProfileBarPlan[];
  barsStatus: RecipeBarsStatus;
  totalUsedMm: number;
  totalWasteMm: number;
  totalKerfMm: number;
  wastePct: number;
  totalProfilesLinealMm: number;
  pendingRequiredCount: number;
  errors: string[];
};

function roundMm(value: number) {
  return Math.round(value);
}

function formatTraceMm(value: number) {
  return Math.round(value).toLocaleString("es-CL");
}

function resolveMeasureBaseMm(
  component: RecipeComponent,
  ctx: RecipeMeasureContext
): number {
  const sashWidth = ctx.widthMm / Math.max(1, ctx.sashCount);
  const moduleWidth = ctx.widthMm / Math.max(1, ctx.moduleCount);
  const moduleHeight = ctx.heightMm / Math.max(1, ctx.moduleCount);

  switch (component.measureBase) {
    case "vano_width":
      return ctx.widthMm;
    case "vano_height":
      return ctx.heightMm;
    case "half_vano_width":
      return ctx.widthMm / 2;
    case "sash_width":
      return sashWidth;
    case "sash_height":
      return ctx.heightMm;
    case "module_width":
      return moduleWidth;
    case "module_height":
      return moduleHeight;
    case "glass_width":
      return sashWidth;
    case "glass_height":
      return ctx.heightMm;
    case "fixed":
      return component.fixedMeasureMm;
    default:
      return 0;
  }
}

/** Explicación breve de cómo se obtuvo la medida (trazabilidad para el maestro). */
export function describeRecipeMeasure(
  component: RecipeComponent,
  ctx: RecipeMeasureContext,
  lengthMm: number
): string {
  const baseLabel = MEASURE_BASE_LABELS[component.measureBase] ?? "Medida";
  const baseMm = roundMm(resolveMeasureBaseMm(component, ctx));

  if (component.adjustMode === "subtract" && component.adjustMm > 0) {
    return `${baseLabel} ${formatTraceMm(baseMm)} mm − ${formatTraceMm(component.adjustMm)} mm = ${formatTraceMm(lengthMm)} mm`;
  }
  if (component.adjustMode === "add" && component.adjustMm > 0) {
    return `${baseLabel} ${formatTraceMm(baseMm)} mm + ${formatTraceMm(component.adjustMm)} mm = ${formatTraceMm(lengthMm)} mm`;
  }
  return `${baseLabel} ${formatTraceMm(lengthMm)} mm`;
}

export function resolveComponentQuantity(
  component: RecipeComponent,
  ctx: RecipeMeasureContext
): number {
  const base =
    component.quantityRule === "per_sash"
      ? ctx.sashCount * component.quantityValue
      : component.quantityRule === "two_per_sash"
        ? ctx.sashCount * 2 * component.quantityValue
        : component.quantityRule === "per_module"
          ? ctx.moduleCount * component.quantityValue
          : component.quantityRule === "two_per_module"
            ? ctx.moduleCount * 2 * component.quantityValue
            : component.quantityValue;

  return Math.max(1, Math.round(base * Math.max(1, ctx.quantity)));
}

export function resolveComponentLengthMm(
  component: RecipeComponent,
  ctx: RecipeMeasureContext
): { lengthMm: number | null; error: string | null } {
  if (component.kind === "accessory") {
    return { lengthMm: null, error: null };
  }

  const base = resolveMeasureBaseMm(component, ctx);
  const adjust =
    component.adjustMode === "subtract"
      ? -component.adjustMm
      : component.adjustMode === "add"
        ? component.adjustMm
        : 0;

  const lengthMm = roundMm(base + adjust);
  if (!Number.isFinite(lengthMm) || lengthMm <= 0) {
    return {
      lengthMm: null,
      error: `${component.functionLabel}: medida calculada inválida`,
    };
  }

  return { lengthMm, error: null };
}

function resolveGlassPair(
  component: RecipeComponent,
  ctx: RecipeMeasureContext
): { widthMm: number; heightMm: number } | null {
  const sashWidth = ctx.widthMm / Math.max(1, ctx.sashCount);
  const widthBase =
    component.measureBase === "glass_width" || component.measureBase === "sash_width"
      ? sashWidth
      : component.measureBase === "vano_width"
        ? ctx.widthMm
        : component.measureBase === "fixed"
          ? component.fixedMeasureMm
          : sashWidth;
  const heightBase =
    component.measureBase === "glass_height" || component.measureBase === "sash_height"
      ? ctx.heightMm
      : component.measureBase === "vano_height"
        ? ctx.heightMm
        : ctx.heightMm;

  const adjust =
    component.adjustMode === "subtract"
      ? -component.adjustMm
      : component.adjustMode === "add"
        ? component.adjustMm
        : 0;

  // Convención V1: el ajuste del componente vidrio se aplica a ambos lados
  // (mismo valor), típico en descuentos simétricos de taller.
  const widthMm = roundMm(widthBase + adjust);
  const heightMm = roundMm(heightBase + adjust);
  if (widthMm <= 0 || heightMm <= 0) return null;
  return { widthMm, heightMm };
}

/**
 * First Fit Decreasing con pérdida por cada corte.
 * Agrupa solo cortes del mismo código + mismo largo comercial.
 */
function distributeBarsForProfile(input: {
  profileCode: string;
  profileName: string;
  cuts: Array<{ functionLabel: string; lengthMm: number }>;
  barLengthMm: number;
  kerfMm: number;
}): RecipeBarSuggestion[] {
  const barLengthMm = Math.max(input.barLengthMm, 1000);
  const kerfMm = Math.max(0, input.kerfMm);
  const sorted = [...input.cuts].sort((a, b) => b.lengthMm - a.lengthMm);
  const bars: RecipeBarSuggestion[] = [];

  sorted.forEach((cut) => {
    const need = cut.lengthMm + kerfMm;
    const existing = bars.find((bar) => bar.usedMm + bar.kerfTotalMm + need <= barLengthMm);
    const target =
      existing ??
      ({
        profileCode: input.profileCode,
        profileName: input.profileName,
        index: bars.length + 1,
        usedMm: 0,
        kerfTotalMm: 0,
        wasteMm: barLengthMm,
        barLengthMm,
        utilizationPct: 0,
        cuts: [],
      } satisfies RecipeBarSuggestion);

    if (!existing) bars.push(target);
    target.usedMm += cut.lengthMm;
    target.kerfTotalMm += kerfMm;
    target.wasteMm = Math.max(barLengthMm - target.usedMm - target.kerfTotalMm, 0);
    target.utilizationPct =
      barLengthMm > 0
        ? ((target.usedMm + target.kerfTotalMm) / barLengthMm) * 100
        : 0;
    target.cuts.push(cut);
  });

  return bars;
}

export function buildRecipeCuttingPreview(
  recipe: FabricationRecipe,
  dimensions: {
    widthMm: number;
    heightMm: number;
    quantity?: number;
    sashCount?: number;
    moduleCount?: number;
  } = { widthMm: 1200, heightMm: 1000, quantity: 1 },
  defaults: { barLengthMm?: number; kerfMm?: number } = {}
): RecipeCuttingPreview {
  const ctx: RecipeMeasureContext = {
    widthMm: Math.max(1, Math.round(dimensions.widthMm)),
    heightMm: Math.max(1, Math.round(dimensions.heightMm)),
    sashCount: Math.max(1, Math.round(dimensions.sashCount ?? recipe.sashCount)),
    moduleCount: Math.max(1, Math.round(dimensions.moduleCount ?? recipe.moduleCount)),
    quantity: Math.max(1, Math.round(dimensions.quantity ?? 1)),
  };

  const defaultBar = Math.max(
    1000,
    Math.round(recipe.defaultBarLengthMm || defaults.barLengthMm || 6000)
  );
  const defaultKerf = Math.max(
    0,
    Math.round(
      recipe.defaultKerfMm !== undefined && recipe.defaultKerfMm !== null
        ? recipe.defaultKerfMm
        : (defaults.kerfMm ?? 3)
    )
  );

  const rows: RecipeCutPreviewRow[] = [];
  const glasses: RecipeCuttingPreview["glasses"] = [];
  const accessories: RecipeCuttingPreview["accessories"] = [];
  const errors: string[] = [];
  let pendingRequiredCount = 0;

  recipe.components.forEach((component) => {
    const configured = isComponentConfigured(component);
    const hasProfileCode = hasWorkshopProfileCode(component);
    if (!configured) {
      if (component.required) pendingRequiredCount += 1;
      rows.push({
        componentId: component.id,
        profileCode: recipeDisplayProfile(component),
        functionLabel: component.functionLabel,
        kind: component.kind,
        quantity: 0,
        lengthMm: null,
        widthMm: null,
        heightMm: null,
        totalLinealMm: 0,
        pending: true,
        error: null,
        measureExplanation: null,
        hasProfileCode,
      });
      return;
    }

    const quantity = resolveComponentQuantity(component, ctx);

    if (component.kind === "accessory") {
      accessories.push({
        label: `${recipeDisplayProfile(component)} — ${component.functionLabel}`,
        quantity,
      });
      rows.push({
        componentId: component.id,
        profileCode: recipeDisplayProfile(component),
        functionLabel: component.functionLabel,
        kind: "accessory",
        quantity,
        lengthMm: null,
        widthMm: null,
        heightMm: null,
        totalLinealMm: 0,
        pending: false,
        error: null,
        measureExplanation: null,
        hasProfileCode,
      });
      return;
    }

    if (component.kind === "glass") {
      const pair = resolveGlassPair(component, ctx);
      if (!pair) {
        const message = `${component.functionLabel}: medida de vidrio inválida`;
        errors.push(message);
        rows.push({
          componentId: component.id,
          profileCode: recipeDisplayProfile(component),
          functionLabel: component.functionLabel,
          kind: "glass",
          quantity,
          lengthMm: null,
          widthMm: null,
          heightMm: null,
          totalLinealMm: 0,
          pending: false,
          error: message,
          measureExplanation: null,
          hasProfileCode,
        });
        return;
      }
      const glassExplanation = `${describeRecipeMeasure(component, ctx, pair.widthMm)} · alto ${formatTraceMm(pair.heightMm)} mm`;
      glasses.push({
        label: component.functionLabel,
        widthMm: pair.widthMm,
        heightMm: pair.heightMm,
        quantity,
        totalM2: (pair.widthMm * pair.heightMm * quantity) / 1_000_000,
      });
      rows.push({
        componentId: component.id,
        profileCode: recipeDisplayProfile(component),
        functionLabel: component.functionLabel,
        kind: "glass",
        quantity,
        lengthMm: null,
        widthMm: pair.widthMm,
        heightMm: pair.heightMm,
        totalLinealMm: 0,
        pending: false,
        error: null,
        measureExplanation: glassExplanation,
        hasProfileCode,
      });
      return;
    }

    const { lengthMm, error } = resolveComponentLengthMm(component, ctx);
    if (error || lengthMm == null) {
      if (error) errors.push(error);
      rows.push({
        componentId: component.id,
        profileCode: recipeDisplayProfile(component),
        functionLabel: component.functionLabel,
        kind: "profile",
        quantity,
        lengthMm: null,
        widthMm: null,
        heightMm: null,
        totalLinealMm: 0,
        pending: false,
        error: error ?? "Medida inválida",
        measureExplanation: null,
        hasProfileCode,
      });
      return;
    }

    rows.push({
      componentId: component.id,
      profileCode: recipeDisplayProfile(component),
      functionLabel: component.functionLabel,
      kind: "profile",
      quantity,
      lengthMm,
      widthMm: null,
      heightMm: null,
      totalLinealMm: lengthMm * quantity,
      pending: false,
      error: null,
      measureExplanation: describeRecipeMeasure(component, ctx, lengthMm),
      hasProfileCode,
    });
  });

  const profileCuts: CotizacionLineTemplateCut[] = rows
    .filter((row) => row.kind === "profile" && !row.pending && row.lengthMm != null && !row.error)
    .map((row) => {
      const component = recipe.components.find((entry) => entry.id === row.componentId);
      const profileCode = component
        ? sanitizeWorkshopProfileCode(component.profileCode)
        : sanitizeWorkshopProfileCode(row.profileCode);
      const profileName =
        component?.profileName.trim() || component?.functionLabel || row.functionLabel;
      return {
        label: profileCode || profileName || RECIPE_MISSING_PROFILE_LABEL,
        functionLabel: row.functionLabel,
        profileCode,
        profileName,
        quantity: row.quantity,
        lengthMm: row.lengthMm as number,
        totalLinealMm: row.totalLinealMm,
        measureExplanation: row.measureExplanation,
      };
    });

  const byProfileBar = new Map<
    string,
    {
      profileCode: string;
      profileName: string;
      barLengthMm: number;
      kerfMm: number;
      cuts: Array<{ functionLabel: string; lengthMm: number }>;
      functionLabels: Set<string>;
    }
  >();
  const pendingPlans: RecipeProfileBarPlan[] = [];
  const seenPending = new Set<string>();

  rows.forEach((row) => {
    if (row.kind !== "profile" || row.pending || row.lengthMm == null || row.error) return;
    const component = recipe.components.find((entry) => entry.id === row.componentId);
    if (!component) return;

    const profileCode = row.hasProfileCode
      ? row.profileCode
      : RECIPE_MISSING_PROFILE_LABEL;
    const profileName =
      component.profileName.trim() || component.functionLabel || profileCode;
    const barLengthMm = resolveComponentBarLengthMm(component, {
      defaultBarLengthMm: defaultBar,
    });
    const kerfMm = resolveRecipeKerfMm(
      { defaultKerfMm: defaultKerf },
      component
    );

    if (!row.hasProfileCode || profileCode === RECIPE_MISSING_PROFILE_LABEL || !barLengthMm) {
      const pendingKey = `${profileCode}::${component.functionKey}`;
      if (!seenPending.has(pendingKey)) {
        seenPending.add(pendingKey);
        pendingPlans.push({
          key: pendingKey,
          profileCode,
          profileName,
          barLengthMm,
          kerfMm,
          cutCount: row.quantity,
          barsNeeded: 0,
          bars: [],
          calculable: false,
          pendingLabel: "Pauta pendiente",
          functionLabels: [row.functionLabel],
        });
      } else {
        const existingPending = pendingPlans.find((plan) => plan.key === pendingKey);
        if (existingPending) {
          existingPending.cutCount += row.quantity;
          if (!existingPending.functionLabels.includes(row.functionLabel)) {
            existingPending.functionLabels.push(row.functionLabel);
          }
        }
      }
      return;
    }

    // Agrupa por código de perfil + largo comercial (funciones distintas sí comparten).
    const groupKey = `${profileCode}::${barLengthMm}`;
    const current = byProfileBar.get(groupKey) ?? {
      profileCode,
      profileName,
      barLengthMm,
      kerfMm,
      cuts: [],
      functionLabels: new Set<string>(),
    };
    for (let i = 0; i < row.quantity; i += 1) {
      current.cuts.push({ functionLabel: row.functionLabel, lengthMm: row.lengthMm });
    }
    current.functionLabels.add(row.functionLabel);
    if (!current.profileName || current.profileName === profileCode) {
      current.profileName = profileName;
    }
    byProfileBar.set(groupKey, current);
  });

  const calculablePlans: RecipeProfileBarPlan[] = Array.from(byProfileBar.entries()).map(
    ([key, group]) => {
      const bars = distributeBarsForProfile({
        profileCode: group.profileCode,
        profileName: group.profileName,
        cuts: group.cuts,
        barLengthMm: group.barLengthMm,
        kerfMm: group.kerfMm,
      });
      return {
        key,
        profileCode: group.profileCode,
        profileName: group.profileName,
        barLengthMm: group.barLengthMm,
        kerfMm: group.kerfMm,
        cutCount: group.cuts.length,
        barsNeeded: bars.length,
        bars,
        calculable: true,
        pendingLabel: null,
        functionLabels: Array.from(group.functionLabels),
      };
    }
  );

  const profileBarPlans = [...calculablePlans, ...pendingPlans];
  const barSuggestions = calculablePlans.flatMap((plan) => plan.bars);

  const requiredProfiles = recipe.components.filter(
    (component) => component.kind === "profile" && component.required
  );
  const requiredCalculableCount = requiredProfiles.filter((component) => {
    const codeOk = hasWorkshopProfileCode(component);
    const lengthOk = resolveComponentBarLengthMm(component, {
      defaultBarLengthMm: defaultBar,
    });
    return codeOk && lengthOk != null;
  }).length;
  const anyCalculable = calculablePlans.length > 0;
  const barsStatus: RecipeBarsStatus = !anyCalculable
    ? "no_calculable"
    : requiredProfiles.length > 0 && requiredCalculableCount === requiredProfiles.length
      ? "calculado"
      : "pauta_parcial";

  const totalUsedMm = barSuggestions.reduce((sum, bar) => sum + bar.usedMm, 0);
  const totalWasteMm = barSuggestions.reduce((sum, bar) => sum + bar.wasteMm, 0);
  const totalKerfMm = barSuggestions.reduce((sum, bar) => sum + bar.kerfTotalMm, 0);
  const totalCapacity = barSuggestions.reduce((sum, bar) => sum + bar.barLengthMm, 0);
  const totalProfilesLinealMm = profileCuts.reduce((sum, cut) => sum + cut.totalLinealMm, 0);

  return {
    rows,
    profileCuts,
    glasses,
    accessories,
    barSuggestions,
    profileBarPlans,
    barsStatus,
    totalUsedMm,
    totalWasteMm,
    totalKerfMm,
    wastePct: totalCapacity > 0 ? ((totalWasteMm + totalKerfMm) / totalCapacity) * 100 : 0,
    totalProfilesLinealMm,
    pendingRequiredCount,
    errors,
  };
}

export function recipePreviewToLegacyCuttingPreview(
  preview: RecipeCuttingPreview
): CotizacionLineTemplateCuttingPreview {
  const glass =
    preview.glasses.length > 0
      ? {
          widthMm: preview.glasses[0].widthMm,
          heightMm: preview.glasses[0].heightMm,
          quantity: preview.glasses.reduce((sum, entry) => sum + entry.quantity, 0),
          totalM2: preview.glasses.reduce((sum, entry) => sum + entry.totalM2, 0),
        }
      : null;

  return {
    cuts: preview.profileCuts,
    bars: preview.barSuggestions.map((bar) => ({
      index: bar.index,
      usedMm: bar.usedMm + bar.kerfTotalMm,
      wasteMm: bar.wasteMm,
      profileCode: bar.profileCode,
      profileName: bar.profileName,
      barLengthMm: bar.barLengthMm,
      cuts: bar.cuts.map((cut) => ({
        label: bar.profileCode,
        functionLabel: cut.functionLabel,
        profileCode: bar.profileCode,
        profileName: bar.profileName,
        quantity: 1,
        lengthMm: cut.lengthMm,
        totalLinealMm: cut.lengthMm,
      })),
    })),
    totalUsedMm: preview.totalUsedMm,
    totalWasteMm: preview.totalWasteMm,
    wastePct: preview.wastePct,
    totalProfilesLinealMm: preview.totalProfilesLinealMm,
    glass,
    accessoryUnits: preview.accessories.reduce((sum, entry) => sum + entry.quantity, 0),
  };
}

export function migrateLegacyCubicationToRecipe(
  metadata: CotizacionLineTemplateCatalogMetadata | Record<string, unknown> | null | undefined
): FabricationRecipe {
  const existing = getFabricationRecipeFromMetadata(metadata as Record<string, unknown>);
  if (existing) return existing;

  const config = getLineTemplateCubicationConfig(
    metadata as CotizacionLineTemplateCatalogMetadata
  );
  const cutting = getLineTemplateCuttingRules(
    metadata as CotizacionLineTemplateCatalogMetadata
  );
  const type = fabricationTypeFromLegacySystem(config.system);
  const recipe = createStructuralRecipeTemplate(type);
  recipe.sashCount = cutting.sashCount || recipe.sashCount;

  const applyProfile = (component: RecipeComponent, code: string | null | undefined) => {
    const profileCode = sanitizeWorkshopProfileCode(code);
    if (!profileCode) {
      return {
        ...component,
        profileCode: "",
        profileName: component.profileName || component.functionLabel,
      };
    }
    return {
      ...component,
      profileCode,
      profileName: profileCode,
    };
  };

  recipe.components = recipe.components.map((component) => {
    if (component.functionKey === "riel_superior" || component.functionKey === "riel_inferior") {
      return {
        ...applyProfile(component, config.profileFrame),
        adjustMode: config.deductionFrameHorizontalMm > 0 ? "subtract" : "none",
        adjustMm: config.deductionFrameHorizontalMm,
      };
    }
    if (component.functionKey === "jamba" || component.functionKey === "marco") {
      const isHorizontal = component.measureBase === "vano_width";
      return {
        ...applyProfile(
          component,
          component.functionKey === "marco" ? config.profileFrame : config.profileFrame
        ),
        adjustMode: isHorizontal
          ? config.deductionFrameHorizontalMm > 0
            ? "subtract"
            : "none"
          : config.deductionFrameVerticalMm > 0
            ? "subtract"
            : "none",
        adjustMm: isHorizontal
          ? config.deductionFrameHorizontalMm
          : config.deductionFrameVerticalMm,
      };
    }
    if (
      component.functionKey === "cabezal" ||
      component.functionKey === "zocalo" ||
      component.functionKey === "pierna" ||
      component.functionKey === "hoja"
    ) {
      const isHorizontal =
        component.measureBase === "sash_width" || component.measureBase === "vano_width";
      const profileCode =
        component.functionKey === "zocalo" && config.profileSill
          ? config.profileSill
          : config.profileSash;
      return {
        ...applyProfile(component, profileCode),
        adjustMode: isHorizontal
          ? config.deductionSashHorizontalMm > 0
            ? "subtract"
            : "none"
          : config.deductionSashVerticalMm > 0
            ? "subtract"
            : "none",
        adjustMm: isHorizontal
          ? config.deductionSashHorizontalMm
          : config.deductionSashVerticalMm,
      };
    }
    if (component.functionKey === "traslapo") {
      return applyProfile(component, config.profileMeeting);
    }
    if (component.functionKey === "junquillo") {
      return {
        ...applyProfile(component, config.profileGlazingBead),
        adjustMode: config.deductionGlassWidthMm > 0 ? "subtract" : "none",
        adjustMm: config.deductionGlassWidthMm,
      };
    }
    if (component.functionKey === "vidrio") {
      return {
        ...component,
        profileName: "Vidrio",
        adjustMode:
          config.deductionGlassWidthMm > 0 || config.deductionGlassHeightMm > 0
            ? "subtract"
            : "none",
        adjustMm: Math.max(config.deductionGlassWidthMm, config.deductionGlassHeightMm),
      };
    }
    if (component.functionKey === "accesorio") {
      return applyProfile(component, config.profileAccessory);
    }
    return component;
  });

  const mappedStatus: RecipeStatus =
    config.status === "validada"
      ? "validada"
      : config.status === "revisar_cambios"
        ? "requiere_revision"
        : config.status === "en_calibracion"
          ? "en_validacion"
          : config.status === "lista_para_probar"
            ? "lista_para_validar"
            : deriveRecipeStatus(recipe);

  return {
    ...recipe,
    status: mappedStatus,
    validatedAt: mappedStatus === "validada" ? new Date().toISOString() : null,
  };
}

export function resolveRecipeFromMetadata(
  metadata: CotizacionLineTemplateCatalogMetadata | Record<string, unknown> | null | undefined,
  options?: {
    apertura?: AperturaTipo | null;
    fabricationType?: FabricationType | null;
    preferredRecipeId?: string | null;
  }
): FabricationRecipe | null {
  const pack = getFabricationRecipePackFromMetadata(metadata as Record<string, unknown>);
  if (pack && pack.recipes.length > 0) {
    if (
      options?.apertura ||
      options?.fabricationType ||
      options?.preferredRecipeId
    ) {
      const selected = selectRecipeForQuote({
        pack,
        apertura: options.apertura,
        fabricationType: options.fabricationType,
        preferredRecipeId: options.preferredRecipeId,
      });
      if (selected.recipe) return selected.recipe;
      if (selected.needsVariantChoice) return null;
    }
    const preferred = getFabricationRecipeFromMetadata(metadata as Record<string, unknown>);
    if (preferred) return preferred;
  }

  const parsed = getFabricationRecipeFromMetadata(metadata as Record<string, unknown>);
  if (parsed) return parsed;
  if (!metadata) return null;
  const cutting = getLineTemplateCuttingRules(
    metadata as CotizacionLineTemplateCatalogMetadata
  );
  const cubication = getLineTemplateCubicationConfig(
    metadata as CotizacionLineTemplateCatalogMetadata
  );
  if (!cutting.enabled && cubication.status === "sin_configurar") return null;
  return migrateLegacyCubicationToRecipe(metadata);
}

export function buildCuttingPreviewFromMetadata(
  metadata: CotizacionLineTemplateCatalogMetadata | Record<string, unknown> | null | undefined,
  dimensions: { widthMm: number; heightMm: number; quantity?: number } = {
    widthMm: 1200,
    heightMm: 1000,
    quantity: 1,
  },
  legacyFallback: (
    rules: CotizacionLineTemplateCuttingRules,
    dims: { widthMm: number; heightMm: number; quantity?: number },
    config?: CotizacionLineTemplateCubicationConfig
  ) => CotizacionLineTemplateCuttingPreview
): CotizacionLineTemplateCuttingPreview {
  const recipe = resolveRecipeFromMetadata(metadata);
  const rules = getLineTemplateCuttingRules(
    metadata as CotizacionLineTemplateCatalogMetadata
  );
  if (recipe && rules.enabled) {
    const preview = buildRecipeCuttingPreview(recipe, {
      ...dimensions,
      sashCount: recipe.sashCount,
      moduleCount: recipe.moduleCount,
    }, {
      barLengthMm: recipe.defaultBarLengthMm ?? rules.barLengthMm,
      kerfMm: recipe.defaultKerfMm ?? rules.sawKerfMm,
    });
    if (preview.errors.length > 0 && preview.profileCuts.length === 0) {
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
    return recipePreviewToLegacyCuttingPreview(preview);
  }

  return legacyFallback(
    rules,
    dimensions,
    getLineTemplateCubicationConfig(metadata as CotizacionLineTemplateCatalogMetadata)
  );
}

export function confirmRecipeValidated(recipe: FabricationRecipe): FabricationRecipe {
  const status = deriveRecipeStatus({ ...recipe, status: "lista_para_validar" });
  if (status !== "lista_para_validar" && status !== "en_validacion" && status !== "validada") {
    return { ...recipe, status };
  }
  return {
    ...recipe,
    status: "validada",
    validatedAt: new Date().toISOString(),
    versionBumpedSinceValidation: false,
  };
}

export function applyRealMeasuresAsAdjustments(
  recipe: FabricationRecipe,
  realCuts: Array<{ componentId: string; lengthMm: number }>
): FabricationRecipe {
  const components = recipe.components.map((component) => {
    const real = realCuts.find((entry) => entry.componentId === component.id);
    if (!real || component.kind !== "profile") return component;
    const ctx: RecipeMeasureContext = {
      widthMm: recipe.validationCase?.widthMm ?? 1200,
      heightMm: recipe.validationCase?.heightMm ?? 1000,
      sashCount: recipe.sashCount,
      moduleCount: recipe.moduleCount,
      quantity: 1,
    };
    const withoutAdjust = resolveComponentLengthMm(
      { ...component, adjustMode: "none", adjustMm: 0 },
      ctx
    );
    if (withoutAdjust.lengthMm == null) return component;
    const delta = withoutAdjust.lengthMm - real.lengthMm;
    if (delta === 0) {
      return { ...component, adjustMode: "none" as const, adjustMm: 0 };
    }
    return {
      ...component,
      adjustMode: delta > 0 ? ("subtract" as const) : ("add" as const),
      adjustMm: Math.abs(delta),
    };
  });

  return markRecipeDirtyAfterEdit({
    ...recipe,
    components,
    status: "en_validacion",
  });
}

export function addRecipeComponentByFunction(
  recipe: FabricationRecipe,
  functionKey: RecipeComponent["functionKey"]
): FabricationRecipe {
  const component = createRecipeComponent({
    functionKey,
    required: false,
  });
  return markRecipeDirtyAfterEdit({
    ...recipe,
    components: [...recipe.components, component],
  });
}

export { deriveRecipeStatus, markRecipeDirtyAfterEdit, parseFabricationRecipe };
