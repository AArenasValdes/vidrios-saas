import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadConfirmedRecipes } from "./inventory.ts";
import { ensureDir, DERIVED_DIR } from "./paths.ts";
import { derivedFormulaSchema } from "./schema.ts";
import { slugPart } from "./normalize.ts";
import type { ConfirmedRecipe, DerivedFormula } from "./types.ts";

type Observation = DerivedFormula["observations"][number] & {
  line: string;
  variant: string;
  manufacturer: string;
  system: string;
  profileName: string;
};

function observationsFrom(recipe: ConfirmedRecipe): Array<Observation & { code: string }> {
  return recipe.profiles.map((profile) => ({
    recipeId: recipe.id,
    leaves: recipe.leaves,
    widthMm: recipe.testDimensions.widthMm,
    heightMm: recipe.testDimensions.heightMm,
    lengthMm: profile.lengthMm,
    quantity: profile.quantity,
    line: recipe.line,
    variant: recipe.variant,
    manufacturer: recipe.manufacturer,
    system: recipe.system,
    profileName: profile.name,
    code: profile.code,
  }));
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function describeFormula(widths: number[], lengths: number[]): { formula: string; confidence: DerivedFormula["confidence"]; notes: string[] } | null {
  if (widths.length < 2) {
    return null;
  }
  const notes: string[] = [];
  const offsets = widths.map((width, index) => width - (lengths[index] ?? 0));
  const uniqueOffsets = uniqueSorted(offsets);
  if (uniqueOffsets.length === 1) {
    const offset = uniqueOffsets[0] ?? 0;
    return {
      formula: offset === 0 ? "lengthMm = widthMm" : `lengthMm = widthMm - ${offset}`,
      confidence: widths.length >= 3 ? "high" : "medium",
      notes: ["Candidata derivada de observaciones Zeta. No validada en taller."],
    };
  }

  const ratios = widths.map((width, index) => (lengths[index] ?? 0) / width);
  const ratioMin = Math.min(...ratios);
  const ratioMax = Math.max(...ratios);
  if (ratioMax - ratioMin <= 0.002) {
    return {
      formula: `lengthMm ≈ widthMm * ${ratios[0]?.toFixed(4)}`,
      confidence: "low",
      notes: ["Relación proporcional aproximada; requiere segunda medida o revisión de taller."],
    };
  }

  if (lengths.length >= 2 && new Set(lengths).size > 1 && new Set(widths).size > 1) {
    notes.push("No hay una relación lineal unívoca con las observaciones actuales.");
    notes.push("Una segunda prueba geométrica solo se justifica si 3H/asimetría lo requiere.");
  }
  return null;
}

export function deriveFormulas(recipes: ConfirmedRecipe[]): DerivedFormula[] {
  const grouped = new Map<string, Array<Observation & { code: string }>>();
  for (const recipe of recipes) {
    for (const observation of observationsFrom(recipe)) {
      const keyed = [
        [
          observation.manufacturer,
          observation.system,
          observation.line,
          observation.leaves,
          observation.code,
        ].join("|"),
        [
          observation.manufacturer,
          observation.system,
          observation.line,
          "*",
          observation.code,
        ].join("|"),
      ];
      for (const key of keyed) {
        const list = grouped.get(key) ?? [];
        list.push(observation);
        grouped.set(key, list);
      }
    }
  }

  const formulas: DerivedFormula[] = [];
  const seen = new Set<string>();
  for (const [key, list] of grouped) {
    const uniqueWidths = uniqueSorted(list.map((item) => item.widthMm));
    if (uniqueWidths.length < 2) continue;
    const described = describeFormula(
      list.map((item) => item.widthMm),
      list.map((item) => item.lengthMm),
    );
    if (!described) continue;
    const first = list[0];
    if (!first) continue;
    const [, , , leaves, code] = key.split("|");
    const formulaId = [
      slugPart(first.manufacturer),
      slugPart(first.system),
      slugPart(first.variant),
      leaves === "*" ? "allh" : `${leaves}h`,
      slugPart(code ?? ""),
    ].join("_");
    if (seen.has(formulaId)) continue;
    seen.add(formulaId);
    formulas.push(
      derivedFormulaSchema.parse({
        id: formulaId,
        manufacturer: first.manufacturer,
        system: first.system,
        line: first.line,
        variant: first.variant,
        profileCode: code ?? first.profileName,
        profileName: first.profileName,
        formula: described.formula,
        inputs: ["widthMm", "heightMm", "leaves"],
        evidenceIds: [...new Set(list.map((item) => item.recipeId))],
        observations: list.map((item) => ({
          recipeId: item.recipeId,
          leaves: item.leaves,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          lengthMm: item.lengthMm,
          quantity: item.quantity,
        })),
        confidence: described.confidence,
        status: "candidate",
        notes: described.notes,
      }),
    );
  }
  return formulas.sort((left, right) => left.id.localeCompare(right.id));
}

export async function writeDerivedFormulas(): Promise<DerivedFormula[]> {
  const recipes = (await loadConfirmedRecipes()).map((item) => item.recipe);
  const formulas = deriveFormulas(recipes);
  const directory = join(DERIVED_DIR, "sodal", "l25");
  await ensureDir(directory);
  const filePath = join(directory, "candidates.json");
  await writeFile(
    filePath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        statusNote:
          "Estas fórmulas son candidatas derivadas de confirmed/. Nunca se marcan validated solo por venir de Zeta.",
        formulas,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return formulas;
}

async function main(): Promise<void> {
  const formulas = await writeDerivedFormulas();
  console.log(`Fórmulas candidatas: ${formulas.length}. Confirmado no fue modificado.`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/zeta/derive.ts")) {
  await main();
}
