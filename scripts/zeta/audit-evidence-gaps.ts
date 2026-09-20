import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { type ZetaEvidenceSidecar } from "./evidence-sidecar.ts";
import { EVIDENCE_DIR, REPO_ROOT, repoRelative } from "./paths.ts";

type GapField =
  | "plan.html"
  | "plan.txt"
  | "screenshot PNG"
  | "metadata.json"
  | "runId"
  | "projectId"
  | "planId"
  | "hash html"
  | "hash text"
  | "hash screenshot"
  | "fuente 1:1 perfiles/vidrios/accesorios/medidas";

type AuditRow = {
  recipeId: string;
  system: string;
  traceabilityStatus: ZetaEvidenceSidecar["traceabilityStatus"];
  evidenceAvailable: string[];
  missingFields: GapField[];
  calculable: boolean;
  ventoraStatus: string;
  blocking: string;
  planId: string | null;
  rawTargetDir: string;
};

function abs(relativePath: string): string {
  return join(REPO_ROOT, relativePath.replace(/\//g, "\\"));
}

function fileExists(relativePath: string | null | undefined): boolean {
  if (!relativePath) return false;
  return existsSync(abs(relativePath));
}

function listSidecars(): ZetaEvidenceSidecar[] {
  const out: ZetaEvidenceSidecar[] = [];
  for (const sub of ["l25", "4800"]) {
    const dir = join(EVIDENCE_DIR, "sodal", sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      out.push(JSON.parse(readFileSync(join(dir, name), "utf8")) as ZetaEvidenceSidecar);
    }
  }
  return out.sort((a, b) => a.recipeId.localeCompare(b.recipeId));
}

function rawTargetDir(sidecar: ZetaEvidenceSidecar): string {
  const slug = sidecar.system.toLowerCase();
  return `docs/fabricacion/zeta/raw/sodal/${slug}/${sidecar.recipeId}`;
}

function auditSidecar(sidecar: ZetaEvidenceSidecar): AuditRow {
  const se = sidecar.sourceEvidence;
  const targetDir = rawTargetDir(sidecar);
  const missing: GapField[] = [];

  const hasPlanHtml = fileExists(se.htmlPath) && se.htmlPath?.endsWith("/plan.html");
  const hasPlanTxt =
    fileExists(se.textPath) && se.textPath?.endsWith("/plan.txt");
  const hasScreenshot =
    se.screenshotPaths?.some((p) => fileExists(p) && /\.(png|jpg|jpeg)$/i.test(p)) ??
    false;
  const hasMetadata = fileExists(`${targetDir}/metadata.json`);
  const hasRunId = Boolean(se.runId);
  const hasProjectId = Boolean(se.projectId);
  const hasPlanId = Boolean(se.planId);
  const hasHashHtml = Boolean(se.artifactHashes?.html);
  const hasHashText = Boolean(se.artifactHashes?.text);
  const hasHashScreenshot = Object.keys(se.artifactHashes?.screenshots ?? {}).length > 0;

  const usesDerivedText =
    se.textPath?.endsWith(".md") ||
    se.textPath?.includes("SODAL_LINEA25_ZETA") ||
    sidecar.datosPendientes.some((d) => d.includes("compartida") || d.includes("markdown"));

  const hasSource1_1 =
    hasPlanHtml &&
    hasPlanTxt &&
    hasScreenshot &&
    hasRunId &&
    hasProjectId &&
    hasPlanId &&
    hasHashHtml &&
    hasHashText &&
    hasHashScreenshot &&
    !usesDerivedText;

  if (!hasPlanHtml) missing.push("plan.html");
  if (!hasPlanTxt) missing.push("plan.txt");
  if (!hasScreenshot) missing.push("screenshot PNG");
  if (!hasMetadata) missing.push("metadata.json");
  if (!hasRunId) missing.push("runId");
  if (!hasProjectId) missing.push("projectId");
  if (!hasPlanId) missing.push("planId");
  if (!hasHashHtml) missing.push("hash html");
  if (!hasHashText) missing.push("hash text");
  if (!hasHashScreenshot) missing.push("hash screenshot");
  if (!hasSource1_1) missing.push("fuente 1:1 perfiles/vidrios/accesorios/medidas");

  const evidenceAvailable: string[] = [];
  if (hasPlanHtml && se.htmlPath) evidenceAvailable.push(se.htmlPath);
  if (se.textPath && fileExists(se.textPath)) {
    evidenceAvailable.push(
      se.textPath.endsWith(".md") || se.textPath.includes("SODAL_LINEA25")
        ? `${se.textPath} (derivado)`
        : se.textPath,
    );
  }
  if (hasMetadata) evidenceAvailable.push(`${targetDir}/metadata.json`);
  if (se.runLogPath && fileExists(se.runLogPath)) evidenceAvailable.push(se.runLogPath);
  for (const shot of se.screenshotPaths ?? []) {
    if (fileExists(shot)) evidenceAvailable.push(shot);
  }
  if (sidecar.confirmedPath) evidenceAvailable.push(`${sidecar.confirmedPath} (confirmed)`);

  const calculable = sidecar.traceabilityStatus === "complete_1_1";
  let blocking: string;
  if (calculable) {
    blocking =
      sidecar.system === "4800"
        ? "Trazabilidad 1:1 OK; L-4800 testing; P2A legacy filtrado en resolver"
        : "Trazabilidad 1:1 OK; L25 ≠ production_ready (testing)";
  } else {
    blocking = "Gate evidencia incompleto → calculable=false";
    if (sidecar.system === "L25") {
      blocking += "; L25 ≠ production_ready (testing)";
    }
    if (sidecar.system === "4800") {
      blocking += "; L-4800 testing; P2A legacy filtrado en resolver";
    }
  }

  return {
    recipeId: sidecar.recipeId,
    system: sidecar.system,
    traceabilityStatus: sidecar.traceabilityStatus,
    evidenceAvailable,
    missingFields: sidecar.traceabilityStatus === "complete_1_1" ? [] : missing,
    calculable,
    ventoraStatus: sidecar.ventoraStatus,
    blocking,
    planId: se.planId,
    rawTargetDir: targetDir,
  };
}

function formatMarkdown(rows: AuditRow[], generatedAt: string): string {
  const partial = rows.filter((r) => r.traceabilityStatus === "partial");
  const complete = rows.filter((r) => r.traceabilityStatus === "complete_1_1");

  const lines = [
    "# Capturas Zeta pendientes — auditoría de sidecars",
    "",
    `Generado: ${generatedAt}`,
    "",
    "Este informe **no modifica** `confirmed/` ni habilita `production_ready`.",
    "",
    "## Acceso a Sistema Zeta",
    "",
    "Estado verificado al generar este informe: **sin sesión autenticada** en `https://sistemazeta.cl/zeta/` (pantalla de login).",
    "No hay `tmp/zeta-auth/` con sesión Playwright almacenada.",
    "",
    "Para cerrar evidencias parciales hace falta:",
    "1. Autenticarse manualmente en Cursor Browser o `pnpm zeta:extract -- --login`.",
    "2. Crear **proyecto nuevo** por variante (ver `docs/fabricacion/zeta/SELECTORS.md`).",
    "3. Guardar en `docs/fabricacion/zeta/raw/sodal/{l25|4800}/<recipeId>/`:",
    "   `plan.html`, `plan.txt`, `screenshot.png`, `metadata.json`, checkpoints opcionales.",
    "4. Registrar run en `docs/fabricacion/zeta/runs/<timestamp>.json`.",
    "5. `pnpm zeta:build-evidence-sidecars` (no tocar `confirmed/` salvo ingest explícito).",
    "",
    "## Resumen",
    "",
    "| Estado sidecar | Cantidad |",
    "|---|---:|",
    `| complete_1_1 | ${complete.length} |`,
    `| partial | ${partial.length} |`,
    "",
    "## Sidecars partial — detalle por variante",
    "",
  ];

  for (const row of partial) {
    lines.push(`### \`${row.recipeId}\` (${row.system})`);
    lines.push("");
    lines.push(`- **planId referencia:** ${row.planId ?? "—"}`);
    lines.push(`- **Carpeta raw destino:** \`${row.rawTargetDir}/\``);
    lines.push(`- **Sidecar:** \`${repoRelative(join(EVIDENCE_DIR, "sodal", row.system.toLowerCase(), `${row.recipeId}.json`))}\``);
    lines.push("");
    lines.push("**Evidencia disponible hoy:**");
    if (row.evidenceAvailable.length === 0) {
      lines.push("- (ninguna en raw dedicado)");
    } else {
      for (const item of row.evidenceAvailable) {
        lines.push(`- \`${item}\``);
      }
    }
    lines.push("");
    lines.push("**Campos faltantes para gate 1:1:**");
    for (const field of row.missingFields) {
      lines.push(`- ${field}`);
    }
    lines.push("");
    lines.push(`- **calculable:** ${row.calculable}`);
    lines.push(`- **ventoraStatus:** ${row.ventoraStatus}`);
    lines.push(`- **bloqueo:** ${row.blocking}`);
    lines.push("");
  }

  lines.push("## Sidecars complete_1_1 (referencia)");
  lines.push("");
  for (const row of complete) {
    lines.push(
      `- \`${row.recipeId}\` (${row.system}) · calculable=${row.calculable} · raw=\`${row.rawTargetDir}/\``,
    );
  }
  lines.push("");
  lines.push("## Tabla consolidada");
  lines.push("");
  lines.push(
    "| Variante | Sistema | Evidencia disponible | Campos faltantes | calculable | ventoraStatus | Bloqueo |",
  );
  lines.push("|---|---|---|---|---|---|---|");
  for (const row of rows) {
    const evidence = row.evidenceAvailable.map((e) => e.replace(/\|/g, "\\|")).join("; ") || "—";
    const missing =
      row.missingFields.length > 0 ? row.missingFields.join(", ") : "—";
    lines.push(
      `| \`${row.recipeId}\` | ${row.system} | ${evidence} | ${missing} | ${row.calculable} | ${row.ventoraStatus} | ${row.blocking.replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

function main(): void {
  const generatedAt = new Date().toISOString();
  const sidecars = listSidecars();
  const rows = sidecars.map(auditSidecar);
  const outputPath = join(EVIDENCE_DIR, "PENDING_CAPTURES.md");
  writeFileSync(outputPath, formatMarkdown(rows, generatedAt), "utf8");

  const partial = rows.filter((r) => r.traceabilityStatus === "partial");
  console.log(`Auditoría sidecars: total=${rows.length} partial=${partial.length}`);
  console.log(`Informe: ${repoRelative(outputPath)}`);
  for (const row of partial) {
    console.log(
      `${row.recipeId}: faltan ${row.missingFields.length} campos → ${row.missingFields.join(", ")}`,
    );
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/zeta/audit-evidence-gaps.ts")) {
  main();
}
