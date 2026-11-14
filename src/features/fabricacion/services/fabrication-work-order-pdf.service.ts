import { jsPDF } from "jspdf";

import type {
  FabricationWorkOrder,
  WorkOrderComponentSummary,
  WorkOrderCut,
  WorkOrderCutGroup,
} from "./fabrication-work-order.service";
import { workOrderPriceSource } from "./fabrication-work-order.service";
import {
  DISTRIBUCION_REFERENCIAL_LABEL,
  DISTRIBUCION_REFERENCIAL_NOTA,
  DISTRIBUCION_REFERENCIAL_PIE,
  isReferentialOnlyWorkOrder,
} from "./fabricacion-aviso-presentacion.service";
import { calculateProfileReferenceTotal, resolveProfileSupplierPrice } from "./work-materials-price-reference.service";
import {
  drawFabricationPdfContinuationHeader,
  drawFabricationPdfFooters,
  drawFabricationPdfHeader,
  drawFabricationPdfSectionTitle,
  FABRICATION_PDF_COLORS,
} from "./fabrication-pdf-document-style.service";

export type FabricationWorkOrderPdfMetadata = {
  companyName: string;
  quoteCode: string;
  workName: string;
  issueDate: string;
};

type Column = { title: string; width: number; align?: "left" | "right" | "center" };
type Row = { cells: string[] };
type TableStyleOptions = {
  compact?: boolean;
  boldFirstLineColumns?: number[];
  mutedSecondaryColumns?: number[];
};
type StyledLine = { text: string; bold: boolean; muted: boolean };

const PROFILE_CUT_TECHNICAL_PENDING_PREFIXES = [
  "coverage:",
  "coverage-joint-plan",
  "joint-plan-preliminary-geometry",
  "structural-geometry",
  "historical-cuts-review",
  "mixed-preliminary-bar:",
  "bar-distribution",
  "cut-plan",
  "cut:",
  "cut-physics",
  "presentation:",
  "length:",
] as const;

function isProfileCutTechnicalPending(key: string): boolean {
  return PROFILE_CUT_TECHNICAL_PENDING_PREFIXES.some((prefix) => key.startsWith(prefix));
}
export type FabricationWorkOrderPdfKind = "combined" | "glass-order" | "profile-cuts";

const PAGE_WIDTH = 210;
const MARGIN = 14;
const CONTENT_BOTTOM = 278;
const INK = FABRICATION_PDF_COLORS.ink;
const MUTED = FABRICATION_PDF_COLORS.muted;
const RULE = FABRICATION_PDF_COLORS.rule;
const HEADER = FABRICATION_PDF_COLORS.pale;

function clean(value: string | null | undefined, fallback = "Pendiente") {
  return value?.trim() || fallback;
}

function mm(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value >= 0
    ? `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value)} mm`
    : "Pendiente";
}

function money(value: number | null | undefined, currency: string) {
  return value != null && Number.isFinite(value)
    ? new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
    : "Pendiente";
}

function area(value: number | null | undefined) {
  return value != null && Number.isFinite(value)
    ? `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value)} m²`
    : "Pendiente";
}

function wrapped(pdf: jsPDF, value: string, width: number) {
  return pdf.splitTextToSize(value || "—", Math.max(8, width - 4)) as string[];
}

function newPage(pdf: jsPDF, title: string, quoteCode: string, logoDataUrl?: string | null) {
  pdf.addPage("a4", "portrait");
  return drawFabricationPdfContinuationHeader(pdf, title, quoteCode, logoDataUrl);
}

type ResolvedTableMetrics = {
  compact: boolean;
  fontSize: number;
  headHeight: number;
  headFontSize: number;
  lineStep: number;
  minRowHeight: number;
  verticalPad: number;
  firstBaseline: number;
  topGap: number;
  sectionStep: number;
  sectionFontSize: number;
  boldFirstLineColumns: Set<number>;
  mutedSecondaryColumns: Set<number>;
};

function resolveTableMetrics(style?: TableStyleOptions): ResolvedTableMetrics {
  const compact = Boolean(style?.compact);
  return {
    compact,
    fontSize: compact ? 8.2 : 9.2,
    headHeight: compact ? 7.2 : 9,
    headFontSize: compact ? 8.1 : 9,
    lineStep: compact ? 3.55 : 4.05,
    minRowHeight: compact ? 8 : 11,
    verticalPad: compact ? 3 : 4,
    firstBaseline: compact ? 4 : 4.7,
    topGap: compact ? 2.2 : 4,
    sectionStep: compact ? 4.2 : 5,
    sectionFontSize: compact ? 10 : 11.5,
    boldFirstLineColumns: new Set(style?.boldFirstLineColumns ?? []),
    mutedSecondaryColumns: new Set(style?.mutedSecondaryColumns ?? []),
  };
}

