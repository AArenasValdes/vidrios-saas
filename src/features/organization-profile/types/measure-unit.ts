export const MEASURE_UNITS = ["mm", "cm"] as const;

export type MeasureUnit = (typeof MEASURE_UNITS)[number];

export const DEFAULT_MEASURE_UNIT: MeasureUnit = "mm";
