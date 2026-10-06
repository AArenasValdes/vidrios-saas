import { jsPDF } from "jspdf";

import type { FabricationWorkOrder } from "./fabrication-work-order.service";
import { workOrderPriceSource } from "./fabrication-work-order.service";

export type FabricationWorkOrderPdfMetadata = {
  companyName: string;
  quoteCode: string;
  workName: string;
  issueDate: string;
};

type Column = { title: string; width: number; align?: "left" | "right" | "center" };
type Row = { cells: string[] };

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_BOTTOM = 278;
const INK: [number, number, number] = [25, 43, 72];
const MUTED: [number, number, number] = [87, 105, 132];
const RULE: [number, number, number] = [211, 220, 232];
const HEADER: [number, number, number] = [234, 241, 250];

function clean(value: string | null | undefined, fallback = "Pendiente") {
  return value?.trim() || fallback;
}

function mm(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value > 0
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

function newPage(pdf: jsPDF) {
  pdf.addPage("a4", "portrait");
  pdf.setCharSpace(0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text("Orden de fabricación y materiales · continuación", MARGIN, 16);
  pdf.setDrawColor(...RULE);
  pdf.line(MARGIN, 20, PAGE_WIDTH - MARGIN, 20);
  return 26;
}

function sectionTitle(pdf: jsPDF, title: string, y: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.setTextColor(...INK);
  pdf.text(title, MARGIN, y);
  return y + 5;
}

function tableHead(pdf: jsPDF, columns: Column[], y: number) {
  pdf.setFillColor(...HEADER);
  pdf.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 9, 1.2, 1.2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK);
  let x = MARGIN;
  for (const column of columns) {
    pdf.text(column.title, column.align === "right" ? x + column.width - 2 : x + 2, y + 5.8, {
      align: column.align === "right" ? "right" : "left",
    });
    x += column.width;
  }
  return y + 9;
}

function rowHeight(pdf: jsPDF, row: Row, columns: Column[]) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.2);
  return Math.max(11, ...row.cells.map((cell, index) => wrapped(pdf, cell, columns[index]!.width).length * 4.05 + 4));
}

function tableRow(pdf: jsPDF, row: Row, columns: Column[], y: number, height: number, index: number) {
  if (index % 2 === 1) {
    pdf.setFillColor(248, 250, 253);
    pdf.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, height, "F");
  }
  pdf.setDrawColor(...RULE);
  pdf.line(MARGIN, y + height, PAGE_WIDTH - MARGIN, y + height);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.2);
  pdf.setTextColor(...INK);
  let x = MARGIN;
  for (let i = 0; i < columns.length; i += 1) {
    const column = columns[i]!;
    const lines = wrapped(pdf, row.cells[i] ?? "—", column.width);
    pdf.text(lines, column.align === "right" ? x + column.width - 2 : x + 2, y + 4.7, {
      align: column.align === "right" ? "right" : "left",
      lineHeightFactor: 1.18,
    });
    x += column.width;
  }
  return y + height;
}

function drawTable(pdf: jsPDF, title: string, columns: Column[], values: Row[], startY: number, empty: string) {
  const rows = values.length ? values : [{ cells: [empty, ...columns.slice(1).map(() => "—")] }];
  let y = startY + 4;
  if (y + 5 + 9 + 11 > CONTENT_BOTTOM) y = newPage(pdf);
  y = tableHead(pdf, columns, sectionTitle(pdf, title, y));
  rows.forEach((row, index) => {
    const cellLines = row.cells.map((cell, cellIndex) => wrapped(pdf, cell, columns[cellIndex]!.width));
    const totalLines = Math.max(...cellLines.map((lines) => lines.length));
    let lineOffset = 0;
    while (lineOffset < totalLines) {
      const linesAvailable = Math.floor((CONTENT_BOTTOM - y - 4) / 4.05);
      if (linesAvailable < 2) {
        y = newPage(pdf);
        y = tableHead(pdf, columns, sectionTitle(pdf, `${title} · continuación`, y));
        continue;
      }
      const lineCount = Math.min(totalLines - lineOffset, linesAvailable);
      const fragment: Row = {
        cells: cellLines.map((lines) => lines.slice(lineOffset, lineOffset + lineCount).join("\n") || " "),
      };
      const height = rowHeight(pdf, fragment, columns);
      if (y + height > CONTENT_BOTTOM) {
        y = newPage(pdf);
        y = tableHead(pdf, columns, sectionTitle(pdf, `${title} · continuación`, y));
        continue;
      }
      y = tableRow(pdf, fragment, columns, y, height, index);
      lineOffset += lineCount;
    }
  });
  return y;
}

