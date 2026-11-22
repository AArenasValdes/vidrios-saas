import { calcularCubicacionYPauta } from "@/features/fabricacion";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import {
  SERIE_45_CATALOG_KEY,
  SERIE_45_FIXTURE_1200X1000,
  SERIE_45_FIXTURE_1500X2000,
  SERIE_45_SOURCE_REFERENCE,
  SERIE_45_VARIANT,
  crearRecetaSerie45Practicable,
} from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import { resolveFabricacionContextFromLineCatalog } from "@/features/fabricacion/services/fabricacion-linea-cotizacion-context.service";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import {
  SERIE_45_BEAD_DVH_NOTE,
  SERIE_45_BEAD_MONOLITHIC_NOTE,
} from "@/features/fabricacion/services/serie-45-glazing.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function buildSerie45QuoteItem(input: {
  ancho?: number;
  alto?: number;
  cantidad?: number;
  hojas?: number;
  vidrio?: string;
  glassTechnicalSpec?: Parameters<typeof encodeCotizacionItemPresentationMeta>[0]["glassTechnicalSpec"];
  fabricacionSnapshot?: CotizacionWorkflowItem["fabricacionSnapshot"];
}): CotizacionWorkflowItem {
  const hojas = input.hojas ?? 1;
  const obs = encodeCotizacionItemPresentationMeta({
    lineTemplateId: "45",
    catalogLineKey: SERIE_45_CATALOG_KEY,
    colorHex: "#ffffff",
    material: "Aluminio",
    sistema: "Abatible",
    configuracion: "Puerta abatible 1 hoja",
    sheetScheme: hojas === 1 ? "1 hoja" : `${hojas} hojas`,
    fabricacionTipologia: "puerta_abatible",
    fabricacionHojas: hojas,
    fabricacionModulos: 1,
    fabricacionVariante: SERIE_45_VARIANT,
    glassTechnicalSpec: input.glassTechnicalSpec ?? null,
  });

  return {
    id: "item-l45-1",
    codigo: "P1",
    tipo: "Puerta",
    lineaComercial: "Línea 45 — Puerta",
    vidrio: input.vidrio ?? "Incoloro monolítico 5mm",
    nombre: "Puerta abatible 1 hoja",
    descripcion: "Línea 45 — Puerta",
    ancho: input.ancho ?? 1200,
    alto: input.alto ?? 1000,
    cantidad: input.cantidad ?? 1,
    unidad: "unidad",
    precioUnitario: 185000,
    subtotal: (input.cantidad ?? 1) * 185000,
    observaciones: obs,
    tipoItem: "componente",
    fabricacionSnapshot: input.fabricacionSnapshot ?? null,
  };
}

