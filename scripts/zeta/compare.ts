import type { CompareResult, ConfirmedRecipe, ExtractedPlan, RecipeDiff } from "./types.ts";

function sameText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function push(
  diffs: RecipeDiff[],
  path: string,
  expected: unknown,
  actual: unknown,
  severity: RecipeDiff["severity"],
): void {
  diffs.push({
    path,
    expected: String(expected),
    actual: String(actual),
    severity,
  });
}

function keyProfile(item: { code: string; lengthMm: number; quantity: number }): string {
  return `${item.code}|${item.lengthMm}|${item.quantity}`;
}

function keyGlass(item: { code: string; widthMm: number; heightMm: number; quantity: number }): string {
  return `${item.code}|${item.widthMm}x${item.heightMm}|${item.quantity}`;
}

function keyHardware(item: { code: string; quantity: number; unit: string }): string {
  return `${item.code}|${item.quantity}|${item.unit.toUpperCase()}`;
}

export function extractedPlanToComparable(plan: ExtractedPlan, recipe: ConfirmedRecipe): ConfirmedRecipe {
  return {
    ...recipe,
    line: plan.lineName ?? recipe.line,
    leaves: plan.leaves ?? recipe.leaves,
    testDimensions: {
      widthMm: plan.widthMm ?? recipe.testDimensions.widthMm,
      heightMm: plan.heightMm ?? recipe.testDimensions.heightMm,
    },
    glazing: plan.glazing ?? recipe.glazing,
    profiles: plan.profiles,
    glass: plan.glass,
    hardware: plan.hardware,
  };
}

export function compareRecipes(expected: ConfirmedRecipe, actual: ConfirmedRecipe): CompareResult {
  const errors: RecipeDiff[] = [];
  const warnings: RecipeDiff[] = [];

  if (expected.leaves !== actual.leaves) {
    push(errors, "leaves", expected.leaves, actual.leaves, "error");
  }
  if (expected.testDimensions.widthMm !== actual.testDimensions.widthMm) {
    push(errors, "testDimensions.widthMm", expected.testDimensions.widthMm, actual.testDimensions.widthMm, "error");
  }
  if (expected.testDimensions.heightMm !== actual.testDimensions.heightMm) {
    push(errors, "testDimensions.heightMm", expected.testDimensions.heightMm, actual.testDimensions.heightMm, "error");
  }
  if (expected.glazing !== actual.glazing) {
    push(errors, "glazing", expected.glazing, actual.glazing, "error");
  }

  const expectedProfiles = expected.profiles.map(keyProfile).sort();
  const actualProfiles = actual.profiles.map(keyProfile).sort();
  if (expectedProfiles.join() !== actualProfiles.join()) {
    push(errors, "profiles", expectedProfiles.join(" ; "), actualProfiles.join(" ; "), "error");
  } else {
    expected.profiles.forEach((profile, index) => {
      const found = actual.profiles.find(
        (item) =>
          item.code === profile.code &&
          item.lengthMm === profile.lengthMm &&
          item.quantity === profile.quantity,
      );
      if (found && !sameText(found.name, profile.name)) {
        push(warnings, `profiles[${index}].name`, profile.name, found.name, "warning");
      }
    });
  }

  const expectedGlass = expected.glass.map(keyGlass).sort();
  const actualGlass = actual.glass.map(keyGlass).sort();
  if (expectedGlass.join() !== actualGlass.join()) {
    push(errors, "glass", expectedGlass.join(" ; "), actualGlass.join(" ; "), "error");
  }

  const expectedHardware = expected.hardware.map(keyHardware).sort();
  const actualHardware = actual.hardware.map(keyHardware).sort();
  if (expectedHardware.join() !== actualHardware.join()) {
    push(errors, "hardware", expectedHardware.join(" ; "), actualHardware.join(" ; "), "error");
  } else {
    expected.hardware.forEach((item, index) => {
      const found = actual.hardware.find(
        (candidate) =>
          candidate.code === item.code &&
          candidate.quantity === item.quantity &&
          candidate.unit.toUpperCase() === item.unit.toUpperCase(),
      );
      if (found && !sameText(found.name, item.name)) {
        push(warnings, `hardware[${index}].name`, item.name, found.name, "warning");
      }
    });
  }

  return {
    recipeId: expected.id,
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatCompareResult(result: CompareResult): string {
  const lines = [
    `Comparación ${result.recipeId}: ${result.ok ? "OK" : "DIFERENCIAS"}`,
  ];
  for (const diff of [...result.errors, ...result.warnings]) {
    lines.push(
      `- [${diff.severity}] ${diff.path}\n    esperado: ${diff.expected}\n    actual:    ${diff.actual}`,
    );
  }
  if (result.errors.length === 0 && result.warnings.length === 0) {
    lines.push("- Sin diferencias esenciales.");
  }
  return lines.join("\n");
}