function drawNote(pdf: jsPDF, value: string, y: number) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.2);
  const lines = wrapped(pdf, value, PAGE_WIDTH - MARGIN * 2);
  const height = lines.length * 4.2 + 4;
  if (y + height > CONTENT_BOTTOM) y = newPage(pdf);
  pdf.setTextColor(...MUTED);
  pdf.text(lines, MARGIN, y + 5, { lineHeightFactor: 1.2 });
  return y + height;
}

function drawHeader(pdf: jsPDF, metadata: FabricationWorkOrderPdfMetadata, logoDataUrl?: string | null) {
  let logoDrawn = false;
  if (logoDataUrl) {
    try {
      const image = pdf.getImageProperties(logoDataUrl);
      const scale = Math.min(42 / image.width, 12 / image.height);
      pdf.addImage(logoDataUrl, "PNG", MARGIN, 12, image.width * scale, image.height * scale, undefined, "FAST");
      logoDrawn = true;
    } catch { /* El título identifica el documento aunque falte el logo. */ }
  }
  if (!logoDrawn) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(37, 99, 183);
    pdf.text("VENTORA", MARGIN, 18);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...INK);
  pdf.text(["Orden de fabricación", "y materiales"], 62, 17, { lineHeightFactor: 1.14 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text("DOCUMENTO INTERNO · TALLER", MARGIN, 31);
  pdf.setDrawColor(...RULE);
  pdf.line(MARGIN, 34, PAGE_WIDTH - MARGIN, 34);
  pdf.setFontSize(9.5);
  pdf.setTextColor(...INK);
  const left = [`Empresa: ${clean(metadata.companyName, "Empresa")}`, `Trabajo: ${clean(metadata.workName, "—")}`];
  const right = [`Cotización: ${clean(metadata.quoteCode)}`, `Fecha: ${clean(metadata.issueDate)}`];
  let y = 40;
  for (let index = 0; index < left.length; index += 1) {
    const leftLines = wrapped(pdf, left[index]!, 94);
    const rightLines = wrapped(pdf, right[index]!, 84);
    pdf.text(leftLines, MARGIN, y, { lineHeightFactor: 1.2 });
    pdf.text(rightLines, 112, y, { lineHeightFactor: 1.2 });
    y += Math.max(leftLines.length, rightLines.length) * 4.3;
  }
  pdf.line(MARGIN, y + 1, PAGE_WIDTH - MARGIN, y + 1);
  return y + 4;
}

function drawPriceSummary(pdf: jsPDF, order: FabricationWorkOrder, y: number) {
  if (y + 19 > CONTENT_BOTTOM) y = newPage(pdf);
  const label = order.pricing.status === "complete" ? "Costo valorizado neto"
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
  return y + 17;
}

function drawFooters(pdf: jsPDF, quoteCode: string) {
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...RULE);
    pdf.line(MARGIN, 283, PAGE_WIDTH - MARGIN, 283);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...MUTED);
    pdf.text(`Uso interno · ${clean(quoteCode)}`, MARGIN, 288);
    pdf.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, 288, { align: "right" });
  }
}

