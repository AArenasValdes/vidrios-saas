import { VERATEC_7400_JUNIO_2026_IMPORT } from "../../fixtures/veratec-7400-junio-2026";
import { VERATEC_FAMILIES_JUNIO_2026_IMPORT } from "../../fixtures/veratec-familias-junio-2026";
import { supplierCatalogImportSchema } from "../catalogo-import.schema";

describe("supplierCatalogImportSchema / Veratec 7400", () => {
  it("valida el lote y conserva lista y fuente técnica como revisiones independientes", () => {
    const parsed = supplierCatalogImportSchema.parse(VERATEC_7400_JUNIO_2026_IMPORT);
    expect(parsed.technicalSourcePublisher).toBe("Alumétrica");
    expect(parsed.priceListRevision).toBe("2026-06");
    expect(parsed.priceListPublishedOn).toBeNull();
    expect(parsed.technicalInputs).toHaveLength(8);
    expect(parsed.presentations).toHaveLength(25);
  });

  it("conserva SKU y largo observados por fila sin derivarlos por sufijo", () => {
    const parsed = supplierCatalogImportSchema.parse(VERATEC_7400_JUNIO_2026_IMPORT);
    const whiteFrame = parsed.presentations.find((entry) => entry.sku === "67401VER000");
    const blackFrame = parsed.presentations.find((entry) => entry.sku === "67401VER200");
    expect(whiteFrame).toMatchObject({ technicalKey: "veratec-7400:marco-2h", commercialLengthMm: 5800 });
    expect(blackFrame).toMatchObject({ technicalKey: "veratec-7400:marco-2h", commercialLengthMm: 6800 });
    expect(parsed.presentations.some((entry) => entry.sku === "66306VER000")).toBe(true);
    expect(parsed.presentations.some((entry) => entry.sku === "66306VER000" && entry.technicalKey !== "veratec:junquillo-4mm")).toBe(false);
    const rail = parsed.technicalInputs.find((entry) => entry.technicalKey === "veratec-7400:riel-sliding");
    expect(rail).toMatchObject({
      sourceCode: "61016VER001",
      recipeComponentCodes: ["AB01016-E", "61016ver"],
    });
    expect(parsed.presentations.find((entry) => entry.sku === "61016VER001")).toMatchObject({
      technicalKey: "veratec-7400:riel-sliding",
      finishResolution: "finish_independent",
      commercialLengthMm: 5800,
      netPrice: 10940,
      currency: "CLP",
    });
    expect(rail?.evidence.note).toContain("no se declaran equivalentes literales al SKU");
    expect(rail?.evidence.note).toContain("61016VER000 es Tope estanco Compact Sliding");
    expect(parsed.technicalInputs.find((entry) => entry.technicalKey === "veratec-7400:tope-estanco-sliding"))
      .toMatchObject({ sourceCode: "61012VER000", recipeAccessoryNames: ["Tope Corredera"] });
    expect(parsed.presentations.find((entry) => entry.sku === "61012VER000"))
      .toMatchObject({ purchaseUnit: "PCS", commercialLengthMm: null, netPrice: 1076, finishName: "Blanco" });
    const fourMillimeterBead = parsed.technicalInputs.find((entry) => entry.sourceCode === "6306");
    expect(fourMillimeterBead).toMatchObject({ recipeComponentCodes: ["6306"] });
    expect(fourMillimeterBead?.evidence.note).toContain("no se genera su correspondencia por sufijo");
    expect(parsed.presentations.find((entry) => entry.sku === "66306VER000")).toMatchObject({
      technicalKey: "veratec:junquillo-4mm",
      commercialLengthMm: 5800,
      netPrice: 7582,
    });
  });

  it("registra 67401 por SKU y acabado con largos observados, y conserva separado el alias 7401", () => {
    const parsed = supplierCatalogImportSchema.parse(VERATEC_7400_JUNIO_2026_IMPORT);
    const marco = parsed.technicalInputs.find((entry) => entry.technicalKey === "veratec-7400:marco-2h");
    expect(marco).toMatchObject({ sourceCode: "7401", recipeComponentCodes: ["67401VER"] });
    expect(parsed.presentations
      .filter((entry) => entry.technicalKey === "veratec-7400:marco-2h")
      .map(({ sku, commercialLengthMm }) => [sku, commercialLengthMm]))
      .toEqual([
        ["67401VER000", 5800],
        ["67401VER153", 5800],
        ["67401VER043", 5800],
        ["67401VER199", 5800],
        ["67401VER200", 6800],
        ["67401VER079", 6800],
      ]);
    expect(marco?.evidence.note).toContain("no se asigna una sección");
  });

  it("rechaza presentaciones que no nombran explícitamente un insumo del lote", () => {
    const invalid = {
      ...VERATEC_7400_JUNIO_2026_IMPORT,
      presentations: VERATEC_7400_JUNIO_2026_IMPORT.presentations.map((entry, index) =>
        index === 0 ? { ...entry, technicalKey: "7401VER" } : entry
      ),
    };
    expect(supplierCatalogImportSchema.safeParse(invalid).success).toBe(false);
  });

  it("acepta un catálogo con varias familias y un solo insumo por código compartido", () => {
    const parsed = supplierCatalogImportSchema.parse(VERATEC_FAMILIES_JUNIO_2026_IMPORT);
    const shared20mm = parsed.technicalInputs.find((input) => input.sourceCode === "66307VER");
    const shared24mm = parsed.technicalInputs.find((input) => input.sourceCode === "67063VER");

    expect(parsed.familyKey).toBeUndefined();
    expect(parsed.technicalInputs).toHaveLength(60);
    expect(parsed.presentations).toHaveLength(121);
    expect(parsed.technicalInputs.reduce((total, input) => total + input.familyKeys.length, 0)).toBe(63);
    expect(parsed.presentations).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: "61004VER003", commercialLengthMm: 5800, netPrice: 44437 }),
    ]));
    expect(new Set(parsed.technicalInputs.map((input) => input.sourceCode)).size).toBe(parsed.technicalInputs.length);
    expect(shared20mm?.familyKeys).toEqual(["veratec:elegans-60", "veratec:sliding-7400"]);
    expect(shared24mm?.familyKeys).toEqual(["veratec:elegans-60", "veratec:sliding-7400"]);
    expect(parsed.presentations.filter((row) => row.technicalKey === "veratec:junquillo-20mm")).toHaveLength(6);
    const slidingBead = parsed.technicalInputs.find((input) => input.sourceCode === "66307VER");
    const compactBead = parsed.technicalInputs.find((input) => input.sourceCode === "67464VER");
    expect(slidingBead?.familyKeys).toEqual(["veratec:elegans-60", "veratec:sliding-7400"]);
    expect(compactBead?.familyKeys).toEqual(["veratec:compact-sliding"]);
    expect(slidingBead?.technicalKey).not.toBe(compactBead?.technicalKey);
    expect(slidingBead?.sourceCode).toBe("66307VER");
    expect(compactBead?.sourceCode).toBe("67464VER");
    expect(slidingBead?.evidence.note).not.toMatch(/intercambiables|incompatibles/i);
    expect(compactBead?.evidence.note).not.toMatch(/intercambiables|incompatibles/i);
    expect(parsed.presentations.some((row) => row.sku === "66306VER000")).toBe(false);

    const compactRail = parsed.technicalInputs.find(
      (input) => input.technicalKey === "veratec:compact-sliding:riel"
    );
    expect(compactRail).toMatchObject({
      sourceCode: "61013VER001",
      recipeComponentCodes: ["61013ver"],
    });
    expect(compactRail?.evidence.note).toContain(
      "61013VER000 es Tope estanco monorriel"
    );
    expect(parsed.presentations.find((row) => row.sku === "69083STL001")).toMatchObject({
      technicalKey: "veratec:compact-sliding:refuerzo-marco",
      purchaseUnit: "M",
      commercialLengthMm: 5800,
      netPrice: 7885,
      currency: "CLP",
    });
    expect(parsed.presentations.find((row) => row.sku === "69041STL000")).toMatchObject({
      technicalKey: "veratec:compact-sliding:refuerzo-hoja",
      commercialLengthMm: 5800,
      netPrice: 7882,
    });
    for (const [sku, technicalKey, netPrice, sourcePage] of [
      ["69048STL000", "veratec:elegans-60:refuerzo-hoja-puerta-interior", 14971, 12],
      ["69018STL000", "veratec:elegans-60:refuerzo-hoja-ventana-exterior", 11384, 12],
      ["69019STL000", "veratec:elegans-60:refuerzo-marco-fijo", 12235, 12],
      ["69076STL000", "veratec:elegans-60:refuerzo-puerta-exterior", 23614, 12],
      ["69026STL000", "veratec:7400:refuerzo-marco-tres-rieles", 17268, 12],
      ["61014VER001", "veratec:compact-sliding:cuarta-hoja", 55782, 9],
      ["67412VER001", "veratec:7400:zapata-aluminio", 124441, 9],
    ] as const) {
      expect(parsed.presentations.find((row) => row.sku === sku)).toMatchObject({
        technicalKey,
        finishResolution: "finish_independent",
        commercialLengthMm: 5800,
        netPrice,
        currency: "CLP",
        priceEvidence: { sourceReference: "xelena:lista-precios:2026-06", page: sourcePage },
      });
    }
    expect(parsed.presentations.find((row) => row.sku === "69071STL000")).toMatchObject({
      technicalKey: "veratec:7400:refuerzo-hoja-chica",
      commercialLengthMm: 5800,
      netPrice: 9153,
    });
    const bigSashReinforcement = VERATEC_7400_JUNIO_2026_IMPORT.technicalInputs.find((input) => input.sourceCode === "69069STL000");
    expect(bigSashReinforcement?.name).toMatch(/hoja corredera grande/i);
    expect(bigSashReinforcement?.evidence.note).not.toMatch(/incompatible|incompatibilidad física/i);
    const smallSashReinforcement = VERATEC_FAMILIES_JUNIO_2026_IMPORT.technicalInputs.find((input) => input.sourceCode === "69071STL000");
    expect(smallSashReinforcement?.name).toMatch(/hoja chica/i);
    expect(smallSashReinforcement?.evidence.note).not.toMatch(/incompatible|incompatibilidad física/i);
  });

  it("usa exclusivamente Lista Junio 2026 como fuente de los precios compartidos Veratec", () => {
    const parsed = supplierCatalogImportSchema.parse(VERATEC_FAMILIES_JUNIO_2026_IMPORT);

    expect(parsed.priceListRevision).toBe("2026-06");
    expect(parsed.priceListSourceReference).toBe("xelena:lista-precios:2026-06");
    expect(parsed.priceListCurrency).toBe("CLP");
    expect(parsed.presentations.every((row) => row.priceEvidence.sourceReference === "xelena:lista-precios:2026-06")).toBe(true);
    expect(parsed.presentations.some((row) => row.priceEvidence.sourceReference.includes("pauta-de-corte-veratec.xlsx"))).toBe(false);
  });

  it("rechaza clonar un mismo código técnico en familias distintas del mismo lote", () => {
    const invalid = {
      ...VERATEC_FAMILIES_JUNIO_2026_IMPORT,
      technicalInputs: [
        ...VERATEC_FAMILIES_JUNIO_2026_IMPORT.technicalInputs,
        {
          ...VERATEC_FAMILIES_JUNIO_2026_IMPORT.technicalInputs[0],
          technicalKey: "otro-key-para-el-mismo-codigo",
          familyKeys: ["veratec:compact-sliding"],
        },
      ],
    };
    expect(supplierCatalogImportSchema.safeParse(invalid).success).toBe(false);
  });

  it("no duplica presentaciones SKU ya incluidas en la revisión piloto 7400", () => {
    const pilotSkus = new Set(VERATEC_7400_JUNIO_2026_IMPORT.presentations.map((row) => row.sku));
    const incomingSkus = VERATEC_FAMILIES_JUNIO_2026_IMPORT.presentations.map((row) => row.sku);
    expect(new Set(incomingSkus).size).toBe(incomingSkus.length);
    expect(incomingSkus.filter((sku) => pilotSkus.has(sku))).toEqual([]);
  });
});
