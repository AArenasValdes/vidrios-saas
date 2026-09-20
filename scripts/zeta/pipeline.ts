import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { compareExtractedAgainstTarget, formatTargetComparison } from "./compare-target.ts";
import { extractionBlockingIssues } from "./extraction-gates.ts";
import { writeRawEvidence, type RawEvidencePaths, type SourceFragment } from "./evidence.ts";
import { slugPart } from "./normalize.ts";
import { CONFIRMED_DIR, ensureDir, repoRelative } from "./paths.ts";
import { confirmedRecipeSchema } from "./schema.ts";
import { collectCoherenceIssues } from "./validate.ts";
import type { CliFlags, ConfirmedRecipe, ExtractTarget, ExtractedPlan, RunLog } from "./types.ts";

function sourceLineFor(plan: ExtractedPlan, needle: string): { locator: string; texto: string } {
  const lines = plan.planText.split(/\r?\n/);
  const normalizedNeedle = needle.trim().toLowerCase();
  const lineIndex = lines.findIndex((line) => line.toLowerCase().includes(normalizedNeedle));
  if (lineIndex >= 0) {
    return { locator: `plan.txt:line:${lineIndex + 1}`, texto: lines[lineIndex].trim() };
  }
  return { locator: "plan.parsed", texto: needle.trim() };
}

export function buildSourceFragments(plan: ExtractedPlan): SourceFragment[] {
  const fragments: SourceFragment[] = [];
  const identity = sourceLineFor(plan, plan.lineName ?? "Plan de armado");
  fragments.push({ id: "identidad", tipo: "identidad", ...identity });

  plan.profiles.forEach((profile, index) => {
    const source = sourceLineFor(plan, profile.code);
    fragments.push({ id: `perfil-${index}`, tipo: "perfil", ...source });
  });
  plan.glass.forEach((glass, index) => {
    const source = sourceLineFor(plan, glass.code || glass.name);
    fragments.push({ id: `vidrio-${index}`, tipo: "vidrio", ...source });
  });
  plan.hardware.forEach((item, index) => {
    const source = sourceLineFor(plan, item.code || item.name);
    fragments.push({ id: `accesorio-${index}`, tipo: "accesorio", ...source });
  });
  plan.warnings.forEach((warning, index) => {
    fragments.push({
      id: `advertencia-${index}`,
      tipo: "advertencia",
      ...sourceLineFor(plan, warning),
    });
  });
  return fragments;
}

function sourceEvidenceBlockers(
  raw: RawEvidencePaths,
  artifacts: Pick<ExtractionArtifacts, "projectId" | "planId" | "plan">,
): string[] {
  const blockers: string[] = [];
  if (!artifacts.projectId) blockers.push("Falta projectId de Zeta.");
  if (!artifacts.planId) blockers.push("Falta planId de Zeta.");
  const sourceFragments = buildSourceFragments(artifacts.plan);
  if (sourceFragments.length === 0) {
    blockers.push("Falta fila o fragmento de origen.");
  }
  if (sourceFragments.some((fragment) => fragment.locator === "plan.parsed")) {
    blockers.push("Hay valores sin fila o fragmento localizable en el raw.");
  }
  if (!raw.artifactHashes.html) blockers.push("Falta hash del HTML raw.");
  if (!raw.artifactHashes.text) blockers.push("Falta hash del texto raw.");
  if (Object.keys(raw.artifactHashes.screenshots).length === 0) {
    blockers.push("Falta screenshot raw.");
  }
  return blockers;
}

export type ExtractionArtifacts = {
  plan: ExtractedPlan;
  consoleLines: string[];
  errorText: string | null;
  projectId: string | null;
  planId: string | null;
  pageUrl: string | null;
  selectorsUsed: string[];
  checkpoints: Record<string, string>;
  screenshotWritten: boolean;
  navigationEngine: "manual" | "playwright";
};

export function confirmedPathFor(target: ExtractTarget): string {
  return join(
    CONFIRMED_DIR,
    slugPart(target.manufacturer),
    slugPart(target.system),
    `${target.id}.json`,
  );
}

function recipeFromPlan(
  target: ExtractTarget,
  plan: ExtractedPlan,
  raw: RawEvidencePaths,
  artifacts: Pick<ExtractionArtifacts, "projectId" | "planId" | "checkpoints"> & { runId: string },
): ConfirmedRecipe {
  return confirmedRecipeSchema.parse({
    id: target.id,
    manufacturer: target.manufacturer,
    system: target.system,
    line: target.line,
    variant: target.variant,
    glazing: plan.glazing ?? target.glazing,
    leaves: plan.leaves ?? target.leaves,
    topology: target.topologyHint ?? null,
    source: "sistema_zeta",
    evidenceType: "plan_de_armado",
    status: "confirmed",
    extractedAt: new Date().toISOString(),
    testDimensions: {
      widthMm: plan.widthMm ?? target.widthMm,
      heightMm: plan.heightMm ?? target.heightMm,
    },
    profiles: plan.profiles.map((item) => ({ ...item, position: item.position ?? null })),
    glass: plan.glass,
    hardware: plan.hardware,
    sourceEvidence: {
      runId: artifacts.runId,
      projectId: artifacts.projectId,
      planId: artifacts.planId,
      screenshotPaths: Object.keys(raw.artifactHashes.screenshots),
      rawPath: repoRelative(raw.directory),
      htmlPath: repoRelative(raw.planHtml),
      textPath: repoRelative(raw.planTxt),
      capturedAt: new Date().toISOString(),
      extractorVersion: "zeta-extractor-p1-2026-09-19",
      artifactHashes: raw.artifactHashes,
      sourceFragments: buildSourceFragments(plan),
      sourceDocument: null,
    },
  });
}

