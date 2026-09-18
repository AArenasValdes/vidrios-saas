import type { Locator, Page } from "@playwright/test";

const LOADING = [
  ".v-progress-linear",
  ".v-progress-circular",
  ".loading",
  '[class*="spinner"]',
  '[class*="Spinner"]',
  '[aria-busy="true"]',
];

const BLOCKING_ERRORS =
  /No se ha encontrado el producto|No se ha encontrado la l[ií]nea|Ocurri[oó] un error|ReferenceError|TypeError/i;

export class ZetaUiError extends Error {
  code: "LOGIN_REQUIRED" | "ZETA_UI_ERROR" | "AUTOMATION_ERROR" | "CONFIGURATION_ERROR";

  constructor(
    message: string,
    code: "LOGIN_REQUIRED" | "ZETA_UI_ERROR" | "AUTOMATION_ERROR" | "CONFIGURATION_ERROR",
  ) {
    super(message);
    this.name = "ZetaUiError";
    this.code = code;
  }
}

export async function waitForStableUi(page: Page, timeoutMs = 30_000): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined);
  for (const selector of LOADING) {
    await page
      .locator(selector)
      .first()
      .waitFor({ state: "hidden", timeout: 5_000 })
      .catch(() => undefined);
  }
}

export async function readBlockingError(page: Page): Promise<string | null> {
  const alert = page
    .locator(".v-alert, .alert, [role='alert'], .swal2-popup, .modal-body, .toast-message")
    .filter({ hasText: BLOCKING_ERRORS });
  const text = (await alert.first().textContent({ timeout: 1_000 }).catch(() => null))?.trim();
  if (text) return text;
  const body = await page.locator("body").innerText().catch(() => "");
  const match = body.match(BLOCKING_ERRORS);
  return match ? match[0] : null;
}

export async function assertAuthenticated(page: Page): Promise<void> {
  await waitForStableUi(page);
  const loginHints = page.locator(
    "input[type='password'], input[name*='password' i], input[placeholder*='contrase' i], button:has-text('Ingresar'), button:has-text('Iniciar')",
  );
  const onLogin = (await loginHints.count()) > 0 && !(await page.getByText(/proyecto/i).count());
  if (onLogin) {
    throw new ZetaUiError(
      "Sesión no autenticada. Ejecuta `pnpm zeta:extract -- --login` e inicia sesión manualmente.",
      "LOGIN_REQUIRED",
    );
  }
}

export async function saveCheckpoint(page: Page, filePath: string): Promise<void> {
  await page.screenshot({ path: filePath, fullPage: true });
}

