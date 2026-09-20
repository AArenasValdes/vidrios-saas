import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { ConfirmedRecipe } from "./types.ts";
import { EVIDENCE_DIR, REPO_ROOT, RUNS_DIR, repoRelative } from "./paths.ts";

export type EvidenceArtifactKind =
  | "zeta_plan_html"
  | "zeta_plan_text"
  | "pa_markdown_derived"
  | "shared_transcription_doc"
  | "screenshot"
  | "checkpoint"
  | "run_log";

export type EvidenceClassification = "observed" | "derived" | "assumed";

export type ZetaEvidenceSidecar = {
  schemaVersion: 1;
  recipeId: string;
  confirmedPath: string;
  manufacturer: string;
  system: string;
  traceabilityStatus: "complete_1_1" | "partial" | "blocked";
  ventoraStatus: "testing";
  productionReady: false;
  observedMeasures: {
    widthMm: number;
    heightMm: number;
    leaves: number;
  };
  observedProfiles: Array<{
    order: number;
    code: string;
    name: string;
    quantity: number;
    lengthMm: number;
    cut1Deg: number | null;
    cut2Deg: number | null;
    classification: "observed";
  }>;
  observedGlass: Array<{
    order: number;
    code: string;
    name: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
    classification: "observed";
  }>;
  observedHardware: Array<{
    order: number;
    code: string;
    name: string;
    quantity: number;
    unit: string;
    classification: "observed";
  }>;
  artifacts: Array<{
    kind: EvidenceArtifactKind;
    path: string;
    sha256: string | null;
    role: "primary" | "supporting";
    classification: EvidenceClassification;
    note?: string;
  }>;
  sourceEvidence: {
    runId: string | null;
    runLogPath: string | null;
    projectId: string | null;
    planId: string | null;
    rawPath: string | null;
    htmlPath: string | null;
    textPath: string | null;
    screenshotPaths: string[];
    capturedAt: string | null;
    extractorVersion: string | null;
    artifactHashes: {
      html: string | null;
      text: string | null;
      screenshots: Record<string, string>;
    };
    sourceFragments: Array<{
      id: string;
      tipo: "perfil" | "vidrio" | "accesorio" | "identidad" | "advertencia";
      locator: string;
      texto: string;
    }>;
    sourceDocument: string | null;
  };
  fieldProvenance: Record<
    string,
    {
      classification: EvidenceClassification;
      sourcePath: string | null;
      note?: string;
    }
  >;
  datosPendientes: string[];
  generatedFrom: "scripts/zeta/build-evidence-sidecars.ts";
  generatedAt: string;
};

const L25_RAW = "docs/fabricacion/zeta/raw/sodal/l25";
const L4800_RAW = "docs/fabricacion/zeta/raw/sodal/4800";
const SHARED_DOC_REL = "docs/SODAL_LINEA25_ZETA_2026-09-18.md";
const EXTRACTOR_VERSION = "zeta-extractor-p1-2026-09-19";

