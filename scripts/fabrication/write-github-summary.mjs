import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const reportPath = "test-results/fabrication/verification.json";
const integrationPath = "test-results/fabrication/line-integration.json";

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

const value = (input) => String(input ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");

export function renderGithubSummary({ report, integration }) {
  const status = report?.status === "passed" ? "Aprobado" : report?.status === "failed" ? "Fallido" : "Incompleto";
  const lines = [
    "## QA de fabricación y cotización",
    "",
    `- **Resultado:** ${status}`,
    `- **Inicio:** ${value(report?.startedAt)}`,
    `- **Commit:** \`${value(report?.commit)}\``,
    `- **Pruebas:** ${report?.tests ? `${value(report.tests.passed)} aprobadas en ${value(report.tests.suites)} suites` : "sin informe Jest completo"}`,
  ];

  const failedSteps = (Array.isArray(report?.steps) ? report.steps : []).filter((step) => step.status === "failed");
  const failures = [report?.error, ...failedSteps.map((step) => `${step.name}: ${step.error ?? `código ${step.exitCode ?? "desconocido"}`}`)]
    .filter(Boolean);
  lines.push(`- **Fallos relevantes:** ${failures.length ? failures.map(value).join("; ") : status === "Aprobado" ? "ninguno" : "ver registros del job"}`);

  const denominators = integration?.denominadores;
  const layerNames = ["catalogo", "precio_venta", "compra", "receta", "vidrios", "snapshot", "paridad_documentos"];
  const validIntegration = integration?.origin === "fixtures_locales" &&
    Number.isInteger(denominators?.lineas) && Number.isInteger(denominators?.configuraciones) &&
    layerNames.every((layer) => denominators?.porCapa?.[layer]);
  if (validIntegration) {
    lines.push(
      "",
      `### Inventario local: ${denominators.lineas} líneas · ${denominators.configuraciones} configuraciones`,
      "",
      "| Capa | Aprobado | Pendiente | Ambiguo | Fallido | No comprobado |",
      "| --- | ---: | ---: | ---: | ---: | ---: |",
      ...layerNames.map((layer) => {
        const counts = denominators.porCapa[layer];
        return `| ${layer} | ${counts.aprobado} | ${counts.pendiente} | ${counts.ambiguo} | ${counts.fallido} | ${counts.noComprobada} |`;
      }),
      "",
      "Fuente: fixtures locales. Supabase y datos privados de organizaciones no fueron consultados.",
    );
  } else {
    lines.push("", "El informe de integración local falta o está incompleto; revisar el artefacto del job.");
  }

  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = renderGithubSummary({ report: readJson(reportPath), integration: readJson(integrationPath) });
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  else process.stdout.write(summary);
}
