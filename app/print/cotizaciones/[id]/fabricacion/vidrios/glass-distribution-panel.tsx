"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuDownload, LuEye, LuLayers3, LuLoaderCircle, LuShare2 } from "react-icons/lu";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { GlassCuttingResult } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { downloadPdfBlob } from "@/utils/cotizacion-pdf";
import { sanitizeFileNamePart } from "@/utils/sanitize-file-name";
import { createGlassDistributionPdf } from "@/features/fabricacion/services/glass-distribution-pdf.service";
import { mapGlassDistributionPdfPanes } from "@/features/fabricacion/services/direct-glass-distribution.service";
import { loadVentoraPdfLogoDataUrl } from "@/features/fabricacion/services/ventora-pdf-assets.client";
import { formatGlassDisplayName } from "@/features/fabricacion/services/glass-display-name.service";
import { isGlassCoveragePaneComplete, type GlassDistributionCoverage } from "@/features/fabricacion/services/glass-distribution-coverage.service";

import s from "./glass-distribution-panel.module.css";
import { GlassDistributionCoverageNotice } from "./glass-distribution-coverage-notice";

type PaneInput = {
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
  warnings: string[];
  snapshotFingerprint: string;
};

type PlanResponse = {
  quoteCode: string;
  panes: PaneInput[];
  diagnostics: string[];
  coverage: GlassDistributionCoverage;
};

type CalculationResponse = {
  quoteCode: string;
  mode: "geometric_preview" | "provider_pdf";
  coverage: GlassDistributionCoverage;
  warnings: string[];
  results: GlassCuttingResult[];
  generatedFrom: string[];
};

type Props = {
  quoteId: string;
  quoteCode: string;
  clientName: string;
  workName: string;
  enabled: boolean;
  autoPreview?: boolean;
  preloadPreview?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  monolitico: "Monolítico",
  laminado: "Laminado",
  dvh: "DVH",
  templado: "Templado",
  espejo: "Espejo",
  otro: "Otro",
  pendiente: "Tipo pendiente",
};
const EMPTY_PANES: PaneInput[] = [];

