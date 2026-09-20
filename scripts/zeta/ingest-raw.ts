import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { finalizeRawCapture } from "./raw-capture.ts";
import { writeCoverageArtifacts } from "./coverage.ts";
import { rawEvidenceDir } from "./evidence.ts";
import { createRunLog, printRunSummary, writeRunLog } from "./logger.ts";
import { processExtractedTarget } from "./pipeline.ts";
import { parsePlanFromHtml, parsePlanFromText } from "./parse-plan.ts";
import { TARGETS_PATH } from "./paths.ts";
import type { TargetsFile } from "./types.ts";
import type { ExtractTarget, RunLog } from "./types.ts";

function readFlag(name: string, argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === `--${name}` && argv[index + 1]) return argv[index + 1];
    if (token.startsWith(`--${name}=`)) return token.slice(name.length + 3);
  }
  return undefined;
}

async function loadTargetById(targetId: string): Promise<ExtractTarget> {
  const file = JSON.parse(await readFile(TARGETS_PATH, "utf8")) as TargetsFile;
  const target = file.targets.find((item) => item.id === targetId);
  if (!target) {
    throw new Error(`Target no encontrado en targets.json: ${targetId}`);
  }
  return target;
}

async function ingestExistingRaw(target: ExtractTarget, log: RunLog, writeConfirmed: boolean): Promise<void> {
  const dir = rawEvidenceDir(target, target.id);
  const planHtmlPath = join(dir, "plan.html");
  const planTxtPath = join(dir, "plan.txt");
  const metadataPath = join(dir, "metadata.json");

  if (!existsSync(planHtmlPath) && !existsSync(planTxtPath)) {
    throw new Error(`No hay raw en ${dir}. Guarda plan.html/plan.txt antes de ingest.`);
  }

  const html = existsSync(planHtmlPath) ? await readFile(planHtmlPath, "utf8") : "";
  const text = existsSync(planTxtPath) ? await readFile(planTxtPath, "utf8") : html;
  const metadata = existsSync(metadataPath)
    ? (JSON.parse(await readFile(metadataPath, "utf8")) as {
        sourceEvidence?: { projectId?: string | null; planId?: string | null; pageUrl?: string | null };
        errorText?: string | null;
        warnings?: string[];
      })
    : {};
  const consoleLogPath = join(dir, "console.log");
  const consoleLines = existsSync(consoleLogPath)
    ? (await readFile(consoleLogPath, "utf8"))
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const plan = html ? parsePlanFromHtml(html) : parsePlanFromText(text);
  plan.planHtml = html;
  plan.planText = text;
  plan.warnings = [...new Set([...plan.warnings, ...(metadata.warnings ?? [])])];

  const artifacts = await finalizeRawCapture({
    target,
    capture: {
      html: plan.planHtml,
      text: plan.planText,
      tables: [],
      url: metadata.sourceEvidence?.pageUrl ?? "",
      projectId: metadata.sourceEvidence?.projectId ?? null,
      planId: metadata.sourceEvidence?.planId ?? null,
      consoleLines,
      errorText: metadata.errorText ?? null,
      checkpointPaths: {
        projectCreated: join(dir, "checkpoint-project-created.png"),
        lineSelected: join(dir, "checkpoint-line-selected.png"),
        geometryConfigured: join(dir, "checkpoint-geometry-configured.png"),
        planVisible: join(dir, "checkpoint-plan-visible.png"),
        screenshot: join(dir, "screenshot.png"),
      },
      selectorsUsed: ["ingest-raw:existing-folder"],
    },
  });

  artifacts.plan = plan;
  log.processed.push(target.id);
  await processExtractedTarget(target, artifacts, log, { writeConfirmed });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const targetId = readFlag("target", argv);
  if (!targetId) {
    console.error("Uso: pnpm zeta:ingest -- --target=<id> [--no-write-confirmed]");
    process.exitCode = 1;
    return;
  }

  const writeConfirmed = !argv.includes("--no-write-confirmed");
  const log: RunLog = createRunLog(process.argv.join(" "), "ingest");
  log.notes.push("Ingest desde raw/ — la navegación manual no escribe confirmed directamente.");

  const target = await loadTargetById(targetId);
  log.targetsRequested = [target.id];

  await ingestExistingRaw(target, log, writeConfirmed);
  await writeCoverageArtifacts();

  const path = await writeRunLog(log);
  printRunSummary(log);
  console.log(`Run log: ${path}`);
  if (log.failed.length > 0) process.exitCode = 1;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/zeta/ingest-raw.ts")) {
  await main();
}
