import {
  normalizeImportHeader,
  scoreSpreadsheetHeaderRow,
  type LineTemplateSpreadsheetRow,
} from "./line-template-import.service";

export type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
};

export type PdfExtractionConfidence = "high" | "medium" | "low";

const PRICE_LIKE_PATTERN = /\d[\d.,]{2,}/;

export function groupPdfTextItemsIntoRows(items: PdfTextItem[], yTolerance = 4) {
  const sorted = [...items].sort((left, right) => right.y - left.y || left.x - right.x);
  const rows: PdfTextItem[][] = [];

  for (const item of sorted) {
    const existingRow = rows.find(
      (row) => Math.abs((row[0]?.y ?? item.y) - item.y) <= yTolerance
    );

    if (existingRow) {
      existingRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  for (const row of rows) {
    row.sort((left, right) => left.x - right.x);
  }

  return rows;
}

export function splitRowIntoCells(row: PdfTextItem[], minColumnGap = 18) {
  const cells: string[] = [];
  let current = "";
  let lastRight = Number.NEGATIVE_INFINITY;

  for (const item of row) {
    const gap = item.x - lastRight;
    if (current && lastRight !== Number.NEGATIVE_INFINITY && gap > minColumnGap) {
      cells.push(current.trim());
      current = item.text;
    } else {
      current = current ? `${current} ${item.text}` : item.text;
    }

    lastRight = item.x + Math.max(item.width, item.text.length * 4);
  }

  if (current.trim()) {
    cells.push(current.trim());
  }

  return cells;
}

export function detectTableMatrixFromTextItems(
  items: PdfTextItem[],
  options?: { minColumnGap?: number; yTolerance?: number }
) {
  const groupedRows = groupPdfTextItemsIntoRows(items, options?.yTolerance ?? 4);
  const matrix = groupedRows
    .map((row) => splitRowIntoCells(row, options?.minColumnGap ?? 18))
    .filter((cells) => cells.some((cell) => cell.trim()));

  if (matrix.length === 0) {
    return {
      matrix: [],
      headerRowIndex: -1,
      confidence: "low" as PdfExtractionConfidence,
    };
  }

  let headerRowIndex = 0;
  let bestScore = -1;

  for (let index = 0; index < Math.min(matrix.length, 10); index += 1) {
    const score = scoreSpreadsheetHeaderRow(matrix[index] ?? []);
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = index;
    }
  }

  const confidence = assessPdfMatrixConfidence(matrix, bestScore, items.length);

  return {
    matrix,
    headerRowIndex: bestScore >= 2 ? headerRowIndex : 0,
    confidence,
  };
}

function assessPdfMatrixConfidence(
  matrix: string[][],
  headerScore: number,
  textItemCount: number
): PdfExtractionConfidence {
  if (textItemCount < 8 || matrix.length < 2) {
    return "low";
  }

  const dataRows = matrix.slice(1).filter((row) => row.some((cell) => PRICE_LIKE_PATTERN.test(cell)));

  if (headerScore >= 4 && dataRows.length >= 3) {
    return "high";
  }

  if (headerScore >= 2 && dataRows.length >= 2) {
    return "medium";
  }

  return "low";
}

function isLikelyRepeatedHeaderRow(cells: string[]) {
  return scoreSpreadsheetHeaderRow(cells) >= 2;
}

function isLikelyDataRow(cells: string[]) {
  const joined = cells.join(" ").trim();
  if (!joined) {
    return false;
  }

  if (isLikelyRepeatedHeaderRow(cells)) {
    return false;
  }

  const hasPrice = cells.some((cell) => PRICE_LIKE_PATTERN.test(cell));
  const hasName = cells.some((cell) => cell.trim().length >= 3);

  return hasPrice && hasName;
}

export function matrixToSpreadsheetRows(matrix: string[][], headerRowIndex: number) {
  if (matrix.length === 0 || headerRowIndex < 0 || headerRowIndex >= matrix.length) {
    return [];
  }

  const headerCells = matrix[headerRowIndex] ?? [];
  const headers = headerCells.map((cell, index) => {
    const normalized = normalizeImportHeader(cell);
    return normalized || `columna_${index + 1}`;
  });

  const rows: LineTemplateSpreadsheetRow[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const cells = matrix[rowIndex] ?? [];
    if (!isLikelyDataRow(cells)) {
      continue;
    }

    const row: LineTemplateSpreadsheetRow = {};
    let hasValue = false;

    headers.forEach((header, cellIndex) => {
      const value = cells[cellIndex]?.trim() ?? "";
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
