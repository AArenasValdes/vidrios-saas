import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error("Usage: node scripts/debug-pdf-catalog-import.mjs <pdf-path>");
  process.exit(1);
}

const buffer = readFileSync(pdfPath);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const workerPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
);
pdfjs.GlobalWorkerOptions.workerSrc = `file:///${workerPath.replace(/\\/g, "/")}`;

const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
console.log(`PDF pages: ${pdf.numPages}`);

for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const texts = [];

  for (const item of content.items) {
    if (item && typeof item === "object" && "str" in item && typeof item.str === "string") {
      const t = item.str.trim();
      if (t) texts.push(t);
    }
  }

  console.log(`\n--- Page ${pageNumber}: ${texts.length} text fragments ---`);
  console.log(texts.slice(0, 50).join(" | "));
  if (texts.length > 50) console.log(`... +${texts.length - 50} more`);
}
