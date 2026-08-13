import { resolveOrganizationRegionSettings } from "@/features/organization-region/services/organization-region.service";
import type { QuoteRegionSnapshot } from "@/features/organization-region/types/quote-region-snapshot";

export function createQuoteRegionSnapshot(input: {
  region: Parameters<typeof resolveOrganizationRegionSettings>[0];
  capturedAt?: string;
}): QuoteRegionSnapshot {
  return {
    ...resolveOrganizationRegionSettings(input.region),
    version: 1,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
  };
}

export function parseQuoteRegionSnapshot(value: unknown): QuoteRegionSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.version !== 1) return null;
  return createQuoteRegionSnapshot({
    region: {
      countryCode: typeof source.countryCode === "string" ? source.countryCode : null,
      currencyCode: typeof source.currencyCode === "string" ? source.currencyCode : "",
      locale: typeof source.locale === "string" ? source.locale : "",
      timezone: typeof source.timezone === "string" ? source.timezone : "",
      phoneCountryCode: typeof source.phoneCountryCode === "string" ? source.phoneCountryCode : "",
      taxLabel: typeof source.taxLabel === "string" ? source.taxLabel : "",
      taxRateDefault: typeof source.taxRateDefault === "number" ? source.taxRateDefault : Number.NaN,
      taxIdLabel: typeof source.taxIdLabel === "string" ? source.taxIdLabel : "",
    },
    capturedAt: typeof source.capturedAt === "string" ? source.capturedAt : undefined,
  });
}
