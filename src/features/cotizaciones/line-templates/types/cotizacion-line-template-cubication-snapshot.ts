/**
 * Snapshot técnico de cubicación por ítem de cotización (Fase 4).
 * Se persiste en `cotizacion_items.observaciones` vía bridge `[cub:]`.
 * Congela la pauta al momento del guardado para que cambios futuros
 * en la línea no alteren cotizaciones históricas.
 */

import {
  buildLineTemplateCuttingPreview,
  getLineTemplateCubicationConfig,
  getLineTemplateCuttingRules,
  type CotizacionLineTemplateCatalogMetadata,
  type CotizacionLineTemplateCubicationStatus,
  type CotizacionLineTemplateCubicationSystem,
  type CotizacionLineTemplateCuttingBar,
  type CotizacionLineTemplateCuttingPreview,
  type CotizacionLineTemplateCut,
  type CotizacionLineTemplateGlassPiece,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  buildRecipeCuttingPreview,
  recipePreviewToLegacyCuttingPreview,
  resolveRecipeFromMetadata,
} from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";
import {
  deriveRecipeStatus,
  parseFabricationRecipe,
  type FabricationRecipe,
  type RecipeStatus,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";

export const COTIZACION_CUBICATION_SNAPSHOT_VERSION = 2 as const;
export const COTIZACION_CUBICATION_SNAPSHOT_LEGACY_VERSION = 1 as const;

export type CotizacionItemCubicationSnapshotSource = "auto" | "manual";

/** Origen del cálculo de pauta mostrado al maestro. */
export type CotizacionCubicationEstimationKind =
  | "recipe"
  | "legacy_partida"
  | "geometric_fallback";

export type CotizacionItemCubicationSnapshot = {
  v:
    | typeof COTIZACION_CUBICATION_SNAPSHOT_VERSION
    | typeof COTIZACION_CUBICATION_SNAPSHOT_LEGACY_VERSION;
  source: CotizacionItemCubicationSnapshotSource;
  lineTemplateId: string;
  system: CotizacionLineTemplateCubicationSystem | string;
  status: CotizacionLineTemplateCubicationStatus | RecipeStatus | string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  capturedAt: string;
  cuts: CotizacionLineTemplateCut[];
  bars: CotizacionLineTemplateCuttingBar[];
  totalUsedMm: number;
  totalWasteMm: number;
  wastePct: number;
  totalProfilesLinealMm: number;
  glass: CotizacionLineTemplateGlassPiece | null;
  accessoryUnits: number;
  /** Receta congelada (v2). Cotizaciones antiguas pueden no traerla. */
  recipe?: FabricationRecipe | null;
  /** Cómo se generó la pauta (receta / partida V1 / estimado geométrico). */
  estimationKind?: CotizacionCubicationEstimationKind | null;
};

export const GEOMETRIC_FALLBACK_NOTICE =
  "Despiece estimado — esta línea todavía no tiene receta de fabricación configurada.";

export function snapshotUsesFabricationRecipe(
  snapshot: CotizacionItemCubicationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  if (snapshot.estimationKind === "recipe") return true;
  return Boolean(snapshot.recipe && snapshot.recipe.components.length > 0);
}

export function isGeometricFallbackSnapshot(
  snapshot: CotizacionItemCubicationSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  if (snapshot.estimationKind === "geometric_fallback") return true;
  if (snapshotUsesFabricationRecipe(snapshot)) return false;
  return snapshot.cuts.some(
    (cut) =>
      cut.label === "División / hoja" ||
      (cut.label === "Marco" &&
        (cut.functionLabel === "Horizontal" || cut.functionLabel === "Vertical"))
  );
}

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeUtf8ToBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return toBase64Url(Buffer.from(value, "utf8").toString("base64"));
  }

  return toBase64Url(btoa(unescape(encodeURIComponent(value))));
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(b64)));
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseCut(value: unknown): CotizacionLineTemplateCut | null {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const functionLabel =
    typeof value.functionLabel === "string" ? value.functionLabel.trim() : "";
  const quantity = normalizePositiveInteger(value.quantity, 0);
  const lengthMm = normalizePositiveInteger(value.lengthMm, 0);
  if (!label || !functionLabel || quantity <= 0 || lengthMm <= 0) return null;
  const measureExplanation =
    typeof value.measureExplanation === "string" && value.measureExplanation.trim()
      ? value.measureExplanation.trim()
      : null;
  return {
    label,
    functionLabel,
    quantity,
    lengthMm,
    totalLinealMm: normalizePositiveInteger(value.totalLinealMm, lengthMm * quantity),
    ...(measureExplanation ? { measureExplanation } : {}),
  };
}