export async function clickFirstMatching(
  page: Page,
  patterns: RegExp[],
  options?: { exact?: boolean; timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  for (const pattern of patterns) {
    const button = page.getByRole("button", { name: pattern }).first();
    if ((await button.count()) > 0) {
      await button.click({ timeout: timeoutMs });
      await waitForStableUi(page);
      return;
    }
    const link = page.getByRole("link", { name: pattern }).first();
    if ((await link.count()) > 0) {
      await link.click({ timeout: timeoutMs });
      await waitForStableUi(page);
      return;
    }
    const text = page.getByText(pattern, { exact: options?.exact ?? false }).first();
    if ((await text.count()) > 0) {
      await text.click({ timeout: timeoutMs });
      await waitForStableUi(page);
      return;
    }
  }
  throw new ZetaUiError(
    `No se encontró control clickable para: ${patterns.map((item) => item.source).join(" | ")}`,
    "AUTOMATION_ERROR",
  );
}

async function openDropdownTrigger(page: Page, labelPattern: RegExp): Promise<Locator> {
  const label = page.getByText(labelPattern, { exact: false }).first();
  if ((await label.count()) > 0) {
    const container = label.locator("xpath=ancestor::*[self::label or self::div][1]");
    const combo = container.locator("[role='combobox'], .v-select, .v-input, select, input").first();
    if ((await combo.count()) > 0) {
      await combo.click();
      return combo;
    }
    await label.click();
    return label;
  }
  const comboByLabel = page.locator("[aria-label], label").filter({ hasText: labelPattern }).first();
  if ((await comboByLabel.count()) > 0) {
    await comboByLabel.click();
    return comboByLabel;
  }
  throw new ZetaUiError(`No se encontró dropdown para ${labelPattern.source}`, "AUTOMATION_ERROR");
}

export async function selectDropdownOption(page: Page, labelPattern: RegExp, optionText: string): Promise<void> {
  await openDropdownTrigger(page, labelPattern);
  await waitForStableUi(page);
  const optionPatterns = [
    page.getByRole("option", { name: optionText, exact: false }),
    page.locator(".v-list-item, .v-list-item-title, li, [role='listbox'] *").filter({ hasText: optionText }),
    page.getByText(optionText, { exact: false }),
  ];
  for (const locator of optionPatterns) {
    const target = locator.first();
    if ((await target.count()) > 0) {
      await target.click({ timeout: 10_000 });
      await waitForStableUi(page);
      return;
    }
  }
  throw new ZetaUiError(`Opción "${optionText}" no visible tras abrir ${labelPattern.source}`, "AUTOMATION_ERROR");
}

export async function selectExactLine(page: Page, line: string): Promise<void> {
  const linePatterns = [/l[ií]nea/i, /producto/i, /serie/i, /sistema/i];
  for (const pattern of linePatterns) {
    try {
      await selectDropdownOption(page, pattern, line);
      return;
    } catch {
      // try next label
    }
  }
  const searchable = page.locator("input[type='search'], input[type='text']").filter({
    has: page.locator("xpath=ancestor::*[contains(@class,'v-select') or contains(@class,'autocomplete')][1]"),
  });
  if ((await searchable.count()) > 0) {
    await searchable.first().fill(line);
    await page.getByText(line, { exact: true }).first().click({ timeout: 10_000 });
    await waitForStableUi(page);
    return;
  }
  throw new ZetaUiError(`No se pudo seleccionar la línea exacta "${line}"`, "AUTOMATION_ERROR");
}

export async function fillFieldNearLabel(page: Page, labelPattern: RegExp, value: string): Promise<void> {
  const label = page.getByText(labelPattern, { exact: false }).first();
  if ((await label.count()) === 0) {
    throw new ZetaUiError(`Campo no encontrado para ${labelPattern.source}`, "AUTOMATION_ERROR");
  }
  const input = label
    .locator("xpath=following::input[1]")
    .or(label.locator("xpath=ancestor::*[self::div or self::label][1]//input").first());
  if ((await input.count()) === 0) {
    throw new ZetaUiError(`Input no encontrado para ${labelPattern.source}`, "AUTOMATION_ERROR");
  }
  await input.first().click();
  await input.first().fill("");
  await input.first().fill(value);
  await input.first().press("Tab").catch(() => undefined);
  await waitForStableUi(page);
}

export async function selectLeaves(page: Page, leaves: number): Promise<void> {
  const token = `${leaves}H`;
  const patterns = [
    page.getByRole("button", { name: new RegExp(`^${token}$`, "i") }),
    page.getByText(new RegExp(`\\b${token}\\b`, "i")),
    page.getByLabel(new RegExp(`${leaves}\\s*hoj`, "i")),
  ];
  for (const locator of patterns) {
    if ((await locator.count()) > 0) {
      await locator.first().click({ timeout: 10_000 });
      await waitForStableUi(page);
      return;
    }
  }
  try {
    await selectDropdownOption(page, /hojas/i, token);
    return;
  } catch {
    await selectDropdownOption(page, /cantidad de hojas/i, token);
  }
}

export async function waitForConfigurationApplied(page: Page, expected: {
  line: string;
  leaves: number;
  widthMm: number;
  heightMm: number;
  glassCode: string;
}): Promise<void> {
  const body = page.locator("body");
  await body.getByText(new RegExp(expected.line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first().waitFor({
    timeout: 30_000,
  });
  await body.getByText(new RegExp(`${expected.leaves}\\s*H`, "i")).first().waitFor({ timeout: 30_000 });
  await body.getByText(new RegExp(String(expected.widthMm))).first().waitFor({ timeout: 30_000 });
  await body.getByText(new RegExp(String(expected.heightMm))).first().waitFor({ timeout: 30_000 });
  await body.getByText(new RegExp(expected.glassCode, "i")).first().waitFor({ timeout: 30_000 }).catch(() => undefined);
  await waitForStableUi(page);
  const blocking = await readBlockingError(page);
  if (blocking) {
    throw new ZetaUiError(blocking, "ZETA_UI_ERROR");
  }
}

export function extractProjectId(url: string): string | null {
  const match = url.match(/[?&]idProject=(\d+)/i) ?? url.match(/[?&]projectId=(\d+)/i);
  return match?.[1] ?? null;
}
