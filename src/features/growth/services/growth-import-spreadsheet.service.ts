import "server-only";

import * as XLSX from "xlsx";

import type { CreateGrowthProspectInput } from "@/features/growth/types/growth-dashboard";

type SpreadsheetRow = Record<string, string>;

export const GROWTH_IMPORT_MAX_ROWS = 5_000;
export const GROWTH_IMPORT_MAX_COLUMNS = 50;
export const GROWTH_IMPORT_MAX_CELL_CHARS = 10_000;

const HEADER_ALIASES: Record<
  keyof CreateGrowthProspectInput | "rubro" | "segmento",
  string[]
> = {
  empresa: ["empresa", "company", "razon social", "razón social", "nombre empresa", "negocio"],
  nombre: ["nombre", "contacto", "contacto nombre", "persona", "representante"],
  whatsapp: ["whatsapp", "telefono", "teléfono", "tel", "celular", "movil", "móvil"],
  ciudad: ["ciudad", "comuna", "region", "región", "ubicacion", "ubicación", "zona"],
  origen: ["origen", "fuente", "canal", "source"],
  estado: ["estado", "status"],
  proximoPaso: ["proximo paso", "próximo paso", "next step", "accion", "acción"],
  fechaProximoSeguimiento: [
    "fecha seguimiento",
    "fecha proximo contacto",
    "fecha próximo contacto",
    "followup",
    "vence",
  ],
  notas: ["notas", "notes", "comentarios", "observaciones", "mensaje", "angulo", "ángulo"],
  rubro: ["rubro", "industria"],
  segmento: ["segmento", "prioridad", "tier"],
  convertedOrganizationId: [],
  legacySourceId: [],
  noContactar: [],
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

export function parseCsvTextToRows(text: string): SpreadsheetRow[] {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, GROWTH_IMPORT_MAX_ROWS + 1);
  if (lines.length < 2) {
    return [];
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = parseCsvLine(lines[0], delimiter)
    .slice(0, GROWTH_IMPORT_MAX_COLUMNS)
    .map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row: SpreadsheetRow = {};

    headers.forEach((header, index) => {
      row[header] = (values[index]?.trim() ?? "").slice(
        0,
        GROWTH_IMPORT_MAX_CELL_CHARS
      );
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

export function parseXlsxBufferToRows(buffer: ArrayBuffer): SpreadsheetRow[] {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    sheetRows: GROWTH_IMPORT_MAX_ROWS + 1,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!Array.isArray(matrix) || matrix.length < 2) {
    return [];
  }

  const headerRow = matrix[0];
  if (!Array.isArray(headerRow)) {
    return [];
  }

  const headers = headerRow
    .slice(0, GROWTH_IMPORT_MAX_COLUMNS)
    .map((cell) => normalizeHeader(stringifyCellValue(cell)));
  const rows: SpreadsheetRow[] = [];

  for (const rawRow of matrix.slice(1, GROWTH_IMPORT_MAX_ROWS + 1)) {
    if (!Array.isArray(rawRow)) {
      continue;
    }

    const row: SpreadsheetRow = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      const value = stringifyCellValue(rawRow[index]).slice(
        0,
        GROWTH_IMPORT_MAX_CELL_CHARS
      );
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

export const SUPPORTED_SPREADSHEET_EXTENSIONS = [".csv", ".txt", ".xlsx", ".xls"] as const;

export function isSupportedSpreadsheetFileName(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  return SUPPORTED_SPREADSHEET_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

export function parseSpreadsheetUpload(input: {
  fileName: string;
  text?: string;
  buffer?: ArrayBuffer;
}): SpreadsheetRow[] {
  const fileName = input.fileName.toLowerCase();

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    return input.text ? parseCsvTextToRows(input.text) : [];
  }

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return input.buffer ? parseXlsxBufferToRows(input.buffer) : [];
  }

  return [];
}

function cellValue(row: SpreadsheetRow, aliases: string[]) {
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);
    if (aliases.some((alias) => normalizedKey === normalizeHeader(alias))) {
      return value.trim();
    }
  }
  return "";
}

function toYmd(value: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString().slice(0, 10);
  }

  const parts = value.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((part) => Number(part));
    if (c > 1000) {
      return `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
  }

  return new Date().toISOString().slice(0, 10);
}

export function mapSpreadsheetRowsToProspects(
  rows: SpreadsheetRow[]
): CreateGrowthProspectInput[] {
  return rows
    .map((row) => {
      const empresa = cellValue(row, HEADER_ALIASES.empresa);
      if (!empresa) {
        return null;
      }

      return {
        empresa,
        nombre: cellValue(row, HEADER_ALIASES.nombre),
        whatsapp: cellValue(row, HEADER_ALIASES.whatsapp) || "+56 9 ",
        ciudad: cellValue(row, HEADER_ALIASES.ciudad),
        origen: cellValue(row, HEADER_ALIASES.origen) || "Importado",
        estado: "nuevo",
        proximoPaso: cellValue(row, HEADER_ALIASES.proximoPaso) || "Primer contacto",
        fechaProximoSeguimiento: toYmd(
          cellValue(row, HEADER_ALIASES.fechaProximoSeguimiento)
        ),
        notas: cellValue(row, HEADER_ALIASES.notas),
        rubro: cellValue(row, HEADER_ALIASES.rubro) || undefined,
        segmento: cellValue(row, HEADER_ALIASES.segmento) || undefined,
      } as CreateGrowthProspectInput;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null) as CreateGrowthProspectInput[];
}
