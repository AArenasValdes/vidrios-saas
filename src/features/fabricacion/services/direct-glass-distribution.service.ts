import type { GlassCuttingResult } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { createGlassDistributionPdf, type GlassDistributionPdfSource } from "./glass-distribution-pdf.service";
import { downloadPdfBlob } from "@/utils/cotizacion-pdf";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";
import { loadVentoraPdfLogoDataUrl } from "./ventora-pdf-assets.client";
import type { GlassDistributionCoverage } from "./glass-distribution-coverage.service";
import { isGlassPaneGeometryComplete } from "./glass-distribution-coverage.service";

export type GlassDistributionPane = {
  quoteItemId: string;
  paneId?: string;
  paneUnitIds?: string[];
  commercialQuantity?: number | null;
  logicalComponentId: string | null;
  glassId: string | null;
  productId: string | null;
  componentCode: string;
  componentName?: string | null;
  displayName: string | null;
  technicalSpec: GlassTechnicalSpec | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  physicalUnitCount: number | null;
  dimensionProvenance: string;
  recipeStatus: string | null;
  validationStatus?: "eligible_for_manual_planning" | "requires_review";
  warnings: string[];
  snapshotFingerprint: string;
};

export type DirectGlassDistributionLoadResult = {
  quoteCode: string;
  panes: GlassDistributionPane[];
  diagnostics: string[];
  coverage: GlassDistributionCoverage;
  preliminaryPaneCount?: number;
  previewExclusions?: GlassDistributionPdfSource["previewExclusions"];
  workshopProfiles?: Record<string, unknown>;
};

export type DirectGlassDistributionExecutionResult =
  | { status: "success"; downloadStatus: "downloaded" | "opened" | "opened_fallback" | "opened_blob" | "shared" }
  | { status: "needs_format"; panes: GlassDistributionPane[]; quoteCode: string }
  | { status: "blocked"; reason: string; diagnostics?: string[] }
  | { status: "error"; message: string };

export function mapGlassDistributionPdfPanes(panes: GlassDistributionPane[]): GlassDistributionPdfSource["panes"] {
  return panes.map((pane) => ({
    quoteItemId: pane.quoteItemId,
    paneId: pane.paneId,
    componentCode: pane.componentCode,
    componentName: pane.componentName ?? null,
    productId: pane.productId,
    displayName: pane.displayName,
    thicknessMm: pane.technicalSpec?.thicknessMm ?? null,
    category: pane.technicalSpec?.category ?? null,
    pieceOrientation: pane.technicalSpec?.pieceOrientation ?? "unknown",
    widthMm: pane.widthMm,
    heightMm: pane.heightMm,
    quantity: pane.quantity,
    physicalUnitCount: pane.physicalUnitCount,
    dimensionProvenance: pane.dimensionProvenance,
  }));
}

/** Shared geometry contract: a geometric simulation never implies workshop validation. */
export function isPaneEligibleForDistribution(pane: GlassDistributionPane): boolean {
  return isGlassPaneGeometryComplete(pane);
}

export function paneHasSheetFormat(spec: GlassTechnicalSpec | null): boolean {
  return Boolean(
    spec &&
      Number.isSafeInteger(spec.sheetWidthMm) &&
      Number(spec.sheetWidthMm) > 0 &&
      Number.isSafeInteger(spec.sheetHeightMm) &&
      Number(spec.sheetHeightMm) > 0
  );
}

