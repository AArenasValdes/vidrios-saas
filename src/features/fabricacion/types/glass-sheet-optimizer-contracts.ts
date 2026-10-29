import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import type { NormalizedGlassPane } from "@/features/fabricacion/services/glass-pane-normalization.service";
import type {
  GlassManualCutProcessConstraints,
  GlassSheetPhysicalFormat,
} from "@/features/fabricacion/types/glass-cutting-contracts";

export type GlassPaneOrientation = GlassSheetPhysicalFormat["orientation"];

/** Attribution added by the quote boundary; pane geometry remains snapshot-derived. */
export type GlassPanePlanningUnit = Pick<
  NormalizedGlassPane,
  | "organizationId"
  | "quoteId"
  | "quoteItemId"
  | "logicalComponentId"
  | "glassId"
  | "paneId"
  | "paneUnitIds"
  | "productId"
  | "technicalSpec"
  | "widthMm"
  | "heightMm"
  | "quantity"
  | "commercialQuantity"
  | "dimensionProvenance"
  | "recipeStatus"
  | "validationStatus"
  | "warnings"
  | "snapshotFingerprint"
> & {
  quoteCode: string;
  componentCode: string;
  /** Explicit catalog finish/direction identity; never inferred from display text. */
  finishOrientationKey: string;
  orientation: GlassPaneOrientation;
};

export type GlassSheetPurchaseCost = {
  amount: number;
  currency: string;
  sourceReference: string | null;
  observedAt: string | null;
};

/** A reference to existing catalog data plus workshop rules, not a second glass catalog. */
export type GlassCuttingProfile = {
  profileId: string;
  productId: string;
  thicknessMm: number;
  category: GlassTechnicalSpec["category"];
  finishOrientationKey: string;
  sheet: GlassSheetPhysicalFormat;
  process: GlassManualCutProcessConstraints;
  purchaseCost: GlassSheetPurchaseCost | null;
};

export type GlassRect = { xMm: number; yMm: number; widthMm: number; heightMm: number };

export type GlassCutTreeNode =
  | { kind: "pane"; nodeId: string; rect: GlassRect; paneUnitId: string; rotated: boolean }
  | { kind: "remnant"; nodeId: string; rect: GlassRect }
  | {
      kind: "cut";
      nodeId: string;
      rect: GlassRect;
      axis: "x" | "y";
      /** Offset from the parent's x/y origin to the start of the separation. */
      offsetMm: number;
      separationMm: number;
      children: [GlassCutTreeNode, GlassCutTreeNode];
    };

export type GlassCutSequenceStep = {
  ordinal: number;
  nodeId: string;
  parentNodeId: string;
  axis: "x" | "y";
  /** Distance from the parent block origin to this cut line. */
  localOffsetMm: number;
  /** Absolute x/y position of the cut line within the raw sheet. */
  absolutePositionMm: number;
  /** Absolute coordinate interval along the cut segment. */
  fromMm: number;
  toMm: number;
  operation: "rayado_y_quiebre";
  separationMm: number;
};

export type GlassPlannedPane = {
  paneUnitId: string;
  organizationId: string | number;
  quoteId: string | number;
  quoteCode: string;
  quoteItemId: string;
  logicalComponentId: string;
  componentCode: string;
  paneId: string;
  productId: string;
  snapshotFingerprint: string;
  rect: GlassRect;
  rotated: boolean;
};

export type GlassPlannedRemnant = {
  remnantId: string;
  rect: GlassRect;
  areaMm2: number;
  classification: "reusable_candidate" | "waste";
};

export type GlassSheetPlan = {
  sheetId: string;
  profileId: string;
  rawSheet: GlassRect;
  usableSheet: GlassRect;
  cutTree: GlassCutTreeNode;
  cutSequence: GlassCutSequenceStep[];
  panes: GlassPlannedPane[];
  remnants: GlassPlannedRemnant[];
  areas: {
    panesMm2: number;
    reusableRemnantsMm2: number;
    wasteMm2: number;
    edgeTrimMm2: number;
    separationLossMm2: number;
    rawSheetMm2: number;
    usableSheetMm2: number;
  };
  purchaseCost: GlassSheetPurchaseCost | null;
};

export type GlassCuttingResult = {
  status: "feasible" | "infeasible_piece" | "infeasible_proven" | "search_limit_reached" | "sin_plan_en_busqueda" | "requires_review" | "invalid_input";
  geometricFeasibility: "feasible" | "not_found" | "not_evaluated";
  minimumSheetCountProven: boolean;
  productionReadiness: "workshop_validated" | "requires_workshop_validation";
  sheets: GlassSheetPlan[];
  warnings: string[];
  errors: string[];
  verification: { passed: boolean; findings: string[] };
  inputFingerprint: string;
  search: { visitedStates: number; exhausted: boolean };
  summary: {
    sheetCount: number;
    paneCount: number;
    paneAreaMm2: number;
    reusableRemnantsMm2: number;
    wasteMm2: number;
    edgeTrimMm2: number;
    separationLossMm2: number;
    rawSheetAreaMm2: number;
    usableSheetAreaMm2: number;
    purchaseCost: GlassSheetPurchaseCost | null;
    costStatus: "known" | "pending";
  };
};

export type GlassCuttingOptimizationInput = {
  panes: readonly GlassPanePlanningUnit[];
  profiles: readonly GlassCuttingProfile[];
  /** Preview relaxes workshop confirmation only; frozen identity, dimensions and recipe checks remain mandatory. */
  mode?: "workshop" | "geometric_preview";
  /** Computational budget only; physical rules stay entirely in workshop profiles. */
  searchNodeLimit?: number;
};

