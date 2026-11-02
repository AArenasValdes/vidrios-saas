import type { jsPDF } from "jspdf";

import type { GlassCuttingResult, GlassPlannedPane, GlassSheetPlan } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import {
  drawFabricationPdfContinuationHeader,
  drawFabricationPdfFooters,
  drawFabricationPdfHeader,
  drawFabricationPdfSectionTitle,
  FABRICATION_PDF_COLORS,
} from "./fabrication-pdf-document-style.service";
import { formatGlassDisplayName } from "./glass-display-name.service";
import type { GlassDistributionCoverage } from "./glass-distribution-coverage.service";

export type GlassDistributionPdfSource = {
  mode?: "provider" | "simulation";
  quoteCode: string;
  clientName: string;
  workName: string;
  generatedAt?: Date | string;
  quoteCreatedAt?: Date | string | null;
  logoDataUrl?: string | null;
  coverage: GlassDistributionCoverage;
  simulationWarnings?: string[];
  previewExclusions?: Array<{ componentCode: string; componentName?: string | null; displayName?: string | null; reason: string }>;
  panes: Array<{
    quoteItemId: string;
    paneId?: string;
    componentCode: string;
    productId: string | null;
    displayName: string | null;
    thicknessMm: number | null;
    category: string | null;
    pieceOrientation?: string | null;
    componentName?: string | null;
    widthMm?: number | null;
    heightMm?: number | null;
    quantity?: number | null;
    physicalUnitCount?: number | null;
    dimensionProvenance?: string | null;
  }>;
  results: GlassCuttingResult[];
};

const PAGE_WIDTH_MM = 210;
const PAGE_MARGIN_MM = 14;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2;
const FOOTER_TOP_MM = 283;
const CONTENT_BOTTOM_MM = 270;
const PAGE_CONTENT_TOP_MM = 65;
export const GLASS_DISTRIBUTION_USABLE_PAGE_HEIGHT_MM = FOOTER_TOP_MM - PAGE_CONTENT_TOP_MM;
export const GLASS_DISTRIBUTION_MAX_PLAN_HEIGHT_MM = Math.floor(GLASS_DISTRIBUTION_USABLE_PAGE_HEIGHT_MM * 0.4);

const INK = FABRICATION_PDF_COLORS.ink;
const MUTED = FABRICATION_PDF_COLORS.muted;
const RULE = FABRICATION_PDF_COLORS.rule;
const PALE = FABRICATION_PDF_COLORS.pale;

const CATEGORY_LABELS: Record<string, string> = {
  monolitico: "Monolítico",
  laminado: "Laminado",
  dvh: "DVH",
  templado: "Templado",
  espejo: "Espejo",
  otro: "Otro",
};

type PaneSource = GlassDistributionPdfSource["panes"][number];
type SheetRow = { reference: string; component: string; dimensions: string; quantity: string };

function shortComponentCode(value: string, index: number) {
  const clean = value.trim();
  return clean && !/^[0-9a-f-]{28,}$/i.test(clean) ? clean : `Componente ${index + 1}`;
}

function sourceForPlannedPane(pane: GlassPlannedPane, sources: PaneSource[]) {
  const exactPane = sources.find((source) => source.quoteItemId === pane.quoteItemId && source.paneId === pane.paneId);
  if (exactPane) return exactPane;
  const matchingProduct = sources.filter((source) => source.quoteItemId === pane.quoteItemId && source.productId === pane.productId);
  if (matchingProduct.length === 1) return matchingProduct[0] ?? null;
  const matchingItem = sources.filter((source) => source.quoteItemId === pane.quoteItemId);
  return matchingItem.length === 1 ? matchingItem[0] ?? null : null;
}

function paneSourceKey(source: PaneSource) {
  return `${source.quoteItemId}|${source.paneId ?? source.productId ?? "glass-reference"}`;
}

type VerifiedPaneEntry = { planned: GlassPlannedPane; source: PaneSource; ordinal: number };

