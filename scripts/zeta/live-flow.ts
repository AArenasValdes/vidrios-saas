import { join } from "node:path";

import type { BrowserContext, Page } from "@playwright/test";

import { zetaBaseUrl, zetaProjectUrls } from "./config.ts";
import { parsePlanFromHtml, parsePlanFromPageTables } from "./parse-plan.ts";
import { rawEvidenceDir } from "./evidence.ts";
import {
  assertAuthenticated,
  clickFirstMatching,
  extractProjectId,
  fillFieldNearLabel,
  readBlockingError,
  saveCheckpoint,
  selectDropdownOption,
  selectExactLine,
  selectLeaves,
  waitForConfigurationApplied,
  waitForStableUi,
  ZetaUiError,
} from "./ui-helpers.ts";
import type { ExtractedPlan, ExtractTarget } from "./types.ts";

export type LiveExtractionResult = {
  plan: ExtractedPlan;
  consoleLines: string[];
  errorText: string | null;
  pageUrl: string;
  projectId: string | null;
  planId: string | null;
  screenshotPath: string;
  checkpoints: Record<string, string>;
  selectorsUsed: string[];
};

function projectName(attempt: number): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `VENTORA-EXTRACT-${stamp}-a${attempt}`;
}

async function navigateToProjects(page: Page, _baseUrl: string, selectorsUsed: string[]): Promise<void> {
  const candidates = zetaProjectUrls();
  for (const url of candidates) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => undefined);
    await waitForStableUi(page);
    if ((await page.getByText(/proyecto/i).count()) > 0) {
      selectorsUsed.push(`navigate:${url}`);
      return;
    }
  }
  selectorsUsed.push("nav:click Proyectos");
  await clickFirstMatching(page, [/proyectos/i, /mis proyectos/i]);
}

async function createFreshProject(page: Page, attempt: number, selectorsUsed: string[]): Promise<string | null> {
  selectorsUsed.push("button:Nuevo proyecto|Crear proyecto|Nuevo");
  await clickFirstMatching(page, [/nuevo proyecto/i, /crear proyecto/i, /^nuevo$/i, /agregar proyecto/i]);
  const name = projectName(attempt);
  const nameInput = page.locator(
    "input[name*='nombre' i], input[placeholder*='nombre' i], input[aria-label*='nombre' i], input[type='text']",
  );
  if ((await nameInput.count()) > 0) {
    selectorsUsed.push("input:project name");
    await nameInput.first().fill(name);
  }
  await clickFirstMatching(page, [/guardar/i, /crear/i, /aceptar/i, /continuar/i]);
  await waitForStableUi(page);
  return extractProjectId(page.url());
}

async function ensureSingleFrame(page: Page, selectorsUsed: string[]): Promise<void> {
  const existingFrames = page.getByText(/marco\s*\d|componente\s*\d|ventana\s*\d/i);
  if ((await existingFrames.count()) > 0) {
    throw new ZetaUiError(
      "El proyecto nuevo no está vacío; reutilizar marcos está prohibido para esta extracción.",
      "AUTOMATION_ERROR",
    );
  }
  selectorsUsed.push("button:Nuevo marco|Agregar marco|Nuevo componente");
  await clickFirstMatching(page, [/nuevo marco/i, /agregar marco/i, /nuevo componente/i, /agregar componente/i, /nueva ventana/i]);
  await waitForStableUi(page);
}

async function configureFrame(
  page: Page,
  target: ExtractTarget,
  selectorsUsed: string[],
  onCheckpoint?: (stage: "line-selected" | "geometry-configured") => Promise<void>,
): Promise<void> {
  if (target.topologyHint) {
    try {
      selectorsUsed.push(`dropdown:tipolog[ií]a -> ${target.topologyHint}`);
      await selectDropdownOption(page, /tipolog[ií]a|modelo|tipo de ventana/i, target.topologyHint);
    } catch {
      // algunas líneas no exponen tipología explícita
    }
  }

  selectorsUsed.push(`line:exact -> ${target.line}`);
  await selectExactLine(page, target.line);
  await onCheckpoint?.("line-selected");

  selectorsUsed.push(`leaves:${target.leaves}H`);
  await selectLeaves(page, target.leaves);

  selectorsUsed.push(`width:${target.widthMm}`);
  await fillFieldNearLabel(page, /\bancho\b/i, String(target.widthMm));
  selectorsUsed.push(`height:${target.heightMm}`);
  await fillFieldNearLabel(page, /\balto\b|\baltura\b/i, String(target.heightMm));

  if (target.colorHint) {
    try {
      selectorsUsed.push(`color:${target.colorHint}`);
      await selectDropdownOption(page, /color/i, target.colorHint);
    } catch {
      // color puede venir precargado
    }
  }

  selectorsUsed.push(`glass:${target.glassCode}`);
  await selectDropdownOption(page, /vidrio|cristal|termopanel/i, target.glassCode);
  await onCheckpoint?.("geometry-configured");

  await waitForConfigurationApplied(page, {
    line: target.line,
    leaves: target.leaves,
    widthMm: target.widthMm,
    heightMm: target.heightMm,
    glassCode: target.glassCode,
  });
}