export async function fetchGlassDistributionData(
  quoteId: string,
  signal?: AbortSignal
): Promise<DirectGlassDistributionLoadResult> {
  const res = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/optimizacion-vidrios`, {
    cache: "no-store",
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as DirectGlassDistributionLoadResult & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || "No pudimos cargar los paños técnicos de esta cotización.");
  }
  return data;
}

export async function runDirectGlassDistributionDownload(input: {
  quoteId: string;
  quoteCode: string;
  clientName: string;
  workName: string;
  sheetFormat?: { widthMm: number; heightMm: number } | null;
  loadedData?: DirectGlassDistributionLoadResult | null;
  signal?: AbortSignal;
}): Promise<DirectGlassDistributionExecutionResult> {
  const { quoteId, clientName, workName } = input;

  const data = input.loadedData ?? (await fetchGlassDistributionData(quoteId, input.signal));
  const panes = data.panes ?? [];
  const currentQuoteCode = data.quoteCode || input.quoteCode;

  if (panes.length === 0) {
    return { status: "blocked", reason: data.diagnostics?.[0] || "No hay paños de vidrio registrados para distribuir.", diagnostics: data.diagnostics };
  }

  // GET marks physicalUnitCount only for panes admitted by the geometric contract.
  // Recheck with the shared validator to avoid a second, inconsistent eligibility policy.
  const eligiblePanes = panes.filter((pane) => pane.physicalUnitCount != null && pane.physicalUnitCount > 0 && isPaneEligibleForDistribution(pane));
  if (eligiblePanes.length === 0) {
    const diagnostics = data.previewExclusions?.map((entry) => `${entry.componentCode}: ${entry.reason}`) ?? data.diagnostics ?? [];
    return { status: "blocked", reason: diagnostics.join(" ") || "No hay paños con geometría válida para simular.", diagnostics };
  }

  const formatMissing = eligiblePanes.some((p) => !paneHasSheetFormat(p.technicalSpec));
  const hasCustomFormat =
    input.sheetFormat &&
    Number.isSafeInteger(input.sheetFormat.widthMm) &&
    input.sheetFormat.widthMm > 0 &&
    Number.isSafeInteger(input.sheetFormat.heightMm) &&
    input.sheetFormat.heightMm > 0;

  if (formatMissing && !hasCustomFormat) {
      return { status: "needs_format", panes: eligiblePanes, quoteCode: currentQuoteCode };
  }

  const requestBody: { mode: "geometric_preview"; sheetWidthMm?: number; sheetHeightMm?: number } = {
    mode: "geometric_preview",
  };
  if (hasCustomFormat) {
    requestBody.sheetWidthMm = input.sheetFormat!.widthMm;
    requestBody.sheetHeightMm = input.sheetFormat!.heightMm;
  }

  const calcRes = await fetch(
    `/api/cotizaciones/${encodeURIComponent(quoteId)}/optimizacion-vidrios`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: input.signal,
    }
  );

  const calcBody = (await calcRes.json().catch(() => ({}))) as {
    quoteCode?: string;
    results?: GlassCuttingResult[];
    warnings?: string[];
    error?: string;
    diagnostics?: string[];
    coverage?: GlassDistributionCoverage;
    mode?: string;
    previewExclusions?: GlassDistributionPdfSource["previewExclusions"];
    generatedFrom?: string[];
    preliminaryPaneCount?: number;
  };

  if (!calcRes.ok) {
    const errorMsg = [calcBody.error, ...(calcBody.diagnostics ?? [])].filter(Boolean).join(" ");
    return { status: "error", message: errorMsg || "No pudimos calcular la distribución geométrica." };
  }

  if (calcBody.mode !== "geometric_preview" || !calcBody.coverage) {
    return { status: "error", message: "El servidor no devolvió una simulación geométrica. No se descargó ningún PDF." };
  }
  const sourceFingerprints = panes.map((pane) => pane.snapshotFingerprint).sort();
  const returnedFingerprints = [...(calcBody.generatedFrom ?? [])].sort();
  if (JSON.stringify(sourceFingerprints) !== JSON.stringify(returnedFingerprints)
    || calcBody.preliminaryPaneCount !== eligiblePanes.length) {
    return { status: "blocked", reason: "Las medidas o referencias cambiaron durante la descarga. Actualiza la distribución y vuelve a intentarlo." };
  }

  const results = calcBody.results ?? [];
  if (
    results.length === 0 ||
    results.some((r) => r.status !== "feasible" || !r.verification?.passed || r.sheets.length === 0)
  ) {
    const unverifiedError =
      results.flatMap((r) => r.errors).filter(Boolean)[0] ||
      calcBody.warnings?.[0] ||
      "No se encontró una distribución geométrica verificable para estos paños.";
    return { status: "error", message: unverifiedError };
  }

  const logoDataUrl = await loadVentoraPdfLogoDataUrl();
  if (!logoDataUrl) return { status: "error", message: "No se pudo cargar el logotipo corporativo. Recarga la página e inténtalo otra vez." };
  const pdf = await createGlassDistributionPdf({
    mode: "simulation",
    quoteCode: calcBody.quoteCode || currentQuoteCode,
    clientName,
    workName,
    logoDataUrl,
    coverage: calcBody.coverage,
    simulationWarnings: calcBody.warnings ?? [],
    previewExclusions: calcBody.previewExclusions ?? [],
    panes: mapGlassDistributionPdfPanes(eligiblePanes),
    results,
  });

  const blob = pdf.output("blob");
  const fileName = `simulacion-preliminar-vidrios-${sanitizeFileNamePart(
    calcBody.quoteCode || currentQuoteCode || "cotizacion",
    32
  )}.pdf`;

  const downloadStatus = await downloadPdfBlob(blob, fileName);
  if (downloadStatus === "failed") {
    return { status: "error", message: "No pudimos descargar el PDF. Intenta nuevamente." };
  }

  return { status: "success", downloadStatus };
}
