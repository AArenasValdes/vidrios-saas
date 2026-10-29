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
  return clean && clean.length <= 22 && !/^[0-9a-f-]{28,}$/i.test(clean) ? clean : `Componente ${index + 1}`;
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

export function calculateGlassDistributionPlanSize(sheetWidthMm: number, sheetHeightMm: number, maxWidthMm = CONTENT_WIDTH_MM) {
  if (!Number.isFinite(sheetWidthMm) || !Number.isFinite(sheetHeightMm) || sheetWidthMm <= 0 || sheetHeightMm <= 0) {
    return { widthMm: 0, heightMm: 0, scale: 0 };
  }
  const scale = Math.min(maxWidthMm / sheetWidthMm, GLASS_DISTRIBUTION_MAX_PLAN_HEIGHT_MM / sheetHeightMm);
  return { widthMm: sheetWidthMm * scale, heightMm: sheetHeightMm * scale, scale };
}

function addContinuationPage(pdf: jsPDF, title: string, quoteCode: string, logoDataUrl?: string | null, sectionTitle?: string) {
  pdf.addPage("a4", "portrait");
  let y = drawFabricationPdfContinuationHeader(pdf, title, quoteCode, logoDataUrl);
  if (sectionTitle) y = drawFabricationPdfSectionTitle(pdf, sectionTitle, y);
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
    pdf.setTextColor(176, 25, 25);
    pdf.text("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE", PAGE_MARGIN_MM, y - 6, { maxWidth: CONTENT_WIDTH_MM });
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
      ...(source.previewExclusions ?? []).map((entry) => `${entry.componentCode}${entry.displayName ? ` · ${entry.displayName}` : ""}: ${entry.reason}`),
    ];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(176, 25, 25);
    const shown = notices.slice(0, 8);
    if (notices.length > shown.length) shown.push(`${notices.length - shown.length} advertencias adicionales; revisar en Ventora.`);
    for (const notice of shown) {
      const lines = pdf.splitTextToSize(`- ${notice}`, CONTENT_WIDTH_MM) as string[];
      pdf.text(lines, PAGE_MARGIN_MM, y);
      y += lines.length * 3.8 + 1;
    }
    pdf.setTextColor(...INK);
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
  if (simulation) pdf.setTextColor(176, 25, 25);
  else pdf.setTextColor(...INK);
  pdf.text(simulation
    ? "SIMULACIÓN GEOMÉTRICA — NO APTO PARA CORTE. No representa reglas físicas del taller."
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
  drawPreliminaryWarning(pdf, source.mode === "simulation");
  return y;
}

function estimateSheetContentHeight(sheet: GlassSheetPlan) {
  const drawing = calculateGlassDistributionPlanSize(sheet.rawSheet.widthMm, sheet.rawSheet.heightMm);
  return 23 + drawing.heightMm + (sheet.remnants.length > 0 ? 15 : 0) + 16 + 8 + sheet.panes.length * 10;
}

export async function createGlassDistributionPdf(input: GlassDistributionPdfSource) {
  if (!input.mode) input = { ...input, mode: "provider" };
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
