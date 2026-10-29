/** @jest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GlassCuttingResult } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { GlassDistributionPanel } from "../glass-distribution-panel";
import { createGlassDistributionPdf } from "@/features/fabricacion/services/glass-distribution-pdf.service";
import { downloadPdfBlob } from "@/utils/cotizacion-pdf";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

jest.mock("@/features/fabricacion/services/glass-distribution-pdf.service", () => ({
  createGlassDistributionPdf: jest.fn(async () => ({ output: () => new Blob(["pdf"], { type: "application/pdf" }) })),
}));
jest.mock("@/features/fabricacion/services/ventora-pdf-assets.client", () => ({
  loadVentoraPdfLogoDataUrl: jest.fn(async () => "data:image/png;base64,cG5n"),
}));
jest.mock("@/utils/cotizacion-pdf", () => ({ downloadPdfBlob: jest.fn(async () => "downloaded") }));

const plan = {
  sheetId: "internal-sheet-id",
  profileId: "internal-profile-id",
  rawSheet: { xMm: 0, yMm: 0, widthMm: 2500, heightMm: 1800 },
  usableSheet: { xMm: 0, yMm: 0, widthMm: 2500, heightMm: 1800 },
  cutTree: { kind: "remnant", nodeId: "root", rect: { xMm: 0, yMm: 0, widthMm: 2500, heightMm: 1800 } },
  cutSequence: [],
  panes: [1, 2].map((index) => ({
    paneUnitId: `unit-${index}`,
    organizationId: "org",
    quoteId: "1",
    quoteCode: "COT-QA",
    quoteItemId: "item-1",
    logicalComponentId: "logical-1",
    componentCode: "V1",
    paneId: `pane-${index}`,
    productId: "glass-1",
    snapshotFingerprint: "snapshot-1",
    rect: { xMm: (index - 1) * 750, yMm: 0, widthMm: 750, heightMm: 1600 },
    rotated: false,
  })),
  remnants: [{ remnantId: "remnant-1", rect: { xMm: 1500, yMm: 0, widthMm: 1000, heightMm: 1800 }, areaMm2: 1_800_000, classification: "waste" }],
  areas: { panesMm2: 2_400_000, reusableRemnantsMm2: 1_800_000, wasteMm2: 300_000, edgeTrimMm2: 0, separationLossMm2: 0, rawSheetMm2: 4_500_000, usableSheetMm2: 4_500_000 },
  purchaseCost: null,
};

const verifiedResult = {
  status: "feasible",
  geometricFeasibility: "feasible",
  minimumSheetCountProven: true,
  productionReadiness: "requires_workshop_validation",
  sheets: [plan],
  warnings: [],
  errors: [],
  verification: { passed: true, findings: [] },
  inputFingerprint: "geometry-fingerprint",
  search: { visitedStates: 8, exhausted: true },
  summary: { sheetCount: 1, paneCount: 2, paneAreaMm2: 2_400_000, reusableRemnantsMm2: 1_800_000, wasteMm2: 300_000, edgeTrimMm2: 0, separationLossMm2: 0, rawSheetAreaMm2: 4_500_000, usableSheetAreaMm2: 4_500_000, purchaseCost: null, costStatus: "pending" },
} as unknown as GlassCuttingResult;

const source = {
  quoteCode: "COT-QA",
  diagnostics: [],
  coverage: { status: "complete" as const, completeReferenceCount: 1, pendingReferenceCount: 0, pendingReferences: [], diagnostics: [] },
  panes: [{
    quoteItemId: "item-1",
    paneId: "logical-1:glass-1",
    paneUnitIds: ["logical-1:glass-1:1", "logical-1:glass-1:2"],
    commercialQuantity: 1,
    finishOrientationKey: "glass-1:monolitico:5:unknown",
    logicalComponentId: "logical-1",
    glassId: "glass-1",
    productId: "glass-1",
    componentCode: "V1",
    displayName: "Float incoloro",
    technicalSpec: { version: 1, productId: "glass-1", thicknessMm: 5, category: "monolitico", manualCutStatus: "pending_validation", technicalReviewConfirmed: false, sheetWidthMm: 2500, sheetHeightMm: 1800, pieceOrientation: "unknown", provenance: "catalog", sourceProductId: "glass-1", sourceValues: null, hasConflict: false },
    widthMm: 750,
    heightMm: 1600,
    quantity: 2,
    physicalUnitCount: 2,
    dimensionProvenance: "validated_recipe",
    recipeStatus: "validated",
    validationStatus: "eligible_for_manual_planning",
    warnings: [],
    snapshotFingerprint: "snapshot-1",
  }],
};
const glassTemplate = { id: 501, nombre: "Float incoloro 5 mm", categoria: "vidrio", material: "Cristal", catalogMetadata: { espesor: "5 mm", categoriaTecnica: "monolitico", revisionTecnicaExplicita: true, corteManualEstado: "confirmed", planchaAnchoMm: 2500, planchaAltoMm: 1800 }, isActive: true, eliminadoEn: null } as unknown as CotizacionLineTemplate;

function mockFetch() {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => source })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ quoteCode: "COT-QA", mode: "provider_pdf", coverage: source.coverage, warnings: ["Separación asumida de 0 mm"], results: [verifiedResult], generatedFrom: ["snapshot-1"] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => source })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ quoteCode: "COT-QA", mode: "provider_pdf", coverage: source.coverage, warnings: ["Separación asumida de 0 mm"], results: [verifiedResult], generatedFrom: ["snapshot-1"] }) });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("GlassDistributionPanel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calculates a preliminary distribution directly from saved panes and downloads the PDF", async () => {
    const fetchMock = mockFetch();
    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled />);

    expect(await screen.findByText("Float incoloro")).toBeInTheDocument();
    expect(screen.getByText("Plancha 2500 × 1800 mm")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Descargar distribución (PDF)" }));

    await waitFor(() => expect(downloadPdfBlob).toHaveBeenCalled());
    expect(fetchMock.mock.calls[1]?.[0]).toContain("optimizacion-vidrios");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ mode: "provider_pdf" });
    expect(createGlassDistributionPdf).toHaveBeenCalledWith(expect.objectContaining({ coverage: source.coverage, results: [verifiedResult] }));
    expect(screen.queryByText(/dimensiones de mesa|despuntes en cuatro lados|tira mínima|procedimiento manual/i)).not.toBeInTheDocument();
  });

  it("muestra simulación parcial de recipe_trace y mantiene bloqueado el PDF de proveedor", async () => {
    const excludedPane = {
      ...source.panes[0],
      paneId: "logical-1:glass-missing",
      paneUnitIds: [],
      glassId: "glass-missing",
      widthMm: null,
      heightMm: null,
      quantity: 0,
      physicalUnitCount: null,
      dimensionProvenance: "recipe_trace",
      recipeStatus: "lista_para_validar",
      validationStatus: "requires_review" as const,
      snapshotFingerprint: "snapshot-missing",
      warnings: ["Faltan dimensiones válidas del paño."],
    };
    const partialSource = {
      ...source,
      coverage: { status: "partial" as const, completeReferenceCount: 0, pendingReferenceCount: 2, pendingReferences: [], diagnostics: [] },
      preliminaryPaneCount: 1,
      previewExclusions: [{ quoteItemId: "item-1", paneId: excludedPane.paneId, componentCode: "V1", componentName: "Corredera", displayName: "Float sin medidas", reason: "Faltan dimensiones rectangulares, enteras y positivas congeladas para este paño." }],
      panes: [
        { ...source.panes[0]!, dimensionProvenance: "recipe_trace", recipeStatus: "lista_para_validar", validationStatus: "requires_review" as const, warnings: ["La receta no está validada por el taller."] },
        excludedPane,
      ],
    };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => partialSource })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        quoteCode: "COT-QA", mode: "geometric_preview", coverage: partialSource.coverage,
        warnings: ["Incluye geometría preliminar de recipe_trace."], preliminaryPaneCount: 1,
        previewExclusions: partialSource.previewExclusions, results: [verifiedResult], generatedFrom: ["snapshot-1", "snapshot-missing"],
      }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled />);

    expect(await screen.findByText(/La vista previa usa geometría congelada de una receta preliminar/)).toBeInTheDocument();
    expect(screen.getAllByText(/Faltan dimensiones rectangulares, enteras y positivas congeladas/)).toHaveLength(2);
    const providerButton = screen.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ });
    expect(providerButton).toBeDisabled();
    expect(screen.getByText(/La vista preliminar incluye 2 unidades físicas/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ingresar medidas" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ mode: "geometric_preview" });
    expect(screen.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toBeDisabled();
  });

  it("previews the verified result and uses that same result for its PDF", async () => {
    const fetchMock = mockFetch();
    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled />);

    await screen.findByText("Float incoloro");
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Distribución en plancha de 2500 por 1800 milímetros" })).toBeInTheDocument();
    expect(screen.getByText(/Despuntes y separación geométrica asumidos: 0 mm/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Descargar PDF de esta vista" }));

    await waitFor(() => expect(downloadPdfBlob).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[2]?.[1]).toEqual({ cache: "no-store" });
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toEqual({ mode: "provider_pdf" });
    expect(createGlassDistributionPdf).toHaveBeenCalledTimes(1);
    expect(createGlassDistributionPdf).toHaveBeenLastCalledWith(expect.objectContaining({ coverage: source.coverage, results: [verifiedResult] }));
  });

  it("muestra una vista previa en la pestaña sin iniciar una descarga", async () => {
    const fetchMock = mockFetch();
    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled autoPreview />);

    expect(await screen.findByLabelText("Vista previa preliminar de distribución")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Distribución en plancha de 2500 por 1800 milímetros" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(downloadPdfBlob).not.toHaveBeenCalled();
    expect(screen.getByText("1 referencia incluida · 2 unidades físicas para simulación")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("precalcula en segundo plano y muestra el plano al activar Vidrios", async () => {
    const fetchMock = mockFetch();
    const { rerender } = render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled preloadPreview />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText("Vista previa preliminar de distribución")).not.toBeInTheDocument();
    rerender(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled preloadPreview autoPreview />);
    expect(await screen.findByLabelText("Vista previa preliminar de distribución")).toBeInTheDocument();
  });

  it("muestra cobertura parcial, conserva la vista previa válida y bloquea PDF/Compartir", async () => {
    const partialCoverage = {
      status: "partial" as const,
      completeReferenceCount: 1,
      pendingReferenceCount: 1,
      pendingReferences: [{ quoteItemId: "item-2", componentCode: "V2", componentName: "Paño fijo", displayName: "Float", reason: "Faltan dimensiones válidas del paño." }],
      diagnostics: ["V2 · Paño fijo: Faltan dimensiones válidas del paño."],
    };
    const partialSource = { ...source, coverage: partialCoverage };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => partialSource })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ quoteCode: "COT-QA", mode: "geometric_preview", coverage: partialCoverage, warnings: [], results: [verifiedResult], generatedFrom: ["snapshot-1"] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<GlassDistributionPanel
      quoteId="1"
      quoteCode="COT-QA"
      clientName="Cliente QA"
      workName="Obra QA"
      enabled
      autoPreview
      items={[{ id: "item-2" } as unknown as CotizacionWorkflowItem]}
      templates={[]}
      onSaveManualGlassMeasurements={jest.fn().mockResolvedValue(undefined)}
    />);

    expect(await screen.findByText("Distribución parcial")).toBeInTheDocument();
    expect(screen.getByText("V2 · Paño fijo")).toBeInTheDocument();
    expect(screen.getByText("Float · 1 paño pendiente")).toBeInTheDocument();
    expect(screen.queryByText(/Faltan dimensiones válidas del paño/)).not.toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Distribución en plancha de 2500 por 1800 milímetros" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ingresar medidas" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ingresar medidas" })).not.toBeInTheDocument();
    expect(screen.getByText("El PDF de proveedor requiere cobertura técnica completa. Revisa arriba cada referencia pendiente.")).toBeInTheDocument();
    expect(createGlassDistributionPdf).not.toHaveBeenCalled();
    expect(downloadPdfBlob).not.toHaveBeenCalled();
  });

  it("actualiza cobertura y paños tras guardar una medición parcial sin recargar", async () => {
    const pendingSource = {
      ...source,
      panes: [],
      coverage: {
        status: "partial" as const,
        completeReferenceCount: 0,
        pendingReferenceCount: 2,
        pendingReferences: ["pane-1", "pane-2"].map((displayName) => ({ quoteItemId: "item-1", componentCode: "V1", componentName: "Corredera", displayName, reason: "Faltan dimensiones válidas del paño." })),
        diagnostics: [],
      },
    };
    const updatedSource = {
      ...source,
      coverage: {
        status: "partial" as const,
        completeReferenceCount: 1,
        pendingReferenceCount: 1,
        pendingReferences: [{ quoteItemId: "item-1", componentCode: "V1", componentName: "Corredera", displayName: "pane-2", reason: "Faltan dimensiones válidas del paño." }],
        diagnostics: [],
      },
    };
    let resolveUpdatedSource!: (response: unknown) => void;
    const updatedSourceRequest = new Promise((resolve) => { resolveUpdatedSource = resolve; });
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => pendingSource })
      .mockReturnValueOnce(updatedSourceRequest);
    global.fetch = fetchMock as unknown as typeof fetch;
    const item = {
      id: "item-1", codigo: "V1", nombre: "Corredera", tipo: "Ventana corredera", vidrio: "Float incoloro 5 mm", cantidad: 1,
      observaciones: encodeCotizacionItemPresentationMeta({ sheetScheme: "2 hojas" }),
      manualGlassMeasurements: { version: 2, entries: [] },
    } as unknown as CotizacionWorkflowItem;

    render(<GlassDistributionPanel
      quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled
      items={[item]} templates={[glassTemplate]}
      onSaveManualGlassMeasurements={jest.fn().mockResolvedValue(undefined)}
    />);

    expect(await screen.findByText("Cobertura operativa: 0 completas · 2 pendientes")).toBeInTheDocument();
    expect(screen.getByText("pane-1, pane-2 · 2 paños pendientes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
    await screen.findByLabelText("Posición del paño");
    fireEvent.change(screen.getByLabelText("Posición del paño"), { target: { value: "pane-1" } });
    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "600" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar medidas" }));
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeInTheDocument();
    expect(await screen.findByText("Actualizando paños, referencias y disponibilidad de descarga…")).toBeInTheDocument();
    expect(screen.queryByText("Cobertura operativa: 0 completas · 2 pendientes")).not.toBeInTheDocument();
    await act(async () => { resolveUpdatedSource({ ok: true, json: async () => updatedSource }); });

    expect(await screen.findByText("Medidas guardadas. Cobertura actualizada.")).toBeInTheDocument();
    expect(screen.getByText("Cobertura operativa: 1 completas · 1 pendientes")).toBeInTheDocument();
    expect(screen.getByText("pane-2 · 1 paño pendiente")).toBeInTheDocument();
    expect(screen.getAllByText("pane-2 · 1 paño pendiente")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("permite reintentar una recarga fallida sin volver a guardar medidas", async () => {
    const partialSource = {
      ...source,
      coverage: {
        status: "partial" as const,
        completeReferenceCount: 0,
        pendingReferenceCount: 1,
        pendingReferences: [{ quoteItemId: "item-1", componentCode: "V1", componentName: "Corredera", displayName: "pane-1", reason: "Faltan dimensiones válidas del paño." }],
        diagnostics: [],
      },
    };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => partialSource })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Error de recarga QA" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...source, coverage: { ...source.coverage, status: "complete", completeReferenceCount: 1, pendingReferenceCount: 0, pendingReferences: [] } }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    const item = {
      id: "item-1", codigo: "V1", nombre: "Corredera", tipo: "Ventana corredera", vidrio: "Float incoloro 5 mm", cantidad: 1,
      observaciones: encodeCotizacionItemPresentationMeta({ sheetScheme: "2 hojas" }),
      manualGlassMeasurements: { version: 2, entries: [] },
    } as unknown as CotizacionWorkflowItem;
    const save = jest.fn().mockResolvedValue(undefined);

    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled items={[item]} templates={[glassTemplate]} onSaveManualGlassMeasurements={save} />);
    await screen.findByText("Cobertura operativa: 0 completas · 1 pendientes");
    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
    await screen.findByLabelText("Posición del paño");
    fireEvent.change(screen.getByLabelText("Posición del paño"), { target: { value: "pane-1" } });
    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "600" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar medidas" }));

    expect(await screen.findByText(/Las medidas quedaron guardadas, pero no pudimos actualizar la cobertura/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar actualización" }));
    expect(await screen.findByText("Medidas guardadas. Cobertura actualizada.")).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Cobertura operativa: 1 completas · 0 pendientes")).toBeInTheDocument();
  });

  it("invalida el plano previo cuando cambian las medidas guardadas", async () => {
    const partialCoverage = {
      status: "partial" as const,
      completeReferenceCount: 1,
      pendingReferenceCount: 1,
      pendingReferences: [{ quoteItemId: "item-1", componentCode: "V1", componentName: "Corredera", displayName: "pane-2", reason: "Faltan dimensiones válidas del paño." }],
      diagnostics: [],
    };
    const partialSource = { ...source, coverage: partialCoverage };
    const completeSource = { ...source, coverage: { ...source.coverage, completeReferenceCount: 1, pendingReferenceCount: 0, pendingReferences: [] } };
    let resolveUpdatedSource!: (response: unknown) => void;
    const updatedSourceRequest = new Promise((resolve) => { resolveUpdatedSource = resolve; });
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => partialSource })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ quoteCode: "COT-QA", mode: "geometric_preview", coverage: partialCoverage, warnings: [], results: [verifiedResult], generatedFrom: ["snapshot-1"] }) })
      .mockReturnValueOnce(updatedSourceRequest);
    global.fetch = fetchMock as unknown as typeof fetch;
    const item = {
      id: "item-1", codigo: "V1", nombre: "Corredera", tipo: "Ventana corredera", vidrio: "Float incoloro 5 mm", cantidad: 1,
      observaciones: encodeCotizacionItemPresentationMeta({ sheetScheme: "2 hojas" }),
      manualGlassMeasurements: { version: 2, entries: [] },
    } as unknown as CotizacionWorkflowItem;

    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled items={[item]} templates={[glassTemplate]} onSaveManualGlassMeasurements={jest.fn().mockResolvedValue(undefined)} />);
    await screen.findByText("Cobertura operativa: 1 completas · 1 pendientes");
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Ingresar medidas" }));
    await screen.findByLabelText("Posición del paño");
    fireEvent.change(screen.getByLabelText("Posición del paño"), { target: { value: "pane-2" } });
    fireEvent.change(screen.getByLabelText("Producto del catálogo"), { target: { value: "501" } });
    fireEvent.change(screen.getByLabelText("Ancho final (mm)"), { target: { value: "600" } });
    fireEvent.change(screen.getByLabelText("Alto final (mm)"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia de vidrio" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar medidas" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Actualizando paños, referencias y disponibilidad de descarga…")).toBeInTheDocument();
    await act(async () => { resolveUpdatedSource({ ok: true, json: async () => completeSource }); });

    expect(await screen.findByText("Cobertura completa")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vista previa" })).toBeEnabled();
    expect(screen.queryByLabelText("Vista previa preliminar de distribución")).not.toBeInTheDocument();
  });

  it("ignora una respuesta anterior que llega después de cambiar de cotización", async () => {
    let resolveFirst!: (response: unknown) => void;
    let resolveSecond!: (response: unknown) => void;
    const first = new Promise((resolve) => { resolveFirst = resolve; });
    const second = new Promise((resolve) => { resolveSecond = resolve; });
    const quoteOne = { ...source, quoteCode: "COT-UNO", panes: [{ ...source.panes[0]!, displayName: "Vidrio viejo" }] };
    const quoteTwo = { ...source, quoteCode: "COT-DOS", panes: [{ ...source.panes[0]!, displayName: "Vidrio vigente" }] };
    const fetchMock = jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    global.fetch = fetchMock as unknown as typeof fetch;

    const { rerender } = render(<GlassDistributionPanel quoteId="1" quoteCode="COT-UNO" clientName="QA" workName="QA" enabled items={[]} templates={[]} onSaveManualGlassMeasurements={jest.fn()} />);
    rerender(<GlassDistributionPanel quoteId="2" quoteCode="COT-DOS" clientName="QA" workName="QA" enabled items={[]} templates={[]} onSaveManualGlassMeasurements={jest.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    resolveSecond({ ok: true, json: async () => quoteTwo });
    expect(await screen.findByText("Vidrio vigente")).toBeInTheDocument();
    resolveFirst({ ok: true, json: async () => quoteOne });
    await waitFor(() => expect(screen.getByText("Vidrio vigente")).toBeInTheDocument());
    expect(screen.queryByText("Vidrio viejo")).not.toBeInTheDocument();
  });

  it("ofrece Compartir y usa descarga normal como alternativa sin Web Share", async () => {
    mockFetch();
    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled autoPreview />);
    await screen.findByLabelText("Vista previa preliminar de distribución");

    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await waitFor(() => expect(downloadPdfBlob).toHaveBeenCalled());
    expect(screen.getByRole("status")).toHaveTextContent("no permite compartir archivos");
  });

  it("comparte el PDF solo después de tocar Compartir cuando Web Share acepta archivos", async () => {
    const originalShare = Object.getOwnPropertyDescriptor(navigator, "share");
    const originalCanShare = Object.getOwnPropertyDescriptor(navigator, "canShare");
    const share = jest.fn().mockResolvedValue(undefined);
    const canShare = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: canShare });
    try {
      mockFetch();
      render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled autoPreview />);
      await screen.findByLabelText("Vista previa preliminar de distribución");
      expect(share).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
      await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
      expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
      expect(downloadPdfBlob).not.toHaveBeenCalled();
    } finally {
      if (originalShare) Object.defineProperty(navigator, "share", originalShare);
      else delete (navigator as Navigator & { share?: Navigator["share"] }).share;
      if (originalCanShare) Object.defineProperty(navigator, "canShare", originalCanShare);
      else delete (navigator as Navigator & { canShare?: Navigator["canShare"] }).canShare;
    }
  });

  it("requires a new calculation when frozen panes changed after the panel loaded", async () => {
    const latestSource = { ...source, panes: [{ ...source.panes[0]!, snapshotFingerprint: "snapshot-2" }] };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => source })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ quoteCode: "COT-QA", mode: "provider_pdf", coverage: source.coverage, warnings: [], results: [verifiedResult], generatedFrom: ["snapshot-2"] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => latestSource });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled />);

    await screen.findByText("Float incoloro");
    fireEvent.click(screen.getByRole("button", { name: "Descargar distribución (PDF)" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Los paños guardados cambiaron");
    expect(downloadPdfBlob).not.toHaveBeenCalled();
    expect(createGlassDistributionPdf).not.toHaveBeenCalled();
  });

  it("asks only for sheet width and height when the frozen format is missing", async () => {
    const sourceWithoutFormat = {
      ...source,
      panes: [{ ...source.panes[0]!, technicalSpec: { ...source.panes[0]!.technicalSpec, sheetWidthMm: null, sheetHeightMm: null } }],
    };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => sourceWithoutFormat })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ quoteCode: "COT-QA", mode: "provider_pdf", coverage: source.coverage, warnings: [], results: [verifiedResult], generatedFrom: ["snapshot-1"] }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled />);

    await screen.findByText("Falta el formato de plancha. Indica ancho y alto para esta distribución.");
    fireEvent.change(screen.getByLabelText("Ancho de plancha (mm)"), { target: { value: "2500" } });
    fireEvent.change(screen.getByLabelText("Alto de plancha (mm)"), { target: { value: "1800" } });
    fireEvent.click(screen.getByRole("button", { name: "Descargar distribución (PDF)" }));

    await waitFor(() => expect(downloadPdfBlob).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ mode: "provider_pdf", sheetWidthMm: 2500, sheetHeightMm: 1800 });
    expect(screen.queryByText(/mesa|tira mínima|procedimiento manual|documento de proveedor/i)).not.toBeInTheDocument();
  });
});

