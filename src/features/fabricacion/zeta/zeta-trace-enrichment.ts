import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  loadEvidenceSidecarByRecipeId,
  mergeSourceEvidenceFromSidecar,
} from "@/features/fabricacion/zeta/zeta-evidence-sidecar-loader";
import type { ConfirmedRecipe, SourceEvidence } from "@/features/fabricacion/zeta/zeta-types";

const REPO_ROOT = join(process.cwd());

function repoPath(relativePath: string): string {
  return join(REPO_ROOT, relativePath.replace(/\//g, "\\"));
}

function isRealZetaHtmlPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.replace(/\\/g, "/").endsWith("/plan.html");
}

/** Enriquece trazabilidad desde sidecar JSON durable; no modifica confirmed/. */
export function enrichSourceEvidenceFromSidecar(recipe: ConfirmedRecipe): SourceEvidence {
  return mergeSourceEvidenceFromSidecar(recipe.id, recipe.sourceEvidence).sourceEvidence;
}

export function resolveSidecarDatosPendientes(recipeId: string): string[] {
  const sidecar = loadEvidenceSidecarByRecipeId(recipeId);
  if (!sidecar) {
    return ["Sidecar de evidencia no encontrado en docs/fabricacion/zeta/evidence/."];
  }
  if (sidecar.traceabilityStatus === "complete_1_1") {
    return [];
  }
  return sidecar.datosPendientes;
}

export function enrichL25SourceEvidence(recipe: ConfirmedRecipe): SourceEvidence {
  return enrichSourceEvidenceFromSidecar(recipe);
}

export function enrich4800SourceEvidence(recipe: ConfirmedRecipe): SourceEvidence {
  return enrichSourceEvidenceFromSidecar(recipe);
}

export function isCompleteSourceEvidence(source: SourceEvidence): boolean {
  const hashes = source.artifactHashes;
  return Boolean(
    source.runId &&
      source.projectId &&
      source.planId &&
      source.rawPath &&
      isRealZetaHtmlPath(source.htmlPath) &&
      source.textPath &&
      source.capturedAt &&
      source.extractorVersion &&
      hashes?.html &&
      hashes.text &&
      hashes.screenshots &&
      Object.keys(hashes.screenshots).length > 0 &&
      source.screenshotPaths.length > 0 &&
      source.screenshotPaths.every((path) => /\.(png|jpg|jpeg|webp)$/i.test(path)) &&
      source.sourceFragments &&
      source.sourceFragments.length > 0,
  );
}

export function isTraceabilityComplete(recipeId: string): boolean {
  const sidecar = loadEvidenceSidecarByRecipeId(recipeId);
  return sidecar?.traceabilityStatus === "complete_1_1";
}

export function toRepoRelative(absolutePath: string): string {
  return absolutePath.replace(REPO_ROOT, "").replace(/^[/\\]+/, "").replace(/\\/g, "/");
}

export function sha256File(relativePath: string): string | null {
  const absolute = repoPath(relativePath);
  if (!existsSync(absolute)) return null;
  return createHash("sha256").update(readFileSync(absolute)).digest("hex");
}
