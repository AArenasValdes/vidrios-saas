import { ARQUETIPO_CATALOGO_2026_10_05 } from "../arquetipo-catalogo-2026-10-05";
import { resolveSupplierPresentationsForQuoteItem, type ConfirmedSupplierPresentation } from "../../services/supplier-presentation-resolution.service";

const quotedNetPrices: Readonly<Record<string, number>> = {
  "30895001": 13477, "30895002": 12230, "30895004": 13399, "30895005": 15970,
  "30895003": 14256, "30895006": 14412, "30895007": 13477,
  "30892001": 21189, "30892002": 18852, "30892004": 15580, "30892005": 18151,
  "30892009": 16826, "30892010": 16982, "30892019": 16203,
  "30892501": 27888, "30892502": 26876, "30892504": 18384, "30892505": 26097,
  "30892509": 20877, "30892510": 20721, "30892507": 20799,
  "30893201": 11658, "30893202": 18319, "30893208": 5299, "30893204": 20590,
  "30894209": 15140, "30894202": 24375, "30894204": 29447, "30894229": 6510,
};

describe("contrato de códigos y precios del catálogo Arquetipo", () => {
  it("conserva las diez familias, 84 presentaciones y 29 precios de la cotización 27811", () => {
    const technicalByKey = new Map(ARQUETIPO_CATALOGO_2026_10_05.technicalInputs.map((input) => [input.technicalKey, input]));
    const familyKeys = new Set(ARQUETIPO_CATALOGO_2026_10_05.technicalInputs.flatMap((input) => input.familyKeys ?? []));
    const priced = ARQUETIPO_CATALOGO_2026_10_05.presentations.filter((presentation) => presentation.netPrice != null);

    expect(familyKeys).toEqual(new Set([
      "universal:aluminio:l12", "universal:aluminio:l15", "universal:aluminio:l20", "universal:aluminio:l25",
      "universal:aluminio:l32", "universal:aluminio:l35", "universal:aluminio:l42", "universal:aluminio:l45",
      "universal:aluminio:l4000", "universal:aluminio:l5000",
    ]));
    expect(ARQUETIPO_CATALOGO_2026_10_05.presentations).toHaveLength(84);
    expect(priced).toHaveLength(29);
    expect(priced.reduce((sum, presentation) => sum + (presentation.netPrice ?? 0), 0)).toBe(513984);
    expect(Object.keys(quotedNetPrices)).toHaveLength(29);

    for (const [sku, netPrice] of Object.entries(quotedNetPrices)) {
      const presentation = ARQUETIPO_CATALOGO_2026_10_05.presentations.find((entry) => entry.sku === sku);
      const technical = presentation ? technicalByKey.get(presentation.technicalKey) : null;
      expect(presentation).toMatchObject({ netPrice, purchaseUnit: "TIRA", commercialLengthMm: 6000 });
      expect(technical?.sourceCode).toBe(sku.slice(4));
      expect(technical?.familyKeys).toHaveLength(1);
    }

    expect(ARQUETIPO_CATALOGO_2026_10_05.presentations.filter((entry) => entry.netPrice == null)).toHaveLength(55);
  });

  it("no asigna el precio Arquetipo de 4209 al código técnico 4201", () => {
    const technicalByKey = new Map(ARQUETIPO_CATALOGO_2026_10_05.technicalInputs.map((input) => [input.technicalKey, input]));
    const priced4209 = ARQUETIPO_CATALOGO_2026_10_05.presentations.find((entry) => entry.sku === "30894209");
    const technical4201 = ARQUETIPO_CATALOGO_2026_10_05.technicalInputs.find((input) => input.sourceCode === "4201");
    const presentation = ARQUETIPO_CATALOGO_2026_10_05.presentations.find((entry) => entry.sku === "30894209")!;
    const input = technicalByKey.get(presentation.technicalKey)!;
    const confirmed: ConfirmedSupplierPresentation = {
      presentationId: presentation.sku,
      providerKey: "arquetipo",
      supplierSku: presentation.sku,
      technicalCode: input.sourceCode,
      recipeComponentCodes: input.recipeComponentCodes ?? [],
      familyKeys: input.familyKeys ?? [],
      finishCode: null,
      finishName: null,
      finishResolution: "finish_independent",
      commercialLengthMm: presentation.commercialLengthMm,
      preferred: true,
    };

    expect(technicalByKey.get(priced4209!.technicalKey)?.sourceCode).toBe("4209");
    expect(priced4209?.netPrice).toBe(15140);
    expect(technical4201).toBeUndefined();
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "L42", familyKey: "universal:aluminio:l42", finishName: "Blanco", technicalCodes: ["4201"] },
      presentations: [confirmed],
    })[0]).toMatchObject({ status: "missing", technicalCode: "4201", supplierSku: null });
  });
});
