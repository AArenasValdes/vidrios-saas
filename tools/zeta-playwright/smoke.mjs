import { chromium } from "@playwright/test";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";
import fs from "node:fs/promises";

const root = process.cwd();
const authFile = path.join(root, "tools", "zeta-playwright", "zeta-auth.json");
const artifactsDir = path.join(root, "tools", "zeta-playwright", "artifacts");
const downloadsDir = path.join(root, "tools", "zeta-playwright", "downloads");

await fs.mkdir(artifactsDir, { recursive: true });
await fs.mkdir(downloadsDir, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  storageState: authFile,
  acceptDownloads: true,
});
const page = await context.newPage();

page.on("response", (response) => {
  if (response.status() >= 400) {
    console.log(`[HTTP ${response.status()}] ${response.request().method()} ${response.url()}`);
  }
});

await page.goto("https://sistemazeta.cl/zeta/", { waitUntil: "domcontentloaded" });
await page.screenshot({ path: path.join(artifactsDir, "zeta-smoke.png"), fullPage: true });

console.log(`URL actual: ${page.url()}`);
console.log("Si ves Zeta autenticado, la sesión reutilizada funciona.");
console.log("Este smoke test no crea proyectos ni modifica configuraciones.");

const rl = readline.createInterface({ input, output });
await rl.question("Pulsa Enter para cerrar la prueba... ");
rl.close();

await context.storageState({ path: authFile });
await context.close();
await browser.close();