export function validateGlassDistributionPdfInput(input: GlassDistributionPdfSource): string | null {
  const simulation = input.mode === "simulation";
  if (!simulation && (input.coverage.status !== "complete" || input.coverage.pendingReferenceCount > 0)) {
    return "No se puede generar el PDF para el proveedor: la cobertura de vidrio está incompleta. Revisa las referencias pendientes de la cotización.";
  }
  if (!simulation && input.coverage.completeReferenceCount === 0) return "No se puede generar el PDF: no hay referencias de vidrio con cobertura técnica completa.";
  if (simulation && input.panes.length === 0) return "No se puede generar la simulación: no hay paños geométricos admisibles.";
  if (!input.panes.length || !input.results.length) return "No se puede generar el PDF: la cotización no tiene paños y planos verificados para resumir.";
  if (simulation && input.results.some((result) => result.calculationMode !== "geometric_preview")) {
    return "La simulación debe provenir exclusivamente de un cálculo geométrico preliminar.";
  }
  if (!simulation && input.results.some((result) => result.calculationMode !== "workshop" || result.productionReadiness !== "workshop_validated")) {
    return "No se puede generar un PDF operativo para proveedor: el resultado no proviene de un proceso de taller validado.";
  }
  if (input.results.some((result) => result.status !== "feasible" || !result.verification.passed || result.sheets.length === 0)) {
    return "No se puede generar el PDF: una o más planchas no superaron la verificación geométrica.";
  }
  for (const pane of input.panes) {
    if (!pane.productId || pane.widthMm == null || pane.widthMm <= 0 || pane.heightMm == null || pane.heightMm <= 0
      || pane.quantity == null || !Number.isSafeInteger(pane.quantity)
      || pane.physicalUnitCount == null || !Number.isSafeInteger(pane.physicalUnitCount)) {
      return `No se puede generar el PDF: ${pane.componentCode} tiene medidas o unidades físicas pendientes.`;
    }
    if (pane.quantity !== pane.physicalUnitCount || pane.quantity <= 0) {
      return `No se puede generar el PDF: la cantidad solicitada para ${pane.componentCode} no coincide con sus unidades físicas.`;
    }
  }
  const planned = input.results.flatMap((result) => result.sheets.flatMap((sheet) => sheet.panes));
  const requestedCount = input.panes.reduce((sum, pane) => sum + (pane.physicalUnitCount ?? 0), 0);
  if (planned.length !== requestedCount) {
    return `No se puede generar el PDF: se solicitaron ${requestedCount} unidades físicas, pero los planos verificados contienen ${planned.length}. Revisa medidas y cantidades guardadas.`;
  }
  const seenUnitIds = new Set<string>();
  const plannedBySource = new Map<string, GlassPlannedPane[]>();
  for (const pane of planned) {
    if (!pane.paneUnitId || seenUnitIds.has(pane.paneUnitId)) return "No se puede generar el PDF: el resultado geométrico contiene unidades repetidas o sin identificar.";
    seenUnitIds.add(pane.paneUnitId);
    const source = sourceForPlannedPane(pane, input.panes);
    if (!source || source.widthMm == null || source.heightMm == null) return "No se puede generar el PDF: hay un paño del plano sin medidas de origen coincidentes.";
    if (source.widthMm !== pane.rect.widthMm || source.heightMm !== pane.rect.heightMm) {
      return `No se puede generar el PDF: las medidas de ${source.componentCode} no coinciden entre cubicación y plano. Vuelve a calcular la distribución.`;
    }
    const key = paneSourceKey(source);
    plannedBySource.set(key, [...(plannedBySource.get(key) ?? []), pane]);
  }
  const expectedBySource = new Map<string, number>();
  for (const pane of input.panes) {
    const key = paneSourceKey(pane);
    expectedBySource.set(key, (expectedBySource.get(key) ?? 0) + (pane.physicalUnitCount ?? 0));
  }
  for (const [key, expectedCount] of expectedBySource) {
    if ((plannedBySource.get(key)?.length ?? 0) !== expectedCount) {
      const affectedPane = input.panes.find((pane) => paneSourceKey(pane) === key);
      const componentCode = affectedPane?.componentCode ?? "un componente";
      return `No se puede generar el PDF: las unidades físicas de ${componentCode} no coinciden con su plano verificado.`;
    }
  }
  return null;
}

function buildVerifiedEntries(input: GlassDistributionPdfSource): VerifiedPaneEntry[] {
  const ordinals = new Map<string, number>();
  return input.results.flatMap((result) => result.sheets.flatMap((sheet) => sheet.panes)).map((planned) => {
    const source = sourceForPlannedPane(planned, input.panes)!;
    const key = `${source.quoteItemId}|${source.productId}`;
    const ordinal = (ordinals.get(key) ?? 0) + 1;
    ordinals.set(key, ordinal);
    return { planned, source, ordinal };
  });
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits }).format(value);
}

function buildTypeGroups(input: GlassDistributionPdfSource, entries: VerifiedPaneEntry[]) {
  const groups = new Map<string, { name: string; category: string; thickness: string; units: number; sheets: number; areaMm2: number }>();
  for (const entry of entries) {
    const pane = entry.source;
    const category = pane.category ? CATEGORY_LABELS[pane.category] ?? pane.category : "Tipo pendiente";
    const thickness = pane.thicknessMm == null ? "Espesor pendiente" : `${pane.thicknessMm} mm`;
    const key = [pane.productId, pane.category, pane.thicknessMm].join("|");
    const current = groups.get(key) ?? {
      name: formatGlassDisplayName(pane.displayName, pane.thicknessMm), category, thickness, units: 0, sheets: 0, areaMm2: 0,
    };
    current.units += 1;
    current.areaMm2 += entry.planned.rect.widthMm * entry.planned.rect.heightMm;
    groups.set(key, current);
  }
  for (const result of input.results) {
    for (const sheet of result.sheets) {
      const productId = sheet.panes[0]?.productId;
      const source = input.panes.find((pane) => pane.productId === productId);
      const key = source ? [source.productId, source.category, source.thicknessMm].join("|") : "unknown";
      const group = groups.get(key);
      if (group) group.sheets += 1;
    }
  }
  return [...groups.values()];
}

export function calculateGlassDistributionPlanSize(
  sheetWidthMm: number,
  sheetHeightMm: number,
  maxWidthMm = CONTENT_WIDTH_MM,
  maxHeightMm = GLASS_DISTRIBUTION_MAX_PLAN_HEIGHT_MM
) {
  if (!Number.isFinite(sheetWidthMm) || !Number.isFinite(sheetHeightMm) || sheetWidthMm <= 0 || sheetHeightMm <= 0) {
    return { widthMm: 0, heightMm: 0, scale: 0 };
  }
  const scale = Math.min(maxWidthMm / sheetWidthMm, maxHeightMm / sheetHeightMm);
  return { widthMm: sheetWidthMm * scale, heightMm: sheetHeightMm * scale, scale };
}

