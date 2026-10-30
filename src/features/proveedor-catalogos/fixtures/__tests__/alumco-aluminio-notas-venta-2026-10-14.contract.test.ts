import { resolveSupplierPresentationsForQuoteItem, resolveSupplierProfilePricePreviews } from "../../services/supplier-presentation-resolution.service";
import type { CatalogPresentationPrice } from "../../services/costo-tecnico-parcial.service";
import { supplierCatalogImportSchema } from "../../schemas/catalogo-import.schema";
import { ALUMCO_ALUMINIO_NOTAS_VENTA_2026_10_14 as fixture } from "../alumco-aluminio-notas-venta-2026-10-14";

describe("Alumco · notas de venta 14-10-2026", () => {
  it("transcribe los 42 SKU y conserva los netos por familia, acabado y largo confirmados", () => {
    const parsed = supplierCatalogImportSchema.parse(fixture);
    expect(parsed.supplierKey).toBe("alumco");
    expect(parsed.supplierName).toBe("Alumco");
    expect(parsed.priceListCurrency).toBe("CLP");
    expect(parsed.priceListPublishedOn).toBe("2026-10-14");
    expect(parsed.priceListValidUntil).toBe("2026-10-21");
    expect(parsed.presentations).toHaveLength(42);
    expect(parsed.technicalInputs).toHaveLength(42);
    expect(new Set(parsed.presentations.map((row) => row.sku)).size).toBe(42);
    expect(parsed.presentations.every((row) => row.purchaseUnit === "TR" && row.commercialLengthMm === 6000)).toBe(true);
    const independent = parsed.presentations.filter((row) => row.finishResolution === "finish_independent");
    expect(independent.map((row) => row.sku).sort()).toEqual(["RO3506P", "RO3507P"]);
    expect(independent.every((row) => row.finishCode === null && row.finishName === null)).toBe(true);
    expect(parsed.presentations.filter((row) => row.finishResolution === "specific")
      .every((row) => row.finishCode === "TI" && row.finishName === "Titanio")).toBe(true);
    expect(parsed.technicalInputs.every((row) => row.material === "Aluminio" && row.familyKeys.length === 1)).toBe(true);
  });

  it("suma exactamente los netos impresos y no incorpora un descuento por pronto pago adicional", () => {
    const totals = new Map<string, number>();
    for (const row of fixture.presentations) {
      const invoice = row.associationEvidence.sourceReference.includes("16.51.36") ? "000000984" : "000000986";
      totals.set(invoice, (totals.get(invoice) ?? 0) + (row.netPrice ?? 0));
    }
    expect(totals).toEqual(new Map([["000000984", 336551], ["000000986", 347792]]));
    expect(fixture.presentations.find((row) => row.sku === "TI5001A")?.netPrice).toBe(13351);
    expect(fixture.presentations.find((row) => row.sku === "RO3506P")?.netPrice).toBe(6101);
  });

  it("identifica 2509 y 2510 como perfiles cerrados de L25 con sus precios vigentes", () => {
    expect(fixture.technicalInputs.find((row) => row.sourceCode === "2509")).toMatchObject({
      name: "Jamba cerrada",
      familyKeys: ["universal:aluminio:l25"],
    });
    expect(fixture.technicalInputs.find((row) => row.sourceCode === "2510")).toMatchObject({
      name: "Pierna cerrada",
      familyKeys: ["universal:aluminio:l25"],
    });
    expect(fixture.presentations.find((row) => row.sku === "TI2509A")?.netPrice).toBe(18234);
    expect(fixture.presentations.find((row) => row.sku === "TI2510A")?.netPrice).toBe(18809);
    expect(fixture.presentations.filter((row) => ["TI2509A", "TI2510A"].includes(row.sku))
      .every((row) => row.finishName === "Titanio" && row.commercialLengthMm === 6000)).toBe(true);
  });

  it("mantiene las cuatro referencias L32 Titanio por código y largo de 6 m", () => {
    const expected = [
      ["3201", "TI3201A", 10210],
      ["3202", "TI3202A", 18668],
      ["3204", "TI3204A", 21187],
      ["3208", "TI3208A", 5330],
    ];
    for (const [code, sku, amount] of expected) {
      const technical = fixture.technicalInputs.find((row) => row.sourceCode === code);
      const presentation = fixture.presentations.find((row) => row.sku === sku);
      expect(technical?.familyKeys).toContain("universal:aluminio:l32");
      expect(presentation).toMatchObject({ finishCode: "TI", finishName: "Titanio", purchaseUnit: "TR", commercialLengthMm: 6000, netPrice: amount });
      expect(fixture.technicalInputs.find((row) => row.technicalKey === presentation?.technicalKey)?.sourceCode).toBe(code);
    }
  });

  it("mantiene los subtotales documentados por línea sin cruzar perfiles", () => {
    const totals = new Map<string, number>();
    for (const presentation of fixture.presentations) {
      const technical = fixture.technicalInputs.find((row) => row.technicalKey === presentation.technicalKey)!;
      const familyKey = technical.familyKeys[0]!;
      totals.set(familyKey, (totals.get(familyKey) ?? 0) + (presentation.netPrice ?? 0));
    }
    expect(totals).toEqual(new Map([
      ["universal:aluminio:l5000", 90810],
      ["universal:aluminio:l20", 104976],
      ["universal:aluminio:l25", 140765],
      ["universal:aluminio:l32", 55395],
      ["universal:aluminio:l42", 80285],
      ["universal:aluminio:l12", 59210],
      ["universal:aluminio:l35", 111157],
      ["universal:aluminio:l45", 41745],
    ]));
  });

  it("mantiene separadas las familias y solo reutiliza la equivalencia explícita de Línea 45", () => {
    expect(new Set(fixture.technicalInputs.flatMap((row) => row.familyKeys))).toEqual(new Set([
      "universal:aluminio:l12", "universal:aluminio:l20", "universal:aluminio:l25", "universal:aluminio:l32",
      "universal:aluminio:l35", "universal:aluminio:l42", "universal:aluminio:l45", "universal:aluminio:l5000",
    ]));
    expect(fixture.technicalInputs.find((row) => row.sourceCode === "4502")?.recipeComponentCodes).toEqual(["4522"]);
    expect(fixture.technicalInputs.filter((row) => row.recipeComponentCodes?.length).map((row) => row.sourceCode)).toEqual(["4502"]);
    expect(fixture.technicalInputs.find((row) => row.sourceCode === "4511")?.recipeComponentCodes).toBeUndefined();
  });

  it("resuelve precios de compra Alumco por código, familia y Titanio sin exigir una pauta", () => {
    const rows: CatalogPresentationPrice[] = fixture.presentations.map((presentation) => {
      const technical = fixture.technicalInputs.find((row) => row.technicalKey === presentation.technicalKey)!;
      return {
        presentationId: presentation.sku,
        providerKey: fixture.supplierKey,
        familyKeys: technical.familyKeys,
        configurationKey: null,
        technicalCode: technical.sourceCode,
        recipeComponentCodes: technical.recipeComponentCodes ?? [],
        technicalName: technical.name,
        supplierSku: presentation.sku,
        presentationDescription: presentation.description,
        finishCode: presentation.finishCode ?? "",
        finishName: presentation.finishName,
        finishResolution: presentation.finishResolution,
        purchaseUnit: presentation.purchaseUnit,
        commercialLengthMm: presentation.commercialLengthMm,
        netPrice: presentation.netPrice,
        priceBasis: "commercial_presentation",
        currency: presentation.currency,
        priceListId: "alumco-2026-10-14",
        priceListRevision: fixture.priceListRevision,
      };
    });

    const l5000 = resolveSupplierProfilePricePreviews({
      request: { itemId: "quote-item", familyKey: "universal:aluminio:l5000", finishName: "Titanio", technicalCodes: [], providerKey: "alumco" },
      references: fixture.technicalInputs.filter((row) => row.familyKeys.includes("universal:aluminio:l5000")).map((row) => ({ code: row.sourceCode, name: row.name })),
      presentations: rows,
      providerNames: new Map([["alumco", "Alumco"]]),
    });
    expect(l5000).toHaveLength(7);
    expect(l5000.every((row) => row.status === "priced" && row.providerKey === "alumco" && row.purchaseUnit === "TR" && row.commercialLengthMm === 6000)).toBe(true);

    const l45 = resolveSupplierProfilePricePreviews({
      request: { itemId: "quote-item-45", familyKey: "universal:aluminio:l45", finishName: "Titanio", technicalCodes: ["4522"], providerKey: "alumco" },
      references: [{ code: "4522", name: "Marco puerta" }],
      presentations: rows,
      providerNames: new Map([["alumco", "Alumco"]]),
    });
    expect(l45).toEqual([expect.objectContaining({ technicalCode: "4522", supplierSku: "TI4502A", netPrice: 20274, status: "priced" })]);

    const l32 = resolveSupplierProfilePricePreviews({
      request: { itemId: "quote-item-32", familyKey: "universal:aluminio:l32", finishName: "Titanio", technicalCodes: [], providerKey: "alumco" },
      references: fixture.technicalInputs.filter((row) => row.familyKeys.includes("universal:aluminio:l32")).map((row) => ({ code: row.sourceCode, name: row.name })),
      presentations: rows.map((row) => ({ ...row, priceReferenceStatus: "active_by_ventora_policy" as const, priceListPublishedOn: "2026-10-14", priceListValidUntil: "2026-10-21" })),
      providerNames: new Map([["alumco", "Alumco"]]),
    });
    const l32Expected = [
      ["3201", "TI3201A", 10210],
      ["3202", "TI3202A", 18668],
      ["3204", "TI3204A", 21187],
      ["3208", "TI3208A", 5330],
    ];
    expect(l32).toEqual(expect.arrayContaining(l32Expected.map(([code, sku, netPrice]) => expect.objectContaining({
      technicalCode: code, supplierSku: sku, netPrice, commercialLengthMm: 6000,
      priceReferenceStatus: "active_by_ventora_policy", priceListPublishedOn: "2026-10-14", priceListValidUntil: "2026-10-21",
    }))));
  });

  it.each(["Blanco", "Negro", "Negro Mate", "Nogal", "Roble Dorado", "Antracita"])(
    "aplica el importe base Titanio a L32 %s sin atribuir el SKU Titanio",
    (finishName) => {
      const rows: CatalogPresentationPrice[] = fixture.presentations.map((presentation) => {
        const technical = fixture.technicalInputs.find((row) => row.technicalKey === presentation.technicalKey)!;
        return {
          presentationId: presentation.sku,
          providerKey: "alumco",
          familyKeys: technical.familyKeys,
          technicalCode: technical.sourceCode,
          recipeComponentCodes: technical.recipeComponentCodes ?? [],
          technicalName: technical.name,
          supplierSku: presentation.sku,
          presentationDescription: presentation.description,
          finishCode: presentation.finishCode ?? "",
          finishName: presentation.finishName,
          finishResolution: presentation.finishResolution,
          purchaseUnit: presentation.purchaseUnit,
          commercialLengthMm: presentation.commercialLengthMm,
          netPrice: presentation.netPrice,
          priceBasis: "commercial_presentation",
          currency: "CLP",
          priceListId: "alumco-2026-10-14",
          priceListRevision: fixture.priceListRevision,
          priceReferenceStatus: "active_by_ventora_policy",
          priceListPublishedOn: "2026-10-14",
          priceListValidUntil: "2026-10-21",
        };
      });
      const result = resolveSupplierProfilePricePreviews({
        request: { itemId: `l32-${finishName}`, familyKey: "universal:aluminio:l32", finishName, technicalCodes: [], providerKey: "alumco" },
        references: fixture.technicalInputs.filter((row) => row.familyKeys.includes("universal:aluminio:l32")).map((row) => ({ code: row.sourceCode, name: row.name })),
        presentations: rows,
        providerNames: new Map([["alumco", "Alumco"]]),
        organizationPricing: {
          adjustments: [],
          overrides: [{ presentationId: "TI3201A", netPrice: 99999, currency: "CLP" }],
        },
      });
      expect(result).toHaveLength(4);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          technicalCode: "3201", netPrice: 10210, currency: "CLP", finishPriceBasis: "base_reference_other_finish",
          supplierSku: "", presentationId: "", priceSourceFinishName: "Titanio", priceSourceSupplierSku: "TI3201A",
        }),
      ]));
      expect(result.every((price) => price.status === "priced" && price.supplierSku === "" && price.presentationId === "")).toBe(true);
    }
  );

  it("resuelve Tapa y Portafelpa aunque el acabado elegido sea de otro color", () => {
    const presentations: CatalogPresentationPrice[] = fixture.presentations.map((presentation) => {
      const technical = fixture.technicalInputs.find((row) => row.technicalKey === presentation.technicalKey)!;
      return {
        presentationId: presentation.sku,
        providerKey: fixture.supplierKey,
        familyKeys: technical.familyKeys,
        configurationKey: null,
        technicalCode: technical.sourceCode,
        recipeComponentCodes: [],
        technicalName: technical.name,
        supplierSku: presentation.sku,
        presentationDescription: presentation.description,
        finishCode: presentation.finishCode ?? "",
        finishName: presentation.finishName,
        finishResolution: presentation.finishResolution,
        purchaseUnit: presentation.purchaseUnit,
        commercialLengthMm: presentation.commercialLengthMm,
        netPrice: presentation.netPrice,
        priceBasis: "commercial_presentation",
        currency: presentation.currency,
        priceListId: "alumco-2026-10-14",
        priceListRevision: fixture.priceListRevision,
      };
    });
    const resolved = resolveSupplierProfilePricePreviews({
      request: { itemId: "quote-item-35", familyKey: "universal:aluminio:l35", finishName: "Negro", technicalCodes: ["3506", "3507"], providerKey: "alumco" },
      references: [{ code: "3506", name: "Tapa" }, { code: "3507", name: "Portafelpa" }],
      presentations,
      providerNames: new Map([["alumco", "Alumco"]]),
    });
    expect(resolved).toEqual(expect.arrayContaining([
      expect.objectContaining({ supplierSku: "RO3506P", netPrice: 6101, status: "priced" }),
      expect.objectContaining({ supplierSku: "RO3507P", netPrice: 7255, status: "priced" }),
    ]));
  });

  it("al seleccionar Alumco conserva los códigos del despiece y resuelve solo equivalencias exactas por familia", () => {
    const available = fixture.presentations.map((presentation) => {
      const technical = fixture.technicalInputs.find((row) => row.technicalKey === presentation.technicalKey)!;
      return {
        presentationId: presentation.sku,
        providerKey: fixture.supplierKey,
        supplierSku: presentation.sku,
        technicalCode: technical.sourceCode,
        recipeComponentCodes: technical.recipeComponentCodes ?? [],
        familyKeys: technical.familyKeys,
        finishCode: presentation.finishCode,
        finishName: presentation.finishName,
        finishResolution: presentation.finishResolution,
        commercialLengthMm: presentation.commercialLengthMm,
      };
    });
    const cases = [
      { familyKey: "universal:aluminio:l5000", codes: ["5001", "5002", "5003", "5004", "5005", "5006", "5007"], resolved: ["5001", "5002", "5003", "5004", "5005", "5006", "5007"], missing: [] },
      { familyKey: "universal:aluminio:l12", codes: ["1203", "1201", "1202", "1204"], resolved: ["1203", "1201", "1202", "1204"], missing: [] },
      { familyKey: "universal:aluminio:l20", codes: ["2001", "2002", "2004", "2005", "2009", "2010", "2019"], resolved: ["2001", "2002", "2004", "2005", "2009", "2010", "2019"], missing: [] },
      { familyKey: "universal:aluminio:l25", codes: ["2501", "2502", "2504", "2505", "2507", "2509", "2510"], resolved: ["2501", "2502", "2504", "2505", "2507", "2509", "2510"], missing: [] },
      { familyKey: "universal:aluminio:l32", codes: ["3201", "3202", "3204", "3208"], resolved: ["3201", "3202", "3204", "3208"], missing: [] },
      { familyKey: "universal:aluminio:l42", codes: ["4201", "4202", "4229"], resolved: ["4202", "4229"], missing: ["4201"] },
      { familyKey: "universal:aluminio:l45", codes: ["4522"], resolved: ["4522"], missing: [] },
    ];

    for (const { familyKey, codes, resolved, missing } of cases) {
      const selections = resolveSupplierPresentationsForQuoteItem({
        request: { itemId: `quote-${familyKey}`, familyKey, finishName: "Titanio", technicalCodes: codes, providerKey: "alumco" },
        presentations: available,
      });
      expect(selections.filter((row) => row.status === "resolved").map((row) => row.technicalCode).sort()).toEqual([...resolved].sort());
      expect(selections.filter((row) => row.status === "missing").map((row) => row.technicalCode).sort()).toEqual([...missing].sort());
      expect(selections.filter((row) => row.status === "resolved").every((row) => row.providerKey === "alumco")).toBe(true);
    }
    expect(fixture.technicalInputs.find((row) => row.sourceCode === "4209")?.recipeComponentCodes).toBeUndefined();
  });
});
