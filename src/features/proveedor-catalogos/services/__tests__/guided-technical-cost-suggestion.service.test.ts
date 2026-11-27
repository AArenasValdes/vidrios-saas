import { buildGuidedTechnicalCostSuggestion } from "../guided-technical-cost-suggestion.service";
import type { SupplierProfilePricePreview } from "../supplier-presentation-resolution.service";
import type { CatalogPresentationPrice } from "../costo-tecnico-parcial.service";
import type { GlassSupplierCutPresentation } from "../glass-supplier-cut-cost.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import {
  calculateComponentItem,
  calculateCotizacionWorkflowTotals,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { buildQuoteStudioFinancialSummary } from "@/features/cotizaciones/services/quote-studio-financial.service";

function getL5000Recipe() {
  return resolveUniversalPricedLineFallbacks({
    catalogKey: "ventora:l5000",
    lineTemplateId: 5000,
    organizationId: 3,
    lineName: "Serie 5000",
    variant: "caracol",
    leavesCount: 2,
    typology: "corredera",
    glassName: "Incoloro monolítico 5mm",
    recipes: [],
  })[0]!;
}

/** Fixture aislado de test donde las medidas de corte del vidrio sí están confirmadas. */
function getConfirmedGlassL5000Fixture() {
  const recipe = getL5000Recipe();
  return {
    ...recipe,
    definition: {
      ...recipe.definition,
      vidrios: recipe.definition.vidrios.map((glass) => ({
        ...glass,
        reglaAncho: { ...glass.reglaAncho, ajusteMm: -50 },
        reglaAlto: { ...glass.reglaAlto, ajusteMm: -100 },
        observaciones: "Descuento de corte confirmado para fixture de prueba.",
        datosPendientes: undefined,
      })),
      // El escenario completo necesita también cantidades y códigos confirmados;
      // los precios de proveedor no convierten una sugerencia en confirmación.
      accesorios: recipe.definition.accesorios.map((accessory) => ({
        ...accessory,
        codigo: accessory.nombre === "Carros o rodamientos" ? "ACC-CARRO"
          : accessory.nombre === "Cierre o seguro" ? "ACC-CIERRE" : "ACC-FELPA",
        observaciones: "Cantidad confirmada para fixture de prueba.",
        datosPendientes: undefined,
      })),
    },
  };
}

function makePreviewPrices(
  codes: readonly string[],
  overrides: Partial<SupplierProfilePricePreview> = {}
): SupplierProfilePricePreview[] {
  return codes.map((code, index) => ({
    technicalCode: code,
    profileName: `Perfil ${code}`,
    providerKey: "alumco",
    providerLabel: "Alumco · 2026",
    presentationId: `pres-${code}-${index}`,
    supplierSku: `ALU-${code}`,
    presentationDescription: "Tira 6000 mm",
    purchaseUnit: "TIRA",
    commercialLengthMm: 6000,
    netPrice: 12000,
    currency: "CLP",
    priceSource: "reference",
    priceReferenceStatus: "within_stated_validity",
    finishPriceBasis: "specific_finish",
    priceSourceFinishName: "Mate",
    status: "priced",
    ...overrides,
  }));
}

function makeL5000AccessoryPrices(providerKey = "alumco"): CatalogPresentationPrice[] {
  return [
    {
      presentationId: "acc-carros",
      providerKey,
      familyKeys: ["universal:aluminio:l5000"],
      technicalCode: "ACC-CARRO",
      recipeAccessoryNames: ["Carros o rodamientos"],
      technicalName: "Carros o rodamientos",
      supplierSku: "ALU-CARRO",
      presentationDescription: "Carro corredera",
      finishCode: "",
      finishName: null,
      finishResolution: "finish_independent",
      purchaseUnit: "UN",
      commercialLengthMm: null,
      netPrice: 2500,
      currency: "CLP",
      priceBasis: "commercial_presentation",
      priceListId: "pl-acc",
      priceListRevision: "2026-11",
      priceReferenceStatus: "within_stated_validity",
    },
    {
      presentationId: "acc-cierre",
      providerKey,
      familyKeys: ["universal:aluminio:l5000"],
      technicalCode: "ACC-CIERRE",
      recipeAccessoryNames: ["Cierre o seguro"],
      technicalName: "Cierre o seguro",
      supplierSku: "ALU-CIERRE",
      presentationDescription: "Cierre central",
      finishCode: "",
      finishName: null,
      finishResolution: "finish_independent",
      purchaseUnit: "UN",
      commercialLengthMm: null,
      netPrice: 3000,
      currency: "CLP",
      priceBasis: "commercial_presentation",
      priceListId: "pl-acc",
      priceListRevision: "2026-11",
      priceReferenceStatus: "within_stated_validity",
    },
    {
      presentationId: "acc-felpa",
      providerKey,
      familyKeys: ["universal:aluminio:l5000"],
      technicalCode: "ACC-FELPA",
      recipeAccessoryNames: ["Felpa o sello"],
      technicalName: "Felpa o sello",
      supplierSku: "ALU-FELPA",
      presentationDescription: "Felpa corredera",
      finishCode: "",
      finishName: null,
      finishResolution: "finish_independent",
      purchaseUnit: "UN",
      commercialLengthMm: null,
      netPrice: 1000,
      currency: "CLP",
      priceBasis: "commercial_presentation",
      priceListId: "pl-acc",
      priceListRevision: "2026-11",
      priceReferenceStatus: "within_stated_validity",
    },
  ];
}

