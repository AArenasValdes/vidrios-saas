import type {
  GlassCutTreeNode,
  GlassCuttingOptimizationInput,
  GlassCuttingProfile,
  GlassCuttingResult,
  GlassPanePlanningUnit,
  GlassPlannedPane,
  GlassPlannedRemnant,
  GlassRect,
  GlassSheetPlan,
} from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import { verifyGlassSheetPlans } from "@/features/fabricacion/services/glass-sheet-plan-verifier.service";

type Unit = GlassPanePlanningUnit & { paneUnitId: string; widthMm: number; heightMm: number };
type InternalTree = GlassCutTreeNode;
type RectMemo = Map<string, InternalTree | null>;
type CutAxis = "x" | "y";

const DEFAULT_SEARCH_NODE_LIMIT = 45_000;
// The exact partition search grows exponentially; larger lots use the verified constructor first.
const MAX_EXACT_UNITS = 8;
// Bound the physical-unit expansion before allocating unit IDs or search state.
const MAX_PHYSICAL_UNITS = 2_000;
const positiveInt = (value: number | null | undefined): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const nonNegativeInt = (value: number) => Number.isSafeInteger(value) && value >= 0;
const rectArea = (rect: GlassRect) => rect.widthMm * rect.heightMm;

function fnv1aFingerprint(value: unknown): string {
  const serialized = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `glass-plan-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function technicalKey(pane: GlassPanePlanningUnit, profile: GlassCuttingProfile): string {
  return [
    String(pane.organizationId), pane.productId, pane.technicalSpec?.thicknessMm,
    pane.technicalSpec?.category, pane.finishOrientationKey, profile.sheet.widthMm,
    profile.sheet.heightMm, profile.sheet.orientation,
  ].join("|");
}

function profileKey(profile: GlassCuttingProfile): string {
  return [
    profile.productId, profile.thicknessMm, profile.category, profile.finishOrientationKey,
    profile.sheet.widthMm, profile.sheet.heightMm, profile.sheet.orientation,
  ].join("|");
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function expandUnits(panes: readonly GlassPanePlanningUnit[]): Unit[] {
  return panes.flatMap((pane) => pane.paneUnitIds.map((paneUnitId) => ({
    ...pane,
    paneUnitId,
    widthMm: pane.widthMm ?? 0,
    heightMm: pane.heightMm ?? 0,
  }))).sort((a, b) =>
    compareText(a.paneUnitId, b.paneUnitId)
    || compareText(String(a.quoteId), String(b.quoteId))
    || compareText(a.quoteItemId, b.quoteItemId)
  );
}

function validationErrors(panes: readonly GlassPanePlanningUnit[], profile: GlassCuttingProfile, mode: "workshop" | "geometric_preview"): string[] {
  const errors: string[] = [];
  if (!positiveInt(profile.sheet.widthMm) || !positiveInt(profile.sheet.heightMm)) errors.push("Formato de plancha inválido.");
  if (mode === "workshop" && (profile.sheet.orientation === "unknown" || profile.sheet.source === "unknown")) errors.push("La orientación o fuente del formato de plancha requiere confirmación.");
  if (!positiveInt(profile.thicknessMm)) errors.push("Espesor de plancha inválido.");
  if (!nonNegativeInt(profile.process.edgeTrimMm.top) || !nonNegativeInt(profile.process.edgeTrimMm.right)
    || !nonNegativeInt(profile.process.edgeTrimMm.bottom) || !nonNegativeInt(profile.process.edgeTrimMm.left)) {
    errors.push("Los despuntes configurados deben ser milímetros enteros no negativos.");
  }
  if (!nonNegativeInt(profile.process.kerfOrSeparationMm)) errors.push("La separación configurada debe ser un entero no negativo.");
  if (!nonNegativeInt(profile.process.minimumStripWidthMm)) errors.push("El ancho mínimo de tira debe ser un entero no negativo.");
  if (profile.purchaseCost && (!Number.isFinite(profile.purchaseCost.amount) || profile.purchaseCost.amount < 0 || !profile.purchaseCost.currency.trim())) {
    errors.push("El costo de compra no tiene monto válido o moneda identificada.");
  }
  if (mode === "workshop" && (!positiveInt(profile.process.tableWidthMm) || !positiveInt(profile.process.tableHeightMm))) errors.push("Faltan dimensiones válidas de la mesa de trabajo.");
  if (mode === "workshop" && (!positiveInt(profile.process.reusableRemnant.minimumWidthMm) || !positiveInt(profile.process.reusableRemnant.minimumHeightMm))) {
    errors.push("Faltan dimensiones válidas para clasificar retazos reutilizables.");
  }
  if (mode === "workshop" && (!profile.process.supportedOperations.includes("straight_cut") || !profile.process.supportedOperations.includes("quiebre"))) {
    errors.push("El perfil no confirma rayado recto y quiebre para este proceso.");
  }
  const usableWidth = profile.sheet.widthMm - profile.process.edgeTrimMm.left - profile.process.edgeTrimMm.right;
  const usableHeight = profile.sheet.heightMm - profile.process.edgeTrimMm.top - profile.process.edgeTrimMm.bottom;
  if (!positiveInt(usableWidth) || !positiveInt(usableHeight)) errors.push("Los despuntes consumen toda la superficie de la plancha.");
  if (mode === "workshop" && positiveInt(profile.process.tableWidthMm) && positiveInt(profile.process.tableHeightMm)) {
    const fitsTable = profile.sheet.widthMm <= profile.process.tableWidthMm && profile.sheet.heightMm <= profile.process.tableHeightMm;
    const rotatesToFit = profile.sheet.orientation === "rotatable"
      && profile.sheet.heightMm <= profile.process.tableWidthMm && profile.sheet.widthMm <= profile.process.tableHeightMm;
    if (!fitsTable && !rotatesToFit) errors.push("La plancha completa supera las dimensiones de mesa configuradas.");
  }
  if (profile.process.workshopValidation === "requires_review") errors.push("Las restricciones del taller requieren revisión antes de planificar.");

  panes.forEach((pane) => {
    const spec = pane.technicalSpec;
    if (mode === "workshop" && pane.validationStatus !== "eligible_for_manual_planning") errors.push(...pane.warnings, `El paño ${pane.paneId} requiere revisión técnica.`);
    if (pane.recipeStatus !== "validated") errors.push(`La receta del paño ${pane.paneId} no está validada.`);
    if (pane.dimensionProvenance === "legacy_snapshot") errors.push(`El paño ${pane.paneId} proviene de un snapshot histórico incompleto.`);
    if (!pane.logicalComponentId || !pane.glassId || !pane.productId || !spec) errors.push(`El paño ${pane.paneId} carece de identidad o especificación congelada.`);
    if (!positiveInt(pane.widthMm) || !positiveInt(pane.heightMm)) errors.push(`El paño ${pane.paneId} tiene dimensiones inválidas.`);
    else if (!Number.isSafeInteger(pane.widthMm * pane.heightMm)) errors.push(`El área del paño ${pane.paneId} excede el rango entero seguro.`);
    if (spec && (spec.hasConflict || (mode === "workshop" && (spec.manualCutStatus !== "confirmed" || !spec.technicalReviewConfirmed && ["laminado", "dvh", "templado", "espejo", "otro"].includes(spec.category))) || (mode === "geometric_preview" && spec.manualCutStatus === "not_admitted"))) {
      errors.push(`El vidrio del paño ${pane.paneId} no tiene especificación compatible para esta modalidad.`);
    }
    if (spec && (spec.productId !== profile.productId || spec.thicknessMm !== profile.thicknessMm
      || spec.category !== profile.category || (mode === "workshop" && (spec.sheetWidthMm !== profile.sheet.widthMm
      || spec.sheetHeightMm !== profile.sheet.heightMm)) || pane.finishOrientationKey !== profile.finishOrientationKey)) {
      errors.push(`El perfil técnico de plancha no es compatible con el paño ${pane.paneId}.`);
    }
    if (spec && (!profile.process.supportedCategories.includes(spec.category)
      || !profile.process.supportedThicknessesMm.includes(profile.thicknessMm))) {
      errors.push(`Categoría o espesor no admitidos por el proceso para ${pane.paneId}.`);
    }
    if (pane.paneUnitIds.length !== pane.quantity || new Set(pane.paneUnitIds).size !== pane.paneUnitIds.length) {
      errors.push(`La cantidad o las identidades físicas no coinciden en ${pane.paneId}.`);
    }
    if (mode === "workshop" && pane.orientation === "unknown") errors.push(`La orientación del vidrio ${pane.paneId} está pendiente.`);
  });
  const ids = panes.flatMap((pane) => pane.paneUnitIds);
  if (new Set(ids).size !== ids.length) errors.push("Las identidades de unidades físicas están duplicadas entre paños.");
  return [...new Set(errors)];
}

function orientations(unit: Unit): Array<{ widthMm: number; heightMm: number; rotated: boolean }> {
  const rows = [{ widthMm: unit.widthMm, heightMm: unit.heightMm, rotated: false }];
  if (unit.orientation === "rotatable" && unit.widthMm !== unit.heightMm) {
    rows.push({ widthMm: unit.heightMm, heightMm: unit.widthMm, rotated: true });
  }
  return rows;
}

function popcount(mask: bigint): number {
  let value = mask;
  let count = 0;
  while (value > BigInt(0)) {
    value &= value - BigInt(1);
    count += 1;
  }
  return count;
}

function smallestBit(mask: bigint): bigint {
  return mask & -mask;
}

function maskIndexes(mask: bigint, units: readonly Unit[]): number[] {
  const result: number[] = [];
  for (let index = 0; index < units.length; index += 1) {
    if ((mask & (BigInt(1) << BigInt(index))) !== BigInt(0)) result.push(index);
  }
  return result;
}

function rectKey(rect: GlassRect, mask: bigint): string {
  return `${rect.widthMm},${rect.heightMm}|${mask.toString()}`;
}

function translateTree(node: InternalTree, xDelta: number, yDelta: number): InternalTree {
  const rect = { ...node.rect, xMm: node.rect.xMm + xDelta, yMm: node.rect.yMm + yDelta };
  if (node.kind === "cut") return {
    ...node,
    rect,
    children: [translateTree(node.children[0], xDelta, yDelta), translateTree(node.children[1], xDelta, yDelta)],
  };
  return { ...node, rect };
}

function minimumStripValid(rect: GlassRect, profile: GlassCuttingProfile): boolean {
  return rect.widthMm >= profile.process.minimumStripWidthMm && rect.heightMm >= profile.process.minimumStripWidthMm;
}

function maskFitsRect(mask: bigint, rect: GlassRect, units: readonly Unit[]): boolean {
  return maskIndexes(mask, units).every((index) => orientations(units[index]!).some((orientation) =>
    orientation.widthMm <= rect.widthMm && orientation.heightMm <= rect.heightMm
  ));
}

function treeForSinglePane(input: {
  unit: Unit;
  rect: GlassRect;
  profile: GlassCuttingProfile;
  path: string;
}): InternalTree | null {
  const { unit, rect, profile, path } = input;
  const gap = profile.process.kerfOrSeparationMm;
  const candidates: InternalTree[] = [];
  for (const orientation of orientations(unit)) {
    if (orientation.widthMm > rect.widthMm || orientation.heightMm > rect.heightMm) continue;
    const makeRemnant = (nodeId: string, remnantRect: GlassRect): InternalTree | null => {
      if (remnantRect.widthMm <= 0 || remnantRect.heightMm <= 0) return null;
      return minimumStripValid(remnantRect, profile)
        ? { kind: "remnant", nodeId, rect: remnantRect }
        : null;
    };
    const paneLeaf: InternalTree = {
      kind: "pane", nodeId: `${path}.pane.${unit.paneUnitId}`, rect: { ...rect, widthMm: orientation.widthMm, heightMm: orientation.heightMm },
      paneUnitId: unit.paneUnitId, rotated: orientation.rotated,
    };
    const rightWidth = rect.widthMm - orientation.widthMm;
    const bottomHeight = rect.heightMm - orientation.heightMm;
    const verticalFirst: InternalTree | null = (() => {
      if (rightWidth === 0 && bottomHeight === 0) return paneLeaf;
      if (rightWidth > 0 && gap >= rightWidth) return null;
      if (bottomHeight > 0 && gap >= bottomHeight) return null;
      if (rightWidth === 0) {
        const remnantRect = { ...rect, yMm: rect.yMm + orientation.heightMm + gap, heightMm: bottomHeight - gap };
        const remnant = makeRemnant(`${path}.bottom.${unit.paneUnitId}`, remnantRect);
        if (!remnant) return null;
        return { kind: "cut", nodeId: `${path}.cut-y.${unit.paneUnitId}`, rect, axis: "y", offsetMm: orientation.heightMm, separationMm: gap, children: [paneLeaf, remnant] };
      }
      const rightRect = { ...rect, xMm: rect.xMm + orientation.widthMm + gap, widthMm: rightWidth - gap };
      const rightRemnant = makeRemnant(`${path}.right.${unit.paneUnitId}`, rightRect);
      if (!rightRemnant) return null;
      if (bottomHeight === 0) {
        return { kind: "cut", nodeId: `${path}.cut-x.${unit.paneUnitId}`, rect, axis: "x", offsetMm: orientation.widthMm, separationMm: gap, children: [paneLeaf, rightRemnant] };
      }
      const bottomRect = { ...rect, yMm: rect.yMm + orientation.heightMm + gap, heightMm: bottomHeight - gap, widthMm: orientation.widthMm };
      const bottomRemnant = makeRemnant(`${path}.bottom.${unit.paneUnitId}`, bottomRect);
      if (!bottomRemnant) return null;
      const leftStrip: InternalTree = {
        kind: "cut", nodeId: `${path}.cut-y.${unit.paneUnitId}`,
        rect: { ...rect, widthMm: orientation.widthMm }, axis: "y", offsetMm: orientation.heightMm,
        separationMm: gap, children: [paneLeaf, bottomRemnant],
      };
      return { kind: "cut", nodeId: `${path}.cut-x.${unit.paneUnitId}`, rect, axis: "x", offsetMm: orientation.widthMm, separationMm: gap, children: [leftStrip, rightRemnant] };
    })();
    if (verticalFirst) candidates.push(verticalFirst);

    // Alternate horizontal-first tree; it can leave a wider, more reusable offcut.
    if (rightWidth > 0 && gap >= rightWidth) continue;
    if (bottomHeight > 0 && gap >= bottomHeight) continue;
    if (bottomHeight === 0 && rightWidth === 0) {
      candidates.push(paneLeaf);
      continue;
    }
    if (bottomHeight === 0) {
      const rightRect = { ...rect, xMm: rect.xMm + orientation.widthMm + gap, widthMm: rightWidth - gap };
      const remnant = makeRemnant(`${path}.right-h.${unit.paneUnitId}`, rightRect);
      if (remnant) candidates.push({ kind: "cut", nodeId: `${path}.cut-x-h.${unit.paneUnitId}`, rect, axis: "x", offsetMm: orientation.widthMm, separationMm: gap, children: [paneLeaf, remnant] });
    } else {
      const bottomRect = { ...rect, yMm: rect.yMm + orientation.heightMm + gap, heightMm: bottomHeight - gap };
      const bottomRemnant = makeRemnant(`${path}.bottom-h.${unit.paneUnitId}`, bottomRect);
      if (!bottomRemnant) continue;
      if (rightWidth === 0) {
        candidates.push({ kind: "cut", nodeId: `${path}.cut-y-h.${unit.paneUnitId}`, rect, axis: "y", offsetMm: orientation.heightMm, separationMm: gap, children: [paneLeaf, bottomRemnant] });
        continue;
      }
      const rightRect = { ...rect, xMm: rect.xMm + orientation.widthMm + gap, widthMm: rightWidth - gap, heightMm: orientation.heightMm };
      const rightRemnant = makeRemnant(`${path}.right-h.${unit.paneUnitId}`, rightRect);
      if (!rightRemnant) continue;
      const topStrip: InternalTree = {
        kind: "cut", nodeId: `${path}.cut-x-h.${unit.paneUnitId}`,
        rect: { ...rect, heightMm: orientation.heightMm }, axis: "x", offsetMm: orientation.widthMm,
        separationMm: gap, children: [paneLeaf, rightRemnant],
      };
      candidates.push({ kind: "cut", nodeId: `${path}.cut-y-h.${unit.paneUnitId}`, rect, axis: "y", offsetMm: orientation.heightMm, separationMm: gap, children: [topStrip, bottomRemnant] });
    }
  }
  const score = (tree: InternalTree) => {
    const remnants = remnantLeaves(tree).map((row) => row.rect);
    return [
      remnants.reduce((sum, remnant) => sum + rectArea(remnant), 0),
      remnants.reduce((largest, remnant) => Math.max(largest, rectArea(remnant)), 0),
      -remnants.length,
      tree.kind === "cut" ? -tree.offsetMm : 0,
    ];
  };
  candidates.sort((a, b) => {
    const left = score(a);
    const right = score(b);
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return right[index]! - left[index]!;
    }
    return compareText(a.nodeId, b.nodeId);
  });
  return candidates[0] ?? null;
}

function candidateCuts(axis: CutAxis, rect: GlassRect, mask: bigint, units: readonly Unit[], gap: number): number[] {
  const extent = axis === "x" ? rect.widthMm : rect.heightMm;
  const indexes = maskIndexes(mask, units);
  let sums = new Set<number>([0]);
  indexes.forEach((index) => {
    const next = new Set(sums);
    for (const sum of sums) {
      for (const orientation of orientations(units[index]!)) {
        const size = axis === "x" ? orientation.widthMm : orientation.heightMm;
        const candidate = sum + size + (sum === 0 ? 0 : gap);
        if (candidate > 0 && candidate < extent - gap) next.add(candidate);
      }
    }
    sums = next;
  });
  return [...sums].filter((value) => value > 0 && value < extent - gap).sort((a, b) => a - b);
}

function sortedSubmasks(mask: bigint, anchor: bigint): bigint[] {
  const result: bigint[] = [];
  for (let sub = mask; sub > BigInt(0); sub = (sub - BigInt(1)) & mask) {
    if (sub === mask || (sub & anchor) === BigInt(0)) continue;
    result.push(sub);
  }
  return result.sort((a, b) => popcount(b) - popcount(a) || compareText(a.toString(), b.toString()));
}

function remnantLeaves(node: InternalTree): Array<{ nodeId: string; rect: GlassRect }> {
  if (node.kind === "remnant") return [{ nodeId: node.nodeId, rect: node.rect }];
  if (node.kind === "pane") return [];
  return [...remnantLeaves(node.children[0]), ...remnantLeaves(node.children[1])];
}

function replaceRemnant(node: InternalTree, targetId: string, replacement: InternalTree): InternalTree {
  if (node.nodeId === targetId && node.kind === "remnant") return replacement;
  if (node.kind !== "cut") return node;
  return { ...node, children: [replaceRemnant(node.children[0], targetId, replacement), replaceRemnant(node.children[1], targetId, replacement)] };
}

/** Deterministic guillotine best-fit decreasing constructor; every resulting tree is independently verified. */
function constructGuillotinePlan(units: readonly Unit[], profile: GlassCuttingProfile): InternalTree[] | null {
  const remaining = [...units].sort((a, b) =>
    Math.max(b.widthMm, b.heightMm) - Math.max(a.widthMm, a.heightMm)
    || b.widthMm * b.heightMm - a.widthMm * a.heightMm
    || compareText(a.paneUnitId, b.paneUnitId)
  );
  const roots: InternalTree[] = [];
  const usable = usableRect(profile);
  for (let unitIndex = 0; unitIndex < remaining.length; unitIndex += 1) {
    const unit = remaining[unitIndex]!;
    const candidates: Array<{ sheetIndex: number; leafId: string; tree: InternalTree; score: number[] }> = [];
    roots.forEach((root, sheetIndex) => remnantLeaves(root).forEach((leaf) => {
      const tree = treeForSinglePane({ unit, rect: leaf.rect, profile, path: `h${sheetIndex}.${unit.paneUnitId}.${leaf.nodeId}` });
      if (!tree) return;
      const remnants = remnantLeaves(tree).map((row) => row.rect);
      const reusableArea = remnants.reduce((sum, rect) => sum + rectArea(rect), 0);
      const largestRemnant = remnants.reduce((largest, rect) => Math.max(largest, rectArea(rect)), 0);
      const fragments = remnants.length;
      // Best-fit first; prefer fewer fragments and preserve the largest reusable offcut.
      candidates.push({ sheetIndex, leafId: leaf.nodeId, tree, score: [rectArea(leaf.rect) - unit.widthMm * unit.heightMm, fragments, -largestRemnant, -reusableArea] });
    }));
    candidates.sort((a, b) => {
      for (let i = 0; i < a.score.length; i += 1) if (a.score[i] !== b.score[i]) return a.score[i]! - b.score[i]!;
      return a.sheetIndex - b.sheetIndex || compareText(a.leafId, b.leafId);
    });
    const chosen = candidates[0];
    if (chosen) {
      roots[chosen.sheetIndex] = replaceRemnant(roots[chosen.sheetIndex]!, chosen.leafId, chosen.tree);
      continue;
    }
    const tree = treeForSinglePane({ unit, rect: usable, profile, path: `h${roots.length}.${unit.paneUnitId}` });
    if (!tree) return null;
    roots.push(tree);
  }
  return roots;
}

/** Fast constructive proof for identical panels: a real guillotine grid, not an area estimate. */
function identicalGridPlan(units: readonly Unit[], profile: GlassCuttingProfile): InternalTree | null {
  if (units.length < 2 || units.some((unit) => unit.widthMm !== units[0]!.widthMm || unit.heightMm !== units[0]!.heightMm
    || unit.orientation !== units[0]!.orientation)) return null;
  const usable = usableRect(profile);
  const gap = profile.process.kerfOrSeparationMm;
  const candidates = orientations(units[0]!);
  for (const orientation of candidates) {
    let paneIndex = 0;
    let rowIndex = 0;
    const columns = Math.floor((usable.widthMm + gap) / (orientation.widthMm + gap));
    const rows = Math.floor((usable.heightMm + gap) / (orientation.heightMm + gap));
    if (columns < 1 || rows < 1 || columns * rows < units.length) continue;
    const rightWidth = usable.widthMm - columns * (orientation.widthMm + gap);
    const usedRows = Math.ceil(units.length / columns);
    const bottomHeight = usable.heightMm - usedRows * (orientation.heightMm + gap);
    if ((rightWidth > 0 && rightWidth < profile.process.minimumStripWidthMm)
      || (bottomHeight > 0 && bottomHeight < profile.process.minimumStripWidthMm)) continue;

    const buildRows = (rect: GlassRect): InternalTree | null => {
      if (paneIndex >= units.length) return { kind: "remnant", nodeId: `grid-remnant-${rowIndex}`, rect };
      const rowHeight = orientation.heightMm;
      const rowBottomHeight = rect.heightMm - rowHeight - gap;
      if (rowBottomHeight < 0 || (rowBottomHeight > 0 && rowBottomHeight < profile.process.minimumStripWidthMm)) return null;
      const thisRow = rowIndex++;
      const rowRect = { ...rect, heightMm: rowHeight };
      const countInRow = Math.min(columns, units.length - paneIndex);
      const buildColumns = (columnRect: GlassRect, remainingInRow: number, columnIndex: number): InternalTree | null => {
        if (remainingInRow === 0) {
          const width = columnRect.widthMm;
          if (width <= 0) return null;
          if (width < profile.process.minimumStripWidthMm) return null;
          return { kind: "remnant", nodeId: `grid-right-${thisRow}-${columnIndex}`, rect: columnRect };
        }
        const unit = units[paneIndex++]!;
        const paneRect = { ...columnRect, widthMm: orientation.widthMm, heightMm: orientation.heightMm };
        const paneLeaf: InternalTree = { kind: "pane", nodeId: `grid-pane-${unit.paneUnitId}`, rect: paneRect, paneUnitId: unit.paneUnitId, rotated: orientation.rotated };
        const rightWidth = columnRect.widthMm - orientation.widthMm - gap;
        const first: InternalTree = paneLeaf;
        if (rightWidth < 0 || (rightWidth > 0 && rightWidth < profile.process.minimumStripWidthMm)) return null;
        if (rightWidth === 0) {
          if (remainingInRow !== 1) return null;
          return paneLeaf;
        }
        const rightRect = { ...columnRect, xMm: columnRect.xMm + orientation.widthMm + gap, widthMm: rightWidth };
        const rest = buildColumns(rightRect, remainingInRow - 1, columnIndex + 1);
        if (!rest) return null;
        return { kind: "cut", nodeId: `grid-x-${thisRow}-${columnIndex}`, rect: columnRect, axis: "x", offsetMm: orientation.widthMm, separationMm: gap, children: [first, rest] };
      };
      const rowTree = buildColumns(rowRect, countInRow, 0);
      if (!rowTree) return null;
      paneIndex = Math.max(paneIndex, thisRow * columns + countInRow);
      if (rowBottomHeight === 0) return rowTree;
      const bottomRect = { ...rect, yMm: rect.yMm + rowHeight + gap, heightMm: rowBottomHeight };
      const bottom = buildRows(bottomRect);
      if (!bottom) return null;
      return { kind: "cut", nodeId: `grid-y-${thisRow}`, rect, axis: "y", offsetMm: rowHeight, separationMm: gap, children: [rowTree, bottom] };
    };
    const tree = buildRows(usable);
    if (tree && paneIndex === units.length) return tree;
  }
  return null;
}

function buildSolver(units: readonly Unit[], profile: GlassCuttingProfile, nodeLimit: number) {
  let visitedStates = 0;
  let exhausted = true;
  let limitReached = false;
  const memo: RectMemo = new Map();
  const submaskMemo = new Map<string, bigint[]>();
  const cutMemo = new Map<string, number[]>();
  const areaMemo = new Map<bigint, number>([[BigInt(0), 0]]);
  const areasByBit = units.map((unit) => unit.widthMm * unit.heightMm);
  const gap = profile.process.kerfOrSeparationMm;
  const submasksFor = (mask: bigint) => {
    const cached = submaskMemo.get(mask.toString());
    if (cached) return cached;
    const generated = sortedSubmasks(mask, smallestBit(mask));
    submaskMemo.set(mask.toString(), generated);
    return generated;
  };
  const areaFor = (mask: bigint): number => {
    const cached = areaMemo.get(mask);
    if (cached !== undefined) return cached;
    const bit = smallestBit(mask);
    const index = maskIndexes(bit, units)[0]!;
    const result = areasByBit[index]! + areaFor(mask ^ bit);
    areaMemo.set(mask, result);
    return result;
  };
  const cutsFor = (axis: CutAxis, rect: GlassRect, mask: bigint) => {
    const key = `${axis}|${rect.widthMm}|${rect.heightMm}|${mask.toString()}|${gap}`;
    const cached = cutMemo.get(key);
    if (cached) return cached;
    const generated = candidateCuts(axis, rect, mask, units, gap);
    cutMemo.set(key, generated);
    return generated;
  };
  const enter = () => {
    visitedStates += 1;
    if (visitedStates > nodeLimit) {
      exhausted = false;
      limitReached = true;
      return false;
    }
    return true;
  };

  const solveRect = (rect: GlassRect, mask: bigint, path: string): InternalTree | null => {
    if (limitReached) return null;
    const key = rectKey(rect, mask);
    const cached = memo.get(key);
    if (cached !== undefined) return cached === null ? null : translateTree(cached, rect.xMm, rect.yMm);
    if (areaFor(mask) > rectArea(rect)) {
      memo.set(key, null);
      return null;
    }
    if (!enter()) return null;
    const localRect = { ...rect, xMm: 0, yMm: 0 };
    if (mask === BigInt(0)) {
      const leaf: InternalTree = { kind: "remnant", nodeId: `${path}.remnant`, rect: localRect };
      memo.set(key, leaf);
      return translateTree(leaf, rect.xMm, rect.yMm);
    }
    if (popcount(mask) === 1) {
      const index = maskIndexes(mask, units)[0]!;
      const tree = treeForSinglePane({ unit: units[index]!, rect: localRect, profile, path });
      memo.set(key, tree);
      return tree ? translateTree(tree, rect.xMm, rect.yMm) : null;
    }
    for (const axis of ["x", "y"] as const) {
      for (const offsetMm of cutsFor(axis, localRect, mask)) {
        if (limitReached) return null;
        if (!enter()) return null;
        const firstExtent = offsetMm;
        const secondExtent = (axis === "x" ? localRect.widthMm : localRect.heightMm) - offsetMm - gap;
        if (firstExtent <= 0 || secondExtent <= 0) continue;
        const leftRect: GlassRect = axis === "x"
          ? { ...localRect, widthMm: firstExtent }
          : { ...localRect, heightMm: firstExtent };
        const rightRect: GlassRect = axis === "x"
          ? { ...localRect, xMm: offsetMm + gap, widthMm: secondExtent }
          : { ...localRect, yMm: offsetMm + gap, heightMm: secondExtent };
        for (const submask of submasksFor(mask)) {
          if (limitReached) return null;
          if (!enter()) return null;
          const otherMask = mask ^ submask;
          if (areaFor(submask) > rectArea(leftRect) || areaFor(otherMask) > rectArea(rightRect)) continue;
          if (!maskFitsRect(submask, leftRect, units) || !maskFitsRect(otherMask, rightRect, units)) continue;
          const firstTree = solveRect(leftRect, submask, `${path}.${axis}${offsetMm}a`);
          if (!firstTree) continue;
          const secondTree = solveRect(rightRect, otherMask, `${path}.${axis}${offsetMm}b`);
          if (!secondTree) continue;
          const nodeId = `${path}.cut-${axis}-${offsetMm}-${submask.toString(36)}`;
          const tree: InternalTree = { kind: "cut", nodeId, rect: localRect, axis, offsetMm, separationMm: gap, children: [firstTree, secondTree] };
          memo.set(key, tree);
          return translateTree(tree, rect.xMm, rect.yMm);
        }
      }
    }
    memo.set(key, null);
    return null;
  };

  const fullMask = (units.length > 0) ? (BigInt(1) << BigInt(units.length)) - BigInt(1) : BigInt(0);
  const solveSheets = (mask: bigint, remainingSheets: number, roots: InternalTree[]): InternalTree[] | null => {
    if (limitReached) return null;
    if (remainingSheets === 0) return mask === BigInt(0) ? roots : null;
    if (popcount(mask) < remainingSheets) return null;
    if (!enter()) return null;
    if (remainingSheets === 1) {
      const tree = solveRect(usableRect(profile), mask, `s${roots.length + 1}`);
      return tree ? [...roots, tree] : null;
    }
    if (areaFor(mask) > remainingSheets * rectArea(usableRect(profile))) return null;
    const subsets = [...submasksFor(mask)];
    subsets.push(mask);
    for (const subset of subsets) {
      if (limitReached) return null;
      if (!enter()) return null;
      if (popcount(mask ^ subset) < remainingSheets - 1) continue;
      if (areaFor(mask ^ subset) > (remainingSheets - 1) * rectArea(usableRect(profile))) continue;
      const tree = solveRect(usableRect(profile), subset, `s${roots.length + 1}`);
      if (!tree) continue;
      const result = solveSheets(mask ^ subset, remainingSheets - 1, [...roots, tree]);
      if (result) return result;
    }
    return null;
  };
  return { solveRect, solveSheets, fullMask, get visitedStates() { return visitedStates; }, get exhausted() { return exhausted; }, get limitReached() { return limitReached; } };
}

function usableRect(profile: GlassCuttingProfile): GlassRect {
  const edge = profile.process.edgeTrimMm;
  return {
    xMm: edge.left,
    yMm: edge.top,
    widthMm: profile.sheet.widthMm - edge.left - edge.right,
    heightMm: profile.sheet.heightMm - edge.top - edge.bottom,
  };
}

function listTreeLeaves(node: InternalTree, panes: GlassPlannedPane[], remnants: GlassPlannedRemnant[], unitsById: Map<string, Unit>, profile: GlassCuttingProfile): void {
  if (node.kind === "cut") {
    listTreeLeaves(node.children[0], panes, remnants, unitsById, profile);
    listTreeLeaves(node.children[1], panes, remnants, unitsById, profile);
    return;
  }
  if (node.kind === "pane") {
    const unit = unitsById.get(node.paneUnitId);
    if (!unit) return;
    panes.push({
      paneUnitId: node.paneUnitId,
      organizationId: unit.organizationId,
      quoteId: unit.quoteId,
      quoteCode: unit.quoteCode,
      quoteItemId: unit.quoteItemId,
      logicalComponentId: unit.logicalComponentId ?? "",
      componentCode: unit.componentCode,
      paneId: unit.paneId,
      productId: unit.productId ?? "",
      snapshotFingerprint: unit.snapshotFingerprint,
      rect: node.rect,
      rotated: node.rotated,
    });
    return;
  }
  const min = profile.process.reusableRemnant;
  const fits = (width: number, height: number) => width >= min.minimumWidthMm && height >= min.minimumHeightMm;
  const reusable = fits(node.rect.widthMm, node.rect.heightMm)
    || (min.orientation === "rotatable" && fits(node.rect.heightMm, node.rect.widthMm));
  remnants.push({ remnantId: node.nodeId, rect: node.rect, areaMm2: rectArea(node.rect), classification: reusable ? "reusable_candidate" : "waste" });
}

function cutSequence(tree: InternalTree): GlassSheetPlan["cutSequence"] {
  const rows: GlassSheetPlan["cutSequence"] = [];
  const visit = (node: InternalTree, parentNodeId: string) => {
    if (node.kind !== "cut") return;
    const ordinal = rows.length + 1;
    rows.push({
      ordinal,
      nodeId: node.nodeId,
      parentNodeId,
      axis: node.axis,
      localOffsetMm: node.offsetMm,
      absolutePositionMm: (node.axis === "x" ? node.rect.xMm : node.rect.yMm) + node.offsetMm,
      fromMm: node.axis === "x" ? node.rect.yMm : node.rect.xMm,
      toMm: node.axis === "x" ? node.rect.yMm + node.rect.heightMm : node.rect.xMm + node.rect.widthMm,
      operation: "rayado_y_quiebre",
      separationMm: node.separationMm,
    });
    visit(node.children[0], node.nodeId);
    visit(node.children[1], node.nodeId);
  };
  visit(tree, "usable-sheet");
  return rows;
}

function separationLoss(node: InternalTree): number {
  if (node.kind !== "cut") return 0;
  return (node.axis === "x" ? node.separationMm * node.rect.heightMm : node.separationMm * node.rect.widthMm)
    + separationLoss(node.children[0]) + separationLoss(node.children[1]);
}

function makeSheetPlans(roots: InternalTree[], units: readonly Unit[], profile: GlassCuttingProfile): GlassSheetPlan[] {
  const unitsById = new Map(units.map((unit) => [unit.paneUnitId, unit]));
  return roots.map((tree, index) => {
    let nodeOrdinal = 0;
    const reidentify = (node: InternalTree): InternalTree => {
      nodeOrdinal += 1;
      const nodeId = `sheet-${index + 1}-node-${nodeOrdinal}`;
      if (node.kind === "cut") return { ...node, nodeId, children: [reidentify(node.children[0]), reidentify(node.children[1])] };
      return { ...node, nodeId };
    };
    const identifiedTree = reidentify(tree);
    const panes: GlassPlannedPane[] = [];
    const remnants: GlassPlannedRemnant[] = [];
    listTreeLeaves(identifiedTree, panes, remnants, unitsById, profile);
    const rawSheet = { xMm: 0, yMm: 0, widthMm: profile.sheet.widthMm, heightMm: profile.sheet.heightMm };
    const usableSheet = usableRect(profile);
    const panesMm2 = panes.reduce((sum, pane) => sum + rectArea(pane.rect), 0);
    const reusableRemnantsMm2 = remnants.filter((row) => row.classification === "reusable_candidate").reduce((sum, row) => sum + row.areaMm2, 0);
    const wasteMm2 = remnants.filter((row) => row.classification === "waste").reduce((sum, row) => sum + row.areaMm2, 0);
    const rawSheetMm2 = rectArea(rawSheet);
    const usableSheetMm2 = rectArea(usableSheet);
    return {
      sheetId: `sheet-${index + 1}`,
      profileId: profile.profileId,
      rawSheet,
      usableSheet,
      cutTree: identifiedTree,
      cutSequence: cutSequence(identifiedTree),
      panes,
      remnants,
      areas: {
        panesMm2,
        reusableRemnantsMm2,
        wasteMm2,
        edgeTrimMm2: rawSheetMm2 - usableSheetMm2,
        separationLossMm2: separationLoss(identifiedTree),
        rawSheetMm2,
        usableSheetMm2,
      },
      purchaseCost: profile.purchaseCost,
    };
  });
}

function baseResult(inputFingerprint: string, errors: string[], status: GlassCuttingResult["status"]): GlassCuttingResult {
  return {
    status,
    geometricFeasibility: "not_evaluated",
    minimumSheetCountProven: false,
    productionReadiness: "requires_workshop_validation",
    sheets: [],
    warnings: [],
    errors,
    verification: { passed: false, findings: errors },
    inputFingerprint,
    search: { visitedStates: 0, exhausted: true },
    summary: {
      sheetCount: 0, paneCount: 0, paneAreaMm2: 0, reusableRemnantsMm2: 0,
      wasteMm2: 0, edgeTrimMm2: 0, separationLossMm2: 0, rawSheetAreaMm2: 0,
      usableSheetAreaMm2: 0, purchaseCost: null, costStatus: "pending",
    },
  };
}

function optimizeGroup(
  panes: readonly GlassPanePlanningUnit[],
  profile: GlassCuttingProfile,
  nodeLimit: number,
  mode: "workshop" | "geometric_preview"
): GlassCuttingResult {
  const canonicalPanes = [...panes].sort((a, b) => compareText(a.paneId, b.paneId));
  const inputFingerprint = fnv1aFingerprint({ panes: canonicalPanes, profile });
  const requestedPhysicalUnits = canonicalPanes.reduce((sum, pane) => sum + pane.quantity, 0);
  if (!Number.isSafeInteger(requestedPhysicalUnits) || requestedPhysicalUnits > MAX_PHYSICAL_UNITS) {
    return baseResult(inputFingerprint, [`La cotización supera el límite seguro de ${MAX_PHYSICAL_UNITS.toLocaleString("es-CL")} paños por grupo.`], "invalid_input");
  }
  const errors = validationErrors(canonicalPanes, profile, mode);
  if (errors.length > 0) return baseResult(inputFingerprint, errors, "requires_review");
  const units = expandUnits(canonicalPanes);
  if (units.length === 0) return baseResult(inputFingerprint, ["No hay unidades físicas para optimizar."], "invalid_input");
  const usable = usableRect(profile);
  const individuallyImpossible = units.filter((unit) => !orientations(unit).some((orientation) =>
    orientation.widthMm <= usable.widthMm && orientation.heightMm <= usable.heightMm
  ));
  if (individuallyImpossible.length > 0) {
    const result = baseResult(inputFingerprint, individuallyImpossible.map((unit) => `El paño ${unit.paneUnitId} no cabe en ninguna orientación permitida.`), "infeasible_piece");
    result.geometricFeasibility = "not_found";
    return result;
  }

  const nodeBudget = Number.isSafeInteger(nodeLimit) && nodeLimit > 0 ? nodeLimit : DEFAULT_SEARCH_NODE_LIMIT;
  const exactEligible = units.length <= MAX_EXACT_UNITS;
  const solver = exactEligible ? buildSolver(units, profile, nodeBudget) : null;
  const allArea = units.reduce((sum, unit) => sum + unit.widthMm * unit.heightMm, 0);
  const usableArea = rectArea(usable);
  const lowerBound = Math.max(1, Math.ceil(allArea / usableArea));
  let roots: InternalTree[] | null = null;
  let minimumSheetCountProven = false;
  if (exactEligible && lowerBound === 1) {
    const grid = identicalGridPlan(units, profile);
    if (grid) {
      const candidateSheets = makeSheetPlans([grid], units, profile);
      if (verifyGlassSheetPlans({ panes: canonicalPanes, profiles: [profile], sheets: candidateSheets, mode }).passed) {
        roots = [grid];
        minimumSheetCountProven = true;
      }
    }
  }
  if (!roots && solver) {
    minimumSheetCountProven = true;
    for (let sheetCount = lowerBound; sheetCount <= units.length; sheetCount += 1) {
      roots = solver.solveSheets(solver.fullMask, sheetCount, []);
      if (roots) break;
      if (!solver.exhausted) {
        minimumSheetCountProven = false;
        break;
      }
    }
  }
  const heuristicRoots = constructGuillotinePlan(units, profile);
  if (heuristicRoots) {
    const heuristicSheets = makeSheetPlans(heuristicRoots, units, profile);
    const heuristicValid = verifyGlassSheetPlans({ panes: canonicalPanes, profiles: [profile], sheets: heuristicSheets, mode }).passed;
    if (heuristicValid) {
      const currentSheets = roots ? makeSheetPlans(roots, units, profile) : null;
      const heuristicReusable = heuristicSheets.reduce((sum, sheet) => sum + sheet.areas.reusableRemnantsMm2, 0);
      const currentReusable = currentSheets?.reduce((sum, sheet) => sum + sheet.areas.reusableRemnantsMm2, 0) ?? -1;
      const heuristicWaste = heuristicSheets.reduce((sum, sheet) => sum + sheet.areas.wasteMm2, 0);
      const currentWaste = currentSheets?.reduce((sum, sheet) => sum + sheet.areas.wasteMm2, 0) ?? Number.POSITIVE_INFINITY;
      if (!roots || heuristicSheets.length < currentSheets!.length
        || (heuristicSheets.length === currentSheets!.length && (heuristicReusable > currentReusable
          || (heuristicReusable === currentReusable && heuristicWaste < currentWaste)))) {
        roots = heuristicRoots;
      }
    }
  }
  if (!roots) {
    const provenImpossible = solver?.exhausted === true && !solver.limitReached;
    const result = baseResult(inputFingerprint,
      [provenImpossible
        ? "La búsqueda exhaustiva no encontró una distribución guillotina factible con estas restricciones."
        : "La búsqueda no encontró un plan guillotina verificable; esto no demuestra imposibilidad geométrica."],
      provenImpossible ? "infeasible_proven" : "sin_plan_en_busqueda");
    result.geometricFeasibility = "not_found";
    result.minimumSheetCountProven = false;
    result.search = { visitedStates: solver?.visitedStates ?? 0, exhausted: solver?.exhausted ?? false };
    return result;
  }

  const sheets = makeSheetPlans(roots, units, profile);
  const verification = verifyGlassSheetPlans({ panes: canonicalPanes, profiles: [profile], sheets, mode });
  const warnings = [
    ...(profile.process.workshopValidation === "validated" ? [] : ["Distribución geométrica verificada; restricciones del taller aún no validadas para producción."]),
    ...(profile.purchaseCost ? [] : ["Costo de compra de plancha pendiente; la geometría no se bloquea."]),
    "La secuencia es una propuesta geométrica; requiere prueba física del taller antes de ejecutarse.",
  ];
  const summary = sheets.reduce((sum, sheet) => ({
    sheetCount: sum.sheetCount + 1,
    paneCount: sum.paneCount + sheet.panes.length,
    paneAreaMm2: sum.paneAreaMm2 + sheet.areas.panesMm2,
    reusableRemnantsMm2: sum.reusableRemnantsMm2 + sheet.areas.reusableRemnantsMm2,
    wasteMm2: sum.wasteMm2 + sheet.areas.wasteMm2,
    edgeTrimMm2: sum.edgeTrimMm2 + sheet.areas.edgeTrimMm2,
    separationLossMm2: sum.separationLossMm2 + sheet.areas.separationLossMm2,
    rawSheetAreaMm2: sum.rawSheetAreaMm2 + sheet.areas.rawSheetMm2,
    usableSheetAreaMm2: sum.usableSheetAreaMm2 + sheet.areas.usableSheetMm2,
  }), {
    sheetCount: 0, paneCount: 0, paneAreaMm2: 0, reusableRemnantsMm2: 0, wasteMm2: 0,
    edgeTrimMm2: 0, separationLossMm2: 0, rawSheetAreaMm2: 0, usableSheetAreaMm2: 0,
  });
  const purchaseCost = profile.purchaseCost ? {
    ...profile.purchaseCost,
    amount: profile.purchaseCost.amount * sheets.length,
  } : null;
  const status: GlassCuttingResult["status"] = verification.passed ? "feasible" : "requires_review";
  return {
    status,
    geometricFeasibility: verification.passed ? "feasible" : "not_found",
    minimumSheetCountProven: minimumSheetCountProven && !(solver?.limitReached ?? false),
    productionReadiness: profile.process.workshopValidation === "validated" && verification.passed ? "workshop_validated" : "requires_workshop_validation",
    sheets,
    warnings,
    errors: verification.findings,
    verification,
    inputFingerprint,
    search: { visitedStates: solver?.visitedStates ?? 0, exhausted: solver?.exhausted ?? false },
    summary: {
      ...summary,
      purchaseCost,
      costStatus: purchaseCost ? "known" : "pending",
    },
  };
}

/** Plans each compatible technical glass group independently; rejects cross-organization batches. */
export function optimizeGlassCuttingBatch(input: GlassCuttingOptimizationInput): GlassCuttingResult[] {
  const organizationIds = new Set(input.panes.map((pane) => String(pane.organizationId)));
  if (organizationIds.size > 1) {
    const fingerprint = fnv1aFingerprint(input.panes);
    return [baseResult(fingerprint, ["No se permite optimizar en un mismo lote paños de organizaciones distintas."], "invalid_input")];
  }
  const profilesByKey = new Map<string, GlassCuttingProfile[]>();
  input.profiles.forEach((profile) => {
    const key = profileKey(profile);
    profilesByKey.set(key, [...(profilesByKey.get(key) ?? []), profile]);
  });
  const groups = new Map<string, GlassPanePlanningUnit[]>();
  input.panes.forEach((pane) => {
    const candidates = input.profiles.filter((profile) =>
      profile.productId === pane.productId
      && profile.thicknessMm === pane.technicalSpec?.thicknessMm
      && profile.category === pane.technicalSpec?.category
      && profile.finishOrientationKey === pane.finishOrientationKey
      && (input.mode === "geometric_preview" || (profile.sheet.widthMm === pane.technicalSpec?.sheetWidthMm
      && profile.sheet.heightMm === pane.technicalSpec?.sheetHeightMm))
    );
    const key = candidates.length === 1 ? profileKey(candidates[0]!) : `${technicalKey(pane, {
      profileId: "missing", productId: pane.productId ?? "", thicknessMm: pane.technicalSpec?.thicknessMm ?? 0,
      category: pane.technicalSpec?.category ?? "pendiente", finishOrientationKey: pane.finishOrientationKey,
      sheet: { widthMm: pane.technicalSpec?.sheetWidthMm ?? 0, heightMm: pane.technicalSpec?.sheetHeightMm ?? 0,
        orientation: pane.orientation, source: "unknown", sourceReference: null },
      process: {} as GlassCuttingProfile["process"], purchaseCost: null,
    })}|profile_count_${candidates.length}`;
    groups.set(key, [...(groups.get(key) ?? []), pane]);
  });

  return [...groups.entries()].sort(([a], [b]) => compareText(a, b)).map(([key, panes]) => {
    const matchingProfiles = profilesByKey.get(key) ?? [];
    if (matchingProfiles.length !== 1) {
      return baseResult(fnv1aFingerprint(panes), [matchingProfiles.length === 0
        ? "No hay un perfil técnico de plancha compatible con el vidrio solicitado."
        : "Hay más de un perfil técnico compatible; se requiere resolver la ambigüedad."], "requires_review");
    }
    return optimizeGroup(panes, matchingProfiles[0]!, input.searchNodeLimit ?? DEFAULT_SEARCH_NODE_LIMIT, input.mode ?? "workshop");
  });
}

/** A saved plan is current only while the canonical frozen input fingerprint still matches. */
export function isGlassCuttingPlanCurrent(plan: Pick<GlassCuttingResult, "inputFingerprint">, currentFingerprint: string): boolean {
  return plan.inputFingerprint === currentFingerprint;
}

