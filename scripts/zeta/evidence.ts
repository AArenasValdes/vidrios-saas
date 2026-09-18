import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ensureDir, RAW_DIR, repoRelative } from "./paths.ts";
import type { ExtractTarget, ExtractedPlan } from "./types.ts";
import { slugPart } from "./normalize.ts";

export type RawEvidencePaths = {
  directory: string;
  metadata: string;
  planTxt: string;
  planHtml: string;
  screenshot: string;
  consoleLog: string;
};

export function rawEvidenceDir(target: ExtractTarget, recipeId: string): string {
  return join(
    RAW_DIR,
    slugPart(target.manufacturer),
    slugPart(target.system),
    recipeId,
  );
}

export async function writeRawEvidence(input: {
  target: ExtractTarget;
  recipeId: string;
  plan: ExtractedPlan;
  consoleLines: string[];
  errorText?: string;
  screenshotWritten: boolean;
  projectId?: string | null;
  planId?: string | null;
  pageUrl?: string | null;
  selectorsUsed?: string[];
  checkpoints?: Record<string, string>;
}): Promise<RawEvidencePaths> {
  const directory = rawEvidenceDir(input.target, input.recipeId);
  await ensureDir(directory);
  const paths: RawEvidencePaths = {
    directory,
    metadata: join(directory, "metadata.json"),
    planTxt: join(directory, "plan.txt"),
    planHtml: join(directory, "plan.html"),
    screenshot: join(directory, "screenshot.png"),
    consoleLog: join(directory, "console.log"),
  };

  const metadata = {
    recipeId: input.recipeId,
    extractedAt: new Date().toISOString(),
    target: {
      manufacturer: input.target.manufacturer,
      system: input.target.system,
      line: input.target.line,
      leaves: input.target.leaves,
      widthMm: input.target.widthMm,
      heightMm: input.target.heightMm,
      glassCode: input.target.glassCode,
    },
    sourceEvidence: {
      projectId: input.projectId ?? null,
      planId: input.planId ?? null,
      pageUrl: input.pageUrl ?? null,
      selectorsUsed: input.selectorsUsed ?? [],
      checkpointPaths: input.checkpoints ?? {},
    },
    warnings: input.plan.warnings,
    errorText: input.errorText ?? null,
    screenshotWritten: input.screenshotWritten,
  };

  await writeFile(paths.metadata, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  await writeFile(paths.planTxt, `${input.plan.planText.trim()}\n`, "utf8");
  await writeFile(paths.planHtml, input.plan.planHtml, "utf8");
  await writeFile(paths.consoleLog, `${input.consoleLines.join("\n")}\n`, "utf8");
  return paths;
}

export function evidencePointer(paths: RawEvidencePaths): string {
  return repoRelative(paths.directory);
}