function abs(relativePath: string): string {
  return join(REPO_ROOT, relativePath.replace(/\//g, "\\"));
}

function sha256(relativePath: string): string | null {
  const absolute = abs(relativePath);
  if (!existsSync(absolute)) return null;
  return createHash("sha256").update(readFileSync(absolute)).digest("hex");
}

function readJson<T>(relativePath: string): T | null {
  const absolute = abs(relativePath);
  if (!existsSync(absolute)) return null;
  return JSON.parse(readFileSync(absolute, "utf8")) as T;
}

function buildSourceFragments(recipe: ConfirmedRecipe) {
  const fragments: ZetaEvidenceSidecar["sourceEvidence"]["sourceFragments"] = [
    {
      id: "identidad",
      tipo: "identidad",
      locator: `confirmed/${recipe.id}`,
      texto: `${recipe.line} · ${recipe.leaves}H · ${recipe.testDimensions.widthMm}×${recipe.testDimensions.heightMm} mm`,
    },
  ];
  recipe.profiles.forEach((profile, index) => {
    fragments.push({
      id: `perfil-${index}`,
      tipo: "perfil",
      locator: `confirmed.profiles[${index}]`,
      texto: `${profile.code} · ${profile.name} · ${profile.quantity}×${profile.lengthMm} mm`,
    });
  });
  recipe.glass.forEach((piece, index) => {
    fragments.push({
      id: `vidrio-${index}`,
      tipo: "vidrio",
      locator: `confirmed.glass[${index}]`,
      texto: `${piece.code} · ${piece.quantity}×${piece.widthMm}×${piece.heightMm} mm`,
    });
  });
  recipe.hardware.forEach((item, index) => {
    fragments.push({
      id: `accesorio-${index}`,
      tipo: "accesorio",
      locator: `confirmed.hardware[${index}]`,
      texto: `${item.code} · ${item.name} · ${item.quantity} ${item.unit}`,
    });
  });
  return fragments;
}

function parsePlanFromConfirmed(raw: Record<string, unknown>): string | null {
  const plan = raw.plan ?? raw.planId ?? raw.plan_id;
  return typeof plan === "string" && plan.trim() ? plan.trim() : null;
}

function findPaMarkdown(planId: string): string | null {
  const dir = abs(L25_RAW);
  if (!existsSync(dir)) return null;
  const match = readdirSync(dir).find(
    (name) => name.startsWith(`${planId}_`) && name.endsWith(".md"),
  );
  return match ? `${L25_RAW}/${match}` : null;
}

function parsePaMarkdownHeader(markdownPath: string): {
  projectId: string | null;
  planId: string | null;
  capturedHint: string | null;
} {
  const content = readFileSync(abs(markdownPath), "utf8");
  const projectMatch = content.match(/idProject=(\d+)/i);
  const planMatch = content.match(/^-\s*Plan:\s*`(PA-\d+)`/im);
  return {
    projectId: projectMatch?.[1] ?? null,
    planId: planMatch?.[1] ?? null,
    capturedHint: null,
  };
}

function parseSharedDocProject(planId: string): string | null {
  const content = readFileSync(abs(SHARED_DOC_REL), "utf8");
  if (planId === "PA-3") {
    const match = content.match(/Proyecto de prueba:\s*`([^`]+)`/i);
    return match?.[1]?.replace(/\s*\|\s*/g, "-").replace(/\s+/g, "") ?? null;
  }
  if (planId === "PA-5") {
    const match = content.match(
      /Proyecto de prueba nuevo observado:[\s\S]*?idProject=(\d+)/i,
    );
    return match?.[1] ?? null;
  }
  if (planId === "PA-2") {
    const match = content.match(/Proyecto de prueba `ALE-2[\s\S]*?idProject=(\d+)/i);
    return match?.[1] ?? null;
  }
  return null;
}

type RunLog = {
  startedAt?: string;
  confirmed?: string[];
  processed?: string[];
};

function findLatestRunLog(recipeId: string): { runId: string; runLogPath: string; startedAt: string | null } | null {
  if (!existsSync(RUNS_DIR)) return null;
  const candidates = readdirSync(RUNS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const runLogPath = repoRelative(join(RUNS_DIR, name));
      const log = readJson<RunLog>(runLogPath);
      const hit =
        log?.confirmed?.includes(recipeId) || log?.processed?.includes(recipeId);
      return hit ? { runId: name.replace(/\.json$/, ""), runLogPath, startedAt: log?.startedAt ?? null } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.runId.localeCompare(a.runId));
  return candidates[0] ?? null;
}

type RawMetadata = {
  extractedAt?: string;
  runId?: string;
  extractorVersion?: string;
  sourceEvidence?: {
    projectId?: string | null;
    planId?: string | null;
    rawPath?: string | null;
    htmlPath?: string | null;
    textPath?: string | null;
    artifactHashes?: {
      html?: string | null;
      text?: string | null;
      screenshots?: Record<string, string>;
    };
    checkpointPaths?: Record<string, string>;
  };
};

function listExistingRelative(dirRelative: string, names: string[]): string[] {
  return names
    .map((name) => `${dirRelative}/${name}`)
    .filter((path) => existsSync(abs(path)));
}

