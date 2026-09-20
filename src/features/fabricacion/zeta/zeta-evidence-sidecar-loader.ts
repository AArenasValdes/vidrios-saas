import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { SourceEvidence } from "@/features/fabricacion/zeta/zeta-types";

const REPO_ROOT = join(process.cwd());
const EVIDENCE_ROOT = join(REPO_ROOT, "docs", "fabricacion", "zeta", "evidence");

export type ZetaEvidenceSidecarTraceability = "complete_1_1" | "partial" | "blocked";

export type ZetaEvidenceSidecar = {
  schemaVersion: 1;
  recipeId: string;
  confirmedPath: string;
  manufacturer: string;
  system: string;
  traceabilityStatus: ZetaEvidenceSidecarTraceability;
  ventoraStatus: "testing";
  productionReady: false;
  datosPendientes: string[];
  sourceEvidence: SourceEvidence & {
    runLogPath?: string | null;
  };
};

let cachedByRecipeId: Map<string, ZetaEvidenceSidecar> | null = null;

function readSidecarFile(absolutePath: string): ZetaEvidenceSidecar | null {
  if (!existsSync(absolutePath)) return null;
  try {
    return JSON.parse(readFileSync(absolutePath, "utf8")) as ZetaEvidenceSidecar;
  } catch {
    return null;
  }
}

function walkSidecars(dir: string, acc: ZetaEvidenceSidecar[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSidecars(fullPath, acc);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const sidecar = readSidecarFile(fullPath);
    if (sidecar) acc.push(sidecar);
  }
}

export function loadAllEvidenceSidecars(): Map<string, ZetaEvidenceSidecar> {
  if (cachedByRecipeId) return cachedByRecipeId;
  const sidecars: ZetaEvidenceSidecar[] = [];
  walkSidecars(EVIDENCE_ROOT, sidecars);
  cachedByRecipeId = new Map(sidecars.map((sidecar) => [sidecar.recipeId, sidecar]));
  return cachedByRecipeId;
}

export function loadEvidenceSidecarByRecipeId(recipeId: string): ZetaEvidenceSidecar | null {
  return loadAllEvidenceSidecars().get(recipeId) ?? null;
}

export function resetEvidenceSidecarCacheForTests(): void {
  cachedByRecipeId = null;
}

export function sidecarToSourceEvidence(sidecar: ZetaEvidenceSidecar): SourceEvidence {
  const source = sidecar.sourceEvidence;
  return {
    runId: source.runId,
    projectId: source.projectId,
    planId: source.planId,
    screenshotPaths: source.screenshotPaths ?? [],
    rawPath: source.rawPath,
    htmlPath: source.htmlPath,
    textPath: source.textPath,
    capturedAt: source.capturedAt,
    extractorVersion: source.extractorVersion,
    artifactHashes: source.artifactHashes,
    sourceFragments: source.sourceFragments,
    sourceDocument: source.sourceDocument,
  };
}

export function mergeSourceEvidenceFromSidecar(
  recipeId: string,
  existing: SourceEvidence,
): { sourceEvidence: SourceEvidence; datosPendientes: string[]; traceabilityStatus: ZetaEvidenceSidecarTraceability | null } {
  const sidecar = loadEvidenceSidecarByRecipeId(recipeId);
  if (!sidecar) {
    return {
      sourceEvidence: existing,
      datosPendientes: ["Sidecar de evidencia no encontrado en docs/fabricacion/zeta/evidence/."],
      traceabilityStatus: null,
    };
  }

  const fromSidecar = sidecarToSourceEvidence(sidecar);
  return {
    sourceEvidence: {
      ...existing,
      ...fromSidecar,
      screenshotPaths:
        fromSidecar.screenshotPaths.length > 0
          ? fromSidecar.screenshotPaths
          : existing.screenshotPaths,
      artifactHashes: fromSidecar.artifactHashes ?? existing.artifactHashes,
      sourceFragments:
        fromSidecar.sourceFragments && fromSidecar.sourceFragments.length > 0
          ? fromSidecar.sourceFragments
          : existing.sourceFragments,
    },
    datosPendientes: sidecar.datosPendientes,
    traceabilityStatus: sidecar.traceabilityStatus,
  };
}