function dateLabel(value: Date | string | null | undefined, fallback: string) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatAreaM2(value: number) {
  return new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function simulationMetadata(source: GlassDistributionPdfSource) {
  return {
    companyName: source.clientName || "Cliente",
    quoteCode: source.quoteCode,
    workName: source.workName,
    issueDate: dateLabel(source.generatedAt ?? new Date(), "No disponible"),
    issueDateLabel: "PDF generado",
  };
}

function drawSimulationHeader(pdf: jsPDF, source: GlassDistributionPdfSource) {
  return drawFabricationPdfHeader(
    pdf,
    simulationMetadata(source),
    "Simulación de planchas de vidrio",
    source.logoDataUrl,
    "Cliente",
    "PRELIMINAR"
  );
}

function simulationMetrics(source: GlassDistributionPdfSource, entries: VerifiedPaneEntry[], sheets: GlassSheetPlan[]) {
  const includedReferences = new Set(entries.map((entry) => paneSourceKey(entry.source))).size;
  const totalReferences = source.coverage.completeReferenceCount + source.coverage.pendingReferenceCount;
  const usedAreaMm2 = entries.reduce((sum, entry) => sum + entry.planned.rect.widthMm * entry.planned.rect.heightMm, 0);
  const sheetAreaMm2 = sheets.reduce((sum, sheet) => sum + sheet.rawSheet.widthMm * sheet.rawSheet.heightMm, 0);
  const remainderMm2 = Math.max(0, sheetAreaMm2 - usedAreaMm2);
  return {
    includedReferences,
    totalReferences,
    units: entries.length,
    sheetCount: sheets.length,
    usedAreaMm2,
    sheetAreaMm2,
    utilizationPct: sheetAreaMm2 > 0 ? (usedAreaMm2 / sheetAreaMm2) * 100 : 0,
    remainderMm2,
  };
}

function drawSimulationOverview(
  pdf: jsPDF,
  source: GlassDistributionPdfSource,
  entries: VerifiedPaneEntry[],
  sheets: GlassSheetPlan[]
) {
  let y = drawSimulationHeader(pdf, source);
  const metrics = simulationMetrics(source, entries, sheets);
  const columns = [PAGE_MARGIN_MM, PAGE_MARGIN_MM + CONTENT_WIDTH_MM / 3, PAGE_MARGIN_MM + (CONTENT_WIDTH_MM * 2) / 3];
  const values = [
    ["Referencias incluidas", `${metrics.includedReferences} de ${metrics.totalReferences}`],
    ["Unidades físicas", formatNumber(metrics.units, 0)],
    ["Planchas en propuesta", formatNumber(metrics.sheetCount, 0)],
    ["Vidrio solicitado", `${formatAreaM2(metrics.usedAreaMm2 / 1_000_000)} m²`],
    ["Aprovechamiento geométrico", `${formatNumber(metrics.utilizationPct, 1)} %`],
    ["Restante geométrico estimado", `${formatAreaM2(metrics.remainderMm2 / 1_000_000)} m²`],
  ];

  pdf.setDrawColor(...RULE);
  pdf.setLineWidth(0.25);
  pdf.line(PAGE_MARGIN_MM, y, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y);
  y += 4;
  values.forEach(([label, value], index) => {
    const row = index < 3 ? 0 : 1;
    const column = index % 3;
    const x = columns[column]! + 2;
    const top = y + row * 13;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.setTextColor(...MUTED);
    pdf.text(label!, x, top + 3);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.2);
    pdf.setTextColor(...INK);
    pdf.text(value!, x, top + 9);
  });
  y += 27;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.2);
  pdf.setTextColor(...MUTED);
  const dateNote = source.quoteCreatedAt
    ? `Cotización creada: ${dateLabel(source.quoteCreatedAt, "fecha no disponible")} · PDF generado: ${dateLabel(source.generatedAt ?? new Date(), "fecha no disponible")}`
    : `La fecha indicada corresponde a la generación del PDF, no a la fecha de creación de la cotización.`;
  pdf.text(dateNote, PAGE_MARGIN_MM, y, { maxWidth: CONTENT_WIDTH_MM });
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.2);
  pdf.setTextColor(...MUTED);
  const excludedCount = source.previewExclusions?.length ?? 0;
  pdf.text(`Simulación: ${metrics.units} unidades físicas incluidas · ${excludedCount} referencias excluidas de ${metrics.totalReferences}.`, PAGE_MARGIN_MM, y, { maxWidth: CONTENT_WIDTH_MM });
  y += 4;
  pdf.setDrawColor(...RULE);
  pdf.line(PAGE_MARGIN_MM, y, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y);
  return y + 4;
}

function addSimulationContinuationPage(pdf: jsPDF, source: GlassDistributionPdfSource, sectionTitle?: string) {
  pdf.addPage("a4", "portrait");
  const y = drawFabricationPdfContinuationHeader(pdf, "Simulación de planchas de vidrio", source.quoteCode, source.logoDataUrl);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...MUTED);
  pdf.text("PRELIMINAR", PAGE_MARGIN_MM, y, { maxWidth: CONTENT_WIDTH_MM });
  return sectionTitle ? drawFabricationPdfSectionTitle(pdf, sectionTitle, y + 7) + 3 : y + 7;
}

function simulationProvenanceLabel(source: PaneSource) {
  if (source.dimensionProvenance === "manual") return "Medida manual final";
  if (source.dimensionProvenance === "validated_recipe") return "Geometría de receta · revisar";
  if (source.dimensionProvenance === "recipe_trace") return "Receta preliminar · revisar";
  if (source.dimensionProvenance === "legacy_snapshot") return "Snapshot histórico · revisar";
  return "Procedencia pendiente";
}

function compactSimulationReferences(labels: string[]) {
  const codes = labels.map((label) => label.match(/^([A-Za-z]+)(\d+)$/));
  if (codes.length > 1 && codes.every((match) => match && match[1] === codes[0]?.[1])) {
    const prefix = codes[0]![1]!;
    const numbers = codes.map((match) => Number(match![2]));
    const ranges: string[] = [];
    let start = numbers[0]!;
    let previous = start;
    for (const current of numbers.slice(1)) {
      if (current === previous + 1) {
        previous = current;
        continue;
      }
      ranges.push(start === previous ? `${prefix}${start}` : `${prefix}${start}-${prefix}${previous}`);
      start = current;
      previous = current;
    }
    ranges.push(start === previous ? `${prefix}${start}` : `${prefix}${start}-${prefix}${previous}`);
    return ranges.join(", ");
  }
  return labels.join(", ");
}

