import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

// Discover new suites automatically; adding a line must not require editing this list.
export const TEST_ROOTS = [
  "src/features/fabricacion",
  "src/features/cotizaciones/line-templates",
  "src/features/cotizaciones/new-quote",
  "src/features/cotizaciones/visual-composer",
  "src/features/proveedor-catalogos",
  "app/(pwa-app)/cotizaciones/nueva/_components/paso-dos",
  "app/(pwa-app)/cotizaciones/nueva/_hooks",
  "app/(pwa-app)/configuracion/empresa/mis-precios",
  "app/print/cotizaciones",
];

export const REQUIRED_TESTS = [
  "src/features/fabricacion/__tests__/fabrication-line-recipes.smoke.test.ts",
  "src/features/fabricacion/__tests__/winhouse-s75-numerical-contract.test.ts",
  "src/features/fabricacion/__tests__/fabricacion-despiece-cotizacion.service.test.ts",
  "src/features/fabricacion/__tests__/fabricacion-receta-integracion-cotizacion.test.ts",
  "src/features/fabricacion/__tests__/fabricacion-pauta-barras.service.test.ts",
  "src/features/fabricacion/__tests__/fabrication-recipes.repository.test.ts",
  "src/features/cotizaciones/line-templates/services/__tests__/seed-line-variant-recipes.test.ts",
  "src/features/cotizaciones/line-templates/services/__tests__/seed-structural-draft-client.test.ts",
  "src/features/cotizaciones/visual-composer/components/__tests__/quote-constructor-workspace.test.tsx",
  "app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/__tests__/pauta-cubicacion-receta-formal.test.tsx",
  "app/print/cotizaciones/[id]/fabricacion/__tests__/fabricacion-resumen-view.test.tsx",
  "src/features/proveedor-catalogos/services/__tests__/precio-compra.service.test.ts",
  "src/features/proveedor-catalogos/services/__tests__/costo-tecnico-parcial.service.test.ts",
  "app/(pwa-app)/configuracion/empresa/mis-precios/__tests__/mis-precios-page.test.tsx",
];

export function discoverTests(root, roots = TEST_ROOTS, required = REQUIRED_TESTS) {
  const files = [];
  function walk(relative) {
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory() && !["node_modules", ".next", ".git"].includes(entry.name)) walk(file);
      else if (entry.isFile() && /\.test\.tsx?$/.test(entry.name)) files.push(file);
    }
  }
  for (const relative of roots) {
    if (!existsSync(path.join(root, relative))) throw new Error(`Falta carpeta de pruebas: ${relative}`);
    walk(relative);
  }
  const selected = [...new Set(files)].sort();
  if (!selected.length) throw new Error("No se encontraron pruebas de fabricación.");
  for (const file of required) {
    if (!selected.includes(file)) throw new Error(`Falta suite obligatoria: ${file}`);
  }
  return selected;
}

export function assertJestReport(report, files, root) {
  if (!report.success || report.numFailedTests || report.numFailedTestSuites) {
    throw new Error("Jest reporta pruebas o suites fallidas.");
  }
  if (!(report.numPassedTests > 0)) throw new Error("Jest no ejecutó pruebas.");
  if (report.numPendingTests || report.numTodoTests || report.numPendingTestSuites) {
    throw new Error("Hay pruebas omitidas o pendientes; la verificación no está completa.");
  }
  const actual = new Set((report.testResults ?? []).map((suite) => path.resolve(suite.name)));
  const missing = files.filter((file) => !actual.has(path.resolve(root, file)));
  if (missing.length) throw new Error(`Jest no ejecutó suites seleccionadas: ${missing.join(", ")}`);
}

export function parseOptions(args) {
  const unknown = args.filter((arg) => arg !== "--build");
  if (unknown.length) throw new Error(`Argumentos desconocidos: ${unknown.join(" ")}. Uso: pnpm fabrication:verify [--build]`);
  return { build: args.includes("--build") };
}