function parseBar(value: unknown): CotizacionLineTemplateCuttingBar | null {
  if (!isRecord(value)) return null;
  const index = normalizePositiveInteger(value.index, 0);
  const usedMm = Math.max(0, Math.round(Number(value.usedMm) || 0));
  const wasteMm = Math.max(0, Math.round(Number(value.wasteMm) || 0));
  const cuts = Array.isArray(value.cuts)
    ? value.cuts.map(parseCut).filter((cut): cut is CotizacionLineTemplateCut => Boolean(cut))
    : [];
  if (index <= 0) return null;
  return { index, usedMm, wasteMm, cuts };
}

function parseGlass(value: unknown): CotizacionLineTemplateGlassPiece | null {
  if (!isRecord(value)) return null;
  const widthMm = normalizePositiveInteger(value.widthMm, 0);
  const heightMm = normalizePositiveInteger(value.heightMm, 0);
  const quantity = normalizePositiveInteger(value.quantity, 0);
  if (widthMm <= 0 || heightMm <= 0 || quantity <= 0) return null;
  const totalM2 = Number(value.totalM2);
  return {
    widthMm,
    heightMm,
    quantity,
    totalM2: Number.isFinite(totalM2) ? totalM2 : (widthMm * heightMm * quantity) / 1_000_000,
  };
}

function normalizeSystem(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "corredera_2_hojas";
}

function normalizeStatus(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "sin_configurar";
}

export function serializeCubicationSnapshot(
  snapshot: CotizacionItemCubicationSnapshot
): string {
  const json = JSON.stringify(snapshot);
  return `${snapshot.v}|${encodeUtf8ToBase64Url(json)}`;
}

export function parseCubicationSnapshot(
  value: string | null | undefined
): CotizacionItemCubicationSnapshot | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  try {
    const pipeIndex = raw.indexOf("|");
    if (pipeIndex <= 0) return null;
    const version = Number(raw.slice(0, pipeIndex));
    if (
      version !== COTIZACION_CUBICATION_SNAPSHOT_VERSION &&
      version !== COTIZACION_CUBICATION_SNAPSHOT_LEGACY_VERSION
    ) {
      return null;
    }

    const parsed = JSON.parse(decodeBase64Url(raw.slice(pipeIndex + 1))) as unknown;
    if (!isRecord(parsed) || (parsed.v !== 1 && parsed.v !== 2)) {
      return null;
    }

    const lineTemplateId =
      typeof parsed.lineTemplateId === "string" ? parsed.lineTemplateId.trim() : "";
    const widthMm = normalizePositiveInteger(parsed.widthMm, 0);
    const heightMm = normalizePositiveInteger(parsed.heightMm, 0);
    const quantity = normalizePositiveInteger(parsed.quantity, 0);
    const cuts = Array.isArray(parsed.cuts)
      ? parsed.cuts.map(parseCut).filter((cut): cut is CotizacionLineTemplateCut => Boolean(cut))
      : [];

    if (!lineTemplateId || widthMm <= 0 || heightMm <= 0 || quantity <= 0 || cuts.length === 0) {
      return null;
    }

    const bars = Array.isArray(parsed.bars)
      ? parsed.bars.map(parseBar).filter((bar): bar is CotizacionLineTemplateCuttingBar => Boolean(bar))
      : [];

    const recipe = parseFabricationRecipe(parsed.recipe);

    return {
      v: parsed.v === 2 ? 2 : 1,
      source: parsed.source === "manual" ? "manual" : "auto",
      lineTemplateId,
      system: normalizeSystem(parsed.system),
      status: normalizeStatus(parsed.status),
      widthMm,
      heightMm,
      quantity,
      capturedAt:
        typeof parsed.capturedAt === "string" && parsed.capturedAt.trim()
          ? parsed.capturedAt.trim()
          : new Date(0).toISOString(),
      cuts,
      bars,
      totalUsedMm: Math.max(0, Math.round(Number(parsed.totalUsedMm) || 0)),
      totalWasteMm: Math.max(0, Math.round(Number(parsed.totalWasteMm) || 0)),
      wastePct: Number.isFinite(Number(parsed.wastePct)) ? Number(parsed.wastePct) : 0,
      totalProfilesLinealMm: Math.max(
        0,
        Math.round(Number(parsed.totalProfilesLinealMm) || 0)
      ),
      glass: parseGlass(parsed.glass),
      accessoryUnits: Math.max(0, Math.round(Number(parsed.accessoryUnits) || 0)),
      recipe: recipe ?? null,
      estimationKind:
        parsed.estimationKind === "recipe" ||
        parsed.estimationKind === "legacy_partida" ||
        parsed.estimationKind === "geometric_fallback"
          ? parsed.estimationKind
          : recipe
            ? "recipe"
            : null,
    };
  } catch {
    return null;
  }
}

