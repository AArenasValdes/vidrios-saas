import type {
  CotizacionGlassSheetBillingRule,
  CotizacionGlassSheetConfig,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export type GlassSheetOptimizationSummary = {
  requiredAreaM2: number;
  areaWithWasteM2: number;
  sheetAreaM2: number;
  rawSheetFraction: number;
  billableSheetFraction: number;
  billableAreaM2: number;
  wastePct: number;
  estimatedMaterialCostClp: number | null;
  billingRule: CotizacionGlassSheetBillingRule;
};

function round(value: number, digits = 4) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function normalizeNonNegative(value: number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function roundSheetFraction(
  fraction: number,
  rule: CotizacionGlassSheetBillingRule
) {
  if (rule === "quarter") return Math.ceil(fraction * 4) / 4;
  if (rule === "half") return Math.ceil(fraction * 2) / 2;
  if (rule === "full") return Math.ceil(fraction);
  return fraction;
}

/**
 * Calcula consumo comercial de vidrio por plancha.
 *
 * No intenta resolver nesting 2D ni una pauta física de corte. La V1 toma la
 * superficie requerida, aplica la merma configurada y redondea el consumo a la
 * fracción comercial elegida por el taller.
 */
export function calculateGlassSheetOptimization(input: {
  requiredAreaM2: number | null | undefined;
  wastePct: number | null | undefined;
  config: CotizacionGlassSheetConfig | null | undefined;
}): GlassSheetOptimizationSummary | null {
  const requiredAreaM2 = normalizeNonNegative(input.requiredAreaM2);
  const config = input.config;

  if (
    !config?.enabled ||
    requiredAreaM2 <= 0 ||
    !Number.isFinite(config.widthMm) ||
    !Number.isFinite(config.heightMm) ||
    config.widthMm <= 0 ||
    config.heightMm <= 0
  ) {
    return null;
  }

  const sheetAreaM2 = (config.widthMm * config.heightMm) / 1_000_000;
  if (sheetAreaM2 <= 0) return null;

  const wastePct = normalizeNonNegative(input.wastePct);
  const areaWithWasteM2 = requiredAreaM2 * (1 + wastePct / 100);
  const rawSheetFraction = areaWithWasteM2 / sheetAreaM2;
  const billableSheetFraction = roundSheetFraction(
    rawSheetFraction,
    config.billingRule
  );
  const billableAreaM2 = billableSheetFraction * sheetAreaM2;
  const estimatedMaterialCostClp =
    Number.isFinite(config.costClp) && config.costClp > 0
      ? Math.round(config.costClp * billableSheetFraction)
      : null;

  return {
    requiredAreaM2: round(requiredAreaM2),
    areaWithWasteM2: round(areaWithWasteM2),
    sheetAreaM2: round(sheetAreaM2),
    rawSheetFraction: round(rawSheetFraction),
    billableSheetFraction: round(billableSheetFraction),
    billableAreaM2: round(billableAreaM2),
    wastePct: round(wastePct, 2),
    estimatedMaterialCostClp,
    billingRule: config.billingRule,
  };
}
