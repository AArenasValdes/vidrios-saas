import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

function recipe(cutLengthMm = 2000): FabricacionReceta {
  return {
    schemaVersion: 1,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: "bar-test",
      codigo: "BAR-TEST",
      nombre: "Prueba de barras",
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      herraje: null,
      variante: "estandar",
    },
    perfiles: [
      {
        id: "perfil-a",
        codigoPerfil: "P-01",
        nombrePerfil: "Perfil A",
        funcion: "Riel",
        largoComercialMm: 6000,
        reglaMedida: { base: "fijo_mm", valorFijoMm: cutLengthMm },
        reglaCantidad: { tipo: "fija", cantidad: 3 },
        requerido: true,
      },
    ],
    vidrios: [],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: 3,
      despunteInicialMm: 10,
      sobranteMinimoAprovechableMm: 500,
    },
    notasValidacion: [],
  };
}

const input = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  cantidad: 1,
  hojas: 2,
  modulos: 2,
  variante: "estandar",
};

describe("pauta referencial de barras", () => {
  it("aplica FFD con perdida por corte y despunte inicial", () => {
    const definition = recipe();
    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
    });

    expect(result.calculable).toBe(true);
    expect(result.barras).toHaveLength(2);
    expect(result.barras[0]).toMatchObject({
      codigoPerfil: "P-01",
      usadoMm: 4016,
      perdidaCortesMm: 6,
      sobranteMm: 1984,
      sobranteAprovechable: true,
    });
    expect(result.barras[0]?.cortes).toHaveLength(2);
  });

  it("advierte cuando una pieza supera la barra comercial", () => {
    const definition = recipe(6100);
    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
    });

    expect(result.calculable).toBe(false);
    expect(result.advertencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: "CORTE_SUPERA_BARRA_COMERCIAL" }),
      ])
    );
  });

  it("calcula tiras con largo comercial aunque no haya parámetros de sierra explícitos", () => {
    const definition = { ...recipe(), configuracionCorte: undefined };
    const result = construirPautaBarrasFabricacion({
      receta: definition,
      resultado: calcularCubicacionYPauta(definition, input),
    });

    expect(result.calculable).toBe(true);
    expect(result.barras.length).toBeGreaterThan(0);
    expect(
      result.advertencias.some((entry) => entry.codigo === "PAUTA_BARRAS_INCOMPLETA")
    ).toBe(false);
  });
});
