export const QUOTE_PRICING_MODE_OPTIONS = ["por_item", "total_global"] as const;

export type QuotePricingMode = (typeof QUOTE_PRICING_MODE_OPTIONS)[number];

export function normalizeQuotePricingMode(
  value: string | null | undefined
): QuotePricingMode {
  return value?.trim() === "total_global" ? "total_global" : "por_item";
}
