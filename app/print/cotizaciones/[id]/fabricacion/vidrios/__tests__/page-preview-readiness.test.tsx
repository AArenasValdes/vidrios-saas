/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GlassSheetOptimizationPage from "../page";

const mockPdfTextByPage: string[][] = [];

jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation(() => {
    mockPdfTextByPage.push([]);
    let currentPage = 1;
    const base = {
      addPage: () => { mockPdfTextByPage.push([]); currentPage = mockPdfTextByPage.length; },
      getNumberOfPages: () => mockPdfTextByPage.length,
      setPage: (page: number) => { currentPage = page; },
      splitTextToSize: (value: string) => [value],
      text: (value: string | string[]) => { mockPdfTextByPage[currentPage - 1]?.push(Array.isArray(value) ? value.join(" ") : value); },
      save: jest.fn(),
    };
    return new Proxy(base, {
      get(target, key: string) {
        if (key in target) return target[key as keyof typeof target];
        return () => undefined;
      },
    });
  }),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "1290" }),
  useSearchParams: () => new URLSearchParams("codigo=COT-301026-002"),
}));

function manualPane(code: string, eligible = true) {
  return {
    quoteItemId: code === "F1" ? "4078" : "4079",
    logicalComponentId: `logical-${code}`,
    glassId: `glass-${code}`,
    paneId: `logical-${code}:glass-${code}`,
    componentCode: code,
    displayName: "QA Monolitico 5mm fix1",
    productId: "3763",
    physicalUnitCount: eligible ? 1 : null,
    quantity: 1,
    widthMm: eligible ? 600 : null,
    heightMm: eligible ? 1000 : null,
    recipeStatus: null,
    dimensionProvenance: "manual",
    snapshotFingerprint: `fingerprint-${code}`,
    technicalSpec: eligible ? {
      productId: "3763",
      thicknessMm: 5,
      category: "monolitico",
      purchaseMode: "full_sheet",
      manualCutStatus: "confirmed",
      hasConflict: false,
      sheetWidthMm: 4000,
      sheetHeightMm: 2200,
    } : null,
  };
}

function mockQuote(panes: ReturnType<typeof manualPane>[], preliminaryPaneCount: number) {
  const payload = {
    quoteCode: "COT-301026-002",
    panes,
    preliminaryPaneCount,
    previewExclusions: [],
    diagnostics: [],
    coverage: { status: preliminaryPaneCount === panes.length ? "complete" : "partial", completeReferenceCount: preliminaryPaneCount, pendingReferenceCount: panes.length - preliminaryPaneCount, pendingReferences: [], diagnostics: [] },
    workshopProfiles: {},
  };
  const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => ({
    ok: true,
    json: async () => init?.method === "POST"
      ? { quoteCode: payload.quoteCode, results: [], warnings: [], generatedFrom: panes.map((pane) => pane.snapshotFingerprint) }
      : payload,
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("GlassSheetOptimizationPage: geometría manual sin receta", () => {
  it("habilita la simulación de F1 y F2 guardados sin snapshot de fabricación", async () => {
    const fetchMock = mockQuote([manualPane("F1"), manualPane("F2")], 2);
    render(<GlassSheetOptimizationPage />);

    const preview = await screen.findByRole("button", { name: "Generar distribución" });
    await waitFor(() => expect(preview).toBeEnabled());
    expect(screen.getByText("1,2 m²")).toBeInTheDocument();
    expect(screen.queryByText(/La receta debe estar validada y guardada/)).not.toBeInTheDocument();

    fireEvent.click(preview);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/cotizaciones/1290/optimizacion-vidrios",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ mode: "geometric_preview" }) }),
    ));
  });

  it("permite vista parcial cuando la API excluye otro paño", async () => {
    mockQuote([manualPane("F1"), manualPane("F2", false)], 1);
    render(<GlassSheetOptimizationPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Generar distribución" })).toBeEnabled());
  });

  it("no habilita simulación si la API no encuentra geometría admisible", async () => {
    mockQuote([manualPane("F1", false), manualPane("F2", false)], 0);
    render(<GlassSheetOptimizationPage />);
    await waitFor(() => expect(screen.getByText(/No hay paños con geometría válida para simular/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Generar distribución" })).toBeDisabled();
  });

  it("marca todas las páginas del PDF de la ruta técnica como simulación geométrica", async () => {
    mockPdfTextByPage.splice(0, mockPdfTextByPage.length);
    const pane = (paneUnitId: string, componentCode: string) => ({
      paneUnitId,
      quoteItemId: "4078",
      paneId: `pane-${paneUnitId}`,
      productId: "3763",
      componentCode,
      rotated: false,
      rect: { xMm: 0, yMm: 0, widthMm: 600, heightMm: 1000 },
    });
    const sheet = (sheetId: string, paneUnitId: string, componentCode: string) => ({
      sheetId,
      rawSheet: { widthMm: 4000, heightMm: 2200 },
      panes: [pane(paneUnitId, componentCode)],
      remnants: [],
      cutSequence: [],
    });
    const results = [{
      status: "feasible",
      inputFingerprint: "qa-fingerprint",
      minimumSheetCountProven: false,
      summary: { paneCount: 2, sheetCount: 2, paneAreaMm2: 1_200_000, usableSheetAreaMm2: 8_800_000, rawSheetAreaMm2: 17_600_000, reusableRemnantsMm2: 0, wasteMm2: 0 },
      sheets: [sheet("sheet-1", "unit-1", "F1"), sheet("sheet-2", "unit-2", "F2")],
    }];
    const payload = {
      quoteCode: "COT-301026-002",
      panes: [manualPane("F1"), manualPane("F2")],
      preliminaryPaneCount: 2,
      previewExclusions: [{ componentCode: "F3", reason: "Faltan medidas finales." }],
      diagnostics: [],
      coverage: { status: "partial", completeReferenceCount: 2, pendingReferenceCount: 1, pendingReferences: [], diagnostics: [] },
      workshopProfiles: {},
    };
    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => init?.method === "POST"
        ? { quoteCode: payload.quoteCode, mode: "geometric_preview", results, warnings: [], generatedFrom: payload.panes.map((item) => item.snapshotFingerprint), previewExclusions: payload.previewExclusions }
        : payload,
    })) as unknown as typeof fetch;

    render(<GlassSheetOptimizationPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Generar distribución" }));
    fireEvent.click(await screen.findByRole("button", { name: "Descargar PDF preliminar" }));

    await waitFor(() => expect(mockPdfTextByPage).toHaveLength(2));
    for (const pageText of mockPdfTextByPage) {
      expect(pageText.join(" ")).toContain("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE");
      expect(pageText.join(" ")).toContain("Despuntes y separación asumidos: 0 mm");
      expect(pageText.join(" ")).toContain("sin secuencia de corte");
      expect(pageText.join(" ")).toContain("no necesariamente reutilizable");
    }
    expect(mockPdfTextByPage[0]?.join(" ")).toContain("1 referencias excluidas");
    expect(mockPdfTextByPage[0]?.join(" ")).toContain("Referencias excluidas: F3");
  });
});
