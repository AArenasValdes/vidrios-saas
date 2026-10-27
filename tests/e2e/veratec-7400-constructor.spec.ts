import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import {
  crearRecetaVeratec7400Corredera,
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  VERATEC_7400_SOURCE_REVISION,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const supabaseUrl = process.env.PLAYWRIGHT_VERATEC_SUPABASE_URL;
const serviceRoleKey = process.env.PLAYWRIGHT_VERATEC_SERVICE_ROLE_KEY;
const e2eBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const qaPrefix = process.env.PLAYWRIGHT_VERATEC_QA_PREFIX;

function isLoopbackUrl(value: string): boolean {
  try {
    return ["127.0.0.1", "localhost", "::1"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

const canRunAgainstIsolatedQa = Boolean(
  supabaseUrl && serviceRoleKey && qaPrefix?.startsWith("QA-Veratec-7400-") &&
    isLoopbackUrl(supabaseUrl) && isLoopbackUrl(e2eBaseUrl)
);
test.use({ viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false });

type QaFixture = {
  admin: SupabaseClient;
  organizationId: number;
  lineTemplateId: number;
  email: string;
  password: string;
};

let qa: QaFixture;

async function ensureConstructorWorkspace(page: Page) {
  await page.goto("/cotizaciones/nueva?nueva=1&modo=constructor");
  const workspace = page.getByRole("region", { name: "Constructor de componentes" });
  if (!(await workspace.isVisible().catch(() => false))) {
    const continueToBudget = page.getByRole("button", { name: /Continuar al presupuesto/i });
    if (await continueToBudget.isVisible().catch(() => false)) await continueToBudget.click();
    // On desktop "Usar ítems" is copy inside the card, not its accessible name.
    const useItems = page.getByRole("button", { name: /Cotizar por ítems/i });
    if (await useItems.isVisible().catch(() => false)) await useItems.click();
  }
  await expect(workspace).toBeVisible();
  return workspace;
}

async function addVeratecSlidingPiece(page: Page) {
  const workspace = page.getByRole("region", { name: "Constructor de componentes" });
  await workspace.getByRole("button", { name: "Corredera", exact: true }).click();
  await expect(workspace.getByRole("button", { name: /Elegir línea de V1|Cambiar línea de V1/i })).toBeVisible();
  const linePicker = workspace.getByRole("button", { name: /Elegir línea de V1|Cambiar línea de V1/i });
  await linePicker.click();
  await page.getByRole("option", { name: /Veratec 7400 QA/i }).click();
  await workspace.getByRole("textbox", { name: "Ancho" }).fill("1200");
  await workspace.getByRole("textbox", { name: "Alto" }).fill("1500");
  await workspace.getByRole("textbox", { name: "Cantidad" }).fill("1");
  await workspace.getByRole("textbox", { name: "Alto" }).press("Enter");
}

async function selectGlass(page: Page, thicknessMm: 4 | 5) {
  const workspace = page.getByRole("region", { name: "Constructor de componentes" });
  const glassSection = workspace.getByRole("button", { name: /^Vidrio y color/i });
  if ((await glassSection.getAttribute("aria-expanded")) !== "true") await glassSection.click();
  await workspace.getByRole("button", { name: "Elegir tipo de vidrio" }).click();
  await page.getByRole("option", { name: new RegExp(`monolítico ${thicknessMm} ?mm`, "i") }).click();
}

async function expectCommercialPrice(page: Page, expectedDigits: string) {
  const workspace = page.getByRole("region", { name: "Constructor de componentes" });
  const priceSection = workspace.getByRole("button", { name: /^Precio/i });
  if ((await priceSection.getAttribute("aria-expanded")) !== "true") await priceSection.click();
  const price = workspace.getByRole("textbox", { name: "Precio unitario" });
  await expect(price).toBeVisible();
  await expect.poll(async () => (await price.inputValue()).replace(/\D/g, "")).toBe(expectedDigits);
}

async function captureEvidence(page: Page, label: string) {
  const { mkdirSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const directory = resolve(process.cwd(), "output", "playwright");
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: resolve(directory, `veratec-7400-${label}.png`), fullPage: true });
}

test.describe("incidente Veratec 7400 Constructor", () => {
  test.skip(
    !canRunAgainstIsolatedQa,
    "Bloqueado: requiere PLAYWRIGHT_VERATEC_* apuntando a un Supabase loopback aislado y datos sintéticos. Nunca usa .env.local ni una base remota."
  );

  test.beforeAll(async () => {
    if (!supabaseUrl || !serviceRoleKey || !qaPrefix) return;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const email = `veratec-${runId}@example.test`;
    const password = `Qa-${crypto.randomUUID()}-7400!`;
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { qa_fixture: "veratec-7400-constructor" },
    });
    if (authError || !authUser.user) throw authError ?? new Error("No se creó usuario QA.");

    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .insert({ nombre: `${qaPrefix}${runId}`, correo: email, plan: "pro" })
      .select("id")
      .single();
    if (organizationError || !organization) throw organizationError ?? new Error("No se creó organización QA.");

    const { error: membershipError } = await admin.from("users").insert({
      correo: email,
      organization_id: organization.id,
      rol: "admin",
      auth_user_id: authUser.user.id,
      nombre: "QA Veratec",
      account_setup_status: "active",
    });
    if (membershipError) throw membershipError;

    const { data: lineTemplate, error: lineError } = await admin
      .from("cotizacion_line_templates")
      .insert({
        organization_id: organization.id,
        nombre: "Veratec 7400 QA · Corredera 2 hojas",
        categoria: "pvc",
        material: "PVC",
        catalog_key: VERATEC_7400_CATALOG_KEY,
        catalog_metadata: {},
        precio_m2_sugerido: 144000,
        minimo_cobrable: 0,
        redondeo_precio: 0,
        is_active: true,
      })
      .select("id")
      .single();
    if (lineError || !lineTemplate) throw lineError ?? new Error("No se creó línea sintética.");

    const definition = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: () => crypto.randomUUID(),
    });
    const { error: recipeError } = await admin.from("fabrication_recipes").insert({
      organization_id: organization.id,
      line_template_id: lineTemplate.id,
      scope: "organization",
      provider_name: "VERATEC",
      line_name: "Veratec 7400",
      typology: "corredera",
      leaves_count: 2,
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      status: "draft",
      definition,
      source_type: "manufacturer",
      source_reference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
      source_name: "QA: fixture documental local",
      source_revision: VERATEC_7400_SOURCE_REVISION,
    });
    if (recipeError) throw recipeError;

    qa = { admin, organizationId: organization.id, lineTemplateId: lineTemplate.id, email, password };
  });

  test("4 mm, geometría preliminar 5 mm, vuelta a 4 mm, persistencia y composición personalizada", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/login");
    await page.getByLabel("Correo").fill(qa.email);
    await page.getByLabel("Contrasena").fill(qa.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();
    await page.waitForURL(/\/dashboard(?:\?.*)?$/);

    const workspace = await ensureConstructorWorkspace(page);
    await addVeratecSlidingPiece(page);
    await selectGlass(page, 4);
    await expectCommercialPrice(page, "259200");
    await page.getByRole("button", { name: "Ver despiece" }).click();
    await expect(page.getByText(/6306/)).toBeVisible();
    await expect(page.getByText(/calculado/i)).toBeVisible();
    await captureEvidence(page, "01-4mm-precio-despiece");
    await page.getByRole("button", { name: "Volver", exact: true }).click();

    await selectGlass(page, 5);
    await expectCommercialPrice(page, "259200");
    await page.getByRole("button", { name: "Ver despiece" }).click();
    await expect(page.getByText(/geometría estructural preliminar/i)).toBeVisible();
    await expect(page.getByText(/vidrio.*junquillo.*precio.*pendiente/i)).toBeVisible();
    await expect(page.getByText(/6306/)).toHaveCount(0);
    await captureEvidence(page, "02-5mm-geometria-preliminar");
    await page.getByRole("button", { name: "Volver", exact: true }).click();

    await selectGlass(page, 4);
    await expectCommercialPrice(page, "259200");
    await page.getByRole("button", { name: "Ver despiece" }).click();
    await expect(page.getByText(/6306/)).toBeVisible();
    await page.getByRole("button", { name: "Volver", exact: true }).click();
    await workspace.getByRole("button", { name: /Revisar cotización|Revisar pendientes/i }).click();
    await expect(page.getByText("$259.200")).toBeVisible();
    await page.getByRole("button", { name: "Guardar borrador" }).click();

    const { data: quote, error: quoteError } = await qa.admin
      .from("cotizaciones")
      .select("id")
      .eq("organization_id", qa.organizationId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .single();
    expect(quoteError).toBeNull();
    expect(quote?.id).toBeTruthy();
    const quoteId = Number(quote?.id);
    const { data: savedItem, error: itemReadError } = await qa.admin
      .from("cotizacion_items")
      .select("cantidad, ancho, alto, precio_unitario, vidrio, fabricacion_snapshot, observaciones")
      .eq("cotizacion_id", quoteId)
      .eq("organization_id", qa.organizationId)
      .single();
    expect(itemReadError).toBeNull();
    expect(savedItem).toMatchObject({
      cantidad: 1,
      ancho: 1200,
      alto: 1500,
      precio_unitario: 259200,
      vidrio: expect.stringMatching(/monolítico 4 ?mm/i),
    });
    expect(savedItem?.fabricacion_snapshot).toMatchObject({
      glassSelection: { displayName: expect.stringMatching(/monolítico 4 ?mm/i) },
    });

    await page.goto(`/cotizaciones/nueva?edit=${quoteId}`);
    await expect(page.getByRole("region", { name: "Constructor de componentes" })).toBeVisible();
    await expectCommercialPrice(page, "259200");
    await captureEvidence(page, "03-reapertura-4mm");

    const customWorkspace = await ensureConstructorWorkspace(page);
    await customWorkspace.getByRole("button", { name: "Corredera", exact: true }).click();
    const customLineTrigger = customWorkspace.getByRole("button", { name: /Elegir línea de V1/i });
    await customLineTrigger.click();
    await page.getByRole("option", { name: /Veratec 7400 QA/i }).click();
    await customWorkspace.getByRole("textbox", { name: "Ancho" }).fill("1200");
    await customWorkspace.getByRole("textbox", { name: "Alto" }).fill("1500");
    await customWorkspace.getByRole("textbox", { name: "Cantidad" }).fill("1");
    await customWorkspace.getByRole("button", { name: /Abrir composición de V1/i }).click();
    const composition = page.getByRole("dialog", { name: "Armar composición" });
    await composition.getByRole("button", { name: /Partir al lado/i }).first().click();
    await composition.getByRole("button", { name: /Usar esta composición/i }).click();
    await customWorkspace.getByRole("button", { name: /Revisar cotización|Revisar pendientes/i }).click();
    await page.getByRole("button", { name: "Guardar borrador" }).click();

    const { data: customQuote, error: customQuoteError } = await qa.admin
      .from("cotizaciones")
      .select("id")
      .eq("organization_id", qa.organizationId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .single();
    expect(customQuoteError).toBeNull();
    const { data: customItem, error: customReadError } = await qa.admin
      .from("cotizacion_items")
      .select("observaciones")
      .eq("cotizacion_id", customQuote?.id)
      .eq("organization_id", qa.organizationId)
      .single();
    expect(customReadError).toBeNull();
    const customMeta = decodeCotizacionItemPresentationMeta(customItem?.observaciones);
    expect(customMeta.isCustomScheme).toBe(true);
    expect(customMeta.sheetScheme).toBe("Personalizado");
  });
});
