import { calcularCubicacionYPauta } from "@/features/fabricacion";
import {
  LINE_4000_FIXTURE_1200X1000,
  LINE_4000_VARIANT_3H_3RIELES,
  LINE_4000_VARIANT_4H_4RIELES,
  crearRecetaLine4000Corredera,
  crearRecetasLine4000Corredera,
} from "@/features/fabricacion/fixtures/line-4000-corredera-recipe";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";

describe("receta Línea 4000 corredera", () => {
  it("calcula destajes oficiales Columbia 2H en 1200×1000", () => {
    const recipe = crearRecetaLine4000Corredera({
      lineName: "Línea 4000 — Corredera 2 hojas",
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: LINE_4000_FIXTURE_1200X1000.anchoTotalMm,
      altoTotalMm: LINE_4000_FIXTURE_1200X1000.altoTotalMm,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      ...LINE_4000_FIXTURE_1200X1000.codes,
    ]);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual([
      ...LINE_4000_FIXTURE_1200X1000.lengthsMm,
    ]);
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: LINE_4000_FIXTURE_1200X1000.glass.widthMm,
      altoMm: LINE_4000_FIXTURE_1200X1000.glass.heightMm,
      cantidadPiezas: 2,
    });
    expect(evaluarRecetaListaParaProbar(recipe).listaParaProbar).toBe(true);
  });

  it("expone cuatro variantes con cabezal/zócalo Columbia", () => {
    expect(crearRecetasLine4000Corredera({ lineName: "Línea 4000" })).toHaveLength(4);

    const threeH = calcularCubicacionYPauta(
      crearRecetaLine4000Corredera({
        lineName: "Línea 4000",
        variant: LINE_4000_VARIANT_3H_3RIELES,
      }),
      { anchoTotalMm: 1200, altoTotalMm: 1000, cantidad: 1, hojas: 3, modulos: 3 }
    );
    expect(threeH.perfiles.find((profile) => profile.codigoPerfil === "4008")?.medidaMm).toBe(
      415
    );

    const fourHFourRails = calcularCubicacionYPauta(
      crearRecetaLine4000Corredera({
        lineName: "Línea 4000",
        variant: LINE_4000_VARIANT_4H_4RIELES,
      }),
      { anchoTotalMm: 1200, altoTotalMm: 1000, cantidad: 1, hojas: 4, modulos: 4 }
    );
    expect(
      fourHFourRails.perfiles.find((profile) => profile.codigoPerfil === "4004")?.medidaMm
    ).toBe(323);
  });
});
