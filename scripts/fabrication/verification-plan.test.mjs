import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { assertJestReport, discoverTests, parseOptions } from "./verification-plan.mjs";

function removeTestDirectory(root) {
  assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(root).startsWith("ventora-verifier-"));
  rmSync(root, { recursive: true, force: true });
}

test("descubre suites nuevas TS/TSX y preserva rutas con paréntesis y corchetes", (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ventora-verifier-"));
  t.after(() => removeTestDirectory(root));
  const folder = "app/(qa)/[id]";
  mkdirSync(path.join(root, folder), { recursive: true });
  writeFileSync(path.join(root, folder, "existing.test.ts"), "");
  const required = [`${folder}/existing.test.ts`];
  assert.deepEqual(discoverTests(root, [folder], required), required);
  writeFileSync(path.join(root, folder, "new-line.test.tsx"), "");
  writeFileSync(path.join(root, folder, "component.tsx"), "");
  assert.equal(discoverTests(root, [folder], required).length, 2);
  assert.throws(() => discoverTests(root, [folder], ["missing.test.ts"]), /suite obligatoria/);
  assert.throws(() => discoverTests(root, ["missing"], []), /carpeta de pruebas/);
});

test("no acepta una carpeta sin pruebas", (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ventora-verifier-"));
  t.after(() => removeTestDirectory(root));
  assert.throws(() => discoverTests(root, ["."], []), /No se encontraron/);
});

const files = ["line.test.ts", "app/(qa)/[id]/print.test.tsx"];
const passed = {
  success: true, numPassedTests: 2, numFailedTests: 0, numFailedTestSuites: 0,
  numPendingTests: 0, numPendingTestSuites: 0, numTodoTests: 0,
  testResults: files.map((name) => ({ name: path.resolve(name) })),
};

test("acepta un reporte completo", () => {
  assert.doesNotThrow(() => assertJestReport(passed, files, process.cwd()));
});

for (const key of ["numFailedTests", "numFailedTestSuites", "numPendingTests", "numPendingTestSuites", "numTodoTests"]) {
  test(`rechaza ${key} aunque el proceso termine en cero`, () => {
    assert.throws(() => assertJestReport({ ...passed, [key]: 1 }, files, process.cwd()));
  });
}

test("rechaza reporte vacío o una suite omitida", () => {
  assert.throws(() => assertJestReport({}, files, process.cwd()));
  assert.throws(() => assertJestReport({ ...passed, numPassedTests: 0 }, files, process.cwd()));
  assert.throws(() => assertJestReport({ ...passed, testResults: passed.testResults.slice(0, 1) }, files, process.cwd()), /no ejecutó/);
});

test("los errores de argumentos no silencian etapas", () => {
  assert.deepEqual(parseOptions([]), { build: false });
  assert.deepEqual(parseOptions(["--build"]), { build: true });
  assert.throws(() => parseOptions(["--skip-tests"]), /Argumentos desconocidos/);
});
