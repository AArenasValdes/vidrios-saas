import assert from "node:assert/strict";
import { test } from "node:test";
import { renderGithubSummary } from "./write-github-summary.mjs";

function sample() {
  const counts = { aprobado: 2, pendiente: 1, ambiguo: 0, fallido: 0, noComprobada: 1 };
  return {
    report: {
      status: "passed", startedAt: "2026-10-26T08:17:00-03:00", commit: "abc123",
      tests: { passed: 24, suites: 7 }, steps: [{ name: "Jest", status: "passed" }],
    },
    integration: {
      origin: "fixtures_locales",
      denominadores: {
        lineas: 2, configuraciones: 3,
        porCapa: Object.fromEntries(["catalogo", "precio_venta", "compra", "receta", "vidrios", "snapshot", "paridad_documentos"].map((name) => [name, counts])),
      },
    },
  };
}

test("el resumen muestra estado, commit, pruebas, cobertura y alcance local", () => {
  const output = renderGithubSummary(sample());
  assert.match(output, /Resultado:\*\* Aprobado/);
  assert.match(output, /24 aprobadas en 7 suites/);
  assert.match(output, /2 líneas · 3 configuraciones/);
  assert.match(output, /fixtures locales/);
  assert.match(output, /Supabase y datos privados.*no fueron consultados/);
});

test("el resumen no disfraza informe ausente ni fallos de etapas", () => {
  const input = sample();
  input.report.status = "failed";
  input.report.steps.push({ name: "TypeScript", status: "failed", error: "tipo inválido" });
  input.integration = null;
  const output = renderGithubSummary(input);
  assert.match(output, /Resultado:\*\* Fallido/);
  assert.match(output, /TypeScript: tipo inválido/);
  assert.match(output, /informe de integración local falta o está incompleto/);
});

test("el resumen identifica ejecuciones incompletas sin inventar conteos", () => {
  const output = renderGithubSummary({ report: null, integration: null });
  assert.match(output, /Resultado:\*\* Incompleto/);
  assert.match(output, /sin informe Jest completo/);
  assert.match(output, /Commit:\*\* `—`/);
});
