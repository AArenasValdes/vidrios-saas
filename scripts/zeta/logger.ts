import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ensureDir, RUNS_DIR, repoRelative } from "./paths.ts";
import type { RunLog } from "./types.ts";

export function createRunLog(command: string, mode: RunLog["mode"]): RunLog {
  return {
    startedAt: new Date().toISOString(),
    finishedAt: "",
    command,
    mode,
    targetsRequested: [],
    processed: [],
    confirmed: [],
    skipped: [],
    failed: [],
    pending: [],
    errors: [],
    notes: [],
  };
}

export function stampRunFileName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.json`;
}

export async function writeRunLog(log: RunLog): Promise<string> {
  log.finishedAt = new Date().toISOString();
  await ensureDir(RUNS_DIR);
  const filePath = join(RUNS_DIR, stampRunFileName());
  await writeFile(filePath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return repoRelative(filePath);
}

export function printRunSummary(log: RunLog): void {
  console.log(
    [
      `modo=${log.mode}`,
      `solicitados=${log.targetsRequested.length}`,
      `procesados=${log.processed.length}`,
      `confirmados=${log.confirmed.length}`,
      `saltados=${log.skipped.length}`,
      `fallidos=${log.failed.length}`,
      `pending=${log.pending.length}`,
    ].join(" | "),
  );
  for (const error of log.errors) {
    console.error(`- ${error.outcome}${error.targetId ? ` ${error.targetId}` : ""}: ${error.message}`);
  }
}
