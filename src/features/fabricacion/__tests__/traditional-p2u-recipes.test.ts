import { calcularCubicacionYPauta } from "@/features/fabricacion";
import {
  crearRecetaP2U,
  crearRecetasP2U,
} from "@/features/fabricacion/fixtures/traditional-p2u-recipes";

describe("P2U líneas tradicionales / multiproveedor", () => {
  it("mantiene las cuatro líneas nuevas y AM-35 como recetas documentales", () => {
    const keys = [
      "ventora:serie-15-corredera-2h",
      "ventora:serie-4000-corredera-2h",
      "ventora:l35",
      "ventora:serie-45-puerta",
      "ventora:serie-12-shower-corredera",
    ] as const;

    for (const catalogKey of keys) {
      const recipes = crearRecetasP2U({ catalogKey, lineName: catalogKey });
      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes.every((recipe) => recipe.estado === "ejemplo_no_validado")).toBe(true);
      expect(recipes.every((recipe) => recipe.datosPendientes?.length)).toBe(true);
    }

    expect(crearRecetasP2U({ catalogKey: "ventora:l35", lineName: "AM-35" })).toHaveLength(2);
  });

  it("conserva la pauta ALAR de Línea 15 y deja 1506/1507/1508 como alternativas", () => {
    const recipe = crearRecetaP2U({
      catalogKey: "ventora:serie-15-corredera-2h",
      lineName: "Línea 15",
    });
    const byCode = Object.fromEntries(
      recipe.perfiles.map((profile) => [profile.codigoPerfil, profile])
    );

    expect(byCode["1501"]?.reglaMedida).toEqual({ base: "ancho_total" });
    expect(byCode["1502"]?.reglaMedida).toEqual({ base: "ancho_total" });
    expect(byCode["1503"]?.reglaMedida).toEqual({ base: "alto_total", ajusteMm: -7 });
    expect(byCode["1504"]?.reglaMedida).toEqual({ base: "ancho_por_hoja", ajusteMm: -3 });
    expect(byCode["1505"]?.reglaMedida).toEqual({ base: "ancho_por_hoja", ajusteMm: -3 });
    expect(byCode["1506"]?.requerido).toBe(false);
    expect(byCode["1507"]?.requerido).toBe(false);
    expect(byCode["1508"]?.requerido).toBe(false);

    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
    });
    const medidas = Object.fromEntries(
      result.perfiles.map((profile) => [profile.codigoPerfil, profile.medidaMm])
    );
    expect(medidas).toMatchObject({ "1501": 1200, "1502": 1200, "1503": 993, "1504": 597, "1505": 597 });
    expect(result.calculable).toBe(false);
    expect(result.advertencias.some((warning) => warning.codigo === "RECETA_DATOS_PENDIENTES")).toBe(true);
  });

  it("no infiere descuentos ni validación para 4000, 45, Shower 12 o AM-35", () => {
    for (const catalogKey of [
      "ventora:serie-4000-corredera-2h",
      "ventora:serie-45-puerta",
      "ventora:serie-12-shower-corredera",
      "ventora:l35",
    ] as const) {
      const recipes = crearRecetasP2U({ catalogKey, lineName: catalogKey });
      expect(recipes.every((recipe) => recipe.estado !== "validada")).toBe(true);
      expect(recipes.every((recipe) => recipe.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null))).toBe(true);
    }
  });
});
