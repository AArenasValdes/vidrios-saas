import {
  detectTableMatrixFromTextItems,
  matrixToSpreadsheetRows,
  type PdfTextItem,
} from "./line-template-pdf-table.service";
import { loadPdfPageTextBundles } from "./line-template-pdf-text.service";
import type { LineTemplateSpreadsheetRow } from "./line-template-import.service";

export type PdfExtractionConfidence = "high" | "medium" | "low";

export type PdfCatalogPageExtraction = {
  pageNumber: number;
  rows: LineTemplateSpreadsheetRow[];
  confidence: PdfExtractionConfidence;
  textItemCount: number;
  warnings: string[];
};

export type PdfCatalogExtractionResult = {
  pageCount: number;
  pages: PdfCatalogPageExtraction[];
  mergedRows: LineTemplateSpreadsheetRow[];
  overallConfidence: PdfExtractionConfidence;
  warnings: string[];
};

export {
  detectTableMatrixFromTextItems,
  groupPdfTextItemsIntoRows,
  splitRowIntoCells,
  matrixToSpreadsheetRows,
  type PdfTextItem,
} from "./line-template-pdf-table.service";

function mergeWarnings(pages: PdfCatalogPageExtraction[]) {
  return [...new Set(pages.flatMap((page) => page.warnings))];
}

function resolveOverallConfidence(pages: PdfCatalogPageExtraction[]): PdfExtractionConfidence {
  if (pages.some((page) => page.confidence === "high")) {
    return "high";
  }
  if (pages.some((page) => page.confidence === "medium")) {
    return "medium";
  }
  return "low";
}

export async function extractPdfCatalogImportData(
  buffer: ArrayBuffer,
  selectedPages?: number[]
): Promise<PdfCatalogExtractionResult> {
  const { pageCount, pages: pageBundles } = await loadPdfPageTextBundles(buffer, selectedPages);
  const pages: PdfCatalogPageExtraction[] = [];

  for (const pageBundle of pageBundles) {
    const items: PdfTextItem[] = pageBundle.items;
    const { matrix, headerRowIndex, confidence } = detectTableMatrixFromTextItems(items);
    const rows = matrixToSpreadsheetRows(matrix, headerRowIndex);
    const warnings: string[] = [];

    if (items.length < 12) {
      warnings.push(
        "Poco texto seleccionable en esta pagina. Si el PDF es escaneado, conviene exportar a Excel antes de importar."
      );
    }

    if (rows.length === 0) {
      warnings.push(
        "No detectamos una tabla de precios clara en esta pagina. Prueba otra pagina o usa CSV/Excel."
      );
    }

    if (confidence === "low") {
      warnings.push("La tabla se detecto con baja confianza. Revisa mapeo y vista previa antes de confirmar.");
    }

    pages.push({
      pageNumber: pageBundle.pageNumber,
      rows,
      confidence,
      textItemCount: items.length,
      warnings,
    });
  }

  const mergedRows = pages.flatMap((page) => page.rows);
  const warnings = mergeWarnings(pages);

  if (mergedRows.length === 0 && warnings.length === 0) {
    warnings.push(
      "No pudimos extraer filas de precio del PDF. Usa un PDF con tabla de texto o importa CSV/Excel."
    );
  }

  return {
    pageCount,
    pages,
    mergedRows,
    overallConfidence: resolveOverallConfidence(pages),
    warnings,
  };
}

export function buildPdfPageOptions(pageCount: number) {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
}

export function mergeSelectedPdfPageRows(
  pages: PdfCatalogPageExtraction[],
  selectedPageNumbers: number[]
) {
  const selected = new Set(selectedPageNumbers);
  return pages
    .filter((page) => selected.has(page.pageNumber))
    .flatMap((page) => page.rows);
}

export function resolveDefaultPdfPageSelection(pages: PdfCatalogPageExtraction[]) {
  const pagesWithRows = pages
    .filter((page) => page.rows.length > 0)
    .map((page) => page.pageNumber);

  if (pagesWithRows.length > 0) {
    return pagesWithRows;
  }

  return pages.map((page) => page.pageNumber);
}