describe("Línea 45 — consolidación Puerta abatible 1H (ventora:serie-45-puerta)", () => {
  it("contrasta las 10 reglas de corte, ángulos, códigos, cantidades y descuentos contra 2026-09-20-serie-45-practicable-formulas.md", () => {
    const recipe = crearRecetaSerie45Practicable({ lineName: "Línea 45 — Puerta" });

    expect(recipe.estado).toBe("lista_para_validar");
    expect(recipe.perfiles).toHaveLength(10);
    expect(recipe.perfiles.map((p) => p.codigoPerfil)).toEqual([...SERIE_45_FIXTURE_1200X1000.codes]);
    expect(recipe.perfiles.map((p) => p.reglaCantidad.cantidad)).toEqual([
      ...SERIE_45_FIXTURE_1200X1000.quantities,
    ]);
    expect(recipe.perfiles.map((p) => p.corte)).toEqual([
      "45° / 45°",
      "45° / 90°",
      "90° / 90°",
      "90° / 90°",
      "90° / 90°",
      "90° / 90°",
      "90° / 90°",
      "45° / 45°",
      "90° / 90°",
      "90° / 90°",
    ]);
    expect(recipe.perfiles.map((p) => [p.reglaMedida.base, p.reglaMedida.ajusteMm])).toEqual([
      ["ancho_total", 0],
      ["alto_total", 0],
      ["ancho_total", -158],
      ["ancho_total", -158],
      ["ancho_total", -158],
      ["ancho_total", -158],
      ["alto_total", -28],
      ["alto_total", -177],
      ["alto_total", -28],
      ["alto_total", -177],
    ]);

    const res1200 = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });
    expect(res1200.perfiles.map((p) => p.medidaMm)).toEqual([...SERIE_45_FIXTURE_1200X1000.lengthsMm]);
    expect(res1200.vidrios[0]).toMatchObject({
      anchoMm: 1030,
      altoMm: 817,
      cantidadPiezas: 1,
    });
  });

  it("conecta catálogo -> Guiada -> resolutor -> despiece -> pauta conjunta en 1200×1000 y 1500×2000 con cantidad comercial > 1 y estado preliminar", () => {
    const catalogEntry = VENTORA_DEFAULT_LINE_CATALOG.find(
      (entry) => entry.catalogKey === SERIE_45_CATALOG_KEY,
    );
    expect(catalogEntry).toBeDefined();
    expect(catalogEntry?.catalogMetadata?.compatibility).toEqual({
      componentTypes: ["Puerta"],
      openingTypes: ["Abatible"],
      leavesCounts: [1],
      materials: ["Aluminio"],
    });

    const lineContext = resolveFabricacionContextFromLineCatalog({
      catalogKey: catalogEntry!.catalogKey,
      configuracion: catalogEntry!.configuracion,
    });
    expect(lineContext).toMatchObject({
      fabricacionTipologia: "puerta_abatible",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
    });

    const item1200 = buildSerie45QuoteItem({ ancho: 1200, alto: 1000, cantidad: 1 });
    const despiece1200 = resolveFabricacionDespieceForQuoteItem({
      item: item1200,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(despiece1200.estado).toBe("calculado");
    expect(despiece1200.preliminary).toBe(true);
    expect(despiece1200.recipe?.status).toBe("testing");
    expect(despiece1200.recipe?.sourceReference).toBe(SERIE_45_SOURCE_REFERENCE);
    expect(despiece1200.formal?.result.perfiles.map((p) => p.medidaMm)).toEqual([
      ...SERIE_45_FIXTURE_1200X1000.lengthsMm,
    ]);

    // 1500×2000 con cantidad comercial = 3 puertas
    const item1500x3 = buildSerie45QuoteItem({ ancho: 1500, alto: 2000, cantidad: 3 });
    const despiece1500 = resolveFabricacionDespieceForQuoteItem({
      item: item1500x3,
      recipes: [],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(despiece1500.estado).toBe("calculado");
    expect(despiece1500.preliminary).toBe(true);
    expect(despiece1500.formal?.recipeIdentity).toMatchObject({
      tipologia: "puerta_abatible",
      hojas: 1,
      modulos: 1,
      variante: SERIE_45_VARIANT,
    });
    expect(despiece1500.formal?.input.cantidad).toBe(3);
    expect(despiece1500.formal?.result.perfiles.map((p) => p.medidaMm)).toEqual([
      ...SERIE_45_FIXTURE_1500X2000.lengthsMm,
    ]);
    // 14 cortes por puerta × 3 puertas = 42 cortes totales
    expect(
      despiece1500.formal?.result.perfiles.reduce((sum, p) => sum + p.cantidadPiezas, 0),
    ).toBe(42);
    expect(despiece1500.formal?.result.vidrios[0]).toMatchObject({
      anchoMm: 1330,
      altoMm: 1817,
      cantidadPiezas: 3,
    });

    const pautaConjunta = construirFabricacionTrabajoSnapshot({
      items: [
        {
          id: item1500x3.id,
          codigo: item1500x3.codigo,
          nombre: item1500x3.nombre,
          cantidad: 3,
          colorHex: "#ffffff",
          catalogLineKey: SERIE_45_CATALOG_KEY,
          snapshot: despiece1500.formal,
        },
      ],
    });
    expect(pautaConjunta).not.toBeNull();
    expect(Array.from(new Set(pautaConjunta?.bars.map((b) => b.codigoPerfil))).sort()).toEqual([
      "4522",
      "4531",
      "4534",
    ]);
    const totalPautaCuts = pautaConjunta!.bars.reduce(
      (sum, bar) => sum + bar.cortes.length,
      0,
    );
    expect(totalPautaCuts).toBe(42);
  });

  it("maneja vidrio monolítico y DVH como cálculo preliminar advirtiendo sobre junquillo 4534, y bloquea vidrios incompatibles o 2 hojas", () => {
    const resMonolitico = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie45QuoteItem({
        ancho: 1200,
        alto: 1000,
        vidrio: "Incoloro monolítico 5mm",
      }),
      recipes: [],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(resMonolitico.estado).toBe("calculado");
    expect(resMonolitico.preliminary).toBe(true);
    expect(resMonolitico.message).toBe(SERIE_45_BEAD_MONOLITHIC_NOTE);

    const resDvh = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie45QuoteItem({
        ancho: 1500,
        alto: 2000,
        vidrio: "DVH 4+12+4",
        glassTechnicalSpec: {
          category: "dvh",
          thicknessMm: 20,
          composition: "4+12+4",
          hasConflict: false,
          source: "catalog",
        },
      }),
      recipes: [],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(resDvh.estado).toBe("calculado");
    expect(resDvh.preliminary).toBe(true);
    expect(resDvh.message).toBe(SERIE_45_BEAD_DVH_NOTE);
    expect(resDvh.formal?.result.vidrios[0]).toMatchObject({
      anchoMm: 1330,
      altoMm: 1817,
    });

    const resEspejo = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie45QuoteItem({ vidrio: "Espejo 4mm" }),
      recipes: [],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(resEspejo.estado).toBe("composicion_sin_receta");
    expect(resEspejo.formal).toBeNull();

    const resUnresolved = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie45QuoteItem({ vidrio: "Vidrio por definir" }),
      recipes: [],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(resUnresolved.estado).toBe("receta_incompleta");
    expect(resUnresolved.formal).toBeNull();

    const res2Hojas = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie45QuoteItem({ hojas: 2, vidrio: "Incoloro monolítico 5mm" }),
      recipes: [],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(res2Hojas.estado).toBe("composicion_sin_receta");
    expect(res2Hojas.formal).toBeNull();

    expect(
      resolveUniversalPricedLineFallbacks({
        catalogKey: SERIE_45_CATALOG_KEY,
        lineTemplateId: 45,
        organizationId: 1,
        lineName: "Línea 45 — Puerta",
        variant: null,
        leavesCount: 2,
        typology: "puerta_abatible",
        recipes: [],
      }),
    ).toEqual([]);
  });

  it("preserva recetas privadas del taller, mantiene aislamiento entre organizaciones y conserva snapshots congelados", () => {
    const base = crearRecetaSerie45Practicable({ lineName: "Línea 45 — Puerta" });
    const customDef = {
      ...base,
      estado: "validada" as const,
      vidrios: base.vidrios.map((g) => ({
        ...g,
        reglaAncho: { ...g.reglaAncho, ajusteMm: -166 },
      })),
    };
    const workshopOrg1: FabricationRecipeRecord = {
      id: "workshop-l45-org1",
      organizationId: 1,
      lineTemplateId: 45,
      scope: "organization",
      providerName: "Taller Org 1",
      lineName: "Línea 45 — Puerta",
      typology: "puerta_abatible",
      leavesCount: 1,
      variant: SERIE_45_VARIANT,
      version: 2,
      status: "validated",
      definition: customDef,
      sourceType: "workshop",
      sourceReference: "taller:personalizada:serie-45:puerta:1h:v2",
      sourceName: "Taller Org 1",
      sourceRevision: null,
      parentRecipeId: null,
      validatedAt: "2026-11-22T00:00:00.000Z",
      validatedBy: "qa@ventora.cl",
      createdAt: "2026-11-22T00:00:00.000Z",
      updatedAt: "2026-11-22T00:00:00.000Z",
      eliminadoEn: null,
    };

    // Org 1 usa su receta propia (-166 => 1034 mm en 1200)
    const org1Res = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie45QuoteItem({ ancho: 1200, alto: 1000, vidrio: "DVH 4+12+4" }),
      recipes: [workshopOrg1],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(org1Res.estado).toBe("calculado");
    expect(org1Res.preliminary).toBe(false);
    expect(org1Res.recipe?.id).toBe("workshop-l45-org1");
    expect(org1Res.formal?.result.vidrios[0]?.anchoMm).toBe(1034);

    // Org 2 no hereda la receta privada de Org 1 y cae en preliminar documental (-170 => 1030 mm)
    const org2Res = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie45QuoteItem({ ancho: 1200, alto: 1000, vidrio: "DVH 4+12+4" }),
      recipes: [workshopOrg1],
      organizationId: 2,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(org2Res.estado).toBe("calculado");
    expect(org2Res.preliminary).toBe(true);
    expect(org2Res.recipe?.id).not.toBe("workshop-l45-org1");
    expect(org2Res.formal?.result.vidrios[0]?.anchoMm).toBe(1030);
    expect(org2Res.message).toBe(SERIE_45_BEAD_DVH_NOTE);

    // Snapshot congelado de Org 1 permanece intacto sin recetas
    const frozenRes = resolveFabricacionDespieceForQuoteItem({
      item: buildSerie45QuoteItem({
        ancho: 1200,
        alto: 1000,
        vidrio: "Espejo 4mm",
        fabricacionSnapshot: org1Res.formal,
      }),
      recipes: [],
      organizationId: 1,
      lineTemplateId: 45,
      lineCatalogKey: SERIE_45_CATALOG_KEY,
    });
    expect(frozenRes.formal?.recipeId).toBe("workshop-l45-org1");
    expect(frozenRes.formal?.result.vidrios[0]?.anchoMm).toBe(1034);
  });
});
