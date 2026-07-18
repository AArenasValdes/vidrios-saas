/**
 * Árbol decorativo de palillos dentro de un módulo.
 * No crea módulos reales ni afecta pricing/materiales.
 */

export type GuidedSplitDirection = "vertical" | "horizontal";

export type GuidedFlatPalillo = {
  id: string;
  axis: GuidedSplitDirection;
  position: number;
};

export const MAX_GUIDED_PALILLO_SPLITS = 10;
export const MAX_GUIDED_PALILLO_CELLS = 12;
export const MAX_GUIDED_PALILLO_DEPTH = 5;
export const MIN_PALILLO_SPLIT_RATIO = 0.12;
export const MAX_PALILLO_SPLIT_RATIO = 0.88;

export type GuidedPalilloCellNode = {
  kind: "cell";
  id: string;
};

export type GuidedPalilloSplitNode = {
  kind: "split";
  id: string;
  direction: GuidedSplitDirection;
  ratio: number;
  first: GuidedPalilloNode;
  second: GuidedPalilloNode;
};

export type GuidedPalilloNode = GuidedPalilloCellNode | GuidedPalilloSplitNode;

export type GuidedPalilloRect = {
  id: string;
  kind: "cell" | "split";
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
  direction?: GuidedSplitDirection;
  ratio?: number;
  /** Coordenada del palillo en ratio (0–1) relativa al módulo. */
  dividerRatio?: number;
};

export type GuidedPalilloPresetId =
  | "none"
  | "v1"
  | "h1"
  | "cross"
  | "v3"
  | "h3"
  | "grid2x2"
  | "grid3x2"
  | "custom";

export const GUIDED_PALILLO_PRESET_LABELS: Record<GuidedPalilloPresetId, string> = {
  none: "Sin palillos",
  v1: "1 vertical",
  h1: "1 horizontal",
  cross: "Cruz",
  v3: "3 franjas verticales",
  h3: "3 franjas horizontales",
  grid2x2: "Retícula 2 × 2",
  grid3x2: "Retícula 3 × 2",
  custom: "Personalizado",
};

let palilloIdSeq = 0;