function drawSimulationDetailHeader(pdf: jsPDF, y: number) {
  const columns = { reference: PAGE_MARGIN_MM + 1, component: 41, glass: 83, dimensions: 119, units: 156, origin: 171 };
  pdf.setFillColor(...PALE);
  pdf.rect(PAGE_MARGIN_MM, y, CONTENT_WIDTH_MM, 7, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.1);
  pdf.setTextColor(...INK);
  pdf.text("Ref.", columns.reference, y + 4.8);
  pdf.text("Componente", columns.component, y + 4.8);
  pdf.text("Vidrio", columns.glass, y + 4.8);
  pdf.text("Medidas finales", columns.dimensions, y + 4.8);
  pdf.text("Unid.", columns.units, y + 4.8);
  pdf.text("Procedencia", columns.origin, y + 4.8);
  return y + 7;
}

function drawSimulationDetailRows(
  pdf: jsPDF,
  entries: VerifiedPaneEntry[],
  startY: number,
  sheetNumber: number,
  source: GlassDistributionPdfSource
) {
  const columns = { reference: PAGE_MARGIN_MM + 1, component: 41, glass: 83, dimensions: 119, units: 156, origin: 171 };
  let y = drawSimulationDetailHeader(pdf, startY);
  for (const [index, entry] of entries.entries()) {
    const pane = entry.source;
    const reference = `${shortComponentCode(pane.componentCode, index)} · ${entry.ordinal}`;
    const component = pane.componentName ? `${shortComponentCode(pane.componentCode, index)} · ${pane.componentName}` : shortComponentCode(pane.componentCode, index);
    const category = pane.category ? CATEGORY_LABELS[pane.category] ?? pane.category : "Tipo pendiente";
    const glass = `${formatGlassDisplayName(pane.displayName, pane.thicknessMm)} · ${category}${pane.thicknessMm == null ? "" : ` · ${formatNumber(pane.thicknessMm, 0)} mm`}`;
    const dimensions = `${formatNumber(entry.planned.rect.widthMm, 0)} × ${formatNumber(entry.planned.rect.heightMm, 0)} mm`;
    const origin = simulationProvenanceLabel(pane);
    const cellLines = [
      pdf.splitTextToSize(reference, 24) as string[],
      pdf.splitTextToSize(component, 40) as string[],
      pdf.splitTextToSize(glass, 34) as string[],
      [dimensions],
      ["1"],
      pdf.splitTextToSize(origin, 24) as string[],
    ];
    const rowHeight = Math.max(8.5, Math.max(...cellLines.map((lines) => lines.length)) * 3.4 + 3);
    if (y + rowHeight > CONTENT_BOTTOM_MM) {
      y = addSimulationContinuationPage(pdf, source, `Plancha ${sheetNumber} · detalle de paños`);
      y = drawSimulationDetailHeader(pdf, y);
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.setTextColor(...INK);
    const xs = [columns.reference, columns.component, columns.glass, columns.dimensions, columns.units, columns.origin];
    cellLines.forEach((lines, cellIndex) => pdf.text(lines, xs[cellIndex]!, y + 4.1, { lineHeightFactor: 1.05, maxWidth: cellIndex === 4 ? 10 : undefined }));
    pdf.setDrawColor(...RULE);
    pdf.line(PAGE_MARGIN_MM, y + rowHeight, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y + rowHeight);
    y += rowHeight;
  }
  return y;
}

function drawSimulationSheet(
  pdf: jsPDF,
  sheet: GlassSheetPlan,
  sheetNumber: number,
  source: GlassDistributionPdfSource,
  entries: VerifiedPaneEntry[],
  startY: number
) {
  const metaSpace = 34 + Math.min(entries.length, 5) * 9;
  const availablePlanHeight = Math.max(42, Math.min(GLASS_DISTRIBUTION_MAX_PLAN_HEIGHT_MM, CONTENT_BOTTOM_MM - startY - metaSpace));
  const drawing = calculateGlassDistributionPlanSize(sheet.rawSheet.widthMm, sheet.rawSheet.heightMm, CONTENT_WIDTH_MM, availablePlanHeight);
  const estimated = 12 + drawing.heightMm + 16 + Math.min(entries.length, 5) * 9;
  let y = startY;
  if (y + estimated > CONTENT_BOTTOM_MM && y > PAGE_CONTENT_TOP_MM + 10) {
    y = addSimulationContinuationPage(pdf, source);
    return drawSimulationSheet(pdf, sheet, sheetNumber, source, entries, y);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.1);
  pdf.setTextColor(...INK);
  pdf.text(`Plancha ${sheetNumber} · ${formatNumber(sheet.rawSheet.widthMm, 0)} × ${formatNumber(sheet.rawSheet.heightMm, 0)} mm`, PAGE_MARGIN_MM, y + 4);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  pdf.text("Ubicación geométrica; no indica secuencia de corte.", PAGE_WIDTH_MM - PAGE_MARGIN_MM, y + 4, { align: "right" });
  y += 8;

  const planX = (PAGE_WIDTH_MM - drawing.widthMm) / 2;
  const planY = y;
  pdf.setFillColor(250, 251, 253);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.5);
  pdf.rect(planX, planY, drawing.widthMm, drawing.heightMm, "FD");
  for (const [index, remnant] of sheet.remnants.entries()) {
    const x = planX + remnant.rect.xMm * drawing.scale;
    const top = planY + remnant.rect.yMm * drawing.scale;
    const width = remnant.rect.widthMm * drawing.scale;
    const height = remnant.rect.heightMm * drawing.scale;
    const shade = index % 2 === 0 ? 235 : 226;
    pdf.setFillColor(shade, shade, shade);
    pdf.setDrawColor(135, 147, 160);
    pdf.setLineWidth(0.3);
    pdf.rect(x, top, width, height, "FD");
  }
  for (const [index, planned] of sheet.panes.entries()) {
    const x = planX + planned.rect.xMm * drawing.scale;
    const top = planY + planned.rect.yMm * drawing.scale;
    const width = planned.rect.widthMm * drawing.scale;
    const height = planned.rect.heightMm * drawing.scale;
    pdf.setFillColor(index % 2 === 0 ? 225 : 235, index % 2 === 0 ? 237 : 243, index % 2 === 0 ? 249 : 251);
    pdf.setDrawColor(...INK);
    pdf.setLineWidth(0.4);
    pdf.rect(x, top, width, height, "FD");
    if (width >= 20 && height >= 18) {
      const entry = entries[index];
      const rawCode = entry ? shortComponentCode(entry.source.componentCode, index) : `Paño ${index + 1}`;
      const displayCode = rawCode.length > 12 ? `${rawCode.slice(0, 10)}…` : rawCode;
      const label = entry ? `${displayCode} · ${entry.ordinal}` : displayCode;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.6);
      pdf.setTextColor(...INK);
      pdf.text(label, x + width / 2, top + height / 2 - 1, { align: "center", maxWidth: width - 2 });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.8);
      pdf.text(`${formatNumber(planned.rect.widthMm, 0)} × ${formatNumber(planned.rect.heightMm, 0)}`, x + width / 2, top + height / 2 + 3, { align: "center", maxWidth: width - 2 });
    }
  }
  y = planY + drawing.heightMm + 4;
  const usedMm2 = sheet.areas.panesMm2;
  const remnantMm2 = Math.max(0, sheet.rawSheet.widthMm * sheet.rawSheet.heightMm - usedMm2);
  pdf.setFillColor(225, 237, 249);
  pdf.setDrawColor(...INK);
  pdf.rect(PAGE_MARGIN_MM, y, 3, 3, "FD");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.9);
  pdf.setTextColor(...MUTED);
  pdf.text("Vidrio solicitado", PAGE_MARGIN_MM + 4, y + 2.6);
  pdf.setFillColor(235, 235, 235);
  pdf.setDrawColor(135, 147, 160);
  pdf.rect(PAGE_MARGIN_MM + 34, y, 3, 3, "FD");
  pdf.text("Sobrante geométrico estimado", PAGE_MARGIN_MM + 38, y + 2.6);
  y += 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.8);
  pdf.setTextColor(...INK);
  pdf.text(`${formatAreaM2(usedMm2 / 1_000_000)} m² de vidrio solicitado`, PAGE_MARGIN_MM, y + 3);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...MUTED);
  pdf.text(`${formatAreaM2(remnantMm2 / 1_000_000)} m² restantes estimados`, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y + 3, { align: "right" });
  y += 7;
  const sheetEntries = entries.filter((entry) => sheet.panes.some((planned) => planned.paneUnitId === entry.planned.paneUnitId));
  y = drawSimulationDetailRows(pdf, sheetEntries, y, sheetNumber, source);
  return y;
}

