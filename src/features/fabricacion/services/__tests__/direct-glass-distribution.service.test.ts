import {
  isPaneEligibleForDistribution,
  mapGlassDistributionPdfPanes,
  paneHasSheetFormat,
  runDirectGlassDistributionDownload,
  type GlassDistributionPane,
} from "../direct-glass-distribution.service";

describe("direct-glass-distribution.service", () => {
  const basePane: GlassDistributionPane = {
    quoteItemId: "item-1",
    logicalComponentId: "comp-1",
    glassId: "glass-1",
    productId: "prod-1",
    componentCode: "V1",
    displayName: "Float incoloro 5mm",
    technicalSpec: {
      version: 1,
      category: "monolitico",
      thicknessMm: 5,
      sheetWidthMm: 2500,
      sheetHeightMm: 1800,
      pieceOrientation: "unknown",
      hasConflict: false,
      manualCutStatus: "confirmed",
      provenance: "catalog",
      sourceProductId: "prod-1",
      sourceValues: null,
      technicalReviewConfirmed: true,
    },
    widthMm: 750,
    heightMm: 1600,
    quantity: 2,
    physicalUnitCount: 2,
    dimensionProvenance: "recipe",
    recipeStatus: "validated",
    warnings: [],
    snapshotFingerprint: "fingerprint-1",
  };
  const completeCoverage = {
    status: "complete" as const,
    completeReferenceCount: 1,
    pendingReferenceCount: 0,
    pendingReferences: [],
    diagnostics: [],
  };

  it("identifica paños elegibles con receta validada y medidas completas", () => {
    expect(isPaneEligibleForDistribution(basePane)).toBe(true);

    expect(
      isPaneEligibleForDistribution({
        ...basePane,
        recipeStatus: "unvalidated",
      })
    ).toBe(false);

    expect(
      isPaneEligibleForDistribution({
        ...basePane,
        widthMm: null,
      })
    ).toBe(false);

    expect(
      isPaneEligibleForDistribution({
        ...basePane,
        dimensionProvenance: "legacy_snapshot",
      })
    ).toBe(false);
  });

  it("verifica la presencia del formato técnico de plancha", () => {
    expect(paneHasSheetFormat(basePane.technicalSpec)).toBe(true);

    expect(
      paneHasSheetFormat({
        ...basePane.technicalSpec!,
        sheetWidthMm: null,
      })
    ).toBe(false);

    expect(
      paneHasSheetFormat({
        ...basePane.technicalSpec!,
        sheetHeightMm: 0,
      })
    ).toBe(false);

    expect(paneHasSheetFormat(null)).toBe(false);
  });

  it("conserva dimensiones y cantidad al mapear el resumen para el PDF", () => {
    expect(mapGlassDistributionPdfPanes([basePane])).toEqual([expect.objectContaining({
      widthMm: 750,
      heightMm: 1600,
      quantity: 2,
      physicalUnitCount: 2,
      thicknessMm: 5,
      category: "monolitico",
    })]);
  });

  it("bloquea y reporta diagnóstico cuando no hay paños congelados", async () => {
    const result = await runDirectGlassDistributionDownload({
      quoteId: "1247",
      quoteCode: "COT-1247",
      clientName: "Cliente Test",
      workName: "Obra Test",
      loadedData: {
        quoteCode: "COT-1247",
        panes: [],
        diagnostics: ["No hay cubicación técnica congelada."],
        coverage: { status: "unavailable", completeReferenceCount: 0, pendingReferenceCount: 1, pendingReferences: [], diagnostics: ["No hay cubicación técnica congelada."] },
      },
    });

    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.reason).toContain("No hay cubicación técnica congelada");
    }
  });

  it("solicita formato cuando los paños no tienen medidas de plancha", async () => {
    const paneWithoutSheet = {
      ...basePane,
      technicalSpec: {
        ...basePane.technicalSpec!,
        sheetWidthMm: null,
        sheetHeightMm: null,
      },
    };

    const result = await runDirectGlassDistributionDownload({
      quoteId: "1247",
      quoteCode: "COT-1247",
      clientName: "Cliente Test",
      workName: "Obra Test",
      loadedData: {
        quoteCode: "COT-1247",
        panes: [paneWithoutSheet],
        diagnostics: [],
        coverage: completeCoverage,
      },
    });

    expect(result.status).toBe("needs_format");
    if (result.status === "needs_format") {
      expect(result.panes).toHaveLength(1);
      expect(result.quoteCode).toBe("COT-1247");
    }
  });

  it("bloquea la descarga directa al proveedor si la cobertura GET es parcial", async () => {
    const result = await runDirectGlassDistributionDownload({
      quoteId: "1248", quoteCode: "COT-1248", clientName: "Cliente Test", workName: "Obra Test",
      loadedData: {
        quoteCode: "COT-1248",
        panes: [basePane],
        diagnostics: ["V2 · Paño fijo: faltan dimensiones."],
        coverage: {
          status: "partial", completeReferenceCount: 1, pendingReferenceCount: 1,
          pendingReferences: [{ quoteItemId: "item-2", componentCode: "V2", componentName: "Paño fijo", displayName: "Float", reason: "Faltan dimensiones." }],
          diagnostics: ["V2 · Paño fijo: faltan dimensiones."],
        },
      },
    });

    expect(result).toMatchObject({ status: "blocked", reason: expect.stringContaining("No se puede generar un PDF completo para el proveedor") });
  });
});