function sectionTitle(pdf: jsPDF, title: string, y: number, metrics?: ResolvedTableMetrics) {
  if (!metrics?.compact) {
    return drawFabricationPdfSectionTitle(pdf, title, y);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(metrics.sectionFontSize);
  pdf.setTextColor(...INK);
  pdf.text(title, MARGIN, y + 2.8);
  return y + metrics.sectionStep;
}

function tableHead(pdf: jsPDF, columns: Column[], y: number, metrics: ResolvedTableMetrics) {
  pdf.setFillColor(...HEADER);
  pdf.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, metrics.headHeight, 1.2, 1.2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(metrics.headFontSize);
  pdf.setTextColor(...INK);
  const textY = y + (metrics.compact ? 4.8 : 5.8);
  let x = MARGIN;
  for (const column of columns) {
    pdf.text(column.title, column.align === "right" ? x + column.width - 2 : x + 2, textY, {
      align: column.align === "right" ? "right" : "left",
    });
    x += column.width;
  }
  return y + metrics.headHeight;
}

function wrapStyledCellLines(
  pdf: jsPDF,
  cell: string,
  columnWidth: number,
  fontSize: number,
  boldFirstLine: boolean,
  mutedSecondary: boolean
): StyledLine[] {
  const maxWidth = Math.max(8, columnWidth - 4);
  const rawLines = (cell || "—").split("\n");
  const styled: StyledLine[] = [];
  rawLines.forEach((rawLine, rawIndex) => {
    const isFirst = rawIndex === 0;
    const bold = boldFirstLine && isFirst;
    const muted = mutedSecondary && !isFirst;
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(fontSize);
    const parts = pdf.splitTextToSize(rawLine || " ", maxWidth) as string[];
    for (const part of parts) {
      styled.push({ text: part, bold, muted });
    }
  });
  return styled.length > 0 ? styled : [{ text: "—", bold: boldFirstLine, muted: false }];
}

function measureStyledRowHeight(cellLines: StyledLine[][], metrics: ResolvedTableMetrics): number {
  const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
  return Math.max(metrics.minRowHeight, maxLines * metrics.lineStep + metrics.verticalPad);
}

function drawStyledTableRow(
  pdf: jsPDF,
  cellLines: StyledLine[][],
  columns: Column[],
  y: number,
  height: number,
  index: number,
  metrics: ResolvedTableMetrics
) {
  if (index % 2 === 1) {
    pdf.setFillColor(248, 250, 253);
    pdf.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, height, "F");
  }
  pdf.setDrawColor(...RULE);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN, y + height, PAGE_WIDTH - MARGIN, y + height);
  pdf.setFontSize(metrics.fontSize);
  let x = MARGIN;
  for (let i = 0; i < columns.length; i += 1) {
    const column = columns[i]!;
    const lines = cellLines[i] ?? [];
    const xPos = column.align === "right" ? x + column.width - 2 : x + 2;
    const align = column.align === "right" ? "right" : "left";
    lines.forEach((line, lineIndex) => {
      pdf.setFont("helvetica", line.bold ? "bold" : "normal");
      pdf.setTextColor(...(line.muted ? MUTED : INK));
      pdf.text(line.text, xPos, y + metrics.firstBaseline + lineIndex * metrics.lineStep, { align });
    });
    x += column.width;
  }
  return y + height;
}

function drawTable(
  pdf: jsPDF,
  title: string,
  columns: Column[],
  values: Row[],
  startY: number,
  empty: string,
  runningTitle: string,
  quoteCode: string,
  logoDataUrl?: string | null,
  style?: TableStyleOptions
) {
  const metrics = resolveTableMetrics(style);
  const rows = values.length ? values : [{ cells: [empty, ...columns.slice(1).map(() => "—")] }];
  const wrappedRows = rows.map((row) =>
    columns.map((column, colIndex) =>
      wrapStyledCellLines(
        pdf,
        row.cells[colIndex] ?? "—",
        column.width,
        metrics.fontSize,
        metrics.boldFirstLineColumns.has(colIndex),
        metrics.mutedSecondaryColumns.has(colIndex)
      )
    )
  );
  let y = startY + metrics.topGap;
  const firstRowHeight = measureStyledRowHeight(wrappedRows[0]!, metrics);
  const firstRowFitsOnFreshPage = 33 + metrics.sectionStep + metrics.headHeight + firstRowHeight <= CONTENT_BOTTOM;
  const minimumFragmentHeight = metrics.compact ? 10 : 13;
  if (y + metrics.sectionStep + metrics.headHeight + firstRowHeight > CONTENT_BOTTOM && firstRowFitsOnFreshPage) {
    y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  } else if (y + metrics.sectionStep + metrics.headHeight + minimumFragmentHeight > CONTENT_BOTTOM) {
    y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  }
  y = tableHead(pdf, columns, sectionTitle(pdf, title, y, metrics), metrics);
  wrappedRows.forEach((cellLines, index) => {
    const wholeRowHeight = measureStyledRowHeight(cellLines, metrics);
    if (y + wholeRowHeight > CONTENT_BOTTOM) {
      const fitsOnFreshPage = 33 + metrics.sectionStep + metrics.headHeight + wholeRowHeight <= CONTENT_BOTTOM;
      const linesAvailable = Math.floor((CONTENT_BOTTOM - y - metrics.verticalPad) / metrics.lineStep);
      if (fitsOnFreshPage || linesAvailable < 2) {
        y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
        y = tableHead(pdf, columns, sectionTitle(pdf, `${title} · continuación`, y, metrics), metrics);
      }
    }
    if (y + wholeRowHeight <= CONTENT_BOTTOM) {
      y = drawStyledTableRow(pdf, cellLines, columns, y, wholeRowHeight, index, metrics);
      return;
    }
    const totalLines = Math.max(...cellLines.map((lines) => lines.length));
    let lineOffset = 0;
    while (lineOffset < totalLines) {
      const linesAvailable = Math.floor((CONTENT_BOTTOM - y - metrics.verticalPad) / metrics.lineStep);
      if (linesAvailable < 2) {
        y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
        y = tableHead(pdf, columns, sectionTitle(pdf, `${title} · continuación`, y, metrics), metrics);
        continue;
      }
      const lineCount = Math.min(totalLines - lineOffset, linesAvailable);
      const fragment = cellLines.map((lines) => {
        const sliced = lines.slice(lineOffset, lineOffset + lineCount);
        return sliced.length > 0 ? sliced : [{ text: " ", bold: false, muted: false }];
      });
      const height = measureStyledRowHeight(fragment, metrics);
      if (y + height > CONTENT_BOTTOM) {
        y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
        y = tableHead(pdf, columns, sectionTitle(pdf, `${title} · continuación`, y, metrics), metrics);
        continue;
      }
      y = drawStyledTableRow(pdf, fragment, columns, y, height, index, metrics);
      lineOffset += lineCount;
    }
  });
  return y;
}
function drawNote(pdf: jsPDF, value: string, y: number, runningTitle: string, quoteCode: string, logoDataUrl?: string | null) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.2);
  const lines = wrapped(pdf, value, PAGE_WIDTH - MARGIN * 2);
  const height = lines.length * 4.2 + 4;
  if (y + height > CONTENT_BOTTOM) y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  pdf.setTextColor(...MUTED);
  pdf.text(lines, MARGIN, y + 5, { lineHeightFactor: 1.2 });
  return y + height;
}