function normalizeEditableCut(cut: Partial<CotizacionLineTemplateCut>): CotizacionLineTemplateCut | null {
  const label = typeof cut.label === "string" ? cut.label.trim() : "";
  const functionLabel =
    typeof cut.functionLabel === "string" ? cut.functionLabel.trim() : "";
  const quantity = normalizePositiveInteger(cut.quantity, 0);
  const lengthMm = normalizePositiveInteger(cut.lengthMm, 0);
  if (!label || !functionLabel || quantity <= 0 || lengthMm <= 0) {
    return null;
  }
  const measureExplanation =
    typeof cut.measureExplanation === "string" && cut.measureExplanation.trim()
      ? cut.measureExplanation.trim()
      : null;
  return {
    label: label.slice(0, 80),
    functionLabel: functionLabel.slice(0, 80),
    quantity,
    lengthMm,
    totalLinealMm: lengthMm * quantity,
    ...(measureExplanation ? { measureExplanation } : {}),
  };
}

function packCutsIntoBars(
  cuts: CotizacionLineTemplateCut[],
  barLengthMm: number,
  sawKerfMm: number
): CotizacionLineTemplateCuttingBar[] {
  const safeBarLength = Math.max(normalizePositiveInteger(barLengthMm, 6000), 1000);
  const safeKerf = Math.max(0, Math.round(Number(sawKerfMm) || 0));
  const missingProfile = "Perfil sin código";

  // Separar por código de perfil: nunca mezclar barras de códigos distintos.
  const byProfile = new Map<string, CotizacionLineTemplateCut[]>();
  cuts.forEach((cut) => {
    const profile = cut.label.trim() || missingProfile;
    // Sin código comercial no hay estimación confiable de barras.
    if (profile === missingProfile || profile === "Por asignar") {
      return;
    }
    const list = byProfile.get(profile) ?? [];
    for (let i = 0; i < cut.quantity; i += 1) {
      list.push({
        ...cut,
        quantity: 1,
        totalLinealMm: cut.lengthMm,
      });
    }
    byProfile.set(profile, list);
  });

  const bars: CotizacionLineTemplateCuttingBar[] = [];
  Array.from(byProfile.values()).forEach((profileCuts) => {
    const expanded = [...profileCuts].sort((a, b) => b.lengthMm - a.lengthMm);
    expanded.forEach((cut) => {
      const existingBar = bars.find((bar) => {
        if (bar.cuts[0]?.label !== cut.label) return false;
        const kerf = bar.cuts.length > 0 ? safeKerf : 0;
        return bar.usedMm + kerf + cut.lengthMm <= safeBarLength;
      });
      const targetBar =
        existingBar ??
        ({
          index: bars.length + 1,
          usedMm: 0,
          wasteMm: safeBarLength,
          cuts: [],
        } satisfies CotizacionLineTemplateCuttingBar);

      if (!existingBar) bars.push(targetBar);

      const kerf = targetBar.cuts.length > 0 ? safeKerf : 0;
      targetBar.usedMm += kerf + cut.lengthMm;
      targetBar.wasteMm = Math.max(safeBarLength - targetBar.usedMm, 0);
      targetBar.cuts.push(cut);
    });
  });

  return bars;
}

