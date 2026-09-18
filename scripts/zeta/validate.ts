import { writeFile } from "node:fs/promises";

import { compareRecipes, formatCompareResult } from "./compare.ts";
import { loadConfirmedRecipes } from "./inventory.ts";
import { AUDIT_PATH } from "./paths.ts";
import { confirmedRecipeSchema } from "./schema.ts";
import type { ConfirmedRecipe, RecipeDiff } from "./types.ts";

export type ValidationIssue = {
  recipeId: string;
  filePath?: string;
  message: string;
  severity: "error" | "warning";
};

function profileSignature(recipe: ConfirmedRecipe): string {
  return recipe.profiles
    .map((item) => `${item.code}:${item.quantity}:${item.lengthMm}`)
    .sort()
    .join("|");
}

export function collectDuplicates(recipes: ConfirmedRecipe[]): ValidationIssue[] {
  const seen = new Map<string, string>();
  const issues: ValidationIssue[] = [];
  for (const recipe of recipes) {
    const key = [
      recipe.manufacturer,
      recipe.system,
      recipe.line,
      recipe.leaves,
      recipe.testDimensions.widthMm,
      recipe.testDimensions.heightMm,
    ].join(":");
    const previous = seen.get(key);
    if (previous) {
      issues.push({
        recipeId: recipe.id,
        severity: "error",
        message: `Duplicado de ${previous}: misma identidad ${key}`,
      });
    } else {
      seen.set(key, recipe.id);
    }
  }
  return issues;
}

export function collectCoherenceIssues(recipe: ConfirmedRecipe): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (recipe.profiles.length === 0) {
    issues.push({ recipeId: recipe.id, severity: "error", message: "Perfiles vacíos." });
  }
  for (const [index, profile] of recipe.profiles.entries()) {
    if (profile.lengthMm <= 0 || profile.quantity <= 0) {
      issues.push({
        recipeId: recipe.id,
        severity: "error",
        message: `Perfil ${profile.code} #${index} tiene cantidad o largo inválido.`,
      });
    }
    if (profile.position === "") {
      issues.push({
        recipeId: recipe.id,
        severity: "error",
        message: `Perfil ${profile.code} usa position vacía; debe ser null si Zeta no la entregó.`,
      });
    }
  }
  if (recipe.glass.length === 0) {
    issues.push({ recipeId: recipe.id, severity: "error", message: "Vidrio vacío." });
  }
  if (recipe.hardware.length === 0) {
    issues.push({ recipeId: recipe.id, severity: "error", message: "Accesorios vacíos." });
  }
  for (const item of recipe.hardware) {
    if (item.quantity <= 0) {
      issues.push({
        recipeId: recipe.id,
        severity: "error",
        message: `Accesorio ${item.code} tiene cantidad inválida.`,
      });
    }
  }
  if (!recipe.sourceEvidence.rawPath && !recipe.sourceEvidence.planId) {
    issues.push({
      recipeId: recipe.id,
      severity: "error",
      message: "Falta trazabilidad: ni rawPath ni planId.",
    });
  }
  return issues;
}

export function collectSuspiciousProfileShifts(recipes: ConfirmedRecipe[]): ValidationIssue[] {
  const byFamily = new Map<string, ConfirmedRecipe[]>();
  for (const recipe of recipes) {
    const key = `${recipe.manufacturer}|${recipe.system}|${recipe.line}`;
    const list = byFamily.get(key) ?? [];
    list.push(recipe);
    byFamily.set(key, list);
  }
  const issues: ValidationIssue[] = [];
  for (const group of byFamily.values()) {
    if (group.length < 2) continue;
    const signatures = group.map((item) => ({ id: item.id, signature: profileSignature(item), leaves: item.leaves }));
    const two = signatures.find((item) => item.leaves === 2);
    const four = signatures.find((item) => item.leaves === 4);
    if (two && four && two.signature === four.signature) {
      issues.push({
        recipeId: four.id,
        severity: "warning",
        message: `4H replica exactamente los perfiles de 2H (${two.id}). Revisar si el Plan está mal asociado.`,
      });
    }
  }
  return issues;
}

export async function validateConfirmedInventory(): Promise<{
  ok: boolean;
  recipes: ConfirmedRecipe[];
  issues: ValidationIssue[];
}> {
  const loaded = await loadConfirmedRecipes();
  const recipes = loaded.map((item) => item.recipe);
  const issues: ValidationIssue[] = [];

  for (const item of loaded) {
    const parsed = confirmedRecipeSchema.safeParse(item.recipe);
    if (!parsed.success) {
      issues.push({
        recipeId: item.recipe.id,
        filePath: item.filePath,
        severity: "error",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
    }
    issues.push(
      ...collectCoherenceIssues(item.recipe).map((issue) => ({
        ...issue,
        filePath: item.filePath,
      })),
    );
  }

  issues.push(...collectDuplicates(recipes), ...collectSuspiciousProfileShifts(recipes));
  return { ok: issues.filter((item) => item.severity === "error").length === 0, recipes, issues };
}

export function renderAuditReport(issues: ValidationIssue[], recipeCount: number): string {
  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");
  return [
    "# Auditoría Zeta",
    "",
    `Recetas confirmed leídas: ${recipeCount}`,
    `Errores: ${errors.length}`,
    `Advertencias: ${warnings.length}`,
    "",
    "## Hallazgos",
    "",
    ...(issues.length === 0
      ? ["- Sin hallazgos. La evidencia confirmed conserva schema, trazabilidad y no hay duplicados."]
      : issues.map(
          (issue) =>
            `- **${issue.severity.toUpperCase()}** \`${issue.recipeId}\`${issue.filePath ? ` (${issue.filePath})` : ""}: ${issue.message}`,
        )),
    "",
    "Esta auditoría no modifica `confirmed/` ni navega Sistema Zeta.",
    "",
  ].join("\n");
}

export async function writeAuditReport(issues: ValidationIssue[], recipeCount: number): Promise<void> {
  await writeFile(AUDIT_PATH, renderAuditReport(issues, recipeCount), "utf8");
}

export function diffAsIssues(recipeId: string, diffs: RecipeDiff[]): ValidationIssue[] {
  return diffs.map((diff) => ({
    recipeId,
    severity: diff.severity,
    message: `${diff.path}: esperado ${diff.expected} / actual ${diff.actual}`,
  }));
}

export { compareRecipes, formatCompareResult };

async function main(): Promise<void> {
  const result = await validateConfirmedInventory();
  await writeAuditReport(result.issues, result.recipes.length);
  if (!result.ok) {
    for (const issue of result.issues.filter((item) => item.severity === "error")) {
      console.error(`${issue.recipeId}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Validación OK: ${result.recipes.length} recetas confirmed.`);
  for (const issue of result.issues) {
    console.warn(`${issue.recipeId}: ${issue.message}`);
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/zeta/validate.ts")) {
  await main();
}
