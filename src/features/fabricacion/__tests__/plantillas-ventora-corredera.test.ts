import {
  crearBaseTipologicaVentora,
  crearRecetaPlantillaVentoraCorredera2H,
  PLANTILLAS_VENTORA_CORREDERA_2H,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import type { FabricacionEntradaCalculo } from "@/features/fabricacion/types/fabricacion-domain";

const ENTRADA: FabricacionEntradaCalculo = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  cantidad: 1,
  hojas: 2,
  modulos: 2,
  variante: "estandar",
};

const ORDEN_FUNCIONES = [
  "Riel superior",
  "Riel inferior",
  "Jamba",
  "Zócalo",
  "Cabezal",
  "Pierna",
  "Traslapo",
] as const;

function countCuts(
  perfiles: Array<{ cantidadPiezas: number }>
) {
  return perfiles.reduce((sum, row) => sum + row.cantidadPiezas, 0);
}

describe("plantillas Ventora Corredera 2 hojas", () => {
  it("L5000 produce el despiece 10.714 mm con el mismo motor", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `l5000-${nextId++}`,
    });

    expect(receta.perfiles.map((p) => p.reglaMedida.ajusteMm)).toEqual([
      ...PLANTILLAS_VENTORA_CORREDERA_2H.L5000.ajustesMm,
    ]);
    expect(receta.perfiles.map((p) => p.funcion)).toEqual([...ORDEN_FUNCIONES]);
    expect(receta.perfiles.every((profile) => !profile.codigoPerfil)).toBe(true);
    expect(
      receta.perfiles.every((profile) => profile.largoComercialMm == null)
    ).toBe(true);
    expect(receta.configuracionCorte?.largoComercialDefaultMm).toBe(6000);
    expect(
      receta.perfiles.every(
        (profile) =>
          !(profile.datosPendientes ?? []).some((detail) =>
            /largo comercial|codigo del perfil/i.test(detail)
          )
      )
    ).toBe(true);

    const resultado = calcularCubicacionYPauta(receta, ENTRADA);
    expect(
      resultado.perfiles.map((entry) => ({
        funcion: entry.funcion,
        medidaMm: entry.medidaMm,
        cantidadPiezas: entry.cantidadPiezas,
      }))
    ).toEqual([
      { funcion: "Riel superior", medidaMm: 1200, cantidadPiezas: 1 },
      { funcion: "Riel inferior", medidaMm: 1200, cantidadPiezas: 1 },
      { funcion: "Jamba", medidaMm: 997, cantidadPiezas: 2 },
      { funcion: "Zócalo", medidaMm: 598, cantidadPiezas: 2 },
      { funcion: "Cabezal", medidaMm: 598, cantidadPiezas: 2 },
      { funcion: "Pierna", medidaMm: 982, cantidadPiezas: 2 },
      { funcion: "Traslapo", medidaMm: 982, cantidadPiezas: 2 },
    ]);
    expect(countCuts(resultado.perfiles)).toBe(12);
    expect(resultado.totalLinealMm).toBe(10714);
  });

  it("L5000 ×2 consolida 21.428 mm con el mismo motor", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L5000", {
      createId: () => `l5000-2u-${nextId++}`,
    });
    const resultado = calcularCubicacionYPauta(receta, {
      ...ENTRADA,
      cantidad: 2,
    });
    expect(resultado.totalLinealMm).toBe(21428);
    expect(countCuts(resultado.perfiles)).toBe(24);
  });

  it("L20 usa el mismo motor y solo cambia parámetros", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L20", {
      createId: () => `l20-${nextId++}`,
    });

    expect(receta.perfiles.map((p) => p.reglaMedida.ajusteMm)).toEqual([
      -12, -12, 0, -2, -2, -27, -27,
    ]);
    expect(receta.perfiles.map((p) => p.reglaMedida.base)).toEqual([
      "ancho_total",
      "ancho_total",
      "alto_total",
      "ancho_por_hoja",
      "ancho_por_hoja",
      "alto_por_hoja",
      "alto_por_hoja",
    ]);
    expect(receta.perfiles.map((p) => p.reglaCantidad.cantidad)).toEqual([
      1, 1, 2, 2, 2, 2, 2,
    ]);

    const resultado = calcularCubicacionYPauta(receta, ENTRADA);
    expect(
      resultado.perfiles.map((entry) => ({
        funcion: entry.funcion,
        medidaMm: entry.medidaMm,
        cantidadPiezas: entry.cantidadPiezas,
      }))
    ).toEqual([
      { funcion: "Riel superior", medidaMm: 1188, cantidadPiezas: 1 },
      { funcion: "Riel inferior", medidaMm: 1188, cantidadPiezas: 1 },
      { funcion: "Jamba", medidaMm: 1000, cantidadPiezas: 2 },
      { funcion: "Zócalo", medidaMm: 598, cantidadPiezas: 2 },
      { funcion: "Cabezal", medidaMm: 598, cantidadPiezas: 2 },
      { funcion: "Pierna", medidaMm: 973, cantidadPiezas: 2 },
      { funcion: "Traslapo", medidaMm: 973, cantidadPiezas: 2 },
    ]);
    expect(countCuts(resultado.perfiles)).toBe(12);
    expect(resultado.totalLinealMm).toBe(10660);
  });

  it("L25 usa el mismo motor y solo cambia parámetros", () => {
    let nextId = 0;
    const receta = crearRecetaPlantillaVentoraCorredera2H("L25", {
      createId: () => `l25-${nextId++}`,
    });

    expect(receta.perfiles.map((p) => p.reglaMedida.ajusteMm)).toEqual([
      -16, -16, 0, 0, 0, -35, -35,
    ]);

    const resultado = calcularCubicacionYPauta(receta, ENTRADA);
    expect(
      resultado.perfiles.map((entry) => ({
        funcion: entry.funcion,
        medidaMm: entry.medidaMm,
        cantidadPiezas: entry.cantidadPiezas,
      }))
    ).toEqual([
      { funcion: "Riel superior", medidaMm: 1184, cantidadPiezas: 1 },
      { funcion: "Riel inferior", medidaMm: 1184, cantidadPiezas: 1 },
      { funcion: "Jamba", medidaMm: 1000, cantidadPiezas: 2 },
      { funcion: "Zócalo", medidaMm: 600, cantidadPiezas: 2 },
      { funcion: "Cabezal", medidaMm: 600, cantidadPiezas: 2 },
      { funcion: "Pierna", medidaMm: 965, cantidadPiezas: 2 },
      { funcion: "Traslapo", medidaMm: 965, cantidadPiezas: 2 },
    ]);
    expect(countCuts(resultado.perfiles)).toBe(12);
    expect(resultado.totalLinealMm).toBe(10628);
  });

  it("la base estructural genérica sigue sin ajustes inventados", () => {
    let nextId = 0;
    const base = crearBaseTipologicaVentora({
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      lineName: "Corredera",
      createId: () => `base-${nextId++}`,
    });

    expect(
      base.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)
    ).toBe(true);
  });
});
