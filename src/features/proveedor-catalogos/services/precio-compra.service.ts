export type PriceSource = "reference" | "provider_adjustment" | "organization_override" | "workshop";

export type OrganizationSupplierAdjustment = {
  providerKey: string;
  percentage: number;
  active: boolean;
};

export type OrganizationPresentationOverride = {
  presentationId: string;
  netPrice: number;
  currency: string;
};

export type OrganizationPurchasePricing = {
  adjustments: readonly OrganizationSupplierAdjustment[];
  overrides: readonly OrganizationPresentationOverride[];
};

export function resolvePurchasePrice(input: {
  providerKey: string;
  presentationId: string;
  referenceNetPrice: number | null;
  referenceBasis: "commercial_presentation" | "per_meter" | "unknown";
  referenceCurrency: string | null;
  commercialLengthMm: number | null;
  organizationPricing?: OrganizationPurchasePricing;
}) {
  const override = input.organizationPricing?.overrides.find((row) => row.presentationId === input.presentationId);
  const referenceUnitNetPrice = input.referenceNetPrice != null && input.referenceNetPrice > 0
    ? input.referenceBasis === "commercial_presentation" ? input.referenceNetPrice
      : input.referenceBasis === "per_meter" && input.commercialLengthMm != null
        ? input.referenceNetPrice * input.commercialLengthMm / 1000 : null
    : null;

  if (override && Number.isFinite(override.netPrice) && override.netPrice > 0 && /^[A-Z]{3}$/.test(override.currency)) {
    return {
      unitNetPrice: override.netPrice,
      referenceUnitNetPrice,
      source: "organization_override" as PriceSource,
      adjustmentPercent: null,
      currency: override.currency,
    };
  }

  if (referenceUnitNetPrice == null || !input.referenceCurrency) return null;
  const adjustment = input.organizationPricing?.adjustments.find((row) =>
    row.providerKey === input.providerKey && row.active && Number.isFinite(row.percentage) && row.percentage > -100
  );
  if (adjustment && adjustment.percentage !== 0) {
    return {
      unitNetPrice: Math.round(referenceUnitNetPrice * (1 + adjustment.percentage / 100) * 100) / 100,
      referenceUnitNetPrice,
      source: "provider_adjustment" as PriceSource,
      adjustmentPercent: adjustment.percentage,
      currency: input.referenceCurrency,
    };
  }
  return {
    unitNetPrice: referenceUnitNetPrice,
    referenceUnitNetPrice,
    source: "reference" as PriceSource,
    adjustmentPercent: null,
    currency: input.referenceCurrency,
  };
}

export function summarizePriceSources(sources: readonly PriceSource[]): "reference" | "own" | "mixed" | "none" {
  if (sources.length === 0) return "none";
  const own = sources.some((source) => source !== "reference");
  const reference = sources.some((source) => source === "reference");
  return own && reference ? "mixed" : own ? "own" : "reference";
}