/** Reaplica cortes editados a un snapshot (solo esta cotización). */
export function rebuildCubicationSnapshotWithCuts(
  base: CotizacionItemCubicationSnapshot,
  cutsInput: Array<Partial<CotizacionLineTemplateCut>>,
  options?: {
    source?: CotizacionItemCubicationSnapshotSource;
    barLengthMm?: number;
    sawKerfMm?: number;
    capturedAt?: string;
  }
): CotizacionItemCubicationSnapshot | null {
  const cuts = cutsInput
    .map(normalizeEditableCut)
    .filter((cut): cut is CotizacionLineTemplateCut => Boolean(cut));

  if (cuts.length === 0) {
    return null;
  }

  const barLengthMm = options?.barLengthMm ?? 6000;
  const sawKerfMm = options?.sawKerfMm ?? 3;
  const bars = packCutsIntoBars(cuts, barLengthMm, sawKerfMm);
  const totalUsedMm = bars.reduce((sum, bar) => sum + bar.usedMm, 0);
  const totalWasteMm = bars.reduce((sum, bar) => sum + bar.wasteMm, 0);
  const totalAvailableMm = bars.length * Math.max(barLengthMm, 1000);
  const totalProfilesLinealMm = cuts.reduce((sum, cut) => sum + cut.totalLinealMm, 0);

  return {
    ...base,
    source: options?.source ?? "manual",
    capturedAt: options?.capturedAt ?? new Date().toISOString(),
    cuts,
    bars,
    totalUsedMm,
    totalWasteMm,
    wastePct: totalAvailableMm > 0 ? (totalWasteMm / totalAvailableMm) * 100 : 0,
    totalProfilesLinealMm,
  };
}

export function createEmptyCubicationCutDraft(): CotizacionLineTemplateCut {
  return {
    label: "Perfil",
    functionLabel: "Corte",
    quantity: 1,
    lengthMm: 1000,
    totalLinealMm: 1000,
  };
}

export function cubicationSnapshotMatchesDimensions(
  snapshot: CotizacionItemCubicationSnapshot | null | undefined,
  input: {
    lineTemplateId?: string | null;
    widthMm: number;
    heightMm: number;
    quantity: number;
  }
): boolean {
  if (!snapshot) return false;
  const lineTemplateId = (input.lineTemplateId ?? "").trim();
  return (
    snapshot.lineTemplateId === lineTemplateId &&
    snapshot.widthMm === input.widthMm &&
    snapshot.heightMm === input.heightMm &&
    snapshot.quantity === input.quantity
  );
}

export function cubicationSnapshotToPreview(
  snapshot: CotizacionItemCubicationSnapshot
): CotizacionLineTemplateCuttingPreview {
  return {
    cuts: snapshot.cuts,
    bars: snapshot.bars,
    totalUsedMm: snapshot.totalUsedMm,
    totalWasteMm: snapshot.totalWasteMm,
    wastePct: snapshot.wastePct,
    totalProfilesLinealMm: snapshot.totalProfilesLinealMm,
    glass: snapshot.glass,
    accessoryUnits: snapshot.accessoryUnits,
  };
}

/**
 * Fallback geométrico estimado (solo si la línea no tiene receta).
 * Visible como “Despiece estimado — esta línea todavía no tiene receta…”.
 */
