import { jsPDF } from "jspdf";

import type { WorkMaterialsDocument } from "./fabrication-work-materials.service";

export type WorkMaterialsPdfMetadata = {
  companyName: string;
  quoteCode: string;
  workName: string;
  issueDate: string;
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const COLORS = {
  ink: [25, 43, 72] as const,
  muted: [87, 105, 132] as const,
  accent: [37, 99, 183] as const,
  headerFill: [234, 241, 250] as const,
  rowFill: [248, 250, 253] as const,
  rule: [211, 220, 232] as const,
};

type Column = { title: string; width: number; align?: "left" | "right" | "center" };
type TableRow = { cells: string[]; quantityIndex?: number; smallIndices?: number[] };

function clean(value: string | null | undefined, fallback = "—") {
  const normalized = value?.trim();
  return normalized || fallback;
}

function formatLength(value: number) {
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value)} mm`;
}

function formatSquareMeters(value: number) {
  return `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} m²`;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function priceSourceDetails(price: NonNullable<WorkMaterialsDocument["profiles"][number]["price"]>) {
  const date = price.pricedAt
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(price.pricedAt))
    : "fecha no registrada";
  return `${price.sourceLabel} · ${price.sourceRevision} · ${date}`;
}

function drawCellText(
  pdf: jsPDF,
  value: string,
  x: number,
  y: number,
  width: number,
  align: Column["align"] = "left",
  bold = false,
  color: readonly [number, number, number] = COLORS.ink,
  fontSize = 9.6
) {
  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...color);
  const lines = pdf.splitTextToSize(value, Math.max(8, width - 4)) as string[];
  const lineHeight = fontSize * 0.3528 * 1.2;
  const textHeight = Math.max(0, lines.length - 1) * lineHeight + 3.5;
  const textY = y + Math.max(2.2, (heightForText(value, width, pdf, fontSize, bold) - textHeight) / 2 + 2.8);
  pdf.text(lines, align === "right" ? x + width - 2 : align === "center" ? x + width / 2 : x + 2, textY, {
    align: align === "right" ? "right" : align === "center" ? "center" : "left",
    lineHeightFactor: 1.2,
  });
  return lines.length;
}

function heightForText(value: string, width: number, pdf: jsPDF, fontSize: number, bold: boolean) {
  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(fontSize);
  const lineCount = (pdf.splitTextToSize(value, Math.max(8, width - 4)) as string[]).length;
  return Math.max(0, lineCount - 1) * fontSize * 0.3528 * 1.2 + 3.5;
}

function drawTableHeader(pdf: jsPDF, columns: Column[], x: number, y: number, height = 9) {
  pdf.setFillColor(...COLORS.headerFill);
  pdf.roundedRect(x, y, columns.reduce((sum, column) => sum + column.width, 0), height, 1.5, 1.5, "F");
  let columnX = x;
  for (const column of columns) {
    drawCellText(pdf, column.title, columnX, y, column.width, column.align, true, COLORS.ink, 9.2);
    columnX += column.width;
  }
  return y + height;
}

function rowHeight(pdf: jsPDF, row: TableRow, columns: Column[]) {
  let maxHeight = 0;
  row.cells.forEach((cell, index) => {
    const isQuantity = index === row.quantityIndex;
    const fontSize = row.smallIndices?.includes(index) ? 8.2 : isQuantity ? 10.4 : 9.6;
    pdf.setFont("helvetica", isQuantity ? "bold" : "normal");
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(cell, Math.max(8, columns[index]!.width - 4)) as string[];
    maxHeight = Math.max(maxHeight, Math.max(0, lines.length - 1) * fontSize * 0.3528 * 1.2 + 3.5);
  });
  return Math.max(11, maxHeight + 4.2);
}

function drawTableRow(pdf: jsPDF, row: TableRow, columns: Column[], x: number, y: number, height: number, index: number) {
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  if (index % 2 === 1) {
    pdf.setFillColor(...COLORS.rowFill);
    pdf.rect(x, y, tableWidth, height, "F");
  }
  let columnX = x;
  columns.forEach((column, columnIndex) => {
    const isQuantity = columnIndex === row.quantityIndex;
    const fontSize = row.smallIndices?.includes(columnIndex) ? 8.2 : isQuantity ? 10.4 : 9.6;
    drawCellText(
      pdf,
      row.cells[columnIndex] ?? "—",
      columnX,
      y,
      column.width,
      column.align,
      isQuantity,
      isQuantity ? COLORS.accent : COLORS.ink,
      fontSize
    );
    columnX += column.width;
  });
  pdf.setDrawColor(...COLORS.rule);
  pdf.setLineWidth(0.2);
  pdf.line(x, y + height, x + tableWidth, y + height);
}

function drawSectionTitle(pdf: jsPDF, title: string, y: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13.5);
  pdf.setTextColor(...COLORS.ink);
  pdf.text(title, MARGIN, y);
  return y + 5;
}

function ensureSpace(
  pdf: jsPDF,
  y: number,
  requiredHeight: number,
  title: string,
  columns: Column[]
) {
  if (y + requiredHeight <= PAGE_HEIGHT - MARGIN) return y;
  pdf.addPage("a4", "portrait");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...COLORS.muted);
  pdf.text("Lista de materiales · continuación", MARGIN, 15);
  pdf.setDrawColor(...COLORS.rule);
  pdf.line(MARGIN, 19, PAGE_WIDTH - MARGIN, 19);
  const sectionY = drawSectionTitle(pdf, title, 29);
  return drawTableHeader(pdf, columns, MARGIN, sectionY);
}

function drawSection(
  pdf: jsPDF,
  title: string,
  columns: Column[],
  rows: TableRow[],
  y: number,
  emptyLabel: string
) {
  y += 6;
  const fullSectionHeight = 5 + 9 + rows.reduce((total, row) => total + rowHeight(pdf, row, columns), 0);
  const continuationTop = 26;
  if (
    rows.length > 0 &&
    fullSectionHeight + continuationTop <= PAGE_HEIGHT - MARGIN &&
    y + fullSectionHeight > PAGE_HEIGHT - MARGIN
  ) {
    pdf.addPage("a4", "portrait");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.muted);
    pdf.text("Lista de materiales · continuación", MARGIN, 15);
    pdf.setDrawColor(...COLORS.rule);
    pdf.line(MARGIN, 19, PAGE_WIDTH - MARGIN, 19);
    y = continuationTop;
  }
  if (y + 16 > PAGE_HEIGHT - MARGIN) {
    pdf.addPage("a4", "portrait");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.muted);
    pdf.text("Lista de materiales · continuación", MARGIN, 15);
    pdf.setDrawColor(...COLORS.rule);
    pdf.line(MARGIN, 19, PAGE_WIDTH - MARGIN, 19);
    y = 26;
  }
  y = drawSectionTitle(pdf, title, y);
  y = drawTableHeader(pdf, columns, MARGIN, y);

  if (rows.length === 0) {
    const empty: TableRow = { cells: [emptyLabel, ...columns.slice(1).map(() => "—")] };
    const height = 14;
    y = ensureSpace(pdf, y, height, title, columns);
    drawTableRow(pdf, empty, columns, MARGIN, y, height, 0);
    return y + height;
  }

  let rowIndex = 0;
  for (const row of rows) {
    let height = rowHeight(pdf, row, columns);
    y = ensureSpace(pdf, y, height, title, columns);
    // Re-measure after a page break; repeated headers consume room but row height is unchanged.
    height = rowHeight(pdf, row, columns);
    drawTableRow(pdf, row, columns, MARGIN, y, height, rowIndex++);
    y += height;
  }
  return y;
}

function drawHeader(pdf: jsPDF, metadata: WorkMaterialsPdfMetadata, logoDataUrl?: string | null) {
  let logoDrawn = false;
  if (logoDataUrl) {
    try {
      const image = pdf.getImageProperties(logoDataUrl);
      const maxWidth = 44;
      const maxHeight = 12;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      pdf.addImage(logoDataUrl, "PNG", MARGIN, 11.5 + (maxHeight - height) / 2, width, height, undefined, "FAST");
      logoDrawn = true;
    } catch {
      // The document remains usable when an optional brand asset cannot be embedded.
    }
  }
  if (!logoDrawn) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...COLORS.accent);
    pdf.text("VENTORA", MARGIN, 18);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.ink);
  pdf.text("Lista de materiales", 65, 18);

  pdf.setDrawColor(...COLORS.rule);
  pdf.setLineWidth(0.35);
  pdf.line(MARGIN, 25, PAGE_WIDTH - MARGIN, 25);

  const metaTop = 32;
  const labelColor = COLORS.muted;
  let maxSecondRowLines = 1;
  const details = [
    { label: "EMPRESA", value: clean(metadata.companyName), x: MARGIN, y: metaTop, width: 88 },
    { label: "COTIZACIÓN", value: clean(metadata.quoteCode), x: 112, y: metaTop, width: 84 },
    { label: "TRABAJO", value: clean(metadata.workName), x: MARGIN, y: metaTop + 11, width: 88 },
    { label: "FECHA", value: clean(metadata.issueDate), x: 112, y: metaTop + 11, width: 84 },
  ];
  for (const detail of details) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...labelColor);
    pdf.text(detail.label, detail.x, detail.y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...COLORS.ink);
    const lines = pdf.splitTextToSize(detail.value, detail.width) as string[];
    if (detail.y > metaTop) maxSecondRowLines = Math.max(maxSecondRowLines, lines.length);
    pdf.text(lines, detail.x, detail.y + 4.5, { lineHeightFactor: 1.15 });
  }
  const dividerY = Math.max(55, metaTop + 11 + 4.5 + (maxSecondRowLines - 1) * 4.8 + 3);
  pdf.line(MARGIN, dividerY, PAGE_WIDTH - MARGIN, dividerY);
  return dividerY + 7;
}

export function createWorkMaterialsPdf(
  document: WorkMaterialsDocument,
  metadata: WorkMaterialsPdfMetadata,
  logoDataUrl?: string | null
) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: false });
  let y = drawHeader(pdf, metadata, logoDataUrl);

  if (document.pricing) {
    pdf.setFillColor(245, 248, 252);
    pdf.setDrawColor(...COLORS.rule);
    pdf.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 13, 1.5, 1.5, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...COLORS.ink);
    const total = document.pricing.knownNetTotal != null && document.pricing.currency
      ? formatMoney(document.pricing.knownNetTotal, document.pricing.currency)
      : "Sin monto valorizado";
    pdf.text(`Costo valorizado parcial: ${total}`, MARGIN + 3, y + 5.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(`${document.pricing.pricedMaterialCount} insumos con precio · ${document.pricing.pendingMaterialCount} pendientes de precio`, MARGIN + 3, y + 10);
    y += 17;
  }

  const profileColumns: Column[] = [
    { title: "Código / SKU", width: 40 },
    { title: "Perfil y procedencia", width: 52 },
    { title: "Acabado", width: 21 },
    { title: "Compra", width: 25, align: "center" },
    { title: "Unitario", width: 22, align: "right" },
    { title: "Subtotal", width: 22, align: "right" },
  ];
  const profileRows = document.profiles.map((profile) => ({
    cells: [
      `${clean(profile.code)}${profile.price ? `\n${profile.price.sku}` : ""}`,
      `${clean(profile.description)}\n${clean(profile.line)}${profile.price ? `\n${profile.price.isWorkshopCode ? "Código del taller" : "Lista referencial"} · ${priceSourceDetails(profile.price)}` : ""}`,
      clean(profile.configuredFinish, "Acabado sin definir"),
      `${profile.bars} ${profile.bars === 1 ? "barra" : "barras"}\n${formatLength(profile.commercialLengthMm)} c/u`,
      profile.price ? `${formatMoney(profile.price.unitPrice, profile.price.currency)}\n${profile.price.basis}` : "Pendiente",
      profile.price ? formatMoney(profile.price.subtotal, profile.price.currency) : "Pendiente",
    ],
    quantityIndex: 3,
    smallIndices: [0, 1],
  }));
  y = drawSection(pdf, "Perfiles totales", profileColumns, profileRows, y, "Sin perfiles en pauta conjunta");

  const accessoryColumns: Column[] = [
    { title: "Código / SKU", width: 36 },
    { title: "Descripción, acabado y procedencia", width: 69 },
    { title: "Cantidad · unidad", width: 25, align: "right" },
    { title: "Unitario", width: 26, align: "right" },
    { title: "Subtotal", width: 26, align: "right" },
  ];
  const accessoryRows = document.accessories.map((accessory) => ({
    cells: [
      `${clean(accessory.code)}${accessory.price ? `\n${accessory.price.sku}` : ""}`,
      `${accessory.code ? clean(accessory.description) : `Por especificar: ${clean(accessory.description)}`}${accessory.configuredFinish ? `\nAcabado: ${accessory.configuredFinish}` : ""}${accessory.price ? `\n${accessory.price.isWorkshopCode ? "Código del taller" : "Lista referencial"} · ${priceSourceDetails(accessory.price)}` : ""}`,
      `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(accessory.quantity)} ${clean(accessory.unit)}`,
      accessory.price ? `${formatMoney(accessory.price.unitPrice, accessory.price.currency)}\n${accessory.price.basis}` : "Pendiente",
      accessory.price ? formatMoney(accessory.price.subtotal, accessory.price.currency) : "Pendiente",
    ],
    smallIndices: [0, 1],
  }));
  y = drawSection(pdf, "Accesorios", accessoryColumns, accessoryRows, y, "Sin accesorios registrados");

  const glassColumns: Column[] = [
    { title: "Descripción", width: 65 },
    { title: "Espesor", width: 25 },
    { title: "Superficie total", width: 34, align: "right" },
    { title: "Partidas asociadas", width: 58 },
  ];
  const glassRows = document.glass.map((glass) => ({
    cells: [
      clean(glass.description),
      clean(glass.thickness, "Pendiente"),
      formatSquareMeters(glass.totalM2),
      glass.itemCodes.length ? glass.itemCodes.join(", ") : "—",
    ],
  }));
  drawSection(pdf, "Vidrios", glassColumns, glassRows, y, "Sin vidrios registrados");

  return pdf;
}
