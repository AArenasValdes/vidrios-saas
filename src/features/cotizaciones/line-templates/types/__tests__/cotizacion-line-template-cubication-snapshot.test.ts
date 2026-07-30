import {
  buildCubicationSnapshotFromCatalogMetadata,
  buildPersonalizadoManualCubicationDraft,
  cubicationSnapshotMatchesDimensions,
  parseCubicationSnapshot,
  rebuildCubicationSnapshotWithCuts,
  resolveCubicationSnapshotForSave,
  serializeCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

const SAMPLE_METADATA = {
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

describe("cotizacion line template cubication snapshot", () => {
  it("lee snapshots legacy [cub:] desde observaciones", () => {
    const snapshot = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: "tpl-ventana-s60",
      catalogMetadata: { ...SAMPLE_METADATA },
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
      capturedAt: "2026-07-18T12:00:00.000Z",
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.cuts.length).toBeGreaterThan(0);
    expect(snapshot?.system).toBe("corredera_2_hojas");
    expect(snapshot?.status).toBe("validada");

    const encoded =
      `[lti:tpl-ventana-s60][cub:${serializeCubicationSnapshot(snapshot!)}] Pieza living`;

    expect(encoded).toContain("[cub:");
    const decoded = decodeCotizacionItemPresentationMeta(encoded);
    expect(decoded.cubicationSnapshot).toMatchObject({
      lineTemplateId: "tpl-ventana-s60",
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
      system: "corredera_2_hojas",
      status: "validada",
    });
    expect(decoded.cubicationSnapshot?.cuts).toEqual(snapshot?.cuts);
    expect(decoded.raw).toBe("Pieza living");
  });

  it("no escribe nuevos snapshots con bridge [cub:] desde el encoder comercial", () => {
    const snapshot = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: "tpl-ventana-s60",
      catalogMetadata: { ...SAMPLE_METADATA },
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
    });

    const encoded = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      lineTemplateId: "tpl-ventana-s60",
      cubicationSnapshot: snapshot,
      raw: "Pieza living",
    });

    expect(decodeCotizacionItemPresentationMeta(encoded).cubicationSnapshot).toBeNull();
  });

  it("no cambia el snapshot histórico si la metadata de línea cambia después", () => {
    const original = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: "tpl-1",
      catalogMetadata: { ...SAMPLE_METADATA },
      widthMm: 1500,
      heightMm: 1200,
      quantity: 2,
      capturedAt: "2026-07-01T10:00:00.000Z",
    });

    expect(original).not.toBeNull();
    const serialized = serializeCubicationSnapshot(original!);
    const reloaded = parseCubicationSnapshot(serialized);
    expect(reloaded?.cuts).toEqual(original?.cuts);

    const changedMetadata = {
      ...SAMPLE_METADATA,
      deductionFrameHorizontalMm: 80,
      profileFrame: "Marco nuevo",
    };
    const liveToday = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: "tpl-1",
      catalogMetadata: changedMetadata,
      widthMm: 1500,
      heightMm: 1200,
      quantity: 2,
    });

    expect(liveToday?.cuts).not.toEqual(reloaded?.cuts);

    const preserved = resolveCubicationSnapshotForSave({
      lineTemplateId: "tpl-1",
      widthMm: 1500,
      heightMm: 1200,
      quantity: 2,
      previousSnapshot: reloaded,
    });

    expect(preserved?.cuts).toEqual(reloaded?.cuts);
    expect(
      cubicationSnapshotMatchesDimensions(preserved, {
        lineTemplateId: "tpl-1",
        widthMm: 1500,
        heightMm: 1200,
        quantity: 2,
      })
    ).toBe(true);
  });

  it("recalcula snapshot al guardar con metadata actual si cambian medidas", () => {
    const previous = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: "tpl-1",
      catalogMetadata: { ...SAMPLE_METADATA },
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
    });

    const next = resolveCubicationSnapshotForSave({
      lineTemplateId: "tpl-1",
      widthMm: 2000,
      heightMm: 1000,
      quantity: 1,
      catalogMetadata: { ...SAMPLE_METADATA },
      previousSnapshot: previous,
    });

    expect(next?.widthMm).toBe(2000);
    expect(next?.cuts).not.toEqual(previous?.cuts);
  });

  it("persiste ajuste manual de pauta sin pisarlo con metadata de línea", () => {
    const auto = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: "tpl-1",
      catalogMetadata: { ...SAMPLE_METADATA },
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
    });
    expect(auto).not.toBeNull();

    const manual = rebuildCubicationSnapshotWithCuts(
      auto!,
      auto!.cuts.map((cut, index) =>
        index === 0 ? { ...cut, lengthMm: 1180, label: "Marco taller" } : cut
      ),
      { source: "manual" }
    );

    expect(manual?.source).toBe("manual");
    expect(manual?.cuts[0]?.label).toBe("Marco taller");
    expect(manual?.cuts[0]?.lengthMm).toBe(1180);

    const saved = resolveCubicationSnapshotForSave({
      lineTemplateId: "tpl-1",
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
      catalogMetadata: { ...SAMPLE_METADATA },
      draftSnapshot: manual,
    });

    expect(saved?.source).toBe("manual");
    expect(saved?.cuts[0]?.label).toBe("Marco taller");
    expect(saved?.cuts[0]?.lengthMm).toBe(1180);
  });

  it("crea borrador manual para Personalizado sin plantilla automática", () => {
    const draft = buildPersonalizadoManualCubicationDraft({
      lineTemplateId: "tpl-1",
      catalogMetadata: { ...SAMPLE_METADATA },
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
    });

    expect(draft).not.toBeNull();
    expect(draft?.source).toBe("manual");
    expect(draft?.status).toBe("en_calibracion");
    expect(draft?.cuts.length).toBeGreaterThanOrEqual(3);
    expect(draft?.glass?.widthMm).toBe(1200);
    expect(draft?.glass?.heightMm).toBe(1000);
  });

  it("en Personalizado sin receta usa estimado geométrico (no partida automática silenciosa)", () => {
    const metadataSinReceta = {
      cuttingEnabled: false,
      cuttingMode: "sin_corte" as const,
      cubicationSystem: "corredera_2_hojas",
      cubicationStatus: "sin_configurar",
    };

    const saved = resolveCubicationSnapshotForSave({
      lineTemplateId: "tpl-1",
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
      catalogMetadata: metadataSinReceta,
      draftSnapshot: null,
      personalizadoAssistMode: true,
    });

    expect(saved?.source).toBe("manual");
    expect(saved?.estimationKind).toBe("geometric_fallback");
    expect(saved?.cuts.some((cut) => cut.label === "División / hoja")).toBe(true);
  });

  it("si la línea tiene receta, personalizado no reemplaza por Marco/División", () => {
    const withRecipe = {
      ...SAMPLE_METADATA,
      fabricationRecipe: {
        v: 1,
        fabricationType: "corredera_2_hojas",
        variant: "estandar",
        sashCount: 2,
        moduleCount: 1,
        status: "validada",
        validatedAt: "2026-07-23T00:00:00.000Z",
        validationCase: null,
        components: [
          {
            id: "riel-1",
            functionKey: "riel_superior",
            functionLabel: "Riel superior",
            kind: "profile",
            profileCode: "5001",
            profileName: "Riel",
            quantityRule: "fixed",
            quantityValue: 1,
            measureBase: "vano_width",
            adjustMode: "none",
            adjustMm: 0,
            fixedMeasureMm: 0,
            required: true,
            barLengthMm: 6000,
            kerfMm: 3,
            notes: "",
          },
        ],
      },
    };

    const saved = resolveCubicationSnapshotForSave({
      lineTemplateId: "tpl-1",
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
      catalogMetadata: withRecipe,
      draftSnapshot: null,
      personalizadoAssistMode: true,
    });

    expect(saved?.estimationKind).toBe("recipe");
    expect(saved?.cuts.some((cut) => cut.functionLabel === "Riel superior")).toBe(true);
    expect(saved?.cuts.some((cut) => cut.label === "Marco")).toBe(false);
  });
});
