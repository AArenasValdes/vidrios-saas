export type QuickFixedSide = "top" | "bottom" | "left" | "right";
export type QuickPalilloPreset = "none" | "vertical" | "horizontal" | "cross" | "grid";
export type QuickPaneType = "sliding" | "fixed" | "casement" | "projecting";

/** Ajustes visuales aditivos sobre un croquis comercial. No representa módulos. */
export type QuickCompositionAdjustment = {
  version: 1;
  fixedTopMm: number | null;
  fixedBottomMm: number | null;
  fixedLeftMm: number | null;
  fixedRightMm: number | null;
  /** Proporciones relativas de hojas comerciales dentro del ancho útil. */
  leafWidths: number[] | null;
  /** Cantidad de módulos cuando la división visual no viene de un esquema comercial. */
  paneCount?: number | null;
  /** Índices comerciales estables: "leaf-1", "leaf-2", etc. */
  paneDecorations: Record<string, QuickPalilloPreset>;
  /** Tipo visual individual por hoja, aditivo sobre el sistema comercial. */
  paneTypes?: Record<string, QuickPaneType>;
  mirrored: boolean;
};

export function createEmptyQuickCompositionAdjustment(): QuickCompositionAdjustment {
  return {
    version: 1,
    fixedTopMm: null,
    fixedBottomMm: null,
    fixedLeftMm: null,
    fixedRightMm: null,
    leafWidths: null,
    paneCount: null,
    paneDecorations: {},
    paneTypes: {},
    mirrored: false,
  };
}

export function normalizeQuickCompositionAdjustment(value: unknown): QuickCompositionAdjustment | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<QuickCompositionAdjustment>;
  const dimension = (candidate: unknown) => {
    if (candidate === null || candidate === undefined) return null;
    return typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0 ? Math.round(candidate) : null;
  };
  const paneDecorations: Record<string, QuickPalilloPreset> = {};
  if (source.paneDecorations && typeof source.paneDecorations === "object") {
    for (const [key, preset] of Object.entries(source.paneDecorations)) {
      if (["none", "vertical", "horizontal", "cross", "grid"].includes(String(preset))) paneDecorations[key] = preset as QuickPalilloPreset;
    }
  }
  const paneTypes: Record<string, QuickPaneType> = {};
  if (source.paneTypes && typeof source.paneTypes === "object") {
    for (const [key, paneType] of Object.entries(source.paneTypes)) {
      if (/^leaf-[1-6]$/.test(key) && ["sliding", "fixed", "casement", "projecting"].includes(String(paneType))) paneTypes[key] = paneType as QuickPaneType;
    }
  }
  const leafWidths = Array.isArray(source.leafWidths) && source.leafWidths.length >= 2 && source.leafWidths.length <= 6 && source.leafWidths.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)
    ? source.leafWidths.map((n) => Math.round(n))
    : null;
  const paneCount = typeof source.paneCount === "number" && Number.isInteger(source.paneCount) && source.paneCount >= 1 && source.paneCount <= 6 ? source.paneCount : null;
  return {
    version: 1,
    fixedTopMm: dimension(source.fixedTopMm),
    fixedBottomMm: dimension(source.fixedBottomMm),
    fixedLeftMm: dimension(source.fixedLeftMm),
    fixedRightMm: dimension(source.fixedRightMm),
    leafWidths,
    paneCount,
    paneDecorations,
    paneTypes,
    mirrored: source.mirrored === true,
  };
}

export function hasQuickCompositionChanges(value: QuickCompositionAdjustment | null | undefined): boolean {
  return Boolean(value && (
    value.fixedTopMm || value.fixedBottomMm || value.fixedLeftMm || value.fixedRightMm ||
    value.leafWidths || typeof value.paneCount === "number" || value.mirrored || Object.values(value.paneDecorations).some((preset) => preset !== "none") || Object.keys(value.paneTypes ?? {}).length > 0
  ));
}

export function hasQuickCompositionStructuralChanges(value: QuickCompositionAdjustment | null | undefined): boolean {
  return Boolean(value && (
    value.fixedTopMm || value.fixedBottomMm || value.fixedLeftMm || value.fixedRightMm ||
    value.leafWidths || typeof value.paneCount === "number" || Object.keys(value.paneTypes ?? {}).length > 0
  ));
}
