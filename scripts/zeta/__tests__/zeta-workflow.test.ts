import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { compareExtractedAgainstTarget, formatTargetComparison } from "../compare-target.ts";
import { compareRecipes, extractedPlanToComparable } from "../compare.ts";
import { normalizeRecipe, identityKey } from "../normalize.ts";
import { parsePlanFromText } from "../parse-plan.ts";
import { FIXTURES_DIR, REPO_ROOT } from "../paths.ts";
import { confirmedRecipeSchema } from "../schema.ts";
import { deriveFormulas } from "../derive.ts";

const confirmedPath = join(
  REPO_ROOT,
  "docs/fabricacion/zeta/confirmed/sodal/l25/monolitico_pierna_abierta_2h_1800x1500.json",
);

test("normaliza una receta L25 legado snake_case sin perder cortes", async () => {
  const raw = JSON.parse(await readFile(confirmedPath, "utf8")) as unknown;
  const recipe = normalizeRecipe(raw, confirmedPath);
  confirmedRecipeSchema.parse(recipe);
  assert.equal(recipe.id, "monolitico_pierna_abierta_2h_1800x1500");
  assert.equal(recipe.source, "sistema_zeta");
  assert.equal(recipe.evidenceType, "plan_de_armado");
  assert.equal(recipe.profiles[0]?.code, "2501");
  assert.equal(recipe.profiles[0]?.lengthMm, 1784);
  assert.equal(recipe.profiles[0]?.position, null);
  assert.equal(recipe.glass[0]?.widthMm, 834);
  assert.ok(recipe.sourceEvidence.rawPath);
});

test("el parser del Plan V-001 coincide con confirmed L25 2H", async () => {
  const raw = JSON.parse(await readFile(confirmedPath, "utf8")) as unknown;
  const confirmed = normalizeRecipe(raw, confirmedPath);
  const fixture = await readFile(
    join(FIXTURES_DIR, "monolitico_pierna_abierta_2h_1800x1500.plan.txt"),
    "utf8",
  );
  const plan = parsePlanFromText(fixture);
  const comparison = compareRecipes(confirmed, extractedPlanToComparable(plan, confirmed));
  assert.equal(comparison.ok, true, JSON.stringify(comparison.errors, null, 2));
  assert.equal(plan.profiles.length, 7);
  assert.equal(plan.glass[0]?.code, "CTI5");
});

test("identityKey no colisiona 2H 1800 con 3H 3000", () => {
  const two = identityKey({
    manufacturer: "SODAL",
    system: "L25",
    line: "L-25 MONOLITICO PIERNA ABIERTA",
    leaves: 2,
    widthMm: 1800,
    heightMm: 1500,
  });
  const three = identityKey({
    manufacturer: "SODAL",
    system: "L25",
    line: "L-25 MONOLITICO PIERNA ABIERTA",
    leaves: 3,
    widthMm: 3000,
    heightMm: 1500,
  });
  assert.notEqual(two, three);
});

test("compareExtractedAgainstTarget valida metadatos del target", () => {
  const target = {
    id: "dvh_pierna_abierta_2h_1800x1500",
    manufacturer: "SODAL",
    system: "L25",
    line: "L-25 DVH PIERNA ABIERTA",
    variant: "DVH PIERNA ABIERTA",
    glazing: "dvh" as const,
    glassCode: "TE4104",
    leaves: 2,
    widthMm: 1800,
    heightMm: 1500,
    status: "pending" as const,
    purpose: "canonical" as const,
  };
  const plan = parsePlanFromText(
    "L-25 DVH PIERNA ABIERTA 2H 1800 x 1500 TE4104\n| 2501 | RIEL | 1 | 1784 mm | 90° | 90° |\nVidrio: TE4104 | ancho 832 mm | alto 1369 mm | cantidad 2\nAccesorios: GUIA-L25 GUIA 4 PZA;",
  );
  const comparison = compareExtractedAgainstTarget(target, plan);
  assert.equal(comparison.ok, true, formatTargetComparison(comparison, target.id));
});

test("derive no marca validated y exige más de una medida", () => {
  const single = deriveFormulas([
    normalizeRecipe(
      JSON.parse(
        // minimal canonical-like object after normalize from real file shape
        JSON.stringify({
          manufacturer: "SODAL",
          system: "L25",
          variant: "TEST",
          zeta_line: "L-25 TEST",
          glazing: "monolitico",
          leaves: 2,
          source: "Sistema Zeta",
          evidence: "plan_de_armado",
          plan: "PA-X",
          status: "confirmed",
          test_dimensions: { width_mm: 1800, height_mm: 1500 },
          profiles: [
            {
              code: "2501",
              name: "RIEL",
              quantity: 1,
              length_mm: 1784,
              cut_1_deg: 90,
              cut_2_deg: 90,
              position: null,
            },
          ],
          glass: [{ code: "CTI5", name: "Cristal", quantity: 2, width_mm: 834, height_mm: 1372 }],
          hardware: [{ code: "GUIA-L25", name: "GUIA", quantity: 4, unit: "PZA" }],
        }),
      ),
      "test.json",
    ),
  ]);
  assert.equal(single.length, 0);
});