function validDimension(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isPreviewReadyPane(pane: PaneInput): pane is PaneInput & { physicalUnitCount: number } {
  return pane.physicalUnitCount != null && isGlassCoveragePaneComplete(pane);
}

function hasSheetFormat(spec: GlassTechnicalSpec | null) {
  return Boolean(spec && validDimension(spec.sheetWidthMm) && validDimension(spec.sheetHeightMm));
}

function shortCode(code: string, index: number) {
  return code && code.length < 26 && !/^[0-9a-f-]{28,}$/i.test(code) ? code : `Componente ${index + 1}`;
}

function formatArea(areaMm2: number) {
  return `${(areaMm2 / 1_000_000).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
}

function remnantDimensions(result: GlassCuttingResult | null) {
  return result?.sheets[0]?.remnants.map((remnant) => `${remnant.rect.widthMm} × ${remnant.rect.heightMm} mm`) ?? [];
}

function sameSnapshotSet(left: readonly string[], right: readonly string[]) {
  const a = [...left].sort();
  const b = [...right].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function PlanDrawing({ result, allPlans }: { result: GlassCuttingResult; allPlans: Array<{ result: GlassCuttingResult; sheet: GlassCuttingResult["sheets"][number] }> }) {
  const sheet = result.sheets[0];
  if (!sheet) return null;
  const { widthMm, heightMm } = { widthMm: sheet.rawSheet.widthMm, heightMm: sheet.rawSheet.heightMm };
  const ordinals = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const entry of allPlans) for (const pane of entry.sheet.panes) {
    const key = `${pane.quoteItemId}|${pane.logicalComponentId}`;
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    ordinals.set(pane.paneUnitId, next);
  }
  return (
    <svg className={s.planDrawing} viewBox={`0 0 ${widthMm} ${heightMm}`} role="img" aria-label={`Distribución en plancha de ${widthMm} por ${heightMm} milímetros`}>
      <rect x="0" y="0" width={widthMm} height={heightMm} className={s.sheet} />
      {sheet.remnants.map((remnant) => {
        const { xMm, yMm, widthMm, heightMm } = remnant.rect;
        return <g key={remnant.remnantId}>
          <rect x={xMm} y={yMm} width={widthMm} height={heightMm} className={s.remnant} />
          {widthMm > 360 && heightMm > 220 ? <text x={xMm + widthMm / 2} y={yMm + heightMm / 2} textAnchor="middle" className={s.remnantLabel}>{widthMm} × {heightMm} mm</text> : null}
        </g>;
      })}
      {sheet.panes.map((pane, index) => {
        const labelSize = Math.max(38, Math.min(widthMm, heightMm) / 36);
        const title = `${shortCode(pane.componentCode, index)} · paño ${ordinals.get(pane.paneUnitId) ?? index + 1}`;
        const dimensionSize = Math.min(Math.max(64, labelSize * 1.35), pane.rect.widthMm / 12);
        return (
          <g key={pane.paneUnitId}>
            <rect x={pane.rect.xMm} y={pane.rect.yMm} width={pane.rect.widthMm} height={pane.rect.heightMm} className={s.pane} />
            {pane.rect.widthMm > labelSize * 3 && pane.rect.heightMm > labelSize * 2.2 ? <g className={s.paneLabel}>
              <text x={pane.rect.xMm + pane.rect.widthMm / 2} y={pane.rect.yMm + pane.rect.heightMm / 2 - labelSize * 0.2} textAnchor="middle" fontSize={labelSize}>{title}</text>
              <text x={pane.rect.xMm + pane.rect.widthMm / 2} y={pane.rect.yMm + pane.rect.heightMm / 2 + labelSize * 0.9} textAnchor="middle" fontSize={dimensionSize} fontWeight={650}>{pane.rect.widthMm} × {pane.rect.heightMm} mm</text>
            </g> : null}
          </g>
        );
      })}
    </svg>
  );
}

export function GlassDistributionPanel({ quoteId, quoteCode, clientName, workName, enabled, autoPreview = false, preloadPreview = false }: Props) {
  const [source, setSource] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GlassCuttingResult[] | null>(null);
  const [generatedFrom, setGeneratedFrom] = useState<string[] | null>(null);
  const [sheetWidth, setSheetWidth] = useState("");
  const [sheetHeight, setSheetHeight] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const autoPreviewFingerprint = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/optimizacion-vidrios`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as PlanResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "No pudimos cargar los paños guardados.");
        setSource(body);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "No pudimos cargar los paños guardados.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, quoteId]);

  const panes = source?.panes ?? EMPTY_PANES;
  const completePanes = useMemo(() => panes.filter(isPreviewReadyPane), [panes]);
  const formatMissing = completePanes.some((pane) => !hasSheetFormat(pane.technicalSpec));
  const formatInputValid = validDimension(Number(sheetWidth)) && validDimension(Number(sheetHeight));
  const canCalculate = completePanes.length > 0 && (!formatMissing || formatInputValid);
  const allSheets = useMemo(() => results?.flatMap((result) => result.sheets.map((sheet) => ({ result, sheet }))) ?? [], [results]);
  const selected = allSheets[selectedSheetIndex] ?? null;
  const currentQuoteCode = source?.quoteCode || quoteCode;

  const downloadResult = useCallback(async (resultSet: GlassCuttingResult[], warnings: string[], generated: string[], coverage: GlassDistributionCoverage) => {
    if (coverage.status !== "complete" || coverage.pendingReferenceCount > 0) {
      throw new Error("No se puede generar el PDF para el proveedor: la cobertura de vidrio está incompleta.");
    }
    if (!resultSet.length || resultSet.some((result) => !result.verification.passed || result.status !== "feasible" || !result.sheets.length)) {
      throw new Error(warnings[0] || "La distribución no superó la verificación geométrica.");
    }
    const logoDataUrl = await loadVentoraPdfLogoDataUrl();
    if (!logoDataUrl) throw new Error("No se pudo cargar el logotipo corporativo. Recarga la página e inténtalo otra vez.");
    const pdf = await createGlassDistributionPdf({
      quoteCode: currentQuoteCode,
      clientName,
      workName,
      logoDataUrl,
      coverage,
      panes: mapGlassDistributionPdfPanes(completePanes),
      results: resultSet,
    });
    const blob = pdf.output("blob");
    const downloadStatus = await downloadPdfBlob(blob, `distribucion-vidrios-${sanitizeFileNamePart(currentQuoteCode || "cotizacion", 32)}.pdf`);
    if (downloadStatus === "failed") throw new Error("No pudimos descargar el PDF. Intenta nuevamente.");
    setGeneratedFrom(generated);
    setDownloadNotice(downloadStatus === "downloaded"
      ? "PDF preparado. Revisa las descargas de tu navegador o dispositivo."
      : "PDF abierto. Guárdalo desde el visor del dispositivo.");
  }, [currentQuoteCode, clientName, workName, completePanes]);

  const calculate = useCallback(async (downloadAfter: boolean, openDialog = false) => {
    if (!canCalculate) return;
    setBusy(true);
    setError(null);
    setDownloadNotice(null);
    setResults(null);
    setPreviewOpen(false);
    try {
      const requestBody: { mode: "geometric_preview" | "provider_pdf"; sheetWidthMm?: number; sheetHeightMm?: number } = { mode: downloadAfter ? "provider_pdf" : "geometric_preview" };
      if (formatMissing) {
        requestBody.sheetWidthMm = Number(sheetWidth);
        requestBody.sheetHeightMm = Number(sheetHeight);
      }
      const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/optimizacion-vidrios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const body = await response.json() as CalculationResponse & { error?: string; diagnostics?: string[] };
      if (!response.ok) throw new Error([body.error, ...(body.diagnostics ?? [])].filter(Boolean).join(" ") || "No pudimos calcular la distribución.");
      if (!body.coverage || (downloadAfter && body.coverage.status !== "complete")) {
        throw new Error(body.coverage?.diagnostics.join(" ") || "No se puede generar el PDF: la cobertura de vidrio no está completa.");
      }
      const displayedSnapshots = panes.map((pane) => pane.snapshotFingerprint);
      if (!sameSnapshotSet(displayedSnapshots, body.generatedFrom ?? [])) {
        const latestResponse = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/optimizacion-vidrios`, { cache: "no-store" });
        const latest = await latestResponse.json() as PlanResponse;
        if (latestResponse.ok) setSource(latest);
        throw new Error("Los paños guardados cambiaron desde que se abrió esta pestaña. Revisa las medidas actualizadas y genera otra vez.");
      }
      if (!body.results?.length || body.results.some((result) => result.status !== "feasible" || !result.verification.passed || result.sheets.length === 0)) {
        throw new Error(body.results?.flatMap((result) => result.errors).filter(Boolean)[0] || "No se encontró una distribución geométrica verificable.");
      }
      setSource((current) => current ? { ...current, quoteCode: body.quoteCode || current.quoteCode } : current);
      setResults(body.results);
      setGeneratedFrom(body.generatedFrom ?? []);
      setSelectedSheetIndex(0);
      if (downloadAfter) await downloadResult(body.results, body.warnings ?? [], body.generatedFrom ?? [], body.coverage);
      else setPreviewOpen(openDialog);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos calcular la distribución.");
    } finally {
      setBusy(false);
    }
  }, [canCalculate, formatMissing, sheetWidth, sheetHeight, quoteId, panes, downloadResult]);

  useEffect(() => {
    if (!enabled || (!autoPreview && !preloadPreview) || loading || !source || !canCalculate || formatMissing) return;
    const fingerprint = panes.map((pane) => pane.snapshotFingerprint).join("|");
    if (autoPreviewFingerprint.current === fingerprint) return;
    autoPreviewFingerprint.current = fingerprint;
    void calculate(false);
  }, [enabled, autoPreview, preloadPreview, loading, source, canCalculate, formatMissing, panes, calculate]);

  async function exportPreviewResult(action: "download" | "share") {
    if (!results || !generatedFrom) return;
    setBusy(true);
    setError(null);
    setDownloadNotice(null);
    try {
      const response = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/optimizacion-vidrios`, { cache: "no-store" });
      const body = await response.json() as PlanResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos confirmar los paños actuales.");
      if (body.coverage.status !== "complete") {
        setSource(body);
        throw new Error("La cobertura de vidrio está incompleta. La vista previa no representa toda la cotización y no se puede descargar como pedido completo.");
      }
      const current = body.panes.map((pane) => pane.snapshotFingerprint);
      if (!sameSnapshotSet(current, generatedFrom)) {
        setResults(null);
        setPreviewOpen(false);
        setSource(body);
        throw new Error("La cotización cambió desde el cálculo. Genera nuevamente la distribución antes de descargar.");
      }
      const requestBody: { mode: "provider_pdf"; sheetWidthMm?: number; sheetHeightMm?: number } = { mode: "provider_pdf" };
      if (formatMissing) {
        requestBody.sheetWidthMm = Number(sheetWidth);
        requestBody.sheetHeightMm = Number(sheetHeight);
      }
      const calculationResponse = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/optimizacion-vidrios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const calculation = await calculationResponse.json() as CalculationResponse & { error?: string; diagnostics?: string[] };
      if (!calculationResponse.ok) throw new Error([calculation.error, ...(calculation.diagnostics ?? [])].filter(Boolean).join(" ") || "No se pudo validar la cobertura antes de generar el PDF.");
      if (calculation.coverage.status !== "complete" || !sameSnapshotSet(current, calculation.generatedFrom ?? [])) {
        setResults(null);
        setPreviewOpen(false);
        setSource(body);
        throw new Error("La cobertura o los paños cambiaron. Revisa la cotización y vuelve a calcular la distribución.");
      }
      if (!calculation.results?.length || calculation.results.some((result) => result.status !== "feasible" || !result.verification.passed || result.sheets.length === 0)) {
        throw new Error(calculation.results?.flatMap((result) => result.errors).filter(Boolean)[0] || "No se encontró una distribución geométrica verificable.");
      }
      const currentCompletePanes = body.panes.filter(isPreviewReadyPane);
      if (action === "download") {
        await downloadResult(calculation.results, calculation.warnings ?? [], calculation.generatedFrom ?? [], calculation.coverage);
        return;
      }
      const logoDataUrl = await loadVentoraPdfLogoDataUrl();
      if (!logoDataUrl) throw new Error("No se pudo cargar el logotipo corporativo. Recarga la página e inténtalo otra vez.");
      const pdf = await createGlassDistributionPdf({
        quoteCode: currentQuoteCode,
        clientName,
        workName,
        logoDataUrl,
        coverage: calculation.coverage,
        panes: mapGlassDistributionPdfPanes(currentCompletePanes),
        results: calculation.results,
      });
      const blob = pdf.output("blob");
      const fileName = `distribucion-vidrios-${sanitizeFileNamePart(currentQuoteCode || "cotizacion", 32)}.pdf`;
      if (typeof File !== "undefined" && typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "Distribución de vidrio", text: "Distribución preliminar para revisión con el proveedor." });
            setDownloadNotice("PDF compartido desde el menú del dispositivo.");
            return;
          } catch (cause) {
            if (cause instanceof DOMException && cause.name === "AbortError") return;
            const fallbackStatus = await downloadPdfBlob(blob, fileName);
            if (fallbackStatus === "failed") throw cause;
            setDownloadNotice("No se pudo abrir el menú para compartir. El PDF quedó disponible para descargar.");
            return;
          }
        }
      }
      const downloadStatus = await downloadPdfBlob(blob, fileName);
      if (downloadStatus === "failed") throw new Error("No pudimos descargar el PDF. Intenta nuevamente.");
      setDownloadNotice("Este dispositivo no permite compartir archivos. El PDF quedó disponible para descargar.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos generar el PDF.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  const sheetCount = allSheets.length;

  return (
    <section className={s.panel} aria-labelledby="glass-distribution-title" id="glass-distribution">
      <header className={s.heading}>
        <span className={s.icon}><LuLayers3 aria-hidden /></span>
        <div><h2 id="glass-distribution-title">Distribución de planchas</h2><p>Usa solo las medidas de paño guardadas en la cubicación técnica.</p></div>
      </header>

      {loading ? <p className={s.status}><LuLoaderCircle className={s.spinner} aria-hidden />Cargando vidrio y paños…</p> : null}
      {!loading && source ? <GlassDistributionCoverageNotice quoteId={quoteId} coverage={source.coverage} /> : null}
      {!loading && source && panes.length === 0 ? <p className={s.empty}>{source.diagnostics[0] || "Esta cotización todavía no tiene paños técnicos guardados."}</p> : null}

      {panes.length > 0 ? <>
        <div className={s.glassGroups}>
          {Array.from(new Map(panes.map((pane) => {
            const key = [pane.productId, pane.technicalSpec?.category, pane.technicalSpec?.thicknessMm, pane.technicalSpec?.sheetWidthMm, pane.technicalSpec?.sheetHeightMm].join("|");
            const group = panes.filter((candidate) => [candidate.productId, candidate.technicalSpec?.category, candidate.technicalSpec?.thicknessMm, candidate.technicalSpec?.sheetWidthMm, candidate.technicalSpec?.sheetHeightMm].join("|") === key);
            return [key, { key, pane, group }];
          })).values()).map(({ key, pane, group }) => {
            const spec = pane.technicalSpec;
            const quantity = group.reduce((sum, entry) => sum + (entry.physicalUnitCount ?? 0), 0);
            const width = spec?.sheetWidthMm;
            const height = spec?.sheetHeightMm;
            return <div className={s.glassGroup} key={key}>
              <div className={s.glassHeading}><strong>{formatGlassDisplayName(pane.displayName, spec?.thicknessMm)}</strong><span>{spec?.category ? CATEGORY_LABELS[spec.category] ?? spec.category : "Tipo pendiente"} · {spec?.thicknessMm ? `${spec.thicknessMm} mm` : "espesor pendiente"}</span></div>
              <div className={s.glassMeta}><span>{group.length} {group.length === 1 ? "referencia de paño" : "referencias de paño"} · {quantity} {quantity === 1 ? "unidad con medidas verificadas" : "unidades con medidas verificadas"}</span><span>{width && height ? `Plancha ${width} × ${height} mm` : "Formato habitual pendiente"}</span></div>
              <ul className={s.paneList}>{group.map((entry, index) => <li key={`${entry.quoteItemId}-${index}`}><span>{shortCode(entry.componentCode, index)}{entry.componentName ? ` · ${entry.componentName}` : ""} · {entry.physicalUnitCount == null ? "cantidad pendiente" : `${entry.physicalUnitCount} ${entry.physicalUnitCount === 1 ? "unidad física" : "unidades físicas"}`}</span><strong>{entry.widthMm && entry.heightMm ? `${entry.widthMm} × ${entry.heightMm} mm` : "Medidas pendientes"}</strong></li>)}</ul>
            </div>;
          })}
        </div>

        {formatMissing ? <div className={s.formatFields}>
          <p>Falta el formato de plancha. Indica ancho y alto para esta distribución.</p>
          <label>Ancho de plancha (mm)<input inputMode="numeric" type="number" min="1" step="1" value={sheetWidth} onChange={(event) => setSheetWidth(event.target.value)} /></label>
          <label>Alto de plancha (mm)<input inputMode="numeric" type="number" min="1" step="1" value={sheetHeight} onChange={(event) => setSheetHeight(event.target.value)} /></label>
        </div> : null}

        <div className={s.actions}>
          <button type="button" className={s.primaryAction} disabled={!canCalculate || busy || source?.coverage.status !== "complete"} onClick={() => results ? void exportPreviewResult("download") : void calculate(true)}>
            {busy ? <LuLoaderCircle className={s.spinner} aria-hidden /> : <LuDownload aria-hidden />}{busy ? autoPreview && !results ? "Calculando vista previa…" : "Preparando PDF…" : source?.coverage.status !== "complete" ? "PDF bloqueado · cobertura incompleta" : "Descargar distribución (PDF)"}
          </button>
          <button type="button" className={s.secondaryAction} disabled={!canCalculate || busy || !results || source?.coverage.status !== "complete"} onClick={() => void exportPreviewResult("share")}><LuShare2 aria-hidden /> Compartir</button>
          <button type="button" className={s.secondaryAction} disabled={!canCalculate || busy} onClick={() => results ? setPreviewOpen(true) : void calculate(false, true)}><LuEye aria-hidden /> {results ? "Ampliar vista" : "Vista previa"}</button>
        </div>
        {autoPreview && selected ? <div className={s.inlinePreview} aria-label="Vista previa preliminar de distribución">
          <div className={s.previewSheetHeader}><strong>Vista previa · plancha {selectedSheetIndex + 1}</strong><span>{selected.sheet.rawSheet.widthMm} × {selected.sheet.rawSheet.heightMm} mm</span></div>
          <div className={s.previewDrawingWrap}><PlanDrawing result={selected.result} allPlans={allSheets} /></div>
          {remnantDimensions(selected.result).length ? <p className={s.remnantSizes}>Sobrantes geométricos: {remnantDimensions(selected.result).join(" · ")}</p> : null}
          {sheetCount > 1 ? <div className={s.sheetNavigation}>
            <button type="button" onClick={() => setSelectedSheetIndex((index) => Math.max(0, index - 1))} disabled={selectedSheetIndex === 0} aria-label="Plancha anterior"><LuChevronLeft aria-hidden /></button>
            <span>{selectedSheetIndex + 1} / {sheetCount}</span>
            <button type="button" onClick={() => setSelectedSheetIndex((index) => Math.min(sheetCount - 1, index + 1))} disabled={selectedSheetIndex === sheetCount - 1} aria-label="Plancha siguiente"><LuChevronRight aria-hidden /></button>
          </div> : null}
          <p className={s.previewDisclaimer}>Distribución preliminar. Confirmar medidas y tolerancias con el proveedor antes de cortar.</p>
        </div> : null}
        {results ? <p className={s.resultNote}>{sheetCount} {sheetCount === 1 ? "plancha" : "planchas"} · {completePanes.reduce((sum, pane) => sum + (pane.physicalUnitCount ?? 0), 0)} unidades distribuidas · Despuntes y separación asumidos: 0 mm · Formato sin giro{panes.some((pane) => !pane.technicalSpec?.pieceOrientation || pane.technicalSpec.pieceOrientation === "unknown") ? " · Orientación de paños desconocida: se mantuvieron fijos" : ""}</p> : null}
      </> : null}
      {error ? <p className={s.error} role="alert">{error}</p> : null}
      {downloadNotice ? <p className={s.resultNote} role="status">{downloadNotice}</p> : null}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className={s.previewDialog}>
          <DialogHeader className={s.previewHeader}>
            <DialogTitle>Vista previa de planchas</DialogTitle>
            <DialogDescription>{currentQuoteCode} · {sheetCount} {sheetCount === 1 ? "plancha" : "planchas"}</DialogDescription>
          </DialogHeader>
          {selected ? <>
            <div className={s.previewSheetHeader}><strong>Plancha {selectedSheetIndex + 1}</strong><span>{selected.sheet.rawSheet.widthMm} × {selected.sheet.rawSheet.heightMm} mm</span></div>
            <div className={s.previewDrawingWrap}><PlanDrawing result={selected.result} allPlans={allSheets} /></div>
            {remnantDimensions(selected.result).length ? <p className={s.remnantSizes}>Sobrantes geométricos: {remnantDimensions(selected.result).join(" · ")}</p> : null}
            {sheetCount > 1 ? <div className={s.sheetNavigation}>
              <button type="button" onClick={() => setSelectedSheetIndex((index) => Math.max(0, index - 1))} disabled={selectedSheetIndex === 0} aria-label="Plancha anterior"><LuChevronLeft aria-hidden /></button>
              <span>{selectedSheetIndex + 1} / {sheetCount}</span>
              <button type="button" onClick={() => setSelectedSheetIndex((index) => Math.min(sheetCount - 1, index + 1))} disabled={selectedSheetIndex === sheetCount - 1} aria-label="Plancha siguiente"><LuChevronRight aria-hidden /></button>
            </div> : null}
            <div className={s.previewSummary}><span>{selected.sheet.panes.length} unidades físicas · {formatArea(selected.sheet.areas.panesMm2)}</span><span>{selected.sheet.remnants.length} sobrantes geométricos · {formatArea(selected.sheet.remnants.reduce((sum, remnant) => sum + remnant.areaMm2, 0))}</span></div>
            <p className={s.previewDisclaimer}>Despuntes y separación geométrica asumidos: 0 mm. El formato se usa sin giro y la orientación de paños no confirmada se mantiene fija. Distribución preliminar. Confirmar medidas y tolerancias con el proveedor antes de cortar.</p>
            <button type="button" className={s.primaryAction} disabled={busy || source?.coverage.status !== "complete"} onClick={() => void exportPreviewResult("download")}><LuDownload aria-hidden />{busy ? "Generando PDF…" : source?.coverage.status !== "complete" ? "PDF bloqueado · cobertura incompleta" : "Descargar PDF de esta vista"}</button>
          </> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

