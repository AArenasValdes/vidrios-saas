/**
 * Constructor visual guiado — schema V2 (árbol de regiones).
 * Fuente de verdad: GuidedVisualConfig (config_json). El SVG es derivado.
 */

import {
  buildPalilloPreset,
  countPalilloCells,
  countPalilloSplits,
  createEmptyPalilloLayout,
  equalizeSiblingPalilloCells,
  findPalilloNodeById,
  flattenPalilloLayoutToLines,
  isPalilloCell,
  isPalilloSplit,
  mergePalilloCells,
  migrateFlatPalillosToLayout,
  normalizePalilloLayout,
  removePalilloSplit,
  splitPalilloCell,
  updatePalilloSplitRatio,
  type GuidedPalilloCellNode,
  type GuidedPalilloNode,
  type GuidedPalilloPresetId,
  type GuidedPalilloSplitNode,
  MAX_GUIDED_PALILLO_SPLITS,
} from "@/features/cotizaciones/visual-composer/types/guided-palillo-layout";

export type {
  GuidedPalilloCellNode,
  GuidedPalilloNode,
  GuidedPalilloPresetId,
  GuidedPalilloRect,
  GuidedPalilloSplitNode,
} from "@/features/cotizaciones/visual-composer/types/guided-palillo-layout";

export {
  buildPalilloPreset,
  calculatePalilloRects,
  clampPalilloRatio,
  countPalilloCells,
  countPalilloSplits,
  createEmptyPalilloLayout,
  describePalilloSplit,
  equalizeSiblingPalilloCells,
  findPalilloNodeById,
  findPalilloParentSplit,
  flattenPalilloLayoutToLines,
  GUIDED_PALILLO_PRESET_LABELS,
  isPalilloCell,
  isPalilloSplit,
  MAX_GUIDED_PALILLO_CELLS,
  MAX_GUIDED_PALILLO_SPLITS,
  mergePalilloCells,
  migrateFlatPalillosToLayout,
  normalizePalilloLayout,
  removePalilloSplit,
  splitPalilloCell,
  updatePalilloSplitRatio,
  validatePalilloLayout,
} from "@/features/cotizaciones/visual-composer/types/guided-palillo-layout";

export const GUIDED_VISUAL_SCHEMA_VERSION = 2 as const;
export const GUIDED_VISUAL_SCHEMA_VERSION_V1 = 1 as const;

export const MAX_GUIDED_LEAF_MODULES = 6;
/** Máximo de palillos (splits) por módulo. */
export const MAX_GUIDED_PALILLOS_PER_MODULE = MAX_GUIDED_PALILLO_SPLITS;
export const MIN_GUIDED_DIMENSION_MM = 200;
export const MIN_SPLIT_RATIO = 0.08;
export const MAX_SPLIT_RATIO = 0.92;

export const GUIDED_MODULE_TYPES = [
  "fijo",
  "corredera",
  "abatible",
  "oscilobatiente",
  "proyectante",
  "puerta",
  "pano_libre",
] as const;

export type GuidedModuleType = (typeof GUIDED_MODULE_TYPES)[number];

export type GuidedSplitDirection = "vertical" | "horizontal";

/** @deprecated V1 — usar GuidedSplitDirection */
export type GuidedVisualAxis = GuidedSplitDirection;

export const GUIDED_MODULE_TYPE_LABELS: Record<GuidedModuleType, string> = {
  fijo: "Fijo",
  corredera: "Corredera",
  abatible: "Abatible",
  oscilobatiente: "Oscilobatiente",
  proyectante: "Proyectante",
  puerta: "Puerta",
  pano_libre: "Paño libre",
};

export const GUIDED_OPENING_SIDES = ["left", "right"] as const;
export type GuidedOpeningSide = (typeof GUIDED_OPENING_SIDES)[number];

export const GUIDED_OPENING_SIDE_LABELS: Record<GuidedOpeningSide, string> = {
  left: "Abre a la izquierda",
  right: "Abre a la derecha",
};

export const GUIDED_SPLIT_SNAP_RATIOS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75] as const;

export type GuidedPalillo = {
  id: string;
  axis: GuidedSplitDirection;
  /** Posición 0–1 a lo largo del eje del módulo (0.05–0.95). */
  position: number;
};

/** Forma del marco / vano completo (V1: rectángulo, arco superior o redondeado). */
export type GuidedFrameShape =
  | { kind: "rect" }
  | { kind: "arch_top"; archRiseMm: number }
  | { kind: "rounded"; radiusMm: number; corners: "all" | "top" };

/** Forma del vidrio por módulo (V1: rectángulo o esquinas redondeadas). */
export type GuidedGlassShape =
  | { kind: "rect" }
  | { kind: "rounded"; radiusMm: number; corners: "all" | "top" };

export const GUIDED_FRAME_SHAPE_KINDS = ["rect", "arch_top", "rounded"] as const;
export type GuidedFrameShapeKind = (typeof GUIDED_FRAME_SHAPE_KINDS)[number];

export const GUIDED_GLASS_SHAPE_KINDS = ["rect", "rounded"] as const;
export type GuidedGlassShapeKind = (typeof GUIDED_GLASS_SHAPE_KINDS)[number];

export const GUIDED_FRAME_SHAPE_LABELS: Record<GuidedFrameShapeKind, string> = {
  rect: "Rectángulo",
  arch_top: "Arco superior",
  rounded: "Redondeado",
};

export const GUIDED_GLASS_SHAPE_LABELS: Record<GuidedGlassShapeKind, string> = {
  rect: "Rectángulo",
  rounded: "Redondeado",
};

export type GuidedModuleNode = {
  kind: "module";
  id: string;
  type: GuidedModuleType;
  /**
   * Legacy plano (compat). Se sincroniza desde palilloLayout al normalizar.
   * Preferir palilloLayout para geometría real (incluye parciales / T).
   */
  palillos: GuidedPalillo[];
  /** Árbol decorativo de palillos. null = sin palillos. */
  palilloLayout: GuidedPalilloNode | null;
  /** Forma del vidrio de este módulo (solo visual). */
  glassShape: GuidedGlassShape;
  /** Lado visual de bisagra/apertura. Compat: ausente equivale a left. */
  openingSide?: GuidedOpeningSide;
};

