import { calcularCubicacionYPauta, construirPautaBarrasFabricacion } from "@/features/fabricacion";
import {
  crearRecetaP2U,
  crearRecetasP2U,
} from "@/features/fabricacion/fixtures/traditional-p2u-recipes";
import { LINE_15_FIXTURE_1200X1000 } from "@/features/fabricacion/fixtures/line-15-corredera-recipe";
import { LINE_4000_FIXTURE_1200X1000 } from "@/features/fabricacion/fixtures/line-4000-corredera-recipe";
import { SERIE_45_FIXTURE_1200X1000 } from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import { fabricacionRecetaSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import { isFabricacionRecipeReadyForSnapshot } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

describe("P2U líneas tradicionales / multiproveedor", () => {
  it("mantiene AM-35 y Línea 12 como recetas documentales incompletas", () => {
    for (const catalogKey of [
      "ventora:l35",
      "ventora:serie-12-shower-corredera",
    ] as const) {
      const recipes = crearRecetasP2U({ catalogKey, lineName: catalogKey });
      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes.every((recipe) => recipe.estado === "ejemplo_no_validado")).toBe(true);
      expect(recipes.every((recipe) => recipe.datosPendientes?.length)).toBe(true);
    }

    expect(crearRecetasP2U({ catalogKey: "ventora:l35", lineName: "AM-35" })).toHaveLength(2);
  });

  it("calcula las cinco reglas visibles de Shower 12 como pauta preliminar de 6 m", () => {
    const recipe = crearRecetasP2U({
      catalogKey: "ventora:serie-12-shower-corredera",
      lineName: "Línea 12 — Shower Door",
    })[0]!;
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
    });

    expect(recipe.estado).toBe("ejemplo_no_validado");
    expect(recipe.datosPendientes).toHaveLength(2);
    expect(recipe.perfiles.filter(({ codigoPerfil }) => codigoPerfil === "1204").every(({ corte }) => corte === "45°")).toBe(true);
    expect(recipe.configuracionCorte?.largoComercialDefaultMm).toBe(6000);
    expect(fabricacionRecetaSchema.safeParse(recipe).success).toBe(true);
    expect(result.calculable).toBe(true);
    expect(result.perfiles.map(({ codigoPerfil, medidaMm, cantidadPiezas }) => ({
      codigoPerfil,
      medidaMm,
      cantidadPiezas,
    }))).toEqual([
      { codigoPerfil: "1203", medidaMm: 1195, cantidadPiezas: 1 },
      { codigoPerfil: "1201", medidaMm: 1195, cantidadPiezas: 1 },
      { codigoPerfil: "1202", medidaMm: 1497, cantidadPiezas: 2 },
      { codigoPerfil: "1204", medidaMm: 605, cantidadPiezas: 4 },
      { codigoPerfil: "1204", medidaMm: 1435, cantidadPiezas: 1 },
    ]);

    const plan = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });
    expect(plan.calculable).toBe(true);
    expect(plan.barras).toHaveLength(4);
    expect(plan.barras.reduce((sum, bar) => sum + bar.cortes.length, 0)).toBe(9);
    expect(plan.advertencias.filter(({ nivel }) => nivel === "error")).toEqual([]);

    const secondGeometry = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1000,
      altoTotalMm: 1800,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
    });
    expect(secondGeometry.calculable).toBe(true);
    expect(secondGeometry.perfiles.map(({ medidaMm }) => medidaMm)).toEqual([
      995, 995, 1797, 505, 1735,
    ]);

    const quantityTwo = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 2,
      hojas: 2,
      modulos: 1,
    });
    expect(quantityTwo.calculable).toBe(true);
    const combinedPlan = construirPautaBarrasFabricacion({ receta: recipe, resultado: quantityTwo });
    expect(combinedPlan.barras.reduce((sum, bar) => sum + bar.cortes.length, 0)).toBe(18);

    const invalidGeometry = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 0,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
    });
    expect(invalidGeometry.calculable).toBe(false);
    expect(invalidGeometry.perfiles).toEqual([]);
  });

  it("permite congelar Línea 12 como preliminar cuando sus pendientes están declarados y los perfiles calculan", () => {
    const definition = crearRecetaP2U({
      catalogKey: "ventora:serie-12-shower-corredera",
      lineName: "Línea 12 — Shower Door",
    });
    const record: FabricationRecipeRecord = {
      id: "line-12-preliminary",
      organizationId: 1,
      lineTemplateId: 12,
      scope: "organization",
      providerName: "Ventora",
      lineName: "Línea 12",
      typology: "corredera",
      leavesCount: 2,
      variant: definition.identidad.variante,
      version: 1,
      status: "draft",
      definition,
      sourceType: "manual",
      sourceReference: "captura-linea-12",
      sourceName: null,
      sourceRevision: null,
      parentRecipeId: null,
      validatedAt: null,
      validatedBy: null,
      createdAt: "2026-10-06T00:00:00.000Z",
      updatedAt: "2026-10-06T00:00:00.000Z",
      eliminadoEn: null,
    };

    expect(isFabricacionRecipeReadyForSnapshot(record)).toMatchObject({ ready: true });
  });

  it("expone destajes oficiales de Línea 15 con cuatro variantes", () => {
    const recipes = crearRecetasP2U({
      catalogKey: "ventora:serie-15-corredera-2h",
      lineName: "Línea 15",
    });
    expect(recipes).toHaveLength(4);
    expect(recipes[0]?.estado).toBe("lista_para_validar");
    expect(recipes[0]?.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      "1501",
      "1502",
      "1503",
      "1504",
      "1505",
      "1506",
      "1507",
    ]);

    const result = calcularCubicacionYPauta(recipes[0]!, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
    });
    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual([
      ...LINE_15_FIXTURE_1200X1000.lengthsMm,
    ]);
  });

  it("expone destajes oficiales de Línea 4000 Columbia con cuatro variantes", () => {
    const recipes = crearRecetasP2U({
      catalogKey: "ventora:serie-4000-corredera-2h",
      lineName: "Línea 4000",
    });
    expect(recipes).toHaveLength(4);
    expect(recipes[0]?.estado).toBe("lista_para_validar");
    expect(recipes[0]?.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      "4002",
      "4003",
      "4005",
      "4008",
      "4004",
      "4007",
      "4009",
    ]);

    const result = calcularCubicacionYPauta(recipes[0]!, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
    });
    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual([
      ...LINE_4000_FIXTURE_1200X1000.lengthsMm,
    ]);
  });

  it("usa la pauta Serie 45 practicable y no deja composición pendiente", () => {
    const recipe = crearRecetaP2U({
      catalogKey: "ventora:serie-45-puerta",
      lineName: "Línea 45 — Puerta",
    });

    expect(recipe.estado).toBe("lista_para_validar");
    expect(recipe.datosPendientes).toEqual([]);
    expect(recipe.identidad.variante).toBe("puerta_1h");

    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: SERIE_45_FIXTURE_1200X1000.anchoTotalMm,
      altoTotalMm: SERIE_45_FIXTURE_1200X1000.altoTotalMm,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });
    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual([
      ...SERIE_45_FIXTURE_1200X1000.lengthsMm,
    ]);
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: SERIE_45_FIXTURE_1200X1000.glass.widthMm,
      altoMm: SERIE_45_FIXTURE_1200X1000.glass.heightMm,
    });
  });
});
