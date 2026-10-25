import type { GlassTechnicalCategory } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";

export type GlassSheetPhysicalFormat = {
  widthMm: number;
  heightMm: number;
  orientation: "fixed" | "rotatable" | "grain_or_coating_directional" | "unknown";
  source: "catalog" | "supplier_document" | "workshop_measurement" | "unknown";
  sourceReference: string | null;
};

export type GlassEdgeTrimMm = { top: number; right: number; bottom: number; left: number };

export type GlassRemnantReuseConstraints = {
  minimumWidthMm: number;
  minimumHeightMm: number;
  orientation: GlassSheetPhysicalFormat["orientation"];
};

export type GlassManualCutProcessConstraints = {
  tableWidthMm: number;
  tableHeightMm: number;
  supportedCategories: GlassTechnicalCategory[];
  supportedThicknessesMm: number[];
  edgeTrimMm: GlassEdgeTrimMm;
  kerfOrSeparationMm: number;
  minimumStripWidthMm: number;
  reusableRemnant: GlassRemnantReuseConstraints;
  supportedOperations: Array<"straight_cut" | "quiebre">;
  sequence: Array<{ ordinal: number; operation: "straight_cut" | "quiebre"; axis: "x" | "y" }>;
  workshopValidation: "unvalidated" | "validated" | "requires_review";
  sourceReference: string | null;
  /** Commercial merma stays separate from geometric kerf/trim losses. */
  commercialMermaPct?: number | null;
  geometricLossMm2?: number | null;
};
