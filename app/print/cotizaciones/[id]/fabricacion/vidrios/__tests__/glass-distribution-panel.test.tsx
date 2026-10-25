/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GlassCuttingResult } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import { GlassDistributionPanel } from "../glass-distribution-panel";
import { createGlassDistributionPdf } from "@/features/fabricacion/services/glass-distribution-pdf.service";
import { downloadPdfBlob } from "@/utils/cotizacion-pdf";

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
    expect(screen.getByText("1 referencia de paño · 2 unidades con medidas verificadas")).toBeInTheDocument();
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

    render(<GlassDistributionPanel quoteId="1" quoteCode="COT-QA" clientName="Cliente QA" workName="Obra QA" enabled autoPreview />);

    expect(await screen.findByText("Distribución parcial")).toBeInTheDocument();
    expect(screen.getByText(/no representa toda la cotización/)).toBeInTheDocument();
    expect(screen.getByText(/V2 · Paño fijo/)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Distribución en plancha de 2500 por 1800 milímetros" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Corregir cotización" })).toHaveAttribute("href", "/cotizaciones/1");
    expect(createGlassDistributionPdf).not.toHaveBeenCalled();
    expect(downloadPdfBlob).not.toHaveBeenCalled();
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

