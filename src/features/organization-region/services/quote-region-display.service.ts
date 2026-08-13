import { createQuoteRegionSnapshot, parseQuoteRegionSnapshot } from "@/features/organization-region/services/quote-region-snapshot.service";
import { resolveOrganizationPricingSettings } from "@/features/organization-region/services/organization-region.service";
import type { QuoteRegionSnapshot } from "@/features/organization-region/types/quote-region-snapshot";
import { formatCurrency } from "@/utils/formatCurrency";

const LEGACY_QUOTE_REGION_SNAPSHOT = createQuoteRegionSnapshot({ region: null });

export function resolveQuoteRegionSnapshotForDisplay(
  snapshot: QuoteRegionSnapshot | null | undefined
) {
  return parseQuoteRegionSnapshot(snapshot) ?? LEGACY_QUOTE_REGION_SNAPSHOT;
}

export function formatQuoteCurrency(
  value: number,
  snapshot: QuoteRegionSnapshot | null | undefined
) {
  const region = resolveQuoteRegionSnapshotForDisplay(snapshot);
  return formatCurrency(value, region.locale, region.currencyCode);
}

export function formatQuoteTaxLabel(snapshot: QuoteRegionSnapshot | null | undefined) {
  const region = resolveQuoteRegionSnapshotForDisplay(snapshot);
  return `${region.taxLabel} ${region.taxRateDefault}%`;
}

export function resolveQuotePricingSettings(
  snapshot: QuoteRegionSnapshot | null | undefined
) {
  return resolveOrganizationPricingSettings(
    resolveQuoteRegionSnapshotForDisplay(snapshot)
  );
}
