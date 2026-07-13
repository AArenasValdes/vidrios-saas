import type { CotizacionLineTemplateCategoria } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

import {
  groupPdfTextItemsIntoRows,
  splitRowIntoCells,
  type PdfTextItem,
} from "./line-template-pdf-table.service";
import { loadPdfPageTextBundles, type PdfPageTextBundle } from "./line-template-pdf-text.service";

export type TechnicalCatalogProfile = {
  code: string;
  label: string;
};

export type TechnicalCatalogLine = {
  lineCode: string;
  nombre: string;
  descripcion: string;
  tipoComponente: string;
  categoria: CotizacionLineTemplateCategoria;
  profiles: TechnicalCatalogProfile[];
  pageNumbers: number[];
  vidrioResumen: string | null;
  anchoMarco: string | null;
};

export type TechnicalCatalogExtractionResult = {
  templateId: "arquetipo_aluminio" | "generic_technical";
  manufacturer: string | null;
  pageCount: number;
  lines: TechnicalCatalogLine[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
};

const LINE_INDEX_PATTERN = /l[ií]nea\s+(\d+)\s*-\s*(.+)/i;
const LINE_HEADER_PATTERN = /l[ií]nea\s+(\d+)\b/i;
const PROFILE_CODE_PATTERN = /^\d{4}$/;

function normalizeDescription(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
}

export function buildTechnicalLineNombre(lineCode: string, descripcion: string) {
  const label = normalizeDescription(descripcion);
  return `Linea ${lineCode} - ${label}`;
}

export function inferTechnicalCategoria(descripcion: string): CotizacionLineTemplateCategoria {
  const normalized = descripcion.trim().toLowerCase();

  if (normalized.includes("shower") || normalized.includes("tina")) {
    return "shower";
  }
  if (normalized.includes("vidrio") || normalized.includes("cristal")) {
    return "vidrio";
  }
  if (normalized.includes("pvc")) {
    return "pvc";
  }
  if (normalized.includes("accesor") || normalized.includes("quincaller")) {
    return "accesorios";
  }

  return "aluminio";
}

export function profilePrefixForLine(lineCode: string) {
  if (lineCode === "4000" || lineCode === "5000") {
    return lineCode.slice(0, 3);
  }

  return lineCode;
}

export function isProfileCodeForLine(code: string, lineCode: string) {
  if (!PROFILE_CODE_PATTERN.test(code)) {
    return false;
  }

  if (code === lineCode) {
    return false;
  }

  return code.startsWith(profilePrefixForLine(lineCode));
}

export function parseTechnicalLineIndexEntry(text: string) {
  const match = text.match(LINE_INDEX_PATTERN);
  if (!match) {
    return null;
  }

  const lineCode = match[1]?.trim() ?? "";
  const descripcion = match[2]?.trim() ?? "";

  if (!lineCode || !descripcion) {
    return null;
  }

  return {
    lineCode,
    descripcion: normalizeDescription(descripcion),
    nombre: buildTechnicalLineNombre(lineCode, descripcion),
    tipoComponente: normalizeDescription(descripcion),
    categoria: inferTechnicalCategoria(descripcion),
  };
}

function detectManufacturer(pages: PdfPageTextBundle[]) {
  const joined = pages
    .flatMap((page) => page.texts)
    .join(" ")
    .toLowerCase();

  if (joined.includes("arquetipo")) {
    return "Arquetipo";
  }

  return null;
}

function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectTemplateId(pages: PdfPageTextBundle[]): TechnicalCatalogExtractionResult["templateId"] {
  const joined = normalizeCatalogText(pages.flatMap((page) => page.texts).join(" "));

  if (joined.includes("arquetipo") && joined.includes("catalogo perfiles")) {
    return "arquetipo_aluminio";
  }

  return "generic_technical";
}

function extractIndexLines(pages: PdfPageTextBundle[]) {
  const lines = new Map<string, TechnicalCatalogLine>();

  for (const page of pages.slice(0, 6)) {
    for (const text of page.texts) {
      const parsed = parseTechnicalLineIndexEntry(text);
      if (!parsed) {
        continue;
      }

      lines.set(parsed.lineCode, {
        lineCode: parsed.lineCode,
        nombre: parsed.nombre,
        descripcion: parsed.descripcion,
        tipoComponente: parsed.tipoComponente,
        categoria: parsed.categoria,
        profiles: [],
        pageNumbers: [page.pageNumber],
        vidrioResumen: null,
        anchoMarco: null,
      });
    }
  }

  return lines;
}

function detectLineCodeFromHeader(text: string) {
  const match = text.match(LINE_HEADER_PATTERN);
  return match?.[1] ?? null;
}

function isLikelyProfileLabel(text: string) {
  const normalized = text.trim();
  if (!normalized || PROFILE_CODE_PATTERN.test(normalized)) {
    return false;
  }

  if (/^\d+([.,]\d+)?$/.test(normalized)) {
    return false;
  }

  if (/^(mm|página|pagina|catálogo|catalogo)$/i.test(normalized)) {
    return false;
  }

  return normalized.length >= 3;
}

function extractProfilesFromPage(
  page: PdfPageTextBundle,
  activeLineCode: string | null,
  lines: Map<string, TechnicalCatalogLine>
) {
  if (!activeLineCode || !lines.has(activeLineCode)) {
    return activeLineCode;
  }

  const line = lines.get(activeLineCode);
  if (!line) {
    return activeLineCode;
  }

  if (!line.pageNumbers.includes(page.pageNumber)) {
    line.pageNumbers.push(page.pageNumber);
  }

  const groupedRows = groupPdfTextItemsIntoRows(page.items);
  const existingCodes = new Set(line.profiles.map((profile) => profile.code));

  for (const row of groupedRows) {
    const cells = splitRowIntoCells(row);
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index]?.trim() ?? "";
      if (!isProfileCodeForLine(cell, activeLineCode) || existingCodes.has(cell)) {
        continue;
      }

      let label = "";
      for (let next = index + 1; next < cells.length; next += 1) {
        const candidate = cells[next]?.trim() ?? "";
        if (isLikelyProfileLabel(candidate)) {
          label = candidate;
          break;
        }
      }

      line.profiles.push({ code: cell, label });
      existingCodes.add(cell);
    }
  }

  for (const text of page.texts) {
    if (!PROFILE_CODE_PATTERN.test(text) || !isProfileCodeForLine(text, activeLineCode)) {
      continue;
    }

    if (existingCodes.has(text)) {
      continue;
    }

    line.profiles.push({ code: text, label: "" });
    existingCodes.add(text);
  }

  return activeLineCode;
}