function drawSimulationNotes(pdf: jsPDF, source: GlassDistributionPdfSource, startY: number) {
  const exclusionsByReason = new Map<string, { reason: string; references: string[] }>();
  for (const entry of source.previewExclusions ?? []) {
    const reasonKey = entry.reason.replace(/\bdel paño\s+\d+\b/gi, "del paño");
    const reasonLabel = entry.reason.replace(/\bdel paño\s+\d+\b/gi, "de los paños indicados");
    const group = exclusionsByReason.get(reasonKey) ?? { reason: reasonLabel, references: [] };
    const label = entry.displayName || entry.componentName;
    const genericLabel = label && /^(paño pendiente|componente excluido)\s+\d+$/i.test(label);
    group.references.push(label && !genericLabel ? `${entry.componentCode} · ${label}` : entry.componentCode);
    exclusionsByReason.set(reasonKey, group);
  }
  const notices = [
    ...(source.simulationWarnings ?? []),
    ...[...exclusionsByReason.values()].map(({ reason, references }) => `${compactSimulationReferences(references)}: ${reason}`),
  ];
  if (!notices.length) return startY;
  let y = startY;
  const headingHeight = 9;
  if (y + headingHeight > CONTENT_BOTTOM_MM) y = addSimulationContinuationPage(pdf, source, "Supuestos y exclusiones");
  else {
    y = drawFabricationPdfSectionTitle(pdf, "Supuestos y exclusiones", y + 2);
  }
  return drawSimulationNotices(pdf, source, notices, y);
}

async function createSimulationPdf(input: GlassDistributionPdfSource) {
  const validationError = validateGlassDistributionPdfInput(input);
  if (validationError) throw new Error(validationError);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const sheets = input.results.flatMap((result) => result.sheets);
  const entries = buildVerifiedEntries(input);
  let y = drawSimulationOverview(pdf, input, entries, sheets);
  for (const [index, sheet] of sheets.entries()) {
    const sheetEntries = entries.filter((entry) => sheet.panes.some((pane) => pane.paneUnitId === entry.planned.paneUnitId));
    const est = 13 + calculateGlassDistributionPlanSize(sheet.rawSheet.widthMm, sheet.rawSheet.heightMm).heightMm + Math.min(sheetEntries.length, 5) * 9 + 18;
    if (y + est > CONTENT_BOTTOM_MM) y = addSimulationContinuationPage(pdf, input);
    y = drawSimulationSheet(pdf, sheet, index + 1, input, sheetEntries, y);
  }
  y = drawSimulationNotes(pdf, input, y + 4);
  drawFabricationPdfFooters(pdf, input.quoteCode, "SIMULACIÓN DE PLANCHAS");
  return pdf;
}

