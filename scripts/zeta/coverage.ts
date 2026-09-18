import { writeFile } from "node:fs/promises";

import { parseConflictTitles, readConflictsMarkdown } from "./inventory.ts";
import { COVERAGE_PATH, INDEX_PATH } from "./paths.ts";
import { buildTargetsFile, writeTargetsFile } from "./targets.ts";
import type {
  CoverageFamily,
  CoverageFile,
  CoverageLeafState,
  ExtractTarget,
  RecipeStatus,
} from "./types.ts";

const LEAF_COLUMNS = [2, 3, 4] as const;

function familyKey(target: ExtractTarget): string {
  return `${target.manufacturer}|${target.system}|${target.line}`;
}

function emptyLeaf(): CoverageLeafState {
  return {
    status: "pending",
    recipeId: null,
    widthMm: null,
    heightMm: null,
    lastCheckedAt: null,
  };
}

function betterStatus(current: RecipeStatus, next: RecipeStatus): RecipeStatus {
  const rank: Record<RecipeStatus, number> = {
    confirmed: 5,
    conflict: 4,
    error: 3,
    unsupported: 2,
    pending: 1,
  };
  return rank[next] >= rank[current] ? next : current;
}

export async function buildCoverage(targetsFile?: TargetsFile): Promise<CoverageFile> {
  const resolvedTargets = targetsFile ?? (await buildTargetsFile());
  const families = new Map<string, CoverageFamily>();

  for (const target of resolvedTargets.targets) {
    const key = familyKey(target);
    const family =
      families.get(key) ??
      ({
        manufacturer: target.manufacturer,
        system: target.system,
        line: target.line,
        variant: target.variant,
        glazing: target.glazing,
        leaves: {
          "2": emptyLeaf(),
          "3": emptyLeaf(),
          "4": emptyLeaf(),
        },
        extraTests: [],
      } satisfies CoverageFamily);

    if (target.purpose === "canonical" && (target.leaves === 2 || target.leaves === 3 || target.leaves === 4)) {
      const current = family.leaves[String(target.leaves)] ?? emptyLeaf();
      family.leaves[String(target.leaves)] = {
        status: betterStatus(current.status, target.status),
        recipeId: target.confirmedRecipeId ?? (target.status === "confirmed" ? target.id : current.recipeId),
        widthMm: target.widthMm,
        heightMm: target.heightMm,
        lastCheckedAt: target.status === "confirmed" ? resolvedTargets.generatedAt : current.lastCheckedAt,
        reason: target.reason ?? current.reason,
      };
    } else {
      family.extraTests.push({
        id: target.id,
        leaves: target.leaves,
        widthMm: target.widthMm,
        heightMm: target.heightMm,
        status: target.status,
        purpose: target.purpose,
        reason: target.reason,
      });
    }
    families.set(key, family);
  }

  const familyList = [...families.values()].sort((left, right) => left.line.localeCompare(right.line));
  const summary = {
    confirmed: resolvedTargets.targets.filter((item) => item.status === "confirmed").length,
    pending: resolvedTargets.targets.filter((item) => item.status === "pending").length,
    conflicts: (await parseConflictTitles(await readConflictsMarkdown())).length,
    errors: resolvedTargets.targets.filter((item) => item.status === "error").length,
    unsupported: resolvedTargets.targets.filter((item) => item.status === "unsupported").length,
    totalKnown: resolvedTargets.targets.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    families: familyList,
  };
}

function statusLabel(state: CoverageLeafState): string {
  return state.status.toUpperCase();
}

export function renderIndexMarkdown(coverage: CoverageFile, conflictTitles: string[]): string {
  const lines = [
    "<!-- Generado por `pnpm zeta:coverage`. No editar a mano. Fuente: JSON en confirmed/ + targets.json -->",
    "",
    "# Índice de recetas Zeta — SODAL / L25",
    "",
    "`CONFIRMED` solo significa que existe un Plan de armado real observado en Sistema Zeta. No equivale a validación física de taller ni a receta implementada en Ventora.",
    "",
    "| Fabricante | Sistema | Variante | Vidrio | 2H | 3H | 4H | Evidencia | Estado |",
    "|---|---|---|---|---|---|---|---|---|",
  ];

  for (const family of coverage.families) {
    const two = family.leaves["2"] ?? emptyLeaf();
    const three = family.leaves["3"] ?? emptyLeaf();
    const four = family.leaves["4"] ?? emptyLeaf();
    const evidence =
      [two, three, four]
        .map((item) => item.recipeId)
        .filter((item): item is string => Boolean(item))
        .slice(0, 1)
        .map((id) => `confirmed/sodal/l25/${id}.json`)
        .join(", ") || "pending/sodal/l25/PENDING.md";
    const familyStatus = LEAF_COLUMNS.every((leaves) => family.leaves[String(leaves)]?.status === "confirmed")
      ? "CONFIRMED"
      : LEAF_COLUMNS.some((leaves) => family.leaves[String(leaves)]?.status === "confirmed")
        ? "PARTIAL"
        : "PENDING";
    lines.push(
      `| ${family.manufacturer} | ${family.system} | ${family.variant} | ${family.glazing} | ${statusLabel(two)} | ${statusLabel(three)} | ${statusLabel(four)} | ${evidence} | ${familyStatus} |`,
    );
  }

  const extras = coverage.families.flatMap((family) =>
    family.extraTests.map(
      (item) =>
        `- ${family.line} ${item.leaves}H ${item.widthMm}×${item.heightMm}: ${item.status.toUpperCase()}${item.reason ? ` — ${item.reason}` : ""}`,
    ),
  );
  if (extras.length > 0) {
    lines.push("", "## Pruebas geométricas extra", "", ...extras);
  }

  lines.push(
    "",
    "## Resumen",
    "",
    `- confirmed: ${coverage.summary.confirmed}`,
    `- pending: ${coverage.summary.pending}`,
    `- conflicts: ${coverage.summary.conflicts}`,
    `- totalKnown: ${coverage.summary.totalKnown}`,
    "",
    "## Límites",
    "",
    "- `confirmed/` no se reescribe en dry-run ni en self-check.",
    "- Las medidas `2400 × 1500` quedan como pruebas geométricas extra, no reemplazan la columna 3H canónica.",
    ...conflictTitles.map((title) => `- ${title}`),
    "",
  );
  return `${lines.join("\n")}\n`;
}

export async function writeCoverageArtifacts(): Promise<{ coverage: CoverageFile; targetsCount: number }> {
  const targets = await writeTargetsFile();
  const coverage = await buildCoverage(targets);
  const conflictTitles = parseConflictTitles(await readConflictsMarkdown());
  await writeFile(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`, "utf8");
  await writeFile(INDEX_PATH, renderIndexMarkdown(coverage, conflictTitles), "utf8");
  return { coverage, targetsCount: targets.targets.length };
}

async function main(): Promise<void> {
  const { coverage } = await writeCoverageArtifacts();
  console.log(
    `Cobertura actualizada: confirmed=${coverage.summary.confirmed} pending=${coverage.summary.pending} conflicts=${coverage.summary.conflicts} totalKnown=${coverage.summary.totalKnown}`,
  );
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/zeta/coverage.ts")) {
  await main();
}
