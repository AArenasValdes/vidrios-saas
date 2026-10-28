import type { GlassCuttingResult } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { createGlassDistributionPdf, type GlassDistributionPdfSource } from "./glass-distribution-pdf.service";
import { downloadPdfBlob } from "@/utils/cotizacion-pdf";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";
import { loadVentoraPdfLogoDataUrl } from "./ventora-pdf-assets.client";
import type { GlassDistributionCoverage } from "./glass-distribution-coverage.service";

export type GlassDistributionPane = {
  quoteItemId: string;
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
  recipeStatus: string;
  validationStatus?: "eligible_for_manual_planning" | "requires_review";
  warnings: string[];
  snapshotFingerprint: string;
};

export type DirectGlassDistributionLoadResult = {
  quoteCode: string;
  panes: GlassDistributionPane[];
  diagnostics: string[];
  coverage: GlassDistributionCoverage;
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
  }));
}

export function isPaneEligibleForDistribution(pane: GlassDistributionPane): pane is GlassDistributionPane & { physicalUnitCount: number } {
  const spec = pane.technicalSpec;
  return Boolean(
    pane.logicalComponentId &&
      pane.glassId &&
      pane.productId &&
      spec &&
      !spec.hasConflict &&
      Number.isFinite(spec.thicknessMm) &&
      Number(spec.thicknessMm) > 0 &&
      spec.category !== "pendiente" &&
      Number.isSafeInteger(pane.widthMm) &&
      Number(pane.widthMm) > 0 &&
      Number.isSafeInteger(pane.heightMm) &&
      Number(pane.heightMm) > 0 &&
      Number.isSafeInteger(pane.quantity) &&
      pane.quantity > 0 &&
      pane.quantity === pane.physicalUnitCount &&
      pane.validationStatus === "eligible_for_manual_planning" &&
      (pane.recipeStatus === "validated" || pane.dimensionProvenance === "manual") &&
      pane.dimensionProvenance !== "legacy_snapshot"
  );
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

  if (data.coverage.status !== "complete") {
    const reason = data.coverage.diagnostics.join(" ") || "La cotización no tiene cobertura técnica completa de vidrio.";
    return { status: "blocked", reason: `No se puede generar un PDF completo para el proveedor. ${reason}`, diagnostics: data.coverage.diagnostics };
  }

  if (panes.length === 0) {
    const reason =
      data.diagnostics?.[0] ||
      "Esta cotización no tiene paños técnicos congelados. Revisa la receta y guarda la cubicación antes de generar la distribución.";
    return { status: "blocked", reason, diagnostics: data.diagnostics };
  }

  const blocked = panes.filter((p) => !isPaneEligibleForDistribution(p));
  if (blocked.length > 0) {
    const uniqueWarnings = Array.from(
      new Set(
        blocked.flatMap((p) =>
          p.warnings.length
            ? p.warnings
            : [`El componente ${p.componentCode} requiere receta validada o medidas completas.`]
        )
      )
    );
    const reason =
      uniqueWarnings.join(". ") ||
      "Algunos paños técnicos requieren receta validada o medidas completas antes de calcular el corte.";
    return { status: "blocked", reason, diagnostics: uniqueWarnings };
  }
  const eligiblePanes = panes.filter(isPaneEligibleForDistribution);

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

  const requestBody: { mode: "provider_pdf"; sheetWidthMm?: number; sheetHeightMm?: number } = {
    mode: "provider_pdf",
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
  };

  if (!calcRes.ok) {
    const errorMsg = [calcBody.error, ...(calcBody.diagnostics ?? [])].filter(Boolean).join(" ");
    return { status: "error", message: errorMsg || "No pudimos calcular la distribución geométrica." };
  }

  if (!calcBody.coverage || calcBody.coverage.status !== "complete") {
    return { status: "blocked", reason: "No se puede generar un PDF completo para el proveedor: la cobertura técnica cambió o está incompleta.", diagnostics: calcBody.coverage?.diagnostics };
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
    quoteCode: calcBody.quoteCode || currentQuoteCode,
    clientName,
    workName,
    logoDataUrl,
    coverage: calcBody.coverage,
    panes: mapGlassDistributionPdfPanes(eligiblePanes),
    results,
  });

  const blob = pdf.output("blob");
  const fileName = `distribucion-vidrios-${sanitizeFileNamePart(
    calcBody.quoteCode || currentQuoteCode || "cotizacion",
    32
  )}.pdf`;

  const downloadStatus = await downloadPdfBlob(blob, fileName);
  if (downloadStatus === "failed") {
    return { status: "error", message: "No pudimos descargar el PDF. Intenta nuevamente." };
  }

  return { status: "success", downloadStatus };
}