function addContinuationPage(pdf: jsPDF, title: string, quoteCode: string, logoDataUrl?: string | null, sectionTitle?: string) {
  pdf.addPage("a4", "portrait");
  let y = drawFabricationPdfContinuationHeader(pdf, title, quoteCode, logoDataUrl);
  if (sectionTitle) y = drawFabricationPdfSectionTitle(pdf, sectionTitle, y);
  return y;
}

function drawSimulationNotices(pdf: jsPDF, source: GlassDistributionPdfSource, notices: string[], startY: number) {
  let y = startY;
  const lineHeightMm = 3.35;
  for (const notice of notices) {
    let lines = pdf.splitTextToSize(`- ${notice}`, CONTENT_WIDTH_MM) as string[];
    while (lines.length > 0) {
      if (y + lineHeightMm > CONTENT_BOTTOM_MM) {
        y = addSimulationContinuationPage(pdf, source, "Pendientes y supuestos · continuación");
      }
      const availableLines = Math.max(1, Math.floor((CONTENT_BOTTOM_MM - y - 2) / lineHeightMm));
      const pageLines = lines.slice(0, availableLines);
      lines = lines.slice(availableLines);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.4);
      pdf.setTextColor(...MUTED);
      pdf.text(pageLines, PAGE_MARGIN_MM, y, { lineHeightFactor: 1 });
      y += pageLines.length * lineHeightMm + 0.2;
    }
  }
  pdf.setTextColor(...INK);
  return y;
}

function drawSummaryPage(pdf: jsPDF, source: GlassDistributionPdfSource, entries: VerifiedPaneEntry[], totalSheets: number) {
  const metadata = {
    companyName: source.clientName || "Cliente",
    quoteCode: source.quoteCode,
    workName: source.workName,
    issueDate: "No informada",
  };
  const simulation = source.mode === "simulation";
  const pageTitle = simulation ? "Simulación geométrica de planchas de vidrio" : "Distribución de planchas de vidrio";
  let y = drawFabricationPdfHeader(pdf, metadata, pageTitle, source.logoDataUrl, "Cliente");
  if (simulation) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...MUTED);
    pdf.text("PRELIMINAR", PAGE_MARGIN_MM, y - 6, { maxWidth: CONTENT_WIDTH_MM });
    y += 5;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...INK);
  const totalUnits = entries.length;
  const typeCount = new Set(entries.map(({ source: pane }) => [pane.productId, pane.category, pane.thicknessMm].join("|")).values()).size;
  const totalReferences = source.coverage.completeReferenceCount + source.coverage.pendingReferenceCount;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...MUTED);
  pdf.text(simulation
    ? `Simulación: ${totalUnits} unidades físicas incluidas · ${source.previewExclusions?.length ?? 0} referencias excluidas de ${totalReferences}`
    : `Cobertura técnica completa: ${source.coverage.completeReferenceCount} de ${totalReferences} referencias · ${totalUnits} unidades físicas verificadas`, PAGE_MARGIN_MM, y - 4, { maxWidth: CONTENT_WIDTH_MM });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...INK);
  pdf.text(`Planchas necesarias: ${totalSheets} · Tipos de paño: ${typeCount} · Unidades físicas: ${totalUnits}`, PAGE_MARGIN_MM, y);
  y += 6;

  y = drawFabricationPdfSectionTitle(pdf, "Resumen por tipo y espesor", y);
  if (simulation) {
    const notices = [
      ...(source.simulationWarnings ?? []),
    ...(source.previewExclusions ?? []).map((entry) => `${entry.componentCode}${entry.displayName ? ` · ${entry.displayName}` : entry.componentName ? ` · ${entry.componentName}` : ""}: ${entry.reason}`),
    ];
    y = drawSimulationNotices(pdf, source, notices, y);
  }
  const groups = buildTypeGroups(source, entries);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.2);
  for (const group of groups) {
    const areaM2 = group.areaMm2 / 1_000_000;
    const text = `${group.name} · ${group.category} · ${group.thickness} · ${group.units} ${group.units === 1 ? "unidad" : "unidades"} · ${group.sheets} ${group.sheets === 1 ? "plancha" : "planchas"} · ${formatNumber(areaM2)} m²`;
    const lines = pdf.splitTextToSize(text, CONTENT_WIDTH_MM) as string[];
    const height = Math.max(7, lines.length * 4.1 + 2);
    if (y + height > CONTENT_BOTTOM_MM) y = addContinuationPage(pdf, pageTitle, source.quoteCode, source.logoDataUrl, "Resumen por tipo y espesor · continuación");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.2);
    pdf.setTextColor(...INK);
    pdf.text(lines, PAGE_MARGIN_MM, y);
    y += height;
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.2);
    pdf.line(PAGE_MARGIN_MM, y - 1.5, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y - 1.5);
  }

  return y;
}

function drawPreliminaryWarning(pdf: jsPDF, simulation = false) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(simulation ? 9 : 8);
  if (simulation) pdf.setTextColor(...MUTED);
  else pdf.setTextColor(...INK);
  pdf.text(simulation
    ? "Referencia geométrica preliminar. La pauta operativa se revisa por separado."
    : "Distribución preliminar. Confirmar medidas y tolerancias con el proveedor antes de cortar.", PAGE_MARGIN_MM, 277, {
    maxWidth: CONTENT_WIDTH_MM,
  });
}

