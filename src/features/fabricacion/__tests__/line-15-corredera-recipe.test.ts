import { calcularCubicacionYPauta } from "@/features/fabricacion";
import {
  LINE_15_FIXTURE_1200X1000,
  LINE_15_VARIANT_3H_3RIELES,
  LINE_15_VARIANT_4H_2RIELES,
  LINE_15_VARIANT_4H_4RIELES,
  crearRecetaLine15Corredera,
  crearRecetasLine15Corredera,
} from "@/features/fabricacion/fixtures/line-15-corredera-recipe";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";

describe("receta Línea 15 corredera", () => {
  it("calcula destajes oficiales 2H en 1200×1000", () => {
    const recipe = crearRecetaLine15Corredera({ lineName: "Línea 15 — Corredera 2 hojas" });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: LINE_15_FIXTURE_1200X1000.anchoTotalMm,
      altoTotalMm: LINE_15_FIXTURE_1200X1000.altoTotalMm,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      ...LINE_15_FIXTURE_1200X1000.codes,
    ]);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual([
      ...LINE_15_FIXTURE_1200X1000.lengthsMm,
    ]);
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: LINE_15_FIXTURE_1200X1000.glass.widthMm,
      altoMm: LINE_15_FIXTURE_1200X1000.glass.heightMm,
      cantidadPiezas: 2,
    });
    expect(evaluarRecetaListaParaProbar(recipe).listaParaProbar).toBe(true);
  });

  it("expone variantes 3H y 4H con cabezal/zócalo validados", () => {
    expect(crearRecetasLine15Corredera({ lineName: "Línea 15" })).toHaveLength(4);

    const threeH = calcularCubicacionYPauta(
      crearRecetaLine15Corredera({
        lineName: "Línea 15",
        variant: LINE_15_VARIANT_3H_3RIELES,
      }),
      { anchoTotalMm: 1200, altoTotalMm: 1000, cantidad: 1, hojas: 3, modulos: 3 }
    );
    expect(threeH.perfiles.find((profile) => profile.codigoPerfil === "1504")?.medidaMm).toBe(
      405
    );

    const fourHTwoRails = calcularCubicacionYPauta(
      crearRecetaLine15Corredera({
        lineName: "Línea 15",
        variant: LINE_15_VARIANT_4H_2RIELES,
      }),
      { anchoTotalMm: 1200, altoTotalMm: 1000, cantidad: 1, hojas: 4, modulos: 4 }
    );
    expect(
      fourHTwoRails.perfiles.find((profile) => profile.codigoPerfil === "1505")?.medidaMm
    ).toBe(302);

    const fourHFourRails = calcularCubicacionYPauta(
      crearRecetaLine15Corredera({
        lineName: "Línea 15",
        variant: LINE_15_VARIANT_4H_4RIELES,
      }),
      { anchoTotalMm: 1200, altoTotalMm: 1000, cantidad: 1, hojas: 4, modulos: 4 }
    );
    expect(
      fourHFourRails.perfiles.find((profile) => profile.codigoPerfil === "1504")?.medidaMm
    ).toBe(311);
  });
});
