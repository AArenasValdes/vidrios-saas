import { resolveSupplierFinishName, resolveSupplierPresentationsForQuoteItem, resolveSupplierPresentationFamilyKeys, type ConfirmedSupplierPresentation } from "../supplier-presentation-resolution.service";

const variants: Array<[string, string, string, number]> = [
  ["67401VER000", "000", "Blanco", 5800],
  ["67401VER153", "153", "Nogal", 5800],
  ["67401VER043", "043", "Roble Dorado", 5800],
  ["67401VER199", "199", "Antracita", 5800],
  ["67401VER200", "200", "Negro", 6800],
  ["67401VER079", "079", "Negro Mate", 6800],
];

const presentations: ConfirmedSupplierPresentation[] = variants.map(([sku, finishCode, finishName, commercialLengthMm]) => ({
  presentationId: `id-${sku}`,
  providerKey: "xelena",
  supplierSku: sku,
  technicalCode: "7401",
  recipeComponentCodes: ["67401VER"],
  familyKeys: ["veratec:sliding-7400"],
  finishCode,
  finishName,
  finishResolution: "specific",
  commercialLengthMm,
}));

describe("resolver explícito de presentación para pauta", () => {
  it("normaliza las familias y exclusiones legacy a la identidad universal", () => {
    expect(resolveSupplierPresentationFamilyKeys({
      familyKeys: ["arquetipo:l15"],
      technicalEvidence: { excludedRecipeFamilyKeys: ["ventora:serie-15-corredera-2h"] },
    })).toEqual([]);
    expect(resolveSupplierPresentationFamilyKeys({
      familyKeys: ["arquetipo:l20", "universal:aluminio:l20"],
      technicalEvidence: {},
    })).toEqual(["universal:aluminio:l20"]);
  });

  it("resuelve el acabado desde la etiqueta configurada o el hex exacto del catálogo", () => {
    expect(resolveSupplierFinishName("Negro Mate", "#ffffff")).toBe("Negro Mate");
    expect(resolveSupplierFinishName("Ventana", "#2a2a2a")).toBe("Negro");
    expect(resolveSupplierFinishName("gris nuevo", "#123456")).toBeNull();
  });

  it.each(variants)("selecciona %s con acabado %s y largo %s mm", (sku, finishCode, finishName, length) => {
    const [resolved] = resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "V1", familyKey: "veratec:sliding-7400", finishName, technicalCodes: ["67401VER"] },
      presentations,
    });
    expect(resolved).toMatchObject({
      status: "resolved",
      presentationId: `id-${sku}`,
      providerKey: "xelena",
      supplierSku: sku,
      finishCode,
      commercialLengthMm: length,
    });
  });

  it("no deduce la asociación desde el código del SKU ni desde una familia distinta", () => {
    const [unmapped] = resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "V1", familyKey: "veratec:elegans-60", finishName: "Blanco", technicalCodes: ["67401VER"] },
      presentations,
    });
    expect(unmapped).toMatchObject({ status: "missing", commercialLengthMm: null });
  });

  it("bloquea el packing si la presentación confirmada no tiene largo comercial", () => {
    const [missingLength] = resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "V1", familyKey: "veratec:sliding-7400", finishName: "Blanco", technicalCodes: ["67401VER"] },
      presentations: [{ ...presentations[0]!, commercialLengthMm: null }],
    });
    expect(missingLength).toMatchObject({ status: "missing", supplierSku: "67401VER000", commercialLengthMm: null });
    expect(missingLength?.reason).toMatch(/largo comercial configurado/);
  });

  it("deja sin elección relaciones con más de una presentación candidata", () => {
    const [ambiguous] = resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "V1", familyKey: "veratec:sliding-7400", finishName: "Blanco", technicalCodes: ["67401VER"] },
      presentations: [presentations[0]!, { ...presentations[0]!, presentationId: "duplicate", providerKey: "provider-b", supplierSku: "OTHER-5800" }],
    });
    expect(ambiguous).toMatchObject({ status: "ambiguous", presentationId: null, commercialLengthMm: null });
  });

  it("respeta la elección explícita privada frente a una presentación oficial", () => {
    const [chosen] = resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "V1", familyKey: "veratec:sliding-7400", configurationKey: "sliding-7400:corredera-2h", finishName: "Blanco", technicalCodes: ["67401VER"] },
      presentations: [presentations[0]!, {
        ...presentations[0]!, presentationId: "own-3", providerKey: "taller:3", supplierSku: "MARCO-6800-TALLER",
        configurationKey: "sliding-7400:corredera-2h", preferred: true, commercialLengthMm: 6800,
      }],
    });
    expect(chosen).toMatchObject({ status: "resolved", presentationId: "own-3", commercialLengthMm: 6800 });
  });

  it("resuelve la presentación privada solo para su configuración y acabado", () => {
    const workshop: ConfirmedSupplierPresentation = {
      presentationId: "own-1", providerKey: "taller:3", supplierSku: "TALLER-HOJA-NEGRA",
      technicalCode: "67415VER", recipeComponentCodes: ["HOJA-TALLER"],
      familyKeys: ["veratec:sliding-7400"], configurationKey: "sliding-7400:corredera-3h",
      finishCode: null, finishName: "Negro", finishResolution: "specific", commercialLengthMm: 6800,
    };
    const request = { itemId: "V1", familyKey: "veratec:sliding-7400", finishName: "Negro", technicalCodes: ["HOJA-TALLER"] };
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, configurationKey: "sliding-7400:corredera-3h" }, presentations: [workshop] })[0]).toMatchObject({ status: "resolved", supplierSku: "TALLER-HOJA-NEGRA", commercialLengthMm: 6800 });
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, configurationKey: "sliding-7400:corredera-2h" }, presentations: [workshop] })[0]).toMatchObject({ status: "missing" });
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, finishName: "Blanco", configurationKey: "sliding-7400:corredera-3h" }, presentations: [workshop] })[0]).toMatchObject({ status: "missing" });
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, configurationKey: "sliding-7400:corredera-3h" }, presentations: [{ ...workshop, commercialLengthMm: null }] })[0]).toMatchObject({ status: "missing", commercialLengthMm: null });
  });
});