export function createFabricationWorkOrderPdf(
  order: FabricationWorkOrder,
  metadata: FabricationWorkOrderPdfMetadata,
  logoDataUrl?: string | null
) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: false });
  pdf.setCharSpace(0);
  let y = drawHeader(pdf, metadata, logoDataUrl);
  y = drawPriceSummary(pdf, order, y);
  const profiles = order.materials.profiles.map((row): Row => {
    const supplierSku = row.supplierSku || (!row.price?.isWorkshopCode ? row.price?.sku : null);
    const code = `Técnico: ${clean(row.code)}${supplierSku ? `\nSKU proveedor: ${supplierSku}` : ""}${row.price?.isWorkshopCode ? `\nInterno taller: ${row.price.sku}` : ""}`;
    return { cells: [
      code,
      `${clean(row.description)}\n${clean(row.line, "Línea pendiente")}\n${clean(row.finish, "Acabado pendiente")}`,
      `${row.bars} ${row.bars === 1 ? "barra" : "barras"}\n${mm(row.commercialLengthMm)}`,
      row.price ? `${money(row.price.unitPrice, row.price.currency)}\n${row.price.basis}` : "Pendiente",
      row.price ? money(row.price.subtotal, row.price.currency) : "Pendiente",
      row.price ? workOrderPriceSource(row.price) : "Sin precio",
    ] };
  });
  y = drawTable(pdf, "1. Resumen de compra · perfiles", [
    { title: "Códigos", width: 43 }, { title: "Perfil / acabado", width: 44 },
    { title: "Compra", width: 28 }, { title: "Unitario", width: 22, align: "right" },
    { title: "Subtotal", width: 22, align: "right" }, { title: "Fuente", width: 23 },
  ], profiles, y, "Sin barras en la pauta conjunta guardada");

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
  ], accessories, y, "Sin accesorios registrados");

  const cuts = order.cutGroups.map((group): Row => ({ cells: [
    `${group.technicalCode} · ${group.profileName}\n${group.barIndex == null ? "Distribución por barra pendiente" : `Barra ${group.barIndex} · ${mm(group.commercialLengthMm)}`}`,
    group.cuts.length
      ? group.cuts.map((cut) => `${cut.itemCode} · ${cut.component} · ${cut.functionName}\n${cut.quantity} × ${mm(cut.lengthMm)}`).join("\n")
      : "Sin cortes guardados",
    group.barIndex == null ? "Pendiente" : mm(group.theoreticalRemnantMm),
  ] }));
  y = drawTable(pdf, "2. Pauta de corte", [
    { title: "Barra / perfil", width: 47 }, { title: "Cortes agrupados", width: 100 },
    { title: "Remanente teórico", width: 35, align: "right" },
  ], cuts, y, "Pauta de corte pendiente");
  y = drawNote(pdf, "En cada barra se agrupan partida, componente, función, cantidad y largo. El remanente teórico corresponde al conjunto completo; confirmar kerf y despunte antes de decidir si puede aprovecharse.", y);

  const glass = order.glass.map((row): Row => ({ cells: [
    `${clean(row.itemCode, "Partida pendiente")}\n${row.paneReference}`,
    `${clean(row.type)}\nEspesor: ${clean(row.thickness)}`,
    row.widthMm != null && row.heightMm != null ? `${mm(row.widthMm)} × ${mm(row.heightMm)}` : "Medidas pendientes",
    row.quantity == null ? "Pendiente" : String(row.quantity),
    row.issue?.includes("superficie contradictoria") ? "Pendiente de revisar" : area(row.totalM2),
  ] }));
  y = drawTable(pdf, "3. Orden de vidrios", [
    { title: "Partida / paño", width: 46 }, { title: "Tipo / espesor", width: 49 },
    { title: "Ancho × alto", width: 39 }, { title: "Cant.", width: 17, align: "right" },
    { title: "Superficie", width: 31, align: "right" },
  ], glass, y, "Sin paños guardados");

  const pending = order.pending.map((row): Row => ({ cells: [row.subject, row.action] }));
  drawTable(pdf, "4. Pendientes para el maestro", [
    { title: "Dato", width: 70 }, { title: "Acción", width: 112 },
  ], pending, y, "Sin pendientes detectados");
  drawFooters(pdf, metadata.quoteCode);
  return pdf;
}
