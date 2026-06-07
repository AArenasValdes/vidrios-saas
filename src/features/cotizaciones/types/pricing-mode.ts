export const PRICING_MODE_OPTIONS = ["margen", "precio_directo"] as const;

export type PricingMode = (typeof PRICING_MODE_OPTIONS)[number];

export function normalizePricingMode(value: string | null | undefined): PricingMode {
  return value?.trim() === "precio_directo" ? "precio_directo" : "margen";
}

export const DEFAULT_MARGIN_PCT = 100;

export const COST_INPUT_SCOPE_OPTIONS = ["group_total", "unit"] as const;

export type CostInputScope = (typeof COST_INPUT_SCOPE_OPTIONS)[number];

export function normalizeCostInputScope(value: string | null | undefined): CostInputScope {
  return value?.trim() === "group_total" ? "group_total" : "unit";
}
