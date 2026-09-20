import { writeFile } from "node:fs/promises";

import {
  buildRecipeId,
  defaultGlassCode,
  identityKey,
  inferGlazing,
  variantFromLine,
} from "./normalize.ts";
import {
  confirmedIdentitySet,
  isCanonicalMeasure,
  loadConfirmedRecipes,
  parsePendingRowsForSystem,
  readPendingMarkdown,
} from "./inventory.ts";
import { TARGETS_PATH, repoRelative } from "./paths.ts";
import { extractTargetSchema } from "./schema.ts";
import type { ConfirmedRecipe, ExtractTarget, TargetsFile } from "./types.ts";

function targetFromConfirmed(recipe: ConfirmedRecipe): ExtractTarget {
  return extractTargetSchema.parse({
    id: recipe.id,
    manufacturer: recipe.manufacturer,
    system: recipe.system,
    line: recipe.line,
    variant: recipe.variant,
    glazing: recipe.glazing,
    glassCode: recipe.glass[0]?.code ?? defaultGlassCode(recipe.glazing),
    leaves: recipe.leaves,
    widthMm: recipe.testDimensions.widthMm,
    heightMm: recipe.testDimensions.heightMm,
    status: "confirmed",
    purpose: isCanonicalMeasure(
      recipe.leaves,
      recipe.testDimensions.widthMm,
      recipe.testDimensions.heightMm,
    )
      ? "canonical"
      : "formula_geometry",
    confirmedRecipeId: recipe.id,
  });
}

function targetFromPending(row: ReturnType<typeof parsePendingRowsForSystem>[number]): ExtractTarget {
  const variant = variantFromLine(row.line);
  const glazing = inferGlazing(row.line);
  return extractTargetSchema.parse({
    id: buildRecipeId({
      manufacturer: "SODAL",
      system: row.system,
      variant,
      leaves: row.leaves,
      widthMm: row.widthMm,
      heightMm: row.heightMm,
    }),
    manufacturer: "SODAL",
    system: row.system,
    line: row.line,
    variant,
    glazing,
    glassCode: row.glassCode,
    leaves: row.leaves,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    status: "pending",
    purpose: isCanonicalMeasure(row.leaves, row.widthMm, row.heightMm)
      ? "canonical"
      : "formula_geometry",
    reason: row.reason,
    colorHint: "BLANCO",
    topologyHint: "CORREDERA LATINOAMERICANA",
  });
}

export async function buildTargetsFile(): Promise<TargetsFile> {
  const confirmed = await loadConfirmedRecipes();
  const confirmedSet = confirmedIdentitySet(confirmed.map((item) => item.recipe));
  const pendingSources = [
    { system: "L25" },
    { system: "4800" },
  ];
  const pendingRows = (
    await Promise.all(
      pendingSources.map(async ({ system }) =>
        parsePendingRowsForSystem(await readPendingMarkdown(system), system),
      ),
    )
  ).flat();
  const targets: ExtractTarget[] = confirmed.map((item) => targetFromConfirmed(item.recipe));

  for (const row of pendingRows) {
    const key = identityKey({
      manufacturer: "SODAL",
      system: row.system,
      line: row.line,
      leaves: row.leaves,
      widthMm: row.widthMm,
      heightMm: row.heightMm,
    });
    if (confirmedSet.has(key)) continue;
    targets.push(targetFromPending(row));
  }

  targets.sort((left, right) => left.id.localeCompare(right.id));
  return {
    generatedAt: new Date().toISOString(),
    source: [
      repoRelative(TARGETS_PATH).replace("targets.json", "confirmed/"),
      "docs/fabricacion/zeta/pending/sodal/l25/PENDING.md",
      "docs/fabricacion/zeta/pending/sodal/4800/PENDING.md",
      "docs/fabricacion/zeta/INDEX.md",
    ],
    targets,
  };
}

export async function writeTargetsFile(file?: TargetsFile): Promise<TargetsFile> {
  const payload = file ?? (await buildTargetsFile());
  await writeFile(TARGETS_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export function selectTargets(
  file: TargetsFile,
  options: {
    includeGeometry: boolean;
    status?: ExtractTarget["status"];
  },
): ExtractTarget[] {
  return file.targets.filter((target) => {
    if (options.status && target.status !== options.status) return false;
    if (!options.includeGeometry && target.purpose === "formula_geometry" && target.status === "pending") {
      return false;
    }
    return true;
  });
}
