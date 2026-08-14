import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(root, "app");
const manifestPath = path.join(root, "docs", "agent-map", "ROUTES_MANIFEST.json");
const routesMapPath = path.join(root, "docs", "agent-map", "ROUTES_MAP.md");

const requiredDocs = [
  "AGENTS.md",
  "AGENTS_MARKETING.md",
  "README.md",
  "docs/README.md",
  "docs/ventora-master-brief.md",
  "docs/agent-map/README.md",
  "docs/agent-map/ROUTES_MAP.md",
  "docs/agent-map/FEATURES_MAP.md",
  "docs/agent-map/DATA_MODEL_MAP.md",
  "docs/agent-map/COMPONENTS_MAP.md",
  "docs/agent-map/AGENT_TASK_GUIDE.md",
  "docs/billing/README.md",
  "docs/growth-os/README.md",
  "docs/growth-os/AGENTS_GROWTH_OS.md",
  "docs/growth-os/ROUTE_OWNERSHIP.md",
  "docs/growth-os/WEEKLY_OPERATING_SYSTEM.md",
];

const criticalRoutes = [
  "/",
  "/solicitud/[empresa]",
  "/solicitudes",
  "/cotizaciones",
  "/cotizaciones/nueva",
  "/print/cotizaciones/[id]",
  "/presupuesto/[token]",
  "/api/subscriptions/mercadopago/webhook",
  "/admin/growth",
];

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function routeFromFile(filePath) {
  const relative = path.relative(appRoot, filePath);
  const segments = relative.split(path.sep);
  const fileName = segments.pop();
  const routeSegments = segments.filter((segment) => !/^\(.+\)$/.test(segment));
  const routePath = routeSegments.length === 0 ? "/" : `/${routeSegments.join("/")}`;
  const type = fileName.startsWith("route.") ? "api" : "page";
  const area = routePath.startsWith("/api/")
    ? "api"
    : routePath.startsWith("/admin")
      ? "admin"
      : routePath.startsWith("/print")
        ? "print"
        : routePath.startsWith("/auth") || routePath === "/login" || routePath === "/registro"
          ? "auth"
        : routePath.startsWith("/presupuesto") || routePath.startsWith("/solicitud/") || routePath === "/planes" || routePath === "/" || routePath === "/offline" || routePath === "/privacy" || routePath === "/terms" || routePath === "/.well-known/assetlinks.json"
            ? "public"
            : "private";

  return {
    path: routePath,
    type,
    area,
    source: toPosix(path.relative(root, filePath)),
  };
}

function getRoutes() {
  return walk(appRoot)
    .filter((filePath) => /(?:^|[\\/])(page|route)\.(?:tsx?|jsx?)$/.test(filePath))
    .map(routeFromFile)
    .sort((left, right) => left.path.localeCompare(right.path) || left.type.localeCompare(right.type));
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function signature(routes) {
  return routes.map(({ path: routePath, type, source }) => `${routePath}|${type}|${source}`).sort();
}

function checkManifest(routes, errors) {
  const manifest = readManifest();
  if (!manifest) {
    errors.push("Falta docs/agent-map/ROUTES_MANIFEST.json. Ejecuta: node scripts/check-docs-drift.mjs --write-manifest");
    return;
  }
  const expected = signature(routes);
  const actual = signature(manifest.routes ?? []);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    errors.push("ROUTES_MANIFEST.json no coincide con archivos page/route reales de app/");
  }
}

function checkRequiredDocs(errors) {
  for (const relativePath of requiredDocs) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) {
      errors.push(`Documento requerido ausente: ${relativePath}`);
      continue;
    }
    const content = fs.readFileSync(absolute, "utf8").slice(0, 4000);
    if (!/(?:Estado|Status)\s*:/i.test(content)) errors.push(`${relativePath}: falta Estado/Status`);
    if (!/20\d{2}-\d{2}-\d{2}/.test(content)) errors.push(`${relativePath}: falta fecha de actualización`);
    if (!/(?:Responsable|Owner|Audiencia)\s*:/i.test(content)) errors.push(`${relativePath}: falta Responsable/Owner/Audiencia`);
  }
}

