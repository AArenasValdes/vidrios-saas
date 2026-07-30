import {
  applyManualCutsAdjustmentToLineCatalogMetadata,
  buildCubicationConfigPatchFromManualCuts,
  buildCubicationDeductionPatchFromManualCuts,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-adjustment";
import { getLineTemplateCubicationConfig } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { buildConsolidatedCubicationPauta } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import {
  buildCubicationSnapshotFromCatalogMetadata,
  serializeCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

const BASE_METADATA = {
  cuttingEnabled: true,
  cuttingMode: "marco_hojas",
  cuttingBarLengthMm: 6000,
  cuttingSawKerfMm: 3,
  cuttingSashCount: 2,
  cubicationSystem: "corredera_2_hojas",
  cubicationStatus: "validada",
  profileFrame: "Marco",
  profileSash: "Hoja",
} as const;

describe("cubication adjustment from manual cuts", () => {
  it("mapea nombres de perfil por funcion y marca revisar_cambios si estaba validada", () => {
    const current = getLineTemplateCubicationConfig({ ...BASE_METADATA });
    const patch = buildCubicationConfigPatchFromManualCuts(
      [
        {
          label: "Marco Veka",
          functionLabel: "Riel superior",
          quantity: 1,
          lengthMm: 1200,
          totalLinealMm: 1200,
        },
        {
          label: "Hoja Veka",
          functionLabel: "Hoja vertical",
          quantity: 4,
          lengthMm: 1000,
          totalLinealMm: 4000,
        },
      ],
      current
    );

    expect(patch).toMatchObject({
      profileFrame: "Marco Veka",
      profileSash: "Hoja Veka",
    });

    const applied = applyManualCutsAdjustmentToLineCatalogMetadata({
      catalogMetadata: { ...BASE_METADATA },
      cuts: [
        {
          label: "Marco Veka",
          functionLabel: "Riel superior",
          quantity: 1,
          lengthMm: 1200,
          totalLinealMm: 1200,
        },
        {
          label: "Hoja Veka",
          functionLabel: "Hoja vertical",
          quantity: 4,
          lengthMm: 1000,
          totalLinealMm: 4000,
        },
      ],
    });

    expect(applied.changed).toBe(true);
    expect(applied.nextMetadata.cubicationStatus).toBe("revisar_cambios");
    expect(applied.nextMetadata.profileFrame).toBe("Marco Veka");
    expect(applied.nextMetadata.profileSash).toBe("Hoja Veka");
  });

  it("infiere descuento de hoja horizontal al acortar el corte (594 → 590)", () => {
    const current = getLineTemplateCubicationConfig({
      ...BASE_METADATA,
      deductionSashHorizontalMm: 6,
    });

    const result = buildCubicationDeductionPatchFromManualCuts({
      widthMm: 1200,
      heightMm: 1000,
      sashCount: 2,
      system: "corredera_2_hojas",
      current,
      autoCuts: [
        {
          label: "Hoja",
          functionLabel: "Hoja horizontal",
          quantity: 4,
          lengthMm: 594,
          totalLinealMm: 2376,
        },
      ],
      manualCuts: [
        {
          label: "Hoja",
          functionLabel: "Hoja horizontal",
          quantity: 4,
          lengthMm: 590,
          totalLinealMm: 2360,
        },
      ],
    });

    expect(result.patch.deductionSashHorizontalMm).toBe(10);
    expect(result.changes[0]).toMatchObject({
      key: "deductionSashHorizontalMm",
      fromMm: 6,
      toMm: 10,
      deltaMm: 4,
    });

    const applied = applyManualCutsAdjustmentToLineCatalogMetadata({
      catalogMetadata: {
        ...BASE_METADATA,
        deductionSashHorizontalMm: 6,
      },
      cuts: [
        {
          label: "Hoja",
          functionLabel: "Hoja horizontal",
          quantity: 4,
          lengthMm: 590,
          totalLinealMm: 2360,
        },
      ],
      widthMm: 1200,
      heightMm: 1000,
      sashCount: 2,
      autoCuts: [
        {
          label: "Hoja",
          functionLabel: "Hoja horizontal",
          quantity: 4,
          lengthMm: 594,
          totalLinealMm: 2376,
        },
      ],
    });

    expect(applied.changed).toBe(true);
    expect(applied.nextMetadata.deductionSashHorizontalMm).toBe(10);
    expect(applied.nextMetadata.cubicationStatus).toBe("revisar_cambios");
    expect(applied.summary.lines.some((line) => /hoja horizontal/i.test(line))).toBe(true);
  });
});

describe("pauta consolidada", () => {
  it("agrupa cortes de varias piezas por linea + perfil + medida", () => {
    const snapshot = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: "tpl-1",
      catalogMetadata: { ...BASE_METADATA },
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
    });
    expect(snapshot).not.toBeNull();

    const observaciones =
      `[r:Serie 5 mil][lti:tpl-1][cub:${serializeCubicationSnapshot(snapshot!)}]`;

    const items = [
      {
        id: "1",
        tipoItem: "componente",
        codigo: "V1",
        tipo: "Ventana",
        lineaComercial: "Serie 5 mil",
        nombre: "Ventana 1",
        observaciones,
        cantidad: 1,
      },
      {
        id: "2",
        tipoItem: "componente",
        codigo: "V2",
        tipo: "Ventana",
        lineaComercial: "Serie 5 mil",
        nombre: "Ventana 2",
        observaciones,
        cantidad: 1,
      },
    ] as unknown as CotizacionWorkflowItem[];

    const pauta = buildConsolidatedCubicationPauta(items);
    expect(pauta.itemCountWithPauta).toBe(2);
    expect(pauta.rows.length).toBeGreaterThan(0);

    const riel = pauta.rows.find((row) => row.functionLabel === "Riel superior");
    expect(riel?.pieceCodes).toEqual(expect.arrayContaining(["V1", "V2"]));
    expect(riel?.quantity).toBeGreaterThan(1);
    // Agrupa por perfil + función + medida (no toda la línea como un solo perfil).
    expect(riel?.functionLabel).toBe("Riel superior");
  });
});