function buildSheetRows(
  sheet: GlassSheetPlan,
  paneSources: PaneSource[],
  paneOrdinals: ReadonlyMap<string, number>
): SheetRow[] {
  return sheet.panes.map((plannedPane, index) => {
    const source = sourceForPlannedPane(plannedPane, paneSources);
    const ordinal = paneOrdinals.get(plannedPane.paneUnitId) ?? index + 1;
    const code = shortComponentCode(source?.componentCode ?? plannedPane.componentCode, ordinal - 1);
    return {
      reference: `${code} · Paño ${ordinal}`,
      component: source?.componentName ? `${code} · ${source.componentName}` : code,
      dimensions: `${formatNumber(plannedPane.rect.widthMm, 0)} × ${formatNumber(plannedPane.rect.heightMm, 0)} mm`,
      quantity: "1",
    };
  });
}

function drawSheetTableHeader(pdf: jsPDF, y: number) {
  const columns = { reference: PAGE_MARGIN_MM, component: 49, dimensions: 126, quantity: PAGE_WIDTH_MM - PAGE_MARGIN_MM };
  pdf.setFillColor(...PALE);
  pdf.roundedRect(PAGE_MARGIN_MM, y, CONTENT_WIDTH_MM, 8, 1, 1, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...INK);
  pdf.text("Paño", columns.reference + 2, y + 5.3);
  pdf.text("Componente de origen", columns.component + 2, y + 5.3);
  pdf.text("Dimensiones", columns.dimensions + 2, y + 5.3);
  pdf.text("Unid.", columns.quantity, y + 5.3, { align: "right" });
  return y + 8;
}

function drawSheetRows(pdf: jsPDF, rows: SheetRow[], startY: number, sheetNumber: number, source: GlassDistributionPdfSource) {
  let y = drawSheetTableHeader(pdf, startY);
  const columns = { reference: PAGE_MARGIN_MM, component: 49, dimensions: 126, quantity: PAGE_WIDTH_MM - PAGE_MARGIN_MM };
  for (const row of rows) {
    const componentLines = pdf.splitTextToSize(row.component, columns.dimensions - columns.component - 5) as string[];
    const rowHeight = Math.max(9, componentLines.length * 3.7 + 4);
    if (y + rowHeight > CONTENT_BOTTOM_MM) {
      y = addContinuationPage(pdf, "Distribución de planchas de vidrio", source.quoteCode, source.logoDataUrl, `Plancha ${sheetNumber} · piezas siguientes`);
      y = drawSheetTableHeader(pdf, y);
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.3);
    pdf.setTextColor(...INK);
    pdf.text(row.reference, columns.reference + 2, y + 5.4);
    pdf.text(componentLines, columns.component + 2, y + 4.5, { lineHeightFactor: 1.1 });
    pdf.text(row.dimensions, columns.dimensions + 2, y + 5.4);
    pdf.text(row.quantity, columns.quantity, y + 5.4, { align: "right" });
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.2);
    pdf.line(PAGE_MARGIN_MM, y + rowHeight, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y + rowHeight);
    y += rowHeight;
  }
  return y;
}

