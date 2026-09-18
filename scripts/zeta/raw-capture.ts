import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { rawEvidenceDir } from "./evidence.ts";
import { parsePlanFromHtml, parsePlanFromText } from "./parse-plan.ts";
import type { ExtractionArtifacts } from "./pipeline.ts";
import type { ExtractTarget } from "./types.ts";

export type RawCapture = {
  html: string;
  text: string;
  tables: string[];
  url: string;
  projectId: string | null;
  planId: string | null;
  consoleLines: string[];
  errorText: string | null;
  checkpointPaths: Record<string, string>;
  selectorsUsed: string[];
};

export function checkpointPathsFor(target: ExtractTarget): Record<string, string> {
  const rawDir = rawEvidenceDir(target, target.id);
  return {
    projectCreated: join(rawDir, "checkpoint-project-created.png"),
    lineSelected: join(rawDir, "checkpoint-line-selected.png"),
    geometryConfigured: join(rawDir, "checkpoint-geometry-configured.png"),
    planVisible: join(rawDir, "checkpoint-plan-visible.png"),
    screenshot: join(rawDir, "screenshot.png"),
  };
}

export function captureToArtifacts(
  target: ExtractTarget,
  capture: RawCapture,
  navigationEngine: ExtractionArtifacts["navigationEngine"],
): ExtractionArtifacts {
  const tableText = capture.tables.join("\n");
  const parsed =
    capture.tables.length > 0
      ? parsePlanFromText(`${capture.text}\n${tableText}`)
      : parsePlanFromHtml(capture.html);
  parsed.planHtml = capture.html;
  parsed.planText = capture.text;

  return {
    plan: parsed,
    consoleLines: capture.consoleLines,
    errorText: capture.errorText,
    projectId: capture.projectId,
    planId: capture.planId,
    pageUrl: capture.url,
    selectorsUsed: capture.selectorsUsed,
    checkpoints: capture.checkpointPaths,
    screenshotWritten: existsSync(capture.checkpointPaths.screenshot ?? ""),
    navigationEngine,
  };
}

/** Persiste captura hecha por agente / navegador manual sin relanzar Playwright. */
export async function finalizeRawCapture(input: {
  target: ExtractTarget;
  capture: RawCapture;
  navigationEngine?: ExtractionArtifacts["navigationEngine"];
}): Promise<ExtractionArtifacts> {
  const checkpoints = checkpointPathsFor(input.target);
  await mkdir(rawEvidenceDir(input.target, input.target.id), { recursive: true });

  for (const [key, dest] of Object.entries(checkpoints)) {
    const source = input.capture.checkpointPaths[key];
    if (source && source !== dest && existsSync(source)) {
      await copyFile(source, dest);
    }
  }

  return captureToArtifacts(
    input.target,
    {
      ...input.capture,
      checkpointPaths: checkpoints,
      selectorsUsed: [...input.capture.selectorsUsed, "raw-capture:finalize"],
    },
    input.navigationEngine ?? "manual",
  );
}

export async function saveAgentCaptureFromFiles(input: {
  target: ExtractTarget;
  planHtmlPath: string;
  planTextPath?: string;
  screenshotPath?: string;
  checkpointPaths?: Partial<Record<string, string>>;
  pageUrl?: string;
  projectId?: string | null;
  planId?: string | null;
  errorText?: string | null;
}): Promise<ExtractionArtifacts> {
  const html = await readFile(input.planHtmlPath, "utf8");
  const text = input.planTextPath ? await readFile(input.planTextPath, "utf8") : html;
  const checkpoints = checkpointPathsFor(input.target);

  if (input.screenshotPath && existsSync(input.screenshotPath)) {
    await copyFile(input.screenshotPath, checkpoints.screenshot);
  }
  if (input.checkpointPaths) {
    for (const [key, source] of Object.entries(input.checkpointPaths)) {
      const dest = checkpoints[key as keyof typeof checkpoints];
      if (source && dest && existsSync(source)) {
        await mkdir(dirname(dest), { recursive: true });
        await copyFile(source, dest);
      }
    }
  }

  return finalizeRawCapture({
    target: input.target,
    capture: {
      html,
      text,
      tables: [],
      url: input.pageUrl ?? "",
      projectId: input.projectId ?? null,
      planId: input.planId ?? null,
      consoleLines: [],
      errorText: input.errorText ?? null,
      checkpointPaths: checkpoints,
      selectorsUsed: ["raw-capture:agent-files"],
    },
  });
}
