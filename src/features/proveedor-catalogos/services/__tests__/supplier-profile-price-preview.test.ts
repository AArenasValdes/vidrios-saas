import { resolveSupplierProfilePricePreviews, resolveSupplierTechnicalCodesForQuote } from "../supplier-presentation-resolution.service";
import type { CatalogPresentationPrice } from "../costo-tecnico-parcial.service";

const request = {
  itemId: "item-1",
  familyKey: "thermowin:kom-800",
  finishName: "Blanco",
  technicalCodes: ["KOM 802"],
  configurationKey: "ventora:kompen-form-line-800",
};

function presentation(overrides: Partial<CatalogPresentationPrice> = {}): CatalogPresentationPrice {
  return {
    presentationId: "pres-802-white",
    providerKey: "thermowin-kompen",
    familyKeys: ["thermowin:kom-800"],
    configurationKey: null,
    technicalCode: "KOM 802",
    technicalName: "Marco monorriel",
    supplierSku: "802-0003",
    presentationDescription: "Marco monorriel · Blanco",
    finishCode: "0003",
    finishName: "Blanco",
    finishResolution: "specific",
    purchaseUnit: "TR",
    commercialLengthMm: 6000,
    netPrice: 34900,
    priceBasis: "commercial_presentation",
    currency: "CLP",
    priceListId: "list-2026",
    priceListRevision: "2026",
    ...overrides,
  };
}

describe("supplier profile price preview without fabrication recipe", () => {
  it("uses documented line codes when no recipe is selected and prefers recipe codes otherwise", () => {
    expect(resolveSupplierTechnicalCodesForQuote({
      recipeCodes: [],
      documentedCodes: [" KOM 802 ", "KOM 804", "KOM 802"],
    })).toEqual(["KOM 802", "KOM 804"]);
    expect(resolveSupplierTechnicalCodesForQuote({
      recipeCodes: ["KOM 802"],
      documentedCodes: ["KOM 804"],
    })).toEqual(["KOM 802"]);
  });

  it("returns the documented supplier price per profile and commercial presentation", () => {
    const result = resolveSupplierProfilePricePreviews({
      request,
      references: [{ code: "KOM 802", name: "Marco monorriel" }],
      presentations: [presentation()],
      providerNames: new Map([["thermowin-kompen", "Thermowin Kompen"]]),
    });

    expect(result).toEqual([expect.objectContaining({
      technicalCode: "KOM 802",
      providerKey: "thermowin-kompen",
      providerLabel: "Thermowin Kompen",
      netPrice: 34900,
      currency: "CLP",
      purchaseUnit: "TR",
      commercialLengthMm: 6000,
      status: "priced",
    })]);
  });

  it("does not choose between duplicate confirmed presentations", () => {
    const result = resolveSupplierProfilePricePreviews({
      request,
      references: [{ code: "KOM 802", name: "Marco monorriel" }],
      presentations: [presentation(), presentation({ presentationId: "pres-802-second", supplierSku: "other" })],
      providerNames: new Map(),
    });

    expect(result[0]).toMatchObject({ status: "ambiguous", netPrice: null });
  });

  it("prioritizes an exact finish price over Alumco's Titanio base", () => {
    const result = resolveSupplierProfilePricePreviews({
      request: { ...request, familyKey: "universal:aluminio:l32", finishName: "Negro", technicalCodes: ["3201"], providerKey: "alumco" },
      references: [{ code: "3201", name: "Marco" }],
      presentations: [
        presentation({ presentationId: "alumco-ti-3201", providerKey: "alumco", familyKeys: ["universal:aluminio:l32"], technicalCode: "3201", supplierSku: "TI3201A", finishName: "Titanio", netPrice: 10210 }),
        presentation({ presentationId: "fixture-black-3201", providerKey: "alumco", familyKeys: ["universal:aluminio:l32"], technicalCode: "3201", supplierSku: "SKU-NEGRO-TEST", finishName: "Negro", netPrice: 14000 }),
      ],
      providerNames: new Map([["alumco", "Alumco"]]),
    });
    expect(result).toEqual([expect.objectContaining({
      supplierSku: "SKU-NEGRO-TEST",
      netPrice: 14000,
      finishPriceBasis: "specific_finish",
      priceSourceFinishName: "Negro",
    })]);
  });

  it("applies organization-specific provider adjustments and overrides", () => {
    const result = resolveSupplierProfilePricePreviews({
      request,
      references: [{ code: "KOM 802", name: "Marco monorriel" }],
      presentations: [presentation()],
      providerNames: new Map(),
      organizationPricing: {
        adjustments: [{ providerKey: "thermowin-kompen", percentage: 10, active: true }],
        overrides: [],
      },
    });
    expect(result[0]).toMatchObject({ netPrice: 38390, priceSource: "provider_adjustment" });

    const overrideResult = resolveSupplierProfilePricePreviews({
      request,
      references: [{ code: "KOM 802", name: "Marco monorriel" }],
      presentations: [presentation()],
      providerNames: new Map(),
      organizationPricing: {
        adjustments: [{ providerKey: "thermowin-kompen", percentage: 10, active: true }],
        overrides: [{ presentationId: "pres-802-white", netPrice: 40000, currency: "CLP" }],
      },
    });
    expect(overrideResult[0]).toMatchObject({ netPrice: 40000, priceSource: "organization_override" });
  });

  it("keeps missing price visible and never matches another family or finish", () => {
    const result = resolveSupplierProfilePricePreviews({
      request,
      references: [{ code: "KOM 802", name: "Marco monorriel" }],
      presentations: [
        presentation({ familyKeys: ["thermowin:kom-700"] }),
        presentation({ presentationId: "black", finishName: "Negro" }),
      ],
      providerNames: new Map(),
    });
    expect(result).toEqual([expect.objectContaining({
      technicalCode: "KOM 802",
      status: "missing_price",
      netPrice: null,
    })]);
  });
});
