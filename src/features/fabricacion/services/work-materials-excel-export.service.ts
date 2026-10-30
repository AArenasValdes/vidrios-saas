import type * as XLSXModule from "xlsx";

import type { WorkMaterialsDocument } from "./fabrication-work-materials.service";
import type { FabricationWorkOrder } from "./fabrication-work-order.service";
import { calculateProfileReferenceTotal, formatProfilePriceBasis, resolveProfileSupplierPrice } from "./work-materials-price-reference.service";

export type WorkMaterialsExcelKind = "materials" | "glass-order" | "profile-cuts";

type BuildWorkbookInput = {
  kind: WorkMaterialsExcelKind;
  document: WorkMaterialsDocument;
  workOrder?: FabricationWorkOrder;
  includeSupplierPriceReferences?: boolean;
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
  numberFormats: Record<number, string> = {},
  note = "Cantidades según pauta conjunta y snapshots disponibles. Los datos pendientes permanecen sin valor asignado.",
  warning?: string
) {
  const populatedRows = rows.length > 0 ? rows : [["Sin datos registrados"]];
  const data: Array<Array<string | number | null>> = [
    [`VENTORA · ${title}`],
    [warning ?? "Documento interno de taller"],
    [],
    ["Empresa", input.companyName || "Empresa", "Cotización", input.quoteCode],
    ["Trabajo", input.work || "—", "Fecha", input.issueDate],
    [],
    headers,
    ...populatedRows,
    [],
    [note],
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
    Title: input.kind === "materials" ? "Lista de materiales del trabajo" : input.kind === "glass-order" ? "Orden de vidrios" : "Pauta de cortes de perfiles",
    Subject: `Cotización ${input.quoteCode}`,
    Author: "Ventora",
    Company: input.companyName || "Ventora",
  };

  if (input.kind === "materials") {
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Perfiles totales",
      ["Código técnico", "SKU proveedor", "Perfil", "Línea", "Color aluminio", "Proveedor / origen", "Largo tira (mm)", "Tiras a comprar", "Partidas", "Precio unitario neto", "Total / subtotal", "Tipo de precio"],
      input.document.profiles.map((row) => {
        const supplierPrice = resolveProfileSupplierPrice(row, input.document.profilePriceReferences);
        const storedCost = row.price && row.price.sourceKind !== "reference" ? row.price : null;
        const referenceTotal = supplierPrice
          ? calculateProfileReferenceTotal(row, { unitPrice: supplierPrice.unitPrice, basis: supplierPrice.basis })
          : null;
        return [
          row.code,
          storedCost?.isWorkshopCode ? storedCost.sku : supplierPrice?.supplierSku ?? row.supplierSku ?? storedCost?.sku ?? "—",
          row.description,
          row.line,
          row.configuredFinish ?? row.finish,
          supplierPrice?.providerLabel ?? storedCost?.sourceLabel ?? "Sin proveedor asociado",
          row.commercialLengthMm,
          row.bars,
          row.itemCodes.join(", "),
          supplierPrice?.unitPrice ?? storedCost?.unitPrice ?? "Pendiente",
          supplierPrice ? referenceTotal ?? "No calculable" : storedCost?.subtotal ?? "Pendiente",
          supplierPrice ? "Total referencial" : storedCost ? "Costo guardado" : "Pendiente",
        ];
      }),
      [18, 22, 31, 18, 22, 29, 19, 17, 18, 20, 20, 20],
      { 6: "#,##0 \"mm\"", 7: "#,##0", 9: '"$"#,##0', 10: '"$"#,##0' }
    ), "Perfiles");
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Accesorios",
      ["Código", "Descripción", "Cantidad", "Unidad", "Línea", "Acabado", "Partidas", "Unitario neto", "Subtotal neto", "Fuente"],
      input.document.accessories.map((row) => [row.code ?? "—", row.description, row.quantity, row.unit, row.line, row.finish, row.itemCodes.join(", "), row.price?.unitPrice ?? "Pendiente", row.price?.subtotal ?? "Pendiente", row.price?.sourceLabel ?? "Sin precio"]),
      [15, 40, 15, 15, 24, 24, 22, 18, 18, 32],
      { 2: "#,##0.##", 7: '"$"#,##0', 8: '"$"#,##0' }
    ), "Accesorios");
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Vidrios",
      ["Código", "Descripción", "Línea", "Espesor", "Terminación", "Composición", "Superficie total (m²)", "Partidas"],
      input.document.glass.map((row) => [row.code ?? "—", [row.description, row.thicknessWarning].filter(Boolean).join("\n"), row.line, row.thickness || "Pendiente", row.finish || "—", row.composition || "—", row.totalM2, row.itemCodes.join(", ")]),
      [15, 40, 24, 16, 20, 24, 22, 22],
      { 6: "#,##0.0000 \"m²\"" }
    ), "Vidrios");
    const profilePriceReferences = input.document.profilePriceReferences ?? [];
    if (input.includeSupplierPriceReferences !== false && (profilePriceReferences.length || input.document.profilePriceReferencesStatus === "loaded" || input.document.profilePriceReferencesStatus === "loading" || input.document.profilePriceReferencesStatus === "unavailable")) {
      XLSX.utils.book_append_sheet(workbook, buildSheet(
        XLSX,
        input,
        "Referencias por perfil",
        ["Partidas", "Línea", "Código técnico", "Perfil", "Color aluminio", "Proveedor", "SKU proveedor", "Unidad precio", "Largo comercial (mm)", "Tiras pauta", "Precio unitario neto", "Total referencial", "Estado"],
        input.document.profiles.map((profile) => {
          const reference = resolveProfileSupplierPrice(profile, profilePriceReferences);
          const total = reference
            ? calculateProfileReferenceTotal(profile, { unitPrice: reference.unitPrice, basis: reference.basis })
            : null;
          const status = reference
            ? total == null ? "Unidad no calculable" : "Disponible · asociado a pauta"
            : input.document.profilePriceReferencesStatus === "unavailable" ? "Consulta no disponible"
              : input.document.profilePriceReferencesStatus === "loading" ? "Consulta pendiente"
                : profilePriceReferences.some((row) => row.technicalCode === profile.code) ? "Coincidencia no exacta" : "Sin referencia exacta";
          return [
            profile.itemCodes.join(", "), profile.line, profile.code, profile.description,
            profile.configuredFinish ?? profile.finish, reference?.providerLabel ?? "—", reference?.supplierSku ?? "—",
            formatProfilePriceBasis(reference?.basis), profile.commercialLengthMm, profile.bars,
            reference?.unitPrice ?? "Pendiente", total ?? "Pendiente", status,
          ];
        }),
        [18, 22, 20, 31, 22, 27, 22, 18, 20, 14, 20, 20, 28],
        { 8: "#,##0 \"mm\"", 9: "#,##0", 10: '"$"#,##0', 11: '"$"#,##0' },
        input.document.profilePriceReferencesStatus === "unavailable"
          ? "No se pudieron consultar los precios en este momento. Vuelve a generar el archivo para intentarlo otra vez."
          : input.document.profilePriceReferencesStatus === "loading"
            ? "La consulta de precios seguía en curso al generar este archivo. Vuelve a generarlo cuando termine."
            : profilePriceReferences.length
              ? `Precios unitarios asociados por identidad técnica${input.document.profilePriceReferencesCheckedAt ? ` · consulta ${input.document.profilePriceReferencesCheckedAt}` : ""}. El total referencial usa la cantidad de compra de la pauta y no es un costo guardado ni una cotización confirmada.`
              : "No se encontraron referencias técnicas exactas. Las filas pendientes no reciben proveedor ni precio por similitud de nombre."
      ), "Precios perfiles");
    }
  } else if (input.kind === "glass-order") {
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Orden de vidrios",
      ["Grupo de vidrio", "Referencia del paño", "Tipo de vidrio", "Espesor confirmado", "Código", "Ancho (mm)", "Alto (mm)", "Cantidad", "m² por paño", "m² totales"],
      input.document.glassOrder.map((row) => [
        row.groupLabel,
        `${row.paneReference} · ${row.componentName}`,
        row.description,
        row.thickness || "Pendiente",
        row.code ?? "—",
        row.measuresPending ? "Medidas pendientes" : row.widthMm,
        row.measuresPending ? "Medidas pendientes" : row.heightMm,
        row.quantity ?? "Pendiente",
        row.areaEachM2,
        row.totalM2,
      ]),
      [30, 30, 38, 20, 15, 20, 20, 14, 18, 18],
      { 5: "#,##0 \"mm\"", 6: "#,##0 \"mm\"", 7: "#,##0.##", 8: "#,##0.0000 \"m²\"", 9: "#,##0.0000 \"m²\"" }
    ), "Orden de vidrios");
  } else {
    const groups = input.workOrder?.cutGroups ?? [];
    XLSX.utils.book_append_sheet(workbook, buildSheet(
      XLSX,
      input,
      "Cortes agrupados",
      ["Código de perfil", "Perfil", "Línea", "Color aluminio", "Proveedor / origen", "SKU proveedor", "Presentación / tira", "Partida", "Componente", "Función", "Cantidad", "Largo de corte (mm)", "Remanente teórico (mm)"],
      groups.flatMap((group) => group.cuts.length
        ? group.cuts.map((cut) => [group.technicalCode, group.profileName, group.line ?? "Pendiente", group.finish ?? "Pendiente", group.supplierLabel ?? "Proveedor pendiente", group.supplierSku ?? "—", group.barIndex == null ? "Distribución pendiente" : `Tira ${group.barIndex} · ${group.commercialLengthMm ?? "largo pendiente"} mm`, cut.itemCode, cut.component, cut.functionName, cut.quantity, cut.lengthMm, group.theoreticalRemnantMm ?? "Pendiente"])
        : [[group.technicalCode, group.profileName, group.line ?? "Pendiente", group.finish ?? "Pendiente", group.supplierLabel ?? "Proveedor pendiente", group.supplierSku ?? "—", group.barIndex == null ? "Distribución pendiente" : `Tira ${group.barIndex} · ${group.commercialLengthMm ?? "largo pendiente"} mm`, "—", "—", "—", "—", "—", group.theoreticalRemnantMm ?? "Pendiente"]]),
      [18, 30, 18, 22, 28, 20, 27, 16, 32, 22, 14, 22, 25],
      { 10: "#,##0", 11: "#,##0 \"mm\"", 12: "#,##0 \"mm\"" },
      "Largos y cantidades según pauta guardada. Remanentes teóricos: no consideran condiciones de aprovechamiento del taller. No es optimización de planchas de vidrio."
    ), "Cortes perfiles");
    const preliminaryGroups = input.workOrder?.preliminaryCutGroups ?? [];
    if (preliminaryGroups.length > 0) {
      XLSX.utils.book_append_sheet(workbook, buildSheet(
        XLSX,
        input,
        "Despiece estructural preliminar · acristalamiento pendiente",
        ["Código de perfil", "Perfil", "Partida", "Componente", "Función", "Cantidad", "Largo geométrico (mm)"],
        preliminaryGroups.flatMap((group) => group.cuts.map((cut) => [
          group.technicalCode, group.profileName, cut.itemCode, cut.component,
          cut.functionName, cut.quantity, cut.lengthMm,
        ])),
        [20, 34, 17, 32, 24, 14, 25],
        { 5: "#,##0", 6: "#,##0 \"mm\"" },
        "Geometría de revisión separada de la pauta operativa. No representa cantidades de compra ni distribución de barras.",
        "DOCUMENTO PARCIAL · NO APTO PARA FABRICACIÓN. Acristalamiento pendiente; no usar estos cortes como pauta operativa."
      ), "Despiece preliminar");
    }
  }

  return workbook;
}
