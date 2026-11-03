const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const repositoryRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  const mapped = request.startsWith("@/") ? path.join(repositoryRoot, "src", request.slice(2)) : request;
  return originalResolveFilename.call(this, mapped, parent, isMain, options);
};
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { buildGlassPaneCatalogMatrix, serializeGlassPaneCatalogMatrix } = require(
  path.join(repositoryRoot, "src/features/cotizaciones/services/glass-pane-catalog-matrix.service.ts")
);
const outputPath = path.join(repositoryRoot, "docs/agent-map/MATRIZ_GEOMETRIA_PANOS.csv");
fs.writeFileSync(outputPath, serializeGlassPaneCatalogMatrix(buildGlassPaneCatalogMatrix()), "utf8");
process.stdout.write(`Matriz generada: ${path.relative(repositoryRoot, outputPath)}\n`);
