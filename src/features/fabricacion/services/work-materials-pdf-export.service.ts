import { jsPDF } from "jspdf";

import type { WorkMaterialsDocument } from "./fabrication-work-materials.service";
import { calculateProfileReferenceTotal, formatProfilePriceBasis, resolveProfileSupplierPrice } from "./work-materials-price-reference.service";
import {
  drawFabricationPdfContinuationHeader,
  drawFabricationPdfFooters,
  drawFabricationPdfHeader,
  drawFabricationPdfSectionTitle,
  FABRICATION_PDF_COLORS,
} from "./fabrication-pdf-document-style.service";

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
  ink: FABRICATION_PDF_COLORS.ink,
  muted: FABRICATION_PDF_COLORS.muted,
  accent: FABRICATION_PDF_COLORS.blue,
  headerFill: FABRICATION_PDF_COLORS.pale,
  rowFill: FABRICATION_PDF_COLORS.row,
  rule: FABRICATION_PDF_COLORS.rule,
};
const CONTENT_BOTTOM = PAGE_HEIGHT - MARGIN - 5;

type Column = { title: string; width: number; align?: "left" | "right" | "center" };
type TableRow = { cells: string[]; quantityIndex?: number; smallIndices?: number[]; referenceIndices?: number[] };

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

function priceDescription(price: NonNullable<WorkMaterialsDocument["profiles"][number]["price"]>) {
  return price.sourceLabel;
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
    const isReference = row.referenceIndices?.includes(columnIndex) === true;
    const fontSize = isReference ? 8.2 : row.smallIndices?.includes(columnIndex) ? 8.2 : isQuantity ? 10.4 : 9.6;
    drawCellText(
      pdf,
      row.cells[columnIndex] ?? "—",
      columnX,
      y,
      column.width,
      column.align,
      isQuantity,
      isQuantity || isReference ? COLORS.accent : COLORS.ink,
      fontSize
    );
    columnX += column.width;
  });
  pdf.setDrawColor(...COLORS.rule);
  pdf.setLineWidth(0.2);
  pdf.line(x, y + height, x + tableWidth, y + height);
}

type PageContext = { metadata: WorkMaterialsPdfMetadata; logoDataUrl?: string | null };

function drawContinuationTableHeader(pdf: jsPDF, title: string, columns: Column[], context: PageContext) {
  pdf.addPage("a4", "portrait");
  let y = drawFabricationPdfContinuationHeader(pdf, "Lista de materiales", context.metadata.quoteCode, context.logoDataUrl);
  y = drawFabricationPdfSectionTitle(pdf, `${title} · continuación`, y);
  return drawTableHeader(pdf, columns, MARGIN, y);
}

function ensureSpace(
  pdf: jsPDF,
  y: number,
  requiredHeight: number,
  title: string,
  columns: Column[],
  context: PageContext
) {
  if (y + requiredHeight <= CONTENT_BOTTOM) return y;
  return drawContinuationTableHeader(pdf, title, columns, context);
}

function drawSection(
  pdf: jsPDF,
  title: string,
  columns: Column[],
  rows: TableRow[],
  y: number,
  emptyLabel: string,
  context: PageContext,
  reserveBelow = 0
) {
  y += 6;
  const firstRow = rows[0] ?? { cells: [emptyLabel, ...columns.slice(1).map(() => "—")] };
  const sectionStartHeight = 5 + 9 + rowHeight(pdf, firstRow, columns);
  if (y + sectionStartHeight > CONTENT_BOTTOM) {
    y = drawContinuationTableHeader(pdf, title, columns, context);
  } else {
    y = drawFabricationPdfSectionTitle(pdf, title, y);
    y = drawTableHeader(pdf, columns, MARGIN, y);
  }

  if (rows.length === 0) {
    const empty: TableRow = { cells: [emptyLabel, ...columns.slice(1).map(() => "—")] };
    const height = 14;
    y = ensureSpace(pdf, y, height, title, columns, context);
    drawTableRow(pdf, empty, columns, MARGIN, y, height, 0);
    return y + height;
  }

  for (const [rowIndex, row] of rows.entries()) {
    let height = rowHeight(pdf, row, columns);
    const reserveForNextSection = rowIndex === rows.length - 1 ? reserveBelow : 0;
    y = ensureSpace(pdf, y, height + reserveForNextSection, title, columns, context);
    // Re-measure after a page break; repeated headers consume room but row height is unchanged.
    height = rowHeight(pdf, row, columns);
    drawTableRow(pdf, row, columns, MARGIN, y, height, rowIndex);
    y += height;
  }
  return y;
}

