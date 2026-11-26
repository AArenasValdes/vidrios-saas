import { jsPDF } from "jspdf";

import type { WorkMaterialsDocument } from "./fabrication-work-materials.service";
import {
  DISTRIBUCION_REFERENCIAL_LABEL,
  DISTRIBUCION_REFERENCIAL_NOTA,
  DISTRIBUCION_REFERENCIAL_PIE,
  isReferentialOnlyWorkOrder,
} from "./fabricacion-aviso-presentacion.service";
import { calculateProfileReferenceTotal, resolveExactProfilePriceReference, resolveProfileSupplierPrice } from "./work-materials-price-reference.service";
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
  logoDataUrl?: string | null,
  workOrder?: import("./fabrication-work-order.service").FabricationWorkOrder
) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: false });
  let y = drawFabricationPdfHeader(pdf, metadata, "Lista de materiales", logoDataUrl);
  const pageContext: PageContext = { metadata, logoDataUrl };

  const referentialDistribution = workOrder?.cutPlanPhysicalState === "teorica";
  if (workOrder?.documentStatus.state === "partial" && !isReferentialOnlyWorkOrder(workOrder)) {
    pdf.setFillColor(255, 243, 230);
    pdf.setDrawColor(191, 82, 34);
    pdf.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 12, 1.5, 1.5, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(139, 48, 17);
    pdf.text(workOrder.documentStatus.label, MARGIN + 3, y + 7.5);
    y += 15;
  }
  if (referentialDistribution) {
    const note = `${DISTRIBUCION_REFERENCIAL_LABEL}. ${DISTRIBUCION_REFERENCIAL_NOTA}`;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(note, PAGE_WIDTH - MARGIN * 2) as string[];
    const height = lines.length * 4 + 3;
    if (y + height > CONTENT_BOTTOM) {
      pdf.addPage("a4", "portrait");
      y = drawFabricationPdfContinuationHeader(pdf, "Lista de materiales", metadata.quoteCode, logoDataUrl);
    }
    pdf.setTextColor(...COLORS.muted);
    pdf.text(lines, MARGIN, y + 4, { lineHeightFactor: 1.2 });
    y += height;
  }

  for (const component of (workOrder?.documentStatus.pendingComponents ?? []).filter((entry) => /burlete pendiente|faltan junquillo compatible/i.test(entry.reason))) {
    const lines = pdf.splitTextToSize(`${component.codigo}: ${component.reason}`, PAGE_WIDTH - MARGIN * 2) as string[];
    const height = lines.length * 4 + 3;
    if (y + height > CONTENT_BOTTOM) {
      pdf.addPage("a4", "portrait");
      y = drawFabricationPdfContinuationHeader(pdf, "Lista de materiales", metadata.quoteCode, logoDataUrl);
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(lines, MARGIN, y + 4, { lineHeightFactor: 1.2 });
    y += height;
  }

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
  const profilesWithReferences = document.profiles.map((profile) => {
    const exactReference = resolveExactProfilePriceReference(profile, document.profilePriceReferences);
    return {
      profile,
      supplierPrice: resolveProfileSupplierPrice(profile, document.profilePriceReferences),
      storedCost: profile.price && profile.price.sourceKind !== "reference" ? profile.price : null,
      declaredWorkshopName: exactReference?.priceSource === "workshop" ? exactReference.workshopSupplierName?.trim() || null : null,
    };
  });
  const profileRows = profilesWithReferences.map(({ profile, supplierPrice, storedCost, declaredWorkshopName }) => {
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
        supplierPrice?.providerLabel ?? (storedCost
          ? storedCost.workshopSupplierName?.trim()
            ? `${storedCost.workshopSupplierName.trim()} · Mis precios`
            : declaredWorkshopName ? `${declaredWorkshopName} · Mis precios` : priceDescription(storedCost)
          : referenceStatus),
        `${profile.bars} ${profile.bars === 1 ? "tira" : "tiras"}\n${formatLength(profile.commercialLengthMm)}`,
        supplierPrice
          ? formatMoney(supplierPrice.unitPrice, supplierPrice.currency)
          : storedCost ? formatMoney(storedCost.unitPrice, storedCost.currency) : referenceStatus,
        supplierPrice
          ? referenceTotal == null ? "No calculable" : supplierPrice.sourceKind === "workshop"
            ? formatMoney(referenceTotal, supplierPrice.currency)
            : `${formatMoney(referenceTotal, supplierPrice.currency)}\nreferencial`
          : storedCost ? formatMoney(storedCost.subtotal, storedCost.currency) : referenceStatus,
      ],
      smallIndices: [0, 1, 3, 4, 6],
      referenceIndices: hasSupplierReference ? [5, 6] : [],
    };
  });
  y = drawSection(pdf, "Perfiles", profileColumns, profileRows, y, "Sin perfiles en pauta conjunta", pageContext);
  const profilePriceAmounts = profilesWithReferences.flatMap(({ profile, supplierPrice, storedCost, declaredWorkshopName }) => {
    if (supplierPrice) {
      const amount = calculateProfileReferenceTotal(profile, { unitPrice: supplierPrice.unitPrice, basis: supplierPrice.basis });
      return amount == null ? [{ profileKey: profile.key, amount: null, provider: supplierPrice.providerLabel, currency: supplierPrice.currency, sourceKind: supplierPrice.sourceKind }] :
        [{ profileKey: profile.key, amount, provider: supplierPrice.providerLabel, currency: supplierPrice.currency, sourceKind: supplierPrice.sourceKind }];
    }
    if (!storedCost) return [];
    return [{
      profileKey: profile.key,
      amount: Number.isFinite(storedCost.subtotal) ? storedCost.subtotal : null,
      provider: storedCost.workshopSupplierName?.trim()
        ? `${storedCost.workshopSupplierName.trim()} · Mis precios`
        : declaredWorkshopName ? `${declaredWorkshopName} · Mis precios` : storedCost.sourceLabel,
      currency: storedCost.currency,
      sourceKind: storedCost.sourceKind === "own" || storedCost.isWorkshopCode ? "workshop" as const : storedCost.sourceKind === "adjusted" ? "adjusted" as const : "reference" as const,
    }];
  });
  if (profilePriceAmounts.length > 0) {
    pdf.setFont("helvetica", "normal");
    const calculatedAmounts = profilePriceAmounts.filter((row): row is typeof row & { amount: number } => row.amount != null);
    const totalsBySource = new Map<string, { provider: string; currency: string; sourceKind: "workshop" | "reference" | "adjusted"; amount: number; count: number }>();
    for (const row of calculatedAmounts) {
      const key = `${row.provider}:${row.currency}:${row.sourceKind}`;
      const current = totalsBySource.get(key) ?? { provider: row.provider, currency: row.currency, sourceKind: row.sourceKind, amount: 0, count: 0 };
      current.amount += row.amount;
      current.count += 1;
      totalsBySource.set(key, current);
    }
    const calculatedProfileCount = new Set(calculatedAmounts.map((row) => row.profileKey)).size;
    const currencies = [...new Set(calculatedAmounts.map((row) => row.currency))];
    const totalLines = currencies.map((currency) => {
      const currencyRows = calculatedAmounts.filter((row) => row.currency === currency);
      const amount = currencyRows.reduce((sum, row) => sum + row.amount, 0);
      const currencyProfileCount = new Set(currencyRows.map((row) => row.profileKey)).size;
      const coverageLabel = currencyProfileCount < document.profiles.length
        ? ` (${currencyProfileCount} de ${document.profiles.length} perfiles con total calculable)`
        : "";
      return `Suma de perfiles · ${currency}: ${formatMoney(amount, currency)}${coverageLabel}`;
    });
    const sourceTotals = [...totalsBySource.values()];
    const showSourceBreakdown = sourceTotals.length > 1 || sourceTotals.some((total) => total.sourceKind !== "workshop");
    const sourceLines = (showSourceBreakdown ? sourceTotals : []).map((total) => {
      const label = total.sourceKind === "workshop" ? `Total propio · ${total.provider.replace(/ · Mis precios$/, "")}`
        : total.sourceKind === "adjusted" ? `Total ajustado · ${total.provider}`
          : `Total referencial · ${total.provider}`;
      return `${label} · ${total.currency}: ${formatMoney(total.amount, total.currency)} (${total.count} perfiles)`;
    });
    const uncalculatedCount = profilePriceAmounts.filter((row) => row.amount == null).length;
    const totalLinesWithWarnings = [
      ...totalLines,
      ...sourceLines,
      ...(uncalculatedCount ? [`${uncalculatedCount} perfil${uncalculatedCount === 1 ? "" : "es"} con precio no sumado: falta una unidad de compra compatible con la pauta.`] : []),
    ];
    const hasWorkshopCosts = profilePriceAmounts.some((row) => row.sourceKind === "workshop");
    const sourceNote = hasWorkshopCosts
      ? "Incluye costos propios guardados por el taller y referencias de compra disponibles."
      : "Incluye referencias de compra disponibles; no son una cotización confirmada del proveedor.";
    const noteWidth = PAGE_WIDTH - MARGIN * 2;
    const summaryLines = pdf.splitTextToSize(totalLinesWithWarnings.join("\n"), noteWidth) as string[];
    const note = `Calculado desde el precio unitario y la cantidad de compra de la pauta. ${sourceNote} No representa ni modifica el precio de venta comercial. Cobertura: ${calculatedProfileCount} de ${document.profiles.length} perfiles.`;
    const detailLines = pdf.splitTextToSize(note, noteWidth) as string[];
    const noteLines = [...summaryLines, ...detailLines];
    const noteHeight = noteLines.length * 3.5 + 5;
    if (y + noteHeight > CONTENT_BOTTOM) {
      pdf.addPage("a4", "portrait");
      y = drawFabricationPdfContinuationHeader(pdf, "Lista de materiales", metadata.quoteCode, logoDataUrl);
      y = drawFabricationPdfSectionTitle(pdf, "Perfiles · referencia de compra", y);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.ink);
    if (summaryLines.length) pdf.text(summaryLines, MARGIN, y + 3.2, { lineHeightFactor: 1.2 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.2);
    pdf.setTextColor(...COLORS.muted);
    if (detailLines.length) pdf.text(detailLines, MARGIN, y + 3.2 + summaryLines.length * 3.5, { lineHeightFactor: 1.2 });
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

  drawFabricationPdfFooters(
    pdf,
    metadata.quoteCode,
    "FABRICACIÓN",
    referentialDistribution ? DISTRIBUCION_REFERENCIAL_PIE : undefined,
  );

  return pdf;
}
