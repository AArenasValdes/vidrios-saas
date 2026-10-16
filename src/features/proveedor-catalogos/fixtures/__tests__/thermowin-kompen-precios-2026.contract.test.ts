import { resolveSupplierPresentationsForQuoteItem, type ConfirmedSupplierPresentation } from "../../services/supplier-presentation-resolution.service";
import { supplierCatalogImportSchema } from "../../schemas/catalogo-import.schema";
import { THERMOWIN_KOMPEN_PRECIOS_2026 } from "../thermowin-kompen-precios-2026";

describe("Thermowin Kompen · precios 2026", () => {
  it("mantiene proveedor, familias, CLP neto, presentación TR de 6 m y matriz estable", () => {
    const parsed = supplierCatalogImportSchema.parse(THERMOWIN_KOMPEN_PRECIOS_2026);

    expect(parsed.supplierKey).toBe("thermowin-kompen");
    expect(parsed.priceListRevision).toBe("2026");
    expect(parsed.priceListCurrency).toBe("CLP");
    expect(parsed.presentations).toHaveLength(46);
    expect(parsed.technicalInputs).toHaveLength(30);
    expect(parsed.technicalInputs.every((input) => input.familyKeys.length === 1)).toBe(true);
    expect(parsed.presentations.every((row) => row.currency === "CLP" && ["TR", "UN"].includes(row.purchaseUnit) && row.commercialLengthMm === 6000)).toBe(true);
    expect(new Set(parsed.presentations.map((row) => row.sku)).size).toBe(parsed.presentations.length);
    expect(parsed.presentations.some((row) => row.technicalKey.includes("kom-500"))).toBe(false);
  });

  it("conserva códigos, acabados y precios transcritos sin cruzar familias", () => {
    const bySku = new Map(THERMOWIN_KOMPEN_PRECIOS_2026.presentations.map((row) => [row.sku, row]));
    const expectedPrices = new Map<string, number>([
      ["701-3154", 31421], ["701-0003", 18831], ["KOM701-ANTRACITA", 32993], ["R701", 8003],
      ["607-3154", 9940], ["KOM607-ANTRACITA", 10436], ["427-3154", 15796], ["427-0003", 12981],
      ["KOM427/701-ANTRACITA", 16587], ["KOM709-ANTRACITA", 43109], ["R709", 7318], ["617-0003", 7008],
      ["801-3154", 39194], ["801-0003", 22838], ["KOM801-ANTRACITA", 41154], ["KOM802-ANTRACITA", 53934],
      ["804-3154", 43088], ["804-0003", 25740], ["KOM804-ANTRACITA", 45243], ["R802T-ANTRACITA", 16725],
      ["822-3154", 44848], ["KOM822-ANTRACITA", 47090], ["R822", 16200], ["817-3154", 17689],
      ["817-0003", 7382], ["KOM817-ANTRACITA", 18574], ["506-3154", 8388], ["KOM506-ANTRACITA", 8807],
      ["KOM826-ANTRACITA", 14226], ["505-0003", 4516], ["KOM426/801-3154", 14703], ["426-0003", 11886],
      ["KOM426/801-ANTRACITA", 15437], ["R801T", 10158], ["R804", 8214], ["R800-8518", 6948],
      ["R800-0003", 6948], ["70-001", 11025], ["70-002", 15191], ["70-003", 7350], ["70-004", 5444],
      ["70-005", 4729], ["70-006", 2089], ["70-007", 1045], ["R70-003", 9404], ["R70-004", 8451],
    ]);
    expect(new Map([...bySku].map(([sku, row]) => [sku, row.netPrice]))).toEqual(expectedPrices);

    expect(bySku.get("701-3154")).toMatchObject({ technicalKey: "thermowin:kom-700:KOM 701", finishCode: "3154", finishName: "Nogal", netPrice: 31421 });
    expect(bySku.get("801-0003")).toMatchObject({ technicalKey: "thermowin:kom-800:KOM 801", finishCode: "0003", finishName: "Blanco", netPrice: 22838 });
    expect(bySku.get("KOM801-ANTRACITA")).toMatchObject({ finishName: "Antracita", netPrice: 41154, commercialLengthMm: 6000 });
    expect(bySku.get("R701")).toMatchObject({ technicalKey: "thermowin:kom-700:R701", finishResolution: "finish_independent", netPrice: 8003 });
    expect(bySku.get("R800-8518")).toMatchObject({ technicalKey: "thermowin:kom-800:Riel 800", finishName: "Negro", netPrice: 6948 });
    expect(bySku.get("506-3154")?.technicalKey).toBe("thermowin:kom-800:KOM 506");
    expect(bySku.get("70-002")).toMatchObject({ technicalKey: "thermowin:americana-s70:70-002", finishName: "Blanco", netPrice: 15191, purchaseUnit: "UN", commercialLengthMm: 6000 });
    expect(bySku.get("70-001")).toMatchObject({ netPrice: 11025, purchaseUnit: "UN" });
    expect(bySku.get("R70-004")).toMatchObject({ technicalKey: "thermowin:americana-s70:R70-004", finishResolution: "finish_independent", netPrice: 8451 });
    expect(bySku.get("R800-8518")).toMatchObject({ finishName: "Negro", description: "Riel de aluminio 800 · Negro", netPrice: 6948 });
    expect(bySku.get("R800-0003")).toMatchObject({ finishName: "Mate", description: "Riel de aluminio 800 · Mate", netPrice: 6948 });
    expect(bySku.get("70-001")?.priceEvidence?.note).toContain("por UN");
    expect(bySku.get("70-001")?.priceEvidence?.note).not.toContain("por TR");
    expect(bySku.get("701-3154")?.priceEvidence?.note).toContain("por TR de 6000 mm");
  });

  it("resuelve solo por familia, código, acabado y proveedor, conservando el largo comercial", () => {
    const presentations: ConfirmedSupplierPresentation[] = THERMOWIN_KOMPEN_PRECIOS_2026.presentations.map((row) => {
      const input = THERMOWIN_KOMPEN_PRECIOS_2026.technicalInputs.find((candidate) => candidate.technicalKey === row.technicalKey);
      if (!input) throw new Error(`Missing technical input for ${row.technicalKey}`);
      return {
        presentationId: row.sku,
        providerKey: "thermowin-kompen",
        supplierSku: row.sku,
        technicalCode: input.sourceCode,
        recipeComponentCodes: [],
        familyKeys: input.familyKeys,
        configurationKey: null,
        preferred: false,
        finishCode: row.finishCode,
        finishName: row.finishName,
        finishResolution: row.finishResolution,
        commercialLengthMm: row.commercialLengthMm,
      };
    });

    const result = resolveSupplierPresentationsForQuoteItem({
      request: { providerKey: "thermowin-kompen", familyKey: "thermowin:kom-800", technicalCodes: ["KOM 801"], finishName: "Antracita", configurationKey: null },
      presentations,
    });

    expect(result).toEqual([expect.objectContaining({ technicalCode: "KOM 801", status: "resolved", providerKey: "thermowin-kompen", supplierSku: "KOM801-ANTRACITA", finishName: "Antracita", commercialLengthMm: 6000 })]);
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { providerKey: "thermowin-kompen", familyKey: "thermowin:kom-700", technicalCodes: ["KOM 801"], finishName: "Antracita", configurationKey: null },
      presentations,
    })[0]?.status).toBe("missing");

    const s70 = resolveSupplierPresentationsForQuoteItem({
      request: { providerKey: "thermowin-kompen", familyKey: "thermowin:americana-s70", technicalCodes: ["70-002"], finishName: "Blanco", configurationKey: null },
      presentations,
    });
    expect(s70).toEqual([expect.objectContaining({ technicalCode: "70-002", status: "resolved", supplierSku: "70-002", finishName: "Blanco", commercialLengthMm: 6000 })]);
  });

  it.each([
    ["KOM 701", "Nogal", "701-3154", 31421],
    ["KOM 701", "Blanco", "701-0003", 18831],
    ["KOM 701", "Antracita", "KOM701-ANTRACITA", 32993],
    ["KOM 804", "Nogal", "804-3154", 43088],
    ["KOM 804", "Blanco", "804-0003", 25740],
    ["KOM 804", "Antracita", "KOM804-ANTRACITA", 45243],
  ])("resuelve %s con el PVC %s sin cruzar acabados", (code, finishName, sku, netPrice) => {
    const presentations: ConfirmedSupplierPresentation[] = THERMOWIN_KOMPEN_PRECIOS_2026.presentations.map((row) => {
      const input = THERMOWIN_KOMPEN_PRECIOS_2026.technicalInputs.find((candidate) => candidate.technicalKey === row.technicalKey);
      if (!input) throw new Error(`Missing technical input for ${row.technicalKey}`);
      return {
        presentationId: row.sku,
        providerKey: "thermowin-kompen",
        supplierSku: row.sku,
        technicalCode: input.sourceCode,
        recipeComponentCodes: [],
        familyKeys: input.familyKeys,
        finishCode: row.finishCode,
        finishName: row.finishName,
        finishResolution: row.finishResolution,
        commercialLengthMm: row.commercialLengthMm,
      };
    });
    const familyKey = code.startsWith("KOM 7") ? "thermowin:kom-700" : "thermowin:kom-800";
    const [resolved] = resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "kompen-quote-test", providerKey: "thermowin-kompen", familyKey, technicalCodes: [code], finishName, configurationKey: null },
      presentations,
    });
    expect(resolved).toMatchObject({ status: "resolved", supplierSku: sku, finishName, commercialLengthMm: 6000 });
    expect(THERMOWIN_KOMPEN_PRECIOS_2026.presentations.find((row) => row.sku === sku)?.netPrice).toBe(netPrice);
  });

  it("no cruza el acabado fijo del riel de aluminio con el color del PVC", () => {
    const presentations: ConfirmedSupplierPresentation[] = THERMOWIN_KOMPEN_PRECIOS_2026.presentations.map((row) => {
      const input = THERMOWIN_KOMPEN_PRECIOS_2026.technicalInputs.find((candidate) => candidate.technicalKey === row.technicalKey)!;
      return { presentationId: row.sku, providerKey: "thermowin-kompen", supplierSku: row.sku, technicalCode: input.sourceCode,
        recipeComponentCodes: [], familyKeys: input.familyKeys, finishCode: row.finishCode, finishName: row.finishName,
        finishResolution: row.finishResolution, commercialLengthMm: row.commercialLengthMm };
    });
    const [railForNogal] = resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "kompen-quote-test", providerKey: "thermowin-kompen", familyKey: "thermowin:kom-800", technicalCodes: ["Riel 800"], finishName: "Nogal", configurationKey: null },
      presentations,
    });
    expect(railForNogal).toMatchObject({ status: "missing", presentationId: null, commercialLengthMm: null });
  });
});