async function openPlanDeArmado(page: Page, selectorsUsed: string[]): Promise<void> {
  selectorsUsed.push("button:Continuar|Plan de armado|Generar");
  await clickFirstMatching(page, [/plan de armado/i, /continuar/i, /generar/i, /reporte/i]);
  await waitForStableUi(page);
  if (!page.url().includes("reporte")) {
    await clickFirstMatching(page, [/plan de armado/i, /continuar/i]).catch(() => undefined);
  }
  await page
    .locator("#btn-descargar, .btn-descargar, button:has-text('Descargar'), :text('Plan de armado')")
    .first()
    .waitFor({ timeout: 45_000 });
  selectorsUsed.push("wait:#btn-descargar|.btn-descargar|Descargar|Plan de armado");
}

function extractPlanId(page: Page): Promise<string | null> {
  return page
    .locator("body")
    .innerText()
    .then((text) => text.match(/\bPA-\d+\b/i)?.[0] ?? null);
}

export async function runLiveExtraction(input: {
  context: BrowserContext;
  target: ExtractTarget;
  attempt: number;
}): Promise<LiveExtractionResult> {
  const { context, target, attempt } = input;
  const page = context.pages()[0] ?? (await context.newPage());
  const consoleLines: string[] = [];
  const selectorsUsed: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleLines.push(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleLines.push(`[pageerror] ${error.message}`);
  });

  const rawDir = rawEvidenceDir(target, target.id);
  const screenshotPath = join(rawDir, "screenshot.png");
  const checkpoints: Record<string, string> = {
    projectCreated: join(rawDir, "checkpoint-project-created.png"),
    lineSelected: join(rawDir, "checkpoint-line-selected.png"),
    geometryConfigured: join(rawDir, "checkpoint-geometry-configured.png"),
    planVisible: join(rawDir, "checkpoint-plan-visible.png"),
  };

  const baseUrl = zetaBaseUrl();

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertAuthenticated(page);

  await navigateToProjects(page, baseUrl, selectorsUsed);
  const projectId = await createFreshProject(page, attempt, selectorsUsed);
  await saveCheckpoint(page, checkpoints.projectCreated);

  await ensureSingleFrame(page, selectorsUsed);
  await configureFrame(page, target, selectorsUsed, async (stage) => {
    if (stage === "line-selected") {
      await saveCheckpoint(page, checkpoints.lineSelected);
    }
    if (stage === "geometry-configured") {
      await saveCheckpoint(page, checkpoints.geometryConfigured);
    }
  });

  const blockingBeforePlan = await readBlockingError(page);
  if (blockingBeforePlan) {
    throw new ZetaUiError(blockingBeforePlan, "ZETA_UI_ERROR");
  }

  await openPlanDeArmado(page, selectorsUsed);
  await saveCheckpoint(page, checkpoints.planVisible);

  const planId = await extractPlanId(page);
  const tablePlan = await parsePlanFromPageTables(page);
  const html = await page.content();
  const bodyText = await page.locator("body").innerText();
  const plan =
    tablePlan.profiles.length > 0
      ? { ...tablePlan, planHtml: html, planText: bodyText }
      : { ...parsePlanFromHtml(html), planText: bodyText, planHtml: html };

  await page.screenshot({ path: screenshotPath, fullPage: true });

  return {
    plan,
    consoleLines,
    errorText: await readBlockingError(page),
    pageUrl: page.url(),
    projectId,
    planId,
    screenshotPath,
    checkpoints,
    selectorsUsed,
  };
}
