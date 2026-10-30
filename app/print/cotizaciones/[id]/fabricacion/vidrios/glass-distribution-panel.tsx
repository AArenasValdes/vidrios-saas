"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuEye, LuLayers3, LuLoaderCircle } from "react-icons/lu";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { GlassCuttingResult } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { ManualGlassPaneMeasurementsSnapshot } from "@/features/cotizaciones/types/manual-glass-pane-measurements";
import { formatGlassDisplayName } from "@/features/fabricacion/services/glass-display-name.service";
import { getGlassPaneGeometryExclusionReason, isGlassPaneGeometryComplete, type GlassDistributionCoverage, type GlassPaneGeometryExclusion } from "@/features/fabricacion/services/glass-distribution-coverage.service";

import s from "./glass-distribution-panel.module.css";
import { GlassDistributionCoverageNotice } from "./glass-distribution-coverage-notice";

type PaneInput = {
  quoteItemId: string;
  paneId: string;
  paneUnitIds: string[];
  logicalComponentId: string | null;
  glassId: string | null;
  productId: string | null;
  commercialQuantity: number | null;
  finishOrientationKey: string;
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
  validationStatus: "eligible_for_manual_planning" | "requires_review";
  warnings: string[];
  snapshotFingerprint: string;
};

type PlanResponse = {
  quoteCode: string;
  panes: PaneInput[];
  diagnostics: string[];
  coverage: GlassDistributionCoverage;
  preliminaryPaneCount: number;
  previewExclusions: GlassPaneGeometryExclusion[];
};

type CalculationResponse = {
  quoteCode: string;
  mode: "geometric_preview";
  coverage: GlassDistributionCoverage;
  warnings: string[];
  results: GlassCuttingResult[];
  generatedFrom: string[];
  preliminaryPaneCount: number;
  previewExclusions: GlassPaneGeometryExclusion[];
};

