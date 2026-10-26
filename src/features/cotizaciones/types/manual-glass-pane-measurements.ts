export const MANUAL_GLASS_PANE_MEASUREMENTS_VERSION = 2 as const;

/** User-entered final cut sizes. The catalog remains the technical source of truth. */
export type ManualGlassPaneMeasurement = {
  id: string;
  source: "manual";
  version: 1 | typeof MANUAL_GLASS_PANE_MEASUREMENTS_VERSION;
  productId: string;
  technicalFingerprint: string;
  widthMm: number;
  heightMm: number;
  /** v1 stored total physical units; v2 stores units per configured component. */
  quantity: number;
  quantityBasis?: "total" | "per_component";
  paneSlotId?: string;
  sourcePosition?: string;
  rectangularVerified?: boolean;
  recordedAt: string;
};

export type ManualGlassPaneMeasurementsSnapshot = {
  version: 1 | typeof MANUAL_GLASS_PANE_MEASUREMENTS_VERSION;
  entries: ManualGlassPaneMeasurement[];
  /** Stable hash of pane-count/type/shape inputs; a mismatch invalidates confirmation. */
  configurationFingerprint?: string | null;
  expectedPaneCount?: number | null;
  allPanesConfirmed?: boolean;
};
