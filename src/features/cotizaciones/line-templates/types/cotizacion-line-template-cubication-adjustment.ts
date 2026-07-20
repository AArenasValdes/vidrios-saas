/**
 * Ajustes de cubicación desde pauta manual → línea de catálogo (Fase 4).
 * Perfiles por rol + descuentos mm inferidos al comparar auto vs manual.
 * Si la línea estaba validada, mergeLineTemplateCubicationConfig → `revisar_cambios`.
 */

import {
  getLineTemplateCubicationConfig,
  mergeLineTemplateCubicationConfig,
  type CotizacionLineTemplateCatalogMetadata,
  type CotizacionLineTemplateCubicationConfig,
  type CotizacionLineTemplateCubicationSystem,
  type CotizacionLineTemplateCut,
  type CotizacionLineTemplateGlassPiece,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

type ProfileRole =
  | "profileFrame"
  | "profileSash"
  | "profileMeeting"
  | "profileGlazingBead"
  | "profileSill";

export type CubicationDeductionKey =
  | "deductionFrameHorizontalMm"
  | "deductionFrameVerticalMm"
  | "deductionSashHorizontalMm"
  | "deductionSashVerticalMm"
  | "deductionGlassWidthMm"
  | "deductionGlassHeightMm";

export type CubicationDeductionChange = {
  key: CubicationDeductionKey;
  label: string;
  fromMm: number;
  toMm: number;
  deltaMm: number;
  sampleFunctionLabel: string;
};

export type CubicationLineAdjustmentSummary = {
  profilePatch: Partial<CotizacionLineTemplateCubicationConfig>;
  deductionPatch: Partial<CotizacionLineTemplateCubicationConfig>;
  deductionChanges: CubicationDeductionChange[];
  changed: boolean;
  lines: string[];
};

const DEDUCTION_LABELS: Record<CubicationDeductionKey, string> = {
  deductionFrameHorizontalMm: "Descuento marco/riel horizontal",
  deductionFrameVerticalMm: "Descuento marco/jamba vertical",
  deductionSashHorizontalMm: "Descuento hoja horizontal",
  deductionSashVerticalMm: "Descuento hoja vertical",
  deductionGlassWidthMm: "Descuento vidrio (ancho)",
  deductionGlassHeightMm: "Descuento vidrio (alto)",
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function clampDeduction(value: number, maxExclusive: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  const max = Math.max(0, Math.floor(maxExclusive) - 1);
  return Math.min(Math.round(value), max);
}

function inferRoleFromFunctionLabel(functionLabel: string): ProfileRole | null {
  const text = normalizeText(functionLabel);
  if (!text) return null;

  if (
    text.includes("junquillo") ||
    text.includes("bead") ||
    text.includes("contravidrio")
  ) {
    return "profileGlazingBead";
  }
  if (text.includes("encuentro") || text.includes("traslapo") || text.includes("meeting")) {
    return "profileMeeting";
  }
  if (text.includes("zocalo") || text.includes("sill") || text.includes("umbral")) {
    return "profileSill";
  }
  if (
    text.includes("hoja") ||
    text.includes("sash") ||
    text.includes("movil") ||
    text.includes("batiente")
  ) {
    return "profileSash";
  }
  if (
    text.includes("marco") ||
    text.includes("riel") ||
    text.includes("jamba") ||
    text.includes("frame") ||
    text.includes("fijo")
  ) {
    return "profileFrame";
  }

  return null;
}

/**
 * Mapea la función del corte al descuento de catálogo que lo produce.
 * Junquillo en puerta abatible usa descuento de vidrio (ancho); en corredera, hoja horizontal.
 */
export function inferDeductionKeyFromFunctionLabel(
  functionLabel: string,
  system: CotizacionLineTemplateCubicationSystem
): CubicationDeductionKey | null {
  const text = normalizeText(functionLabel);
  if (!text) return null;

  if (text.includes("junquillo") && system === "puerta_abatible_1_hoja") {
    return "deductionGlassWidthMm";
  }
  if (
    text.includes("hoja horizontal") ||
    text.includes("junquillo") ||
    text.includes("zocalo")
  ) {
    return "deductionSashHorizontalMm";
  }
  if (
    text.includes("hoja vertical") ||
    text.includes("encuentro") ||
    text.includes("traslapo")
  ) {
    return "deductionSashVerticalMm";
  }
  if (
    text.includes("riel") ||
    text.includes("marco horizontal") ||
    (text.includes("marco") && text.includes("horizontal"))
  ) {
    return "deductionFrameHorizontalMm";
  }
  if (
    text.includes("jamba") ||
    text.includes("marco vertical") ||
    (text.includes("marco") && text.includes("vertical"))
  ) {
    return "deductionFrameVerticalMm";
  }

  return null;
}

function pickDominantLabel(labels: string[]) {
  const counts = new Map<string, string>();
  const tallies = new Map<string, number>();
  labels.forEach((label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = normalizeText(trimmed);
    tallies.set(key, (tallies.get(key) ?? 0) + 1);
    if (!counts.has(key)) counts.set(key, trimmed);
  });

  let bestKey: string | null = null;
  let bestCount = 0;
  tallies.forEach((count, key) => {
    if (count > bestCount || (count === bestCount && (!bestKey || key.localeCompare(bestKey) < 0))) {
      bestKey = key;
      bestCount = count;
    }
  });

  return bestKey ? counts.get(bestKey) ?? null : null;
}

function deductionMaxExclusive(
  key: CubicationDeductionKey,
  input: {
    widthMm: number;
    heightMm: number;
    sashCount: number;
    system: CotizacionLineTemplateCubicationSystem;
  }
) {
  const sashWidthMm = Math.max(1, Math.round(input.widthMm / Math.max(1, input.sashCount)));
  switch (key) {
    case "deductionFrameHorizontalMm":
      return input.widthMm;
    case "deductionFrameVerticalMm":
    case "deductionSashVerticalMm":
    case "deductionGlassHeightMm":
      return input.heightMm;
    case "deductionSashHorizontalMm":
      return input.system === "corredera_2_hojas" ? sashWidthMm : input.widthMm;
    case "deductionGlassWidthMm":
      return input.system === "corredera_2_hojas" ? sashWidthMm : input.widthMm;
    default:
      return input.widthMm;
  }
}

/**
 * Deriva un patch de perfiles desde cortes editados manualmente.
 * Usa la función del corte (Riel, Hoja, etc.) para mapear al rol.
 */
export function buildCubicationConfigPatchFromManualCuts(
  cuts: readonly CotizacionLineTemplateCut[],
  current: CotizacionLineTemplateCubicationConfig
): Partial<CotizacionLineTemplateCubicationConfig> {
  const buckets: Record<ProfileRole, string[]> = {
    profileFrame: [],
    profileSash: [],
    profileMeeting: [],
    profileGlazingBead: [],
    profileSill: [],
  };

  cuts.forEach((cut) => {
    const role = inferRoleFromFunctionLabel(cut.functionLabel);
    if (!role) return;
    const label = cut.label.trim();
    if (!label) return;
    buckets[role].push(label);
  });

  const patch: Partial<CotizacionLineTemplateCubicationConfig> = {};

  const frame = pickDominantLabel(buckets.profileFrame);
  const sash = pickDominantLabel(buckets.profileSash);
  const meeting = pickDominantLabel(buckets.profileMeeting);
  const bead = pickDominantLabel(buckets.profileGlazingBead);
  const sill = pickDominantLabel(buckets.profileSill);

  if (frame && frame !== current.profileFrame) patch.profileFrame = frame;
  if (sash && sash !== current.profileSash) patch.profileSash = sash;
  if (meeting && meeting !== (current.profileMeeting ?? "")) {
    patch.profileMeeting = meeting;
  }
  if (bead && bead !== (current.profileGlazingBead ?? "")) {
    patch.profileGlazingBead = bead;
  }
  if (sill && sill !== (current.profileSill ?? "")) {
    patch.profileSill = sill;
  }

  return patch;
}

/**
 * Infiere descuentos mm al comparar la pauta automática con la editada.
 * Ejemplo: hoja horizontal 594 → 590 ⇒ +4 mm al descuento de hoja horizontal.
 */
export function buildCubicationDeductionPatchFromManualCuts(input: {
  widthMm: number;
  heightMm: number;
  sashCount?: number;
  system: CotizacionLineTemplateCubicationSystem;
  current: CotizacionLineTemplateCubicationConfig;
  autoCuts: readonly CotizacionLineTemplateCut[];
  manualCuts: readonly CotizacionLineTemplateCut[];
  autoGlass?: CotizacionLineTemplateGlassPiece | null;
  manualGlass?: CotizacionLineTemplateGlassPiece | null;
}): {
  patch: Partial<CotizacionLineTemplateCubicationConfig>;
  changes: CubicationDeductionChange[];
} {
  const sashCount = Math.max(1, Math.round(input.sashCount ?? 2));
  const basis = {
    widthMm: Math.max(1, Math.round(input.widthMm)),
    heightMm: Math.max(1, Math.round(input.heightMm)),
    sashCount,
    system: input.system,
  };

  const candidates = new Map<
    CubicationDeductionKey,
    { deltas: number[]; sampleFunctionLabel: string }
  >();

  const autoByFunction = new Map<string, number>();
  input.autoCuts.forEach((cut) => {
    const key = normalizeText(cut.functionLabel);
    if (!key || cut.lengthMm <= 0) return;
    if (!autoByFunction.has(key)) {
      autoByFunction.set(key, cut.lengthMm);
    }
  });

  input.manualCuts.forEach((cut) => {
    const functionKey = normalizeText(cut.functionLabel);
    if (!functionKey || cut.lengthMm <= 0) return;
    const autoLength = autoByFunction.get(functionKey);
    if (autoLength == null || autoLength === cut.lengthMm) return;

    const deductionKey = inferDeductionKeyFromFunctionLabel(cut.functionLabel, input.system);
    if (!deductionKey) return;

    const delta = autoLength - cut.lengthMm;
    const existing = candidates.get(deductionKey);
    if (existing) {
      existing.deltas.push(delta);
    } else {
      candidates.set(deductionKey, {
        deltas: [delta],
        sampleFunctionLabel: cut.functionLabel.trim() || functionKey,
      });
    }
  });

  if (input.autoGlass && input.manualGlass) {
    if (input.autoGlass.widthMm !== input.manualGlass.widthMm) {
      candidates.set("deductionGlassWidthMm", {
        deltas: [input.autoGlass.widthMm - input.manualGlass.widthMm],
        sampleFunctionLabel: "Vidrio (ancho)",
      });
    }
    if (input.autoGlass.heightMm !== input.manualGlass.heightMm) {
      candidates.set("deductionGlassHeightMm", {
        deltas: [input.autoGlass.heightMm - input.manualGlass.heightMm],
        sampleFunctionLabel: "Vidrio (alto)",
      });
    }
  }

  const patch: Partial<CotizacionLineTemplateCubicationConfig> = {};
  const changes: CubicationDeductionChange[] = [];

  candidates.forEach((candidate, key) => {
    const avgDelta = Math.round(
      candidate.deltas.reduce((sum, value) => sum + value, 0) / candidate.deltas.length
    );
    if (avgDelta === 0) return;

    const fromMm = input.current[key];
    const toMm = clampDeduction(fromMm + avgDelta, deductionMaxExclusive(key, basis));
    if (toMm === fromMm) return;

    patch[key] = toMm;
    changes.push({
      key,
      label: DEDUCTION_LABELS[key],
      fromMm,
      toMm,
      deltaMm: toMm - fromMm,
      sampleFunctionLabel: candidate.sampleFunctionLabel,
    });
  });

  changes.sort((left, right) => left.label.localeCompare(right.label, "es"));
  return { patch, changes };
}

export function summarizeCubicationLineAdjustment(input: {
  catalogMetadata: CotizacionLineTemplateCatalogMetadata | null | undefined;
  cuts: readonly CotizacionLineTemplateCut[];
  widthMm: number;
  heightMm: number;
  sashCount?: number;
  autoCuts?: readonly CotizacionLineTemplateCut[];
  autoGlass?: CotizacionLineTemplateGlassPiece | null;
  manualGlass?: CotizacionLineTemplateGlassPiece | null;
}): CubicationLineAdjustmentSummary {
  const current = getLineTemplateCubicationConfig(input.catalogMetadata);
  const profilePatch = buildCubicationConfigPatchFromManualCuts(input.cuts, current);
  const deductionResult =
    input.autoCuts && input.autoCuts.length > 0
      ? buildCubicationDeductionPatchFromManualCuts({
          widthMm: input.widthMm,
          heightMm: input.heightMm,
          sashCount: input.sashCount,
          system: current.system,
          current,
          autoCuts: input.autoCuts,
          manualCuts: input.cuts,
          autoGlass: input.autoGlass,
          manualGlass: input.manualGlass,
        })
      : { patch: {}, changes: [] };

  const lines: string[] = [];
  Object.entries(profilePatch).forEach(([key, value]) => {
    if (typeof value !== "string" || !value.trim()) return;
    const roleLabel =
      key === "profileFrame"
        ? "Marco/riel"
        : key === "profileSash"
          ? "Hoja"
          : key === "profileMeeting"
            ? "Encuentro"
            : key === "profileGlazingBead"
              ? "Junquillo"
              : key === "profileSill"
                ? "Zócalo"
                : key;
    lines.push(`${roleLabel}: ${value}`);
  });
  deductionResult.changes.forEach((change) => {
    const sign = change.deltaMm > 0 ? "+" : "";
    lines.push(
      `${change.label}: ${change.fromMm} → ${change.toMm} mm (${sign}${change.deltaMm} mm; ${change.sampleFunctionLabel})`
    );
  });

  return {
    profilePatch,
    deductionPatch: deductionResult.patch,
    deductionChanges: deductionResult.changes,
    changed:
      Object.keys(profilePatch).length > 0 || Object.keys(deductionResult.patch).length > 0,
    lines,
  };
}

export function applyManualCutsAdjustmentToLineCatalogMetadata(input: {
  catalogMetadata: CotizacionLineTemplateCatalogMetadata | null | undefined;
  cuts: readonly CotizacionLineTemplateCut[];
  widthMm?: number;
  heightMm?: number;
  sashCount?: number;
  autoCuts?: readonly CotizacionLineTemplateCut[];
  autoGlass?: CotizacionLineTemplateGlassPiece | null;
  manualGlass?: CotizacionLineTemplateGlassPiece | null;
}): {
  nextMetadata: CotizacionLineTemplateCatalogMetadata;
  patch: Partial<CotizacionLineTemplateCubicationConfig>;
  summary: CubicationLineAdjustmentSummary;
  changed: boolean;
} {
  const widthMm = Math.max(1, Math.round(input.widthMm ?? 1200));
  const heightMm = Math.max(1, Math.round(input.heightMm ?? 1000));
  const summary = summarizeCubicationLineAdjustment({
    catalogMetadata: input.catalogMetadata,
    cuts: input.cuts,
    widthMm,
    heightMm,
    sashCount: input.sashCount,
    autoCuts: input.autoCuts,
    autoGlass: input.autoGlass,
    manualGlass: input.manualGlass,
  });
  const patch = {
    ...summary.profilePatch,
    ...summary.deductionPatch,
  };
  const nextMetadata = mergeLineTemplateCubicationConfig(input.catalogMetadata, patch);

  return {
    nextMetadata,
    patch,
    summary,
    changed: summary.changed,
  };
}