type Props = {
  quoteId: string;
  quoteCode: string;
  clientName: string;
  workName: string;
  enabled: boolean;
  autoPreview?: boolean;
  preloadPreview?: boolean;
  items: readonly CotizacionWorkflowItem[];
  templates: readonly CotizacionLineTemplate[];
  onSaveManualGlassMeasurements: (itemId: string, value: ManualGlassPaneMeasurementsSnapshot) => Promise<void>;
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
  return pane.physicalUnitCount != null && isGlassPaneGeometryComplete(pane);
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

export function GlassDistributionPanel({ quoteId, quoteCode, enabled, autoPreview = false, preloadPreview = false, items, templates, onSaveManualGlassMeasurements }: Props) {
  const [source, setSource] = useState<PlanResponse | null>(null);
  const [sourceQuoteId, setSourceQuoteId] = useState<string | null>(null);
  const [sourceFresh, setSourceFresh] = useState(false);
  const [refreshingSource, setRefreshingSource] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GlassCuttingResult[] | null>(null);
  const [resultsQuoteId, setResultsQuoteId] = useState<string | null>(null);
  const [previewExclusions, setPreviewExclusions] = useState<GlassPaneGeometryExclusion[]>([]);
  const [sheetWidth, setSheetWidth] = useState("");
  const [sheetHeight, setSheetHeight] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const autoPreviewFingerprint = useRef<string | null>(null);
  const sourceRequestId = useRef(0);
  const sourceController = useRef<AbortController | null>(null);
  const dataRevision = useRef(0);

  const refreshSource = useCallback(async () => {
    const requestQuoteId = quoteId;
    const requestId = ++sourceRequestId.current;
    dataRevision.current += 1;
    sourceController.current?.abort();
    const controller = new AbortController();
    sourceController.current = controller;
    setRefreshingSource(true);
    setSourceFresh(false);
    setRefreshError(null);
    setError(null);
    setResults(null);
    setResultsQuoteId(null);
    setPreviewExclusions([]);
    setPreviewOpen(false);
    setSelectedSheetIndex(0);

    try {
      const response = await fetch(`/api/cotizaciones/${encodeURIComponent(requestQuoteId)}/optimizacion-vidrios`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await response.json() as PlanResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos cargar los paños guardados.");
      if (controller.signal.aborted || sourceRequestId.current !== requestId) return;
      setSource(body);
      setPreviewExclusions(body.previewExclusions ?? []);
      setSourceQuoteId(requestQuoteId);
      setSourceFresh(true);
    } catch (cause) {
      if (controller.signal.aborted || sourceRequestId.current !== requestId) return;
      const message = cause instanceof Error ? cause.message : "No pudimos actualizar la cobertura de vidrio.";
      setRefreshError(message);
      throw new Error(message);
    } finally {
      if (sourceRequestId.current === requestId) setRefreshingSource(false);
    }
  }, [quoteId]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    autoPreviewFingerprint.current = null;
    // El callback inicia una petición; sus actualizaciones de estado ocurren tras la respuesta.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSource().catch(() => undefined).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      sourceRequestId.current += 1;
      sourceController.current?.abort();
    };
  }, [enabled, quoteId, refreshSource]);

  const isLoadingSource = loading;
  const sourceForQuote = sourceQuoteId === quoteId ? source : null;
  const panes = sourceFresh && sourceForQuote ? sourceForQuote.panes : EMPTY_PANES;
  const completePanes = useMemo(() => panes.filter(isPreviewReadyPane), [panes]);
  const formatMissing = completePanes.some((pane) => !hasSheetFormat(pane.technicalSpec));
  const formatInputValid = validDimension(Number(sheetWidth)) && validDimension(Number(sheetHeight));
  const canCalculate = sourceFresh && !refreshingSource && completePanes.length > 0 && (!formatMissing || formatInputValid);
  const visibleResults = resultsQuoteId === quoteId ? results : null;
  const allSheets = useMemo(() => visibleResults?.flatMap((result) => result.sheets.map((sheet) => ({ result, sheet }))) ?? [], [visibleResults]);
  const selected = allSheets[selectedSheetIndex] ?? null;
  const currentQuoteCode = sourceForQuote?.quoteCode || quoteCode;

  const calculate = useCallback(async (openDialog = false) => {
    if (!canCalculate) return;
    const expectedRevision = dataRevision.current;
    const calculationQuoteId = quoteId;
    setBusy(true);
    setError(null);
    setResults(null);
    setResultsQuoteId(null);
    setPreviewOpen(false);
    try {
      const requestBody: { mode: "geometric_preview"; sheetWidthMm?: number; sheetHeightMm?: number } = { mode: "geometric_preview" };
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
      if (!response.ok) throw new Error(body.error || "No pudimos preparar la distribución. Revisa las medidas de vidrio e inténtalo otra vez.");
      if (dataRevision.current !== expectedRevision || quoteId !== calculationQuoteId) throw new Error("Los paños cambiaron mientras se calculaba. Genera nuevamente la distribución.");
      if (!body.coverage) throw new Error("La respuesta no contiene la cobertura vigente.");
      const displayedSnapshots = panes.map((pane) => pane.snapshotFingerprint);
      if (!sameSnapshotSet(displayedSnapshots, body.generatedFrom ?? [])) {
        const latestResponse = await fetch(`/api/cotizaciones/${encodeURIComponent(quoteId)}/optimizacion-vidrios`, { cache: "no-store" });
        const latest = await latestResponse.json() as PlanResponse;
        if (latestResponse.ok && dataRevision.current === expectedRevision && quoteId === calculationQuoteId) {
          setSource(latest);
          setSourceQuoteId(calculationQuoteId);
          setSourceFresh(true);
        }
        throw new Error("Los paños guardados cambiaron desde que se abrió esta pestaña. Revisa las medidas actualizadas y genera otra vez.");
      }
      if (!body.results?.length || body.results.some((result) => result.status !== "feasible" || !result.verification.passed || result.sheets.length === 0)) {
        throw new Error(body.results?.flatMap((result) => result.errors).filter(Boolean)[0] || "No se encontró una distribución geométrica verificable.");
      }
      setSource((current) => current ? { ...current, quoteCode: body.quoteCode || current.quoteCode } : current);
      setResults(body.results);
      setResultsQuoteId(calculationQuoteId);
      setPreviewExclusions(body.previewExclusions ?? []);
      setSelectedSheetIndex(0);
      setPreviewOpen(openDialog);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos calcular la distribución.");
    } finally {
      setBusy(false);
    }
  }, [canCalculate, formatMissing, sheetWidth, sheetHeight, quoteId, panes]);

  useEffect(() => {
    if (!enabled || (!autoPreview && !preloadPreview) || isLoadingSource || !sourceFresh || !sourceForQuote || !canCalculate || formatMissing) return;
    const fingerprint = panes.map((pane) => pane.snapshotFingerprint).join("|");
    if (autoPreviewFingerprint.current === fingerprint) return;
    autoPreviewFingerprint.current = fingerprint;
    void calculate();
  }, [enabled, autoPreview, preloadPreview, isLoadingSource, sourceFresh, sourceForQuote, canCalculate, formatMissing, panes, calculate]);

  if (!enabled) return null;

  const sheetCount = allSheets.length;

  return (
    <section className={s.panel} aria-labelledby="glass-distribution-title" id="glass-distribution">
      <header className={s.heading}>
        <span className={s.icon}><LuLayers3 aria-hidden /></span>
        <div><h2 id="glass-distribution-title">Distribución de planchas</h2><p>Usa geometría congelada; nunca estima vidrio desde las medidas exteriores.</p></div>
      </header>

      {isLoadingSource ? <p className={s.status}><LuLoaderCircle className={s.spinner} aria-hidden />Cargando vidrio y paños…</p> : null}
      {!isLoadingSource && refreshingSource ? <p className={s.status}><LuLoaderCircle className={s.spinner} aria-hidden />Actualizando cobertura de vidrio…</p> : null}
      {!isLoadingSource && sourceForQuote ? (
        <GlassDistributionCoverageNotice
          quoteId={quoteId}
          coverage={sourceForQuote.coverage}
          items={items}
          templates={templates}
          previewablePaneIds={completePanes.map((pane) => pane.paneId)}
          previewableUnitCount={completePanes.reduce((sum, pane) => sum + (pane.physicalUnitCount ?? 0), 0)}
          excludedPreviewCount={previewExclusions.length}
          onSaveMeasurements={onSaveManualGlassMeasurements}
          isRefreshing={refreshingSource}
          isCoverageCurrent={sourceFresh}
          refreshError={refreshError}
          onRetryRefresh={refreshSource}
        />
      ) : null}
      {!isLoadingSource && !sourceForQuote && refreshError ? <div className={s.errorBlock}>
        <p className={s.error} role="alert">{refreshError}</p>
        <button type="button" className={s.secondaryAction} onClick={() => void refreshSource()}>Reintentar carga</button>
      </div> : null}
      {!isLoadingSource && sourceFresh && sourceForQuote && panes.length === 0 ? <p className={s.empty}>Aún no hay medidas de vidrio disponibles para distribuir.</p> : null}

      {panes.length > 0 ? <>
        {completePanes.some((pane) => pane.dimensionProvenance === "recipe_trace") ? <p className={s.pdfBlockedNote} role="status">La vista previa usa geometría congelada de una receta preliminar. Requiere revisión del taller y no es apta para corte.</p> : null}
        {previewExclusions.length > 0 ? <div className={s.pdfBlockedNote} role="status">
          <strong>Referencias excluidas de la simulación</strong>
          <ul>{previewExclusions.map((entry) => <li key={`${entry.quoteItemId}-${entry.paneId}`}>{entry.componentCode} · {entry.displayName ?? entry.componentName}: {entry.reason}</li>)}</ul>
        </div> : null}
        <div className={s.glassGroups}>
          {Array.from(new Map(panes.map((pane) => {
            const key = [pane.productId, pane.technicalSpec?.category, pane.technicalSpec?.thicknessMm, pane.finishOrientationKey, pane.technicalSpec?.sheetWidthMm, pane.technicalSpec?.sheetHeightMm].join("|");
            const group = panes.filter((candidate) => [candidate.productId, candidate.technicalSpec?.category, candidate.technicalSpec?.thicknessMm, candidate.finishOrientationKey, candidate.technicalSpec?.sheetWidthMm, candidate.technicalSpec?.sheetHeightMm].join("|") === key);
            return [key, { key, pane, group }];
          })).values()).map(({ key, pane, group }) => {
            const previewableGroup = group.filter(isPreviewReadyPane);
            const representative = previewableGroup[0] ?? pane;
            const spec = representative.technicalSpec;
            const quantity = previewableGroup.reduce((sum, entry) => sum + entry.physicalUnitCount, 0);
            const width = spec?.sheetWidthMm;
            const height = spec?.sheetHeightMm;
            return <div className={s.glassGroup} key={key}>
              <div className={s.glassHeading}><strong>{formatGlassDisplayName(representative.displayName, spec?.thicknessMm)}</strong><span>{spec?.category ? CATEGORY_LABELS[spec.category] ?? spec.category : "Tipo pendiente"} · {spec?.thicknessMm ? `${spec.thicknessMm} mm` : "espesor pendiente"}</span></div>
              <div className={s.glassMeta}><span>{previewableGroup.length} {previewableGroup.length === 1 ? "referencia incluida" : "referencias incluidas"} · {quantity} {quantity === 1 ? "unidad física" : "unidades físicas"} para simulación</span><span>{width && height ? `Plancha ${width} × ${height} mm` : "Formato habitual pendiente"}</span></div>
              <ul className={s.paneList}>{group.map((entry, index) => {
                const exclusion = getGlassPaneGeometryExclusionReason(entry);
                return <li key={`${entry.quoteItemId}-${entry.paneId}`}><span>{shortCode(entry.componentCode, index)}{entry.componentName ? ` · ${entry.componentName}` : ""} · {exclusion ? `Excluido: ${exclusion}` : `${entry.physicalUnitCount} ${entry.physicalUnitCount === 1 ? "unidad física" : "unidades físicas"}`}</span><strong>{entry.widthMm && entry.heightMm ? `${entry.widthMm} × ${entry.heightMm} mm` : "Medidas pendientes"}</strong></li>;
              })}</ul>
            </div>;
          })}
        </div>

        {formatMissing ? <div className={s.formatFields}>
          <p>Falta el formato de plancha. Indica ancho y alto para esta distribución.</p>
          <label>Ancho de plancha (mm)<input inputMode="numeric" type="number" min="1" step="1" value={sheetWidth} onChange={(event) => setSheetWidth(event.target.value)} /></label>
          <label>Alto de plancha (mm)<input inputMode="numeric" type="number" min="1" step="1" value={sheetHeight} onChange={(event) => setSheetHeight(event.target.value)} /></label>
        </div> : null}

        <div className={s.actions}>
          <button type="button" className={s.primaryAction} disabled={!canCalculate || busy || refreshingSource || !sourceFresh} onClick={() => visibleResults ? setPreviewOpen(true) : void calculate(true)}>
            {busy ? <LuLoaderCircle className={s.spinner} aria-hidden /> : <LuEye aria-hidden />}{busy ? "Calculando vista previa…" : visibleResults ? "Ampliar vista previa" : "Generar vista previa"}
          </button>
          <Link className={s.secondaryAction} href={`/print/cotizaciones/${encodeURIComponent(quoteId)}/fabricacion/vidrios?codigo=${encodeURIComponent(currentQuoteCode)}`}>Abrir revisión técnica y PDFs</Link>
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
        {visibleResults ? <p className={s.resultNote}>{sheetCount} {sheetCount === 1 ? "plancha" : "planchas"} · {visibleResults.reduce((sum, result) => sum + result.summary.paneCount, 0)} unidades distribuidas · Despuntes y separación asumidos: 0 mm · Formato sin giro{panes.some((pane) => !pane.technicalSpec?.pieceOrientation || pane.technicalSpec.pieceOrientation === "unknown") ? " · Orientación de paños desconocida: se mantuvieron fijos" : ""}</p> : null}
      </> : null}
      {error ? <p className={s.error} role="alert">{error}</p> : null}

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
            <div className={s.previewSummary}><span>{selected.sheet.panes.length} {selected.sheet.panes.length === 1 ? "unidad física" : "unidades físicas"} · {formatArea(selected.sheet.areas.panesMm2)}</span><span>{selected.sheet.remnants.length} sobrantes geométricos · {formatArea(selected.sheet.remnants.reduce((sum, remnant) => sum + remnant.areaMm2, 0))}</span></div>
            <p className={s.previewDisclaimer}>Despuntes y separación geométrica asumidos: 0 mm. El formato se usa sin giro y la orientación de paños no confirmada se mantiene fija. Distribución preliminar. Confirmar medidas y tolerancias con el proveedor antes de cortar.</p>
            <Link className={s.secondaryAction} href={`/print/cotizaciones/${encodeURIComponent(quoteId)}/fabricacion/vidrios?codigo=${encodeURIComponent(currentQuoteCode)}`}>Abrir revisión técnica y PDFs</Link>
          </> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

