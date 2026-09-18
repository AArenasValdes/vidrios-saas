import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";

const root = process.cwd();
const profileDir = path.join(root, "tools", "zeta-playwright", ".zeta-profile");
const artifactsDir = path.join(root, "tools", "zeta-playwright", "artifacts");

await fs.mkdir(profileDir, { recursive: true });
await fs.mkdir(artifactsDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 },
});

const page = context.pages()[0] ?? await context.newPage();
await page.goto("https://sistemazeta.cl/zeta/", { waitUntil: "domcontentloaded", timeout: 45000 });

console.log("Ventana de Zeta abierta. Inicia sesión manualmente si aparece el formulario.");
console.log("El script detectará automáticamente cuando el acceso termine y cerrará la ventana.");

await page.waitForFunction(() => {
  const password = [...document.querySelectorAll('input[type="password"]')]
    .some((element) => element instanceof HTMLElement && element.offsetParent !== null);
  return !password || location.pathname !== "/zeta/";
}, { timeout: 300000, polling: 1000 });

await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(artifactsDir, "zeta-session-ready.png"), fullPage: true });
console.log(`Sesión persistente detectada en ${page.url()}.`);

await context.close();
