import * as XLSX from "xlsx";

import {
  LINE_TEMPLATE_CATEGORIAS,
  LINE_TEMPLATE_UNIDADES_COBRO,
  type CotizacionLineTemplate,
  type CotizacionLineTemplateCategoria,
  type CotizacionLineTemplateMaterial,
  type CotizacionLineTemplateUnidadCobro,
  type CreateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

import {
  findExistingTemplateForImport,
  isTechnicalPriceFillCandidate,
  mergeCatalogMetadataForCommercialUpdate,
} from "./line-template-import-match.service";

export type LineTemplateSpreadsheetRow = Record<string, string>;

export type LineTemplateImportField =
  | "nombre"
  | "categoria"
  | "material"
  | "unidadCobro"
  | "costoBase"
  | "precioVenta"
  | "minimoCobrable"
  | "redondeoPrecio"
  | "mermaPct"
  | "margenObjetivoPct"
  | "proveedor"
  | "vigenciaDesde"
  | "vigenciaHasta"
  | "vidrioPrincipalRecomendado"
  | "espesor"
  | "terminacion";

export type LineTemplateColumnMapping = Partial<Record<LineTemplateImportField, string>>;

export type LineTemplateImportPreviewRow = {
  rowNumber: number;
  status: "ready" | "invalid" | "duplicate" | "technical" | "price_match";
  errors: string[];
  nombre: string;
  payload: Omit<CreateCotizacionLineTemplateInput, "organizationId"> | null;
  technicalProfileCount?: number;
  technicalTipo?: string;
  matchKind?: "exact_name" | "line_code" | "fuzzy_name";
  matchedTemplateNombre?: string;
};

export const LINE_TEMPLATE_IMPORT_FIELDS: Array<{
  key: LineTemplateImportField;
  label: string;
  required?: boolean;
}> = [
  { key: "nombre", label: "Nombre de producto", required: true },
  { key: "categoria", label: "Categoria" },
  { key: "material", label: "Material (Aluminio/PVC/Cristal)" },
  { key: "unidadCobro", label: "Unidad de cobro" },
  { key: "costoBase", label: "Costo base" },
  { key: "precioVenta", label: "Precio de venta" },
  { key: "minimoCobrable", label: "Minimo comercial" },
  { key: "redondeoPrecio", label: "Redondeo" },
  { key: "mermaPct", label: "Merma %" },
  { key: "margenObjetivoPct", label: "Margen objetivo %" },
  { key: "proveedor", label: "Proveedor" },
  { key: "vigenciaDesde", label: "Vigencia desde" },
  { key: "vigenciaHasta", label: "Vigencia hasta" },
  { key: "vidrioPrincipalRecomendado", label: "Vidrio recomendado" },
  { key: "espesor", label: "Espesor" },
  { key: "terminacion", label: "Terminacion / descripcion" },
];

const HEADER_ALIASES: Record<LineTemplateImportField, string[]> = {
  nombre: ["nombre", "linea", "linea", "producto", "cristal", "vidrio", "descripcion", "descripcion", "item"],
  categoria: ["categoria", "categoria", "rubro", "familia", "tipo"],
  material: ["material", "aluminio pvc", "perfil"],
  unidadCobro: ["unidad", "unidad cobro", "unidad de cobro", "medida", "uom"],
  costoBase: ["costo", "costo base", "costo unitario", "costo proveedor"],
  precioVenta: [
    "precio",
    "precio venta",
    "precio de venta",
    "precio m2",
    "precio m²",
    "precio por m2",
    "precio por m²",
    "venta",
  ],
  minimoCobrable: ["minimo", "minimo", "minimo cobrable", "minimo comercial"],
  redondeoPrecio: ["redondeo", "redondear", "incremento"],
  mermaPct: ["merma", "merma %", "merma pct", "desperdicio"],
  margenObjetivoPct: ["margen", "margen objetivo", "margen %", "markup"],
  proveedor: ["proveedor", "supplier", "marca"],
  vigenciaDesde: ["vigencia desde", "desde", "valido desde", "valido desde"],
  vigenciaHasta: ["vigencia hasta", "hasta", "valido hasta", "valido hasta"],
  vidrioPrincipalRecomendado: ["vidrio recomendado"],
  espesor: ["espesor", "grosor", "mm"],
  terminacion: ["terminacion", "terminacion", "descripcion", "descripcion", "acabado"],
};

export const SUPPORTED_LINE_TEMPLATE_IMPORT_EXTENSIONS = [
  ".csv",
  ".txt",
  ".xlsx",
  ".xls",
  ".pdf",
] as const;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeImportHeader(value: string) {
  return normalizeHeader(value);
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsvTextToLineTemplateRows(text: string): LineTemplateSpreadsheetRow[] {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row: LineTemplateSpreadsheetRow = {};

    headers.forEach((header, index) => {
      if (header) {
        row[header] = values[index]?.trim() ?? "";
      }
    });

    return row;
  });
}

