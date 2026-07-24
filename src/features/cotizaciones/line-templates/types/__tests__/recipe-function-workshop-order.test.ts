/**
 * @jest-environment jsdom
 */

import { recipeFunctionWorkshopOrder } from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { buildConsolidatedCubicationPautaFromSnapshots } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { COTIZACION_CUBICATION_SNAPSHOT_VERSION } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";

describe("orden de taller L5000 / pauta", () => {
  it("ordena funciones como pauta de corredera (no alfabético)", () => {
    const labels = [
      "Zócalo",
      "Traslapo",
      "Cabezal",
      "Riel inferior",
      "Pierna",
      "Jamba",
      "Riel superior",
    ];

    const ordered = [...labels].sort(
      (a, b) => recipeFunctionWorkshopOrder(a) - recipeFunctionWorkshopOrder(b)
    );

    expect(ordered).toEqual([
      "Riel superior",
      "Riel inferior",
      "Jamba",
      "Cabezal",
      "Zócalo",
      "Pierna",
      "Traslapo",
    ]);
  });

  it("consolida despiece respetando orden de taller aunque falte código de perfil", () => {
    const snapshot: CotizacionItemCubicationSnapshot = {
      v: COTIZACION_CUBICATION_SNAPSHOT_VERSION,
      source: "auto",
      lineTemplateId: "line-l5000",
      system: "corredera_2_hojas",
      status: "validada",
      widthMm: 1200,
      heightMm: 1500,
      quantity: 1,
      capturedAt: new Date().toISOString(),
      estimationKind: "recipe",
      cuts: [
        {
          label: "Perfil sin código",
          functionLabel: "Zócalo",
          lengthMm: 598,
          quantity: 2,
          totalLinealMm: 1196,
          measureExplanation: "Mitad - 2",
        },
        {
          label: "Perfil sin código",
          functionLabel: "Riel superior",
          lengthMm: 1200,
          quantity: 1,
          totalLinealMm: 1200,
          measureExplanation: "Ancho total",
        },
        {
          label: "Perfil sin código",
          functionLabel: "Traslapo",
          lengthMm: 1482,
          quantity: 2,
          totalLinealMm: 2964,
          measureExplanation: "Alto hoja - 18",
        },
        {
          label: "Perfil sin código",
          functionLabel: "Jamba",
          lengthMm: 1497,
          quantity: 2,
          totalLinealMm: 2994,
          measureExplanation: "Alto - 3",
        },
        {
          label: "Perfil sin código",
          functionLabel: "Cabezal",
          lengthMm: 598,
          quantity: 2,
          totalLinealMm: 1196,
          measureExplanation: "Mitad - 2",
        },
        {
          label: "Perfil sin código",
          functionLabel: "Riel inferior",
          lengthMm: 1200,
          quantity: 1,
          totalLinealMm: 1200,
          measureExplanation: "Ancho total",
        },
        {
          label: "Perfil sin código",
          functionLabel: "Pierna",
          lengthMm: 1482,
          quantity: 2,
          totalLinealMm: 2964,
          measureExplanation: "Alto hoja - 18",
        },
      ],
      bars: [],
      totalUsedMm: 0,
      totalWasteMm: 0,
      wastePct: 0,
      totalProfilesLinealMm: 10714,
      glass: null,
      accessoryUnits: 4,
    };

    const pauta = buildConsolidatedCubicationPautaFromSnapshots([
      {
        codigo: "V2",
        lineaComercial: "L5000",
        nombre: "Ventana corredera",
        snapshot,
      },
    ]);

    expect(pauta.rows.map((row) => row.functionLabel)).toEqual([
      "Riel superior",
      "Riel inferior",
      "Jamba",
      "Cabezal",
      "Zócalo",
      "Pierna",
      "Traslapo",
    ]);
  });
});
