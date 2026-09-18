import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { identityKey, normalizeRecipe } from "./normalize.ts";
import { CONFIRMED_DIR, CONFLICTS_DIR, PENDING_DIR } from "./paths.ts";
import type { ConfirmedRecipe, InventoryRecipe } from "./types.ts";

async function walkJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

export async function loadConfirmedRecipes(): Promise<InventoryRecipe[]> {
  const files = await walkJsonFiles(CONFIRMED_DIR);
  const recipes: InventoryRecipe[] = [];
  for (const filePath of files) {
    const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    recipes.push({
      filePath,
      raw,
      recipe: normalizeRecipe(raw, filePath),
    });
  }
  return recipes;
}

export function confirmedIdentitySet(recipes: ConfirmedRecipe[]): Set<string> {
  return new Set(
    recipes.map((recipe) =>
      identityKey({
        manufacturer: recipe.manufacturer,
        system: recipe.system,
        line: recipe.line,
        leaves: recipe.leaves,
        widthMm: recipe.testDimensions.widthMm,
        heightMm: recipe.testDimensions.heightMm,
      }),
    ),
  );
}

export async function readPendingMarkdown(): Promise<string> {
  const path = join(PENDING_DIR, "sodal", "l25", "PENDING.md");
  return readFile(path, "utf8");
}

export async function readConflictsMarkdown(): Promise<string> {
  const path = join(CONFLICTS_DIR, "sodal", "l25", "CONFLICTS.md");
  return readFile(path, "utf8");
}

export function parsePendingRows(markdown: string): Array<{
  line: string;
  leaves: number;
  widthMm: number;
  heightMm: number;
  glassCode: string;
  status: "pending";
  reason: string;
}> {
  const rows: Array<{
    line: string;
    leaves: number;
    widthMm: number;
    heightMm: number;
    glassCode: string;
    status: "pending";
    reason: string;
  }> = [];

  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*l[ií]nea/i.test(line) || /^\|\s*-+/.test(line)) continue;
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 6) continue;
    const [zetaLine, leavesRaw, measureRaw, glassCode, status, reason] = cells;
    if (!zetaLine.startsWith("L-")) continue;
    const leaves = Number((leavesRaw.match(/\d+/) ?? [])[0]);
    const measure = measureRaw.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (!leaves || !measure) continue;
    rows.push({
      line: zetaLine,
      leaves,
      widthMm: Number(measure[1]),
      heightMm: Number(measure[2]),
      glassCode,
      status: "pending",
      reason,
    });
    void status;
  }
  return rows;
}

export function parseConflictTitles(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^##\s+C-\d+/i.test(line))
    .map((line) => line.replace(/^##\s+/, "").trim());
}

export function isCanonicalMeasure(leaves: number, widthMm: number, heightMm: number): boolean {
  if (heightMm !== 1500) return false;
  if (leaves === 2) return widthMm === 1800;
  return widthMm === 3000;
}
