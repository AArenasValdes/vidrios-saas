import { buildConsolidatedCubicationPautaFromSnapshots } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import {
  COTIZACION_CUBICATION_SNAPSHOT_VERSION,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { partitionLineTemplatesByCatalogOrigin } from "@/features/cotizaciones/line-templates/services/line-template-group.service";

function itemSnapshot(lineTemplateId: string): CotizacionItemCubicationSnapshot {
  return {
    v: COTIZACION_CUBICATION_SNAPSHOT_VERSION,
    source: "auto",
    lineTemplateId,
    system: "corredera_2_hojas",
    status: "validada",
    widthMm: 1200,
    heightMm: 1500,
    quantity: 1,
    capturedAt: "2026-09-01T00:00:00.000Z",
    estimationKind: "recipe",
    cuts: [
      {
        label: "Perfil A",
        profileCode: "A-100",
        functionLabel: "Riel superior",
        lengthMm: 1200,
        quantity: 1,
        totalLinealMm: 1200,
      },
    ],
    bars: [
      {
        index: 1,
        usedMm: 1200,
        wasteMm: 4800,
        barLengthMm: 6000,
        profileCode: "A-100",
        profileName: "Perfil A",
        cuts: [],
      },
    ],
    totalUsedMm: 1200,
    totalWasteMm: 4800,
    wastePct: 80,
    totalProfilesLinealMm: 1200,
    glass: null,
    accessoryUnits: 0,
  };
}

describe("caracterización previa — catálogo y pauta", () => {
  it("mantiene las líneas sin catalogKey separadas del catálogo Ventora", () => {
    const input = [
      { catalogKey: "ventora:l5000", nombre: "L5000", precioM2: 120000 },
      { catalogKey: null, nombre: "Corredera taller", precioM2: 98000 },
    ];

    const result = partitionLineTemplatesByCatalogOrigin(input);

    expect(result.ventora).toEqual([input[0]]);
    expect(result.propias).toEqual([input[1]]);
    expect(result.propias[0].precioM2).toBe(98000);
  });

  it("suma las barras individuales guardadas y no vuelve a empacar cortes de otros ítems", () => {
    const pauta = buildConsolidatedCubicationPautaFromSnapshots([
      { codigo: "V1", lineaComercial: "L5000", snapshot: itemSnapshot("line-1") },
      { codigo: "V2", lineaComercial: "L5000", snapshot: itemSnapshot("line-1") },
    ]);

    expect(pauta.rows).toHaveLength(1);
    expect(pauta.rows[0]).toMatchObject({ quantity: 2, pieceCodes: ["V1", "V2"] });
    // Caracterización del estado previo: cada partida retiene su barra individual.
    expect(pauta.totalBars).toBe(2);
    expect(pauta.lineGroups[0].bars).toBe(2);
  });
});
