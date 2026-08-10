import {
  aplicarAjustesReferenciaL5000,
  crearBaseTipologicaVentora,
  crearRecetaReferenciaL5000Corredera2H,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import type { FabricacionEntradaCalculo } from "@/features/fabricacion/types/fabricacion-domain";

/**
 * Referencia de taller L5000 · Corredera 2 hojas · 1200 × 1000 mm.
 * Debe pasar antes de considerar Corredera validada en producto.
 */
const ENTRADA_L5000: FabricacionEntradaCalculo = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  cantidad: 1,
  hojas: 2,
  modulos: 2,
  variante: "estandar",
};

const DESPIECE_ESPERADO = [
  { funcion: "Riel superior", medidaMm: 1200, cantidadPiezas: 1 },
  { funcion: "Riel inferior", medidaMm: 1200, cantidadPiezas: 1 },
  { funcion: "Jamba", medidaMm: 997, cantidadPiezas: 2 },
  { funcion: "Zócalo", medidaMm: 598, cantidadPiezas: 2 },
  { funcion: "Cabezal", medidaMm: 598, cantidadPiezas: 2 },
  { funcion: "Pierna", medidaMm: 982, cantidadPiezas: 2 },
  { funcion: "Traslapo", medidaMm: 982, cantidadPiezas: 2 },
] as const;

describe("referencia L5000 corredera 2 hojas", () => {
  it("la base estructural no inventa ajuste 0 como recomendación", () => {
    let nextId = 0;
    const base = crearBaseTipologicaVentora({
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      lineName: "L5000",
      createId: () => `l5000-base-${nextId++}`,
    });

    expect(base.perfiles).toHaveLength(7);
    expect(
      base.perfiles.every((profile) => profile.reglaMedida.ajusteMm == null)
    ).toBe(true);
    expect(
      base.perfiles.every((profile) =>
        (profile.datosPendientes ?? []).some((detail) =>
          /ajuste|descuento/i.test(detail)
        )
      )
    ).toBe(true);
  });

  it("con ajustes documentados 0,0,-3,-2,-2,-18,-18 produce el despiece 10.714 mm", () => {
    let nextId = 0;
    const recetaL5000 = crearRecetaReferenciaL5000Corredera2H({
      createId: () => `l5000-ref-${nextId++}`,
    });

    expect(recetaL5000.perfiles.map((profile) => profile.funcion)).toEqual([
      "Riel superior",
      "Riel inferior",
      "Jamba",
      "Zócalo",
      "Cabezal",
      "Pierna",
      "Traslapo",
    ]);
    expect(recetaL5000.perfiles.map((p) => p.reglaMedida.ajusteMm)).toEqual([
      0, 0, -3, -2, -2, -18, -18,
    ]);
    expect(
      recetaL5000.perfiles.every((profile) =>
        /Ajuste documentado en Ventora/i.test(profile.observaciones ?? "")
      )
    ).toBe(true);
    expect(
      recetaL5000.perfiles.every(
        (profile) =>
          !(profile.datosPendientes ?? []).some((detail) =>
            /ajuste|descuento/i.test(detail)
          )
      )
    ).toBe(true);

    const resultado = calcularCubicacionYPauta(recetaL5000, ENTRADA_L5000);

    expect(resultado.calculable).toBe(true);
    expect(resultado.perfiles).toHaveLength(7);

    for (const esperado of DESPIECE_ESPERADO) {
      const fila = resultado.perfiles.find(
        (entry) => entry.funcion === esperado.funcion
      );
      expect(fila).toMatchObject({
        medidaMm: esperado.medidaMm,
        cantidadPiezas: esperado.cantidadPiezas,
        totalLinealMm: esperado.medidaMm * esperado.cantidadPiezas,
      });
    }

    expect(resultado.totalLinealMm).toBe(10714);
  });

  it("Alto total por hoja no divide el alto entre cantidad de hojas (Pierna/Traslapo = 982)", () => {
    let nextId = 0;
    const base = crearBaseTipologicaVentora({
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      lineName: "L5000",
      createId: () => `l5000-alto-${nextId++}`,
    });
    const receta = aplicarAjustesReferenciaL5000(base);
    const resultado = calcularCubicacionYPauta(receta, ENTRADA_L5000);

    const pierna = resultado.perfiles.find((entry) => entry.funcion === "Pierna");
    const traslapo = resultado.perfiles.find(
      (entry) => entry.funcion === "Traslapo"
    );

    expect(pierna?.medidaMm).toBe(982);
    expect(traslapo?.medidaMm).toBe(982);
    // Si dividiera 1000/2 - 18 = 482; no debe ocurrir.
    expect(pierna?.medidaMm).not.toBe(482);
    expect(
      receta.perfiles.find((profile) => profile.funcion === "Pierna")?.reglaMedida
        .base
    ).toBe("alto_por_hoja");
  });
});