export function buildEvidenceSidecar(input: {
  recipe: ConfirmedRecipe;
  confirmedPath: string;
  confirmedRaw: Record<string, unknown>;
  generatedAt: string;
}): ZetaEvidenceSidecar {
  const { recipe, confirmedPath, confirmedRaw, generatedAt } = input;
  const systemSlug = recipe.system.replace(/^L/i, "").toLowerCase();
  const rawDir =
    systemSlug === "4800"
      ? `${L4800_RAW}/${recipe.id}`
      : `${L25_RAW}/${recipe.id}`;
  const metadata = readJson<RawMetadata>(`${rawDir}/metadata.json`);
  const planId = parsePlanFromConfirmed(confirmedRaw) ?? metadata?.sourceEvidence?.planId ?? null;
  const paMarkdown = planId ? findPaMarkdown(planId) : null;
  const usesSharedDoc =
    planId === "PA-3" || (planId === "PA-5" && !paMarkdown) || (planId === "PA-2" && !paMarkdown);

  const artifacts: ZetaEvidenceSidecar["artifacts"] = [];
  const datosPendientes: string[] = [];
  const fieldProvenance: ZetaEvidenceSidecar["fieldProvenance"] = {};

  const htmlPath = listExistingRelative(rawDir, ["plan.html"])[0] ?? null;
  const textPath =
    listExistingRelative(rawDir, ["plan.txt"])[0] ??
    paMarkdown ??
    (usesSharedDoc ? SHARED_DOC_REL : null);
  const screenshotPaths = listExistingRelative(rawDir, [
    "screenshot.png",
    "checkpoint-plan-visible.png",
  ]);
  const checkpointPaths = listExistingRelative(rawDir, [
    "checkpoint-project-created.png",
    "checkpoint-line-selected.png",
    "checkpoint-geometry-configured.png",
    "checkpoint-plan-visible.png",
    "checkpoint-wizard-1.png",
  ]);

  if (htmlPath) {
    artifacts.push({
      kind: "zeta_plan_html",
      path: htmlPath,
      sha256: sha256(htmlPath),
      role: "primary",
      classification: "observed",
    });
  }
  if (textPath?.endsWith("/plan.txt")) {
    artifacts.push({
      kind: "zeta_plan_text",
      path: textPath,
      sha256: sha256(textPath),
      role: htmlPath ? "supporting" : "primary",
      classification: "observed",
    });
  } else if (paMarkdown) {
    artifacts.push({
      kind: "pa_markdown_derived",
      path: paMarkdown,
      sha256: sha256(paMarkdown),
      role: "primary",
      classification: "derived",
      note: "Transcripción documental del Plan Zeta; no sustituye plan.html original.",
    });
    fieldProvenance.textPath = {
      classification: "derived",
      sourcePath: paMarkdown,
      note: "Evidencia textual derivada desde markdown PA.",
    };
    if (!htmlPath) {
      datosPendientes.push("Falta plan.html original de Zeta en raw/.");
    }
  } else if (usesSharedDoc) {
    const sharedPath = SHARED_DOC_REL;
    artifacts.push({
      kind: "shared_transcription_doc",
      path: sharedPath,
      sha256: sha256(sharedPath),
      role: "primary",
      classification: "derived",
      note: "Documento compartido de transcripción PA-3/PA-2/PA-5; no es captura 1:1 por variante.",
    });
    fieldProvenance.textPath = {
      classification: "derived",
      sourcePath: sharedPath,
      note: "Evidencia compartida; trazabilidad 1:1 incompleta por variante.",
    };
    datosPendientes.push("Evidencia compartida en documento de transcripción; falta captura raw dedicada.");
    if (!htmlPath) datosPendientes.push("Falta plan.html original de Zeta en raw/.");
  }

  for (const shot of screenshotPaths) {
    artifacts.push({
      kind: "screenshot",
      path: shot,
      sha256: sha256(shot),
      role: "supporting",
      classification: "observed",
    });
  }
  if (screenshotPaths.length === 0) {
    datosPendientes.push("Falta screenshot.png o checkpoint-plan-visible.png verificable en disco.");
  }

  for (const checkpoint of checkpointPaths) {
    if (screenshotPaths.includes(checkpoint)) continue;
    artifacts.push({
      kind: "checkpoint",
      path: checkpoint,
      sha256: sha256(checkpoint),
      role: "supporting",
      classification: "observed",
    });
  }

  const runLog = findLatestRunLog(recipe.id);
  if (runLog) {
    artifacts.push({
      kind: "run_log",
      path: runLog.runLogPath,
      sha256: sha256(runLog.runLogPath),
      role: "supporting",
      classification: "observed",
    });
    fieldProvenance.runId = {
      classification: "observed",
      sourcePath: runLog.runLogPath,
    };
  } else if (metadata?.runId) {
    fieldProvenance.runId = {
      classification: "observed",
      sourcePath: `${rawDir}/metadata.json`,
    };
  } else {
    datosPendientes.push("Falta runId verificable en metadata.json o runs/*.json.");
  }

  const paHeader = paMarkdown ? parsePaMarkdownHeader(paMarkdown) : null;
  const projectId =
    metadata?.sourceEvidence?.projectId ??
    recipe.sourceEvidence.projectId ??
    paHeader?.projectId ??
    (planId ? parseSharedDocProject(planId) : null);

  if (projectId) {
    fieldProvenance.projectId = {
      classification: paHeader?.projectId || metadata?.sourceEvidence?.projectId
        ? "observed"
        : "derived",
      sourcePath: paHeader?.projectId
        ? paMarkdown
        : metadata?.sourceEvidence?.projectId
          ? `${rawDir}/metadata.json`
          : SHARED_DOC_REL,
    };
  } else {
    datosPendientes.push("Falta projectId verificable en metadata, markdown PA o documento fuente.");
  }

  if (planId) {
    fieldProvenance.planId = {
      classification: "observed",
      sourcePath: confirmedPath,
      note: "Campo plan en JSON confirmed.",
    };
  } else {
    datosPendientes.push("Falta planId en JSON confirmed.");
  }

  const artifactHashes = {
    html: htmlPath ? sha256(htmlPath) : null,
    text: textPath ? sha256(textPath) : null,
    screenshots: Object.fromEntries(
      screenshotPaths
        .map((path) => [path, sha256(path)] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
  };

  const sourceFragments = buildSourceFragments(recipe);
  const capturedAt =
    metadata?.extractedAt ??
    runLog?.startedAt ??
    recipe.extractedAt ??
    null;

  const sourceEvidence = {
    runId: metadata?.runId ?? runLog?.runId ?? null,
    runLogPath: runLog?.runLogPath ?? null,
    projectId,
    planId,
    rawPath: existsSync(abs(rawDir)) ? rawDir : textPath,
    htmlPath,
    textPath,
    screenshotPaths,
    capturedAt,
    extractorVersion: metadata?.extractorVersion ?? EXTRACTOR_VERSION,
    artifactHashes,
    sourceFragments,
    sourceDocument: paMarkdown ?? (usesSharedDoc ? SHARED_DOC_REL : null),
  };

  const hasCompleteGate =
    Boolean(sourceEvidence.runId) &&
    Boolean(sourceEvidence.projectId) &&
    Boolean(sourceEvidence.planId) &&
    Boolean(sourceEvidence.rawPath) &&
    Boolean(sourceEvidence.htmlPath) &&
    Boolean(sourceEvidence.textPath) &&
    Boolean(sourceEvidence.capturedAt) &&
    Boolean(sourceEvidence.extractorVersion) &&
    Boolean(artifactHashes.html) &&
    Boolean(artifactHashes.text) &&
    Object.keys(artifactHashes.screenshots).length > 0 &&
    sourceEvidence.screenshotPaths.length > 0 &&
    sourceFragments.length > 0 &&
    htmlPath !== null;

  const traceabilityStatus: ZetaEvidenceSidecar["traceabilityStatus"] = hasCompleteGate
    ? "complete_1_1"
    : datosPendientes.length > 0
      ? "partial"
      : "blocked";

  if (!hasCompleteGate && traceabilityStatus !== "blocked") {
    datosPendientes.push(
      "Trazabilidad 1:1 incompleta: se requiere plan.html, plan.txt, screenshot, runId, projectId y hashes verificables.",
    );
  }

  return {
    schemaVersion: 1,
    recipeId: recipe.id,
    confirmedPath,
    manufacturer: recipe.manufacturer,
    system: recipe.system,
    traceabilityStatus,
    ventoraStatus: "testing",
    productionReady: false,
    observedMeasures: {
      widthMm: recipe.testDimensions.widthMm,
      heightMm: recipe.testDimensions.heightMm,
      leaves: recipe.leaves,
    },
    observedProfiles: recipe.profiles.map((profile, order) => ({
      order,
      code: profile.code,
      name: profile.name,
      quantity: profile.quantity,
      lengthMm: profile.lengthMm,
      cut1Deg: profile.cut1Deg,
      cut2Deg: profile.cut2Deg,
      classification: "observed" as const,
    })),
    observedGlass: recipe.glass.map((piece, order) => ({
      order,
      code: piece.code,
      name: piece.name,
      quantity: piece.quantity,
      widthMm: piece.widthMm,
      heightMm: piece.heightMm,
      classification: "observed" as const,
    })),
    observedHardware: recipe.hardware.map((item, order) => ({
      order,
      code: item.code,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      classification: "observed" as const,
    })),
    artifacts,
    sourceEvidence,
    fieldProvenance,
    datosPendientes: [...new Set(datosPendientes)],
    generatedFrom: "scripts/zeta/build-evidence-sidecars.ts",
    generatedAt,
  };
}

export function evidenceSidecarPath(system: string, recipeId: string): string {
  const slug = system.toLowerCase();
  return join(EVIDENCE_DIR, "sodal", slug, `${recipeId}.json`);
}

export function readEvidenceSidecar(relativePath: string): ZetaEvidenceSidecar | null {
  return readJson<ZetaEvidenceSidecar>(relativePath);
}