function extractSpecsFromPage(page: PdfPageTextBundle, activeLineCode: string | null, lines: Map<string, TechnicalCatalogLine>) {
  if (!activeLineCode) {
    return;
  }

  const line = lines.get(activeLineCode);
  if (!line) {
    return;
  }

  const joined = page.texts.join(" | ");

  if (!line.anchoMarco) {
    const marcoMatch = joined.match(/(\d+(?:[.,]\d+)?)\s*mm/i);
    if (marcoMatch && joined.toLowerCase().includes("marco")) {
      line.anchoMarco = `${marcoMatch[1]?.replace(",", ".")} mm`;
    }
  }

  if (!line.vidrioResumen) {
    const vidrioIndex = page.texts.findIndex((text) => text.toLowerCase() === "vidrio");
    if (vidrioIndex >= 0) {
      const snippet = page.texts.slice(vidrioIndex, vidrioIndex + 4).join(" ");
      if (snippet.length > 6) {
        line.vidrioResumen = snippet.slice(0, 120);
      }
    }
  }
}

export function extractTechnicalCatalogFromPages(
  pages: PdfPageTextBundle[],
  options?: { pageCount?: number }
): TechnicalCatalogExtractionResult {
  const lines = extractIndexLines(pages);
  let activeLineCode: string | null = null;

  for (const page of pages) {
    for (const text of page.texts) {
      const indexEntry = parseTechnicalLineIndexEntry(text);
      if (indexEntry) {
        lines.set(indexEntry.lineCode, {
          lineCode: indexEntry.lineCode,
          nombre: indexEntry.nombre,
          descripcion: indexEntry.descripcion,
          tipoComponente: indexEntry.tipoComponente,
          categoria: indexEntry.categoria,
          profiles: lines.get(indexEntry.lineCode)?.profiles ?? [],
          pageNumbers: Array.from(
            new Set([...(lines.get(indexEntry.lineCode)?.pageNumbers ?? []), page.pageNumber])
          ),
          vidrioResumen: lines.get(indexEntry.lineCode)?.vidrioResumen ?? null,
          anchoMarco: lines.get(indexEntry.lineCode)?.anchoMarco ?? null,
        });
        activeLineCode = indexEntry.lineCode;
        continue;
      }

      const headerCode = detectLineCodeFromHeader(text);
      if (headerCode && lines.has(headerCode)) {
        activeLineCode = headerCode;
      }
    }

    activeLineCode = extractProfilesFromPage(page, activeLineCode, lines);
    extractSpecsFromPage(page, activeLineCode, lines);
  }

  const extractedLines = [...lines.values()]
    .sort((left, right) => left.nombre.localeCompare(right.nombre, "es"))
    .map((line) => ({
      ...line,
      profiles: [...line.profiles].sort((left, right) => left.code.localeCompare(right.code)),
      pageNumbers: [...line.pageNumbers].sort((left, right) => left - right),
    }));

  const warnings: string[] = [];
  const manufacturer = detectManufacturer(pages);
  const templateId = detectTemplateId(pages);
  const linesWithoutProfiles = extractedLines.filter((line) => line.profiles.length === 0);

  if (extractedLines.length === 0) {
    warnings.push("No detectamos lineas tecnicas en el PDF. Prueba un catalogo con indice de lineas.");
  }

  if (linesWithoutProfiles.length > 0) {
    warnings.push(
      `${linesWithoutProfiles.length} linea(s) quedaron sin perfiles detectados. Revisa antes de confirmar.`
    );
  }

  warnings.push(
    "Importacion tecnica: los precios quedan en cero hasta que completes costos comerciales o importes Excel."
  );

  let confidence: TechnicalCatalogExtractionResult["confidence"] = "low";
  const profileCount = extractedLines.reduce((sum, line) => sum + line.profiles.length, 0);

  if (extractedLines.length >= 5 && profileCount >= 20) {
    confidence = "high";
  } else if (extractedLines.length >= 3 && profileCount >= 8) {
    confidence = "medium";
  }

  return {
    templateId,
    manufacturer,
    pageCount: options?.pageCount ?? pages.length,
    lines: extractedLines,
    warnings,
    confidence,
  };
}

export async function extractTechnicalPdfCatalog(
  buffer: ArrayBuffer,
  selectedPages?: number[]
): Promise<TechnicalCatalogExtractionResult> {
  const { pageCount, pages } = await loadPdfPageTextBundles(buffer, selectedPages);
  return extractTechnicalCatalogFromPages(pages, { pageCount });
}

export function shouldPreferTechnicalPdfImport(input: {
  technicalLineCount: number;
  priceRowCount: number;
}) {
  return input.technicalLineCount >= 3 && input.priceRowCount < 3;
}
