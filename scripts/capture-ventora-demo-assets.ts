import { chromium, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = normalizeBaseUrl(process.env.VENTORA_DEMO_BASE_URL ?? "https://www.ventorap.cl");
const DEMO_EMAIL = process.env.VENTORA_DEMO_EMAIL ?? "admin@test.com";
const DEMO_PASSWORD = process.env.VENTORA_DEMO_PASSWORD ?? "1234";
const DEMO_PUBLIC_SLUG = process.env.VENTORA_DEMO_PUBLIC_SLUG;
const DEMO_QUOTE_TOKEN = process.env.VENTORA_DEMO_QUOTE_TOKEN;

const OUTPUT_DIR = path.resolve("public/video-assets/demo-master");
const VIEWPORT = { width: 390, height: 844 };

type CaptureTarget = {
  key: string;
  path: string;
  file: string;
  requiresAuth?: boolean;
  optional?: boolean;
};

const authTargets: CaptureTarget[] = [
  { key: "dashboard", path: "/dashboard", file: "dashboard.png", requiresAuth: true },
  { key: "clientes", path: "/clientes", file: "clientes.png", requiresAuth: true },
  { key: "solicitudes", path: "/solicitudes", file: "solicitudes.png", requiresAuth: true },
  { key: "canalesQr", path: "/solicitudes/canales", file: "canales-qr.png", requiresAuth: true },
  { key: "cotizaciones", path: "/cotizaciones", file: "cotizaciones.png", requiresAuth: true },
  { key: "nuevaCotizacion", path: "/cotizaciones/nueva", file: "nueva-cotizacion.png", requiresAuth: true },
  { key: "configuracionEmpresa", path: "/configuracion/empresa", file: "configuracion-empresa.png", requiresAuth: true },
  { key: "configuracionPagina", path: "/configuracion/pagina-venta", file: "configuracion-pagina.png", requiresAuth: true },
];

const optionalTargets: CaptureTarget[] = [
  ...(DEMO_PUBLIC_SLUG
    ? [
        {
          key: "paginaPublica",
          path: `/solicitud/${DEMO_PUBLIC_SLUG}`,
          file: "pagina-publica.png",
          optional: true,
        },
      ]
    : []),
  ...(DEMO_QUOTE_TOKEN
    ? [
        {
          key: "presupuestoPublico",
          path: `/presupuesto/${DEMO_QUOTE_TOKEN}`,
          file: "presupuesto-publico.png",
          optional: true,
        },
        {
          key: "pdfProfesional",
          path: `/presupuesto/${DEMO_QUOTE_TOKEN}/documento?embed=1`,
          file: "pdf-profesional.png",
          optional: true,
        },
      ]
    : []),
];

const allTargets = [...authTargets, ...optionalTargets];

function normalizeBaseUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function buildUrl(routePath: string) {
  return `${BASE_URL}${routePath}`;
}

async function writeReport(entries: string[]) {
  const missingConfig: string[] = [];

  if (!DEMO_PUBLIC_SLUG) {
    missingConfig.push("- `VENTORA_DEMO_PUBLIC_SLUG` no configurado: se omite captura de pagina publica.");
  }

  if (!DEMO_QUOTE_TOKEN) {
    missingConfig.push("- `VENTORA_DEMO_QUOTE_TOKEN` no configurado: se omiten presupuesto publico y PDF.");
  }

  const report = [
    "# Capture report - Ventora Demo Master",
    "",
    `Base URL: ${BASE_URL}`,
    `Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`,
    `Fecha: ${new Date().toISOString()}`,
    "",
    "## Resultado",
    "",
    ...entries,
    "",
    "## Config opcional",
    "",
    ...(missingConfig.length > 0 ? missingConfig : ["- Variables opcionales configuradas."]),
    "",
    "## Notas",
    "",
    "- Datos sensibles se enmascaran visualmente con CSS antes de capturar.",
    "- Si una ruta falla, el script continua con las siguientes capturas.",
  ].join("\n");

  await writeFile(path.join(OUTPUT_DIR, "capture-report.md"), report, "utf8");
}

async function hardenPageForCapture(page: Page) {
  await page.addStyleTag({
    content: `
      * {
        caret-color: transparent !important;
      }

      [data-sensitive],
      input[type="email"],
      input[type="password"] {
        color: transparent !important;
        text-shadow: 0 0 10px rgba(16, 24, 40, 0.24) !important;
      }

      a[href^="mailto:"],
      a[href^="tel:"],
      a[href*="wa.me"] {
        color: transparent !important;
        text-shadow: 0 0 10px rgba(16, 24, 40, 0.24) !important;
      }
    `,
  });
}

async function waitForStablePage(page: Page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
}

async function login(page: Page, report: string[]) {
  await page.goto(buildUrl("/login"), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForStablePage(page);
  await hardenPageForCapture(page);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "login.png"), fullPage: true });
  report.push("- `login`: OK");

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  await emailInput.fill(DEMO_EMAIL, { timeout: 10_000 });
  await passwordInput.fill(DEMO_PASSWORD, { timeout: 10_000 });

  const submitButton = page
    .locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Ingresar")')
    .first();

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 25_000 }).catch(() => undefined),
    submitButton.click(),
  ]);

  await waitForStablePage(page);

  if (page.url().includes("/login")) {
    throw new Error("Login no salio de /login. Revisar usuario demo o estado de cuenta.");
  }
}

async function captureTarget(page: Page, target: CaptureTarget, report: string[]) {
  try {
    await page.goto(buildUrl(target.path), { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForStablePage(page);
    await hardenPageForCapture(page);

    const currentPath = new URL(page.url()).pathname;
    if (target.requiresAuth && currentPath.startsWith("/login")) {
      throw new Error("Redirigio a login. Sesion demo no disponible para esta ruta.");
    }

    await page.screenshot({
      path: path.join(OUTPUT_DIR, target.file),
      fullPage: true,
      animations: "disabled",
    });
    report.push(`- \`${target.key}\`: OK -> \`${target.file}\``);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.push(`- \`${target.key}\`: FALLA -> ${message}`);
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const report: string[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "es-CL",
  });
  const page = await context.newPage();

  try {
    await login(page, report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.push(`- \`login-auth\`: FALLA -> ${message}`);
  }

  for (const target of allTargets) {
    await captureTarget(page, target, report);
  }

  await browser.close();
  await writeReport(report);
}

main().catch(async (error) => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeReport([`- \`script\`: FALLA -> ${error instanceof Error ? error.message : String(error)}`]);
  process.exitCode = 1;
});
