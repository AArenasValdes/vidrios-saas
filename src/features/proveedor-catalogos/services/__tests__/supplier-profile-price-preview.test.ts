import {
  resolveQuoteSupplierProfileReferences,
  resolveSupplierProfilePricePreviews,
  resolveSupplierTechnicalCodesForQuote,
} from "../supplier-presentation-resolution.service";
import type { CatalogPresentationPrice } from "../costo-tecnico-parcial.service";
import { buildSodalL25Recipe } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";

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
  it.each([
    ["monolitico_pierna_abierta_2h_1800x1500", ["2503", "2506", "2507"], ["2509", "2510", "2511R", "2512R"]],
    ["monolitico_pierna_cerrada_2h_1800x1500", ["2509", "2510", "2507"], ["2503", "2511R", "2512R"]],
    ["monolitico_pierna_abierta_reforzada_2h_1800x1500", ["2503", "2512R", "2511R"], ["2509", "2510"]],
  ] as const)("uses only the exact L25 recipe profiles for %s", (recipeId, expectedCodes, staleCodes) => {
    const recipe = buildSodalL25Recipe(recipeId);
    const references = resolveQuoteSupplierProfileReferences({
      recipeProfiles: recipe.definition.perfiles.map((profile) => ({
        code: profile.codigoPerfil,
        name: profile.nombrePerfil,
      })),
      documentedProfiles: [
        { code: "2509", name: "Referencia de catálogo no requerida" },
        { code: "2511R", name: "Referencia complementaria" },
      ],
      requireExactRecipe: true,
    });

    const recipeCodes = [...new Set(recipe.definition.perfiles.map((profile) => profile.codigoPerfil))];
    expect(references.map((profile) => profile.technicalCode).sort()).toEqual(recipeCodes.sort());
    expect(expectedCodes.every((code) => recipeCodes.includes(code))).toBe(true);
    staleCodes.forEach((code) => {
      expect(references.map((profile) => profile.technicalCode)).not.toContain(code);
    });
  });

  it("does not substitute general references when an exact L25 recipe is unavailable", () => {
    expect(resolveQuoteSupplierProfileReferences({
      recipeProfiles: [],
      documentedProfiles: [
        { code: "2503", name: "Jamba" },
        { code: "2506", name: "Marco" },
      ],
      requireExactRecipe: true,
    })).toEqual([]);
  });

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

  it("returns compatible prices for each provider in one response for local provider switching", () => {
    const result = resolveSupplierProfilePricePreviews({
      request: { ...request, providerKey: "arquetipo" },
      references: [{ code: "KOM 802", name: "Marco monorriel" }],
      presentations: [
        presentation({ providerKey: "arquetipo", presentationId: "arquetipo-802", netPrice: 34900 }),
        presentation({ providerKey: "alumco", presentationId: "alumco-802", netPrice: 36500 }),
      ],
      providerNames: new Map([["arquetipo", "Arquetipo"], ["alumco", "Alumco"]]),
    });

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ providerKey: "arquetipo", netPrice: 34900, status: "priced" }),
      expect.objectContaining({ providerKey: "alumco", netPrice: 36500, status: "priced" }),
    ]));
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
