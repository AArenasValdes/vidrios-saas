export const MANUAL_GLASS_PANE_MEASUREMENTS_VERSION = 1 as const;

/**
 * Final pane dimensions explicitly entered for one quotation component.
 * Product technical data remains owned by the glass catalog and is referenced
 * by productId plus a fingerprint of the technical fields used for planning.
 */
export type ManualGlassPaneMeasurement = {
  id: string;
  source: "manual";
  version: typeof MANUAL_GLASS_PANE_MEASUREMENTS_VERSION;
  productId: string;
  technicalFingerprint: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  recordedAt: string;
};

export type ManualGlassPaneMeasurementsSnapshot = {
  version: typeof MANUAL_GLASS_PANE_MEASUREMENTS_VERSION;
  entries: ManualGlassPaneMeasurement[];
};
