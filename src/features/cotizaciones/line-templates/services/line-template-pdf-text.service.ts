import type { PdfTextItem } from "./line-template-pdf-table.service";

export type PdfPageTextBundle = {
  pageNumber: number;
  items: PdfTextItem[];
  texts: string[];
};

function isPdfJsTextItem(
  item: unknown
): item is { str: string; transform: number[]; width?: number } {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof item.str === "string" &&
    "transform" in item &&
    Array.isArray(item.transform)
  );
}

function mapPdfTextItems(contentItems: unknown[]): PdfTextItem[] {
  const items: PdfTextItem[] = [];

  for (const rawItem of contentItems) {
    if (!isPdfJsTextItem(rawItem)) {
      continue;
    }

    const text = rawItem.str.replace(/\s+/g, " ").trim();
    if (!text) {
      continue;
    }

    items.push({
      text,
      x: rawItem.transform[4] ?? 0,
      y: rawItem.transform[5] ?? 0,
      width: rawItem.width ?? 0,
    });
  }

  return items;
}

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  return pdfjs;
}

export async function loadPdfPageTextBundles(
  buffer: ArrayBuffer,
  selectedPages?: number[]
): Promise<{ pageCount: number; pages: PdfPageTextBundle[] }> {
  const pdfjs = await getPdfJs();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  const pageNumbers =
    selectedPages && selectedPages.length > 0
      ? selectedPages.filter((pageNumber) => pageNumber >= 1 && pageNumber <= pdf.numPages)
      : Array.from({ length: pdf.numPages }, (_, index) => index + 1);

  const pages: PdfPageTextBundle[] = [];

  for (const pageNumber of pageNumbers) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = mapPdfTextItems(content.items);

    pages.push({
      pageNumber,
      items,
      texts: items.map((item) => item.text),
    });
  }

  return {
    pageCount: pdf.numPages,
    pages,
  };
}
