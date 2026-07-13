import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pdfPath = process.argv[2];
if (!pdfPath) process.exit(1);

const buffer = readFileSync(pdfPath);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const workerPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
);
pdfjs.GlobalWorkerOptions.workerSrc = `file:///${workerPath.replace(/\\/g, "/")}`;

// Minimal copy of table detection for probe
const PRICE_LIKE = /\d[\d.,]{2,}/;

function groupRows(items, yTol = 4) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const item of sorted) {
    const row = rows.find((r) => Math.abs(r[0]?.y ?? item.y) <= yTol);
    if (row) row.push(item);
    else rows.push([item]);
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}

function splitCells(row, gap = 18) {
  const cells = [];
  let current = "";
  let lastRight = Number.NEGATIVE_INFINITY;
  for (const item of row) {
    const g = item.x - lastRight;
    if (current && lastRight !== Number.NEGATIVE_INFINITY && g > gap) {
      cells.push(current.trim());
      current = item.text;
    } else {
      current = current ? `${current} ${item.text}` : item.text;
    }
    lastRight = item.x + Math.max(item.width, item.text.length * 4);
  }
  if (current.trim()) cells.push(current.trim());
  return cells;
}

const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
let totalRows = 0;
let lineNames = new Set();
let profileCodes = new Set();
let priceHits = 0;

for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const items = [];
  for (const raw of content.items) {
    if (!raw || typeof raw !== "object" || !("str" in raw) || typeof raw.str !== "string") continue;
    const text = raw.str.trim();
    if (!text) continue;
    items.push({ text, x: raw.transform[4] ?? 0, y: raw.transform[5] ?? 0, width: raw.width ?? 0 });
    if (/^l[ií]nea\s+\d+/i.test(text) || /l[ií]nea\s+\d+\s*-/i.test(text)) lineNames.add(text);
    if (/^\d{4}\b/.test(text)) profileCodes.add(text.split(/\s/)[0]);
    if (PRICE_LIKE.test(text) && !/^\d{1,2}(\.\d)?$/.test(text) && text.length >= 4) priceHits += 1;
  }

  const matrix = groupRows(items).map((row) => splitCells(row)).filter((cells) => cells.some((c) => c.trim()));
  totalRows += Math.max(0, matrix.length - 1);
}

console.log(JSON.stringify({
  pages: pdf.numPages,
  uniqueLineMentions: [...lineNames].slice(0, 20),
  lineMentionCount: lineNames.size,
  profileCodeSamples: [...profileCodes].slice(0, 25),
  profileCodeCount: profileCodes.size,
  priceLikeFragments: priceHits,
  estimatedTableRows: totalRows,
}, null, 2));