function makeGlassCutPresentation(
  overrides: Partial<GlassSupplierCutPresentation> = {}
): GlassSupplierCutPresentation {
  return {
    presentationId: "glass-cut-mono-5mm",
    providerKey: "vidrieriacentral",
    organizationId: 3,
    category: "monolitico",
    thicknessMm: 5,
    glassDescription: "Incoloro monolítico 5mm",
    purchaseMode: "supplier_cut",
    purchaseUnit: "M2",
    netPricePerM2: 10000,
    minBillableM2PerPane: null,
    currency: "CLP",
    priceReferenceStatus: "within_stated_validity",
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
    ...overrides,
  };
}

describe("buildGuidedTechnicalCostSuggestion & Paso 2 -> Paso 3 integración", () => {
  it("no estima vidrio nominal cuando la ficha contradice el espesor indicado", () => {
    const recipe = getL5000Recipe();
    const result = buildGuidedTechnicalCostSuggestion({ recipe, organizationId: 3, lineTemplateId: 5000,
      anchoMm: 1800, altoMm: 1500, cantidad: 1, vidrio: "Incoloro monolítico 5mm", colorHex: "#a8a8a8", material: "Aluminio",
      finishName: "Mate", catalogLineKey: "ventora:l5000", supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco", profilePrices: makePreviewPrices([...new Set(recipe.definition.perfiles.map((profile) => profile.codigoPerfil))]),
      glassTechnicalSpec: { version: 1, productId: null, thicknessMm: 6, category: "monolitico", manualCutStatus: "confirmed", technicalReviewConfirmed: true,
        sheetWidthMm: null, sheetHeightMm: null, provenance: "catalog", sourceProductId: null, sourceValues: null, hasConflict: false },
      glassCutPresentations: [makeGlassCutPresentation({ thicknessMm: 6 })], asOfDate: "2026-11-21" });
    expect(result.glassCostNet).toBeNull();
    expect(result.glassCostIsProvisional).toBe(false);
  });
  it.each(["Incoloro monolítico 6mm", "DVH 4+12+4"])("no estima vidrio nominal incompatible %s", (vidrio) => {
    const recipe = getL5000Recipe();
    const result = buildGuidedTechnicalCostSuggestion({ recipe, organizationId: 3, lineTemplateId: 5000,
      anchoMm: 1800, altoMm: 1500, cantidad: 1, vidrio, colorHex: "#a8a8a8", material: "Aluminio",
      finishName: "Mate", catalogLineKey: "ventora:l5000", supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco", profilePrices: makePreviewPrices([...new Set(recipe.definition.perfiles.map((profile) => profile.codigoPerfil))]),
      glassCutPresentations: [makeGlassCutPresentation()], asOfDate: "2026-11-21" });
    expect(result.glassCostNet).toBeNull();
    expect(result.glassCostIsProvisional).toBe(false);
    expect(result.usableBaseCostGroupNet).toBeNull();
  });
  it("calcula costo verificado, recargo 100% y precio neto sugerido sin IVA en Paso 2 y valida Paso 3 en ambos modos tributarios", () => {
    const recipe = getConfirmedGlassL5000Fixture();
    const codes = [...new Set(recipe.definition.perfiles.map((p) => p.codigoPerfil))];
    const prices = makePreviewPrices(codes, { netPrice: 15000 });

    const suggestion = buildGuidedTechnicalCostSuggestion({
      recipe,
      organizationId: 3,
      lineTemplateId: 5000,
      lineName: "Serie 5000",
      tipo: "Ventana",
      sistema: "Corredera",
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: prices,
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });

    expect(suggestion.status).toBe("complete");
    expect(suggestion.defaultMarkupPct).toBe(100);
    expect(suggestion.profilesCostNet).toBe(105000);
    expect(suggestion.accessoriesCostNet).toBe(9000);
    expect(suggestion.glassCostNet).toBeGreaterThan(0);
    const expectedBase =
      suggestion.profilesCostNet! +
      suggestion.accessoriesCostNet! +
      suggestion.glassCostNet!;
    expect(suggestion.usableBaseCostGroupNet).toBe(expectedBase);
    expect(suggestion.markupAmountNet).toBe(expectedBase);
    expect(suggestion.suggestedNetTotal).toBe(expectedBase * 2);

    // Paso 2 -> Paso 3 integration (group_total scope)
    const item = calculateComponentItem({
      codigo: "V1",
      tipo: "Ventana",
      lineaComercial: "Serie 5000",
      vidrio: "Incoloro monolítico 5mm",
      nombre: "Ventana corredera",
      ancho: 1200,
      alto: 1500,
      cantidad: 1,
      costoProveedorUnitario: suggestion.usableBaseCostGroupNet!,
      margenPct: suggestion.defaultMarkupPct,
      costInputScope: "group_total",
      origenPrecio: "margen",
    });

    expect(item.precioUnitario).toBe(expectedBase * 2);
    expect(item.precioTotal).toBe(expectedBase * 2);

    const totalsWithVat = calculateCotizacionWorkflowTotals([item], 0, 0, {
      mostrarIva: true,
      commercialRoundingIncrement: 1,
    });
    expect(totalsWithVat.neto).toBe(expectedBase * 2);
    expect(totalsWithVat.iva).toBe(Math.round(expectedBase * 2 * 0.19));
    expect(totalsWithVat.total).toBe(expectedBase * 2 + totalsWithVat.iva);

    const totalsWithVatRounded = calculateCotizacionWorkflowTotals([item], 0, 0, {
      mostrarIva: true,
      commercialRoundingIncrement: 1000,
    });
    expect(totalsWithVatRounded.total).toBe(
      Math.ceil(totalsWithVat.total / 1000) * 1000
    );

    const totalsFinalPrices = calculateCotizacionWorkflowTotals([item], 0, 0, {
      mostrarIva: false,
      commercialRoundingIncrement: 1,
    });
    expect(totalsFinalPrices.total).toBe(expectedBase * 2);
  });

  it("evita duplicar costos por cantidad cuando costInputScope es group_total y escala tiras, vidrio y accesorios al aumentar cantidad", () => {
    const recipe = getConfirmedGlassL5000Fixture();
    const codes = [...new Set(recipe.definition.perfiles.map((p) => p.codigoPerfil))];
    const prices = makePreviewPrices(codes, { netPrice: 15000 });

    const oneUnit = buildGuidedTechnicalCostSuggestion({
      recipe,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: prices,
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });

    const twoUnits = buildGuidedTechnicalCostSuggestion({
      recipe,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 2,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: prices,
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });

    expect(oneUnit.status).toBe("complete");
    expect(twoUnits.status).toBe("complete");
    // Sin doble multiplicación: accesorios escalan exactamente x2 y vidrio x2 respecto a 1 unidad
    expect(twoUnits.accessoriesCostNet).toBe(oneUnit.accessoriesCostNet! * 2);
    expect(twoUnits.glassCostNet).toBe(oneUnit.glassCostNet! * 2);

    const groupItem = calculateComponentItem({
      codigo: "V1",
      tipo: "Ventana",
      nombre: "Ventana x2",
      cantidad: 2,
      costoProveedorUnitario: twoUnits.usableBaseCostGroupNet!,
      margenPct: 100,
      costInputScope: "group_total",
      origenPrecio: "margen",
    });
    expect(groupItem.costoProveedorTotal).toBe(twoUnits.usableBaseCostGroupNet);
    expect(groupItem.precioTotal).toBe(twoUnits.suggestedNetTotal);

    const unitItem = calculateComponentItem({
      codigo: "V2",
      tipo: "Ventana",
      nombre: "Ventana unitaria",
      cantidad: 3,
      costoProveedorUnitario: 50000,
      margenPct: 100,
      costInputScope: "unit",
      origenPrecio: "margen",
    });
    expect(unitItem.costoProveedorTotal).toBe(150000);
    expect(unitItem.precioTotal).toBe(300000);
  });

  it("devuelve Costo parcial cuando falta precio de vidrio o algún perfil y nunca aplica recargo automático sobre suma parcial", () => {
    const recipe = getL5000Recipe();
    const codes = [...new Set(recipe.definition.perfiles.map((p) => p.codigoPerfil))];
    const prices = makePreviewPrices(codes, { netPrice: 10000 });

    const partial = buildGuidedTechnicalCostSuggestion({
      recipe,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: prices,
    });

    expect(partial.status).toBe("partial");
    expect(partial.profilesCostNet).toBeGreaterThan(0);
    expect(partial.glassCostNet).toBeNull();
    expect(partial.usableBaseCostGroupNet).toBeNull();
    expect(partial.suggestedNetTotal).toBeNull();
    expect(partial.missingItems.length).toBeGreaterThan(0);
  });

  it("devuelve unavailable cuando faltan precios de proveedor, acabado incompatible o receta sin pauta", () => {
    const recipe = getL5000Recipe();
    const codes = [...new Set(recipe.definition.perfiles.map((p) => p.codigoPerfil))];
    const matePrices = makePreviewPrices(codes, {
      providerKey: "alumco",
      priceSourceFinishName: "Mate",
    });

    const wrongProvider = buildGuidedTechnicalCostSuggestion({
      recipe,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#2a2a2a",
      material: "Aluminio",
      finishName: "Negro",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "arquetipo",
      profilePrices: matePrices,
    });

    expect(wrongProvider.status).toBe("unavailable");
    expect(wrongProvider.usableBaseCostGroupNet).toBeNull();
    expect(wrongProvider.suggestedNetTotal).toBeNull();

    const noRecipe = buildGuidedTechnicalCostSuggestion({
      recipe: null,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: matePrices,
    });
    expect(noRecipe.status).toBe("unavailable");
  });

  it("nunca marca Costo verificado (complete) cuando la receta no está validada físicamente o la fuente es histórica/no vigente", () => {
    const l42TestingRecipe = resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l42",
      lineTemplateId: 42,
      organizationId: 3,
      lineName: "Serie 42",
      variant: "arquetipo_sin_camara_monolitico",
      leavesCount: 1,
      typology: "proyectante",
      glassName: "Incoloro monolítico 5mm",
      includeDocumentedVariants: true,
      recipes: [],
    })[0]!;
    expect(l42TestingRecipe.status).toBe("testing");

    const l42Codes = [...new Set(l42TestingRecipe.definition.perfiles.map((p) => p.codigoPerfil))];
    const l42Result = buildGuidedTechnicalCostSuggestion({
      recipe: l42TestingRecipe,
      organizationId: 3,
      lineTemplateId: 42,
      anchoMm: 1000,
      altoMm: 1000,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l42",
      supplierFamilyKey: "universal:aluminio:l42",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l42Codes, { netPrice: 12000 }),
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });

    expect(l42Result.isRecipeValidated).toBe(false);
    expect(l42Result.status).toBe("partial");
    expect(l42Result.usableBaseCostGroupNet).toBeNull();
    expect(l42Result.suggestedNetTotal).toBeNull();
    expect(l42Result.nonVerifiedReasons[0]).toMatch(/sin validación física/i);

    const validatedL5000 = getL5000Recipe();
    const l5000Codes = [...new Set(validatedL5000.definition.perfiles.map((p) => p.codigoPerfil))];
    const historicalResult = buildGuidedTechnicalCostSuggestion({
      recipe: validatedL5000,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l5000Codes, {
        priceReferenceStatus: "historical_reference",
        priceSource: "reference",
      }),
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });

    expect(historicalResult.isRecipeValidated).toBe(true);
    expect(historicalResult.status).toBe("partial");
    expect(historicalResult.usableBaseCostGroupNet).toBeNull();
    expect(historicalResult.suggestedNetTotal).toBeNull();
  });

  it("distingue sin precios valorizados (no mezcla de monedas), precios en CLP y mezcla real de monedas", () => {
    const l20Recipe = resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l20",
      lineTemplateId: 20,
      organizationId: 3,
      lineName: "Serie 20",
      variant: "pierna_abierta_jamba_2009",
      leavesCount: 2,
      typology: "corredera",
      glassName: "Incoloro monolítico 5mm",
      recipes: [],
    })[0]!;
    const codes = [...new Set(l20Recipe.definition.perfiles.map((p) => p.codigoPerfil))];

    // 1. 0 perfiles valorizados (ej. Alumco L20 sin precios compatibles) -> NO debe reportar mezcla de monedas
    const zeroPriced = buildGuidedTechnicalCostSuggestion({
      recipe: l20Recipe,
      organizationId: 3,
      lineTemplateId: 20,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l20",
      supplierFamilyKey: "universal:aluminio:l20",
      providerKey: "alumco",
      profilePrices: [],
    });
    expect(zeroPriced.status).toBe("unavailable");
    expect(zeroPriced.reason).toBe("Faltan precios de compra compatibles para valorizar esta configuración.");
    expect(zeroPriced.nonVerifiedReasons).not.toContain("Las presentaciones seleccionadas mezclan más de una moneda.");

    // 2. Perfiles valorizados en CLP -> sin mezcla de monedas
    const clpPartial = buildGuidedTechnicalCostSuggestion({
      recipe: l20Recipe,
      organizationId: 3,
      lineTemplateId: 20,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l20",
      supplierFamilyKey: "universal:aluminio:l20",
      providerKey: "arquetipo",
      profilePrices: makePreviewPrices(codes, { providerKey: "arquetipo", currency: "CLP" }),
    });
    expect(clpPartial.status).toBe("partial");
    expect(clpPartial.currency).toBe("CLP");
    expect(clpPartial.nonVerifiedReasons).not.toContain("Las presentaciones seleccionadas mezclan más de una moneda.");

    // 3. Monedas múltiples reales (CLP + USD) -> bloquea complete y reporta mezcla de monedas
    const mixedPrices = makePreviewPrices(codes, { providerKey: "alumco", currency: "CLP" });
    mixedPrices[0] = { ...mixedPrices[0]!, currency: "USD" };
    const mixedResult = buildGuidedTechnicalCostSuggestion({
      recipe: l20Recipe,
      organizationId: 3,
      lineTemplateId: 20,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l20",
      supplierFamilyKey: "universal:aluminio:l20",
      providerKey: "alumco",
      profilePrices: mixedPrices,
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });
    expect(mixedResult.status).toBe("partial");
    expect(mixedResult.usableBaseCostGroupNet).toBeNull();
    expect(mixedResult.knownNetTotal).toBeNull();
    expect(mixedResult.currency).toBeNull();
    expect(mixedResult.nonVerifiedReasons).toContain("Las presentaciones seleccionadas mezclan más de una moneda.");
  });

  it("certifica flujo determinista completo: sugerencia 100%, cambios de medidas/cantidad/proveedor/receta y Paso 3", () => {
    const l5000 = getConfirmedGlassL5000Fixture();
    const l5000Codes = [...new Set(l5000.definition.perfiles.map((p) => p.codigoPerfil))];
    const basePrices = makePreviewPrices(l5000Codes, { providerKey: "alumco", netPrice: 15000 });

    const baseComplete = buildGuidedTechnicalCostSuggestion({
      recipe: l5000,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: basePrices,
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });
    expect(baseComplete.status).toBe("complete");
    const expectedBase =
      baseComplete.profilesCostNet! +
      baseComplete.accessoriesCostNet! +
      baseComplete.glassCostNet!;
    expect(baseComplete.usableBaseCostGroupNet).toBe(expectedBase);
    expect(baseComplete.suggestedNetTotal).toBe(expectedBase * 2);

    // Cambio de medidas y cantidad recalcula costo/sugerencia
    const largerQty = buildGuidedTechnicalCostSuggestion({
      recipe: l5000,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 2200,
      altoMm: 2000,
      cantidad: 4,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: basePrices,
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });
    expect(largerQty.status).toBe("complete");
    expect(largerQty.usableBaseCostGroupNet!).toBeGreaterThan(baseComplete.usableBaseCostGroupNet!);

    // Cambio de proveedor sin precios compatibles invalida sugerencia (mantiene solo vidrio conocido como parcial)
    const switchedProvider = buildGuidedTechnicalCostSuggestion({
      recipe: l5000,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "arquetipo",
      profilePrices: basePrices,
      glassCutPresentations: [makeGlassCutPresentation()],
      asOfDate: "2026-11-21",
    });
    expect(switchedProvider.status).toBe("partial");
    expect(switchedProvider.suggestedNetTotal).toBeNull();
  });

  it("completa perfiles + vidrio supplier_cut + accesorios en receta confirmada y L25 (incluyendo Pz/Mt/Tubo) manteniendo L42 testing bloqueada", () => {
    const l5000 = getConfirmedGlassL5000Fixture();
    const l5000Codes = [...new Set(l5000.definition.perfiles.map((p) => p.codigoPerfil))];
    const l5000AccessoryPrices: CatalogPresentationPrice[] = [
      {
        presentationId: "acc-carros",
        providerKey: "alumco",
        familyKeys: ["universal:aluminio:l5000"],
        technicalCode: "ACC-CARRO",
        recipeAccessoryNames: ["Carros o rodamientos"],
        technicalName: "Carros o rodamientos",
        supplierSku: "ALU-CARRO",
        presentationDescription: "Carro corredera",
        finishCode: "",
        finishName: null,
        finishResolution: "finish_independent",
        purchaseUnit: "UN",
        commercialLengthMm: null,
        netPrice: 2500,
        currency: "CLP",
        priceBasis: "commercial_presentation",
        priceListId: "pl-acc",
        priceListRevision: "2026-11",
        priceReferenceStatus: "within_stated_validity",
      },
      {
        presentationId: "acc-cierre",
        providerKey: "alumco",
        familyKeys: ["universal:aluminio:l5000"],
        technicalCode: "ACC-CIERRE",
        recipeAccessoryNames: ["Cierre o seguro"],
        technicalName: "Cierre o seguro",
        supplierSku: "ALU-CIERRE",
        presentationDescription: "Cierre central",
        finishCode: "",
        finishName: null,
        finishResolution: "finish_independent",
        purchaseUnit: "UN",
        commercialLengthMm: null,
        netPrice: 3000,
        currency: "CLP",
        priceBasis: "commercial_presentation",
        priceListId: "pl-acc",
        priceListRevision: "2026-11",
        priceReferenceStatus: "within_stated_validity",
      },
      {
        presentationId: "acc-felpa",
        providerKey: "alumco",
        familyKeys: ["universal:aluminio:l5000"],
        technicalCode: "ACC-FELPA",
        recipeAccessoryNames: ["Felpa o sello"],
        technicalName: "Felpa o sello",
        supplierSku: "ALU-FELPA",
        presentationDescription: "Felpa corredera",
        finishCode: "",
        finishName: null,
        finishResolution: "finish_independent",
        purchaseUnit: "UN",
        commercialLengthMm: null,
        netPrice: 1000,
        currency: "CLP",
        priceBasis: "commercial_presentation",
        priceListId: "pl-acc",
        priceListRevision: "2026-11",
        priceReferenceStatus: "within_stated_validity",
      },
    ];
    const glassCutPresentation: GlassSupplierCutPresentation = {
      presentationId: "glass-cut-5mm",
      providerKey: "vidrieriacentral",
      category: "monolitico",
      thicknessMm: 5,
      glassDescription: "Incoloro monolítico 5mm",
      purchaseMode: "supplier_cut",
      purchaseUnit: "M2",
      netPricePerM2: 10000,
      minBillableM2PerPane: null,
      currency: "CLP",
      priceReferenceStatus: "within_stated_validity",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
    };

    const l5000Complete = buildGuidedTechnicalCostSuggestion({
      recipe: l5000,
      organizationId: 99,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l5000Codes, { providerKey: "alumco", netPrice: 15000 }),
      accessoryPrices: l5000AccessoryPrices,
      glassCutPresentations: [glassCutPresentation],
      asOfDate: "2026-11-21",
    });

    expect(l5000Complete.status).toBe("complete");
    expect(l5000Complete.profilesCostNet).toBe(105000);
    // 2 carros (2*2500) + 1 cierre (3000) + 1 felpa (1000) = 9000
    expect(l5000Complete.accessoriesCostNet).toBe(9000);
    expect(l5000Complete.glassCostNet).toBeGreaterThan(0);
    expect(l5000Complete.suggestedNetTotal).toBe(l5000Complete.usableBaseCostGroupNet! * 2);

    // Accesorio ambiguo (2 presentaciones compatibles) fuerza Costo parcial
    const l5000AmbiguousAcc = buildGuidedTechnicalCostSuggestion({
      recipe: l5000,
      organizationId: 99,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l5000Codes, { providerKey: "alumco", netPrice: 15000 }),
      accessoryPrices: [
        ...l5000AccessoryPrices,
        {
          ...l5000AccessoryPrices[0]!,
          presentationId: "acc-carros-dup",
          supplierSku: "ALU-CARRO-2",
        },
      ],
      glassCutPresentations: [glassCutPresentation],
      asOfDate: "2026-11-21",
    });
    expect(l5000AmbiguousAcc.status).toBe("partial");
    expect(l5000AmbiguousAcc.missingItems.some((m) => /Identificación ambigua/i.test(m.reason))).toBe(true);

    // L25 Pierna cerrada + Normal: accesorios Zeta en Pz -> UN, Mt -> M, TUBO -> Tubo
    const bundle = buildAllSodalL25Recipes().find(
      (entry) => entry.recipeId === "monolitico_pierna_cerrada_2h_1800x1500"
    )!;
    const l25Record: FabricationRecipeRecord = {
      id: bundle.recipeId,
      organizationId: null,
      lineTemplateId: 25,
      scope: "ventora",
      providerName: "SODAL",
      lineName: "L25",
      typology: bundle.definition.identidad.tipologia,
      leavesCount: bundle.identity.leaves,
      variant: bundle.identity.variantSlug,
      version: 1,
      status: "validated",
      definition: bundle.definition,
      sourceType: "manufacturer",
      sourceReference: bundle.sourceReference,
      sourceName: "SODAL",
      sourceRevision: SODAL_L25_FORMULA_VERSION,
      parentRecipeId: null,
      validatedAt: "2026-10-07T00:00:00.000Z",
      validatedBy: "qa",
      createdAt: "2026-10-07T00:00:00.000Z",
      updatedAt: "2026-10-07T00:00:00.000Z",
      eliminadoEn: null,
    };
    const l25Codes = [...new Set(l25Record.definition.perfiles.map((p) => p.codigoPerfil))];
    const l25AccessoryPrices: CatalogPresentationPrice[] = l25Record.definition.accesorios.map(
      (acc, index) => ({
        presentationId: `l25-acc-${index}`,
        providerKey: "arquetipo",
        familyKeys: ["universal:aluminio:l25"],
        technicalCode: acc.codigo,
        recipeAccessoryNames: [acc.nombre],
        technicalName: acc.nombre,
        supplierSku: `ARQ-${acc.codigo}`,
        presentationDescription: acc.nombre,
        finishCode: "",
        finishName: null,
        finishResolution: "finish_independent",
        // Simula unidades persistidas de organizacion_presentaciones_taller / catalogo (UN, M, Tubo)
        purchaseUnit:
          acc.unidad === "Pz" ? "UN" : acc.unidad === "Mt" ? "M" : acc.unidad ?? "UN",
        commercialLengthMm: null,
        netPrice: 500,
        currency: "CLP",
        priceBasis: "commercial_presentation",
        priceListId: "pl-l25",
        priceListRevision: "2026-11",
        priceReferenceStatus: "within_stated_validity",
      })
    );

    const l25Qty2 = buildGuidedTechnicalCostSuggestion({
      recipe: l25Record,
      organizationId: 99,
      lineTemplateId: 25,
      anchoMm: 1800,
      altoMm: 1500,
      cantidad: 2,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l25",
      supplierFamilyKey: "universal:aluminio:l25",
      providerKey: "arquetipo",
      profilePrices: makePreviewPrices(l25Codes, { providerKey: "arquetipo", netPrice: 12000 }),
      accessoryPrices: l25AccessoryPrices,
      glassCutPresentations: [glassCutPresentation],
      asOfDate: "2026-11-21",
    });

    expect(l25Qty2.status).toBe("complete");
    expect(l25Qty2.accessoriesCostNet).toBeGreaterThan(0);
    // Para cantidad 2 de 1800x1500: vidrio = 2 * (2 paños 835x1372 = 2.2912 m2) * 10000 = ~45825
    expect(l25Qty2.glassCostNet).toBeGreaterThan(40000);

    // L42 testing jamás promociona a complete aunque perfiles + vidrio tengan precio
    const l42Testing = resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l42",
      lineTemplateId: 42,
      organizationId: 99,
      lineName: "Serie 42",
      variant: "arquetipo_sin_camara_monolitico",
      leavesCount: 1,
      typology: "proyectante",
      glassName: "Incoloro monolítico 5mm",
      includeDocumentedVariants: true,
      recipes: [],
    })[0]!;
    const l42Codes = [...new Set(l42Testing.definition.perfiles.map((p) => p.codigoPerfil))];
    const l42WithGlass = buildGuidedTechnicalCostSuggestion({
      recipe: l42Testing,
      organizationId: 99,
      lineTemplateId: 42,
      anchoMm: 1000,
      altoMm: 1000,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l42",
      supplierFamilyKey: "universal:aluminio:l42",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l42Codes, { providerKey: "alumco", netPrice: 12000 }),
      glassCutPresentations: [glassCutPresentation],
      asOfDate: "2026-11-21",
    });
    expect(l42WithGlass.status).toBe("partial");
    expect(l42WithGlass.isRecipeValidated).toBe(false);
    expect(l42WithGlass.accessoriesCostNet).toBeNull();
    expect(l42WithGlass.usableBaseCostGroupNet).toBeNull();
  });

  it("un vidrio valorizado nunca elimina accesorios pendientes sin código técnico y conserva identidad inequívoca", () => {
    const l5000 = getL5000Recipe();
    const l5000Codes = [...new Set(l5000.definition.perfiles.map((p) => p.codigoPerfil))];
    const glassOnlyPresentations = [makeGlassCutPresentation({ organizationId: 99 })];

    const withValuedGlassAndMissingAccessories = buildGuidedTechnicalCostSuggestion({
      recipe: l5000,
      organizationId: 99,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l5000Codes, { providerKey: "alumco", netPrice: 15000 }),
      accessoryPrices: [],
      glassCutPresentations: glassOnlyPresentations,
      asOfDate: "2026-11-21",
    });

    expect(withValuedGlassAndMissingAccessories.status).toBe("partial");
    expect(withValuedGlassAndMissingAccessories.glassCostNet).toBeGreaterThan(0);
    expect(withValuedGlassAndMissingAccessories.usableBaseCostGroupNet).toBeNull();
    expect(withValuedGlassAndMissingAccessories.missingItems).toHaveLength(3);
    expect(
      withValuedGlassAndMissingAccessories.missingItems.every(
        (item) =>
          item.itemKind === "accessory" &&
          item.technicalCode === null &&
          item.identityKey?.startsWith("accessory|")
      )
    ).toBe(true);
    expect(
      withValuedGlassAndMissingAccessories.missingItems.map((item) => item.description).sort()
    ).toEqual(["Carros o rodamientos", "Cierre o seguro", "Felpa o sello"]);

    // Estimación comercial por acabado alternativo + vidrio de otra organización jamás promociona a complete
    const estimateWithWrongOrgGlass = buildGuidedTechnicalCostSuggestion({
      recipe: l5000,
      organizationId: 99,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#111111",
      material: "Aluminio",
      finishName: "Negro",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l5000Codes, {
        providerKey: "alumco",
        priceSourceFinishName: "Titanio",
        finishPriceBasis: "base_reference_other_finish",
      }),
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [makeGlassCutPresentation({ organizationId: 3 })],
      asOfDate: "2026-11-21",
    });

    expect(estimateWithWrongOrgGlass.status).not.toBe("complete");
    expect(estimateWithWrongOrgGlass.glassCostNet).toBeNull();
    expect(estimateWithWrongOrgGlass.usableBaseCostGroupNet).toBeNull();

    // historical_reference con origin: "workshop" sin reconfirmar tampoco habilita Costo verificado en Guiada
    const unconfirmedWorkshopHistory = buildGuidedTechnicalCostSuggestion({
      recipe: l5000,
      organizationId: 99,
      lineTemplateId: 5000,
      anchoMm: 1200,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l5000Codes, {
        providerKey: "alumco",
        priceSource: "workshop",
        priceReferenceStatus: "historical_reference",
      }),
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [
        makeGlassCutPresentation({
          organizationId: 99,
          origin: "workshop",
          priceReferenceStatus: "historical_reference",
        }),
      ],
      asOfDate: "2026-11-21",
    });

    expect(unconfirmedWorkshopHistory.status).toBe("partial");
    expect(unconfirmedWorkshopHistory.usableBaseCostGroupNet).toBeNull();
    expect(unconfirmedWorkshopHistory.glassCostNet).toBeNull();
    expect(unconfirmedWorkshopHistory.nonVerifiedReasons[0]).toMatch(/histórica/i);
  });

  it("impide marcar como Costo verificado el vidrio nominal 0 mm de L5000 y L20, mantiene cálculo provisional y no contamina Paso 3", () => {
    const l5000Nominal = getL5000Recipe();
    const l5000Codes = [...new Set(l5000Nominal.definition.perfiles.map((p) => p.codigoPerfil))];
    const sodalGlass = makeGlassCutPresentation({
      presentationId: "sodal-qa-5mm",
      providerKey: "taller:3:sodal",
      netPricePerM2: 14500,
    });

    // Caso 1: L5000 1800x1500 con $14.500/m² y accesorios faltantes -> Costo parcial ($39.150 vidrio provisional)
    const l5000PartialMissingAcc = buildGuidedTechnicalCostSuggestion({
      recipe: l5000Nominal,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1800,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l5000Codes, { providerKey: "alumco", netPrice: 13889 }),
      accessoryPrices: [],
      glassCutPresentations: [sodalGlass],
      asOfDate: "2026-11-21",
    });

    expect(l5000PartialMissingAcc.status).toBe("partial");
    expect(l5000PartialMissingAcc.glassCostNet).toBe(39150);
    expect(l5000PartialMissingAcc.glassMeasurementStatus).toBe("nominal_unconfirmed");
    expect(l5000PartialMissingAcc.glassCostIsProvisional).toBe(true);
    expect(l5000PartialMissingAcc.usableBaseCostGroupNet).toBeNull();
    expect(l5000PartialMissingAcc.suggestedNetTotal).toBeNull();
    expect(l5000PartialMissingAcc.nonVerifiedReasons[0]).toMatch(/geometría nominal/i);

    // Paso 3 con ítem en precio_directo no contabiliza la suma parcial ni calcula rentabilidad verificada
    const itemWithoutAutoCost = calculateComponentItem({
      codigo: "V2",
      tipo: "Ventana",
      lineaComercial: "Serie 5000",
      vidrio: "Incoloro monolítico 5mm",
      nombre: "Ventana corredera 2 hojas",
      ancho: 1800,
      alto: 1500,
      cantidad: 1,
      costoProveedorUnitario: 0,
      precioUnitario: 216000,
      origenPrecio: "precio_directo",
    });
    const paso3 = buildQuoteStudioFinancialSummary({
      items: [itemWithoutAutoCost],
      quotePricingMode: "por_item",
      neto: 216000,
      total: 257040,
    });
    expect(paso3.materialCostSource).toBe("none");
    expect(paso3.costBasisStatus).toBe("sin_materiales");
    expect(paso3.costoMateriales).toBe(0);
    expect(paso3.isProfitabilityComplete).toBe(false);

    // Caso 2: Incluso si perfiles y todos los accesorios tienen precio en L5000, vidrio nominal bloquea Costo verificado
    const l5000FullPricesNominalGlass = buildGuidedTechnicalCostSuggestion({
      recipe: l5000Nominal,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 1800,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l5000Codes, { providerKey: "alumco", netPrice: 13889 }),
      accessoryPrices: makeL5000AccessoryPrices("alumco"),
      glassCutPresentations: [sodalGlass],
      asOfDate: "2026-11-21",
    });
    expect(l5000FullPricesNominalGlass.status).toBe("partial");
    expect(l5000FullPricesNominalGlass.glassCostNet).toBe(39150);
    expect(l5000FullPricesNominalGlass.glassCostIsProvisional).toBe(true);
    expect(l5000FullPricesNominalGlass.usableBaseCostGroupNet).toBeNull();
    expect(l5000FullPricesNominalGlass.suggestedNetTotal).toBeNull();

    // Caso 3: L20 fallback universal también usa vidrio nominal 0 mm sin confirmar
    const l20Nominal = resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l20",
      lineTemplateId: 20,
      organizationId: 3,
      lineName: "Serie 20",
      variant: "estandar",
      leavesCount: 2,
      typology: "corredera",
      glassName: "Incoloro monolítico 5mm",
      recipes: [],
    })[0]!;
    const l20Codes = [...new Set(l20Nominal.definition.perfiles.map((p) => p.codigoPerfil))];
    const l20NominalCost = buildGuidedTechnicalCostSuggestion({
      recipe: l20Nominal,
      organizationId: 3,
      lineTemplateId: 20,
      anchoMm: 1800,
      altoMm: 1500,
      cantidad: 1,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l20",
      supplierFamilyKey: "universal:aluminio:l20",
      providerKey: "alumco",
      profilePrices: makePreviewPrices(l20Codes, { providerKey: "alumco", netPrice: 12000 }),
      glassCutPresentations: [sodalGlass],
      asOfDate: "2026-11-21",
    });
    expect(l20NominalCost.status).toBe("partial");
    expect(l20NominalCost.glassMeasurementStatus).toBe("nominal_unconfirmed");
    expect(l20NominalCost.glassCostIsProvisional).toBe(true);
    expect(l20NominalCost.usableBaseCostGroupNet).toBeNull();
  });
});
