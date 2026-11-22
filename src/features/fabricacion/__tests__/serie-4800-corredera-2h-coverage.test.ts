import { calcularCubicacionYPauta } from "@/features/fabricacion";
import {
  SERIE_4800_CATALOG_KEY,
  SERIE_4800_FIXTURE_1200X1000,
  SERIE_4800_SOURCE_REFERENCE_NORMAL,
  SERIE_4800_VARIANT_NORMAL,
  SERIE_4800_VARIANT_REFORZADA,
  crearRecetaSerie4800Corredera,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
import { buildAllSodal4800Recipes } from "@/features/fabricacion/fixtures/sodal-4800-zeta-recipes";
import { loadEvidenceSidecarByRecipeId } from "@/features/fabricacion/zeta/zeta-evidence-sidecar-loader";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import {
  resolveUniversalPricedLineFallback,
  resolveUniversalPricedLineFallbacks,
} from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function buildSerie4800QuoteItem(input: {
  ancho?: number;
  alto?: number;
  hojas?: number;
  variante?: string | null;
  vidrio?: string;
  glassTechnicalSpec?: Parameters<typeof encodeCotizacionItemPresentationMeta>[0]["glassTechnicalSpec"];
  fabricacionSnapshot?: CotizacionWorkflowItem["fabricacionSnapshot"];
}): CotizacionWorkflowItem {
  const hojas = input.hojas ?? 2;
  const obs = encodeCotizacionItemPresentationMeta({
    colorHex: "#ffffff",
    material: "Aluminio",
    sistema: "Corredera",
    configuracion: `Corredera ${hojas} hojas`,
    catalogLineKey: SERIE_4800_CATALOG_KEY,
    lineTemplateId: "4800",
    sheetScheme: `${hojas} hojas`,
    fabricacionHojas: hojas,
    fabricacionTipologia: "corredera",
    fabricacionVariante: input.variante ?? undefined,
    glassTechnicalSpec: input.glassTechnicalSpec ?? null,
  });

  return {
    id: "item-4800",
    codigo: "S4800-1",
    tipo: "Ventana",
    lineaComercial: "Serie 4800 — Corredera 2 hojas",
    vidrio: input.vidrio ?? "Float incoloro 5mm",
    nombre: "Ventana Corredera Serie 4800",
    descripcion: `Corredera ${hojas} hojas`,
    ancho: input.ancho ?? 1200,
    alto: input.alto ?? 1000,
    cantidad: 1,
    unidad: "un",
    areaM2: ((input.ancho ?? 1200) * (input.alto ?? 1000)) / 1_000_000,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 30,
    precioUnitario: 150000,
    precioTotal: 150000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: obs,
    fabricacionSnapshot: input.fabricacionSnapshot ?? null,
  };
}

function buildZetaPa56Record(lineTemplateId = 4800): FabricationRecipeRecord {
  const bundle = buildAllSodal4800Recipes().find(
    (entry) => entry.recipeId === "monolitico_2h_1800x1500",
  )!;
  return {
    id: "zeta-4800-pa56",
    organizationId: 1,
    lineTemplateId,
    scope: "ventora",
    providerName: "SODAL",
    lineName: "Serie 4800 — Corredera 2 hojas",
    typology: "corredera",
    leavesCount: 2,
    variant: "monolitico",
    version: 1,
    status: "testing",
    definition: bundle.definition,
    sourceType: "manufacturer",
    sourceReference: bundle.sourceReference,
    sourceName: "SODAL",
    sourceRevision: "Zeta PA-56",
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("Serie 4800 — cobertura P1 Corredera Normal 2H", () => {
  it("calcula 2H normal 1200×1000 con fórmula Diamond sin recetas persistidas (recipes: [])", () => {
    const item = buildSerie4800QuoteItem({
      ancho: 1200,
      alto: 1000,
      hojas: 2,
      variante: SERIE_4800_VARIANT_NORMAL,
      vidrio: "Float incoloro 5mm",
    });

    const res = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });

    expect(res.estado).toBe("calculado");
    expect(res.preliminary).toBe(true);
    expect(res.barsAvailable).toBe(true);
    expect(res.recipe?.status).toBe("testing");
    expect(res.recipe?.sourceReference).toBe(SERIE_4800_SOURCE_REFERENCE_NORMAL);

    const profiles = res.formal!.result.perfiles;
    expect(profiles.map((p) => p.codigoPerfil)).toEqual([
      ...SERIE_4800_FIXTURE_1200X1000.codesNormal,
    ]);
    expect(profiles.map((p) => p.cantidadPiezas)).toEqual([
      ...SERIE_4800_FIXTURE_1200X1000.quantities,
    ]);
    expect(profiles.map((p) => p.medidaMm)).toEqual([
      ...SERIE_4800_FIXTURE_1200X1000.lengthsMm,
    ]);
    expect(profiles.every((p) => p.corte === "90° / 90°")).toBe(true);
    expect(profiles.some((p) => ["4807", "4809", "4810", "4811"].includes(p.codigoPerfil))).toBe(
      false,
    );

    expect(res.formal!.result.vidrios[0]).toMatchObject({
      anchoMm: 556,
      altoMm: 907,
      cantidadPiezas: 2,
    });
  });

  it("contrasta 2H normal 1800×1500 Diamond vs referencia Zeta PA-56 sin fusionar descuentos ni sidecar partial", () => {
    const zetaBundle = buildAllSodal4800Recipes().find(
      (entry) => entry.recipeId === "monolitico_2h_1800x1500",
    )!;
    const zetaSidecar = loadEvidenceSidecarByRecipeId("monolitico_2h_1800x1500")!;

    expect(zetaSidecar.traceabilityStatus).toBe("partial");
    expect(zetaSidecar.productionReady).toBe(false);
    expect(zetaBundle.definition.estado).toBe("lista_para_validar");
    expect(zetaBundle.confirmed.profiles.find((p) => p.code === "4804")?.lengthMm).toBe(886);
    expect(zetaBundle.confirmed.profiles.find((p) => p.code === "4805")?.lengthMm).toBe(886);
    expect(zetaBundle.confirmed.glass[0]).toMatchObject({
      code: "CTI5",
      widthMm: 858,
      heightMm: 1406,
      quantity: 2,
    });

    // Cotización 1800×1500 con float monolítico usa Diamond (885 / 856×1407)
    // y no mezcla ni colisiona con PA-56 aun cuando el registro Zeta existe.
    const item = buildSerie4800QuoteItem({
      ancho: 1800,
      alto: 1500,
      hojas: 2,
      variante: SERIE_4800_VARIANT_NORMAL,
      vidrio: "Float incoloro 5mm",
    });

    const res = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [buildZetaPa56Record(4800)],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });

    expect(res.estado).toBe("calculado");
    expect(res.recipe?.sourceReference).toBe(SERIE_4800_SOURCE_REFERENCE_NORMAL);
    const profiles = res.formal!.result.perfiles;
    expect(profiles.find((p) => p.codigoPerfil === "4804")?.medidaMm).toBe(885);
    expect(profiles.find((p) => p.codigoPerfil === "4805")?.medidaMm).toBe(885);
    expect(res.formal!.result.vidrios[0]).toMatchObject({
      anchoMm: 856,
      altoMm: 1407,
      cantidadPiezas: 2,
    });
  });

  it("calcula medida no observada con Diamond 2H normal y bloquea extrapolación de PA-56 Zeta", () => {
    const zetaOnly = resolveFabricationRecipe([buildZetaPa56Record(4800)], {
      organizationId: 1,
      lineTemplateId: 4800,
      catalogKey: SERIE_4800_CATALOG_KEY,
      tipologia: "corredera",
      hojas: 2,
      anchoTotalMm: 1450,
      altoTotalMm: 1250,
      previewListaParaProbar: true,
    });
    expect(zetaOnly.estado).toBe("sin_receta");

    const item = buildSerie4800QuoteItem({
      ancho: 1450,
      alto: 1250,
      hojas: 2,
      variante: SERIE_4800_VARIANT_NORMAL,
      vidrio: "Incoloro monolítico 4mm",
    });
    const res = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });

    expect(res.estado).toBe("calculado");
    expect(res.formal!.result.perfiles.map((p) => p.medidaMm)).toEqual([
      1434, 1434, 1250, 710, 710, 1218, 1218,
    ]);
    expect(res.formal!.result.vidrios[0]).toMatchObject({
      anchoMm: 681,
      altoMm: 1157,
      cantidadPiezas: 2,
    });
  });

  it("nunca elige silenciosamente entre normal y reforzada cuando la variante es ambigua", () => {
    expect(
      resolveUniversalPricedLineFallback({
        catalogKey: SERIE_4800_CATALOG_KEY,
        lineTemplateId: 4800,
        organizationId: 1,
        lineName: "Serie 4800 — Corredera 2 hojas",
        variant: null,
        leavesCount: 2,
        recipes: [],
      }),
    ).toBeNull();

    const candidates = resolveUniversalPricedLineFallbacks({
      catalogKey: SERIE_4800_CATALOG_KEY,
      lineTemplateId: 4800,
      organizationId: 1,
      lineName: "Serie 4800 — Corredera 2 hojas",
      variant: null,
      leavesCount: 2,
      typology: "corredera",
      includeDocumentedVariants: true,
      recipes: [],
    });
    expect(candidates.map((c) => c.variant)).toEqual(["normal", "reforzada"]);

    const ambiguousItem = buildSerie4800QuoteItem({
      ancho: 1200,
      alto: 1000,
      hojas: 2,
      variante: null,
      vidrio: "Float incoloro 5mm",
    });
    const res = resolveFabricacionDespieceForQuoteItem({
      item: ambiguousItem,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });

    expect(res.estado).toBe("multiples_recetas");
    expect(res.formal).toBeNull();
    expect(res.candidateRecipes?.map((c) => c.variant)).toEqual(["normal", "reforzada"]);
  });

  it("mantiene pendientes variante reforzada, 3H/4H y vidrios incompatibles o CTI5 templado", () => {
    const reforzadaItem = buildSerie4800QuoteItem({
      variante: SERIE_4800_VARIANT_REFORZADA,
      vidrio: "Float incoloro 5mm",
    });
    const resReforzada = resolveFabricacionDespieceForQuoteItem({
      item: reforzadaItem,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });
    expect(resReforzada.estado).toBe("receta_incompleta");
    expect(resReforzada.formal).toBeNull();

    const threeLeafItem = buildSerie4800QuoteItem({
      hojas: 3,
      variante: SERIE_4800_VARIANT_NORMAL,
      vidrio: "Float incoloro 5mm",
    });
    const res3H = resolveFabricacionDespieceForQuoteItem({
      item: threeLeafItem,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });
    expect(res3H.estado).toBe("composicion_sin_receta");
    expect(res3H.formal).toBeNull();

    const dvhItem = buildSerie4800QuoteItem({
      variante: SERIE_4800_VARIANT_NORMAL,
      vidrio: "DVH 4+12+4 (20mm)",
    });
    const resDvh = resolveFabricacionDespieceForQuoteItem({
      item: dvhItem,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });
    expect(resDvh.estado).toBe("composicion_sin_receta");
    expect(resDvh.formal).toBeNull();

    const cti5Item = buildSerie4800QuoteItem({
      ancho: 1800,
      alto: 1500,
      variante: SERIE_4800_VARIANT_NORMAL,
      vidrio: "CTI5 Cristal Templado Incoloro 5mm",
    });
    const resCti5 = resolveFabricacionDespieceForQuoteItem({
      item: cti5Item,
      recipes: [buildZetaPa56Record(4800)],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });
    expect(resCti5.estado).toBe("receta_incompleta");
    expect(resCti5.formal).toBeNull();
    expect(resCti5.message).toMatch(/templado/i);

    const unresolvedGlassItem = buildSerie4800QuoteItem({
      variante: SERIE_4800_VARIANT_NORMAL,
      vidrio: "Vidrio por definir",
    });
    const resPendingGlass = resolveFabricacionDespieceForQuoteItem({
      item: unresolvedGlassItem,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });
    expect(resPendingGlass.estado).toBe("receta_incompleta");
    expect(resPendingGlass.formal).toBeNull();
  });

  it("preserva recetas propias del taller (normal/reforzada) y snapshots históricos sin alterarlos", () => {
    const baseWorkshopDef = crearRecetaSerie4800Corredera({
      lineName: "Serie 4800 Taller",
      variant: SERIE_4800_VARIANT_REFORZADA,
    });
    // Taller ajusta un descuento propio de zócalo (-20 mm) y valida su receta.
    const workshopDefinition = {
      ...baseWorkshopDef,
      estado: "validada" as const,
      perfiles: baseWorkshopDef.perfiles.map((p) =>
        p.codigoPerfil === "4804"
          ? { ...p, reglaMedida: { base: "ancho_por_hoja" as const, ajusteMm: -20 } }
          : p,
      ),
    };
    const workshopRecord: FabricationRecipeRecord = {
      id: "workshop-4800-custom",
      organizationId: 1,
      lineTemplateId: 4800,
      scope: "organization",
      providerName: "Taller propio",
      lineName: "Serie 4800 — Corredera 2 hojas",
      typology: "corredera",
      leavesCount: 2,
      variant: SERIE_4800_VARIANT_REFORZADA,
      version: 2,
      status: "validated",
      definition: workshopDefinition,
      sourceType: "workshop",
      sourceReference: "taller:personalizada:serie-4800:reforzada:v2",
      sourceName: "Taller propio",
      sourceRevision: null,
      parentRecipeId: null,
      validatedAt: "2026-11-20T00:00:00.000Z",
      validatedBy: "qa@ventora.cl",
      createdAt: "2026-11-20T00:00:00.000Z",
      updatedAt: "2026-11-20T00:00:00.000Z",
      eliminadoEn: null,
    };

    const item = buildSerie4800QuoteItem({
      ancho: 1200,
      alto: 1000,
      hojas: 2,
      variante: SERIE_4800_VARIANT_REFORZADA,
      vidrio: "CTI5 Cristal Templado Incoloro 5mm",
    });

    const res = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [workshopRecord],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });

    expect(res.estado).toBe("calculado");
    expect(res.preliminary).toBe(false);
    expect(res.recipe?.id).toBe("workshop-4800-custom");
    // 1200/2 - 20 = 580 (regla propia del taller, no Diamond -15 = 585).
    expect(res.formal!.result.perfiles.find((p) => p.codigoPerfil === "4804")?.medidaMm).toBe(580);
    expect(res.formal!.result.perfiles.some((p) => p.codigoPerfil === "4810")).toBe(true);

    // Snapshot histórico congelado permanece intacto aunque no se pasen recetas.
    const frozenRes = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie4800QuoteItem({
        fabricacionSnapshot: res.formal,
        vidrio: "DVH 4+12+4",
      }),
      recipes: [],
      organizationId: 1,
      lineTemplateId: 4800,
      lineCatalogKey: SERIE_4800_CATALOG_KEY,
    });
    expect(frozenRes.formal?.recipeId).toBe("workshop-4800-custom");
    expect(frozenRes.formal?.pauta.length).toBeGreaterThan(0);
    expect(frozenRes.cubication?.cuts.length).toBeGreaterThan(0);
    expect(frozenRes.barsAvailable).toBe(true);
    expect(frozenRes.formal?.result.perfiles.find((p) => p.codigoPerfil === "4804")?.medidaMm).toBe(
      580,
    );
  });
});