export function buildPersonalizadoManualCubicationDraft(input: {
  lineTemplateId: string;
  catalogMetadata?: CotizacionLineTemplateCatalogMetadata | null;
  widthMm: number;
  heightMm: number;
  quantity?: number;
  capturedAt?: string;
}): CotizacionItemCubicationSnapshot | null {
  const lineTemplateId = input.lineTemplateId.trim();
  const widthMm = normalizePositiveInteger(input.widthMm, 0);
  const heightMm = normalizePositiveInteger(input.heightMm, 0);
  const quantity = normalizePositiveInteger(input.quantity, 1);

  if (!lineTemplateId || widthMm <= 0 || heightMm <= 0) {
    return null;
  }

  const rules = getLineTemplateCuttingRules(input.catalogMetadata);
  const cubicationConfig = getLineTemplateCubicationConfig(input.catalogMetadata);
  const starterCuts: CotizacionLineTemplateCut[] = [
    {
      label: "Marco",
      functionLabel: "Horizontal",
      quantity: 2 * quantity,
      lengthMm: widthMm,
      totalLinealMm: widthMm * 2 * quantity,
      measureExplanation: `Ancho total ${widthMm.toLocaleString("es-CL")} mm (estimado geométrico)`,
    },
    {
      label: "Marco",
      functionLabel: "Vertical",
      quantity: 2 * quantity,
      lengthMm: heightMm,
      totalLinealMm: heightMm * 2 * quantity,
      measureExplanation: `Alto total ${heightMm.toLocaleString("es-CL")} mm (estimado geométrico)`,
    },
    {
      label: "División / hoja",
      functionLabel: "Por definir",
      quantity: 1 * quantity,
      lengthMm: heightMm,
      totalLinealMm: heightMm * quantity,
      measureExplanation: `Alto total ${heightMm.toLocaleString("es-CL")} mm (estimado geométrico)`,
    },
  ];

  const base: CotizacionItemCubicationSnapshot = {
    v: COTIZACION_CUBICATION_SNAPSHOT_VERSION,
    source: "manual",
    lineTemplateId,
    system: cubicationConfig.system,
    status: "en_calibracion",
    widthMm,
    heightMm,
    quantity,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    cuts: starterCuts,
    bars: [],
    totalUsedMm: 0,
    totalWasteMm: 0,
    wastePct: 0,
    totalProfilesLinealMm: 0,
    glass: {
      widthMm,
      heightMm,
      quantity,
      totalM2: (widthMm * heightMm * quantity) / 1_000_000,
    },
    accessoryUnits: 0,
    recipe: null,
    estimationKind: "geometric_fallback",
  };

  const rebuilt = rebuildCubicationSnapshotWithCuts(base, starterCuts, {
    source: "manual",
    barLengthMm: rules.barLengthMm,
    sawKerfMm: rules.sawKerfMm,
    capturedAt: base.capturedAt,
  });

  if (!rebuilt) {
    return null;
  }

  return {
    ...rebuilt,
    status: "en_calibracion",
    glass: base.glass,
    accessoryUnits: 0,
    recipe: null,
    estimationKind: "geometric_fallback",
  };
}

