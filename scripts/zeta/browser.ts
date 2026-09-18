import { existsSync } from "node:fs";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { chromium, type BrowserContext } from "@playwright/test";

import { zetaBaseUrl } from "./config.ts";
import { runLiveExtraction, type LiveExtractionResult } from "./live-flow.ts";
import {
  AUTH_DIR,
  AUTH_PROFILE_DIR,
  AUTH_STATE_PATH,
  EXTRACT_LOCK_PATH,
  ensureDir,
} from "./paths.ts";
import type { ExtractTarget } from "./types.ts";
import { ZetaUiError } from "./ui-helpers.ts";

export { zetaBaseUrl };

export async function acquireExtractLock(): Promise<() => Promise<void>> {
  await ensureDir(AUTH_DIR);
  if (existsSync(EXTRACT_LOCK_PATH)) {
    const existing = await readFile(EXTRACT_LOCK_PATH, "utf8");
    throw new Error(
      `Ya hay una extracción Zeta en curso (${existing.trim()}). No se permite otra sesión simultánea.`,
    );
  }
  await writeFile(EXTRACT_LOCK_PATH, `${process.pid} ${new Date().toISOString()}\n`, "utf8");
  return async () => {
    await unlink(EXTRACT_LOCK_PATH).catch(() => undefined);
  };
}

export async function launchZetaContext(headless: boolean): Promise<BrowserContext> {
  await ensureDir(AUTH_PROFILE_DIR);
  return chromium.launchPersistentContext(AUTH_PROFILE_DIR, {
    headless,
    viewport: { width: 1440, height: 900 },
    storageState: existsSync(AUTH_STATE_PATH) ? AUTH_STATE_PATH : undefined,
  });
}

export async function saveStorageState(context: BrowserContext): Promise<void> {
  await ensureDir(AUTH_DIR);
  await context.storageState({ path: AUTH_STATE_PATH });
}

export async function loginManually(): Promise<void> {
  const release = await acquireExtractLock();
  const context = await launchZetaContext(false);
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(zetaBaseUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  const rl = createInterface({ input, output });
  console.log("Inicia sesión manualmente en Sistema Zeta.");
  console.log("No se guarda usuario ni contraseña; solo el estado de sesión local ignorado por git.");
  console.log(`Perfil local: ${AUTH_PROFILE_DIR}`);
  await rl.question("Cuando el dashboard esté visible, presiona Enter aquí...");
  rl.close();
  await saveStorageState(context);
  await context.close();
  await release();
  console.log(`Sesión guardada en ${AUTH_STATE_PATH}`);
}

export async function hasStoredSession(): Promise<boolean> {
  return existsSync(AUTH_STATE_PATH) || existsSync(AUTH_PROFILE_DIR);
}

export async function extractLiveTarget(input: {
  target: ExtractTarget;
  attempt: number;
}): Promise<LiveExtractionResult> {
  if (!(await hasStoredSession())) {
    throw new ZetaUiError(
      "No hay sesión local de Zeta. Ejecuta `pnpm zeta:extract -- --login` e inicia sesión a mano.",
      "LOGIN_REQUIRED",
    );
  }

  const context = await launchZetaContext(false);
  try {
    const result = await runLiveExtraction({
      context,
      target: input.target,
      attempt: input.attempt,
    });
    await saveStorageState(context);
    return result;
  } finally {
    await context.close();
  }
}

export const BROWSER_POLICY = {
  primaryNavigation:
    "Cursor Browser (MCP) reutiliza la sesión del taller. Patrón obligatorio: state → interact → state.",
  playwrightFallback:
    "Playwright (`pnpm zeta:extract -- --live`) solo como fallback técnico. Reutiliza tmp/zeta-auth/. No guarda passwords.",
  ingestGate:
    "La navegación manual nunca escribe confirmed/ directamente. Siempre raw → parse → validate → confirmed vía scripts/zeta.",
  singleSession: "Un solo agente puede navegar Zeta a la vez (extract.lock). No paralelizar navegadores Zeta.",
};
