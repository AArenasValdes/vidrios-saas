import { calcularCubicacionYPauta } from "@/features/fabricacion";
import {
  SERIE_45_FIXTURE_1200X1000,
  crearRecetaSerie45Practicable,
} from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

describe("receta Serie 45 practicable puerta 1 hoja", () => {
  const recipe = crearRecetaSerie45Practicable({
    lineName: "Línea 45 — Puerta",
  });

  it("calcula destajes 4522/4531/4534 y vidrio X−170 / Y−183 en 1200×1000", () => {
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: SERIE_45_FIXTURE_1200X1000.anchoTotalMm,
      altoTotalMm: SERIE_45_FIXTURE_1200X1000.altoTotalMm,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      ...SERIE_45_FIXTURE_1200X1000.codes,
    ]);
    expect(result.perfiles.map((profile) => profile.cantidadPiezas)).toEqual([
      ...SERIE_45_FIXTURE_1200X1000.quantities,
    ]);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual([
      ...SERIE_45_FIXTURE_1200X1000.lengthsMm,
    ]);
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: SERIE_45_FIXTURE_1200X1000.glass.widthMm,
      altoMm: SERIE_45_FIXTURE_1200X1000.glass.heightMm,
      cantidadPiezas: SERIE_45_FIXTURE_1200X1000.glass.quantity,
    });
  });

  it("corta dos piernas 4531 Y−28 y junquillos verticales sobre Y, no sobre X", () => {
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });

    const bastidor = result.perfiles.filter((profile) => profile.codigoPerfil === "4531");
    expect(bastidor.reduce((total, profile) => total + profile.cantidadPiezas, 0)).toBe(4);
    expect(bastidor.filter((profile) => profile.medidaMm === 972)).toHaveLength(2);

    const verticalBeads = result.perfiles.filter(
      (profile) => profile.codigoPerfil === "4534" && profile.medidaMm === 823,
    );
    expect(verticalBeads.reduce((total, profile) => total + profile.cantidadPiezas, 0)).toBe(4);
    expect(result.perfiles.some((profile) => profile.codigoPerfil === "4502")).toBe(false);
  });

  it("queda lista para probar sin composición pendiente", () => {
    expect(evaluarRecetaListaParaProbar(recipe).listaParaProbar).toBe(true);
    expect(buildFabricationRecipeSummary(recipe).compositionComplete).toBe(true);
  });
});