function drawPreliminaryWarning(pdf: jsPDF, y: number, runningTitle: string, quoteCode: string, logoDataUrl?: string | null) {
  const message = "DOCUMENTO PARCIAL · NO APTO PARA FABRICACIÓN. Acristalamiento pendiente; estos cortes estructurales no constituyen una pauta operativa.";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  const lines = wrapped(pdf, message, PAGE_WIDTH - MARGIN * 2);
  const height = lines.length * 4.4 + 8;
  if (y + height > CONTENT_BOTTOM) y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  pdf.setFillColor(255, 243, 230);
  pdf.setDrawColor(191, 82, 34);
  pdf.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, height, 1.2, 1.2, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(139, 48, 17);
  pdf.text(lines, MARGIN + 3, y + 5, { lineHeightFactor: 1.2 });
  return y + height + 3;
}

function drawDocumentPartialWarning(pdf: jsPDF, y: number, runningTitle: string, quoteCode: string, logoDataUrl?: string | null) {
  const message = "DOCUMENTO PARCIAL · NO APTO PARA FABRICACIÓN. Hay componentes sin pauta completa o con identidad técnica por revisar.";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  const lines = wrapped(pdf, message, PAGE_WIDTH - MARGIN * 2);
  const height = lines.length * 4.4 + 8;
  if (y + height > CONTENT_BOTTOM) y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  pdf.setFillColor(255, 243, 230);
  pdf.setDrawColor(191, 82, 34);
  pdf.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, height, 1.2, 1.2, "FD");
  pdf.setTextColor(139, 48, 17);
  pdf.text(lines, MARGIN + 3, y + 5, { lineHeightFactor: 1.2 });
  return y + height;
}

function normalizeComparisonText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function shouldShowProfileCutFunction(profileName: string, functionName: string): boolean {
  const fnNorm = normalizeComparisonText(functionName);
  if (!fnNorm || fnNorm === "pendiente") return false;
  const profileNorm = normalizeComparisonText(profileName);
  if (!profileNorm) return true;
  if (fnNorm === profileNorm) return false;
  if (profileName.includes("/")) return true;
  if (profileNorm.includes(fnNorm)) return false;
  const fnWords = fnNorm.split(" ").filter((word) => word.length >= 3);
  if (fnWords.length > 0 && fnWords.every((word) => profileNorm.includes(word))) {
    return false;
  }
  return true;
}

function formatProfileCutLine(cut: WorkOrderCut, profileName: string): string {
  const base = `${clean(cut.itemCode, "Sin ítem")}: ${cut.quantity} × ${mm(cut.lengthMm)}`;
  return shouldShowProfileCutFunction(profileName, cut.functionName)
    ? `${base} · ${cut.functionName.trim()}`
    : base;
}

function formatProfileCutGroupBarCell(
  group: WorkOrderCutGroup,
  pendingBarLabel = "Distribución por tira pendiente"
): string {
  const code = clean(group.technicalCode, "Código pendiente");
  const name = clean(group.profileName, "Perfil");
  const header = name.toLowerCase().startsWith(code.toLowerCase()) ? name : `${code} · ${name}`;
  const finish = group.finish?.trim();
  const showFinish = Boolean(
    finish &&
    normalizeComparisonText(finish) !== "pendiente" &&
    !normalizeComparisonText(name).includes(normalizeComparisonText(finish))
  );
  const barLabel = group.barIndex == null
    ? pendingBarLabel
    : `Tira ${group.barIndex} · ${mm(group.commercialLengthMm)}`;
  return `${header}\n${showFinish ? `${barLabel} · ${finish}` : barLabel}`;
}

function formatProfileCutRemnantCell(
  group: WorkOrderCutGroup,
  cutPlanPhysicalState: FabricationWorkOrder["cutPlanPhysicalState"]
): string {
  if (group.barIndex == null || group.theoreticalRemnantMm == null) {
    return "Pendiente";
  }
  const stateLabel = cutPlanPhysicalState === "confirmada" ? "Confirmado" : "Teórico";
  return `${mm(group.theoreticalRemnantMm)}\n${stateLabel}`;
}

