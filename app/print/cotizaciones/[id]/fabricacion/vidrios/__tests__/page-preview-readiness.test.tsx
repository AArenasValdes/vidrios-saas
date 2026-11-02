/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GlassSheetOptimizationPage from "../page";

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

    const preview = screen.getByRole("button", { name: "Generar distribución" });
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
});
