import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import { VERATEC_7400_JUNIO_2026_IMPORT } from "../../fixtures/veratec-7400-junio-2026";
import {
  buildPartialTechnicalCostSnapshot,
  getRecipeAccessoriesFromItemSnapshot,
  technicalCostStatusFromDatabase,
  technicalCostStatusToDatabase,
  type CatalogPresentationPrice,
} from "../costo-tecnico-parcial.service";

function pauta(cuts: Array<{ code: string; item: string; length: number }>): FabricacionTrabajoSnapshot {
  return {
    schemaVersion: 1,
    tipo: "fabricacion_trabajo_snapshot",
    packing: "first_fit_decreasing_sugerido",
    capturedAt: "2026-09-30T12:00:00.000Z",
    itemCountWithPauta: new Set(cuts.map((cut) => cut.item)).size,
    totalBars: 1,
    totalProfilesLinealMm: cuts.reduce((sum, cut) => sum + cut.length, 0),
    totalWasteMm: 0,
    sourcePresentations: [],
    bars: [{
      materialKey: "veratec:7401",
      presentationKey: "veratec:7401|blanco|5800",
      codigoPerfil: cuts[0]?.code ?? "7401",
      nombrePerfil: "Marco corredera 2 hojas",
      acabadoKey: "blanco",
      lineaIds: [7400],
      largoComercialMm: 5800,
      indice: 1,
      despunteInicialMm: 50,
      perdidaCorteMm: 4,
      usadoMm: 0,
      sobranteMm: 0,
      cortes: cuts.map((cut) => ({
        itemId: cut.item,
        codigoItem: cut.item,
        nombreItem: `Ventana ${cut.item}`,
        componenteId: "marco",
        codigoPerfil: cut.code,
        funcion: "Marco corredera",
        corte: "45° / 45°",
        largoMm: cut.length,
      })),
    }],
  };
}

function price(input: Partial<CatalogPresentationPrice> & Pick<CatalogPresentationPrice, "technicalCode" | "supplierSku" | "finishCode" | "finishName" | "commercialLengthMm" | "netPrice">): CatalogPresentationPrice {
  return {
    technicalName: "Marco corredera 2 hojas",
    presentationDescription: input.supplierSku,
    purchaseUnit: "M",
    currency: "CLP",
    priceListId: "list-2026-06",
    priceListRevision: "2026-06",
    finishResolution: "specific",
    priceBasis: "commercial_presentation",
    ...input,
  };
}

