import type * as XLSXModule from "xlsx";

import type { WorkMaterialsDocument } from "./fabrication-work-materials.service";

export type WorkMaterialsExcelKind = "materials" | "glass-order";

type BuildWorkbookInput = {
  kind: WorkMaterialsExcelKind;
  document: WorkMaterialsDocument;
  companyName: string;
  quoteCode: string;
  work: string;
  issueDate: string;
};

type SpreadsheetColumn = { wch: number };

function buildSheet(
  XLSX: typeof XLSXModule,
  input: BuildWorkbookInput,
  title: string,
  headers: Array<string | number>,
  rows: Array<Array<string | number | null>>,
  columnWidths: number[],
  numberFormats: Record<number, string> = {}
) {
  const populatedRows = rows.length > 0 ? rows : [["Sin datos registrados"]];
  const data: Array<Array<string | number | null>> = [
    [`VENTORA · ${title}`],
    ["Documento interno de taller"],
    [],
    ["Empresa", input.companyName || "Empresa", "Cotización", input.quoteCode],
    ["Trabajo", input.work || "—", "Fecha", input.issueDate],
    [],
    headers,
    ...populatedRows,
    [],
    ["Cantidades según pauta conjunta y snapshots disponibles. Los datos pendientes permanecen sin valor asignado."],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const headerRow = 6;
  const lastDataRow = headerRow + populatedRows.length;
  const lastColumn = headers.length - 1;
  const lastCell = XLSX.utils.encode_cell({ r: lastDataRow, c: lastColumn });

  worksheet["!cols"] = columnWidths.map((wch): SpreadsheetColumn => ({ wch }));
  worksheet["!rows"] = [
    { hpt: 30 },
    { hpt: 19 },
    { hpt: 9 },
    { hpt: 22 },
    { hpt: 22 },
    { hpt: 9 },
    { hpt: 30 },
    ...populatedRows.map(() => ({ hpt: 23 })),
    { hpt: 9 },
    { hpt: 30 },
  ];
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
    { s: { r: data.length - 1, c: 0 }, e: { r: data.length - 1, c: lastColumn } },
  ];
  worksheet["!autofilter"] = { ref: `A${headerRow + 1}:${lastCell}` };
  worksheet["!margins"] = { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  worksheet["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  worksheet["!printOptions"] = { horizontalCentered: false, verticalCentered: false };

  for (const [columnIndex, numberFormat] of Object.entries(numberFormats)) {
    const column = Number(columnIndex);
    for (let rowIndex = headerRow + 1; rowIndex <= lastDataRow; rowIndex += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: column })];
      if (cell && typeof cell.v === "number") cell.z = numberFormat;
    }
  }

  return worksheet;
}

export function buildWorkMaterialsWorkbook(XLSX: typeof XLSXModule, input: BuildWorkbookInput) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: input.kind === "materials" ? "Lista de materiales del trabajo" : "Orden de vidrios",
    Subject: `Cotización ${input.quoteCode}`,
    Author: "Ventora",
    Company: input.companyName || "Ventora",
  };

  if (input.kind === "materials") {
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Perfiles totales",
      ["Código", "Perfil", "Línea", "Acabado comercial", "Largo de barra (mm)", "Barras a comprar", "Partidas"],
      input.document.profiles.map((row) => [row.code, row.description, row.line, row.finish, row.commercialLengthMm, row.bars, row.itemCodes.join(", ")]),
      [15, 34, 24, 24, 20, 20, 22],
      { 4: "#,##0 \"mm\"", 5: "#,##0" }
    ), "Perfiles");
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Accesorios",
      ["Código", "Descripción", "Cantidad", "Unidad", "Línea", "Acabado", "Partidas"],
      input.document.accessories.map((row) => [row.code ?? "—", row.description, row.quantity, row.unit, row.line, row.finish, row.itemCodes.join(", ")]),
      [15, 40, 15, 15, 24, 24, 22],
      { 2: "#,##0.##" }
    ), "Accesorios");
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Vidrios",
      ["Código", "Descripción", "Línea", "Espesor", "Terminación", "Composición", "Superficie total (m²)", "Partidas"],
      input.document.glass.map((row) => [row.code ?? "—", row.description, row.line, row.thickness || "Pendiente", row.finish || "—", row.composition || "—", row.totalM2, row.itemCodes.join(", ")]),
      [15, 40, 24, 16, 20, 24, 22, 22],
      { 6: "#,##0.0000 \"m²\"" }
    ), "Vidrios");
  } else {
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Orden de vidrios",
      ["Grupo de vidrio", "Referencia del paño", "Tipo de vidrio", "Código", "Ancho (mm)", "Alto (mm)", "Cantidad", "m² por paño", "m² totales"],
      input.document.glassOrder.map((row) => [
        row.groupLabel,
        `${row.paneReference} · ${row.componentName}`,
        row.description,
        row.code ?? "—",
        row.measuresPending ? "Medidas pendientes" : row.widthMm,
        row.measuresPending ? "Medidas pendientes" : row.heightMm,
        row.quantity ?? "Pendiente",
        row.areaEachM2,
        row.totalM2,
      ]),
      [30, 30, 38, 15, 20, 20, 14, 18, 18],
      { 4: "#,##0 \"mm\"", 5: "#,##0 \"mm\"", 6: "#,##0.##", 7: "#,##0.0000 \"m²\"", 8: "#,##0.0000 \"m²\"" }
    ), "Orden de vidrios");
  }

  return workbook;
}
