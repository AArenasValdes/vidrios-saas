import { resolveEffectiveSupplierProviderKey, resolveSupplierFinishName, resolveSupplierPresentationsForQuoteItem, resolveSupplierPresentationFamilyKeys, resolveSupplierPriceProviderCoverage, type ConfirmedSupplierPresentation } from "../supplier-presentation-resolution.service";

describe("costos mixtos L42", () => {
  const row = (code: string, providerKey: string): ConfirmedSupplierPresentation => ({
    presentationId: `${providerKey}-${code}`, providerKey, supplierSku: code, technicalCode: code,
    recipeComponentCodes: [], familyKeys: ["universal:aluminio:l42"], finishCode: null,
    finishName: "Blanco", finishResolution: "specific", commercialLengthMm: 6000,
  });
  const base = { itemId: "test", familyKey: "universal:aluminio:l42", finishName: "Blanco", technicalCodes: ["4201", "4202", "4229"], providerKey: "arquetipo", organizationId: 3, allowOwnProfileCosts: true };
  it("aplica solo el perfil propio completo de la organización y conserva el proveedor de los otros", () => {
    const own = row("4201", "taller:3");
    const result = resolveSupplierPresentationsForQuoteItem({ request: { ...base, eligibleOwnPresentationIds: [own.presentationId] }, presentations: [own, row("4202", "arquetipo"), row("4229", "arquetipo")] });
    expect(result.map((item) => item.providerKey)).toEqual(["taller:3", "arquetipo", "arquetipo"]);
  });
  it("excluye costos incompletos o de otra organización", () => {
    const result = resolveSupplierPresentationsForQuoteItem({ request: { ...base, technicalCodes: ["4201"], eligibleOwnPresentationIds: [] }, presentations: [row("4201", "taller:3"), row("4201", "taller:4"), row("4201", "arquetipo")] });
    expect(result[0]).toMatchObject({ status: "resolved", providerKey: "arquetipo" });
  });
});

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
  it("prioriza proveedor de pieza, luego preferencia de familia y finalmente resolución automática", () => {
    expect(resolveEffectiveSupplierProviderKey({ explicitProviderKey: " alumco ", familyPreferenceProviderKey: "arquetipo" })).toBe("alumco");
    expect(resolveEffectiveSupplierProviderKey({ familyPreferenceProviderKey: "arquetipo" })).toBe("arquetipo");
    expect(resolveEffectiveSupplierProviderKey({ explicitProviderKey: " ", familyPreferenceProviderKey: " " })).toBeNull();
  });

  it("no sustituye un proveedor habitual si no tiene presentación para un perfil", () => {
    const arquetipo: ConfirmedSupplierPresentation = {
      presentationId: "arq-4201", providerKey: "arquetipo", supplierSku: "30892001",
      technicalCode: "4201", recipeComponentCodes: [], familyKeys: ["universal:aluminio:l42"],
      finishCode: null, finishName: null, finishResolution: "finish_independent", commercialLengthMm: 6000,
    };
    const preferredProvider = resolveEffectiveSupplierProviderKey({ familyPreferenceProviderKey: "alumco" });
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "L42", familyKey: "ventora:l42", finishName: null, technicalCodes: ["4201"], providerKey: preferredProvider },
      presentations: [arquetipo],
    })[0]).toMatchObject({ status: "missing", providerKey: "alumco", commercialLengthMm: null });
  });
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
    expect(resolveSupplierFinishName("Titanio", "#7d8791")).toBe("Titanio");
    expect(resolveSupplierFinishName(null, "#7d8791")).toBe("Titanio");
    expect(resolveSupplierFinishName("Aluminio mate", "#a8a8a8")).toBe("Aluminio Mate");
    expect(resolveSupplierFinishName("Blanco hueso", "#dfd5c4")).toBe("Blanco Hueso");
    expect(resolveSupplierFinishName("Madera", "#8b5e3c")).toBe("Madera");
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

  it("respeta la elección explícita privada frente a una presentación oficial cuando está acreditada", () => {
    const [chosen] = resolveSupplierPresentationsForQuoteItem({
      request: {
        itemId: "V1", familyKey: "veratec:sliding-7400", configurationKey: "sliding-7400:corredera-2h",
        finishName: "Blanco", technicalCodes: ["67401VER"], organizationId: 3, eligibleOwnPresentationIds: ["own-3"],
      },
      presentations: [presentations[0]!, {
        ...presentations[0]!, presentationId: "own-3", providerKey: "taller:3", supplierSku: "MARCO-6800-TALLER",
        configurationKey: "sliding-7400:corredera-2h", preferred: true, commercialLengthMm: 6800,
      }],
    });
    expect(chosen).toMatchObject({ status: "resolved", presentationId: "own-3", commercialLengthMm: 6800 });
  });

  it("usa Arquetipo como referencia automática y no sustituye por otra lista de proveedor", () => {
    const arquetipo: ConfirmedSupplierPresentation = {
      presentationId: "arq-2001", providerKey: "arquetipo", supplierSku: "30892001",
      technicalCode: "2001", recipeComponentCodes: [], familyKeys: ["universal:aluminio:l20"],
      finishCode: null, finishName: null, finishResolution: "finish_independent", commercialLengthMm: 6000,
      preferred: true,
    };
    const sodal: ConfirmedSupplierPresentation = {
      ...arquetipo, presentationId: "sodal-2001", providerKey: "sodal", supplierSku: "SODAL-2001",
      preferred: false,
    };
    const request = { itemId: "A", familyKey: "ventora:l20", finishName: "Blanco", technicalCodes: ["2001"] };

    expect(resolveSupplierPresentationsForQuoteItem({ request, presentations: [sodal, arquetipo] })[0])
      .toMatchObject({ status: "resolved", providerKey: "arquetipo", supplierSku: "30892001" });
    expect(resolveSupplierPresentationsForQuoteItem({ request, presentations: [sodal] })[0])
      .toMatchObject({ status: "missing", providerKey: null, supplierSku: null });
  });

  it("respeta el proveedor elegido y deja pendiente el perfil si no tiene presentación", () => {
    const arquetipo: ConfirmedSupplierPresentation = {
      presentationId: "arq-2001", providerKey: "arquetipo", supplierSku: "30892001",
      technicalCode: "2001", recipeComponentCodes: [], familyKeys: ["universal:aluminio:l20"],
      finishCode: null, finishName: null, finishResolution: "finish_independent", commercialLengthMm: 6000,
      preferred: true,
    };
    const alumco: ConfirmedSupplierPresentation = {
      ...arquetipo, presentationId: "alumco-2001", providerKey: "alumco", supplierSku: "AL-2001",
      preferred: false,
    };
    const request = { itemId: "A", familyKey: "ventora:l20", finishName: "Blanco", technicalCodes: ["2001"] };

    expect(resolveSupplierPresentationsForQuoteItem({
      request: { ...request, providerKey: "alumco" }, presentations: [arquetipo, alumco],
    })[0]).toMatchObject({ status: "resolved", providerKey: "alumco", supplierSku: "AL-2001" });
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { ...request, providerKey: "sodal" }, presentations: [arquetipo, alumco],
    })[0]).toMatchObject({ status: "missing", providerKey: "sodal", supplierSku: null });
  });

  it("muestra cobertura de precio por proveedor solo para familia, código, configuración y acabado compatibles", () => {
    const base = {
      presentationId: "presentation-4201",
      technicalCode: "4201",
      recipeComponentCodes: [],
      familyKeys: ["universal:aluminio:l42"],
      finishName: "Blanco",
      finishResolution: "specific" as const,
      configurationKey: "l42:proyectante-1h",
      commercialLengthMm: 6000,
      netPrice: 18000,
    };
    const options = resolveSupplierPriceProviderCoverage({
      request: {
        itemId: "V1", familyKey: "ventora:l42", finishName: "Blanco",
        technicalCodes: ["4201", "4202"], configurationKey: "l42:proyectante-1h",
      },
      presentations: [
        { ...base, providerKey: "alumco" },
        { ...base, presentationId: "arq-4202", providerKey: "arquetipo", technicalCode: "4202" },
        { ...base, presentationId: "sodal-4209", providerKey: "sodal", technicalCode: "4209" },
        { ...base, presentationId: "otro-acabado", providerKey: "otro-acabado", finishName: "Negro" },
        { ...base, presentationId: "otra-configuracion", providerKey: "otra-configuracion", configurationKey: "l42:puerta" },
        { ...base, presentationId: "sin-precio", providerKey: "sin-precio", netPrice: null },
      ],
    });

    expect(options).toEqual([
      { providerKey: "arquetipo", pricedProfileCount: 1, totalProfileCount: 2, baseReferenceProfileCount: 0, coveredTechnicalCodes: ["4202"], pendingTechnicalCodes: ["4201"], baseReferenceTechnicalCodes: [], isReference: true },
      { providerKey: "alumco", pricedProfileCount: 1, totalProfileCount: 2, baseReferenceProfileCount: 0, coveredTechnicalCodes: ["4201"], pendingTechnicalCodes: ["4202"], baseReferenceTechnicalCodes: [], isReference: false },
    ]);
  });

  it("cuenta el precio Alumco Titanio como cobertura base en otros acabados, sin reutilizarlo para otros proveedores", () => {
    const presentation = {
      presentationId: "alumco-3201-ti",
      providerKey: "alumco",
      technicalCode: "3201",
      familyKeys: ["universal:aluminio:l32"],
      finishName: "Titanio",
      finishResolution: "specific" as const,
      commercialLengthMm: 6000,
      netPrice: 10210,
    };
    const result = resolveSupplierPriceProviderCoverage({
      request: { itemId: "L32", familyKey: "universal:aluminio:l32", finishName: "Negro", technicalCodes: ["3201"] },
      presentations: [presentation, { ...presentation, providerKey: "otro-proveedor", presentationId: "other-3201" }],
    });
    expect(result).toEqual([expect.objectContaining({
      providerKey: "alumco", pricedProfileCount: 1, baseReferenceProfileCount: 1,
      coveredTechnicalCodes: [], pendingTechnicalCodes: ["3201"], baseReferenceTechnicalCodes: ["3201"],
    })]);
  });

  it("no ofrece el precio base Titanio si el acabado cotizado aún no está identificado", () => {
    const presentation = {
      presentationId: "alumco-3201-ti",
      providerKey: "alumco",
      technicalCode: "3201",
      familyKeys: ["universal:aluminio:l32"],
      finishName: "Titanio",
      finishResolution: "specific" as const,
      commercialLengthMm: 6000,
      netPrice: 10210,
    };

    expect(resolveSupplierPriceProviderCoverage({
      request: { itemId: "L32", familyKey: "universal:aluminio:l32", finishName: null, technicalCodes: ["3201"] },
      presentations: [presentation],
    })).toEqual([]);
  });

  it("no presenta como cubierto un código con presentación ambigua o sin largo comercial", () => {
    const base = {
      technicalCode: "2501",
      familyKeys: ["universal:aluminio:l25"],
      finishName: null,
      finishResolution: "finish_independent" as const,
      commercialLengthMm: 6000,
      netPrice: 12000,
      providerKey: "arquetipo",
    };
    const options = resolveSupplierPriceProviderCoverage({
      request: {
        itemId: "L25", familyKey: "ventora:l25", finishName: null, technicalCodes: ["2501", "2502"],
      },
      presentations: [
        { ...base, presentationId: "ambiguous-1" },
        { ...base, presentationId: "ambiguous-2", commercialLengthMm: 5800 },
        { ...base, presentationId: "no-length", technicalCode: "2502", commercialLengthMm: null },
      ],
    });

    expect(options).toEqual([]);
  });

  it("respeta una presentación propia del taller marcada como preferida cuando está acreditada", () => {
    const arquetipo: ConfirmedSupplierPresentation = {
      presentationId: "arq-2001", providerKey: "arquetipo", supplierSku: "30892001",
      technicalCode: "2001", recipeComponentCodes: [], familyKeys: ["universal:aluminio:l20"],
      finishCode: null, finishName: null, finishResolution: "finish_independent", commercialLengthMm: 6000,
      preferred: true,
    };
    const workshop: ConfirmedSupplierPresentation = {
      ...arquetipo, presentationId: "own-2001", providerKey: "taller:7", supplierSku: "MI-CODIGO-2001",
      preferred: true,
    };

    expect(resolveSupplierPresentationsForQuoteItem({
      request: {
        itemId: "A", familyKey: "ventora:l20", finishName: "Blanco", technicalCodes: ["2001"],
        organizationId: 7, eligibleOwnPresentationIds: ["own-2001"],
      },
      presentations: [arquetipo, workshop],
    })[0]).toMatchObject({ status: "resolved", providerKey: "taller:7", supplierSku: "MI-CODIGO-2001" });
  });

  it("no deja que un costo propio incompleto, preferido, de otra org o sin eligibleOwnPresentationIds desplace a un proveedor compatible", () => {
    const arquetipo: ConfirmedSupplierPresentation = {
      presentationId: "arq-2001", providerKey: "arquetipo", supplierSku: "30892001",
      technicalCode: "2001", recipeComponentCodes: [], familyKeys: ["universal:aluminio:l20"],
      finishCode: null, finishName: null, finishResolution: "finish_independent", commercialLengthMm: 6000,
      preferred: true,
    };
    const incompletePreferred: ConfirmedSupplierPresentation = {
      ...arquetipo, presentationId: "own-2001", providerKey: "taller:7", supplierSku: "",
      commercialLengthMm: null, preferred: true,
    };
    // 1. Preferida sin largo comercial (allowOwnProfileCosts=false, providerKey=null)
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "A1", familyKey: "ventora:l20", finishName: "Blanco", technicalCodes: ["2001"], organizationId: 7, eligibleOwnPresentationIds: [] },
      presentations: [arquetipo, incompletePreferred],
    })[0]).toMatchObject({ status: "resolved", providerKey: "arquetipo", presentationId: "arq-2001" });

    // 2. Preferida sin eligibleOwnPresentationIds (ausencia no autoriza)
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "A2", familyKey: "ventora:l20", finishName: "Blanco", technicalCodes: ["2001"], organizationId: 7 },
      presentations: [arquetipo, { ...incompletePreferred, commercialLengthMm: 6000 }],
    })[0]).toMatchObject({ status: "resolved", providerKey: "arquetipo", presentationId: "arq-2001" });

    // 3. allowOwnProfileCosts=true sin eligibleOwnPresentationIds no desplaza proveedor elegido
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "A3", familyKey: "universal:aluminio:l42", finishName: "Blanco", technicalCodes: ["4201"], providerKey: "arquetipo", organizationId: 7, allowOwnProfileCosts: true },
      presentations: [
        { ...arquetipo, presentationId: "arq-4201", technicalCode: "4201", familyKeys: ["universal:aluminio:l42"] },
        { ...incompletePreferred, presentationId: "own-4201", technicalCode: "4201", familyKeys: ["universal:aluminio:l42"], commercialLengthMm: 6000 },
      ],
    })[0]).toMatchObject({ status: "resolved", providerKey: "arquetipo", presentationId: "arq-4201" });

    // 4. Presentación de otra organización nunca se selecciona
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "A4", familyKey: "ventora:l20", finishName: "Blanco", technicalCodes: ["2001"], organizationId: 7, eligibleOwnPresentationIds: ["own-other-org"] },
      presentations: [arquetipo, { ...incompletePreferred, presentationId: "own-other-org", providerKey: "taller:99", commercialLengthMm: 6000 }],
    })[0]).toMatchObject({ status: "resolved", providerKey: "arquetipo", presentationId: "arq-2001" });

    // 5. Familia no universal: preferida incompleta no desplaza proveedor compatible
    const xelena: ConfirmedSupplierPresentation = {
      presentationId: "xel-7401", providerKey: "xelena", supplierSku: "67401VER000",
      technicalCode: "7401", recipeComponentCodes: [], familyKeys: ["veratec:sliding-7400"],
      finishCode: "000", finishName: "Blanco", finishResolution: "specific", commercialLengthMm: 5800,
    };
    const workshopVeratec: ConfirmedSupplierPresentation = {
      ...xelena, presentationId: "own-7401", providerKey: "taller:7", supplierSku: "",
      commercialLengthMm: null, preferred: true,
    };
    expect(resolveSupplierPresentationsForQuoteItem({
      request: { itemId: "V-pref", familyKey: "veratec:sliding-7400", finishName: "Blanco", technicalCodes: ["7401"], organizationId: 7, eligibleOwnPresentationIds: [] },
      presentations: [xelena, workshopVeratec],
    })[0]).toMatchObject({ status: "resolved", providerKey: "xelena", presentationId: "xel-7401" });
  });

  it("resuelve la presentación privada solo para su configuración y acabado", () => {
    const workshop: ConfirmedSupplierPresentation = {
      presentationId: "own-1", providerKey: "taller:3", supplierSku: "TALLER-HOJA-NEGRA",
      technicalCode: "67415VER", recipeComponentCodes: ["HOJA-TALLER"],
      familyKeys: ["veratec:sliding-7400"], configurationKey: "sliding-7400:corredera-3h",
      finishCode: null, finishName: "Negro", finishResolution: "specific", commercialLengthMm: 6800,
    };
    const request = { itemId: "V1", familyKey: "veratec:sliding-7400", finishName: "Negro", technicalCodes: ["HOJA-TALLER"], organizationId: 3, eligibleOwnPresentationIds: ["own-1"] };
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, configurationKey: "sliding-7400:corredera-3h" }, presentations: [workshop] })[0]).toMatchObject({ status: "resolved", supplierSku: "TALLER-HOJA-NEGRA", commercialLengthMm: 6800 });
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, eligibleOwnPresentationIds: undefined, configurationKey: "sliding-7400:corredera-3h" }, presentations: [workshop] })[0]).toMatchObject({ status: "missing" });
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, configurationKey: "sliding-7400:corredera-2h" }, presentations: [workshop] })[0]).toMatchObject({ status: "missing" });
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, finishName: "Blanco", configurationKey: "sliding-7400:corredera-3h" }, presentations: [workshop] })[0]).toMatchObject({ status: "missing" });
    expect(resolveSupplierPresentationsForQuoteItem({ request: { ...request, configurationKey: "sliding-7400:corredera-3h" }, presentations: [{ ...workshop, commercialLengthMm: null }] })[0]).toMatchObject({ status: "missing", commercialLengthMm: null });
  });
});
