import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { compareRecipes, extractedPlanToComparable, formatCompareResult } from "./compare.ts";
import { writeCoverageArtifacts } from "./coverage.ts";
import { rawEvidenceDir, writeRawEvidence } from "./evidence.ts";
import { acquireExtractLock, extractLiveTarget, hasStoredSession, loginManually } from "./browser.ts";
import { processExtractedTarget } from "./pipeline.ts";
import { matchesFilter, parseCliFlags } from "./cli-args.ts";
import { createRunLog, printRunSummary, writeRunLog } from "./logger.ts";
import { FIXTURES_DIR, repoRelative } from "./paths.ts";
import { parsePlanFromText } from "./parse-plan.ts";
import { selectTargets, writeTargetsFile } from "./targets.ts";
import { loadConfirmedRecipes } from "./inventory.ts";
import type { CliFlags, ExtractTarget, RunLog } from "./types.ts";
import { ZetaUiError } from "./ui-helpers.ts";

const DEFAULT_SELF_CHECK_ID = "monolitico_pierna_abierta_2h_1800x1500";

async function runSelfCheck(flags: CliFlags, log: RunLog): Promise<void> {
  const recipeId = flags.compareConfirmed ?? DEFAULT_SELF_CHECK_ID;
  const loaded = await loadConfirmedRecipes();
  const confirmed = loaded.find((item) => item.recipe.id === recipeId);
  if (!confirmed) {
    log.failed.push(recipeId);
    log.errors.push({
      targetId: recipeId,
      outcome: "CONFIGURATION_ERROR",
      message: `No existe receta confirmed ${recipeId} para self-check.`,
    });
    return;
  }

  const fixturePath = join(FIXTURES_DIR, `${recipeId}.plan.txt`);
  if (!existsSync(fixturePath)) {
    log.failed.push(recipeId);
    log.errors.push({
      targetId: recipeId,
      outcome: "CONFIGURATION_ERROR",
      message: `Falta fixture ${repoRelative(fixturePath)}.`,
    });
    return;
  }

  const plan = parsePlanFromText(await readFile(fixturePath, "utf8"));
  const comparable = extractedPlanToComparable(plan, confirmed.recipe);
  const comparison = compareRecipes(confirmed.recipe, comparable);
  log.processed.push(recipeId);
  log.notes.push(formatCompareResult(comparison));
  log.notes.push("Self-check no escribió ni modificó confirmed/.");

  const evidenceDir = rawEvidenceDir(
    {
      id: recipeId,
      manufacturer: confirmed.recipe.manufacturer,
      system: confirmed.recipe.system,
      line: confirmed.recipe.line,
      variant: confirmed.recipe.variant,
      glazing: confirmed.recipe.glazing,
      glassCode: confirmed.recipe.glass[0]?.code ?? "CTI5",
      leaves: confirmed.recipe.leaves,
      widthMm: confirmed.recipe.testDimensions.widthMm,
      heightMm: confirmed.recipe.testDimensions.heightMm,
      status: "confirmed",
      purpose: "canonical",
    },
    `${recipeId}__self-check`,
  );
  await writeRawEvidence({
    target: {
      id: recipeId,
      manufacturer: confirmed.recipe.manufacturer,
      system: confirmed.recipe.system,
      line: confirmed.recipe.line,
      variant: confirmed.recipe.variant,
      glazing: confirmed.recipe.glazing,
      glassCode: confirmed.recipe.glass[0]?.code ?? "CTI5",
      leaves: confirmed.recipe.leaves,
      widthMm: confirmed.recipe.testDimensions.widthMm,
      heightMm: confirmed.recipe.testDimensions.heightMm,
      status: "confirmed",
      purpose: "canonical",
    },
    recipeId: `${recipeId}__self-check`,
    plan,
    consoleLines: plan.warnings,
    screenshotWritten: false,
  });
  log.notes.push(`Evidencia de self-check en ${repoRelative(evidenceDir)} (no reemplaza confirmed).`);

  if (!comparison.ok) {
    log.failed.push(recipeId);
    log.errors.push({
      targetId: recipeId,
      outcome: "SOURCE_CONFLICT",
      message: comparison.errors.map((item) => `${item.path}: ${item.expected} vs ${item.actual}`).join(" | "),
    });
    return;
  }
  log.confirmed.push(recipeId);
}

async function extractWithPlaywright(target: ExtractTarget, attempt: number) {
  const extracted = await extractLiveTarget({ target, attempt });
  return {
    plan: extracted.plan,
    consoleLines: extracted.consoleLines,
    errorText: extracted.errorText,
    projectId: extracted.projectId,
    planId: extracted.planId,
    pageUrl: extracted.pageUrl,
    selectorsUsed: extracted.selectorsUsed,
    checkpoints: extracted.checkpoints,
    screenshotWritten: existsSync(extracted.screenshotPath),
    navigationEngine: "playwright" as const,
  };
}