describe("buildPartialTechnicalCostSnapshot", () => {
  it("prioriza el precio Arquetipo LEGNO como referencia de una línea universal aunque otro proveedor sea más barato", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "2001", item: "A", length: 1200 }]),
      quoteItems: [{ code: "A", color: "Blanco", catalogLineKey: "ventora:l20", supplierFamilyKey: "universal:aluminio:l20" }],
      availablePrices: [
        price({
          providerKey: "sodal", technicalCode: "2001", supplierSku: "SODAL-2001", finishCode: "", finishName: null,
          finishResolution: "finish_independent", familyKeys: ["universal:aluminio:l20"], commercialLengthMm: 6000, netPrice: 1000,
        }),
        price({
          providerKey: "arquetipo", preferred: true, technicalCode: "2001", supplierSku: "ARQ-2001-LEGNO", finishCode: "LEGNO", finishName: "Legno",
          finishResolution: "finish_independent", familyKeys: ["universal:aluminio:l20"], commercialLengthMm: 6000, netPrice: 70000,
        }),
      ],
    });

    expect(result?.lines).toHaveLength(1);
    expect(result?.lines[0]).toMatchObject({ providerKey: "arquetipo", supplierSku: "ARQ-2001-LEGNO", bars: 1, lineNet: 70000 });
  });

  it("usa costo y largo privados sin llamarlos referencia oficial y deja lo desconocido pendiente", () => {
    const workshop = price({
      presentationId: "own-1", providerKey: "taller:3", origin: "workshop",
      technicalCode: "MARCO-TALLER", supplierSku: "TALLER-MARCO-BLANCO",
      finishCode: "", finishName: "Blanco", commercialLengthMm: 6800,
      netPrice: 32000, priceListId: "taller:3", priceListRevision: "taller-v1",
    });
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "MARCO-TALLER", item: "V1", length: 2800 }, { code: "MARCO-TALLER", item: "V2", length: 2800 }]),
      quoteItems: [{ code: "V1", color: "Ventana", finishName: "Blanco" }, { code: "V2", color: "Ventana", finishName: "Blanco" }],
      availablePrices: [workshop],
    });
    expect(result?.lines[0]).toMatchObject({ bars: 1, lineNet: 32000, effectivePriceSource: "workshop", priceListRevision: "taller-v1" });
    expect(result?.status).toBe("partial");
    const missingPrice = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "MARCO-TALLER", item: "V1", length: 2800 }]),
      quoteItems: [{ code: "V1", color: "Ventana", finishName: "Blanco" }],
      availablePrices: [{ ...workshop, netPrice: null }],
    });
    expect(missingPrice?.lines).toHaveLength(0);
    expect(missingPrice?.missing.some((entry) => entry.technicalCode === "MARCO-TALLER")).toBe(true);
    expect(missingPrice?.missing.find((entry) => entry.technicalCode === "MARCO-TALLER")?.reason).toMatch(/falta un costo de compra/);
  });
  it("lee únicamente consumos existentes en el snapshot por ítem y tolera snapshots legacy nulos", () => {
    expect(getRecipeAccessoriesFromItemSnapshot(null, "historic")).toEqual([]);
    expect(getRecipeAccessoriesFromItemSnapshot({ result: { accesorios: [
      { codigo: "SA01005", nombre: "Cepillo / Felpa", cantidadUnidades: 1 },
      { codigo: "", nombre: "", cantidadUnidades: 3 },
      { codigo: "x", nombre: "Inválido", cantidadUnidades: 0 },
    ] } }, "A")).toEqual([
      { itemCode: "A", recipeAccessoryCode: "SA01005", description: "Cepillo / Felpa", quantity: 1, unit: "unidad" },
    ]);
  });

  it("traduce estados de costo a los valores del CHECK de Postgres y viceversa", () => {
    expect(technicalCostStatusToDatabase("partial")).toBe("parcial");
    expect(technicalCostStatusToDatabase("complete")).toBe("completo");
    expect(technicalCostStatusFromDatabase("parcial")).toBe("partial");
    expect(technicalCostStatusFromDatabase("completo")).toBe("complete");
    expect(technicalCostStatusToDatabase("no_data")).toBe("sin_datos");
    expect(technicalCostStatusFromDatabase("sin_datos")).toBe("no_data");
    expect(technicalCostStatusFromDatabase("partial")).toBeNull();
  });

  it("resuelve refuerzos independientes aunque el ítem tenga un acabado comercial", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "69014STL001", item: "A", length: 1800 }]),
      quoteItems: [{ code: "A", color: "Blanco" }],
      availablePrices: [price({
        technicalCode: "69014STL001",
        supplierSku: "69014STL001",
        finishCode: "",
        finishName: null,
        finishResolution: "finish_independent",
        commercialLengthMm: 5800,
        netPrice: 14635,
      })],
    });

    expect(result?.lines[0]).toMatchObject({
      technicalCode: "69014STL001",
      supplierSku: "69014STL001",
      finishName: "Sin acabado específico",
      bars: 1,
      lineNet: 14635,
    });
  });

  it("selecciona SKUs explícitos por acabado y largo, y comparte una barra entre dos ítems", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([
        { code: "7401", item: "A", length: 2000 },
        { code: "7401", item: "B", length: 2100 },
      ]),
      quoteItems: [
        { code: "A", color: "Blanco", glassDescription: "Vidrio monolítico 4 mm" },
        { code: "B", color: "Blanco", glassDescription: "Vidrio monolítico 4 mm" },
      ],
      availablePrices: [
        price({ technicalCode: "7401", supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: 5800, netPrice: 31476 }),
        price({ technicalCode: "7401", supplierSku: "67401VER200", finishCode: "200", finishName: "Negro", commercialLengthMm: 6800, netPrice: 85259 }),
        price({ technicalCode: "7401", supplierSku: "67401VER079", finishCode: "079", finishName: "Negro Mate", commercialLengthMm: 6800, netPrice: 85259 }),
      ],
      calculatedAt: "2026-09-30T12:01:00.000Z",
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe("partial");
    expect(result?.lines).toHaveLength(1);
    expect(result?.lines[0]).toMatchObject({
      supplierSku: "67401VER000",
      commercialLengthMm: 5800,
      bars: 1,
      lineNet: 31476,
      cuts: [
        { itemCode: "B", cutLengthMm: 2100 },
        { itemCode: "A", cutLengthMm: 2000 },
      ],
    });
    expect(result?.missing.map((entry) => entry.description)).toEqual(expect.arrayContaining([
      "Vidrio monolítico 4 mm",
    ]));
    expect(result?.assumptions).toEqual([]);
  });

  it("resuelve el riel por mapping funcional y no mezcla barras físicas de acabados distintos", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([
        { code: "AB01016-E", item: "A", length: 1088 },
        { code: "AB01016-E", item: "B", length: 1088 },
      ]),
      quoteItems: [{ code: "A", color: "Blanco" }, { code: "B", color: "Negro" }],
      availablePrices: [price({
        technicalCode: "61016VER001",
        recipeComponentCodes: ["AB01016-E"],
        technicalName: "Riel Sliding 7400",
        supplierSku: "61016VER001",
        finishCode: "",
        finishName: null,
        finishResolution: "finish_independent",
        commercialLengthMm: 5800,
        netPrice: 10940,
      })],
    });

    expect(result?.lines).toHaveLength(2);
    expect(result?.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({
        technicalCode: "AB01016-E",
        supplierTechnicalCode: "61016VER001",
        supplierSku: "61016VER001",
        commercialLengthMm: 5800,
        bars: 1,
        lineNet: 10940,
        cuts: [{ itemCode: "A", cutLengthMm: 1088 }],
      }),
      expect.objectContaining({
        technicalCode: "AB01016-E",
        supplierTechnicalCode: "61016VER001",
        supplierSku: "61016VER001",
        commercialLengthMm: 5800,
        bars: 1,
        lineNet: 10940,
        cuts: [{ itemCode: "B", cutLengthMm: 1088 }],
      }),
    ]));
  });

  it("mantiene pendientes los vidrios elegidos por cada ítem sin imponer un espesor del proveedor", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "7401", item: "A", length: 2000 }]),
      quoteItems: [
        { code: "A", color: "Blanco", glassDescription: "Monolítico 4 mm" },
        { code: "B", color: "Blanco", glassDescription: "DVH 4+10+5" },
      ],
      availablePrices: [price({ technicalCode: "7401", supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: 5800, netPrice: 31476 })],
    });

    expect(result?.missing.map((entry) => entry.description)).toEqual(expect.arrayContaining([
      "Monolítico 4 mm", "DVH 4+10+5",
    ]));
    expect(result?.knownNetTotal).toBe(31476);
  });

  it("expone consumos de accesorios pendientes uno por uno con cantidad agregada sin inventar precios", () => {
    const accessory = {
      itemCode: "A",
      recipeAccessoryCode: null,
      description: "Tope Corredera",
      quantity: 2,
      unit: "unidad",
    };
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "7401", item: "A", length: 2000 }]),
      quoteItems: [
        { code: "A", color: "Blanco", recipeAccessories: [accessory] },
        { code: "B", color: "Blanco", recipeAccessories: [{ ...accessory, itemCode: "B", quantity: 3 }] },
      ],
      availablePrices: [price({
        technicalCode: "7401", supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco",
        commercialLengthMm: 5800, netPrice: 31476,
      })],
    });

    expect(result?.missing).toEqual(expect.arrayContaining([
      expect.objectContaining({ description: "Tope Corredera", quantity: 5, unit: "unidad" }),
      expect.objectContaining({ description: "Vidrio" }),
    ]));
    expect(result?.missing.some((entry) => entry.description === "Accesorios de la receta")).toBe(false);
  });

  it("valoriza el accesorio con mapping explícito y conserva pendiente la goma sin equivalencia confirmada", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "7401", item: "A", length: 2000 }]),
      quoteItems: [{
        code: "A",
        color: "Blanco",
        recipeAccessories: [
          { itemCode: "A", recipeAccessoryCode: null, description: "Tope Corredera", quantity: 2, unit: "unidad" },
          { itemCode: "A", recipeAccessoryCode: null, description: "Goma Tope Corredera", quantity: 2, unit: "unidad" },
        ],
      }],
      availablePrices: [
        price({ technicalCode: "7401", supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: 5800, netPrice: 31476 }),
        price({
          technicalCode: "61012VER000", recipeAccessoryNames: ["Tope Corredera"], technicalName: "Tope estanco Sliding 2 rieles",
          supplierSku: "61012VER000", finishCode: "000", finishName: "Blanco", purchaseUnit: "PCS",
          commercialLengthMm: null, netPrice: 1076,
        }),
      ],
    });

    expect(result?.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ technicalCode: "Tope Corredera", supplierTechnicalCode: "61012VER000", supplierSku: "61012VER000", quantity: 2, purchaseUnit: "PCS", commercialLengthMm: null, lineNet: 2152 }),
    ]));
    expect(result?.missing).toEqual(expect.arrayContaining([
      expect.objectContaining({ description: "Goma Tope Corredera", quantity: 2, unit: "unidad" }),
    ]));
  });

  it("mantiene pendiente un consumo por unidad frente a precio KG o PAIR sin conversión documentada", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "7401", item: "A", length: 2000 }]),
      quoteItems: [{ code: "A", color: "Blanco", recipeAccessories: [{ itemCode: "A", recipeAccessoryCode: null, description: "Accesorio", quantity: 2, unit: "unidad" }] }],
      availablePrices: [
        price({ technicalCode: "7401", supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: 5800, netPrice: 31476 }),
        price({ technicalCode: "OTHER", recipeAccessoryNames: ["Accesorio"], supplierSku: "KG-001", finishCode: "000", finishName: "Blanco", commercialLengthMm: null, purchaseUnit: "KG", netPrice: 1000 }),
      ],
    });
    expect(result?.lines.find((line) => line.supplierSku === "KG-001")).toBeUndefined();
    expect(result?.missing).toEqual(expect.arrayContaining([expect.objectContaining({ description: "Accesorio", quantity: 2 })]));
  });

  it("usa el SKU negro de 6,8 m; no deriva SKU ni largo a partir del código", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "7401", item: "A", length: 6000 }]),
      quoteItems: [{ code: "A", color: "Negro" }],
      availablePrices: [
        price({ technicalCode: "7401", supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: 5800, netPrice: 31476 }),
        price({ technicalCode: "7401", supplierSku: "67401VER200", finishCode: "200", finishName: "Negro", commercialLengthMm: 6800, netPrice: 85259 }),
      ],
    });

    expect(result?.lines[0]).toMatchObject({ supplierSku: "67401VER200", commercialLengthMm: 6800, lineNet: 85259 });
  });

  it.each([
    { finish: "Blanco", finishCode: "000", sku: "67401VER000", length: 5800, price: 31476 },
    { finish: "Nogal", finishCode: "153", sku: "67401VER153", length: 5800, price: 58612 },
    { finish: "Roble Dorado", finishCode: "043", sku: "67401VER043", length: 5800, price: 58612 },
    { finish: "Antracita", finishCode: "199", sku: "67401VER199", length: 5800, price: 58069 },
    { finish: "Negro", finishCode: "200", sku: "67401VER200", length: 6800, price: 85259 },
    { finish: "Negro Mate", finishCode: "079", sku: "67401VER079", length: 6800, price: 85259 },
  ])("resuelve y empaqueta 67401 con presentación $sku según lista 2026-06", ({ finish, finishCode, sku, length, price: netPrice }) => {
    const technicalInput = VERATEC_7400_JUNIO_2026_IMPORT.technicalInputs.find(
      (entry) => entry.technicalKey === "veratec-7400:marco-2h"
    );
    const sourceRow = VERATEC_7400_JUNIO_2026_IMPORT.presentations.find((entry) => entry.sku === sku);
    expect(technicalInput?.recipeComponentCodes).toContain("67401VER");
    expect(sourceRow).toMatchObject({ finishCode, commercialLengthMm: length, netPrice });

    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "67401VER", item: "A", length: 5000 }]),
      quoteItems: [{ code: "A", color: finish }],
      availablePrices: [price({
        technicalCode: technicalInput?.sourceCode ?? "",
        recipeComponentCodes: technicalInput?.recipeComponentCodes,
        supplierSku: sku,
        finishCode,
        finishName: finish,
        commercialLengthMm: length,
        netPrice,
      })],
    });

    expect(result?.lines).toHaveLength(1);
    expect(result?.lines[0]).toMatchObject({ supplierSku: sku, commercialLengthMm: length, bars: 1, netPricePerPresentation: netPrice });
    expect(result?.missing.some((row) => row.technicalCode === "67401VER" && /largo suficiente/.test(row.reason))).toBe(false);
  });

  it("costo utiliza la presentación elegida por la pauta y cobra las barras realmente empaquetadas", () => {
    const source = pauta([
      { code: "67401VER", item: "A", length: 3000 },
      { code: "67401VER", item: "B", length: 3000 },
    ]);
    const whiteBars = [0, 1].map((index) => ({
      ...source.bars[0]!,
      presentationKey: "perfil:7401|blanco|5800|p-white",
      supplierPresentationId: "p-white",
      supplierProviderKey: "xelena",
      supplierSku: "67401VER000",
      supplierFinishCode: "000",
      supplierFinishName: "Blanco",
      largoComercialMm: 5800,
      indice: index + 1,
      cortes: [{
        ...source.bars[0]!.cortes[index]!,
        codigoPerfil: "67401VER",
        supplierPresentationId: "p-white",
        supplierProviderKey: "xelena",
        supplierSku: "67401VER000",
        largoMm: 3000,
      }],
    }));
    const workSnapshot: FabricacionTrabajoSnapshot = {
      ...source,
      totalBars: 2,
      bars: whiteBars,
      sourcePresentations: [{
        technicalInputKey: "perfil:7401",
        presentationKey: "perfil:7401|blanco|5800|p-white",
        lineTemplateId: 7400,
        catalogLineKey: "ventora:veratec-7400-corredera",
        finishKey: "blanco",
        commercialLengthMm: 5800,
        supplierPresentationId: "p-white",
        providerKey: "xelena",
        supplierSku: "67401VER000",
        finishCode: "000",
        finishName: "Blanco",
      }],
    };
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot,
      quoteItems: [{ code: "A", color: "Blanco" }, { code: "B", color: "Blanco" }],
      availablePrices: [
        price({ presentationId: "p-white", providerKey: "xelena", technicalCode: "7401", recipeComponentCodes: ["67401VER"], supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: 5800, netPrice: 10000, priceBasis: "per_meter" }),
        price({ presentationId: "p-black", providerKey: "xelena", technicalCode: "7401", recipeComponentCodes: ["67401VER"], supplierSku: "67401VER200", finishCode: "200", finishName: "Negro", commercialLengthMm: 6800, netPrice: 1, priceBasis: "commercial_presentation" }),
      ],
    });

    expect(result?.lines).toHaveLength(1);
    expect(result?.lines[0]).toMatchObject({
      presentationId: "p-white",
      supplierSku: "67401VER000",
      commercialLengthMm: 5800,
      bars: 2,
      priceBasis: "per_meter",
      netPricePerPresentation: 58000,
      lineNet: 116000,
    });
  });

  it("asocia el alias de receta 6306 solo al junquillo documentado de 4 mm", () => {
    const technicalInput = VERATEC_7400_JUNIO_2026_IMPORT.technicalInputs.find(
      (entry) => entry.sourceCode === "6306"
    );
    const whiteBead = VERATEC_7400_JUNIO_2026_IMPORT.presentations.find(
      (entry) => entry.sku === "66306VER000"
    );
    expect(technicalInput?.recipeComponentCodes).toEqual(["6306"]);
    expect(whiteBead).toMatchObject({ technicalKey: "veratec:junquillo-4mm", commercialLengthMm: 5800, netPrice: 7582 });
    if (!technicalInput || !whiteBead) throw new Error("Fixture Veratec 4 mm incompleto");

    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "6306", item: "A", length: 1800 }]),
      quoteItems: [{ code: "A", color: "Blanco", glassDescription: "Monolítico 4 mm" }],
      availablePrices: [price({
        technicalCode: technicalInput.sourceCode,
        recipeComponentCodes: technicalInput?.recipeComponentCodes,
        supplierSku: whiteBead.sku,
        finishCode: whiteBead.finishCode ?? "",
        finishName: whiteBead.finishName,
        commercialLengthMm: whiteBead.commercialLengthMm,
        netPrice: whiteBead.netPrice,
      })],
    });

    expect(result?.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ technicalCode: "6306", supplierSku: "66306VER000", commercialLengthMm: 5800 }),
    ]));
    expect(VERATEC_7400_JUNIO_2026_IMPORT.presentations.some((entry) => entry.sku.startsWith("67464VER"))).toBe(false);
  });

  it("resuelve Blanco y Negro desde el hex de presentación guardado cuando color contiene el tipo de pieza", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([
        { code: "7401", item: "A", length: 2000 },
        { code: "7401", item: "B", length: 2100 },
      ]),
      quoteItems: [
        { code: "A", color: "Ventana", colorHex: "#ffffff" },
        { code: "B", color: "Ventana", colorHex: "#2a2a2a" },
      ],
      availablePrices: [
        price({ technicalCode: "7401", supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: 5800, netPrice: 31476 }),
        price({ technicalCode: "7401", supplierSku: "67401VER200", finishCode: "200", finishName: "Negro", commercialLengthMm: 6800, netPrice: 85259 }),
      ],
    });

    expect(result?.lines.map((line) => ({ sku: line.supplierSku, finish: line.finishName, bars: line.bars }))).toEqual([
      { sku: "67401VER000", finish: "Blanco", bars: 1 },
      { sku: "67401VER200", finish: "Negro", bars: 1 },
    ]);
  });

  it("admite más de un largo comercial para el mismo insumo y acabado", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([
        { code: "7401", item: "A", length: 3000 },
        { code: "7401", item: "B", length: 3000 },
      ]),
      quoteItems: [{ code: "A", color: "Blanco" }, { code: "B", color: "Blanco" }],
      availablePrices: [
        price({ technicalCode: "7401", supplierSku: "FRAME-WHITE-5800", finishCode: "000", finishName: "Blanco", commercialLengthMm: 5800, netPrice: 31000 }),
        price({ technicalCode: "7401", supplierSku: "FRAME-WHITE-6800", finishCode: "000-L", finishName: "Blanco", commercialLengthMm: 6800, netPrice: 35000 }),
      ],
    });

    expect(result?.lines).toHaveLength(1);
    expect(result?.lines[0]).toMatchObject({ supplierSku: "FRAME-WHITE-6800", commercialLengthMm: 6800, bars: 1 });
  });

  it("no cruza una presentación privada de otra configuración", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "MARCO", item: "V1", length: 2000 }]),
      quoteItems: [{ code: "V1", color: "Blanco", configurationKey: "sliding-2h" }],
      availablePrices: [price({
        technicalCode: "MARCO", supplierSku: "TALLER-3H", finishName: "Blanco",
        configurationKey: "sliding-3h", commercialLengthMm: 5800, netPrice: 20000,
      })],
    });
    expect(result?.lines).toHaveLength(0);
    expect(result?.knownNetTotal).toBeNull();
    expect(result?.missing).toEqual(expect.arrayContaining([
      expect.objectContaining({ technicalCode: "MARCO", reason: expect.stringContaining("No hay presentación") }),
    ]));
  });

  it("no incluye asociaciones desconocidas ni precio de base desconocida como cero", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "7401", item: "A", length: 2000 }]),
      quoteItems: [{ code: "A", color: "Blanco" }],
      availablePrices: [price({
        technicalCode: "7401",
        supplierSku: "NO-ASOCIADO",
        finishCode: "000",
        finishName: "Blanco",
        commercialLengthMm: 5800,
        netPrice: 31476,
        priceBasis: "unknown",
      })],
    });

    expect(result?.lines).toHaveLength(0);
    expect(result?.knownNetTotal).toBeNull();
    expect(result?.missing).toEqual(expect.arrayContaining([
      expect.objectContaining({ technicalCode: "7401", reason: expect.stringContaining("base de precio confirmada") }),
    ]));
  });

  it("valora por metro lineal usando el largo comercial explícito", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([{ code: "7401", item: "A", length: 2000 }]),
      quoteItems: [{ code: "A", color: "Blanco" }],
      availablePrices: [price({
        technicalCode: "7401",
        supplierSku: "WH-7401-WHITE-6M",
        finishCode: "W",
        finishName: "Blanco",
        commercialLengthMm: 6000,
        netPrice: 10000,
        priceBasis: "per_meter",
      })],
    });

    expect(result?.lines[0]).toMatchObject({ commercialLengthMm: 6000, bars: 1, netPricePerPresentation: 60000, lineNet: 60000, priceBasis: "per_meter" });
  });

  it("congela fuente, referencia, precio propio y revisión sin mutar el snapshot anterior", () => {
    const reference = price({ technicalCode: "AB01016-E", supplierSku: "61016VER001", presentationId: "rail-1", providerKey: "xelena", finishCode: "", finishName: null, finishResolution: "finish_independent", commercialLengthMm: 5800, netPrice: 10940 });
    const input = { workSnapshot: pauta([{ code: "AB01016-E", item: "A", length: 1088 }]), quoteItems: [{ code: "A", color: "Blanco" }], availablePrices: [reference], calculatedAt: "2026-10-02T12:00:00Z" };
    const original = buildPartialTechnicalCostSnapshot(input);
    const adjusted = buildPartialTechnicalCostSnapshot({ ...input, organizationPricing: { adjustments: [{ providerKey: "xelena", percentage: -10, active: true }], overrides: [] } });
    const overridden = buildPartialTechnicalCostSnapshot({ ...input, organizationPricing: { adjustments: [{ providerKey: "xelena", percentage: -10, active: true }], overrides: [{ presentationId: "rail-1", netPrice: 8000, currency: "CLP" }] } });
    expect(original?.lines[0]).toMatchObject({ presentationId: "rail-1", providerKey: "xelena", sourcePrice: 10940, netPricePerPresentation: 10940, effectivePriceSource: "reference", priceListRevision: "2026-06" });
    expect(adjusted?.lines[0]).toMatchObject({ netPricePerPresentation: 9846, effectivePriceSource: "provider_adjustment", adjustmentPercent: -10 });
    expect(overridden?.lines[0]).toMatchObject({ netPricePerPresentation: 8000, effectivePriceSource: "organization_override", adjustmentPercent: null });
    expect(original?.lines[0].netPricePerPresentation).toBe(10940);
    expect(buildPartialTechnicalCostSnapshot({ ...input, organizationPricing: { adjustments: [], overrides: [{ presentationId: "rail-1", netPrice: 7000, currency: "CLP" }] } })?.lines[0].netPricePerPresentation).toBe(7000);
    expect(original?.lines[0].netPricePerPresentation).toBe(10940);
  });

  it("resuelve dos proveedores en la misma cotización sin mezclar ajustes, overrides ni revisiones", () => {
    const result = buildPartialTechnicalCostSnapshot({
      workSnapshot: pauta([
        { code: "FRAME-A", item: "A", length: 1800 },
        { code: "FRAME-B", item: "B", length: 1900 },
      ]),
      quoteItems: [{ code: "A", color: "Blanco" }, { code: "B", color: "Blanco" }],
      availablePrices: [
        price({
          technicalCode: "FRAME-A", supplierSku: "A-5800", presentationId: "presentation-a",
          providerKey: "provider-a", finishCode: "W", finishName: "Blanco", commercialLengthMm: 5800,
          netPrice: 10000, priceListId: "list-a-v3", priceListRevision: "a-v3",
        }),
        price({
          technicalCode: "FRAME-B", supplierSku: "B-6000", presentationId: "presentation-b",
          providerKey: "provider-b", finishCode: "W", finishName: "Blanco", commercialLengthMm: 6000,
          netPrice: 12000, priceListId: "list-b-r8", priceListRevision: "b-r8",
        }),
      ],
      organizationPricing: {
        adjustments: [{ providerKey: "provider-a", percentage: -10, active: true }],
        overrides: [{ presentationId: "presentation-b", netPrice: 8500, currency: "CLP" }],
      },
    });

    expect(result?.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerKey: "provider-a", supplierSku: "A-5800", netPricePerPresentation: 9000,
        effectivePriceSource: "provider_adjustment", adjustmentPercent: -10,
        priceListId: "list-a-v3", priceListRevision: "a-v3",
      }),
      expect.objectContaining({
        providerKey: "provider-b", supplierSku: "B-6000", sourcePrice: 12000,
        netPricePerPresentation: 8500, effectivePriceSource: "organization_override",
        priceListId: "list-b-r8", priceListRevision: "b-r8",
      }),
    ]));
    expect(result?.knownNetTotal).toBe(17500);
  });

});
