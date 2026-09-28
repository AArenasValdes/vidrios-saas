import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { assertJestReport, discoverTests, parseOptions } from "./verification-plan.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, "test-results/fabrication");
mkdirSync(output, { recursive: true });
const reportPath = path.join(output, "verification.json");
const report = {
  startedAt: new Date().toISOString(),
  status: "running",
  steps: [],
  browserSmoke: "not_run",
  remoteDatabase: "not_checked",
  workshopValidation: "not_checked",
};
const save = () => writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
save(); // Invalidate a previous successful report before starting any work.

function runStep(name, executable, args) {
  console.log(`\n[fabrication:verify] ${name}`);
  const started = Date.now();
  const result = spawnSync(executable, args, { cwd: root, stdio: "inherit", shell: false });
  const step = {
    name,
    command: [executable, ...args],
    status: result.status === 0 && !result.error ? "passed" : "failed",
    exitCode: result.status,
    signal: result.signal,
    durationMs: Date.now() - started,
    ...(result.error ? { error: result.error.message } : {}),
  };
  report.steps.push(step);
  save();
  if (result.signal) throw new Error(`Proceso interrumpido: ${name} (${result.signal})`);
  return step;
}

try {
  const options = parseOptions(process.argv.slice(2));
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli || !existsSync(pnpmCli) || !/pnpm/i.test(pnpmCli)) {
    throw new Error("Ejecutar mediante pnpm fabrication:verify para usar el PNPM del proyecto.");
  }
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  report.commit = git.status === 0 ? git.stdout.trim() : null;
  const state = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  report.workingTreeDirty = state.status === 0 ? Boolean(state.stdout.trim()) : null;
  const files = discoverTests(root);
  report.selectedSuites = files;
  report.buildRequested = options.build;
  save();

  runStep("Pruebas del verificador", process.execPath, ["--test", "scripts/fabrication/verification-plan.test.mjs"]);
  const jestPath = path.join(output, "jest.json");
  // An interrupted run must never reuse an earlier Jest success.
  writeFileSync(jestPath, "{}\n");
  const jest = runStep("Regresión de fabricación y cotización", process.execPath, [
    pnpmCli, "exec", "jest", "--runInBand", "--config=scripts/fabrication/jest.config.mjs",
    "--json", `--outputFile=${jestPath}`,
  ]);
  try {
    const result = JSON.parse(readFileSync(jestPath, "utf8"));
    assertJestReport(result, files, root);
    report.tests = { passed: result.numPassedTests, suites: result.numPassedTestSuites };
  } catch (error) {
    jest.status = "failed";
    jest.error = error.message;
  }
  save();
  runStep("TypeScript", process.execPath, [pnpmCli, "exec", "tsc", "--noEmit"]);
  runStep("Rutas y documentación", process.execPath, ["scripts/check-docs-drift.mjs"]);
  if (options.build) runStep("Build de producción", process.execPath, [pnpmCli, "run", "build"]);
  report.status = report.steps.every((step) => step.status === "passed") ? "passed" : "failed";
} catch (error) {
  report.status = "failed";
  report.error = error.message;
  console.error(error.message);
} finally {
  report.finishedAt = new Date().toISOString();
  save();
  console.log(`\nVerificación: ${report.status}. Informe: ${reportPath}`);
  console.log("El informe no acredita smoke de navegador, base remota ni validación física de taller.");
  process.exitCode = report.status === "passed" ? 0 : 1;
}