export type GuidedSplitNode = {
  kind: "split";
  id: string;
  direction: GuidedSplitDirection;
  /** Fracción del primer hijo (first). */
  ratio: number;
  first: GuidedRegionNode;
  second: GuidedRegionNode;
};

export type GuidedRegionNode = GuidedModuleNode | GuidedSplitNode;

export type GuidedVisualConfig = {
  schemaVersion: typeof GUIDED_VISUAL_SCHEMA_VERSION;
  widthMm: number;
  heightMm: number;
  root: GuidedRegionNode;
  selectedNodeId: string | null;
  selectedPalilloId: string | null;
  /** Silueta del vano/marco (solo visual; no cambia precio ni cubicación). */
  frameShape: GuidedFrameShape;
};

/** Forma legacy plana (schema 1). */
export type GuidedVisualModule = {
  id: string;
  type: GuidedModuleType;
  ratio: number;
};

export type GuidedVisualConfigV1 = {
  schemaVersion: typeof GUIDED_VISUAL_SCHEMA_VERSION_V1;
  axis: GuidedVisualAxis;
  widthMm: number;
  heightMm: number;
  modules: GuidedVisualModule[];
  selectedModuleId: string | null;
};

export type GuidedNodeRect = {
  id: string;
  kind: "module" | "split";
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Índice de hoja 0-based si kind === "module". */
  leafIndex: number | null;
  type?: GuidedModuleType;
  palillos?: GuidedPalillo[];
  palilloLayout?: GuidedPalilloNode | null;
  glassShape?: GuidedGlassShape;
  openingSide?: GuidedOpeningSide;
  direction?: GuidedSplitDirection;
  ratio?: number;
  /** Línea divisoria en mm (coordenada absoluta). */
  dividerMm?: number;
};

export function isGuidedModuleType(value: string): value is GuidedModuleType {
  return (GUIDED_MODULE_TYPES as readonly string[]).includes(value);
}

export function normalizeGuidedOpeningSide(value: unknown): GuidedOpeningSide {
  return value === "right" ? "right" : "left";
}

export function isModuleNode(node: GuidedRegionNode): node is GuidedModuleNode {
  return node.kind === "module";
}

export function isSplitNode(node: GuidedRegionNode): node is GuidedSplitNode {
  return node.kind === "split";
}

let guidedIdSeq = 0;

