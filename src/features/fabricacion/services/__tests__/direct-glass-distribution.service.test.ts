import {
  isPaneEligibleForDistribution,
  mapGlassDistributionPdfPanes,
  paneHasSheetFormat,
  runDirectGlassDistributionDownload,
  type GlassDistributionPane,
} from "../direct-glass-distribution.service";
import { createGlassDistributionPdf } from "../glass-distribution-pdf.service";
import { downloadPdfBlob } from "@/utils/cotizacion-pdf";

jest.mock("../glass-distribution-pdf.service", () => ({
  createGlassDistributionPdf: jest.fn(async () => ({ output: () => new Blob(["pdf"], { type: "application/pdf" }) })),
}));
jest.mock("../ventora-pdf-assets.client", () => ({
  loadVentoraPdfLogoDataUrl: jest.fn(async () => "data:image/png;base64,cG5n"),
}));
jest.mock("@/utils/cotizacion-pdf", () => ({
  downloadPdfBlob: jest.fn(async () => "downloaded"),
}));

describe("direct-glass-distribution.service", () => {
  const basePane: GlassDistributionPane = {
    quoteItemId: "item-1",
    paneId: "glass-pane-1",
    paneUnitIds: ["unit-1", "unit-2"],
    commercialQuantity: 1,
    logicalComponentId: "comp-1",
    glassId: "glass-1",
    productId: "prod-1",
    componentCode: "V1",
    displayName: "Float incoloro 5mm",
    technicalSpec: {
      version: 1,
      productId: "prod-1",
      purchaseMode: "full_sheet",
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
    dimensionProvenance: "validated_recipe",
    recipeStatus: "validated",
    validationStatus: "eligible_for_manual_planning",
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

  beforeEach(() => jest.clearAllMocks());

  it("utiliza el mismo criterio geométrico compartido por la API", () => {
    expect(isPaneEligibleForDistribution(basePane)).toBe(true);

    expect(
      isPaneEligibleForDistribution({
        ...basePane,
        recipeStatus: "unvalidated",
        dimensionProvenance: "recipe_trace",
      })
    ).toBe(true);

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

  it("permite distribuir vidrio con espesor decimal válido", () => {
    expect(isPaneEligibleForDistribution({
      ...basePane,
      technicalSpec: { ...basePane.technicalSpec!, thicknessMm: 4.5, category: "dvh" },
      dimensionProvenance: "manual",
      recipeStatus: null,
    })).toBe(true);
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

  function stubGeometricResult(coverage = completeCoverage) {
    const response = {
      mode: "geometric_preview",
      quoteCode: "COT-1248",
      coverage,
      warnings: ["Separación geométrica 0 mm"],
      previewExclusions: coverage.status === "complete" ? [] : [{ quoteItemId: "item-2", paneId: "pane-2", componentCode: "F2", componentName: "Paño fijo", reason: "Medidas pendientes" }],
      preliminaryPaneCount: 1,
      generatedFrom: ["fingerprint-1"],
      results: [{ status: "feasible", verification: { passed: true }, sheets: [{ panes: [{ paneUnitId: "unit-1" }, { paneUnitId: "unit-2" }] }] }],
    };
    const fetchMock = jest.fn(async () => ({ ok: true, json: async () => response }));
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  it("descarga PDF preliminar con modo geometric_preview sin pedir reglas operativas", async () => {
    const fetchMock = stubGeometricResult();
    const result = await runDirectGlassDistributionDownload({
      quoteId: "1248", quoteCode: "COT-1248", clientName: "Cliente QA", workName: "Obra QA",
      loadedData: { quoteCode: "COT-1248", panes: [basePane], coverage: completeCoverage, diagnostics: [], preliminaryPaneCount: 1 },
    });

    expect(result).toMatchObject({ status: "success", downloadStatus: "downloaded" });
    expect(fetchMock).toHaveBeenCalledWith("/api/cotizaciones/1248/optimizacion-vidrios", expect.objectContaining({
      method: "POST", body: JSON.stringify({ mode: "geometric_preview" }),
    }));
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain("provider_pdf");
    expect(createGlassDistributionPdf).toHaveBeenCalledWith(expect.objectContaining({
      mode: "simulation", quoteCode: "COT-1248", panes: expect.arrayContaining([expect.objectContaining({ componentCode: "V1", quantity: 2 })]),
    }));
    expect(downloadPdfBlob).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining("simulacion-vidrios-no-apto-corte"));
  });

  it("genera simulación parcial sin convertir piezas pendientes en instrucciones de corte", async () => {
    const partialCoverage = {
      status: "partial" as const, completeReferenceCount: 1, pendingReferenceCount: 1,
      pendingReferences: [{ quoteItemId: "item-2", componentCode: "F2", componentName: "Paño fijo", displayName: "Float", reason: "Medidas pendientes" }],
      diagnostics: ["F2 · Paño fijo: faltan dimensiones."],
    };
    stubGeometricResult(partialCoverage);
    const result = await runDirectGlassDistributionDownload({
      quoteId: "1248", quoteCode: "COT-1248", clientName: "Cliente QA", workName: "Obra QA",
      loadedData: { quoteCode: "COT-1248", panes: [basePane], coverage: partialCoverage, diagnostics: [], preliminaryPaneCount: 1 },
    });
    expect(result.status).toBe("success");
    expect(createGlassDistributionPdf).toHaveBeenCalledWith(expect.objectContaining({
      mode: "simulation",
      coverage: expect.objectContaining({ status: "partial" }),
      previewExclusions: expect.arrayContaining([expect.objectContaining({ componentCode: "F2" })]),
    }));
  });

  it("bloquea un resultado si la geometría cambia entre lectura y cálculo", async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({
      mode: "geometric_preview", quoteCode: "COT-1248", coverage: completeCoverage,
      preliminaryPaneCount: 1, generatedFrom: ["fingerprint-modificado"],
      results: [], warnings: [],
    }) }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const result = await runDirectGlassDistributionDownload({
      quoteId: "1248", quoteCode: "COT-1248", clientName: "Cliente QA", workName: "Obra QA",
      loadedData: { quoteCode: "COT-1248", panes: [basePane], coverage: completeCoverage, diagnostics: [], preliminaryPaneCount: 1 },
    });
    expect(result).toMatchObject({ status: "blocked", reason: expect.stringContaining("cambiaron") });
    expect(createGlassDistributionPdf).not.toHaveBeenCalled();
  });
});