function checkLinks(errors) {
  const markdownFiles = walk(path.join(root, "docs"))
    .filter((filePath) => filePath.endsWith(".md") && !filePath.includes(`${path.sep}archive${path.sep}`));

  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    const linkPattern = /\]\(([^)#]+)(?:#[^)]*)?\)/g;
    for (const match of content.matchAll(linkPattern)) {
      const target = match[1].trim();
      if (!target || /^(?:https?:|mailto:|#)/i.test(target) || /^[A-Za-z]:[\\/]/.test(target)) continue;
      const resolved = path.resolve(path.dirname(filePath), target);
      if (!fs.existsSync(resolved)) {
        errors.push(`${toPosix(path.relative(root, filePath))}: link inexistente ${target}`);
      }
    }
  }
}

function checkPackageManager(errors) {
  const docsFiles = walk(path.join(root, "docs"))
    .filter((filePath) => filePath.endsWith(".md"))
    .filter((filePath) => !filePath.includes(`${path.sep}archive${path.sep}`))
    .filter((filePath) => !filePath.endsWith(`${path.sep}CHANGELOG_AGENT_MAP.md`))
    .map((filePath) => path.relative(root, filePath));
  const uniqueFiles = ["AGENTS.md", "AGENTS_MARKETING.md", "README.md", "docs/README.md", ...docsFiles];
  for (const relativePath of uniqueFiles) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) continue;
    const content = fs.readFileSync(absolute, "utf8");
    if (/\bnpm (?:run|install|test|exec|start|build|lint)\b/.test(content)) {
      errors.push(`${relativePath}: usa npm; este repo documenta comandos pnpm`);
    }
  }
}

function checkCoverage(routes, errors) {
  const map = fs.readFileSync(routesMapPath, "utf8");
  const routeSet = new Set(routes.map((route) => route.path));
  for (const route of routes) {
    if (!map.includes(`\`${route.path}\``)) {
      errors.push(`Ruta real no documentada en ROUTES_MAP.md: ${route.path}`);
    }
  }
  for (const criticalRoute of criticalRoutes) {
    if (!routeSet.has(criticalRoute)) errors.push(`Ruta crítica no existe en app/: ${criticalRoute}`);
    if (!map.includes(criticalRoute)) errors.push(`Ruta crítica no documentada en ROUTES_MAP.md: ${criticalRoute}`);
  }

  const featureMap = fs.readFileSync(path.join(root, "docs/agent-map/FEATURES_MAP.md"), "utf8");
  for (const heading of ["Autenticacion", "Trial, Suscripcion y Billing", "Cotizaciones", "Solicitudes / Leads"]) {
    if (!featureMap.includes(`## Feature: ${heading}`)) errors.push(`Feature mínima ausente: ${heading}`);
  }

  const dataMap = fs.readFileSync(path.join(root, "docs/agent-map/DATA_MODEL_MAP.md"), "utf8");
  for (const table of ["organizations", "cotizaciones", "solicitudes_contacto", "fabrication_recipes", "suscripciones_organizacion"]) {
    if (!dataMap.includes(`### Tabla: ${table}`)) errors.push(`Tabla mínima ausente en DATA_MODEL_MAP.md: ${table}`);
  }
}

function writeManifest(routes) {
  fs.writeFileSync(manifestPath, `${JSON.stringify({ generatedFrom: "app/**/(page|route)", routes }, null, 2)}\n`);
}

const routes = getRoutes();
if (process.argv.includes("--write-manifest")) {
  writeManifest(routes);
  console.log(`Manifest escrito: ${routes.length} rutas`);
  process.exit(0);
}

const errors = [];
checkManifest(routes, errors);
checkRequiredDocs(errors);
checkLinks(errors);
checkPackageManager(errors);
checkCoverage(routes, errors);

if (errors.length > 0) {
  console.error(`docs:check falló con ${errors.length} problema(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`docs:check OK — ${routes.length} rutas verificadas, ${requiredDocs.length} documentos canónicos revisados.`);