/** IDs estables en tests; en runtime incluye aleatorio. */
export function createGuidedNodeId(prefix: "m" | "s" | "p" = "m") {
  guidedIdSeq += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${guidedIdSeq}-${rand}`;
}

/** @deprecated Prefer createGuidedNodeId("m") */
export function createModuleId(index = 0) {
  return createGuidedNodeId("m");
}

export function resetGuidedIdSeqForTests() {
  guidedIdSeq = 0;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function clampRatio(ratio: number) {
  if (!Number.isFinite(ratio)) {
    return 0.5;
  }
  return clamp(ratio, MIN_SPLIT_RATIO, MAX_SPLIT_RATIO);
}

function clampPalilloPosition(position: number) {
  if (!Number.isFinite(position)) {
    return 0.5;
  }
  return clamp(position, 0.05, 0.95);
}

function safeDimensionMm(value: number | null | undefined, fallback: number) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) {
    return Math.max(MIN_GUIDED_DIMENSION_MM, fallback);
  }
  return Math.max(MIN_GUIDED_DIMENSION_MM, n);
}

function resolveModulePalilloLayout(
  palilloLayout: GuidedPalilloNode | null | undefined,
  palillos: GuidedPalillo[] | undefined
): { layout: GuidedPalilloNode | null; palillos: GuidedPalillo[] } {
  const hasLayout =
    palilloLayout != null &&
    typeof palilloLayout === "object" &&
    ("kind" in palilloLayout || "direction" in palilloLayout);

  let layout = hasLayout
    ? normalizePalilloLayout(palilloLayout as GuidedPalilloNode)
    : null;

  if (!layout && Array.isArray(palillos) && palillos.length > 0) {
    layout = migrateFlatPalillosToLayout(palillos);
  }

  const flat = flattenPalilloLayoutToLines(layout).map((p) => ({
    id: p.id || createGuidedNodeId("p"),
    axis: p.axis === "horizontal" ? ("horizontal" as const) : ("vertical" as const),
    position: clampPalilloPosition(p.position),
  }));

  return { layout, palillos: flat };
}

export function normalizeGuidedFrameShape(
  value: unknown,
  heightMm: number
): GuidedFrameShape {
  if (!value || typeof value !== "object") {
    return { kind: "rect" };
  }
  const raw = value as Partial<GuidedFrameShape> & {
    archRiseMm?: unknown;
    radiusMm?: unknown;
    corners?: unknown;
  };
  if (raw.kind === "arch_top") {
    const maxRise = Math.max(40, Math.round(heightMm * 0.45));
    const rise = Math.round(Number(raw.archRiseMm));
    return {
      kind: "arch_top",
      archRiseMm: Number.isFinite(rise)
        ? Math.min(Math.max(rise, 40), maxRise)
        : Math.min(Math.max(Math.round(heightMm * 0.18), 80), maxRise),
    };
  }
  if (raw.kind === "rounded") {
    const radius = Math.round(Number(raw.radiusMm));
    return {
      kind: "rounded",
      radiusMm: Number.isFinite(radius) ? Math.min(Math.max(radius, 8), 400) : 40,
      corners: raw.corners === "top" ? "top" : "all",
    };
  }
  return { kind: "rect" };
}

export function normalizeGuidedGlassShape(value: unknown): GuidedGlassShape {
  if (!value || typeof value !== "object") {
    return { kind: "rect" };
  }
  const raw = value as Partial<GuidedGlassShape> & {
    radiusMm?: unknown;
    corners?: unknown;
  };
  if (raw.kind === "rounded") {
    const radius = Math.round(Number(raw.radiusMm));
    return {
      kind: "rounded",
      radiusMm: Number.isFinite(radius) ? Math.min(Math.max(radius, 8), 400) : 40,
      corners: raw.corners === "top" ? "top" : "all",
    };
  }
  return { kind: "rect" };
}

export function createModuleNode(
  type: GuidedModuleType = "fijo",
  palillos: GuidedPalillo[] = []
): GuidedModuleNode {
  const resolved = resolveModulePalilloLayout(null, palillos);
  return {
    kind: "module",
    id: createGuidedNodeId("m"),
    type: isGuidedModuleType(type) ? type : "fijo",
    palillos: resolved.palillos,
    palilloLayout: resolved.layout,
    glassShape: { kind: "rect" },
    openingSide: "left",
  };
}

export function createDefaultGuidedVisualConfig(input?: {
  widthMm?: number | null;
  heightMm?: number | null;
  axis?: GuidedVisualAxis;
}): GuidedVisualConfig {
  const root = createModuleNode("fijo");
  const heightMm = safeDimensionMm(input?.heightMm, 1000);
  return {
    schemaVersion: GUIDED_VISUAL_SCHEMA_VERSION,
    widthMm: safeDimensionMm(input?.widthMm, 1200),
    heightMm,
    root,
    selectedNodeId: root.id,
    selectedPalilloId: null,
    frameShape: { kind: "rect" },
  };
}

export function countLeafModules(node: GuidedRegionNode): number {
  if (isModuleNode(node)) {
    return 1;
  }
  return countLeafModules(node.first) + countLeafModules(node.second);
}

export function listLeafModules(node: GuidedRegionNode): GuidedModuleNode[] {
  if (isModuleNode(node)) {
    return [node];
  }
  return [...listLeafModules(node.first), ...listLeafModules(node.second)];
}

export function findNodeById(
  node: GuidedRegionNode,
  id: string
): GuidedRegionNode | null {
  if (node.id === id) {
    return node;
  }
  if (isSplitNode(node)) {
    return findNodeById(node.first, id) ?? findNodeById(node.second, id);
  }
  return null;
}

export function findParentSplit(
  root: GuidedRegionNode,
  childId: string
): GuidedSplitNode | null {
  if (!isSplitNode(root)) {
    return null;
  }
  if (root.first.id === childId || root.second.id === childId) {
    return root;
  }
  return findParentSplit(root.first, childId) ?? findParentSplit(root.second, childId);
}

function mapTree(
  node: GuidedRegionNode,
  mapper: (n: GuidedRegionNode) => GuidedRegionNode | null
): GuidedRegionNode | null {
  const mapped = mapper(node);
  if (mapped === null) {
    return null;
  }
  if (isModuleNode(mapped)) {
    return mapped;
  }
  const first = mapTree(mapped.first, mapper);
  const second = mapTree(mapped.second, mapper);
  if (!first || !second) {
    return first ?? second ?? null;
  }
  return { ...mapped, first, second };
}

function replaceNode(
  root: GuidedRegionNode,
  targetId: string,
  replacement: GuidedRegionNode
): GuidedRegionNode {
  if (root.id === targetId) {
    return replacement;
  }
  if (isModuleNode(root)) {
    return root;
  }
  return {
    ...root,
    first: replaceNode(root.first, targetId, replacement),
    second: replaceNode(root.second, targetId, replacement),
  };
}

export function normalizeGuidedVisualConfig(
  config: GuidedVisualConfig
): GuidedVisualConfig {
  const widthMm = safeDimensionMm(config.widthMm, 1200);
  const heightMm = safeDimensionMm(config.heightMm, 1000);

  const normalizeNode = (node: GuidedRegionNode): GuidedRegionNode => {
    if (isModuleNode(node)) {
      const resolved = resolveModulePalilloLayout(
        (node as GuidedModuleNode).palilloLayout,
        node.palillos
      );
      return {
        kind: "module",
        id: node.id || createGuidedNodeId("m"),
        type: isGuidedModuleType(node.type) ? node.type : "fijo",
        palillos: resolved.palillos,
        palilloLayout: resolved.layout,
        glassShape: normalizeGuidedGlassShape(
          (node as GuidedModuleNode).glassShape
        ),
        openingSide: normalizeGuidedOpeningSide(
          (node as GuidedModuleNode).openingSide
        ),
      };
    }

    return {
      kind: "split",
      id: node.id || createGuidedNodeId("s"),
      direction: node.direction === "horizontal" ? "horizontal" : "vertical",
      ratio: clampRatio(node.ratio),
      first: normalizeNode(node.first),
      second: normalizeNode(node.second),
    };
  };

  const root = normalizeNode(config.root);
  const leaves = listLeafModules(root);
  const selectedExists = config.selectedNodeId
    ? Boolean(findNodeById(root, config.selectedNodeId))
    : false;

  let selectedPalilloId: string | null = null;
  if (config.selectedPalilloId) {
    for (const leaf of leaves) {
      if (
        leaf.palillos.some((p) => p.id === config.selectedPalilloId) ||
        findPalilloNodeById(leaf.palilloLayout, config.selectedPalilloId)
      ) {
        selectedPalilloId = config.selectedPalilloId;
        break;
      }
    }
  }

  return {
    schemaVersion: GUIDED_VISUAL_SCHEMA_VERSION,
    widthMm,
    heightMm,
    root,
    selectedNodeId: selectedExists
      ? config.selectedNodeId
      : leaves[0]?.id ?? null,
    selectedPalilloId,
    frameShape: normalizeGuidedFrameShape(config.frameShape, heightMm),
  };
}

export function validateGuidedVisualConfig(
  config: unknown
): { ok: true; config: GuidedVisualConfig } | { ok: false; reason: string } {
  if (!config || typeof config !== "object") {
    return { ok: false, reason: "config_missing" };
  }

  const raw = config as Partial<GuidedVisualConfig> & {
    schemaVersion?: number;
    modules?: unknown;
    axis?: unknown;
  };

  if (Number(raw.schemaVersion) === GUIDED_VISUAL_SCHEMA_VERSION_V1) {
    const migrated = migrateGuidedVisualConfigV1ToV2(
      raw as unknown as GuidedVisualConfigV1
    );
    return { ok: true, config: normalizeGuidedVisualConfig(migrated) };
  }

  if (raw.schemaVersion !== GUIDED_VISUAL_SCHEMA_VERSION) {
    return { ok: false, reason: "schema_unsupported" };
  }

  if (!raw.root || typeof raw.root !== "object") {
    return { ok: false, reason: "root_missing" };
  }

  try {
    const normalized = normalizeGuidedVisualConfig(raw as GuidedVisualConfig);
    const leaves = countLeafModules(normalized.root);
    if (leaves < 1 || leaves > MAX_GUIDED_LEAF_MODULES) {
      return { ok: false, reason: "leaf_count_invalid" };
    }
    return { ok: true, config: normalized };
  } catch {
    return { ok: false, reason: "normalize_failed" };
  }
}

/** Construye un árbol binario izquierdo a partir de módulos planos V1. */
function buildTreeFromFlatModules(
  modules: GuidedVisualModule[],
  axis: GuidedSplitDirection
): GuidedRegionNode {
  if (modules.length === 0) {
    return createModuleNode("fijo");
  }
  if (modules.length === 1) {
    const only = modules[0];
    return {
      kind: "module",
      id: only.id || createGuidedNodeId("m"),
      type: isGuidedModuleType(only.type) ? only.type : "fijo",
      palillos: [],
      palilloLayout: null,
      glassShape: { kind: "rect" },
      openingSide: "left",
    };
  }

  const total = modules.reduce(
    (sum, module) => sum + (Number.isFinite(module.ratio) && module.ratio > 0 ? module.ratio : 1),
    0
  );
  const firstWeight =
    Number.isFinite(modules[0].ratio) && modules[0].ratio > 0 ? modules[0].ratio : 1;
  const ratio = clampRatio(firstWeight / total);

  return {
    kind: "split",
    id: createGuidedNodeId("s"),
    direction: axis,
    ratio,
    first: {
      kind: "module",
      id: modules[0].id || createGuidedNodeId("m"),
      type: isGuidedModuleType(modules[0].type) ? modules[0].type : "fijo",
      palillos: [],
      palilloLayout: null,
      glassShape: { kind: "rect" },
      openingSide: "left",
    },
    second: buildTreeFromFlatModules(modules.slice(1), axis),
  };
}

export function migrateGuidedVisualConfigV1ToV2(
  v1: GuidedVisualConfigV1 | (Partial<GuidedVisualConfigV1> & { modules?: GuidedVisualModule[] })
): GuidedVisualConfig {
  const axis: GuidedSplitDirection = v1.axis === "horizontal" ? "horizontal" : "vertical";
  const modules = Array.isArray(v1.modules) ? v1.modules : [];
  const safeModules =
    modules.length > 0
      ? modules.slice(0, MAX_GUIDED_LEAF_MODULES).map((module, index) => ({
          id: module.id || createGuidedNodeId("m"),
          type: isGuidedModuleType(module.type) ? module.type : ("fijo" as const),
          ratio: Number.isFinite(module.ratio) && module.ratio > 0 ? module.ratio : 1,
        }))
      : [{ id: createGuidedNodeId("m"), type: "fijo" as const, ratio: 1 }];

  const root = buildTreeFromFlatModules(safeModules, axis);
  const leaves = listLeafModules(root);
  const selected =
    v1.selectedModuleId && leaves.some((leaf) => leaf.id === v1.selectedModuleId)
      ? v1.selectedModuleId
      : leaves[0]?.id ?? null;

  return normalizeGuidedVisualConfig({
    schemaVersion: GUIDED_VISUAL_SCHEMA_VERSION,
    widthMm: safeDimensionMm(v1.widthMm, 1200),
    heightMm: safeDimensionMm(v1.heightMm, 1000),
    root,
    selectedNodeId: selected,
    selectedPalilloId: null,
    frameShape: { kind: "rect" },
  });
}

export function ensureGuidedVisualConfig(
  input: unknown,
  fallbackDims?: { widthMm?: number | null; heightMm?: number | null }
): GuidedVisualConfig {
  const validated = validateGuidedVisualConfig(input);
  if (validated.ok) {
    return validated.config;
  }

  if (input && typeof input === "object") {
    const maybeV1 = input as Partial<GuidedVisualConfigV1>;
    if (
      maybeV1.schemaVersion === GUIDED_VISUAL_SCHEMA_VERSION_V1 ||
      Array.isArray(maybeV1.modules)
    ) {
      return migrateGuidedVisualConfigV1ToV2(maybeV1 as GuidedVisualConfigV1);
    }
  }

  return createDefaultGuidedVisualConfig(fallbackDims);
}

export function calculateNodeRects(
  config: GuidedVisualConfig
): GuidedNodeRect[] {
  const normalized = normalizeGuidedVisualConfig(config);
  const rects: GuidedNodeRect[] = [];
  let leafIndex = 0;

  const walk = (
    node: GuidedRegionNode,
    xMm: number,
    yMm: number,
    widthMm: number,
    heightMm: number
  ) => {
    if (isModuleNode(node)) {
      rects.push({
        id: node.id,
        kind: "module",
        xMm,
        yMm,
        widthMm,
        heightMm,
        leafIndex: leafIndex++,
        type: node.type,
        palillos: node.palillos,
        palilloLayout: node.palilloLayout,
        glassShape: node.glassShape,
        openingSide: normalizeGuidedOpeningSide(node.openingSide),
      });
      return;
    }

    const ratio = clampRatio(node.ratio);
    if (node.direction === "vertical") {
      const firstW = widthMm * ratio;
      const secondW = widthMm - firstW;
      const dividerMm = xMm + firstW;
      rects.push({
        id: node.id,
        kind: "split",
        xMm,
        yMm,
        widthMm,
        heightMm,
        leafIndex: null,
        direction: node.direction,
        ratio,
        dividerMm,
      });
      walk(node.first, xMm, yMm, firstW, heightMm);
      walk(node.second, dividerMm, yMm, secondW, heightMm);
      return;
    }

    const firstH = heightMm * ratio;
    const secondH = heightMm - firstH;
    const dividerMm = yMm + firstH;
    rects.push({
      id: node.id,
      kind: "split",
      xMm,
      yMm,
      widthMm,
      heightMm,
      leafIndex: null,
      direction: node.direction,
      ratio,
      dividerMm,
    });
    walk(node.first, xMm, yMm, widthMm, firstH);
    walk(node.second, xMm, dividerMm, widthMm, secondH);
  };

  walk(normalized.root, 0, 0, normalized.widthMm, normalized.heightMm);
  return rects;
}

export function snapSplitRatio(ratio: number, threshold = 0.02): number {
  const clamped = clampRatio(ratio);
  let best = clamped;
  let bestDist = Infinity;
  for (const snap of GUIDED_SPLIT_SNAP_RATIOS) {
    const dist = Math.abs(clamped - snap);
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      best = snap;
    }
  }
  return clampRatio(best);
}

export function splitModule(
  config: GuidedVisualConfig,
  moduleId: string,
  direction: GuidedSplitDirection,
  ratio = 0.5
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  if (countLeafModules(normalized.root) >= MAX_GUIDED_LEAF_MODULES) {
    return normalized;
  }

  const target = findNodeById(normalized.root, moduleId);
  if (!target || !isModuleNode(target)) {
    return normalized;
  }

  const first: GuidedModuleNode = {
    ...target,
    palillos: [...target.palillos],
  };
  const second = createModuleNode("fijo");
  const split: GuidedSplitNode = {
    kind: "split",
    id: createGuidedNodeId("s"),
    direction,
    ratio: clampRatio(ratio),
    first,
    second,
  };

  return normalizeGuidedVisualConfig({
    ...normalized,
    root: replaceNode(normalized.root, moduleId, split),
    selectedNodeId: second.id,
    selectedPalilloId: null,
  });
}

export function updateSplitRatio(
  config: GuidedVisualConfig,
  splitId: string,
  ratio: number,
  options?: { snap?: boolean }
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const nextRatio = options?.snap ? snapSplitRatio(ratio) : clampRatio(ratio);

  const root = mapTree(normalized.root, (node) => {
    if (isSplitNode(node) && node.id === splitId) {
      return { ...node, ratio: nextRatio };
    }
    return node;
  });

  if (!root) {
    return normalized;
  }

  return normalizeGuidedVisualConfig({
    ...normalized,
    root,
    selectedNodeId: splitId,
    selectedPalilloId: null,
  });
}

/** Fija el tamaño del primer hijo en mm; el hermano absorbe el resto. */
export function updateSplitFirstSizeMm(
  config: GuidedVisualConfig,
  splitId: string,
  firstSizeMm: number
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const rects = calculateNodeRects(normalized);
  const splitRect = rects.find((r) => r.id === splitId && r.kind === "split");
  if (!splitRect || !splitRect.direction) {
    return normalized;
  }

  const total =
    splitRect.direction === "vertical" ? splitRect.widthMm : splitRect.heightMm;
  if (total <= 0) {
    return normalized;
  }

  const ratio = clampRatio(firstSizeMm / total);
  return updateSplitRatio(normalized, splitId, ratio);
}

export function setEqualSplitChildren(
  config: GuidedVisualConfig,
  splitId: string
): GuidedVisualConfig {
  return updateSplitRatio(config, splitId, 0.5);
}

export function applyQuickSplitRatio(
  config: GuidedVisualConfig,
  splitId: string,
  preset: "50_50" | "1_3" | "2_3" | "equal"
): GuidedVisualConfig {
  const map = {
    "50_50": 0.5,
    "1_3": 1 / 3,
    "2_3": 2 / 3,
    equal: 0.5,
  } as const;
  return updateSplitRatio(config, splitId, map[preset]);
}

export function removeSplit(
  config: GuidedVisualConfig,
  splitId: string,
  keep: "first" | "second" = "first"
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const target = findNodeById(normalized.root, splitId);
  if (!target || !isSplitNode(target)) {
    return normalized;
  }

  const kept = keep === "second" ? target.second : target.first;
  const root = replaceNode(normalized.root, splitId, kept);

  return normalizeGuidedVisualConfig({
    ...normalized,
    root,
    selectedNodeId: isModuleNode(kept) ? kept.id : listLeafModules(kept)[0]?.id ?? null,
    selectedPalilloId: null,
  });
}

/** Une el módulo con su hermano: elimina el split padre y conserva este módulo. */
export function mergeSiblingModules(
  config: GuidedVisualConfig,
  moduleId: string
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const parent = findParentSplit(normalized.root, moduleId);
  if (!parent) {
    return normalized;
  }

  const keep: "first" | "second" =
    parent.first.id === moduleId ? "first" : "second";
  return removeSplit(normalized, parent.id, keep);
}

export function updateModuleType(
  config: GuidedVisualConfig,
  moduleId: string,
  type: GuidedModuleType
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const root = mapTree(normalized.root, (node) => {
    if (isModuleNode(node) && node.id === moduleId) {
      return { ...node, type: isGuidedModuleType(type) ? type : "fijo" };
    }
    return node;
  });

  if (!root) {
    return normalized;
  }

  return normalizeGuidedVisualConfig({
    ...normalized,
    root,
    selectedNodeId: moduleId,
    selectedPalilloId: null,
  });
}

export function updateModuleOpeningSide(
  config: GuidedVisualConfig,
  moduleId: string,
  openingSide: GuidedOpeningSide
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const root = mapTree(normalized.root, (node) => {
    if (isModuleNode(node) && node.id === moduleId) {
      return { ...node, openingSide: normalizeGuidedOpeningSide(openingSide) };
    }
    return node;
  });

  if (!root) {
    return normalized;
  }

  return normalizeGuidedVisualConfig({
    ...normalized,
    root,
    selectedNodeId: moduleId,
    selectedPalilloId: null,
  });
}

export function selectGuidedNode(
  config: GuidedVisualConfig,
  nodeId: string | null
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  if (!nodeId || !findNodeById(normalized.root, nodeId)) {
    const firstLeaf = listLeafModules(normalized.root)[0];
    return {
      ...normalized,
      selectedNodeId: firstLeaf?.id ?? null,
      selectedPalilloId: null,
    };
  }
  return {
    ...normalized,
    selectedNodeId: nodeId,
    selectedPalilloId: null,
  };
}

export function setGuidedVisualDimensions(
  config: GuidedVisualConfig,
  input: { widthMm?: number; heightMm?: number }
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  return normalizeGuidedVisualConfig({
    ...normalized,
    widthMm:
      input.widthMm !== undefined
        ? safeDimensionMm(input.widthMm, normalized.widthMm)
        : normalized.widthMm,
    heightMm:
      input.heightMm !== undefined
        ? safeDimensionMm(input.heightMm, normalized.heightMm)
        : normalized.heightMm,
  });
}

export function setGuidedFrameShape(
  config: GuidedVisualConfig,
  frameShape: GuidedFrameShape
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  return normalizeGuidedVisualConfig({
    ...normalized,
    frameShape,
  });
}

export function updateModuleGlassShape(
  config: GuidedVisualConfig,
  moduleId: string,
  glassShape: GuidedGlassShape
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const root = mapTree(normalized.root, (node) => {
    if (isModuleNode(node) && node.id === moduleId) {
      return {
        ...node,
        glassShape: normalizeGuidedGlassShape(glassShape),
      };
    }
    return node;
  });

  if (!root) {
    return normalized;
  }

  return normalizeGuidedVisualConfig({
    ...normalized,
    root,
    selectedNodeId: moduleId,
  });
}

function updateModulePalilloLayout(
  config: GuidedVisualConfig,
  moduleId: string,
  nextLayout: GuidedPalilloNode | null,
  selectedPalilloId: string | null = null
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const target = findNodeById(normalized.root, moduleId);
  if (!target || !isModuleNode(target)) {
    return normalized;
  }

  const resolved = resolveModulePalilloLayout(nextLayout, undefined);
  const root = replaceNode(normalized.root, moduleId, {
    ...target,
    palilloLayout: resolved.layout,
    palillos: resolved.palillos,
  });

  return normalizeGuidedVisualConfig({
    ...normalized,
    root,
    selectedNodeId: moduleId,
    selectedPalilloId,
  });
}

export function setModulePalilloLayout(
  config: GuidedVisualConfig,
  moduleId: string,
  layout: GuidedPalilloNode | null
): GuidedVisualConfig {
  return updateModulePalilloLayout(config, moduleId, layout, null);
}

export function selectPalilloNode(
  config: GuidedVisualConfig,
  moduleId: string,
  nodeId: string | null
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  return normalizeGuidedVisualConfig({
    ...normalized,
    selectedNodeId: moduleId,
    selectedPalilloId: nodeId,
  });
}

export function applyPalilloPresetToModule(
  config: GuidedVisualConfig,
  moduleId: string,
  preset: GuidedPalilloPresetId
): GuidedVisualConfig {
  const layout = buildPalilloPreset(preset);
  return updateModulePalilloLayout(config, moduleId, layout, null);
}

export function clearModulePalillos(
  config: GuidedVisualConfig,
  moduleId: string
): GuidedVisualConfig {
  return updateModulePalilloLayout(config, moduleId, null, null);
}

export function splitModulePalilloCell(
  config: GuidedVisualConfig,
  moduleId: string,
  cellId: string,
  direction: GuidedSplitDirection,
  ratio = 0.5
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const target = findNodeById(normalized.root, moduleId);
  if (!target || !isModuleNode(target)) {
    return normalized;
  }
  const base = target.palilloLayout ?? createEmptyPalilloLayout();
  const cell =
    findPalilloNodeById(base, cellId) ??
    (isPalilloCell(base) ? base : calculateFirstCell(base));
  if (!cell || !isPalilloCell(cell)) {
    return normalized;
  }
  const next = splitPalilloCell(base, cell.id, direction, ratio);
  const created = next ? findNewestSplit(next, base) : null;
  return updateModulePalilloLayout(
    normalized,
    moduleId,
    next,
    created?.id ?? null
  );
}

function findNewestSplit(
  next: GuidedPalilloNode,
  prev: GuidedPalilloNode | null
): GuidedPalilloSplitNode | null {
  const prevIds = new Set<string>();
  const collect = (node: GuidedPalilloNode | null) => {
    if (!node) {
      return;
    }
    if (isPalilloSplit(node)) {
      prevIds.add(node.id);
      collect(node.first);
      collect(node.second);
    }
  };
  collect(prev);
  let found: GuidedPalilloSplitNode | null = null;
  const walk = (node: GuidedPalilloNode) => {
    if (isPalilloSplit(node)) {
      if (!prevIds.has(node.id)) {
        found = node;
      }
      walk(node.first);
      walk(node.second);
    }
  };
  walk(next);
  return found;
}

export function updateModulePalilloSplitRatio(
  config: GuidedVisualConfig,
  moduleId: string,
  splitId: string,
  ratio: number
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const target = findNodeById(normalized.root, moduleId);
  if (!target || !isModuleNode(target) || !target.palilloLayout) {
    return normalized;
  }
  const next = updatePalilloSplitRatio(target.palilloLayout, splitId, ratio);
  return updateModulePalilloLayout(normalized, moduleId, next, splitId);
}

export function removeModulePalilloSplit(
  config: GuidedVisualConfig,
  moduleId: string,
  splitId: string
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const target = findNodeById(normalized.root, moduleId);
  if (!target || !isModuleNode(target) || !target.palilloLayout) {
    return normalized;
  }
  const next = removePalilloSplit(target.palilloLayout, splitId, "first");
  return updateModulePalilloLayout(normalized, moduleId, next, null);
}

export function equalizeModulePalilloNode(
  config: GuidedVisualConfig,
  moduleId: string,
  nodeId: string
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const target = findNodeById(normalized.root, moduleId);
  if (!target || !isModuleNode(target) || !target.palilloLayout) {
    return normalized;
  }
  const next = equalizeSiblingPalilloCells(target.palilloLayout, nodeId);
  return updateModulePalilloLayout(normalized, moduleId, next, nodeId);
}

export function mergeModulePalilloCell(
  config: GuidedVisualConfig,
  moduleId: string,
  cellId: string
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const target = findNodeById(normalized.root, moduleId);
  if (!target || !isModuleNode(target) || !target.palilloLayout) {
    return normalized;
  }
  const next = mergePalilloCells(target.palilloLayout, cellId);
  return updateModulePalilloLayout(normalized, moduleId, next, null);
}

/** Compat: agrega un palillo completo dividiendo la celda raíz o la seleccionada. */
export function addPalillo(
  config: GuidedVisualConfig,
  moduleId: string,
  axis: GuidedSplitDirection,
  position = 0.5
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  const target = findNodeById(normalized.root, moduleId);
  if (!target || !isModuleNode(target)) {
    return normalized;
  }
  if (countPalilloSplits(target.palilloLayout) >= MAX_GUIDED_PALILLOS_PER_MODULE) {
    return normalized;
  }
  if (countPalilloCells(target.palilloLayout) >= 12) {
    return normalized;
  }

  const base = target.palilloLayout ?? createEmptyPalilloLayout();
  // Si ya hay árbol, divide la primera celda hoja; si no, la raíz.
  const cell =
    (isPalilloCell(base) ? base : null) ??
    calculateFirstCell(base);
  if (!cell) {
    return normalized;
  }
  const next = splitPalilloCell(base, cell.id, axis, position);
  const split = next ? findNewestSplit(next, base) : null;
  return updateModulePalilloLayout(
    normalized,
    moduleId,
    next,
    split?.id ?? null
  );
}

function calculateFirstCell(root: GuidedPalilloNode): GuidedPalilloCellNode | null {
  if (isPalilloCell(root)) {
    return root;
  }
  return calculateFirstCell(root.first) ?? calculateFirstCell(root.second);
}

export function addEqualPalillos(
  config: GuidedVisualConfig,
  moduleId: string,
  axis: GuidedSplitDirection,
  spaces: 2 | 3 | 4
): GuidedVisualConfig {
  const preset: GuidedPalilloPresetId =
    axis === "vertical"
      ? spaces === 2
        ? "v1"
        : spaces === 3
          ? "v3"
          : "v3"
      : spaces === 2
        ? "h1"
        : spaces === 3
          ? "h3"
          : "h3";
  if (spaces === 4 && axis === "vertical") {
    return applyPalilloPresetToModule(config, moduleId, "v3");
  }
  return applyPalilloPresetToModule(config, moduleId, preset);
}

export function updatePalilloPosition(
  config: GuidedVisualConfig,
  palilloId: string,
  position: number
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  for (const leaf of listLeafModules(normalized.root)) {
    if (!leaf.palilloLayout) {
      continue;
    }
    const node = findPalilloNodeById(leaf.palilloLayout, palilloId);
    if (node && isPalilloSplit(node)) {
      return updateModulePalilloSplitRatio(
        normalized,
        leaf.id,
        palilloId,
        position
      );
    }
  }
  return normalized;
}

export function removePalillo(
  config: GuidedVisualConfig,
  palilloId: string
): GuidedVisualConfig {
  const normalized = normalizeGuidedVisualConfig(config);
  for (const leaf of listLeafModules(normalized.root)) {
    if (!leaf.palilloLayout) {
      continue;
    }
    if (findPalilloNodeById(leaf.palilloLayout, palilloId)) {
      return removeModulePalilloSplit(normalized, leaf.id, palilloId);
    }
  }
  return normalized;
}

export function resetGuidedComposition(
  config: GuidedVisualConfig
): GuidedVisualConfig {
  return createDefaultGuidedVisualConfig({
    widthMm: config.widthMm,
    heightMm: config.heightMm,
  });
}

export function describeGuidedVisualConfig(config: GuidedVisualConfig): string {
  const normalized = normalizeGuidedVisualConfig(
    ensureGuidedVisualConfig(config)
  );
  const leaves = listLeafModules(normalized.root);
  const labels = leaves.map((leaf) => GUIDED_MODULE_TYPE_LABELS[leaf.type]);
  const frameNote =
    normalized.frameShape.kind === "arch_top"
      ? ` · Arco ${normalized.frameShape.archRiseMm} mm`
      : normalized.frameShape.kind === "rounded"
        ? ` · Marco redondeado ${normalized.frameShape.radiusMm} mm`
        : "";
  const roundedCount = leaves.filter((leaf) => leaf.glassShape.kind === "rounded").length;
  const glassNote =
    roundedCount > 0
      ? ` · ${roundedCount} vidrio${roundedCount === 1 ? "" : "s"} redondeado${roundedCount === 1 ? "" : "s"}`
      : "";
  if (leaves.length === 1) {
    return `1 módulo · ${labels[0]}${frameNote}${glassNote}`;
  }
  return `${leaves.length} módulos · ${labels.join(" + ")}${frameNote}${glassNote}`;
}

export function describeGuidedVisualShort(config: GuidedVisualConfig): string {
  const leaves = listLeafModules(normalizeGuidedVisualConfig(ensureGuidedVisualConfig(config)).root);
  return leaves.map((leaf) => GUIDED_MODULE_TYPE_LABELS[leaf.type]).join(" + ");
}

/** Base64 estándar → base64url (sin depender de encoding "base64url" de Buffer). */
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeUtf8ToBase64Url(value: string): string {
  // En browser el polyfill de Buffer a menudo existe pero NO soporta "base64url".
  // Usamos "base64" + conversión, o btoa como fallback.
  if (typeof Buffer !== "undefined") {
    return toBase64Url(Buffer.from(value, "utf8").toString("base64"));
  }

  return toBase64Url(btoa(unescape(encodeURIComponent(value))));
}

/** Serializa para bridge [gvc:...]. V2 usa JSON base64url. */
export function serializeGuidedVisualConfig(config: GuidedVisualConfig): string {
  const normalized = normalizeGuidedVisualConfig(ensureGuidedVisualConfig(config));
  const json = JSON.stringify({
    v: GUIDED_VISUAL_SCHEMA_VERSION,
    w: normalized.widthMm,
    h: normalized.heightMm,
    root: normalized.root,
    fs: normalized.frameShape,
  });
  return `${GUIDED_VISUAL_SCHEMA_VERSION}|${encodeUtf8ToBase64Url(json)}`;
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

function parseGuidedVisualConfigV1Pipe(raw: string): GuidedVisualConfig | null {
  const parts = raw.split("|");
  if (parts.length < 5) {
    return null;
  }
  const schemaVersion = Number(parts[0]);
  if (schemaVersion !== GUIDED_VISUAL_SCHEMA_VERSION_V1) {
    return null;
  }

  const axis: GuidedVisualAxis = parts[1] === "h" ? "horizontal" : "vertical";
  const widthMm = safeDimensionMm(Number(parts[2]), 1200);
  const heightMm = safeDimensionMm(Number(parts[3]), 1000);
  const moduleParts = parts.slice(4).join("|").split(",").filter(Boolean);

  const modules = moduleParts.map((entry, index) => {
    const [typeRaw, ratioRaw] = entry.split(":");
    return {
      id: createGuidedNodeId("m"),
      type: (isGuidedModuleType(typeRaw) ? typeRaw : "fijo") as GuidedModuleType,
      ratio: Number(ratioRaw) || 1,
    };
  });

  return migrateGuidedVisualConfigV1ToV2({
    schemaVersion: GUIDED_VISUAL_SCHEMA_VERSION_V1,
    axis,
    widthMm,
    heightMm,
    modules,
    selectedModuleId: modules[0]?.id ?? null,
  });
}

export function parseGuidedVisualConfig(
  value: string | null | undefined
): GuidedVisualConfig | null {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }

  // V1 pipe format
  if (raw.startsWith("1|")) {
    return parseGuidedVisualConfigV1Pipe(raw);
  }

  // V2 base64
  if (raw.startsWith("2|")) {
    try {
      const encoded = raw.slice(2);
      const json = decodeBase64Url(encoded);
      const data = JSON.parse(json) as {
        v?: number;
        w?: number;
        h?: number;
        root?: GuidedRegionNode;
        fs?: GuidedFrameShape;
      };
      if (data.v !== GUIDED_VISUAL_SCHEMA_VERSION || !data.root) {
        return null;
      }
      return normalizeGuidedVisualConfig({
        schemaVersion: GUIDED_VISUAL_SCHEMA_VERSION,
        widthMm: safeDimensionMm(data.w, 1200),
        heightMm: safeDimensionMm(data.h, 1000),
        root: data.root,
        selectedNodeId: listLeafModules(data.root)[0]?.id ?? null,
        selectedPalilloId: null,
        frameShape: data.fs ?? { kind: "rect" },
      });
    } catch {
      return null;
    }
  }

  // JSON crudo (config_json / tests)
  if (raw.startsWith("{")) {
    try {
      return ensureGuidedVisualConfig(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  return null;
}

/* ─── Compat V1 API (tests / callers antiguos) ─── */

export function normalizeGuidedModuleRatios(
  modules: GuidedVisualModule[]
): GuidedVisualModule[] {
  return modules.map((module, index) => ({
    ...module,
    id: module.id || createGuidedNodeId("m"),
    type: isGuidedModuleType(module.type) ? module.type : "fijo",
    ratio: Number.isFinite(module.ratio) && module.ratio > 0 ? module.ratio : 1,
  }));
}

export function getNormalizedGuidedRatios(modules: GuidedVisualModule[]) {
  const normalized = normalizeGuidedModuleRatios(modules);
  const total = normalized.reduce((sum, module) => sum + module.ratio, 0);
  return normalized.map((module) => module.ratio / Math.max(total, 1));
}

/** Compat: divide el módulo seleccionado (o la única hoja) en el eje dado. */
export function addGuidedDivision(
  config: GuidedVisualConfig | GuidedVisualConfigV1,
  type: GuidedModuleType = "fijo"
): GuidedVisualConfig {
  const v2 = ensureGuidedVisualConfig(config);
  const selectedNode = v2.selectedNodeId
    ? findNodeById(v2.root, v2.selectedNodeId)
    : null;
  const selected =
    selectedNode && isModuleNode(selectedNode)
      ? selectedNode.id
      : listLeafModules(v2.root)[0]?.id;

  if (!selected) {
    return v2;
  }

  const direction: GuidedSplitDirection =
    "axis" in config && (config as GuidedVisualConfigV1).axis === "horizontal"
      ? "horizontal"
      : "vertical";

  let next = splitModule(v2, selected, direction, 0.5);
  const leaves = listLeafModules(next.root);
  const last = leaves[leaves.length - 1];
  if (last && type !== "fijo") {
    next = updateModuleType(next, last.id, type);
  }
  return next;
}

export function removeGuidedModule(
  config: GuidedVisualConfig,
  moduleId: string
): GuidedVisualConfig {
  return mergeSiblingModules(config, moduleId);
}

export function updateGuidedModuleType(
  config: GuidedVisualConfig,
  moduleId: string,
  type: GuidedModuleType
): GuidedVisualConfig {
  return updateModuleType(config, moduleId, type);
}

export function updateGuidedModuleRatio(
  config: GuidedVisualConfig,
  moduleId: string,
  _ratio: number
): GuidedVisualConfig {
  // En V2 las proporciones viven en el split padre; no-op seguro.
  return selectGuidedNode(config, moduleId);
}

export function setGuidedVisualAxis(
  config: GuidedVisualConfig,
  _axis: GuidedVisualAxis
): GuidedVisualConfig {
  // El eje global ya no existe; se conserva la config.
  return normalizeGuidedVisualConfig(config);
}

export function selectGuidedModule(
  config: GuidedVisualConfig,
  moduleId: string | null
): GuidedVisualConfig {
  return selectGuidedNode(config, moduleId);
}
