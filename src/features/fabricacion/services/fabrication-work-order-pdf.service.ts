import { jsPDF } from "jspdf";

import type { FabricationWorkOrder } from "./fabrication-work-order.service";
import { workOrderPriceSource } from "./fabrication-work-order.service";
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

function newPage(pdf: jsPDF, title: string, quoteCode: string, logoDataUrl?: string | null) {
  pdf.addPage("a4", "portrait");
  return drawFabricationPdfContinuationHeader(pdf, title, quoteCode, logoDataUrl);
}

function sectionTitle(pdf: jsPDF, title: string, y: number) {
  return drawFabricationPdfSectionTitle(pdf, title, y);
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

function drawTable(pdf: jsPDF, title: string, columns: Column[], values: Row[], startY: number, empty: string, runningTitle: string, quoteCode: string, logoDataUrl?: string | null) {
  const rows = values.length ? values : [{ cells: [empty, ...columns.slice(1).map(() => "—")] }];
  let y = startY + 4;
  if (y + 5 + 9 + 11 > CONTENT_BOTTOM) y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
  y = tableHead(pdf, columns, sectionTitle(pdf, title, y));
  rows.forEach((row, index) => {
    const cellLines = row.cells.map((cell, cellIndex) => wrapped(pdf, cell, columns[cellIndex]!.width));
    const totalLines = Math.max(...cellLines.map((lines) => lines.length));
    let lineOffset = 0;
    while (lineOffset < totalLines) {
      const linesAvailable = Math.floor((CONTENT_BOTTOM - y - 4) / 4.05);
      if (linesAvailable < 2) {
        y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
        y = tableHead(pdf, columns, sectionTitle(pdf, `${title} · continuación`, y));
        continue;
      }
      const lineCount = Math.min(totalLines - lineOffset, linesAvailable);
      const fragment: Row = {
        cells: cellLines.map((lines) => lines.slice(lineOffset, lineOffset + lineCount).join("\n") || " "),
      };
      const height = rowHeight(pdf, fragment, columns);
      if (y + height > CONTENT_BOTTOM) {
        y = newPage(pdf, runningTitle, quoteCode, logoDataUrl);
        y = tableHead(pdf, columns, sectionTitle(pdf, `${title} · continuación`, y));
        continue;
      }
      y = tableRow(pdf, fragment, columns, y, height, index);
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
  let y = drawFabricationPdfHeader(pdf, metadata, title, logoDataUrl);
  const runningTitle = title;
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

  if (kind === "combined" || kind === "profile-cuts") {
  const cuts = order.cutGroups.map((group): Row => {
    const profile = `${group.technicalCode} · ${group.profileName}`;
    const cutRows = group.cuts.length
      ? group.cuts.map((cut) => `${cut.itemCode} · ${cut.functionName}\n${cut.quantity} × ${mm(cut.lengthMm)}`).join("\n")
      : "Sin cortes guardados";
    const presentation = group.barIndex == null
      ? "Distribución por tira pendiente"
      : `Tira ${group.barIndex} · ${mm(group.commercialLengthMm)}`;

    // The standalone profile-cut sheet is for the person cutting the bars:
    // keep only the profile identity, saved cuts, and theoretical remnant.
    // The combined work order retains its purchase context in its own section.
    return kind === "profile-cuts"
      ? { cells: [`${profile}\n${presentation}`, cutRows, group.barIndex == null ? "Pendiente" : mm(group.theoreticalRemnantMm)] }
      : { cells: [
          `${profile}\n${clean(group.line, "Línea pendiente")} · Color aluminio: ${clean(group.finish, "Pendiente")}\n${presentation}`,
          cutRows,
          `${clean(group.supplierLabel, "Proveedor pendiente")}${group.supplierSku ? `\nSKU ${group.supplierSku}` : ""}`,
          group.barIndex == null ? "Pendiente" : mm(group.theoreticalRemnantMm),
        ] };
  });
  y = drawTable(pdf, kind === "profile-cuts" ? "Cortes agrupados" : "2. Pauta de corte", kind === "profile-cuts" ? [
    { title: "Código / perfil", width: 56 }, { title: "Cortes por componente", width: 89 },
    { title: "Remanente", width: 37, align: "right" },
  ] : [
    { title: "Perfil / línea / color", width: 50 }, { title: "Cortes agrupados", width: 80 },
    { title: "Proveedor / SKU", width: 30 }, { title: "Remanente teórico", width: 22, align: "right" },
  ], cuts, y, "Pauta de corte pendiente", runningTitle, metadata.quoteCode, logoDataUrl);
  y = drawNote(pdf, kind === "profile-cuts"
    ? "Remanente teórico. Confirmar kerf, despunte y condiciones del taller antes de cortar."
    : "Los largos provienen de la pauta guardada; el remanente es teórico. Confirmar kerf, despunte y condiciones del taller antes de fabricar. No representa una optimización de planchas de vidrio.",
  y, runningTitle, metadata.quoteCode, logoDataUrl);
  if (order.preliminaryCutGroups.length > 0) {
    y = drawPreliminaryWarning(pdf, y + 2, runningTitle, metadata.quoteCode, logoDataUrl);
    const preliminaryCuts = order.preliminaryCutGroups.map((group): Row => {
      const profile = `${group.technicalCode} · ${group.profileName}`;
      const cutRows = group.cuts.length
        ? group.cuts.map((cut) => `${cut.itemCode} · ${cut.functionName}\n${cut.quantity} × ${mm(cut.lengthMm)}`).join("\n")
        : "Sin cortes de geometría disponibles";
      return kind === "profile-cuts"
        ? { cells: [`${profile}\nDistribución no calculada`, cutRows, "No aplica"] }
        : { cells: [
            `${profile}\n${clean(group.line, "Línea pendiente")} · Color aluminio: ${clean(group.finish, "Pendiente")}\nDistribución no calculada`,
            cutRows,
            "No asociar a proveedor",
            "No aplica",
          ] };
    });
    const preliminaryTitle = "Despiece estructural preliminar · acristalamiento pendiente";
    y = drawTable(pdf, preliminaryTitle, kind === "profile-cuts" ? [
      { title: "Código / perfil", width: 56 }, { title: "Cortes por componente", width: 89 },
      { title: "Distribución", width: 37, align: "right" },
    ] : [
      { title: "Perfil / línea / color", width: 50 }, { title: "Cortes geométricos", width: 80 },
      { title: "Estado", width: 30 }, { title: "Distribución", width: 22, align: "right" },
    ], preliminaryCuts, y, "Sin cortes geométricos", runningTitle, metadata.quoteCode, logoDataUrl);
  }
  }

  if (kind === "combined" || kind === "glass-order") {
  const glass = order.glass.map((row): Row => ({ cells: [
    `${clean(row.itemCode, "Partida pendiente")}\n${row.paneReference}`,
    `${clean(row.type)}\nEspesor: ${clean(row.thickness)}`,
    row.widthMm != null && row.heightMm != null ? `${mm(row.widthMm)} × ${mm(row.heightMm)}` : "Medidas pendientes",
    row.quantity == null ? "Pendiente" : String(row.quantity),
    row.issue ? "Pendiente de revisar" : area(row.totalM2),
  ] }));
  y = drawTable(pdf, kind === "glass-order" ? "Paños identificados · revisar antes de distribuir o cortar" : "3. Orden de vidrios", [
    { title: "Partida / paño", width: 46 }, { title: "Tipo / espesor", width: 49 },
    { title: "Ancho × alto", width: 39 }, { title: "Cant.", width: 17, align: "right" },
    { title: "Superficie", width: 31, align: "right" },
  ], glass, y, "Sin paños guardados", runningTitle, metadata.quoteCode, logoDataUrl);
  y = drawNote(pdf, "Referencias y medidas desde la cotización y snapshots guardados. No confirman por sí solas medidas finales ni cobertura operativa para distribuir o cortar.", y + 2, runningTitle, metadata.quoteCode, logoDataUrl);
  }

  if (kind === "combined") {
    const pending = order.pending.map((row): Row => ({ cells: [row.subject, row.action] }));
    drawTable(pdf, "4. Pendientes para el maestro", [
      { title: "Dato", width: 70 }, { title: "Acción", width: 112 },
    ], pending, y, "Sin pendientes detectados", runningTitle, metadata.quoteCode, logoDataUrl);
  }
  drawFabricationPdfFooters(pdf, metadata.quoteCode);
  return pdf;
}
