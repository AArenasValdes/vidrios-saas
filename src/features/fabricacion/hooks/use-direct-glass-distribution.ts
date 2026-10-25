"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGlassDistributionData,
  runDirectGlassDistributionDownload,
  type DirectGlassDistributionLoadResult,
} from "../services/direct-glass-distribution.service";
import type { GlassDistributionCoverage } from "../services/glass-distribution-coverage.service";

export type UseDirectGlassDistributionOptions = {
  quoteId: string;
  quoteCode: string;
  clientName: string;
  workName: string;
  onStatusChange?: (status: string | null) => void;
  onErrorChange?: (error: string | null) => void;
};

export function useDirectGlassDistribution({
  quoteId,
  quoteCode,
  clientName,
  workName,
  onStatusChange,
  onErrorChange,
}: UseDirectGlassDistributionOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [coverageState, setCoverageState] = useState<{ quoteId: string; coverage: GlassDistributionCoverage } | null>(null);

  const inFlightRef = useRef(false);
  const isCoverageLoading = coverageState?.quoteId !== quoteId;
  const coverage = coverageState?.quoteId === quoteId ? coverageState.coverage : null;

  useEffect(() => {
    if (!quoteId) return;
    const controller = new AbortController();
    void fetchGlassDistributionData(quoteId, controller.signal)
      .then((data) => setCoverageState({ quoteId, coverage: data.coverage }))
      .catch(() => {
        if (!controller.signal.aborted) setCoverageState({
          quoteId,
          coverage: {
            status: "unavailable",
            completeReferenceCount: 0,
            pendingReferenceCount: 0,
            pendingReferences: [],
            diagnostics: ["No se pudo comprobar la cobertura técnica de vidrio."],
          },
        });
      });
    return () => controller.abort();
  }, [quoteId]);

  const updateError = useCallback(
    (msg: string | null) => {
      setError(msg);
      onErrorChange?.(msg);
    },
    [onErrorChange]
  );

  const updateNotice = useCallback(
    (msg: string | null) => {
      setNotice(msg);
      onStatusChange?.(msg);
    },
    [onStatusChange]
  );

  const execute = useCallback(
    async (customFormat?: { widthMm: number; heightMm: number } | null) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsGenerating(true);
      updateError(null);
      updateNotice(null);

      try {
        const loadedData: DirectGlassDistributionLoadResult = await fetchGlassDistributionData(quoteId);
        setCoverageState({ quoteId, coverage: loadedData.coverage });
        const result = await runDirectGlassDistributionDownload({
          quoteId,
          quoteCode,
          clientName,
          workName,
          sheetFormat: customFormat,
          loadedData,
        });

        if (result.status === "needs_format") {
          setFormatDialogOpen(true);
          return;
        }

        if (result.status === "blocked") {
          updateError(result.reason);
          return;
        }

        if (result.status === "error") {
          updateError(result.message);
          return;
        }

        if (result.status === "success") {
          setFormatDialogOpen(false);
          const feedback =
            result.downloadStatus === "downloaded"
              ? "PDF preparado. Revisa las descargas de tu navegador o dispositivo."
              : result.downloadStatus === "shared"
                ? "PDF compartido con éxito."
                : "PDF abierto. Guárdalo desde el visor del dispositivo.";
          updateNotice(feedback);
        }
      } catch (cause) {
        const msg =
          cause instanceof Error
            ? cause.message
            : "No pudimos generar la distribución de vidrio.";
        updateError(msg);
      } finally {
        setIsGenerating(false);
        inFlightRef.current = false;
      }
    },
    [quoteId, quoteCode, clientName, workName, updateError, updateNotice]
  );

  const startDownload = useCallback(() => {
    void execute(null);
  }, [execute]);

  const confirmFormat = useCallback(
    (format: { widthMm: number; heightMm: number }) => {
      void execute(format);
    },
    [execute]
  );

  const cancelFormat = useCallback(() => {
    setFormatDialogOpen(false);
  }, []);

  return {
    isGenerating,
    error,
    notice,
    formatDialogOpen,
    coverage,
    isCoverageLoading,
    setFormatDialogOpen,
    startDownload,
    confirmFormat,
    cancelFormat,
    clearError: () => updateError(null),
    clearNotice: () => updateNotice(null),
  };
}
