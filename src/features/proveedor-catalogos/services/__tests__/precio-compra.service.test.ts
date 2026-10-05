import { resolvePurchasePrice, summarizePriceSources } from "../precio-compra.service";

const base = {
  providerKey: "xelena",
  presentationId: "rail-1",
  referenceNetPrice: 10940,
  referenceBasis: "commercial_presentation" as const,
  referenceCurrency: "CLP",
  commercialLengthMm: 5800,
};

describe("precio de compra por presentación", () => {
  it("usa la referencia cuando el taller no tiene precios propios", () => {
    expect(resolvePurchasePrice(base)).toMatchObject({ unitNetPrice: 10940, source: "reference", adjustmentPercent: null });
  });

  it("aplica descuento y recargo del proveedor a la presentación completa", () => {
    expect(resolvePurchasePrice({ ...base, organizationPricing: { adjustments: [{ providerKey: "xelena", percentage: -10, active: true }], overrides: [] } }))
      .toMatchObject({ unitNetPrice: 9846, source: "provider_adjustment", adjustmentPercent: -10 });
    expect(resolvePurchasePrice({ ...base, organizationPricing: { adjustments: [{ providerKey: "xelena", percentage: 15, active: true }], overrides: [] } }))
      .toMatchObject({ unitNetPrice: 12581, source: "provider_adjustment" });
  });

  it("prioriza el precio propio del riel incluso cuando hay descuento", () => {
    expect(resolvePurchasePrice({ ...base, organizationPricing: {
      adjustments: [{ providerKey: "xelena", percentage: -10, active: true }],
      overrides: [{ presentationId: "rail-1", netPrice: 9000, currency: "CLP" }],
    } })).toMatchObject({ unitNetPrice: 9000, referenceUnitNetPrice: 10940, source: "organization_override", adjustmentPercent: null });
  });

  it("un precio faltante permanece pendiente salvo override explícito", () => {
    expect(resolvePurchasePrice({ ...base, referenceNetPrice: null })).toBeNull();
    expect(resolvePurchasePrice({ ...base, referenceNetPrice: null, organizationPricing: {
      adjustments: [], overrides: [{ presentationId: "rail-1", netPrice: 9000, currency: "CLP" }],
    } })).toMatchObject({ unitNetPrice: 9000, referenceUnitNetPrice: null, source: "organization_override" });
  });

  it("respeta metro lineal, largo comercial y moneda sin conversión", () => {
    expect(resolvePurchasePrice({ ...base, referenceNetPrice: 10000, referenceBasis: "per_meter", commercialLengthMm: 6800, referenceCurrency: "USD" }))
      .toMatchObject({ unitNetPrice: 68000, currency: "USD" });
  });

  it("clasifica referencia, precios propios y mezcla", () => {
    expect(summarizePriceSources([])).toBe("none");
    expect(summarizePriceSources(["reference"])).toBe("reference");
    expect(summarizePriceSources(["provider_adjustment", "organization_override"])).toBe("own");
    expect(summarizePriceSources(["reference", "organization_override"])).toBe("mixed");
  });
});