export function createWorkMaterialsPdf(
  document: WorkMaterialsDocument,
  metadata: WorkMaterialsPdfMetadata,
  logoDataUrl?: string | null
) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: false });
  let y = drawFabricationPdfHeader(pdf, metadata, "Lista de materiales", logoDataUrl);
  const pageContext: PageContext = { metadata, logoDataUrl };

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
    { title: "Código", width: 22 },
    { title: "Perfil", width: 30 },
    { title: "Color aluminio", width: 25 },
    { title: "Proveedor", width: 34 },
    { title: "Compra", width: 24, align: "center" },
    { title: "Unitario", width: 24, align: "right" },
    { title: "Total", width: 23, align: "right" },
  ];
  const profilesWithReferences = document.profiles.map((profile) => ({
    profile,
    supplierPrice: resolveProfileSupplierPrice(profile, document.profilePriceReferences),
    storedCost: profile.price && profile.price.sourceKind !== "reference" ? profile.price : null,
  }));
  const profileRows = profilesWithReferences.map(({ profile, supplierPrice, storedCost }) => {
    const referenceTotal = supplierPrice
      ? calculateProfileReferenceTotal(profile, { unitPrice: supplierPrice.unitPrice, basis: supplierPrice.basis })
      : null;
    const hasSupplierReference = supplierPrice != null;
    const referenceStatus = !storedCost && !supplierPrice && document.profilePriceReferencesStatus === "unavailable"
      ? "Consulta no disponible"
      : !storedCost && !supplierPrice && document.profilePriceReferencesStatus === "loading"
        ? "Consulta en curso"
        : !storedCost && !supplierPrice && document.profilePriceReferencesStatus === "loaded"
          ? "Sin referencia exacta"
          : "Pendiente";
    return {
      cells: [
        `${clean(profile.code)}${supplierPrice?.supplierSku ? `\nSKU ${supplierPrice.supplierSku}` : storedCost?.sku ? `\nSKU ${storedCost.sku}` : profile.supplierSku ? `\nSKU ${profile.supplierSku}` : ""}`,
        `${clean(profile.description)}\n${clean(profile.line)}`,
        clean(profile.configuredFinish, "Acabado sin definir"),
        supplierPrice?.providerLabel ?? (storedCost ? priceDescription(storedCost) : referenceStatus),
        `${profile.bars} ${profile.bars === 1 ? "tira" : "tiras"}\n${formatLength(profile.commercialLengthMm)}`,
        supplierPrice
          ? `${formatMoney(supplierPrice.unitPrice, supplierPrice.currency)} ${formatProfilePriceBasis(supplierPrice.basis)}`
          : storedCost ? `${formatMoney(storedCost.unitPrice, storedCost.currency)}\n${storedCost.basis}` : referenceStatus,
        supplierPrice
          ? referenceTotal == null ? "No calculable" : `${formatMoney(referenceTotal, supplierPrice.currency)}\nreferencial`
          : storedCost ? formatMoney(storedCost.subtotal, storedCost.currency) : referenceStatus,
      ],
      smallIndices: [0, 1, 3, 4, 6],
      referenceIndices: hasSupplierReference ? [5, 6] : [],
    };
  });
  y = drawSection(pdf, "Perfiles", profileColumns, profileRows, y, "Sin perfiles en pauta conjunta", pageContext);
  if (profilesWithReferences.some(({ supplierPrice }) => supplierPrice != null)) {
    pdf.setFont("helvetica", "normal");
    const totalsBySource = new Map<string, { provider: string; currency: string; amount: number; count: number }>();
    for (const { profile, supplierPrice } of profilesWithReferences) {
      const provider = supplierPrice?.providerLabel;
      const providerKey = supplierPrice?.providerKey ?? provider;
      const currency = supplierPrice?.currency;
      if (!supplierPrice || !provider || !providerKey || !currency) continue;
      const amount = calculateProfileReferenceTotal(profile, { unitPrice: supplierPrice.unitPrice, basis: supplierPrice.basis });
      if (amount == null) continue;
      const key = `${providerKey}:${currency}`;
      const current = totalsBySource.get(key) ?? { provider, currency, amount: 0, count: 0 };
      current.amount += amount;
      current.count += 1;
      totalsBySource.set(key, current);
    }
    const coverage = profilesWithReferences.filter(({ supplierPrice }) => supplierPrice).length;
    const totalLines = [...totalsBySource.values()].map((total) =>
      `Total referencial · ${total.provider} · ${total.currency}: ${formatMoney(total.amount, total.currency)} (${total.count} perfiles)`
    );
    const totalText = totalLines.length ? totalLines.join("\n") : "No se puede calcular el total: la unidad de compra no coincide con tiras de la pauta.";
    const note = `${totalText}\nCalculado desde el precio unitario y la cantidad de compra de la pauta. Referencia de proveedor; no es un costo guardado ni una cotización confirmada. Cobertura: ${coverage} de ${document.profiles.length} perfiles.`;
    const noteLines = pdf.splitTextToSize(note, PAGE_WIDTH - MARGIN * 2) as string[];
    const noteHeight = noteLines.length * 3.5 + 5;
    if (y + noteHeight > CONTENT_BOTTOM) {
      pdf.addPage("a4", "portrait");
      y = drawFabricationPdfContinuationHeader(pdf, "Lista de materiales", metadata.quoteCode, logoDataUrl);
      y = drawFabricationPdfSectionTitle(pdf, "Perfiles · referencia de compra", y);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.ink);
    pdf.text(noteLines.slice(0, totalLines.length || 1), MARGIN, y + 3.2, { lineHeightFactor: 1.2 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.2);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(noteLines.slice(totalLines.length || 1), MARGIN, y + 3.2 + (totalLines.length || 1) * 3.5, { lineHeightFactor: 1.2 });
    y += noteHeight;
  }

  const accessoryColumns: Column[] = [
    { title: "Código / SKU", width: 36 },
    { title: "Descripción y acabado", width: 69 },
    { title: "Cantidad · unidad", width: 25, align: "right" },
    { title: "Unitario", width: 26, align: "right" },
    { title: "Subtotal", width: 26, align: "right" },
  ];
  const accessoryRows = document.accessories.map((accessory) => ({
    cells: [
      `${clean(accessory.code)}${accessory.price ? `\n${accessory.price.sku}` : ""}`,
      `${accessory.code ? clean(accessory.description) : `Por especificar: ${clean(accessory.description)}`}${accessory.configuredFinish ? `\nAcabado: ${accessory.configuredFinish}` : ""}${accessory.price ? `\n${priceDescription(accessory.price)}` : ""}`,
      `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(accessory.quantity)} ${clean(accessory.unit)}`,
      accessory.price ? `${formatMoney(accessory.price.unitPrice, accessory.price.currency)}\n${accessory.price.basis}` : "Pendiente",
      accessory.price ? formatMoney(accessory.price.subtotal, accessory.price.currency) : "Pendiente",
    ],
    smallIndices: [0, 1],
  }));
  const glassColumns: Column[] = [
    { title: "Descripción", width: 65 },
    { title: "Espesor técnico", width: 25 },
    { title: "Superficie total", width: 34, align: "right" },
    { title: "Partidas asociadas", width: 58 },
  ];
  const glassRows = document.glass.map((glass) => ({
    cells: [
      `${clean(glass.description)}${glass.thicknessWarning ? `\n${clean(glass.thicknessWarning)}` : ""}`,
      clean(glass.thickness, "Sin dato técnico"),
      formatSquareMeters(glass.totalM2),
      glass.itemCodes.length ? glass.itemCodes.join(", ") : "—",
    ],
  }));
  const glassSectionHeight = 5 + 9 + glassRows.reduce((total, row) => total + rowHeight(pdf, row, glassColumns), 0);
  y = drawSection(pdf, "Accesorios", accessoryColumns, accessoryRows, y, "Sin accesorios registrados", pageContext, glassSectionHeight);
  drawSection(pdf, "Vidrios", glassColumns, glassRows, y, "Sin vidrios registrados", pageContext);

  drawFabricationPdfFooters(pdf, metadata.quoteCode);

  return pdf;
}
