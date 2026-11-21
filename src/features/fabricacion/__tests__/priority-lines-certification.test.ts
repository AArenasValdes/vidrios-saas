import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { parseSodalL25VariantSlug } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import {
  buildPartialTechnicalCostSnapshot,
  type CatalogPresentationPrice,
} from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import {
  applyLineTemplateToComponentForm,
  buildItemFromForm,
  createEmptyComponentForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";

function makeTemplate(input: {
  id: number;
  nombre: string;
  catalogKey: string;
  familyKey: string;
  tipologia: string;
  hojas: number;
  apertura: string;
}): CotizacionLineTemplate {
  return {
    id: input.id,
    organizationId: "3",
    catalogKey: input.catalogKey,
    nombre: input.nombre,
    categoria: "aluminio",
    unidadCobro: "m2",
    material: "Aluminio",
    vidrioPrincipalRecomendado: "Incoloro monolítico 5mm",
    costoBase: 0,
    precioM2Sugerido: 180000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
    mermaPct: 0,
    margenObjetivoPct: null,
    proveedor: null,
    vigenciaDesde: null,
    vigenciaHasta: null,
    catalogMetadata: {
      familyKey: input.familyKey,
      compatibility: {
        componentTypes: ["Ventana"],
        openingTypes: [input.apertura],
        leavesCounts: [input.hojas],
        materials: ["Aluminio"],
      },
    },
    isActive: true,
    sortOrder: 0,
    creadoEn: null,
    actualizadoEn: null,
    eliminadoEn: null,
  };
}

function makePrice(input: {
  id: string;
  familyKey: string;
  providerKey: string;
  technicalCode: string;
  finishName?: string;
  netPrice: number;
  commercialLengthMm?: number;
}): CatalogPresentationPrice {
  return {
    presentationId: input.id,
    providerKey: input.providerKey,
    familyKeys: [input.familyKey],
    technicalCode: input.technicalCode,
    technicalName: `Perfil ${input.technicalCode}`,
    supplierSku: `${input.providerKey}-${input.technicalCode}`,
    presentationDescription: "Tira 6000 mm",
    finishResolution: "specific",
    finishCode: "M",
    finishName: input.finishName ?? "Mate",
    commercialLengthMm: input.commercialLengthMm ?? 6000,
    purchaseUnit: "TIRA",
    netPrice: input.netPrice,
    currency: "CLP",
    priceBasis: "commercial_presentation",
    priceListId: "pl-1",
    priceListRevision: "2026-11",
    priceListPublishedOn: "2026-11-01",
    priceListValidUntil: null,
    priceReferenceStatus: "within_stated_validity",
    origin: undefined,
  };
}

function getL25ClosedNormalRecord(lineTemplateId: number): FabricationRecipeRecord {
  const bundle = buildAllSodalL25Recipes().find(
    (entry) => entry.recipeId === "monolitico_pierna_cerrada_2h_1800x1500"
  )!;
  return {
    id: bundle.recipeId,
    organizationId: null,
    lineTemplateId,
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
}

describe("Certificación de las 4 configuraciones prioritarias", () => {
  it("certifica L5000 Corredera 2H (identidad, despiece, paridad Guiada/Constructor, tiras multi-unidad y cobertura de precios)", () => {
    const template = makeTemplate({
      id: 5000,
      nombre: "Serie 5000 — Corredera 2 hojas",
      catalogKey: "ventora:l5000",
      familyKey: "universal:aluminio:l5000",
      tipologia: "corredera",
      hojas: 2,
      apertura: "Corredera",
    });

    const guidedForm = applyLineTemplateToComponentForm(
      {
        ...createEmptyComponentForm([], "", "precio_directo"),
        codigo: "V1",
        tipo: "Ventana",
        nombre: "Ventana corredera",
        ancho: "1200",
        alto: "1500",
        cantidad: "1",
        sistema: "Corredera",
        configuracion: "2 hojas",
        sheetScheme: "2 hojas",
        vidrio: "Incoloro monolítico 5mm",
        fabricacionVariante: "caracol",
      },
      template,
      { fabricationRecipes: [], organizationId: 3 }
    );
    const constructorForm = applyLineTemplateToComponentForm(
      {
        ...createEmptyComponentForm([], "", "precio_directo"),
        codigo: "V1",
        tipo: "Ventana",
        nombre: "Ventana corredera",
        ancho: "1200",
        alto: "1500",
        cantidad: "1",
        hojasBase: 1,
        sistema: "Personalizado",
        configuracion: "Personalizado",
        sheetScheme: "",
        guidedVisualConfig: createQuoteConstructorPresetConfig("corredera", {
          widthMm: 1200,
          heightMm: 1500,
        }),
        vidrio: "Incoloro monolítico 5mm",
        fabricacionVariante: "caracol",
      },
      template,
      { fabricationRecipes: [], organizationId: 3 }
    );

    const guidedItem = buildItemFromForm(guidedForm, [], "item-g", {
      lineTemplates: [template],
      fabricationRecipes: [],
      organizationId: 3,
    });
    const constructorItem = buildItemFromForm(constructorForm, [], "item-c", {
      lineTemplates: [template],
      fabricationRecipes: [],
      organizationId: 3,
    });

    const guidedDespiece = resolveFabricacionDespieceForQuoteItem({
      item: guidedItem,
      recipes: [],
      organizationId: 3,
      lineTemplateId: template.id,
      lineCatalogKey: template.catalogKey,
      supplierFamilyKey: "universal:aluminio:l5000",
    });
    const constructorDespiece = resolveFabricacionDespieceForQuoteItem({
      item: constructorItem,
      recipes: [],
      organizationId: 3,
      lineTemplateId: template.id,
      lineCatalogKey: template.catalogKey,
      supplierFamilyKey: "universal:aluminio:l5000",
    });

    expect(guidedDespiece.estado).toBe("calculado");
    expect(constructorDespiece.estado).toBe("calculado");
    expect(guidedDespiece.formal?.recipeStatus).toBe("validated");
    expect(constructorDespiece.formal?.recipeId).toBe(guidedDespiece.formal?.recipeId);
    const pickGeometry = (rows: NonNullable<typeof guidedDespiece.formal>["pauta"]) =>
      rows.map(({ codigoPerfil, medidaMm, cantidadPiezas, totalLinealMm, funcion }) => ({
        codigoPerfil,
        medidaMm,
        cantidadPiezas,
        totalLinealMm,
        funcion,
      }));
    expect(pickGeometry(constructorDespiece.formal!.pauta)).toEqual(
      pickGeometry(guidedDespiece.formal!.pauta)
    );
    const pickGlass = (rows: NonNullable<typeof guidedDespiece.formal>["vidrios"]) =>
      rows.map(({ nombre, anchoMm, altoMm, cantidadPiezas, totalM2 }) => ({
        nombre,
        anchoMm,
        altoMm,
        cantidadPiezas,
        totalM2,
      }));
    expect(pickGlass(constructorDespiece.formal!.vidrios)).toEqual(
      pickGlass(guidedDespiece.formal!.vidrios)
    );

    const twoUnitsItem = buildItemFromForm(
      { ...guidedForm, cantidad: "2" },
      [],
      "item-g2",
      { lineTemplates: [template], fabricationRecipes: [], organizationId: 3 }
    );
    const twoUnitsDespiece = resolveFabricacionDespieceForQuoteItem({
      item: twoUnitsItem,
      recipes: [],
      organizationId: 3,
      lineTemplateId: template.id,
      lineCatalogKey: template.catalogKey,
      supplierFamilyKey: "universal:aluminio:l5000",
    });
    expect(twoUnitsDespiece.formal!.pauta[0]!.cantidadPiezas).toBe(
      guidedDespiece.formal!.pauta[0]!.cantidadPiezas * 2
    );

    const workSnapshot = construirFabricacionTrabajoSnapshot({
      items: [
        {
          id: twoUnitsItem.id,
          codigo: twoUnitsItem.codigo,
          nombre: twoUnitsItem.nombre,
          lineaComercial: twoUnitsItem.lineaComercial,
          snapshot: twoUnitsDespiece.formal!,
        },
      ],
    });
    expect(workSnapshot.bars.length).toBeGreaterThan(0);

    const profileCodes = [...new Set(workSnapshot.bars.flatMap((bar) => bar.cortes.map((c) => c.codigoPerfil)))];
    const validPrices = profileCodes.map((code, idx) =>
      makePrice({
        id: `p-l5000-${idx}`,
        familyKey: "universal:aluminio:l5000",
        providerKey: "alumco",
        technicalCode: code,
        finishName: "Mate",
        netPrice: 10000,
      })
    );
    const costSnapshot = buildPartialTechnicalCostSnapshot({
      workSnapshot,
      quoteItems: [
        {
          code: "V1",
          color: "Aluminio mate",
          colorHex: "#a8a8a8",
          finishName: "Mate",
          catalogLineKey: "ventora:l5000",
          supplierFamilyKey: "universal:aluminio:l5000",
          providerKey: "alumco",
          glassDescription: "Incoloro monolítico 5mm",
        },
      ],
      availablePrices: validPrices,
    });
    expect(costSnapshot?.lines.length).toBe(profileCodes.length);
    expect(costSnapshot?.knownNetTotal).toBeGreaterThan(0);
    // Glass lacks purchase presentation -> snapshot remains partial (never pretends complete)
    expect(costSnapshot?.status).toBe("partial");
    expect(costSnapshot?.missing.some((entry) => entry.technicalCode === null)).toBe(true);

    // Negative check: wrong family with SAME finish ("Mate") must not price L5000 cuts
    const wrongFamilySnapshot = buildPartialTechnicalCostSnapshot({
      workSnapshot,
      quoteItems: [
        {
          code: "V1",
          color: "Aluminio mate",
          colorHex: "#a8a8a8",
          finishName: "Mate",
          catalogLineKey: "ventora:l5000",
          supplierFamilyKey: "universal:aluminio:l5000",
          supplierProviderKey: "alumco",
        },
      ],
      availablePrices: profileCodes.map((code, idx) =>
        makePrice({
          id: `wrong-${idx}`,
          familyKey: "universal:aluminio:l20",
          providerKey: "alumco",
          technicalCode: code,
          finishName: "Mate",
          netPrice: 10000,
        })
      ),
    });
    expect(wrongFamilySnapshot?.lines).toHaveLength(0);
    expect(wrongFamilySnapshot?.knownNetTotal).toBeNull();
  });

  it("certifica L20 Corredera 2H (pierna abierta jamba 2009, paridad y cobertura de perfiles)", () => {
    const template = makeTemplate({
      id: 20,
      nombre: "Serie 20 — Corredera 2 hojas",
      catalogKey: "ventora:l20",
      familyKey: "universal:aluminio:l20",
      tipologia: "corredera",
      hojas: 2,
      apertura: "Corredera",
    });

    const form = applyLineTemplateToComponentForm(
      {
        ...createEmptyComponentForm([], "", "precio_directo"),
        codigo: "V1",
        tipo: "Ventana",
        nombre: "Ventana corredera",
        ancho: "1200",
        alto: "1500",
        cantidad: "1",
        sistema: "Corredera",
        configuracion: "2 hojas",
        sheetScheme: "2 hojas",
        vidrio: "Incoloro monolítico 4mm",
        fabricacionVariante: "pierna_abierta_jamba_2009",
      },
      template,
      { fabricationRecipes: [], organizationId: 3 }
    );
    const item = buildItemFromForm(form, [], "item-l20", {
      lineTemplates: [template],
      fabricationRecipes: [],
      organizationId: 3,
    });
    const despiece = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [],
      organizationId: 3,
      lineTemplateId: template.id,
      lineCatalogKey: template.catalogKey,
      supplierFamilyKey: "universal:aluminio:l20",
    });

    expect(despiece.estado).toBe("calculado");
    expect(despiece.formal?.recipeStatus).toBe("validated");
    expect(despiece.formal?.pauta.length).toBeGreaterThan(0);
    expect(despiece.formal?.vidrios.length).toBeGreaterThan(0);

    const workSnapshot = construirFabricacionTrabajoSnapshot({
      items: [
        {
          id: item.id,
          codigo: item.codigo,
          nombre: item.nombre,
          lineaComercial: item.lineaComercial,
          snapshot: despiece.formal!,
        },
      ],
    });
    const codes = [...new Set(workSnapshot.bars.flatMap((bar) => bar.cortes.map((c) => c.codigoPerfil)))];
    const costSnapshot = buildPartialTechnicalCostSnapshot({
      workSnapshot,
      quoteItems: [
        {
          code: "V1",
          color: "Blanco",
          colorHex: "#f0eeeb",
          finishName: "Blanco",
          catalogLineKey: "ventora:l20",
          supplierFamilyKey: "universal:aluminio:l20",
          providerKey: "arquetipo",
          glassDescription: "Incoloro monolítico 4mm",
        },
      ],
      availablePrices: codes.map((code, idx) =>
        makePrice({
          id: `p-l20-${idx}`,
          familyKey: "universal:aluminio:l20",
          providerKey: "arquetipo",
          technicalCode: code,
          finishName: "Blanco",
          netPrice: 8500,
        })
      ),
    });
    expect(costSnapshot?.lines.length).toBe(codes.length);
    expect(costSnapshot?.knownNetTotal).toBeGreaterThan(0);
  });

  it("certifica L25 Pierna cerrada + Normal (1800x1500, receta Zeta validada, tiras y precios)", () => {
    const l25Record = getL25ClosedNormalRecord(25);
    const parsed = parseSodalL25VariantSlug(l25Record.variant)!;
    expect(parsed.leg).toBe("closed");
    expect(parsed.reinforcement).toBe("normal");

    const template = makeTemplate({
      id: 25,
      nombre: "Serie 25 — Corredera 2 hojas",
      catalogKey: "ventora:l25",
      familyKey: "universal:aluminio:l25",
      tipologia: "corredera",
      hojas: 2,
      apertura: "Corredera",
    });

    const form = applyLineTemplateToComponentForm(
      {
        ...createEmptyComponentForm([], "", "precio_directo"),
        codigo: "V1",
        tipo: "Ventana",
        nombre: "Ventana corredera",
        ancho: "1800",
        alto: "1500",
        cantidad: "1",
        sistema: "Corredera",
        configuracion: "2 hojas",
        sheetScheme: "2 hojas",
        vidrio: "Incoloro monolítico 5mm",
        fabricacionGlazing: parsed.glazing,
        fabricacionLeg: parsed.leg,
        fabricacionReinforcement: parsed.reinforcement,
        fabricacionVariante: parsed.variantSlug,
        fabricationRecipeId: l25Record.id,
      },
      template,
      { fabricationRecipes: [l25Record], organizationId: 3 }
    );
    const item = buildItemFromForm(form, [], "item-l25", {
      lineTemplates: [template],
      fabricationRecipes: [l25Record],
      organizationId: 3,
    });
    const despiece = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [l25Record],
      organizationId: 3,
      lineTemplateId: template.id,
      lineCatalogKey: template.catalogKey,
      supplierFamilyKey: "universal:aluminio:l25",
    });

    expect(despiece.estado).toBe("calculado");
    expect(despiece.formal?.recipeId).toBe(l25Record.id);
    expect(despiece.formal?.recipeStatus).toBe("validated");
    expect(despiece.formal?.pauta.length).toBeGreaterThan(0);

    const workSnapshot = construirFabricacionTrabajoSnapshot({
      items: [
        {
          id: item.id,
          codigo: item.codigo,
          nombre: item.nombre,
          lineaComercial: item.lineaComercial,
          snapshot: despiece.formal!,
        },
      ],
    });
    const codes = [...new Set(workSnapshot.bars.flatMap((bar) => bar.cortes.map((c) => c.codigoPerfil)))];
    const costSnapshot = buildPartialTechnicalCostSnapshot({
      workSnapshot,
      quoteItems: [
        {
          code: "V1",
          color: "Titanio",
          colorHex: "#7d8791",
          finishName: "Titanio",
          catalogLineKey: "ventora:l25",
          supplierFamilyKey: "universal:aluminio:l25",
          providerKey: "sodal",
          glassDescription: "Incoloro monolítico 5mm",
        },
      ],
      availablePrices: codes.map((code, idx) =>
        makePrice({
          id: `p-l25-${idx}`,
          familyKey: "universal:aluminio:l25",
          providerKey: "sodal",
          technicalCode: code,
          finishName: "Titanio",
          netPrice: 15000,
        })
      ),
    });
    expect(costSnapshot?.lines.length).toBe(codes.length);
    expect(costSnapshot?.knownNetTotal).toBeGreaterThan(0);
  });

  it("certifica L42 Sin cámara como testing/referencial (nunca validada) con perfiles 4209/4202/4229 y precios Arquetipo", () => {
    const template = makeTemplate({
      id: 42,
      nombre: "Serie 42 — Proyectante / paño fijo",
      catalogKey: "ventora:l42",
      familyKey: "universal:aluminio:l42",
      tipologia: "proyectante",
      hojas: 1,
      apertura: "Proyectante",
    });

    const fallbacks = resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l42",
      lineTemplateId: 42,
      organizationId: 3,
      lineName: template.nombre,
      variant: null,
      leavesCount: 1,
      typology: "proyectante",
      glassName: "Incoloro monolítico 5mm",
      includeDocumentedVariants: true,
      recipes: [],
    });
    const noChamberRecipe = fallbacks.find((r) => r.variant === "arquetipo_sin_camara_monolitico")!;
    expect(noChamberRecipe).toBeDefined();
    expect(noChamberRecipe.status).toBe("testing");
    expect(noChamberRecipe.validatedAt).toBeNull();

    const form = applyLineTemplateToComponentForm(
      {
        ...createEmptyComponentForm([], "", "precio_directo"),
        codigo: "V1",
        tipo: "Ventana",
        nombre: "Ventana proyectante",
        ancho: "1000",
        alto: "1200",
        cantidad: "1",
        sistema: "Proyectante",
        configuracion: "Normal",
        sheetScheme: "1 hoja",
        vidrio: "Incoloro monolítico 5mm",
        fabricacionVariante: "arquetipo_sin_camara_monolitico",
        fabricationRecipeId: noChamberRecipe.id,
      },
      template,
      { fabricationRecipes: [noChamberRecipe], organizationId: 3 }
    );
    const item = buildItemFromForm(form, [], "item-l42-nc", {
      lineTemplates: [template],
      fabricationRecipes: [noChamberRecipe],
      organizationId: 3,
    });
    const despiece = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [noChamberRecipe],
      organizationId: 3,
      lineTemplateId: template.id,
      lineCatalogKey: template.catalogKey,
      supplierFamilyKey: "universal:aluminio:l42",
    });

    expect(despiece.estado).toBe("calculado");
    expect(despiece.formal?.recipeStatus).toBe("testing");
    expect(despiece.formal?.pauta.map((p) => p.codigoPerfil)).toEqual(
      expect.arrayContaining(["4209", "4202", "4229"])
    );

    const workSnapshot = construirFabricacionTrabajoSnapshot({
      items: [
        {
          id: item.id,
          codigo: item.codigo,
          nombre: item.nombre,
          lineaComercial: item.lineaComercial,
          snapshot: despiece.formal!,
        },
      ],
    });
    const codes = [...new Set(workSnapshot.bars.flatMap((bar) => bar.cortes.map((c) => c.codigoPerfil)))];
    const costSnapshot = buildPartialTechnicalCostSnapshot({
      workSnapshot,
      quoteItems: [
        {
          code: "V1",
          color: "Mate",
          colorHex: "#a8a8a8",
          finishName: "Mate",
          catalogLineKey: "ventora:l42",
          supplierFamilyKey: "universal:aluminio:l42",
          providerKey: "arquetipo",
          glassDescription: "Incoloro monolítico 5mm",
        },
      ],
      availablePrices: codes.map((code, idx) =>
        makePrice({
          id: `p-l42-${idx}`,
          familyKey: "universal:aluminio:l42",
          providerKey: "arquetipo",
          technicalCode: code,
          finishName: "Mate",
          netPrice: 12000,
        })
      ),
    });
    expect(costSnapshot?.lines.length).toBe(codes.length);
    expect(costSnapshot?.knownNetTotal).toBeGreaterThan(0);
    expect(costSnapshot?.status).toBe("partial");
  });
});