function resolveComponentsForProfileCuts(order: FabricationWorkOrder): WorkOrderComponentSummary[] {
  const existing = order.components ?? [];
  const knownCodes = new Set(existing.map((component) => component.code));
  const byCode = new Map<string, { code: string; name: string | null; line: string | null; finish: string | null; ambiguousFinish?: boolean }>();
  const groups = [...order.cutGroups, ...order.preliminaryCutGroups, ...order.reviewCutGroups];
  for (const group of groups) {
    const finishRaw = group.finish?.trim();
    const finish = finishRaw && normalizeComparisonText(finishRaw) !== "pendiente" ? finishRaw : null;
    const lineRaw = group.line?.trim();
    const line = lineRaw && normalizeComparisonText(lineRaw) !== "pendiente" && normalizeComparisonText(lineRaw) !== "linea pendiente" ? lineRaw : null;
    for (const cut of group.cuts) {
      const code = cut.itemCode?.trim();
      if (!code || knownCodes.has(code)) continue;
      const nameRaw = cut.component?.trim();
      const name = nameRaw && normalizeComparisonText(nameRaw) !== "componente pendiente" ? nameRaw : null;
      const existing = byCode.get(code);
      if (!existing) {
        byCode.set(code, { code, name, line, finish });
      } else {
        if (!existing.name && name) existing.name = name;
        if (!existing.line && line) existing.line = line;
        if (finish && existing.finish && existing.finish !== finish) {
          existing.ambiguousFinish = true;
        } else if (finish && !existing.finish && !existing.ambiguousFinish) {
          existing.finish = finish;
        }
      }
    }
  }
  return [
    ...existing,
    ...Array.from(byCode.values()).map((entry) => ({
      code: entry.code,
      name: entry.name,
      line: entry.line,
      variant: null,
      dimensionsMm: null,
      quantity: null,
      finish: entry.ambiguousFinish ? null : entry.finish,
    })),
  ];
}

function formatDimensionNumber(value: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
}

function formatComponentDetails(component: WorkOrderComponentSummary): string {
  const parts: string[] = [];
  const pushUnique = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const norm = normalizeComparisonText(trimmed);
    if (!norm || norm === "pendiente") return;
    const currentNorm = normalizeComparisonText(parts.join(" "));
    if (currentNorm.includes(norm)) return;
    parts.push(trimmed);
  };
  pushUnique(component.name);
  pushUnique(component.variant);
  pushUnique(component.line);
  if (component.dimensionsMm) {
    parts.push(`${formatDimensionNumber(component.dimensionsMm.widthMm)} × ${formatDimensionNumber(component.dimensionsMm.heightMm)} mm`);
  }
  if (component.quantity != null && component.quantity > 1) {
    parts.push(`${component.quantity} u.`);
  }
  pushUnique(component.finish);
  return parts.join(" · ") || "Componente por confirmar";
}

function drawDiscreteReferentialNote(
  pdf: jsPDF,
  y: number,
  runningTitle: string,
  quoteCode: string,
  logoDataUrl?: string | null
) {
  const label = `${DISTRIBUCION_REFERENCIAL_LABEL}: `;
  const body = DISTRIBUCION_REFERENCIAL_NOTA;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.1);
  const lines = pdf.splitTextToSize(`${label}${body}`, PAGE_WIDTH - MARGIN * 2 - 7) as string[];
  const height = lines.length * 3.45 + 3;
  if (y + height > CONTENT_BOTTOM) y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  pdf.setFillColor(...HEADER);
  pdf.setDrawColor(...RULE);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, height, 1, 1, "FD");
  const startY = y + 4.1;
  if (lines[0]?.startsWith(label)) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.1);
    pdf.setTextColor(...INK);
    pdf.text(label, MARGIN + 2.5, startY);
    const labelWidth = pdf.getTextWidth(label);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...MUTED);
    pdf.text(lines[0].slice(label.length), MARGIN + 2.5 + labelWidth, startY);
    lines.slice(1).forEach((line, index) => {
      pdf.text(line, MARGIN + 2.5, startY + (index + 1) * 3.45);
    });
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.1);
    pdf.setTextColor(...MUTED);
    lines.forEach((line, index) => {
      pdf.text(line, MARGIN + 2.5, startY + index * 3.45);
    });
  }
  return y + height + 1.8;
}

function drawProfileCutsComponentsBlock(
  pdf: jsPDF,
  components: WorkOrderComponentSummary[],
  startY: number,
  runningTitle: string,
  quoteCode: string,
  logoDataUrl?: string | null
) {
  if (components.length === 0) return startY;
  const compactMetrics = resolveTableMetrics({ compact: true });
  const rows = components.map((component) => {
    const code = clean(component.code, "—");
    const details = formatComponentDetails(component);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.2);
    const lines = pdf.splitTextToSize(details, PAGE_WIDTH - MARGIN * 2 - 20) as string[];
    const height = Math.max(5.8, lines.length * 3.45 + 2.2);
    return { code, lines, height };
  });
  let y = startY + 1.2;
  if (y + compactMetrics.sectionStep + rows[0]!.height > CONTENT_BOTTOM) {
    y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  }
  y = sectionTitle(pdf, "Componentes", y, compactMetrics);
  rows.forEach((row, index) => {
    if (y + row.height > CONTENT_BOTTOM) {
      y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
      y = sectionTitle(pdf, "Componentes · continuación", y, compactMetrics);
    }
    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 253);
      pdf.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, row.height, "F");
    }
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y + row.height, PAGE_WIDTH - MARGIN, y + row.height);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.2);
    pdf.setTextColor(...INK);
    pdf.text(row.code, MARGIN + 2, y + 3.9);
    pdf.setFont("helvetica", "normal");
    pdf.text(row.lines, MARGIN + 16, y + 3.9, { lineHeightFactor: 1.15 });
    y += row.height;
  });
  return y + 1.5;
}

