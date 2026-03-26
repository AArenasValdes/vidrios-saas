export const PRICING_MODE_OPTIONS = ["margen", "precio_directo"] as const;

export type PricingMode = (typeof PRICING_MODE_OPTIONS)[number];

export function normalizePricingMode(value: string | null | undefined): PricingMode {
  return value?.trim() === "precio_directo" ? "precio_directo" : "margen";
}
