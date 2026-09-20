import { calcularCubicacionYPauta } from "@/features/fabricacion";
import {
  crearRecetaP2U,
  crearRecetasP2U,
} from "@/features/fabricacion/fixtures/traditional-p2u-recipes";
import { LINE_15_FIXTURE_1200X1000 } from "@/features/fabricacion/fixtures/line-15-corredera-recipe";
import { LINE_4000_FIXTURE_1200X1000 } from "@/features/fabricacion/fixtures/line-4000-corredera-recipe";
import { SERIE_45_FIXTURE_1200X1000 } from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";

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
