/** @jest-environment jsdom */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useDirectGlassDistribution } from "../use-direct-glass-distribution";
import * as directService from "../../services/direct-glass-distribution.service";

jest.mock("../../services/direct-glass-distribution.service", () => ({
  ...jest.requireActual("../../services/direct-glass-distribution.service"),
  fetchGlassDistributionData: jest.fn(),
  runDirectGlassDistributionDownload: jest.fn(),
}));

const mockDownload = directService.runDirectGlassDistributionDownload as jest.Mock;
const mockFetchData = directService.fetchGlassDistributionData as jest.Mock;
const loadedData = {
  quoteCode: "COT-1247",
  panes: [],
  diagnostics: [],
  coverage: { status: "complete", completeReferenceCount: 1, pendingReferenceCount: 0, pendingReferences: [], diagnostics: [] },
};

describe("useDirectGlassDistribution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchData.mockResolvedValue(loadedData);
  });

  it("inicia sin generar y sin errores", () => {
    const { result } = renderHook(() =>
      useDirectGlassDistribution({
        quoteId: "1247",
        quoteCode: "COT-1247",
        clientName: "Cliente",
        workName: "Obra",
      })
    );

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.notice).toBeNull();
    expect(result.current.formatDialogOpen).toBe(false);
  });

  it("abre diálogo de formato cuando los datos lo requieren", async () => {
    mockDownload.mockResolvedValueOnce({
      status: "needs_format",
      panes: [],
      quoteCode: "COT-1247",
    });

    const { result } = renderHook(() =>
      useDirectGlassDistribution({
        quoteId: "1247",
        quoteCode: "COT-1247",
        clientName: "Cliente",
        workName: "Obra",
      })
    );

    await waitFor(() => expect(result.current.coverage).toEqual(loadedData.coverage));

    await act(async () => {
      result.current.startDownload();
    });

    expect(result.current.formatDialogOpen).toBe(true);
    expect(result.current.isGenerating).toBe(false);
  });

  it("reporta éxito y aviso de entrega al navegador cuando la descarga concluye", async () => {
    mockDownload.mockResolvedValueOnce({
      status: "success",
      downloadStatus: "downloaded",
    });

    const { result } = renderHook(() =>
      useDirectGlassDistribution({
        quoteId: "1247",
        quoteCode: "COT-1247",
        clientName: "Cliente",
        workName: "Obra",
      })
    );

    await waitFor(() => expect(result.current.coverage).toEqual(loadedData.coverage));

    await act(async () => {
      result.current.startDownload();
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.notice).toContain("PDF preparado");
    expect(result.current.formatDialogOpen).toBe(false);
  });

  it("evita descargas concurrentes duplicadas mientras una solicitud está en vuelo", async () => {
    let resolver!: (val: directService.DirectGlassDistributionExecutionResult) => void;
    const promise = new Promise<directService.DirectGlassDistributionExecutionResult>((r) => {
      resolver = r;
    });

    mockDownload.mockReturnValue(promise);

    const { result } = renderHook(() =>
      useDirectGlassDistribution({
        quoteId: "1247",
        quoteCode: "COT-1247",
        clientName: "Cliente",
        workName: "Obra",
      })
    );

    await waitFor(() => expect(result.current.coverage).toEqual(loadedData.coverage));

    act(() => {
      result.current.startDownload();
    });

    expect(result.current.isGenerating).toBe(true);

    // Click again while in-flight
    act(() => {
      result.current.startDownload();
    });

    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolver({ status: "success", downloadStatus: "downloaded" });
    });

    expect(result.current.isGenerating).toBe(false);
  });

  it("ignora una respuesta de cobertura abortada que llega tarde tras cambiar de cotización", async () => {
    let resolveFirst!: (value: typeof loadedData) => void;
    let resolveSecond!: (value: typeof loadedData) => void;
    const first = new Promise<typeof loadedData>((resolve) => { resolveFirst = resolve; });
    const second = new Promise<typeof loadedData>((resolve) => { resolveSecond = resolve; });
    mockFetchData.mockReturnValueOnce(first).mockReturnValueOnce(second);

    const { result, rerender } = renderHook(
      ({ quoteId }: { quoteId: string }) => useDirectGlassDistribution({ quoteId, quoteCode: quoteId, clientName: "Cliente", workName: "Obra" }),
      { initialProps: { quoteId: "1247" } }
    );
    rerender({ quoteId: "1248" });

    const latestCoverage = { ...loadedData.coverage, diagnostics: ["cotización 1248"] };
    await act(async () => { resolveSecond({ ...loadedData, coverage: latestCoverage }); });
    await waitFor(() => expect(result.current.coverage).toEqual(latestCoverage));
    await act(async () => { resolveFirst({ ...loadedData, coverage: { ...loadedData.coverage, diagnostics: ["cotización 1247"] } }); });

    expect(result.current.coverage).toEqual(latestCoverage);
  });
});