function drawPriceSummary(pdf: jsPDF, order: FabricationWorkOrder, y: number, runningTitle: string, quoteCode: string, logoDataUrl?: string | null) {
  const historicalWarnings = (order.pricing.assumptions ?? []).filter((assumption) => assumption.includes("referencia histórica"));
  const warningLines = historicalWarnings.flatMap((warning) => wrapped(pdf, warning, PAGE_WIDTH - MARGIN * 2 - 6));
  const warningHeight = warningLines.length ? warningLines.length * 4 + 5 : 0;
  if (y + 19 + warningHeight > CONTENT_BOTTOM) y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  const label = historicalWarnings.length ? "Costo neto con referencia histórica"
    : order.pricing.status === "complete" ? "Costo valorizado neto"
    : order.pricing.status === "partial" ? "Costo valorizado parcial (neto)"
    : "Costo de compra pendiente de revisión";
  pdf.setFillColor(245, 248, 252);
  pdf.setDrawColor(...RULE);
  pdf.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 17, 1.5, 1.5, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...INK);
  pdf.text(`${label}: ${money(order.pricing.knownNetTotal, order.pricing.currency)}`, MARGIN + 3, y + 6.5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(`${order.pricing.pricedCount} insumos con precio · ${order.pricing.pendingCount} pendientes de precio`, MARGIN + 3, y + 12.5);
  y += 19;
  if (warningLines.length) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(139, 48, 17);
    pdf.text(warningLines, MARGIN + 2, y + 3, { lineHeightFactor: 1.15 });
    y += warningHeight;
  }
  return y;
}

