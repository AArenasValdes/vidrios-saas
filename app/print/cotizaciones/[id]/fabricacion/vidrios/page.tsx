"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { GlassPanePlanningUnit, GlassCuttingResult, GlassSheetPlan } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import { resolveGlassCutLineGeometry } from "@/features/fabricacion/services/glass-sheet-cut-geometry.service";
import type { GlassDistributionCoverage } from "@/features/fabricacion/services/glass-distribution-coverage.service";
import s from "./page.module.css";

type PanePreview = Omit<GlassPanePlanningUnit, "paneUnitIds" | "orientation"> & { displayName: string | null; physicalUnitCount: number; paneUnitIds?: never; orientation?: never };
type PaneDiagnostic = string;
type Settings = {
  pieceOrientation: "" | "fixed" | "rotatable" | "grain_or_coating_directional"; sheetOrientation: "" | "fixed" | "rotatable" | "grain_or_coating_directional"; confirmManualOperations: boolean;
  sheetSource: "catalog" | "supplier_document" | "workshop_measurement";
  sheetSourceReference: string; tableWidthMm: string; tableHeightMm: string;
  top: string; right: string; bottom: string; left: string; separationMm: string;
  minimumStripWidthMm: string; remnantWidthMm: string; remnantHeightMm: string;
  remnantOrientation: "" | "fixed" | "rotatable"; processSourceReference: string;
  previewSheetWidthMm: string; previewSheetHeightMm: string;
};
const initialSettings: Settings = {
  pieceOrientation: "", sheetOrientation: "", confirmManualOperations: false, sheetSource: "workshop_measurement", sheetSourceReference: "",
  tableWidthMm: "", tableHeightMm: "", top: "", right: "", bottom: "", left: "", separationMm: "",
  minimumStripWidthMm: "", remnantWidthMm: "", remnantHeightMm: "", remnantOrientation: "", processSourceReference: "",
  previewSheetWidthMm: "", previewSheetHeightMm: "",
};
const fmt = (mm2: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(mm2 / 1_000_000);
const mm = (value: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);

function SheetDrawing({ sheet, selectedId, onSelect, showCutLines = true, showUsableOutline = true, showRemnantsAsCandidates = true, cutLineLabel = "Corte propuesto" }: { sheet: GlassSheetPlan; selectedId?: string; onSelect?: (id: string) => void; showCutLines?: boolean; showUsableOutline?: boolean; showRemnantsAsCandidates?: boolean; cutLineLabel?: "Corte propuesto" | "Separación geométrica" }) {
  const scaleX = sheet.rawSheet.widthMm;
  const scaleY = sheet.rawSheet.heightMm;
  return <svg className={s.drawing} viewBox={`0 0 ${scaleX} ${scaleY}`} role="img" aria-label={`Plano proporcional de ${sheet.sheetId}, ${mm(scaleX)} por ${mm(scaleY)} milímetros`}>
    <rect x="0" y="0" width={scaleX} height={scaleY} fill="#fff" stroke="#102a51" strokeWidth={Math.max(scaleX, scaleY) / 700} />
    {sheet.remnants.map((remnant) => <g key={remnant.remnantId}>
      <rect x={remnant.rect.xMm} y={remnant.rect.yMm} width={remnant.rect.widthMm} height={remnant.rect.heightMm} fill={showRemnantsAsCandidates && remnant.classification === "reusable_candidate" ? "#e7f2ff" : "#f1f3f6"} stroke="#8294a9" strokeDasharray={`${scaleX / 130} ${scaleX / 180}`} strokeWidth={Math.max(scaleX, scaleY) / 1600} />
      <title>{showRemnantsAsCandidates && remnant.classification === "reusable_candidate" ? "Retazo reutilizable candidato" : "Área restante estimada"}: {mm(remnant.rect.widthMm)} × {mm(remnant.rect.heightMm)} mm</title>
    </g>)}
    {sheet.panes.map((pane) => {
      const active = selectedId === pane.paneUnitId;
      const min = Math.min(pane.rect.widthMm, pane.rect.heightMm);
      const showLabels = min / Math.max(scaleX, scaleY) > 0.12;
      return <g key={pane.paneUnitId} onClick={() => onSelect?.(pane.paneUnitId)} className={onSelect ? s.paneTarget : undefined}>
        <rect x={pane.rect.xMm} y={pane.rect.yMm} width={pane.rect.widthMm} height={pane.rect.heightMm} fill={active ? "#c9e0ff" : "#dcecff"} stroke={active ? "#0875ed" : "#32699f"} strokeWidth={Math.max(scaleX, scaleY) / (active ? 650 : 900)} />
        {showLabels ? <text x={pane.rect.xMm + pane.rect.widthMm / 2} y={pane.rect.yMm + pane.rect.heightMm / 2} textAnchor="middle" dominantBaseline="middle" fill="#102a51" fontSize={Math.max(scaleX, scaleY) / 40}>
          <tspan x={pane.rect.xMm + pane.rect.widthMm / 2}>{pane.componentCode}</tspan>
          <tspan x={pane.rect.xMm + pane.rect.widthMm / 2} dy={Math.max(scaleX, scaleY) / 30}>{mm(pane.rect.widthMm)} × {mm(pane.rect.heightMm)}</tspan>
        </text> : null}
        <title>{pane.componentCode} · {mm(pane.rect.widthMm)} × {mm(pane.rect.heightMm)} mm{pane.rotated ? " · girado 90°" : ""}</title>
      </g>;
    })}
    {showCutLines ? <g className={s.cutLines} aria-label={cutLineLabel === "Corte propuesto" ? "Cortes propuestos" : "Separaciones geométricas estimadas"}>
      {sheet.cutSequence.map((step) => {
        const line = resolveGlassCutLineGeometry(step);
        return <line key={step.nodeId} x1={line.x1Mm} y1={line.y1Mm} x2={line.x2Mm} y2={line.y2Mm}>
          <title>{step.ordinal}. {step.axis === "x" ? "Vertical" : "Horizontal"} · {cutLineLabel.toLowerCase()} · posición {step.absolutePositionMm} mm · tramo {step.fromMm}–{step.toMm} mm</title>
        </line>;
      })}
    </g> : null}
    {showUsableOutline ? <rect className={s.usableOutline} x={sheet.usableSheet.xMm} y={sheet.usableSheet.yMm} width={sheet.usableSheet.widthMm} height={sheet.usableSheet.heightMm} /> : null}
  </svg>;
}

export default function GlassSheetOptimizationPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const fallbackQuoteCode = search.get("codigo") || `COT-${id}`;
  const [resolvedQuoteCode, setResolvedQuoteCode] = useState<string | null>(null);
  const quoteCode = resolvedQuoteCode ?? fallbackQuoteCode;
  const companyName = search.get("empresa") || "";
  const [panes, setPanes] = useState<PanePreview[]>([]);
  const [coverage, setCoverage] = useState<GlassDistributionCoverage | null>(null);
  const [diagnostics, setDiagnostics] = useState<PaneDiagnostic[]>([]);
  const [calculationWarnings, setCalculationWarnings] = useState<string[]>([]);
  const [workshopProfiles, setWorkshopProfiles] = useState<Record<string, Record<string, unknown>>>({});
  const [profileProductId, setProfileProductId] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [results, setResults] = useState<GlassCuttingResult[] | null>(null);
  const [calculationMode, setCalculationMode] = useState<"geometric_preview" | "workshop">("geometric_preview");
  const [resultSourceFingerprint, setResultSourceFingerprint] = useState<string | null>(null);
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [selectedPaneId, setSelectedPaneId] = useState<string | undefined>();

  const applyWorkshopProfiles = useCallback((rawProfiles: unknown, rawPanes: unknown) => {
    const profiles = rawProfiles && typeof rawProfiles === "object" && !Array.isArray(rawProfiles)
      ? rawProfiles as Record<string, Record<string, unknown>> : {};
    const loadedPanes = Array.isArray(rawPanes) ? rawPanes as PanePreview[] : [];
    const ids = [...new Set(loadedPanes.flatMap((pane) => pane.productId ? [pane.productId] : []))];
    setWorkshopProfiles(profiles);
    setProfileProductId((current) => current && ids.includes(current) ? current : ids[0] ?? "");
    const profile = profiles[ids[0] ?? ""];
    if (!profile || profile.version !== 1 || profile.productId !== ids[0]) return;
    setSettings((current) => ({
      ...current,
      pieceOrientation: profile.pieceOrientation === "fixed" || profile.pieceOrientation === "rotatable" || profile.pieceOrientation === "grain_or_coating_directional" ? profile.pieceOrientation : current.pieceOrientation,
      confirmManualOperations: profile.confirmManualOperations === true,
      sheetOrientation: profile.sheetOrientation === "fixed" || profile.sheetOrientation === "rotatable" || profile.sheetOrientation === "grain_or_coating_directional" ? profile.sheetOrientation : current.sheetOrientation,
      sheetSource: profile.sheetSource === "catalog" || profile.sheetSource === "supplier_document" || profile.sheetSource === "workshop_measurement" ? profile.sheetSource : current.sheetSource,
      sheetSourceReference: typeof profile.sheetSourceReference === "string" ? profile.sheetSourceReference : current.sheetSourceReference,
      tableWidthMm: String(profile.tableWidthMm ?? ""), tableHeightMm: String(profile.tableHeightMm ?? ""),
      top: String((profile.edgeTrimMm as Record<string, unknown> | undefined)?.top ?? ""), right: String((profile.edgeTrimMm as Record<string, unknown> | undefined)?.right ?? ""),
      bottom: String((profile.edgeTrimMm as Record<string, unknown> | undefined)?.bottom ?? ""), left: String((profile.edgeTrimMm as Record<string, unknown> | undefined)?.left ?? ""),
      separationMm: String(profile.separationMm ?? ""), minimumStripWidthMm: String(profile.minimumStripWidthMm ?? ""),
      remnantWidthMm: String(profile.remnantMinimumWidthMm ?? ""), remnantHeightMm: String(profile.remnantMinimumHeightMm ?? ""),
      remnantOrientation: profile.remnantOrientation === "fixed" || profile.remnantOrientation === "rotatable" ? profile.remnantOrientation : current.remnantOrientation,
      processSourceReference: typeof profile.processSourceReference === "string" ? profile.processSourceReference : current.processSourceReference,
    }));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null); setResults(null); setResultSourceFingerprint(null); setDiagnostics([]); setCalculationWarnings([]);
    try {
      const response = await fetch(`/api/cotizaciones/${encodeURIComponent(id)}/optimizacion-vidrios`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No pudimos leer los paños guardados.");
      if (typeof body.quoteCode === "string") setResolvedQuoteCode(body.quoteCode);
      setPanes(body.panes as PanePreview[]);
      setCoverage(body.coverage as GlassDistributionCoverage);
      setDiagnostics(Array.isArray(body.diagnostics) ? body.diagnostics.filter((item: unknown): item is string => typeof item === "string") : []);
      applyWorkshopProfiles(body.workshopProfiles, body.panes);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar los paños."); }
    finally { setLoading(false); }
  }, [id, applyWorkshopProfiles]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/cotizaciones/${encodeURIComponent(id)}/optimizacion-vidrios`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No pudimos leer los paños guardados.");
        if (!cancelled) {
          if (typeof body.quoteCode === "string") setResolvedQuoteCode(body.quoteCode);
          setPanes(body.panes as PanePreview[]);
          setCoverage(body.coverage as GlassDistributionCoverage);
          setDiagnostics(Array.isArray(body.diagnostics) ? body.diagnostics.filter((item: unknown): item is string => typeof item === "string") : []);
          applyWorkshopProfiles(body.workshopProfiles, body.panes);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No pudimos cargar los paños.");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id, applyWorkshopProfiles]);

  useEffect(() => {
    if (!results || !resultSourceFingerprint) return;
    const checkCurrentQuote = async () => {
      try {
        const response = await fetch(`/api/cotizaciones/${encodeURIComponent(id)}/optimizacion-vidrios`, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json();
        const fingerprint = JSON.stringify((body.panes as PanePreview[]).map((pane) => pane.snapshotFingerprint).sort());
        if (fingerprint !== resultSourceFingerprint) {
          setResults(null);
          setResultSourceFingerprint(null);
          setError("La cotización cambió. Se descartó la propuesta anterior; genera una nueva con los paños guardados actuales.");
        }
      } catch { /* A temporary network issue cannot make an old proposal current. */ }
    };
    window.addEventListener("focus", checkCurrentQuote);
    return () => window.removeEventListener("focus", checkCurrentQuote);
  }, [id, results, resultSourceFingerprint]);

  const allSheets = useMemo(() => results?.flatMap((result) => result.sheets.map((sheet) => ({ result, sheet }))) ?? [], [results]);
  const hasCompletePlan = Boolean(results?.length && results.every((result) => result.status === "feasible")
    && results.every((result) => result.sheets.length > 0));
  const hasOperationalPlan = Boolean(hasCompletePlan && calculationMode === "workshop"
    && !loading && coverage?.status === "complete"
    && results?.every((result) => result.productionReadiness === "workshop_validated"));
  const selected = allSheets[Math.min(selectedSheet, Math.max(0, allSheets.length - 1))];
  const physicalCount = panes.reduce((sum, pane) => sum + pane.physicalUnitCount, 0);
  const profileProductIds = [...new Set(panes.flatMap((pane) => pane.productId ? [pane.productId] : []))];
  const formatMissing = panes.some((pane) => !Number.isSafeInteger(pane.technicalSpec?.sheetWidthMm) || Number(pane.technicalSpec?.sheetWidthMm) <= 0
    || !Number.isSafeInteger(pane.technicalSpec?.sheetHeightMm) || Number(pane.technicalSpec?.sheetHeightMm) <= 0);
  const previewDimensionsValid = !formatMissing || (Number.isSafeInteger(Number(settings.previewSheetWidthMm)) && Number(settings.previewSheetWidthMm) > 0
    && Number.isSafeInteger(Number(settings.previewSheetHeightMm)) && Number(settings.previewSheetHeightMm) > 0);
  const previewReady = panes.length > 0 && previewDimensionsValid && panes.every((pane) => Boolean(pane.logicalComponentId && pane.glassId && pane.productId
    && pane.technicalSpec && !pane.technicalSpec.hasConflict && pane.technicalSpec.thicknessMm && pane.technicalSpec.category
    && Number.isSafeInteger(pane.widthMm) && Number(pane.widthMm) > 0 && Number.isSafeInteger(pane.heightMm) && Number(pane.heightMm) > 0
    && pane.quantity === pane.physicalUnitCount && pane.recipeStatus === "validated" && pane.dimensionProvenance !== "legacy_snapshot"
    && pane.technicalSpec.manualCutStatus !== "not_admitted" && pane.technicalSpec.category !== "pendiente"));
  const configurationReady = settings.confirmManualOperations && settings.sheetSourceReference.trim() && settings.processSourceReference.trim()
    && settings.sheetOrientation !== "" && settings.pieceOrientation !== ""
    && [settings.tableWidthMm, settings.tableHeightMm, settings.top, settings.right, settings.bottom, settings.left, settings.separationMm,
      settings.minimumStripWidthMm, settings.remnantWidthMm, settings.remnantHeightMm].every((value) => value.trim() !== "")
    && settings.remnantOrientation !== "";

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setProfileSaved(false);
    setResults(null);
    setResultSourceFingerprint(null);
    setError(null);
  }
  async function calculate(mode: "geometric_preview" | "workshop") {
    setBusy(true); setError(null); setResults(null); setCalculationWarnings([]); setCalculationMode(mode);
    try {
      const bodyInput = mode === "geometric_preview"
        ? { mode, ...(formatMissing ? { sheetWidthMm: Number(settings.previewSheetWidthMm), sheetHeightMm: Number(settings.previewSheetHeightMm) } : {}) }
        : buildWorkshopInput(settings);
      const response = await fetch(`/api/cotizaciones/${encodeURIComponent(id)}/optimizacion-vidrios`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(bodyInput),
      });
      const body = await response.json();
      if (!response.ok) {
        const details = Array.isArray(body.diagnostics)
          ? body.diagnostics.filter((item: unknown): item is string => typeof item === "string")
          : [];
        throw new Error([body.error, ...details].filter((item): item is string => typeof item === "string" && item.length > 0).join(" ") || "No se pudo generar el plan.");
      }
      if (typeof body.quoteCode === "string") setResolvedQuoteCode(body.quoteCode);
      setCalculationWarnings(Array.isArray(body.warnings) ? body.warnings.filter((item: unknown): item is string => typeof item === "string") : []);
      setResults(body.results as GlassCuttingResult[]);
      setResultSourceFingerprint(JSON.stringify((body.generatedFrom as string[]).sort()));
      setSelectedSheet(0);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo generar el plan."); }
    finally { setBusy(false); }
  }

  async function calculateWorkshop(event: FormEvent) {
    event.preventDefault();
    await calculate("workshop");
  }

  async function saveWorkshopProfile() {
    if (!configurationReady || !profileProductId) return;
    setBusy(true); setError(null); setProfileSaved(false);
    try {
      const response = await fetch(`/api/cotizaciones/${encodeURIComponent(id)}/optimizacion-vidrios`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...buildWorkshopInput(settings), mode: "save_workshop_profile", productId: profileProductId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo guardar el perfil del taller.");
      setWorkshopProfiles((current) => ({ ...current, [profileProductId]: body.profile as Record<string, unknown> }));
      setProfileSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el perfil del taller."); }
    finally { setBusy(false); }
  }

  async function downloadPdf() {
    if (!results || !hasCompletePlan || (calculationMode === "workshop" && !hasOperationalPlan)) return;
    const [{ jsPDF }, { sanitizeFileNamePart }] = await Promise.all([import("jspdf"), import("@/utils/sanitize-file-name")]);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const groups = results.filter((result) => result.status === "feasible");
    if (calculationMode === "geometric_preview") {
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Plan de corte de vidrios", 16, 20);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("NO APROBADA PARA FABRICACIÓN", 16, 28);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`${companyName || "Ventora"} · ${quoteCode}`, 16, 35);
      const orientationNote = panes.some((pane) => !pane.technicalSpec?.pieceOrientation || pane.technicalSpec.pieceOrientation === "unknown")
        ? " · orientación pendiente tratada como fija, sin giro" : "";
      doc.text(`Distribución geométrica calculada · separación asumida: 0 mm · corte físico pendiente${orientationNote}`, 16, 42, { maxWidth: 178 });
      let top = 54;
      for (const [sheetIndex, { sheet, result }] of allSheets.entries()) {
        if (sheetIndex > 0) { doc.addPage(); top = 20; }
        const groupPane = panes.find((pane) => pane.productId === sheet.panes[0]?.productId);
        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(`Plancha ${sheetIndex + 1}`, 16, top);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
          doc.text(`${glassLabel(groupPane?.displayName ?? "Vidrio", groupPane?.technicalSpec?.thicknessMm ?? null)} · ${groupPane?.technicalSpec?.thicknessMm ?? "Espesor pendiente"} mm · ${sheet.rawSheet.widthMm} × ${sheet.rawSheet.heightMm} mm`, 16, top + 7);
        const area = { x: 22, y: top + 14, w: 166, h: 138 };
        const scale = Math.min(area.w / sheet.rawSheet.widthMm, area.h / sheet.rawSheet.heightMm);
        const ox = area.x + (area.w - sheet.rawSheet.widthMm * scale) / 2;
        const oy = area.y + (area.h - sheet.rawSheet.heightMm * scale) / 2;
        doc.setDrawColor(16, 42, 81); doc.rect(ox, oy, sheet.rawSheet.widthMm * scale, sheet.rawSheet.heightMm * scale);
        for (const remnant of sheet.remnants) {
          doc.setFillColor(...(remnant.classification === "reusable_candidate" ? [226, 240, 255] as [number, number, number] : [241, 243, 246] as [number, number, number]));
          doc.setDrawColor(130, 148, 169); doc.rect(ox + remnant.rect.xMm * scale, oy + remnant.rect.yMm * scale, remnant.rect.widthMm * scale, remnant.rect.heightMm * scale, "FD");
        }
        for (const pane of sheet.panes) {
          doc.setFillColor(215, 233, 252); doc.setDrawColor(50, 105, 159);
          doc.rect(ox + pane.rect.xMm * scale, oy + pane.rect.yMm * scale, pane.rect.widthMm * scale, pane.rect.heightMm * scale, "FD");
          if (pane.rect.widthMm * scale > 18 && pane.rect.heightMm * scale > 10) {
            const centerX = ox + (pane.rect.xMm + pane.rect.widthMm / 2) * scale;
            const centerY = oy + (pane.rect.yMm + pane.rect.heightMm / 2) * scale;
            doc.setFontSize(6); doc.setTextColor(16, 42, 81); doc.text(pane.componentCode, centerX, centerY - 1.5, { align: "center" });
            doc.text(`${pane.rect.widthMm} × ${pane.rect.heightMm} mm`, centerX, centerY + 2, { align: "center" });
          }
        }
        doc.setDrawColor(190, 52, 43); doc.setLineWidth(0.35); doc.setLineDashPattern([1.5, 1], 0);
        for (const step of sheet.cutSequence) {
          const line = resolveGlassCutLineGeometry(step);
          doc.line(ox + line.x1Mm * scale, oy + line.y1Mm * scale, ox + line.x2Mm * scale, oy + line.y2Mm * scale);
        }
        doc.setLineDashPattern([], 0);
        const summary = `${sheet.panes.length} ${sheet.panes.length === 1 ? "paño" : "paños"} · ${fmt(result.summary.paneAreaMm2)} m² de vidrio · posición y separación geométricas; sin kerf ni validación física`;
        doc.setFontSize(8); doc.setTextColor(20, 32, 50); doc.text(summary, 16, oy + area.h + 8, { maxWidth: 178 });
        const details = [
          ...sheet.panes.map((pane) => `PAÑO ${pane.componentCode} · ${pane.rect.widthMm} × ${pane.rect.heightMm} mm · posición x=${pane.rect.xMm}, y=${pane.rect.yMm} mm${pane.rotated ? " · girado 90°" : ""}`),
          ...sheet.remnants.map((remnant, remnantIndex) => `ÁREA RESTANTE ESTIMADA ${remnantIndex + 1} · ${remnant.rect.widthMm} × ${remnant.rect.heightMm} mm · posición x=${remnant.rect.xMm}, y=${remnant.rect.yMm} mm`),
          ...sheet.cutSequence.map((step) => `SEPARACIÓN GEOMÉTRICA ${step.ordinal} · ${step.axis === "x" ? "vertical" : "horizontal"} · posición ${step.absolutePositionMm} mm · tramo ${step.fromMm}–${step.toMm} mm`),
        ];
        let detailsY = oy + area.h + 15;
        doc.setFontSize(7); doc.setTextColor(20, 32, 50);
        for (const detail of details) {
          const lines = doc.splitTextToSize(detail, 178);
          if (detailsY + lines.length * 3.5 > 285) { doc.addPage(); detailsY = 20; }
          doc.text(lines, 16, detailsY);
          detailsY += lines.length * 3.5;
        }
      }
      doc.save(`plan-corte-vidrios-${sanitizeFileNamePart(quoteCode, 36)}.pdf`);
      return;
    }
    const plannedRotation = new Map(results.flatMap((result) => result.sheets.flatMap((sheet) => sheet.panes.map((pane) => [pane.paneUnitId, pane.rotated] as const))));
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("Plan de corte de vidrios", 16, 23);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.text(`${companyName || "Ventora"} · ${quoteCode}`, 16, 32);
    doc.setFontSize(10); doc.text("SIMULACIÓN - PENDIENTE DE VALIDACIÓN DEL TALLER", 16, 43);
    let y = 58;
    const ensureSummarySpace = (height: number) => {
      if (y + height <= 270) return;
      doc.addPage();
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("Resumen de planchas (continuación)", 16, 20);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("SIMULACIÓN - PENDIENTE DE VALIDACIÓN DEL TALLER", 16, 27);
      y = 38;
    };
    for (const result of groups) {
      const first = result.sheets[0]; if (!first) continue;
      const firstPane = panes.find((pane) => pane.productId === first.panes[0]?.productId);
      ensureSummarySpace(36);
      doc.setFont("helvetica", "bold"); doc.text(firstPane?.displayName ?? "Vidrio sin identidad", 16, y); y += 7;
      doc.setFont("helvetica", "normal");
      const technical = firstPane?.technicalSpec;
      doc.text(`Espesor ${technical?.thicknessMm ?? "?"} mm · ${result.summary.paneCount} paños · ${result.summary.sheetCount} planchas · ${first.rawSheet.widthMm} × ${first.rawSheet.heightMm} mm`, 16, y); y += 6;
      doc.text(`Vidrio ${fmt(result.summary.paneAreaMm2)} m² · Retazos candidatos ${fmt(result.summary.reusableRemnantsMm2)} m² · Desperdicio ${fmt(result.summary.wasteMm2)} m²`, 16, y); y += 6;
      doc.text(`Área no ocupada por paños ${fmt(result.summary.rawSheetAreaMm2 - result.summary.paneAreaMm2)} m² · Despuntes ${fmt(result.summary.edgeTrimMm2)} m² · Separación ${fmt(result.summary.separationLossMm2)} m²`, 16, y); y += 6;
      const utilization = result.summary.usableSheetAreaMm2 ? result.summary.paneAreaMm2 / result.summary.usableSheetAreaMm2 * 100 : 0;
      doc.text(`Aprovechamiento útil ${utilization.toFixed(1)}% · Costo de planchas no informado`, 16, y); y += 11;
    }
    doc.addPage();
    const writePaneHeader = (continuation = false) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(continuation ? "Listado de paños (continuación)" : "Listado de paños", 16, 20);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("Cotización · ventana · unidad física · vidrio/espesor · medidas colocadas · giro · plancha", 16, 29);
      y = 37;
    };
    writePaneHeader();
    for (const [paneIndex, pane] of panes.entries()) {
      for (let unitIndex = 1; unitIndex <= pane.quantity; unitIndex += 1) {
        if (y > 278) { doc.addPage(); writePaneHeader(true); }
        const paneUnitId = `${pane.paneId}:${unitIndex}`;
        const rotation = plannedRotation.get(paneUnitId);
        const renderedWidth = rotation ? pane.heightMm : pane.widthMm;
        const renderedHeight = rotation ? pane.widthMm : pane.heightMm;
        const assignedSheet = allSheets.find(({ sheet }) => sheet.panes.some((plannedPane) => plannedPane.paneUnitId === paneUnitId))?.sheet.sheetId ?? "Sin plan";
        const paneWarnings = pane.warnings.length ? ` · Advertencias: ${pane.warnings.join("; ")}` : " · Sin advertencias del snapshot";
        const row = `${quoteCode} · ${pane.componentCode} · paño ${paneIndex + 1}, unidad ${unitIndex} · ${pane.displayName ?? "Vidrio sin identidad"} ${pane.technicalSpec?.thicknessMm ?? "pendiente"} mm · ${renderedWidth ?? "pendiente"} × ${renderedHeight ?? "pendiente"} mm · ${rotation == null ? "orientación pendiente" : rotation ? "girado 90°" : "sin giro"} · ${assignedSheet}${paneWarnings}`;
        const lines = doc.splitTextToSize(row, 178);
        if (y + lines.length * 4.4 > 280) { doc.addPage(); writePaneHeader(true); }
        doc.text(lines, 16, y); y += lines.length * 4.4 + 2;
      }
    }
    for (const { sheet } of allSheets) {
      doc.addPage();
      const sheetPane = panes.find((pane) => pane.productId === sheet.panes[0]?.productId);
      doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text(`${sheet.sheetId} - ${sheetPane?.displayName ?? sheetPane?.productId ?? "Vidrio sin identidad"}`, 16, 18);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`Formato ${sheet.rawSheet.widthMm} × ${sheet.rawSheet.heightMm} mm · ${sheet.panes.length} paños · SIMULACIÓN`, 16, 25);
      const area = { x: 20, y: 35, w: 170, h: 130 };
      const scale = Math.min(area.w / sheet.rawSheet.widthMm, area.h / sheet.rawSheet.heightMm);
      const ox = area.x + (area.w - sheet.rawSheet.widthMm * scale) / 2;
      const oy = area.y + (area.h - sheet.rawSheet.heightMm * scale) / 2;
      doc.setDrawColor(16, 42, 81); doc.rect(ox, oy, sheet.rawSheet.widthMm * scale, sheet.rawSheet.heightMm * scale);
      for (const remnant of sheet.remnants) {
        doc.setFillColor(...(calculationMode === "workshop" && remnant.classification === "reusable_candidate" ? [226, 240, 255] as [number, number, number] : [241, 243, 246] as [number, number, number]));
        const rx = ox + remnant.rect.xMm * scale; const ry = oy + remnant.rect.yMm * scale;
        const rw = remnant.rect.widthMm * scale; const rh = remnant.rect.heightMm * scale;
        doc.setDrawColor(130, 148, 169); doc.rect(rx, ry, rw, rh, "FD");
        if (rw > 25 && rh > 11) { doc.setFontSize(5.5); doc.setTextColor(65, 84, 105); doc.text(`${remnant.rect.widthMm} × ${remnant.rect.heightMm}`, rx + rw / 2, ry + rh / 2, { align: "center" }); }
      }
      for (const pane of sheet.panes) {
        doc.setFillColor(215, 233, 252); doc.setDrawColor(50, 105, 159);
        doc.rect(ox + pane.rect.xMm * scale, oy + pane.rect.yMm * scale, pane.rect.widthMm * scale, pane.rect.heightMm * scale, "FD");
        if (pane.rect.widthMm * scale > 18 && pane.rect.heightMm * scale > 10) {
          const centerX = ox + (pane.rect.xMm + pane.rect.widthMm / 2) * scale;
          const centerY = oy + (pane.rect.yMm + pane.rect.heightMm / 2) * scale;
          doc.setFontSize(6); doc.setTextColor(16, 42, 81);
          doc.text(pane.componentCode, centerX, centerY - 1.5, { align: "center" });
          doc.text(`${pane.rect.widthMm} × ${pane.rect.heightMm} mm`, centerX, centerY + 2, { align: "center" });
        }
      }
      doc.setDrawColor(190, 52, 43); doc.setLineWidth(0.45); doc.setLineDashPattern([2, 1.2], 0);
      for (const step of sheet.cutSequence) {
        const line = resolveGlassCutLineGeometry(step);
        doc.line(
          ox + line.x1Mm * scale,
          oy + line.y1Mm * scale,
          ox + line.x2Mm * scale,
          oy + line.y2Mm * scale
        );
      }
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(8, 117, 237); doc.setLineWidth(0.35); doc.setLineDashPattern([2, 1.5], 0);
      doc.rect(
        ox + sheet.usableSheet.xMm * scale,
        oy + sheet.usableSheet.yMm * scale,
        sheet.usableSheet.widthMm * scale,
        sheet.usableSheet.heightMm * scale
      );
      doc.setLineDashPattern([], 0);
      doc.setTextColor(20, 32, 50); doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("Secuencia de cortes propuesta", 16, 174);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      if (sheet.cutSequence.length === 0) doc.text("Sin cortes de separación.", 16, 181);
      for (let pageIndex = 0; pageIndex < Math.ceil(sheet.cutSequence.length / 40); pageIndex += 1) {
        if (pageIndex > 0) {
          doc.addPage();
          doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(`${sheet.sheetId} - continuación de cortes`, 16, 20);
          doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("La distribución gráfica de esta plancha está en la página anterior.", 16, 27);
        }
        sheet.cutSequence.slice(pageIndex * 40, pageIndex * 40 + 40).forEach((step, index) => {
          const x = index % 2 === 0 ? 16 : 108;
          const y = (pageIndex === 0 ? 182 : 40) + Math.floor(index / 2) * 4.5;
          doc.setFontSize(6);
          doc.text(`${step.ordinal}. ${step.axis === "x" ? "Vertical" : "Horizontal"} · posición ${step.absolutePositionMm} mm (local ${step.localOffsetMm}) · tramo ${step.fromMm}–${step.toMm} mm`, x, y, { maxWidth: 88 });
        });
      }
      const paneForSheet = sheetPane;
      const writeSheetDetailsHeader = (continuation = false) => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.text(`${sheet.sheetId} · piezas y retazos${continuation ? " (continuación)" : ""}`, 16, 20);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text(`${paneForSheet?.displayName ?? "Vidrio sin identidad"} · ${paneForSheet?.technicalSpec?.thicknessMm ?? "Espesor pendiente"} mm · Formato bruto ${sheet.rawSheet.widthMm} × ${sheet.rawSheet.heightMm} mm`, 16, 28);
        doc.text(`Área bruta ${fmt(sheet.areas.rawSheetMm2)} m² · útil ${fmt(sheet.areas.usableSheetMm2)} m² · despuntes ${fmt(sheet.areas.edgeTrimMm2)} m² · restante ${fmt(sheet.areas.reusableRemnantsMm2 + sheet.areas.wasteMm2 + sheet.areas.separationLossMm2)} m²`, 16, 35);
        doc.setFontSize(7); doc.text("SIMULACIÓN - PENDIENTE DE VALIDACIÓN DEL TALLER · Azul: retazo candidato · Gris: desperdicio estimado", 16, 42);
        y = 51;
      };
      doc.addPage(); writeSheetDetailsHeader();
      const detailRows = [
        ...sheet.panes.map((pane) => `PAÑO · ${pane.componentCode} · ${pane.rect.widthMm} × ${pane.rect.heightMm} mm${pane.rotated ? " · girado 90°" : ""}`),
        ...sheet.remnants.map((remnant, index) => `${remnant.classification === "reusable_candidate" ? "RETAZO CANDIDATO" : "DESPERDICIO"} ${index + 1} · ${remnant.rect.widthMm} × ${remnant.rect.heightMm} mm · desde x=${remnant.rect.xMm}, y=${remnant.rect.yMm} mm`),
      ];
      for (const detail of detailRows) {
        const lines = doc.splitTextToSize(detail, 178);
        if (y + lines.length * 4.5 > 280) { doc.addPage(); writeSheetDetailsHeader(true); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(lines, 16, y);
        y += lines.length * 4.5 + 2;
      }
    }
    doc.save(`plan-corte-vidrios-${sanitizeFileNamePart(quoteCode, 36)}.pdf`);
  }

  return <main className={s.page}>
    <header className={s.header}>
      <Link href={`/print/cotizaciones/${encodeURIComponent(id)}/fabricacion`} className={s.back}>← Resumen de fabricación</Link>
      <p>Fabricación interna · {quoteCode}</p>
      <h1>Optimización de planchas de vidrio</h1>
      <div className={s.notice}><strong>Vista geométrica preliminar</strong><span>Usa las medidas congeladas de la cotización. No es una pauta aprobada para fabricación.</span></div>
    </header>
    {loading ? <p role="status">Leyendo paños congelados de la cotización…</p> : null}
    {!loading && panes.length === 0 ? <section className={s.empty}><strong>No hay paños técnicos para optimizar</strong>{(diagnostics.length ? diagnostics : ["No hay medidas de vidrio guardadas en snapshots de fabricación."]).map((diagnostic) => <p key={diagnostic}>{diagnostic}</p>)}<Link href={`/print/cotizaciones/${encodeURIComponent(id)}/fabricacion`} className={s.smallButton}>Abrir resumen de fabricación</Link></section> : null}
    {diagnostics.length > 0 && panes.length > 0 ? <section className={s.reviewAction} role="status">{diagnostics.map((diagnostic) => <p key={diagnostic}>{diagnostic}</p>)}</section> : null}
    {panes.length > 0 ? <>
      <section className={`${s.section} ${s.overview}`}>
        <div className={s.sectionHead}><div><p className={s.eyebrow}>Cotización · {quoteCode}</p><h2>{physicalCount} {physicalCount === 1 ? "paño" : "paños"}</h2></div><button type="button" onClick={() => void refresh()} className={s.smallButton}>Actualizar</button></div>
        <ul className={s.paneList}>{panes.map((pane, paneIndex) => <li key={`mobile-${pane.paneId}`}>
          <div><strong>{pane.componentCode} · paño {paneIndex + 1}</strong><span>{pane.widthMm ?? "?"} × {pane.heightMm ?? "?"} mm × {pane.quantity}</span></div>
          <p>{glassLabel(pane.displayName ?? pane.productId ?? "Vidrio sin identidad", pane.technicalSpec?.thicknessMm ?? null)} · {pane.technicalSpec?.thicknessMm ?? "Espesor pendiente"} mm</p>
        </li>)}</ul>
        <div className={s.summaryLine}><span>Superficie total</span><strong>{fmt(panes.reduce((sum, pane) => sum + (pane.widthMm ?? 0) * (pane.heightMm ?? 0) * pane.quantity, 0))} m²</strong></div>
        <div className={s.summaryLine}><span>Formato de plancha</span><strong>{[...new Set(panes.map((pane) => pane.technicalSpec?.sheetWidthMm && pane.technicalSpec.sheetHeightMm ? `${pane.technicalSpec.sheetWidthMm} × ${pane.technicalSpec.sheetHeightMm} mm` : "Pendiente"))].join(" · ")}</strong></div>
        {formatMissing ? <div className={s.missingFormat}><p>Falta el formato en el snapshot. Ingresa ancho y alto solo para esta vista previa; no se guardarán ni modificarán los datos de la cotización.</p><label>Ancho (mm)<input inputMode="numeric" type="number" min="1" value={settings.previewSheetWidthMm} onChange={(event) => update("previewSheetWidthMm", event.target.value)} /></label><label>Alto (mm)<input inputMode="numeric" type="number" min="1" value={settings.previewSheetHeightMm} onChange={(event) => update("previewSheetHeightMm", event.target.value)} /></label></div> : null}
        {diagnostics.length > 0 ? <div className={s.reviewAction} role="status">{diagnostics.map((diagnostic) => <p key={diagnostic}>{diagnostic}</p>)}</div> : null}
        {!previewReady ? <div className={s.reviewAction}><p>{panes.some((pane) => pane.recipeStatus !== "validated") ? "La receta debe estar validada y guardada antes de distribuir los paños." : "Falta una identidad técnica, medida congelada o existe un conflicto de especificación. Revisa la cotización; los datos comerciales no se usarán como medidas de vidrio."}</p><Link href={`/cotizaciones/${encodeURIComponent(id)}`} className={s.smallButton}>Revisar cotización</Link></div> : null}
        {error ? <p className={s.error} role="alert">{error}</p> : null}
        <button type="button" className={s.primary} onClick={() => void calculate("geometric_preview")} disabled={!previewReady || busy || loading}>{busy ? "Calculando distribución…" : "Generar distribución"}</button>
      </section>
      <details className={s.advanced}>
        <summary>Opciones avanzadas del taller</summary>
        <p>Estas reglas físicas no se requieren para la vista geométrica. Solo generan una propuesta operativa pendiente de revisión del taller.</p>
      <form className={s.section} onSubmit={(event) => void calculateWorkshop(event)}>
        <div className={s.sectionHead}><div><p className={s.eyebrow}>Pauta operativa</p><h2>Reglas físicas del taller</h2></div></div>
        <p className={s.help}>La vista previa no necesita estas reglas. Completa solo las secciones que correspondan antes de preparar una pauta operativa.</p>
        <details className={s.advancedGroup}><summary>Formato y orientación</summary><div className={s.formGrid}>
          <label>Formato de plancha<input readOnly value={panes[0]?.technicalSpec?.sheetWidthMm && panes[0]?.technicalSpec?.sheetHeightMm ? `${panes[0].technicalSpec.sheetWidthMm} × ${panes[0].technicalSpec.sheetHeightMm} mm (snapshot)` : "Pendiente en snapshot"} /></label>
          <label>Fuente del formato<select value={settings.sheetSource} onChange={(e) => update("sheetSource", e.target.value as Settings["sheetSource"])}><option value="workshop_measurement">Medición del taller</option><option value="supplier_document">Documento proveedor</option><option value="catalog">Catálogo</option></select></label>
          <label>Referencia de la fuente<input required value={settings.sheetSourceReference} onChange={(e) => update("sheetSourceReference", e.target.value)} placeholder="Documento o fecha de medición" /></label>
          <label>Orientación de la plancha<select required value={settings.sheetOrientation} onChange={(e) => update("sheetOrientation", e.target.value as Settings["sheetOrientation"])}><option value="">Confirma según la fuente del formato</option><option value="fixed">Fija</option><option value="rotatable">Se puede girar 90°</option><option value="grain_or_coating_directional">Direccional; no girar</option></select></label>
          <label>Orientación de los paños<select required value={settings.pieceOrientation} onChange={(e) => update("pieceOrientation", e.target.value as Settings["pieceOrientation"])}><option value="">Confirma según la especificación del vidrio</option><option value="fixed">No girar</option><option value="rotatable">Se permite girar 90°</option><option value="grain_or_coating_directional">Direccional; no girar</option></select></label>
        </div></details>
        <details className={s.advancedGroup}><summary>Márgenes y separación</summary><div className={s.formGrid}>
          <label>Despuntes arriba (mm)<input required inputMode="numeric" type="number" min="0" value={settings.top} onChange={(e) => update("top", e.target.value)} /></label>
          <label>Despuntes derecha (mm)<input required inputMode="numeric" type="number" min="0" value={settings.right} onChange={(e) => update("right", e.target.value)} /></label>
          <label>Despuntes abajo (mm)<input required inputMode="numeric" type="number" min="0" value={settings.bottom} onChange={(e) => update("bottom", e.target.value)} /></label>
          <label>Despuntes izquierda (mm)<input required inputMode="numeric" type="number" min="0" value={settings.left} onChange={(e) => update("left", e.target.value)} /></label>
          <label>Separación operativa (mm)<input required inputMode="numeric" type="number" min="0" value={settings.separationMm} onChange={(e) => update("separationMm", e.target.value)} /></label>
        </div></details>
        <details className={s.advancedGroup}><summary>Restricciones de mesa y proceso</summary><div className={s.formGrid}>
          <label>Mesa ancho (mm)<input required inputMode="numeric" type="number" min="1" value={settings.tableWidthMm} onChange={(e) => update("tableWidthMm", e.target.value)} /></label>
          <label>Mesa alto (mm)<input required inputMode="numeric" type="number" min="1" value={settings.tableHeightMm} onChange={(e) => update("tableHeightMm", e.target.value)} /></label>
          <label>Ancho mínimo manipulable (mm)<input required inputMode="numeric" type="number" min="0" value={settings.minimumStripWidthMm} onChange={(e) => update("minimumStripWidthMm", e.target.value)} /></label>
        </div></details>
        <details className={s.advancedGroup}><summary>Retazos aprovechables</summary><div className={s.formGrid}>
          <label>Retazo reutilizable desde ancho (mm)<input required inputMode="numeric" type="number" min="1" value={settings.remnantWidthMm} onChange={(e) => update("remnantWidthMm", e.target.value)} /></label>
          <label>Retazo reutilizable desde alto (mm)<input required inputMode="numeric" type="number" min="1" value={settings.remnantHeightMm} onChange={(e) => update("remnantHeightMm", e.target.value)} /></label>
          <label>Orientación permitida del retazo<select required value={settings.remnantOrientation} onChange={(e) => update("remnantOrientation", e.target.value as Settings["remnantOrientation"])}><option value="">Confirma según el vidrio</option><option value="fixed">No se puede girar</option><option value="rotatable">Se puede girar 90°</option></select></label>
        </div></details>
        <details className={s.advancedGroup}><summary>Fuente y validación física</summary>
          <label className={s.sourceField}>Fuente de reglas de taller<input required value={settings.processSourceReference} onChange={(e) => update("processSourceReference", e.target.value)} placeholder="Instrucción del taller o fecha de confirmación" /></label>
          <label className={s.confirm}><input type="checkbox" checked={settings.confirmManualOperations} onChange={(e) => update("confirmManualOperations", e.target.checked)} />Confirmo que el proceso es corte manual con rayado recto y quiebre.</label>
          {profileProductIds.length === 1 ? <div className={s.profileSave}><p>La configuración confirmada se puede reutilizar en esta organización para {panes[0]?.displayName ?? "este vidrio"}. Solo se guarda en los metadatos técnicos de su ficha.</p><button type="button" className={s.smallButton} disabled={!configurationReady || busy} onClick={() => void saveWorkshopProfile()}>{profileSaved ? "Perfil del taller guardado" : workshopProfiles[profileProductId] ? "Actualizar perfil reutilizable" : "Guardar para este vidrio"}</button></div> : profileProductIds.length > 1 ? <p className={s.help}>Esta cotización mezcla varios vidrios. No guardamos una regla única para materiales distintos.</p> : null}
        </details>
        {error ? <p className={s.error} role="alert">{error}</p> : null}
        <button className={s.primary} type="submit" disabled={!configurationReady || busy || loading}>{busy ? "Calculando y verificando…" : "Generar propuesta de corte"}</button>
      </form>
      </details>
    </> : null}
    {results ? <section className={s.section}>
      <div className={s.sectionHead}><div><p className={s.eyebrow}>{calculationMode === "geometric_preview" ? "Distribución geométrica" : "Pauta operativa preliminar"}</p><h2>Resultado por tipo de vidrio</h2></div><button type="button" onClick={() => void downloadPdf()} className={s.primary} disabled={calculationMode === "geometric_preview" ? !hasCompletePlan : !hasOperationalPlan}>{calculationMode === "geometric_preview" ? "Descargar simulación PDF · NO APTO PARA CORTE" : hasOperationalPlan ? "Descargar pauta operativa para proveedor" : "PDF operativo bloqueado · taller pendiente"}</button></div>
      {results.map((result) => <article key={result.inputFingerprint} className={s.result}>
        <h3>{glassLabel(panes.find((pane) => pane.productId === result.sheets[0]?.panes[0]?.productId)?.displayName ?? panes.find((pane) => pane.productId === result.sheets[0]?.panes[0]?.productId)?.productId ?? "Grupo de vidrio", panes.find((pane) => pane.productId === result.sheets[0]?.panes[0]?.productId)?.technicalSpec?.thicknessMm ?? null)} · {result.sheets[0]?.rawSheet.widthMm ?? "?"} × {result.sheets[0]?.rawSheet.heightMm ?? "?"} mm</h3>
        {result.status === "feasible" ? <><div className={s.metrics}><div><span>Paños</span><strong>{result.summary.paneCount}</strong></div><div><span>Planchas</span><strong>{result.summary.sheetCount}</strong></div><div><span>Vidrio</span><strong>{fmt(result.summary.paneAreaMm2)} m²</strong></div><div><span>Aprovechamiento útil</span><strong>{result.summary.usableSheetAreaMm2 ? `${(result.summary.paneAreaMm2 / result.summary.usableSheetAreaMm2 * 100).toFixed(1)}%` : "—"}</strong></div><div><span>Superficie restante</span><strong>{fmt(result.summary.rawSheetAreaMm2 - result.summary.paneAreaMm2)} m²</strong></div>{calculationMode === "workshop" ? <><div><span>Retazos candidatos</span><strong>{fmt(result.summary.reusableRemnantsMm2)} m²</strong></div><div><span>Desperdicio estimado</span><strong>{fmt(result.summary.wasteMm2)} m²</strong></div></> : null}</div>
          <p className={s.pending}>{calculationMode === "geometric_preview" ? "Vista geométrica informativa · NO APTO PARA CORTE" : hasOperationalPlan ? "Proceso validado para salida operativa" : "Resultado preliminar · taller pendiente; no es pauta para proveedor"}</p>
          {calculationWarnings.length > 0 ? <ul className={s.previewWarnings}>{calculationWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
          {!result.minimumSheetCountProven ? <p className={s.help}>El número de planchas es una propuesta heurística; no es una prueba de mínimo matemático.</p> : null}
          <div className={s.sheetNav} role="tablist" aria-label="Planchas"><span>Plancha:</span>{allSheets.filter((entry) => entry.result.inputFingerprint === result.inputFingerprint).map(({ sheet }, index) => <button type="button" role="tab" aria-selected={selected?.result.inputFingerprint === result.inputFingerprint && selected.sheet.sheetId === sheet.sheetId} onClick={() => setSelectedSheet(allSheets.findIndex((entry) => entry.result.inputFingerprint === result.inputFingerprint && entry.sheet.sheetId === sheet.sheetId))} key={sheet.sheetId}>{index + 1}</button>)}</div>
          {selected && selected.result.inputFingerprint === result.inputFingerprint ? <div className={s.plan}><div><SheetDrawing sheet={selected.sheet} selectedId={selectedPaneId} onSelect={setSelectedPaneId} showCutLines showUsableOutline={calculationMode === "workshop"} showRemnantsAsCandidates={calculationMode === "workshop"} cutLineLabel={calculationMode === "geometric_preview" ? "Separación geométrica" : "Corte propuesto"} /><p>{calculationMode === "geometric_preview" ? "Línea roja discontinua: separación geométrica calculada. Posiciones y áreas restantes son estimadas; no representan kerf ni instrucciones físicas de corte." : "Línea roja discontinua: rayado y quiebre. Azul: límite útil tras despuntes. Las medidas se ubican desde el origen de la plancha."}</p></div><aside><strong>{calculationMode === "geometric_preview" ? `Plancha ${allSheets.filter((entry) => entry.result.inputFingerprint === result.inputFingerprint).findIndex((entry) => entry.sheet.sheetId === selected.sheet.sheetId) + 1} · distribución provisional` : `${selected.sheet.sheetId} · ${selected.sheet.cutSequence.length} cortes propuestos`}</strong>{selected.sheet.cutSequence.length ? <ol>{selected.sheet.cutSequence.map((cut) => <li key={cut.nodeId}>{cut.ordinal}. {cut.axis === "x" ? "Vertical" : "Horizontal"} · posición {cut.absolutePositionMm} mm · tramo {cut.fromMm}–{cut.toMm} mm<small>Desplazamiento local {cut.localOffsetMm} mm</small></li>)}</ol> : null}<h4>Paños de esta plancha</h4><ul>{selected.sheet.panes.map((pane, paneIndex) => <li key={pane.paneUnitId}><button type="button" onClick={() => setSelectedPaneId(pane.paneUnitId)}>{pane.componentCode} · paño {paneIndex + 1}<small>{pane.rect.widthMm} × {pane.rect.heightMm} mm · posición x={pane.rect.xMm}, y={pane.rect.yMm} mm{xRotate(pane.rotated)} · unidad {paneIndex + 1}</small></button></li>)}</ul><h4>Retazos y desperdicio</h4><ul>{selected.sheet.remnants.map((remnant) => <li key={remnant.remnantId}>{calculationMode === "geometric_preview" ? "Área restante estimada" : remnant.classification === "reusable_candidate" ? "Retazo candidato" : "Área restante"} · {remnant.rect.widthMm} × {remnant.rect.heightMm} mm · posición x={remnant.rect.xMm}, y={remnant.rect.yMm} mm</li>)}</ul></aside></div> : null}
        </> : <div className={s.error}><strong>{result.status === "infeasible_piece" || result.status === "infeasible_proven" ? "No cabe con las reglas indicadas" : "Este grupo requiere revisión"}</strong><ul>{result.errors.map((message) => <li key={message}>{message}</li>)}</ul></div>}
      </article>)}
    </section> : null}
  </main>;
}

function xRotate(rotated: boolean) { return rotated ? " · girado 90°" : ""; }

function glassLabel(name: string, thickness: number | null) {
  if (!thickness) return name;
  return name.replace(new RegExp(`\\b${thickness}\\s*mm\\b`, "ig"), "").replace(/\s*[·|,-]\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

function buildWorkshopInput(settings: Settings) {
  const number = (value: string) => Number(value);
  return {
    pieceOrientation: settings.pieceOrientation, confirmManualOperations: settings.confirmManualOperations, sheetOrientation: settings.sheetOrientation,
    sheetSource: settings.sheetSource, sheetSourceReference: settings.sheetSourceReference, tableWidthMm: number(settings.tableWidthMm), tableHeightMm: number(settings.tableHeightMm),
    edgeTrimMm: { top: number(settings.top), right: number(settings.right), bottom: number(settings.bottom), left: number(settings.left) },
    separationMm: number(settings.separationMm), minimumStripWidthMm: number(settings.minimumStripWidthMm),
    remnantMinimumWidthMm: number(settings.remnantWidthMm), remnantMinimumHeightMm: number(settings.remnantHeightMm),
    remnantOrientation: settings.remnantOrientation, processSourceReference: settings.processSourceReference,
  };
}