function stringifyCellValue(value: unknown) {
  if (value == null) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function matrixToRows(matrix: unknown[][]): LineTemplateSpreadsheetRow[] {
  if (!Array.isArray(matrix) || matrix.length < 2) {
    return [];
  }

  const headerRow = matrix[0];
  if (!Array.isArray(headerRow)) {
    return [];
  }

  const headers = headerRow.map((cell) => normalizeHeader(stringifyCellValue(cell)));
  const rows: LineTemplateSpreadsheetRow[] = [];

  for (const rawRow of matrix.slice(1)) {
    if (!Array.isArray(rawRow)) {
      continue;
    }

    const row: LineTemplateSpreadsheetRow = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      if (!header) {
        return;
      }

      const value = stringifyCellValue(rawRow[index]);
      if (value) {
        hasValue = true;
      }
      row[header] = value;
    });

    if (hasValue) {
      rows.push(row);
    }
  }

  return rows;
}

export function listXlsxSheetNames(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  return workbook.SheetNames;
}

export function parseXlsxSheetToRows(buffer: ArrayBuffer, sheetName: string): LineTemplateSpreadsheetRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return matrixToRows(matrix as unknown[][]);
}

export function parseXlsxBufferToLineTemplateRows(buffer: ArrayBuffer): LineTemplateSpreadsheetRow[] {
  const sheetNames = listXlsxSheetNames(buffer);
  if (sheetNames.length === 0) {
    return [];
  }

  return parseXlsxSheetToRows(buffer, sheetNames[0]);
}

export function isSupportedLineTemplateImportFileName(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  return SUPPORTED_LINE_TEMPLATE_IMPORT_EXTENSIONS.some((extension) =>
    normalized.endsWith(extension)
  );
}

export function parseLineTemplateSpreadsheetUpload(input: {
  fileName: string;
  text?: string;
  buffer?: ArrayBuffer;
  sheetName?: string;
}): LineTemplateSpreadsheetRow[] {
  const fileName = input.fileName.toLowerCase();

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    return input.text ? parseCsvTextToLineTemplateRows(input.text) : [];
  }

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    if (!input.buffer) {
      return [];
    }

    if (input.sheetName) {
      return parseXlsxSheetToRows(input.buffer, input.sheetName);
    }

    return parseXlsxBufferToLineTemplateRows(input.buffer);
  }

  return [];
}

export function extractSpreadsheetHeaders(rows: LineTemplateSpreadsheetRow[]): string[] {
  const headers = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key.trim()) {
        headers.add(key);
      }
    }
  }
  return [...headers];
}

function cellValue(row: LineTemplateSpreadsheetRow, header?: string) {
  if (!header) {
    return "";
  }

  return row[header]?.trim() ?? "";
}

function findHeaderByAliases(headers: string[], aliases: string[]) {
  for (const header of headers) {
    const normalizedHeader = normalizeHeader(header);
    if (aliases.some((alias) => normalizedHeader === normalizeHeader(alias))) {
      return header;
    }
  }

  return "";
}

export function suggestLineTemplateColumnMapping(
  headers: string[]
): LineTemplateColumnMapping {
  const mapping: LineTemplateColumnMapping = {};

  for (const field of LINE_TEMPLATE_IMPORT_FIELDS) {
    const match = findHeaderByAliases(headers, HEADER_ALIASES[field.key]);
    if (match) {
      mapping[field.key] = match;
    }
  }

  return mapping;
}

export function scoreSpreadsheetHeaderRow(headers: string[]) {
  let score = 0;

  for (const field of LINE_TEMPLATE_IMPORT_FIELDS) {
    const match = findHeaderByAliases(headers, HEADER_ALIASES[field.key]);
    if (!match) {
      continue;
    }

    score += field.required ? 2 : 1;
  }

  return score;
}