export function buildCubicationSnapshotFromCatalogMetadata(input: {
  lineTemplateId: string;
  catalogMetadata: CotizacionLineTemplateCatalogMetadata | null | undefined;
  widthMm: number;
  heightMm: number;
  quantity?: number;
  capturedAt?: string;
  preferredRecipeId?: string | null;
  apertura?: import("@/features/cotizaciones/line-templates/types/fabrication-recipe").AperturaTipo | null;
  fabricationType?: import("@/features/cotizaciones/line-templates/types/fabrication-recipe").FabricationType | null;
}): CotizacionItemCubicationSnapshot | null {
  const lineTemplateId = input.lineTemplateId.trim();
  const widthMm = normalizePositiveInteger(input.widthMm, 0);
  const heightMm = normalizePositiveInteger(input.heightMm, 0);
  const quantity = normalizePositiveInteger(input.quantity, 1);

  if (!lineTemplateId || widthMm <= 0 || heightMm <= 0) {
    return null;
  }

  const rules = getLineTemplateCuttingRules(input.catalogMetadata);
  const cubicationConfig = getLineTemplateCubicationConfig(input.catalogMetadata);
  const recipe = resolveRecipeFromMetadata(input.catalogMetadata, {
    preferredRecipeId: input.preferredRecipeId,
    apertura: input.apertura,
    fabricationType: input.fabricationType,
  });
  const hasRecipe = Boolean(recipe && recipe.components.length > 0);
  const recipeValidated =
    Boolean(recipe) && deriveRecipeStatus(recipe as FabricationRecipe) === "validada";

  // Receta validada: fuente de verdad de pauta operativa.
  // Recetas en borrador no habilitan cubicación/pauta en cotización.
  if (hasRecipe && recipe && recipeValidated) {
    const preview = recipePreviewToLegacyCuttingPreview(
      buildRecipeCuttingPreview(
        recipe,
        {
          widthMm,
          heightMm,
          quantity,
          sashCount: recipe.sashCount,
          moduleCount: recipe.moduleCount,
        },
        { barLengthMm: recipe.defaultBarLengthMm, kerfMm: recipe.defaultKerfMm }
      )
    );
    if (preview.cuts.length === 0 && preview.accessoryUnits <= 0 && !preview.glass) {
      return null;
    }
    // #region agent log
    fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "2c9a42",
      },
      body: JSON.stringify({
        sessionId: "2c9a42",
        runId: "pre-fix",
        hypothesisId: "B_E",
        location:
          "cotizacion-line-template-cubication-snapshot.ts:catalogRecipePath",
        message: "Usó receta legacy de catalogMetadata",
        data: {
          lineTemplateId,
          recipeId: recipe.id,
          totalMm: preview.totalProfilesLinealMm,
          functions: preview.cuts.slice(0, 12).map((cut) => cut.functionLabel),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return {
      v: COTIZACION_CUBICATION_SNAPSHOT_VERSION,
      source: "auto",
      lineTemplateId,
      system: recipe.fabricationType,
      status: recipe.status,
      widthMm,
      heightMm,
      quantity,
      capturedAt: input.capturedAt ?? new Date().toISOString(),
      cuts: preview.cuts,
      bars: preview.bars,
      totalUsedMm: preview.totalUsedMm,
      totalWasteMm: preview.totalWasteMm,
      wastePct: preview.wastePct,
      totalProfilesLinealMm: preview.totalProfilesLinealMm,
      glass: preview.glass,
      accessoryUnits: preview.accessoryUnits,
      recipe,
      estimationKind: "recipe",
    };
  }

  if (!rules.enabled || rules.mode === "sin_corte") {
    return null;
  }

  const preview = buildLineTemplateCuttingPreview(
    rules,
    { widthMm, heightMm, quantity },
    cubicationConfig
  );
  // #region agent log
  fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "2c9a42",
    },
    body: JSON.stringify({
      sessionId: "2c9a42",
      runId: "pre-fix",
      hypothesisId: "A_D",
      location:
        "cotizacion-line-template-cubication-snapshot.ts:legacyCuttingPath",
      message: "Usó motor legacy Marco/Hoja/Junquillo",
      data: {
        lineTemplateId,
        hasCatalogRecipe: hasRecipe,
        recipeValidated,
        rulesEnabled: rules.enabled,
        rulesMode: rules.mode,
        system: cubicationConfig.system,
        widthMm,
        heightMm,
        quantity,
        totalMm: preview.totalProfilesLinealMm,
        functions: preview.cuts.slice(0, 12).map((cut) => cut.functionLabel),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (preview.cuts.length === 0) {
    return null;
  }

  return {
    v: COTIZACION_CUBICATION_SNAPSHOT_VERSION,
    source: "auto",
    lineTemplateId,
    system: cubicationConfig.system,
    status: cubicationConfig.status,
    widthMm,
    heightMm,
    quantity,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    cuts: preview.cuts,
    bars: preview.bars,
    totalUsedMm: preview.totalUsedMm,
    totalWasteMm: preview.totalWasteMm,
    wastePct: preview.wastePct,
    totalProfilesLinealMm: preview.totalProfilesLinealMm,
    glass: preview.glass,
    accessoryUnits: preview.accessoryUnits,
    recipe: null,
    estimationKind: "legacy_partida",
  };
}

export function resolveCubicationSnapshotForSave(input: {
  lineTemplateId: string;
  widthMm: number | null | undefined;
  heightMm: number | null | undefined;
  quantity: number;
  catalogMetadata?: CotizacionLineTemplateCatalogMetadata | null;
  draftSnapshot?: CotizacionItemCubicationSnapshot | null;
  previousSnapshot?: CotizacionItemCubicationSnapshot | null;
  /**
   * Composición Personalizado sin receta: pauta geométrica estimada.
   * Si la línea tiene receta de fabricación, la receta manda.
   */
  personalizadoAssistMode?: boolean;
}): CotizacionItemCubicationSnapshot | null {
  const lineTemplateId = input.lineTemplateId.trim();
  const widthMm = normalizePositiveInteger(input.widthMm, 0);
  const heightMm = normalizePositiveInteger(input.heightMm, 0);
  const quantity = normalizePositiveInteger(input.quantity, 1);
  const dims = { lineTemplateId, widthMm, heightMm, quantity };

  if (!lineTemplateId || widthMm <= 0 || heightMm <= 0) {
    return null;
  }

  const recipeFromCatalog = resolveRecipeFromMetadata(input.catalogMetadata);
  const catalogHasRecipe = Boolean(
    recipeFromCatalog && recipeFromCatalog.components.length > 0
  );

  const preserveManualAdjustment = (
    snapshot: CotizacionItemCubicationSnapshot | null | undefined
  ) =>
    Boolean(
      snapshot &&
        cubicationSnapshotMatchesDimensions(snapshot, dims) &&
        snapshot.source === "manual" &&
        !isGeometricFallbackSnapshot(snapshot)
    );

  // Receta de línea: siempre manda sobre el croquis / modo Personalizado.
  if (catalogHasRecipe && input.catalogMetadata) {
    if (preserveManualAdjustment(input.draftSnapshot)) {
      return rebuildCubicationSnapshotWithCuts(
        input.draftSnapshot!,
        input.draftSnapshot!.cuts,
        {
          source: "manual",
          capturedAt: input.draftSnapshot!.capturedAt,
        }
      );
    }
    if (preserveManualAdjustment(input.previousSnapshot)) {
      return input.previousSnapshot ?? null;
    }
    return buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId,
      catalogMetadata: input.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  }

  if (input.personalizadoAssistMode) {
    if (
      cubicationSnapshotMatchesDimensions(input.draftSnapshot, dims) &&
      input.draftSnapshot?.source === "manual"
    ) {
      const rebuilt = rebuildCubicationSnapshotWithCuts(
        input.draftSnapshot,
        input.draftSnapshot.cuts,
        {
          source: "manual",
          capturedAt: input.draftSnapshot.capturedAt,
        }
      );
      return rebuilt
        ? { ...rebuilt, estimationKind: "geometric_fallback", recipe: null }
        : null;
    }

    if (
      cubicationSnapshotMatchesDimensions(input.previousSnapshot, dims) &&
      input.previousSnapshot?.source === "manual"
    ) {
      return {
        ...input.previousSnapshot,
        estimationKind: "geometric_fallback",
        recipe: null,
      };
    }

    return buildPersonalizadoManualCubicationDraft({
      lineTemplateId,
      catalogMetadata: input.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  }

  if (
    cubicationSnapshotMatchesDimensions(input.draftSnapshot, dims) &&
    input.draftSnapshot
  ) {
    if (input.draftSnapshot.source === "manual") {
      return rebuildCubicationSnapshotWithCuts(input.draftSnapshot, input.draftSnapshot.cuts, {
        source: "manual",
        capturedAt: input.draftSnapshot.capturedAt,
      });
    }

    if (input.catalogMetadata) {
      return buildCubicationSnapshotFromCatalogMetadata({
        lineTemplateId,
        catalogMetadata: input.catalogMetadata,
        widthMm,
        heightMm,
        quantity,
      });
    }

    return input.draftSnapshot;
  }

  if (
    cubicationSnapshotMatchesDimensions(input.previousSnapshot, dims) &&
    input.previousSnapshot?.source === "manual"
  ) {
    return input.previousSnapshot;
  }

  if (input.catalogMetadata) {
    return buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId,
      catalogMetadata: input.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  }

  if (cubicationSnapshotMatchesDimensions(input.previousSnapshot, dims)) {
    return input.previousSnapshot ?? null;
  }

  return null;
}