async function processLiveTarget(target: ExtractTarget, log: RunLog, flags: CliFlags): Promise<void> {
  let artifacts: Awaited<ReturnType<typeof extractWithPlaywright>> | null = null;

  for (const attempt of [1, 2] as const) {
    try {
      artifacts = await extractWithPlaywright(target, attempt);
      const incomplete = Boolean(artifacts.errorText) || artifacts.plan.profiles.length === 0;
      if (!incomplete) break;
      if (attempt === 1) {
        log.notes.push(`Reintento limpio 1/1 para ${target.id} en proyecto nuevo.`);
        continue;
      }
    } catch (error) {
      if (error instanceof ZetaUiError && error.code === "LOGIN_REQUIRED") {
        throw error;
      }
      if (attempt === 2) {
        log.failed.push(target.id);
        log.pending.push(target.id);
        log.errors.push({
          targetId: target.id,
          outcome: error instanceof ZetaUiError ? error.code : "AUTOMATION_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      log.notes.push(`Reintento limpio 1/1 para ${target.id} en proyecto nuevo.`);
    }
  }

  if (!artifacts) return;
  await processExtractedTarget(target, artifacts, log, flags);
}

async function main(): Promise<void> {
  const flags = parseCliFlags(process.argv.slice(2));
  const mode = flags.login
    ? "login"
    : flags.selfCheck
      ? "self-check"
      : flags.live
        ? "live"
        : "dry-run";
  const log: RunLog = createRunLog(process.argv.join(" "), mode);

  if (flags.login) {
    await loginManually();
    log.notes.push("Sesión de Zeta guardada localmente. No se extrajo ninguna receta.");
    const path = await writeRunLog(log);
    console.log(`Run log: ${path}`);
    return;
  }

  const targetsFile = await writeTargetsFile();
  if (flags.selfCheck) {
    const recipeId = flags.compareConfirmed ?? DEFAULT_SELF_CHECK_ID;
    log.targetsRequested = [recipeId];
    await runSelfCheck(flags, log);
    for (const note of log.notes) {
      console.log(note);
    }
    const path = await writeRunLog(log);
    printRunSummary(log);
    console.log(`Run log: ${path}`);
    if (log.failed.length > 0) process.exitCode = 1;
    return;
  }

  const queued = selectTargets(targetsFile, {
    includeGeometry: flags.includeGeometry,
    status: flags.status ?? "pending",
  }).filter((target) => matchesFilter(flags, target));
  const limited = queued.slice(0, flags.limit);
  log.targetsRequested = limited.map((item) => item.id);

  if (!flags.live) {
    log.notes.push("Dry-run por defecto: no se abre Sistema Zeta ni se escribe confirmed/.");
    for (const target of targetsFile.targets.filter((item) => item.status === "confirmed")) {
      if (!matchesFilter({ ...flags, status: undefined }, target)) continue;
      log.skipped.push(target.id);
    }
    for (const target of limited) {
      log.processed.push(target.id);
      log.pending.push(target.id);
      console.log(
        `WOULD EXTRACT ${target.id} | ${target.line} | ${target.leaves}H | ${target.widthMm}x${target.heightMm} | ${target.glassCode} | ${target.purpose}`,
      );
    }
    for (const skipped of log.skipped.slice(0, 20)) {
      console.log(`SKIP confirmed ${skipped}`);
    }
    if (log.skipped.length > 20) {
      console.log(`SKIP confirmed … ${log.skipped.length - 20} más`);
    }
    const path = await writeRunLog(log);
    printRunSummary(log);
    console.log(`Run log: ${path}`);
    console.log("Para extraer de verdad: navega Zeta (Cursor Browser) + pnpm zeta:ingest, o pnpm zeta:extract -- --live --limit=1");
    return;
  }

  if (!(await hasStoredSession())) {
    log.errors.push({
      outcome: "AUTOMATION_ERROR",
      message:
        "No hay sesión Playwright local. Ejecuta pnpm zeta:extract -- --login, o captura raw/ con Cursor Browser y pnpm zeta:ingest.",
    });
    const path = await writeRunLog(log);
    printRunSummary(log);
    console.log(`Run log: ${path}`);
    process.exitCode = 1;
    return;
  }

  const release = await acquireExtractLock();
  try {
    for (const target of limited) {
      log.processed.push(target.id);
      try {
        await processLiveTarget(target, log, flags);
      } catch (error) {
        log.failed.push(target.id);
        log.pending.push(target.id);
        log.errors.push({
          targetId: target.id,
          outcome: "AUTOMATION_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await release();
  }

  await writeCoverageArtifacts();
  const path = await writeRunLog(log);
  printRunSummary(log);
  console.log(`Run log: ${path}`);
  if (log.failed.length > 0) process.exitCode = 1;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/zeta/extract.ts")) {
  await main();
}