export function createFabricationWorkOrderPdf(
  order: FabricationWorkOrder,
  metadata: FabricationWorkOrderPdfMetadata,
  logoDataUrl?: string | null,
  kind: FabricationWorkOrderPdfKind = "combined"
) {
  const title = kind === "glass-order" ? "Orden de vidrios" : kind === "profile-cuts" ? "Pauta de cortes de perfiles" : "Orden de fabricación y materiales";
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: false });
  pdf.setCharSpace(0);
  const isProfileCuts = kind === "profile-cuts";
  let y = drawFabricationPdfHeader(pdf, metadata, title, logoDataUrl, "Empresa", "FABRICACIÓN", isProfileCuts ? { compact: true } : undefined);
  const runningTitle = title;
  const referentialDistribution = kind !== "glass-order" && order.cutPlanPhysicalState === "teorica";
  const referentialOnly = referentialDistribution && isReferentialOnlyWorkOrder(order);
  if (order.documentStatus.state === "partial" && !referentialOnly) {
    y = drawDocumentPartialWarning(pdf, y + 2, runningTitle, metadata.quoteCode, logoDataUrl);
  }
  if (referentialDistribution) {
    y = isProfileCuts
      ? drawDiscreteReferentialNote(pdf, y, runningTitle, metadata.quoteCode, logoDataUrl)
      : drawNote(pdf, `${DISTRIBUCION_REFERENCIAL_LABEL}. ${DISTRIBUCION_REFERENCIAL_NOTA}`, y, runningTitle, metadata.quoteCode, logoDataUrl);
  }
  if (isProfileCuts) {
    y = drawProfileCutsComponentsBlock(
      pdf,
      resolveComponentsForProfileCuts(order),
      y,
      runningTitle,
      metadata.quoteCode,
      logoDataUrl
    );
  }
  if (kind === "combined") y = drawPriceSummary(pdf, order, y, runningTitle, metadata.quoteCode, logoDataUrl);
  if (kind === "combined") {
  const profiles = order.materials.profiles.map((row): Row => {
    const supplierReference = resolveProfileSupplierPrice(row, order.materials.profilePriceReferences);
    const storedCost = row.price && row.price.sourceKind !== "reference" ? row.price : null;
    const referenceTotal = supplierReference
      ? calculateProfileReferenceTotal(row, { unitPrice: supplierReference.unitPrice, basis: supplierReference.basis })
      : null;
    return { cells: [
      `Técnico: ${clean(row.code)}${storedCost?.isWorkshopCode ? `\nInterno taller: ${storedCost.sku}` : supplierReference?.supplierSku ? `\nSKU proveedor: ${supplierReference.supplierSku}` : row.supplierSku ? `\nSKU proveedor: ${row.supplierSku}` : ""}`,
      `${clean(row.description)}\n${clean(row.line, "Línea pendiente")}\nColor aluminio: ${clean(row.configuredFinish ?? row.finish, "Pendiente")}`,
      `${row.bars} ${row.bars === 1 ? "tira" : "tiras"}\n${mm(row.commercialLengthMm)}`,
      supplierReference
        ? `${money(supplierReference.unitPrice, supplierReference.currency)}\n${supplierReference.basis}`
        : storedCost ? `${money(storedCost.unitPrice, storedCost.currency)}\n${storedCost.basis}` : "Pendiente",
      supplierReference
        ? referenceTotal == null ? "No calculable" : `${money(referenceTotal, supplierReference.currency)}\nreferencial`
        : storedCost ? money(storedCost.subtotal, storedCost.currency) : "Pendiente",
      supplierReference?.providerLabel ?? (storedCost ? workOrderPriceSource(storedCost) : "Sin proveedor asociado"),
      supplierReference?.supplierSku ?? row.supplierSku ?? "—",
    ] };
  });
  y = drawTable(pdf, "1. Resumen de compra · perfiles", [
    { title: "Código técnico", width: 32 }, { title: "Perfil / color aluminio", width: 35 },
    { title: "Compra", width: 22 }, { title: "Unitario", width: 20, align: "right" },
    { title: "Total / subtotal", width: 21, align: "right" }, { title: "Proveedor / origen", width: 30 },
    { title: "SKU", width: 22 },
  ], profiles, y, "Sin tiras en la pauta conjunta guardada", runningTitle, metadata.quoteCode, logoDataUrl);

  const rawProfileReferences = order.materials.profilePriceReferences ?? [];
  const hasProfilePriceLookup = rawProfileReferences.length > 0 ||
    order.materials.profilePriceReferencesStatus === "loaded" ||
    order.materials.profilePriceReferencesStatus === "loading" ||
    order.materials.profilePriceReferencesStatus === "unavailable";
  if (hasProfilePriceLookup) {
  const profileReferences = order.materials.profiles.length > 0 ? order.materials.profiles.map((profile): Row => {
    const reference = resolveProfileSupplierPrice(profile, order.materials.profilePriceReferences);
    const total = reference
      ? calculateProfileReferenceTotal(profile, { unitPrice: reference.unitPrice, basis: reference.basis })
      : null;
    const status = reference
      ? total == null ? "Unidad no calculable" : "Asociado a pauta"
      : order.materials.profilePriceReferencesStatus === "unavailable" ? "Consulta no disponible"
        : order.materials.profilePriceReferencesStatus === "loading" ? "Consulta pendiente"
          : "Sin referencia exacta";
    return { cells: [
      `${profile.itemCodes.join(", ")} · ${clean(profile.line)}\n${clean(profile.code)} · ${clean(profile.description)}`,
      `${clean(profile.configuredFinish ?? profile.finish, "Color aluminio pendiente")}\nSKU: ${reference?.supplierSku ?? profile.supplierSku ?? "—"}`,
      `${reference?.providerLabel ?? "Proveedor pendiente"}\n${reference?.basis ?? "Presentación pendiente"} · ${mm(profile.commercialLengthMm)}`,
      reference ? money(reference.unitPrice, reference.currency) : "Pendiente",
      reference && total != null ? money(total, reference.currency) : status,
    ] };
  }) : rawProfileReferences.map((row): Row => ({ cells: [
    `${clean(row.itemCode)} · ${clean(row.line)}\n${clean(row.technicalCode)} · ${clean(row.profileName)}`,
    `${clean(row.finish, "Color aluminio pendiente")}\nSKU: ${clean(row.supplierSku, "—")}`,
    `${clean(row.providerLabel)}\n${clean(row.purchaseUnit, "Presentación pendiente")} · ${mm(row.commercialLengthMm)}`,
    row.status === "priced" && row.netPrice != null && row.currency ? money(row.netPrice, row.currency) : "Pendiente",
    row.status === "ambiguous" ? "Presentación ambigua · sin pauta asociada" : "Sin pauta asociada",
  ] }));
  y = drawTable(pdf, order.materials.profiles.length > 0 ? "Referencias de compra asociadas a la pauta" : "Referencias unitarias de perfiles", [
    { title: "Partidas, línea y perfil", width: 55 }, { title: "Color aluminio / SKU", width: 35 },
    { title: "Proveedor / presentación", width: 43 }, { title: "Precio unitario", width: 24, align: "right" },
    { title: "Total referencial", width: 24, align: "right" },
  ], profileReferences, y, "Sin perfiles en pauta", runningTitle, metadata.quoteCode, logoDataUrl);
  y = drawNote(pdf, order.materials.profiles.length > 0
    ? `Referencias asociadas por código técnico, línea, color y presentación${order.materials.profilePriceReferencesCheckedAt ? ` · consulta ${order.materials.profilePriceReferencesCheckedAt}` : ""}. Total calculado desde precio unitario y cantidad de compra de la pauta. No es un costo guardado ni una cotización confirmada.`
    : `Referencias unitarias de compra; no representan cantidades de corte ni costo total de fabricación${order.materials.profilePriceReferencesCheckedAt ? ` · consulta ${order.materials.profilePriceReferencesCheckedAt}` : ""}.`, y, runningTitle, metadata.quoteCode, logoDataUrl);
  } else if (order.materials.profilePriceReferencesStatus === "unavailable" || order.materials.profilePriceReferencesStatus === "loading") {
    y = drawNote(pdf, order.materials.profilePriceReferencesStatus === "loading"
      ? "La consulta de precios unitarios seguía en curso al generar este PDF. Vuelve a descargarlo cuando termine."
      : "No se pudieron consultar los precios unitarios en este momento. Vuelve a generar el PDF para intentarlo otra vez.", y, runningTitle, metadata.quoteCode, logoDataUrl);
  }

  const accessories = order.materials.accessories.map((row): Row => ({ cells: [
    `${row.code ? `Técnico: ${row.code}` : "Código técnico pendiente"}${row.price?.isWorkshopCode ? `\nInterno taller: ${row.price.sku}` : row.price?.sku ? `\nSKU proveedor: ${row.price.sku}` : ""}`,
    `${clean(row.description)}\n${clean(row.finish, "Acabado pendiente")}`,
    `${row.quantity} ${row.unit}`,
    row.price ? money(row.price.unitPrice, row.price.currency) : "Pendiente",
    row.price ? money(row.price.subtotal, row.price.currency) : "Pendiente",
    row.price ? workOrderPriceSource(row.price) : "Sin precio",
  ] }));
  y = drawTable(pdf, "Accesorios", [
    { title: "Códigos", width: 43 }, { title: "Descripción", width: 50 },
    { title: "Cantidad", width: 22 }, { title: "Unitario", width: 22, align: "right" },
    { title: "Subtotal", width: 22, align: "right" }, { title: "Fuente", width: 23 },
  ], accessories, y, "Sin accesorios registrados", runningTitle, metadata.quoteCode, logoDataUrl);
  }

  if (kind === "combined" || isProfileCuts) {
  const profileCutsStyle: TableStyleOptions = {
    compact: true,
    boldFirstLineColumns: [0, 2],
    mutedSecondaryColumns: [0, 2],
  };
  const cuts = order.cutGroups.map((group): Row => {
    const profile = `${group.technicalCode} · ${group.profileName}`;
    const cutRows = group.cuts.length
      ? group.cuts.map((cut) => isProfileCuts
        ? formatProfileCutLine(cut, group.profileName)
        : `${cut.itemCode} · ${cut.functionName}\n${cut.quantity} × ${mm(cut.lengthMm)}`).join("\n")
      : "Sin cortes guardados";
    const presentation = group.barIndex == null
      ? "Distribución por tira pendiente"
      : `Tira ${group.barIndex} · ${mm(group.commercialLengthMm)}`;

    // The standalone profile-cut sheet is for the person cutting the bars:
    // keep bar identity, cut specs by component ID, and remnant state without repeated prose.
    // The combined work order retains its purchase context in its own section.
    return isProfileCuts
      ? {
          cells: [
            formatProfileCutGroupBarCell(group),
            cutRows,
            formatProfileCutRemnantCell(group, order.cutPlanPhysicalState),
          ],
        }
      : { cells: [
          `${profile}\n${clean(group.line, "Línea pendiente")} · Color aluminio: ${clean(group.finish, "Pendiente")}\n${presentation}`,
          cutRows,
          `${clean(group.supplierLabel, "Proveedor pendiente")}${group.supplierSku ? `\nSKU ${group.supplierSku}` : ""}`,
          group.barIndex == null ? "Pendiente" : mm(group.theoreticalRemnantMm),
        ] };
  });
  y = drawTable(pdf, isProfileCuts ? "Cortes por tira" : "2. Pauta de corte", isProfileCuts ? [
    { title: "Perfil / tira", width: 64 }, { title: "Cortes", width: 82 },
    { title: "Sobrante", width: 36, align: "right" },
  ] : [
    { title: "Perfil / línea / color", width: 50 }, { title: "Cortes agrupados", width: 80 },
    { title: "Proveedor / SKU", width: 30 }, { title: "Remanente teórico", width: 22, align: "right" },
  ], cuts, y, "Pauta de corte pendiente", runningTitle, metadata.quoteCode, logoDataUrl, isProfileCuts ? profileCutsStyle : undefined);
  if (!isProfileCuts) {
    y = drawNote(pdf, "Los largos provienen de la pauta guardada; el remanente es teórico. Confirmar kerf, despunte y condiciones del taller antes de fabricar. No representa una optimización de planchas de vidrio.", y, runningTitle, metadata.quoteCode, logoDataUrl);
  }
  if (order.preliminaryCutGroups.length > 0) {
    y = drawPreliminaryWarning(pdf, y + 2, runningTitle, metadata.quoteCode, logoDataUrl);
    const preliminaryCuts = order.preliminaryCutGroups.map((group): Row => {
      const profile = `${group.technicalCode} · ${group.profileName}`;
      const cutRows = group.cuts.length
        ? group.cuts.map((cut) => isProfileCuts
          ? formatProfileCutLine(cut, group.profileName)
          : `${cut.itemCode} · ${cut.functionName}\n${cut.quantity} × ${mm(cut.lengthMm)}`).join("\n")
        : "Sin cortes de geometría disponibles";
      return isProfileCuts
        ? { cells: [formatProfileCutGroupBarCell(group, "Distribución no calculada"), cutRows, "No aplica"] }
        : { cells: [
            `${profile}\n${clean(group.line, "Línea pendiente")} · Color aluminio: ${clean(group.finish, "Pendiente")}\nDistribución no calculada`,
            cutRows,
            "No asociar a proveedor",
            "No aplica",
          ] };
    });
    const preliminaryTitle = "Despiece estructural preliminar · acristalamiento pendiente";
    y = drawTable(pdf, preliminaryTitle, isProfileCuts ? [
      { title: "Perfil / tira", width: 64 }, { title: "Cortes", width: 82 },
      { title: "Sobrante", width: 36, align: "right" },
    ] : [
      { title: "Perfil / línea / color", width: 50 }, { title: "Cortes geométricos", width: 80 },
      { title: "Estado", width: 30 }, { title: "Distribución", width: 22, align: "right" },
    ], preliminaryCuts, y, "Sin cortes geométricos", runningTitle, metadata.quoteCode, logoDataUrl, isProfileCuts ? profileCutsStyle : undefined);
  }
  if (order.reviewCutGroups.length > 0) {
    const reviewCuts = order.reviewCutGroups.map((group): Row => ({ cells: [
`${group.technicalCode} · ${group.profileName}\n${[...new Set(group.cuts.map((cut) => `${cut.itemCode} · ${cut.component}`))].join("\n") || "Componente pendiente"}`,
      group.cuts.map((cut) => isProfileCuts
        ? formatProfileCutLine(cut, group.profileName)
        : `${cut.functionName}\n${cut.quantity} × ${mm(cut.lengthMm)}`).join("\n"),
      isProfileCuts ? "Snapshot incompatible · no operativo" : "Snapshot histórico · no operativo",
      isProfileCuts
        ? order.documentStatus.pendingComponents.find((component) => component.itemId === group.itemId)?.reason ?? "Revisar identidad y receta antes de usar estos cortes."
        : "Revisión pendiente",
    ] }));
    y = drawTable(pdf, "Revisión técnica · cortes históricos", isProfileCuts ? [
      { title: "Perfil / componente", width: 43 }, { title: "Cortes conservados", width: 67 },
      { title: "Estado", width: 31 }, { title: "Causa / uso", width: 41 },
    ] : [
      { title: "Perfil / componente", width: 50 }, { title: "Cortes conservados", width: 80 },
      { title: "Estado", width: 30 }, { title: "Uso", width: 22, align: "right" },
    ], reviewCuts, y, "Sin cortes históricos por revisar", runningTitle, metadata.quoteCode, logoDataUrl, isProfileCuts ? { compact: true, boldFirstLineColumns: [0], mutedSecondaryColumns: [0] } : undefined);
  }
  }

  if (kind === "combined" || kind === "glass-order") {
  const glass = order.glass.map((row): Row => ({ cells: [
    `${clean(row.itemCode, "Partida pendiente")}\n${row.paneReference}`,
    `${clean(row.type)}\nEspesor: ${clean(row.thickness)}\n${clean(row.validationLabel, "Origen de medida pendiente")}`,
    row.widthMm != null && row.heightMm != null ? `${mm(row.widthMm)} × ${mm(row.heightMm)}` : "Medidas pendientes",
    row.quantity == null ? "Pendiente" : String(row.quantity),
    row.issue ? `Pendiente de revisar\n${clean(row.issue)}` : area(row.totalM2),
  ] }));
  y = drawTable(pdf, kind === "glass-order" ? "Paños identificados · revisar antes de distribuir o cortar" : "3. Orden de vidrios", [
    { title: "Partida / paño", width: 46 }, { title: "Tipo / espesor", width: 49 },
    { title: "Ancho × alto", width: 39 }, { title: "Cant.", width: 17, align: "right" },
    { title: "Superficie", width: 31, align: "right" },
  ], glass, y, "Sin paños guardados", runningTitle, metadata.quoteCode, logoDataUrl);
  y = drawNote(pdf, "Cada fila muestra si la medida viene de un snapshot o de un ingreso manual final. Las medidas manuales no equivalen a aprobación física del corte ni a cobertura operativa.", y + 2, runningTitle, metadata.quoteCode, logoDataUrl);
  }

  if (kind === "combined" || kind === "profile-cuts") {
    const hasJointCoveragePending = order.pending.some((row) =>
      row.key === "coverage-joint-plan" || row.key === "coverage-joint-plan-blocked"
    );
    const technicalPending = kind === "combined"
      ? order.pending.filter((row) => !(referentialDistribution && row.key === "cut-physics"))
      : order.pending.filter((row) => {
          if (referentialDistribution && row.key === "cut-physics") return false;
          if (!isProfileCutTechnicalPending(row.key)) return false;
          if (row.key === "bar-distribution" && hasJointCoveragePending) return false;
          if (row.key === "structural-geometry" && order.preliminaryCutGroups.length > 0) return false;
          if (row.key === "historical-cuts-review" && order.reviewCutGroups.length > 0) return false;
          return true;
        });
    if (kind === "combined" || technicalPending.length > 0) {
      const pending = technicalPending.map((row): Row => ({ cells: [row.subject, row.action] }));
      drawTable(pdf, kind === "combined" ? "4. Pendientes para el maestro" : "Estado técnico · pendientes de corte", [
        { title: "Dato", width: 70 }, { title: "Acción", width: 112 },
      ], pending, y, "Sin pendientes técnicos de corte", runningTitle, metadata.quoteCode, logoDataUrl, isProfileCuts ? { compact: true } : undefined);
    }
  }
  drawFabricationPdfFooters(
    pdf,
    metadata.quoteCode,
    "FABRICACIÓN",
    referentialDistribution ? DISTRIBUCION_REFERENCIAL_PIE : undefined,
  );
  return pdf;
}