function parseMoney(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function parsePercent(value: string) {
  const normalized = value.replace("%", "").replace(",", ".").trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCategoriaValue(value: string): CotizacionLineTemplateCategoria | null {
  const normalized = normalizeHeader(value);
  if (!normalized) {
    return null;
  }

  if ((LINE_TEMPLATE_CATEGORIAS as readonly string[]).includes(normalized)) {
    return normalized as CotizacionLineTemplateCategoria;
  }

  if (normalized.includes("pvc")) return "pvc";
  if (normalized.includes("vidrio") || normalized.includes("cristal")) return "vidrio";
  if (normalized.includes("shower") || normalized.includes("bano")) return "shower";
  if (normalized.includes("acces")) return "accesorios";
  if (normalized.includes("alumin")) return "aluminio";

  return "otros";
}

function normalizeMaterialValue(
  value: string,
  categoria: CotizacionLineTemplateCategoria
): CotizacionLineTemplateMaterial {
  if (categoria === "vidrio") {
    return "Cristal";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "pvc") {
    return "PVC";
  }
  if (normalized.includes("alumin")) {
    return "Aluminio";
  }

  return categoria === "pvc" ? "PVC" : "Aluminio";
}

function normalizeUnidadValue(value: string): CotizacionLineTemplateUnidadCobro {
  const normalized = normalizeHeader(value).replace(/\s+/g, "_");
  if (!normalized) {
    return "m2";
  }

  if (
    (LINE_TEMPLATE_UNIDADES_COBRO as readonly string[]).includes(normalized)
  ) {
    return normalized as CotizacionLineTemplateUnidadCobro;
  }

  if (normalized.includes("metro") || normalized === "ml") {
    return "metro_lineal";
  }
  if (normalized.includes("unidad") || normalized === "ud") {
    return "unidad";
  }
  if (normalized.includes("manual")) {
    return "valor_manual";
  }

  return "m2";
}

export function buildLineTemplateImportPreview(input: {
  rows: LineTemplateSpreadsheetRow[];
  mapping: LineTemplateColumnMapping;
  existingTemplates: CotizacionLineTemplate[];
}): LineTemplateImportPreviewRow[] {
  return input.rows.map((row, index) => {
    const errors: string[] = [];
    const nombre = cellValue(row, input.mapping.nombre);

    if (!nombre) {
      errors.push("Falta el nombre del producto.");
    }

    const categoria =
      normalizeCategoriaValue(cellValue(row, input.mapping.categoria)) ??
      normalizeCategoriaValue(cellValue(row, input.mapping.material)) ??
      "aluminio";
    const material = normalizeMaterialValue(cellValue(row, input.mapping.material), categoria);
    const precioVenta = parseMoney(cellValue(row, input.mapping.precioVenta));

    if (precioVenta <= 0) {
      errors.push("El precio de venta debe ser mayor a cero.");
    }

    const espesor = cellValue(row, input.mapping.espesor);
    const terminacion = cellValue(row, input.mapping.terminacion);
    const commercialMetadata: Record<string, string | number | boolean | null> = {};
    if (espesor) commercialMetadata.espesor = espesor;
    if (terminacion) commercialMetadata.terminacion = terminacion;

    const match = nombre
      ? findExistingTemplateForImport(input.existingTemplates, nombre)
      : null;
    const isPriceMatch =
      Boolean(match) &&
      isTechnicalPriceFillCandidate(match!.template, precioVenta);

    const resolvedNombre = isPriceMatch && match ? match.template.nombre : nombre;
    const catalogMetadata =
      isPriceMatch && match
        ? mergeCatalogMetadataForCommercialUpdate(
            match.template.catalogMetadata,
            commercialMetadata,
            precioVenta
          )
        : commercialMetadata;

    const payload: Omit<CreateCotizacionLineTemplateInput, "organizationId"> = {
      nombre: resolvedNombre,
      categoria:
        isPriceMatch && match ? match.template.categoria : categoria,
      unidadCobro:
        isPriceMatch && match
          ? match.template.unidadCobro
          : categoria === "vidrio"
            ? "m2"
            : normalizeUnidadValue(cellValue(row, input.mapping.unidadCobro)),
      material: isPriceMatch && match ? match.template.material : material,
      costoBase: parseMoney(cellValue(row, input.mapping.costoBase)),
      precioM2Sugerido: precioVenta,
      minimoCobrable: parseMoney(cellValue(row, input.mapping.minimoCobrable)),
      redondeoPrecio: parseMoney(cellValue(row, input.mapping.redondeoPrecio)) || 1000,
      mermaPct: parsePercent(cellValue(row, input.mapping.mermaPct)),
      margenObjetivoPct: (() => {
        const value = cellValue(row, input.mapping.margenObjetivoPct);
        return value ? parsePercent(value) : null;
      })(),
      proveedor: cellValue(row, input.mapping.proveedor) || null,
      vigenciaDesde: cellValue(row, input.mapping.vigenciaDesde) || null,
      vigenciaHasta: cellValue(row, input.mapping.vigenciaHasta) || null,
      vidrioPrincipalRecomendado:
        isPriceMatch && match
          ? match.template.vidrioPrincipalRecomendado
          : categoria === "vidrio"
            ? null
            : cellValue(row, input.mapping.vidrioPrincipalRecomendado) || null,
      catalogMetadata,
      isActive: true,
    };

    const status: LineTemplateImportPreviewRow["status"] = errors.length
      ? "invalid"
      : isPriceMatch
        ? "price_match"
        : match
          ? "duplicate"
          : "ready";

    return {
      rowNumber: index + 1,
      status,
      errors,
      nombre: nombre || `Fila ${index + 1}`,
      payload: errors.length ? null : payload,
      matchKind: match?.kind,
      matchedTemplateNombre:
        isPriceMatch || match ? match?.template.nombre : undefined,
    };
  });
}

export function countImportPreviewSummary(rows: LineTemplateImportPreviewRow[]) {
  return rows.reduce(
    (accumulator, row) => {
      if (row.status === "ready") {
        accumulator.ready += 1;
      } else if (row.status === "technical") {
        accumulator.technical += 1;
      } else if (row.status === "price_match") {
        accumulator.priceMatch += 1;
      } else if (row.status === "duplicate") {
        accumulator.duplicate += 1;
      } else {
        accumulator.invalid += 1;
      }
      return accumulator;
    },
    { ready: 0, technical: 0, priceMatch: 0, duplicate: 0, invalid: 0 }
  );
}
