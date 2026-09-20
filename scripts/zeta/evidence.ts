import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ensureDir, RAW_DIR, repoRelative } from "./paths.ts";
import { ZETA_EXTRACTOR_VERSION } from "./types.ts";
import type { ExtractTarget, ExtractedPlan } from "./types.ts";
import { slugPart } from "./normalize.ts";

export type RawEvidencePaths = {
  directory: string;
  metadata: string;
  planTxt: string;
  planHtml: string;
  screenshot: string;
  consoleLog: string;
  artifactHashes: {
    html: string;
    text: string;
    screenshots: Record<string, string>;
  };
};

export type SourceFragment = {
  id: string;
  tipo: "perfil" | "vidrio" | "accesorio" | "identidad" | "advertencia";
  locator: string;
  texto: string;
};

async function sha256IfPresent(path: string): Promise<string | null> {
  if (!existsSync(path)) return null;
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex");
}

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
  runId: string;
  sourceFragments: SourceFragment[];
  extractorVersion?: string;
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

  if (existsSync(paths.metadata)) {
    throw new Error(
      `RAW_EVIDENCE_IMMUTABLE: ya existe evidencia raw para ${input.recipeId}; conserva el original y usa otro identificador de captura.`,
    );
  }

  await writeFile(paths.planTxt, `${input.plan.planText.trim()}\n`, "utf8");
  await writeFile(paths.planHtml, input.plan.planHtml, "utf8");
  await writeFile(paths.consoleLog, `${input.consoleLines.join("\n")}\n`, "utf8");

  const artifactHashes = {
    html: (await sha256IfPresent(paths.planHtml)) ?? "",
    text: (await sha256IfPresent(paths.planTxt)) ?? "",
    screenshots: Object.fromEntries(
      await Promise.all(
        [paths.screenshot, ...Object.values(input.checkpoints ?? {})].map(async (path) => {
          const hash = await sha256IfPresent(path);
          return hash ? [repoRelative(path), hash] : null;
        }),
      ).then((items) => items.filter((item): item is [string, string] => item !== null)),
    ),
  };

  const metadata = {
    recipeId: input.recipeId,
    runId: input.runId,
    extractedAt: new Date().toISOString(),
    extractorVersion: input.extractorVersion ?? ZETA_EXTRACTOR_VERSION,
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
      runId: input.runId,
      rawPath: repoRelative(directory),
      htmlPath: repoRelative(paths.planHtml),
      textPath: repoRelative(paths.planTxt),
      pageUrl: input.pageUrl ?? null,
      selectorsUsed: input.selectorsUsed ?? [],
      checkpointPaths: input.checkpoints ?? {},
      artifactHashes,
      sourceFragments: input.sourceFragments,
    },
    warnings: input.plan.warnings,
    errorText: input.errorText ?? null,
    screenshotWritten: input.screenshotWritten,
  };

  await writeFile(paths.metadata, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return { ...paths, artifactHashes };
}

export function evidencePointer(paths: RawEvidencePaths): string {
  return repoRelative(paths.directory);
}