function createPalilloNodeId() {
  palilloIdSeq += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `p${palilloIdSeq}-${rand}`;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function clampPalilloRatio(ratio: number) {
  if (!Number.isFinite(ratio)) {
    return 0.5;
  }
  return clamp(ratio, MIN_PALILLO_SPLIT_RATIO, MAX_PALILLO_SPLIT_RATIO);
}

export function isPalilloCell(
  node: GuidedPalilloNode
): node is GuidedPalilloCellNode {
  return node.kind === "cell";
}

export function isPalilloSplit(
  node: GuidedPalilloNode
): node is GuidedPalilloSplitNode {
  return node.kind === "split";
}

export function createEmptyPalilloLayout(): GuidedPalilloCellNode {
  return { kind: "cell", id: createPalilloNodeId() };
}

export function createPalilloCell(): GuidedPalilloCellNode {
  return createEmptyPalilloLayout();
}

export function countPalilloSplits(node: GuidedPalilloNode | null): number {
  if (!node || isPalilloCell(node)) {
    return 0;
  }
  return 1 + countPalilloSplits(node.first) + countPalilloSplits(node.second);
}

export function countPalilloCells(node: GuidedPalilloNode | null): number {
  if (!node) {
    return 0;
  }
  if (isPalilloCell(node)) {
    return 1;
  }
  return countPalilloCells(node.first) + countPalilloCells(node.second);
}

export function palilloDepth(node: GuidedPalilloNode | null, depth = 0): number {
  if (!node || isPalilloCell(node)) {
    return depth;
  }
  return Math.max(
    palilloDepth(node.first, depth + 1),
    palilloDepth(node.second, depth + 1)
  );
}

export function findPalilloNodeById(
  node: GuidedPalilloNode | null,
  id: string
): GuidedPalilloNode | null {
  if (!node) {
    return null;
  }
  if (node.id === id) {
    return node;
  }
  if (isPalilloSplit(node)) {
    return (
      findPalilloNodeById(node.first, id) ?? findPalilloNodeById(node.second, id)
    );
  }
  return null;
}

export function findPalilloParentSplit(
  root: GuidedPalilloNode | null,
  childId: string
): GuidedPalilloSplitNode | null {
  if (!root || isPalilloCell(root)) {
    return null;
  }
  if (root.first.id === childId || root.second.id === childId) {
    return root;
  }
  return (
    findPalilloParentSplit(root.first, childId) ??
    findPalilloParentSplit(root.second, childId)
  );
}

function replacePalilloNode(
  root: GuidedPalilloNode,
  targetId: string,
  replacement: GuidedPalilloNode
): GuidedPalilloNode {
  if (root.id === targetId) {
    return replacement;
  }
  if (isPalilloCell(root)) {
    return root;
  }
  return {
    ...root,
    first: replacePalilloNode(root.first, targetId, replacement),
    second: replacePalilloNode(root.second, targetId, replacement),
  };
}

export function validatePalilloLayout(
  node: GuidedPalilloNode | null
): { ok: true; node: GuidedPalilloNode | null } | { ok: false; reason: string } {
  if (node == null) {
    return { ok: true, node: null };
  }
  try {
    const normalized = normalizePalilloLayout(node);
    if (countPalilloSplits(normalized) > MAX_GUIDED_PALILLO_SPLITS) {
      return { ok: false, reason: "too_many_splits" };
    }
    if (countPalilloCells(normalized) > MAX_GUIDED_PALILLO_CELLS) {
      return { ok: false, reason: "too_many_cells" };
    }
    if (palilloDepth(normalized) > MAX_GUIDED_PALILLO_DEPTH) {
      return { ok: false, reason: "too_deep" };
    }
    return { ok: true, node: normalized };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function normalizePalilloLayout(
  node: GuidedPalilloNode | null | undefined
): GuidedPalilloNode | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const walk = (n: GuidedPalilloNode, depth: number): GuidedPalilloNode => {
    if (!n || typeof n !== "object") {
      return createPalilloCell();
    }
    if (n.kind === "cell" || (!("kind" in n) && !("direction" in n))) {
      return {
        kind: "cell",
        id: typeof n.id === "string" && n.id ? n.id : createPalilloNodeId(),
      };
    }
    if (n.kind === "split" && depth < MAX_GUIDED_PALILLO_DEPTH) {
      const split = n as GuidedPalilloSplitNode;
      return {
        kind: "split",
        id: typeof split.id === "string" && split.id ? split.id : createPalilloNodeId(),
        direction: split.direction === "horizontal" ? "horizontal" : "vertical",
        ratio: clampPalilloRatio(Number(split.ratio)),
        first: walk(split.first ?? createPalilloCell(), depth + 1),
        second: walk(split.second ?? createPalilloCell(), depth + 1),
      };
    }
    return createPalilloCell();
  };

  const normalized = walk(node, 0);
  if (countPalilloSplits(normalized) === 0) {
    return null;
  }
  if (countPalilloSplits(normalized) > MAX_GUIDED_PALILLO_SPLITS) {
    return truncatePalilloSplits(normalized, MAX_GUIDED_PALILLO_SPLITS);
  }
  if (countPalilloCells(normalized) > MAX_GUIDED_PALILLO_CELLS) {
    return truncatePalilloCells(normalized, MAX_GUIDED_PALILLO_CELLS);
  }
  return normalized;
}

function truncatePalilloSplits(
  node: GuidedPalilloNode,
  maxSplits: number
): GuidedPalilloNode | null {
  if (countPalilloSplits(node) <= maxSplits) {
    return normalizePalilloLayout(node);
  }
  if (isPalilloCell(node)) {
    return null;
  }
  // Colapsa el segundo hijo si hace falta.
  const firstOnly = truncatePalilloSplits(node.first, maxSplits - 1);
  if (!firstOnly || isPalilloCell(firstOnly)) {
    return firstOnly;
  }
  return firstOnly;
}

function truncatePalilloCells(
  node: GuidedPalilloNode,
  maxCells: number
): GuidedPalilloNode | null {
  if (countPalilloCells(node) <= maxCells) {
    return node;
  }
  if (isPalilloCell(node)) {
    return node;
  }
  return truncatePalilloCells(node.first, maxCells);
}

export function splitPalilloCell(
  root: GuidedPalilloNode | null,
  cellId: string,
  direction: GuidedSplitDirection,
  ratio = 0.5
): GuidedPalilloNode | null {
  const base = root ?? createEmptyPalilloLayout();
  const target = findPalilloNodeById(base, cellId);
  if (!target || !isPalilloCell(target)) {
    return normalizePalilloLayout(base);
  }
  if (countPalilloSplits(base) >= MAX_GUIDED_PALILLO_SPLITS) {
    return normalizePalilloLayout(base);
  }
  if (countPalilloCells(base) >= MAX_GUIDED_PALILLO_CELLS) {
    return normalizePalilloLayout(base);
  }
  if (palilloDepth(base) >= MAX_GUIDED_PALILLO_DEPTH) {
    // Solo bloquea si la celda ya está en profundidad máxima.
    const depthOf = (node: GuidedPalilloNode, id: string, d = 0): number | null => {
      if (node.id === id) {
        return d;
      }
      if (isPalilloSplit(node)) {
        return depthOf(node.first, id, d + 1) ?? depthOf(node.second, id, d + 1);
      }
      return null;
    };
    if ((depthOf(base, cellId) ?? 0) >= MAX_GUIDED_PALILLO_DEPTH) {
      return normalizePalilloLayout(base);
    }
  }

  const replacement: GuidedPalilloSplitNode = {
    kind: "split",
    id: createPalilloNodeId(),
    direction: direction === "horizontal" ? "horizontal" : "vertical",
    ratio: clampPalilloRatio(ratio),
    first: createPalilloCell(),
    second: createPalilloCell(),
  };

  return normalizePalilloLayout(replacePalilloNode(base, cellId, replacement));
}

export function updatePalilloSplitRatio(
  root: GuidedPalilloNode | null,
  splitId: string,
  ratio: number
): GuidedPalilloNode | null {
  if (!root) {
    return null;
  }
  const target = findPalilloNodeById(root, splitId);
  if (!target || !isPalilloSplit(target)) {
    return normalizePalilloLayout(root);
  }
  return normalizePalilloLayout(
    replacePalilloNode(root, splitId, {
      ...target,
      ratio: clampPalilloRatio(ratio),
    })
  );
}

export function removePalilloSplit(
  root: GuidedPalilloNode | null,
  splitId: string,
  keep: "first" | "second" = "first"
): GuidedPalilloNode | null {
  if (!root) {
    return null;
  }
  if (root.id === splitId && isPalilloSplit(root)) {
    return normalizePalilloLayout(keep === "first" ? root.first : root.second);
  }

  const walk = (node: GuidedPalilloNode): GuidedPalilloNode => {
    if (isPalilloCell(node)) {
      return node;
    }
    if (node.first.id === splitId && isPalilloSplit(node.first)) {
      return {
        ...node,
        first: keep === "first" ? node.first.first : node.first.second,
      };
    }
    if (node.second.id === splitId && isPalilloSplit(node.second)) {
      return {
        ...node,
        second: keep === "first" ? node.second.first : node.second.second,
      };
    }
    return {
      ...node,
      first: walk(node.first),
      second: walk(node.second),
    };
  };

  return normalizePalilloLayout(walk(root));
}

export function mergePalilloCells(
  root: GuidedPalilloNode | null,
  cellId: string
): GuidedPalilloNode | null {
  if (!root) {
    return null;
  }
  const parent = findPalilloParentSplit(root, cellId);
  if (!parent) {
    return normalizePalilloLayout(root);
  }
  return removePalilloSplit(root, parent.id, parent.first.id === cellId ? "second" : "first");
}

export function equalizeSiblingPalilloCells(
  root: GuidedPalilloNode | null,
  nodeId: string
): GuidedPalilloNode | null {
  if (!root) {
    return null;
  }
  const node = findPalilloNodeById(root, nodeId);
  if (node && isPalilloSplit(node)) {
    return updatePalilloSplitRatio(root, node.id, 0.5);
  }
  const parent = findPalilloParentSplit(root, nodeId);
  if (!parent) {
    return normalizePalilloLayout(root);
  }
  return updatePalilloSplitRatio(root, parent.id, 0.5);
}

export function calculatePalilloRects(
  root: GuidedPalilloNode | null,
  bounds = { xRatio: 0, yRatio: 0, wRatio: 1, hRatio: 1 }
): GuidedPalilloRect[] {
  if (!root) {
    return [];
  }

  const out: GuidedPalilloRect[] = [];

  const walk = (
    node: GuidedPalilloNode,
    xRatio: number,
    yRatio: number,
    wRatio: number,
    hRatio: number
  ) => {
    if (isPalilloCell(node)) {
      out.push({
        id: node.id,
        kind: "cell",
        xRatio,
        yRatio,
        wRatio,
        hRatio,
      });
      return;
    }

    const ratio = clampPalilloRatio(node.ratio);
    out.push({
      id: node.id,
      kind: "split",
      xRatio,
      yRatio,
      wRatio,
      hRatio,
      direction: node.direction,
      ratio,
      dividerRatio:
        node.direction === "vertical" ? xRatio + wRatio * ratio : yRatio + hRatio * ratio,
    });

    if (node.direction === "vertical") {
      const firstW = wRatio * ratio;
      const secondW = wRatio - firstW;
      walk(node.first, xRatio, yRatio, firstW, hRatio);
      walk(node.second, xRatio + firstW, yRatio, secondW, hRatio);
      return;
    }

    const firstH = hRatio * ratio;
    const secondH = hRatio - firstH;
    walk(node.first, xRatio, yRatio, wRatio, firstH);
    walk(node.second, xRatio, yRatio + firstH, wRatio, secondH);
  };

  walk(root, bounds.xRatio, bounds.yRatio, bounds.wRatio, bounds.hRatio);
  return out;
}

/** Convierte lista plana legacy a árbol equivalente (líneas de módulo completo). */
export function migrateFlatPalillosToLayout(
  palillos: GuidedFlatPalillo[] | null | undefined
): GuidedPalilloNode | null {
  if (!Array.isArray(palillos) || palillos.length === 0) {
    return null;
  }

  const verticals = [
    ...new Set(
      palillos
        .filter((p) => p.axis === "vertical")
        .map((p) => clampPalilloRatio(p.position))
        .sort((a, b) => a - b)
    ),
  ];
  const horizontals = [
    ...new Set(
      palillos
        .filter((p) => p.axis === "horizontal")
        .map((p) => clampPalilloRatio(p.position))
        .sort((a, b) => a - b)
    ),
  ];

  let layout: GuidedPalilloNode | null = null;

  if (verticals.length > 0) {
    layout = positionsToSplitTree("vertical", verticals);
  }

  if (horizontals.length > 0) {
    if (!layout) {
      layout = positionsToSplitTree("horizontal", horizontals);
    } else {
      layout = applyDirectionToAllLeaves(layout, "horizontal", horizontals);
    }
  }

  return normalizePalilloLayout(layout);
}

function positionsToSplitTree(
  direction: GuidedSplitDirection,
  positions: number[]
): GuidedPalilloNode {
  const bounds = [0, ...positions.map(clampPalilloRatio), 1];
  const unique = bounds.filter((value, index, arr) => index === 0 || value > arr[index - 1] + 1e-6);
  return rangeToTree(direction, unique, 0, unique.length - 1);
}

function rangeToTree(
  direction: GuidedSplitDirection,
  bounds: number[],
  start: number,
  end: number
): GuidedPalilloNode {
  if (end - start <= 1) {
    return createPalilloCell();
  }
  // Balancea cerca del centro del rango.
  const mid = Math.floor((start + end) / 2);
  const splitAt = mid === start ? start + 1 : mid;
  const leftSpan = bounds[splitAt] - bounds[start];
  const totalSpan = bounds[end] - bounds[start];
  const ratio = clampPalilloRatio(leftSpan / Math.max(totalSpan, 1e-6));
  return {
    kind: "split",
    id: createPalilloNodeId(),
    direction,
    ratio,
    first: rangeToTree(direction, bounds, start, splitAt),
    second: rangeToTree(direction, bounds, splitAt, end),
  };
}

function applyDirectionToAllLeaves(
  root: GuidedPalilloNode,
  direction: GuidedSplitDirection,
  positions: number[]
): GuidedPalilloNode {
  if (isPalilloCell(root)) {
    return positionsToSplitTree(direction, positions);
  }
  return {
    ...root,
    first: applyDirectionToAllLeaves(root.first, direction, positions),
    second: applyDirectionToAllLeaves(root.second, direction, positions),
  };
}

/** Proyecta el árbol a lista plana de líneas completas (compat / bridge). */
export function flattenPalilloLayoutToLines(
  root: GuidedPalilloNode | null
): GuidedFlatPalillo[] {
  if (!root) {
    return [];
  }
  const rects = calculatePalilloRects(root);
  const lines: GuidedFlatPalillo[] = [];

  for (const rect of rects) {
    if (rect.kind !== "split" || rect.dividerRatio == null || !rect.direction) {
      continue;
    }
    // Solo exporta palillos que atraviesan casi todo el módulo (compat legacy).
    const spansFull =
      rect.direction === "vertical"
        ? rect.hRatio > 0.98 && rect.yRatio < 0.02
        : rect.wRatio > 0.98 && rect.xRatio < 0.02;
    if (!spansFull) {
      // También exporta parciales como líneas en su eje (posición del divider).
      lines.push({
        id: rect.id,
        axis: rect.direction,
        position: clampPalilloRatio(rect.dividerRatio),
      });
      continue;
    }
    lines.push({
      id: rect.id,
      axis: rect.direction,
      position: clampPalilloRatio(rect.dividerRatio),
    });
  }

  return lines.slice(0, MAX_GUIDED_PALILLO_SPLITS);
}

export function buildPalilloPreset(
  preset: GuidedPalilloPresetId
): GuidedPalilloNode | null {
  switch (preset) {
    case "none":
      return null;
    case "v1":
      return positionsToSplitTree("vertical", [0.5]);
    case "h1":
      return positionsToSplitTree("horizontal", [0.5]);
    case "cross":
    case "grid2x2": {
      const base = positionsToSplitTree("vertical", [0.5]);
      return normalizePalilloLayout(
        applyDirectionToAllLeaves(base, "horizontal", [0.5])
      );
    }
    case "v3":
      return positionsToSplitTree("vertical", [1 / 3, 2 / 3]);
    case "h3":
      return positionsToSplitTree("horizontal", [1 / 3, 2 / 3]);
    case "grid3x2": {
      const base = positionsToSplitTree("vertical", [1 / 3, 2 / 3]);
      return normalizePalilloLayout(
        applyDirectionToAllLeaves(base, "horizontal", [0.5])
      );
    }
    case "custom":
      return createEmptyPalilloLayout();
    default:
      return null;
  }
}

export function describePalilloSplit(
  split: GuidedPalilloSplitNode,
  moduleWidthMm: number,
  moduleHeightMm: number
): { title: string; measureLabel: string; percentLabel: string } {
  if (split.direction === "vertical") {
    const mm = Math.round(moduleWidthMm * clampPalilloRatio(split.ratio));
    return {
      title: "Palillo vertical",
      measureLabel: `${mm} mm desde la izquierda`,
      percentLabel: `${Math.round(clampPalilloRatio(split.ratio) * 100)}%`,
    };
  }
  const mm = Math.round(moduleHeightMm * clampPalilloRatio(split.ratio));
  return {
    title: "Palillo horizontal",
    measureLabel: `${mm} mm desde arriba`,
    percentLabel: `${Math.round(clampPalilloRatio(split.ratio) * 100)}%`,
  };
}