function planMatchesTarget(plan: ExtractedPlan, target: ExtractTarget): string[] {
  const errors: string[] = [];
  if (plan.leaves != null && plan.leaves !== target.leaves) {
    errors.push(`Hojas del Plan (${plan.leaves}) ≠ target (${target.leaves})`);
  }
  if (plan.widthMm != null && plan.widthMm !== target.widthMm) {
    errors.push(`Ancho del Plan (${plan.widthMm}) ≠ target (${target.widthMm})`);
  }
  if (plan.heightMm != null && plan.heightMm !== target.heightMm) {
    errors.push(`Alto del Plan (${plan.heightMm}) ≠ target (${target.heightMm})`);
  }
  if (plan.lineName && !plan.lineName.toLowerCase().includes(target.variant.toLowerCase().slice(0, 12))) {
    errors.push(`Línea del Plan (${plan.lineName}) no coincide con ${target.line}`);
  }
  return errors;
}

async function writeConfirmedAtomic(recipe: ConfirmedRecipe, target: ExtractTarget): Promise<"written" | "skipped-existing"> {
  const filePath = confirmedPathFor(target);
  if (existsSync(filePath)) {
    return "skipped-existing";
  }
  await ensureDir(dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(recipe, null, 2)}\n`, "utf8");
  return "written";
}

export async function persistRawEvidence(
  target: ExtractTarget,
  artifacts: ExtractionArtifacts,
  runId: string,
): Promise<ReturnType<typeof writeRawEvidence>> {
  return writeRawEvidence({
    target,
    recipeId: target.id,
    plan: artifacts.plan,
    consoleLines: artifacts.consoleLines,
    errorText: artifacts.errorText ?? undefined,
    screenshotWritten: artifacts.screenshotWritten,
    projectId: artifacts.projectId,
    planId: artifacts.planId,
    pageUrl: artifacts.pageUrl,
    selectorsUsed: [
      ...artifacts.selectorsUsed,
      `navigationEngine:${artifacts.navigationEngine}`,
    ],
    checkpoints: artifacts.checkpoints,
    runId,
    sourceFragments: buildSourceFragments(artifacts.plan),
  });
}

export async function processExtractedTarget(
  target: ExtractTarget,
  artifacts: ExtractionArtifacts,
  log: RunLog,
  flags: Pick<CliFlags, "writeConfirmed">,
): Promise<void> {
  const existingPath = confirmedPathFor(target);
  if (existsSync(existingPath) || target.status === "confirmed") {
    log.skipped.push(target.id);
    log.notes.push(`SKIP confirmed existente: ${target.id}`);
    return;
  }

  const raw = await persistRawEvidence(target, artifacts, log.runId);

  const blockingIssues = extractionBlockingIssues(artifacts);
  if (blockingIssues.length > 0) {
    log.failed.push(target.id);
    log.pending.push(target.id);
    log.errors.push({
      targetId: target.id,
      outcome: artifacts.errorText ? "ZETA_UI_ERROR" : "CONFIGURATION_ERROR",
      message: blockingIssues.join(" | "),
    });
    log.notes.push("La evidencia contiene warning/error de Zeta. Se conserva PENDING.");
    return;
  }

  const targetComparison = compareExtractedAgainstTarget(target, artifacts.plan);
  log.notes.push(formatTargetComparison(targetComparison, target.id));

  const matchErrors = planMatchesTarget(artifacts.plan, target);
  const incomplete = artifacts.plan.profiles.length === 0 || artifacts.plan.glass.length === 0;
  if (!targetComparison.ok || matchErrors.length > 0 || incomplete) {
    log.failed.push(target.id);
    log.pending.push(target.id);
    log.errors.push({
      targetId: target.id,
      outcome: "CONFIGURATION_ERROR",
      message:
        matchErrors.join(" | ") ||
        (!targetComparison.ok ? "Comparación contra target falló." : "Plan incompleto tras extraer el DOM."),
    });
    return;
  }

  const rawEvidenceBlockers = sourceEvidenceBlockers(raw, artifacts);
  if (rawEvidenceBlockers.length > 0) {
    log.failed.push(target.id);
    log.pending.push(target.id);
    log.errors.push({
      targetId: target.id,
      outcome: "CONFIGURATION_ERROR",
      message: rawEvidenceBlockers.join(" | "),
    });
    return;
  }

  const recipe = recipeFromPlan(target, artifacts.plan, raw, {
    ...artifacts,
    runId: log.runId,
  });
  const issues = collectCoherenceIssues(recipe);
  if (issues.length > 0) {
    log.failed.push(target.id);
    log.pending.push(target.id);
    log.errors.push({
      targetId: target.id,
      outcome: "CONFIGURATION_ERROR",
      message: issues.map((item) => item.message).join(" | "),
    });
    return;
  }

  if (!flags.writeConfirmed) {
    log.notes.push(`Plan válido para ${target.id}, pero --no-write-confirmed impidió escribir confirmed/.`);
    log.pending.push(target.id);
    return;
  }

  const written = await writeConfirmedAtomic(recipe, target);
  if (written === "skipped-existing") {
    log.skipped.push(target.id);
    return;
  }
  log.confirmed.push(target.id);
}
