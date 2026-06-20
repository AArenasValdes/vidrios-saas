import fs from "node:fs";
import path from "node:path";

const emptyPolyfill = "export {};\n";
const target = path.join(
  process.cwd(),
  "node_modules/next/dist/build/polyfills/polyfill-module.js",
);

if (!fs.existsSync(target)) {
  console.warn(`[polyfill] skipped, file not found: ${target}`);
  process.exit(0);
}

const current = fs.readFileSync(target, "utf8");

if (current !== emptyPolyfill) {
  fs.writeFileSync(target, emptyPolyfill, "utf8");
  console.log(`[polyfill] stubbed ${target}`);
}