function drawSheet(
  pdf: jsPDF,
  sheet: GlassSheetPlan,
  pageIndex: number,
  totalSheets: number,
  source: GlassDistributionPdfSource,
  paneOrdinals: ReadonlyMap<string, number>,
  startY?: number
) {
  const metadata = {
    companyName: source.clientName || "Cliente",
    quoteCode: source.quoteCode,
    workName: source.workName,
    issueDate: "No informada",
  };
  const title = source.mode === "simulation" ? "Simulación geométrica de planchas de vidrio" : "Distribución de planchas de vidrio";
  let y = startY ?? drawFabricationPdfHeader(pdf, metadata, title, source.logoDataUrl, "Cliente");
  const plannedPane = sheet.panes[0];
  const firstSource = plannedPane ? sourceForPlannedPane(plannedPane, source.panes) : null;
  const material = formatGlassDisplayName(firstSource?.displayName, firstSource?.thicknessMm);
  const thickness = firstSource?.thicknessMm == null ? "Espesor pendiente" : `${firstSource.thicknessMm} mm`;
  const category = firstSource?.category ? CATEGORY_LABELS[firstSource.category] ?? firstSource.category : "";

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.6);
  pdf.setTextColor(...INK);
  pdf.text(`${material} · ${thickness}${category ? ` · ${category}` : ""}`, PAGE_MARGIN_MM, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(`Plancha ${pageIndex + 1} de ${totalSheets}`, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y, { align: "right" });
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.2);
  pdf.setTextColor(...INK);
  pdf.text(`Formato completo: ${formatNumber(sheet.rawSheet.widthMm, 0)} × ${formatNumber(sheet.rawSheet.heightMm, 0)} mm`, PAGE_MARGIN_MM, y);
  y += 7;

  const drawing = calculateGlassDistributionPlanSize(sheet.rawSheet.widthMm, sheet.rawSheet.heightMm);
  const planX = (PAGE_WIDTH_MM - drawing.widthMm) / 2;
  const planY = y;
  const scale = drawing.scale;
  pdf.setFillColor(250, 251, 253);
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.55);
  pdf.rect(planX, planY, drawing.widthMm, drawing.heightMm, "FD");

  for (const [remnantIndex, remnant] of sheet.remnants.entries()) {
    const x = planX + remnant.rect.xMm * scale;
    const remnantY = planY + remnant.rect.yMm * scale;
    const width = remnant.rect.widthMm * scale;
    const height = remnant.rect.heightMm * scale;
    const shade = remnantIndex % 2 === 0 ? 235 : 226;
    pdf.setFillColor(shade, shade, shade);
    pdf.setDrawColor(90, 104, 120);
    pdf.setLineWidth(0.35);
    pdf.rect(x, remnantY, width, height, "FD");
    if (width >= 19 && height >= 11) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.3);
      pdf.setTextColor(37, 49, 63);
      pdf.text(`${formatNumber(remnant.rect.widthMm, 0)} × ${formatNumber(remnant.rect.heightMm, 0)} mm`, x + width / 2, remnantY + height / 2, {
        align: "center",
        maxWidth: Math.max(12, width - 2),
      });
    }
  }

  for (const [paneIndex, planned] of sheet.panes.entries()) {
    const rect = planned.rect;
    const x = planX + rect.xMm * scale;
    const paneY = planY + rect.yMm * scale;
    const width = rect.widthMm * scale;
    const height = rect.heightMm * scale;
    const shade = paneIndex % 2 === 0 ? [222, 235, 248] : [234, 241, 249];
    pdf.setFillColor(shade[0]!, shade[1]!, shade[2]!);
    pdf.setDrawColor(...INK);
    pdf.setLineWidth(0.45);
    pdf.rect(x, paneY, width, height, "FD");
    if (width >= 17 && height >= 14) {
      const sourcePane = sourceForPlannedPane(planned, source.panes);
      const ordinal = paneOrdinals.get(planned.paneUnitId) ?? paneIndex + 1;
      const code = shortComponentCode(sourcePane?.componentCode ?? planned.componentCode, ordinal - 1);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(Math.min(7.2, Math.max(6, Math.min(width, height) * 0.18)));
      pdf.setTextColor(...INK);
      pdf.text(`${code} · ${ordinal}`, x + width / 2, paneY + height / 2 - 1.2, { align: "center", maxWidth: width - 2 });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.4);
      pdf.text(`${formatNumber(rect.widthMm, 0)} × ${formatNumber(rect.heightMm, 0)}`, x + width / 2, paneY + height / 2 + 3, { align: "center", maxWidth: width - 2 });
    }
  }

  y = planY + drawing.heightMm + 7;
  const panesAreaM2 = sheet.areas.panesMm2 / 1_000_000;
  const remnantArea = sheet.remnants.reduce((sum, remnant) => sum + remnant.areaMm2, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK);
  pdf.text(`${sheet.panes.length} ${sheet.panes.length === 1 ? "paño" : "paños"} · ${formatNumber(panesAreaM2)} m² solicitados`, PAGE_MARGIN_MM, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...MUTED);
  pdf.text(`${sheet.remnants.length} sobrantes geométricos · ${formatNumber(remnantArea / 1_000_000)} m²`, PAGE_WIDTH_MM - PAGE_MARGIN_MM, y, { align: "right" });
  y += 6;

  if (sheet.remnants.length > 0) {
    const remnantLabel = `Sobrantes: ${sheet.remnants.map((remnant) => `${formatNumber(remnant.rect.widthMm, 0)} × ${formatNumber(remnant.rect.heightMm, 0)} mm`).join(" · ")}`;
    const lines = pdf.splitTextToSize(remnantLabel, CONTENT_WIDTH_MM) as string[];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(lines, PAGE_MARGIN_MM, y);
    y += lines.length * 3.7 + 2;
  }

  const unknownOrientation = sheet.panes.some((pane) => sourceForPlannedPane(pane, source.panes)?.pieceOrientation === "unknown");
  const assumptions = unknownOrientation
    ? "Despuntes y separación asumidos: 0 mm · sin giro · orientación de los paños pendiente."
    : "Despuntes y separación asumidos: 0 mm · plancha sin giro.";
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.8);
  pdf.setTextColor(...MUTED);
  pdf.text(assumptions, PAGE_MARGIN_MM, y);
  y += 6;

  const rows = buildSheetRows(sheet, source.panes, paneOrdinals);
  drawSheetRows(pdf, rows, y, pageIndex + 1, source);
  if (source.mode !== "simulation") drawPreliminaryWarning(pdf);
  return y;
}

function estimateSheetContentHeight(sheet: GlassSheetPlan) {
  const drawing = calculateGlassDistributionPlanSize(sheet.rawSheet.widthMm, sheet.rawSheet.heightMm);
  return 23 + drawing.heightMm + (sheet.remnants.length > 0 ? 15 : 0) + 16 + 8 + sheet.panes.length * 10;
}

export async function createGlassDistributionPdf(input: GlassDistributionPdfSource) {
  if (!input.mode) input = { ...input, mode: "provider" };
  if (input.mode === "simulation") {
    input = { ...input, generatedAt: input.generatedAt ?? new Date() };
    return createSimulationPdf(input);
  }
  const validationError = validateGlassDistributionPdfInput(input);
  if (validationError) throw new Error(validationError);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const sheets = input.results.flatMap((result) => result.sheets);
  const entries = buildVerifiedEntries(input);
  const paneOrdinals = new Map<string, number>();
  const componentCounts = new Map<string, number>();
  for (const pane of sheets.flatMap((sheet) => sheet.panes)) {
    const count = (componentCounts.get(pane.quoteItemId) ?? 0) + 1;
    componentCounts.set(pane.quoteItemId, count);
    paneOrdinals.set(pane.paneUnitId, count);
  }
  const summaryBottom = drawSummaryPage(pdf, input, entries, sheets.length);
  const firstSheet = sheets[0];
  if (firstSheet && summaryBottom + estimateSheetContentHeight(firstSheet) <= CONTENT_BOTTOM_MM - 2) {
    drawSheet(pdf, firstSheet, 0, sheets.length, input, paneOrdinals, summaryBottom + 4);
  } else if (firstSheet) {
    pdf.addPage("a4", "portrait");
    drawSheet(pdf, firstSheet, 0, sheets.length, input, paneOrdinals);
  }
  sheets.slice(1).forEach((sheet, index) => {
    pdf.addPage("a4", "portrait");
    drawSheet(pdf, sheet, index + 1, sheets.length, input, paneOrdinals);
  });
  drawFabricationPdfFooters(pdf, input.quoteCode);
  return pdf;
}
