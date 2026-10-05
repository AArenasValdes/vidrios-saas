import {
  serializeCubicationSnapshot,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { createEmptyQuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import {
  buildFabricationQuoteSummary,
  formatFabricationItemLineCaption,
} from "../fabrication-quote-summary";

function snapshot(
  overrides: Partial<CotizacionItemCubicationSnapshot> = {}
): CotizacionItemCubicationSnapshot {
  return {
    v: 1,
    source: "auto",
    lineTemplateId: "line-1",
    system: "corredera_2_hojas",
    status: "validada",
    widthMm: 1200,
    heightMm: 1000,
    quantity: 1,
    capturedAt: "2026-08-19T00:00:00.000Z",
    cuts: [
      {
        label: "Riel",
        functionLabel: "Riel superior",
        quantity: 1,
        lengthMm: 1200,
        totalLinealMm: 1200,
      },
    ],
    bars: [{ index: 1, usedMm: 1200, wasteMm: 4750, cuts: [] }],
    totalUsedMm: 1200,
    totalWasteMm: 4750,
    wastePct: 80,
    totalProfilesLinealMm: 10630,
    glass: { widthMm: 1100, heightMm: 900, quantity: 1, totalM2: 1.2 },
    accessoryUnits: 4,
    ...overrides,
  };
}

describe("fabrication quote summary", () => {
  it("no materializa pauta con recetas actuales cuando la cotización guardada no tiene snapshots", () => {
    const summary = buildFabricationQuoteSummary([
      {
        id: "historical-item",
        codigo: "V7400",
        nombre: "Ventana",
        lineaComercial: "Veratec Sliding 7400",
        ancho: 1200,
        alto: 1500,
        cantidad: 1,
        observaciones: "",
      },
    ]);

    expect(summary.items).toHaveLength(0);
    expect(summary.trabajoSnapshot).toBeNull();
    expect(summary.totalBars).toBeNull();
  });

  it("expone línea y material por pieza sin mezclarlas", () => {
    const summary = buildFabricationQuoteSummary([
      {
        id: "v1",
        codigo: "V1",
        nombre: "Ventana corredera",
        lineaComercial: "L5000",
        observaciones: `[m:Aluminio][cub:${serializeCubicationSnapshot(
          snapshot({
            lineTemplateId: "l5000",
            totalProfilesLinealMm: 10000,
            bars: [{ index: 1, usedMm: 1000, wasteMm: 5000, cuts: [] }],
          })
        )}]`,
      },
      {
        id: "v2",
        codigo: "V2",
        nombre: "Ventana abatible",
        lineaComercial: "Serie 20",
        observaciones: `[m:PVC][cub:${serializeCubicationSnapshot(
          snapshot({
            lineTemplateId: "serie-20",
            totalProfilesLinealMm: 8000,
            glass: { widthMm: 1100, heightMm: 900, quantity: 1, totalM2: 0.9 },
            accessoryUnits: 2,
            bars: [
              { index: 1, usedMm: 1200, wasteMm: 4750, cuts: [] },
              { index: 2, usedMm: 1200, wasteMm: 4750, cuts: [] },
            ],
          })
        )}]`,
      },
      {
        id: "v3",
        codigo: "V3",
        nombre: "Ventana corredera",
        lineaComercial: "L25",
        observaciones: `[m:Aluminio][cub:${serializeCubicationSnapshot(
          snapshot({
            lineTemplateId: "l25",
            totalProfilesLinealMm: 12000,
          })
        )}]`,
      },
    ]);

    expect(summary.items.map((row) => row.codigo)).toEqual(["V1", "V2", "V3"]);
    expect(formatFabricationItemLineCaption(summary.items[0]!.lineName, summary.items[0]!.material)).toBe(
      "L5000 · Aluminio"
    );
    expect(formatFabricationItemLineCaption(summary.items[1]!.lineName, summary.items[1]!.material)).toBe(
      "Serie 20 · PVC"
    );
    expect(formatFabricationItemLineCaption(summary.items[2]!.lineName, summary.items[2]!.material)).toBe(
      "L25 · Aluminio"
    );
    expect(summary.items[0]!.profilesMl).not.toBe(summary.items[1]!.profilesMl);
    expect(summary.items[1]!.barCount).toBe(2);
    expect(summary.items[2]!.barCount).toBe(1);
    expect(summary.totalItems).toBe(3);
    expect(summary.items).toHaveLength(3);
  });

  it("muestra Sin línea cuando la pieza no tiene identidad de línea", () => {
    expect(formatFabricationItemLineCaption("", "")).toBe("Sin línea");
    expect(formatFabricationItemLineCaption("L25", "")).toBe("L25");
  });

  it("omite snapshots anteriores cuando la composición estructural cambió", () => {
    const adjustment = {
      ...createEmptyQuickCompositionAdjustment(),
      paneTypes: { "leaf-1": "fixed" as const },
    };
    const summary = buildFabricationQuoteSummary([
      {
        id: "edited-1",
        codigo: "V1",
        nombre: "Ventana ajustada",
        lineaComercial: "L5000",
        ancho: 1200,
        alto: 1000,
        cantidad: 1,
        observaciones: encodeCotizacionItemPresentationMeta({
          quickCompositionAdjustment: adjustment,
          cubicationSnapshot: snapshot(),
        }),
      },
    ], {
      recipes: [],
      organizationId: 1,
    });

    expect(summary.items).toHaveLength(0);
    expect(summary.compositionsPendingRecipe).toEqual([
      { itemId: "edited-1", codigo: "V1", nombre: "Ventana ajustada", lineName: "L5000" },
    ]);
    expect(summary.totalProfilesMl).toBe(0);
  });
});
