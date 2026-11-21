import { buildGuidedTechnicalCostSuggestion } from "../guided-technical-cost-suggestion.service";
import type { SupplierProfilePricePreview } from "../supplier-presentation-resolution.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import {
  calculateComponentItem,
  calculateCotizacionWorkflowTotals,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";

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

describe("buildGuidedTechnicalCostSuggestion & Paso 2 -> Paso 3 integración", () => {
  it("calcula costo verificado, recargo 100% y precio neto sugerido sin IVA en Paso 2 y valida Paso 3 en ambos modos tributarios", () => {
    const recipe = getL5000Recipe();
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
      backedGlassCostNet: 15000,
    });

    expect(suggestion.status).toBe("complete");
    expect(suggestion.defaultMarkupPct).toBe(100);
    expect(suggestion.profilesCostNet).toBe(105000);
    expect(suggestion.glassCostNet).toBe(15000);
    expect(suggestion.usableBaseCostGroupNet).toBe(120000);
    expect(suggestion.markupAmountNet).toBe(120000);
    expect(suggestion.suggestedNetTotal).toBe(240000);

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

    expect(item.precioUnitario).toBe(240000);
    expect(item.precioTotal).toBe(240000);

    const totalsWithVat = calculateCotizacionWorkflowTotals([item], 0, 0, {
      mostrarIva: true,
      commercialRoundingIncrement: 1,
    });
    expect(totalsWithVat.neto).toBe(240000);
    expect(totalsWithVat.iva).toBe(45600);
    expect(totalsWithVat.total).toBe(285600);

    const totalsWithVatRounded = calculateCotizacionWorkflowTotals([item], 0, 0, {
      mostrarIva: true,
      commercialRoundingIncrement: 1000,
    });
    expect(totalsWithVatRounded.total).toBe(286000);

    const totalsFinalPrices = calculateCotizacionWorkflowTotals([item], 0, 0, {
      mostrarIva: false,
      commercialRoundingIncrement: 1,
    });
    expect(totalsFinalPrices.total).toBe(240000);
  });

  it("evita duplicar costos por cantidad cuando costInputScope es group_total y escala tiras al aumentar cantidad o dimensiones", () => {
    const recipe = getL5000Recipe();
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
      backedGlassCostNet: 15000,
    });

    const threeUnits = buildGuidedTechnicalCostSuggestion({
      recipe,
      organizationId: 3,
      lineTemplateId: 5000,
      anchoMm: 2200,
      altoMm: 1800,
      cantidad: 3,
      vidrio: "Incoloro monolítico 5mm",
      colorHex: "#a8a8a8",
      material: "Aluminio",
      finishName: "Mate",
      catalogLineKey: "ventora:l5000",
      supplierFamilyKey: "universal:aluminio:l5000",
      providerKey: "alumco",
      profilePrices: prices,
      backedGlassCostNet: 45000,
    });

    expect(threeUnits.profilesCostNet!).toBeGreaterThan(oneUnit.profilesCostNet!);

    const groupItem = calculateComponentItem({
      codigo: "V1",
      tipo: "Ventana",
      nombre: "Ventana x3",
      cantidad: 3,
      costoProveedorUnitario: threeUnits.usableBaseCostGroupNet!,
      margenPct: 100,
      costInputScope: "group_total",
      origenPrecio: "margen",
    });
    expect(groupItem.costoProveedorTotal).toBe(threeUnits.usableBaseCostGroupNet);
    expect(groupItem.precioTotal).toBe(threeUnits.suggestedNetTotal);

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
      backedGlassCostNet: null,
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
      backedGlassCostNet: 15000,
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
      backedGlassCostNet: 15000,
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
      backedGlassCostNet: 15000,
    });
    expect(mixedResult.status).toBe("partial");
    expect(mixedResult.usableBaseCostGroupNet).toBeNull();
    expect(mixedResult.nonVerifiedReasons).toContain("Las presentaciones seleccionadas mezclan más de una moneda.");
  });

  it("certifica flujo determinista completo: sugerencia 100%, cambios de medidas/cantidad/proveedor/receta y Paso 3", () => {
    const l5000 = getL5000Recipe();
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
      backedGlassCostNet: 15000,
    });
    expect(baseComplete.status).toBe("complete");
    expect(baseComplete.usableBaseCostGroupNet).toBe(120000);
    expect(baseComplete.suggestedNetTotal).toBe(240000);

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
      backedGlassCostNet: 120000,
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
      backedGlassCostNet: 15000,
    });
    expect(switchedProvider.status).toBe("partial");
    expect(switchedProvider.suggestedNetTotal).toBeNull();
  });
});
