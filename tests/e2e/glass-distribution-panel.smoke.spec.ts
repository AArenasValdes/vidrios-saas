import { expect, test } from "@playwright/test";

const initialSource = {
  quoteCode: "COT-QA-H1",
  diagnostics: [],
  panes: [],
  coverage: {
    status: "partial",
    completeReferenceCount: 0,
    pendingReferenceCount: 2,
    pendingReferences: ["pane-1", "pane-2"].map((displayName) => ({
      quoteItemId: "qa-item-1",
      componentCode: "V1",
      componentName: "Corredera QA",
      displayName,
      reason: "Faltan dimensiones válidas del paño.",
    })),
    diagnostics: [],
  },
};

const updatedSource = {
  quoteCode: "COT-QA-H1",
  diagnostics: [],
  coverage: {
    status: "partial",
    completeReferenceCount: 1,
    pendingReferenceCount: 1,
    pendingReferences: [{
      quoteItemId: "qa-item-1",
      componentCode: "V1",
      componentName: "Corredera QA",
      displayName: "pane-2",
      reason: "Faltan dimensiones válidas del paño.",
    }],
    diagnostics: [],
  },
  panes: [{
    quoteItemId: "qa-item-1",
    logicalComponentId: "logical-qa-1",
    glassId: "manual-pane-1",
    productId: "glass-501",
    componentCode: "V1",
    componentName: "Corredera QA",
    displayName: "Float incoloro",
    technicalSpec: {
      version: 1,
      productId: "glass-501",
      thicknessMm: 5,
      category: "monolitico",
      manualCutStatus: "confirmed",
      technicalReviewConfirmed: false,
      sheetWidthMm: 2500,
      sheetHeightMm: 1800,
      pieceOrientation: "unknown",
      provenance: "catalog",
      sourceProductId: "glass-501",
      sourceValues: null,
      hasConflict: false,
    },
    widthMm: 600,
    heightMm: 1000,
    quantity: 1,
    physicalUnitCount: 1,
    dimensionProvenance: "manual",
    recipeStatus: null,
    validationStatus: "eligible_for_manual_planning",
    warnings: [],
    snapshotFingerprint: "qa-manual-pane-1",
  }],
};

test("actualiza la cobertura del panel tras guardar una medición simulada, sin recargar", async ({ page }) => {
  let saved = false;
  let sourceReads = 0;
  let simulatedSaves = 0;
  const databaseRequests: string[] = [];
  page.on("request", (request) => {
    if (/supabase|127\.0\.0\.1:55432|\/(auth|rest|storage)\/v1\//i.test(request.url())) {
      databaseRequests.push(request.url());
    }
  });

  await page.route("**/api/cotizaciones/qa-h1/optimizacion-vidrios", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 409, json: { error: "El smoke no debe calcular ni descargar." } });
      return;
    }
    sourceReads += 1;
    await route.fulfill({ json: saved ? updatedSource : initialSource });
  });
  await page.route("**/__e2e/glass-distribution-save", async (route) => {
    simulatedSaves += 1;
    saved = true;
    await route.fulfill({ status: 200, json: { ok: true } });
  });

  await page.goto("/e2e-glass-distribution");
  await expect(page.getByRole("heading", { name: "Smoke QA H1 · cotización simulada" })).toBeVisible();
  await expect(page.getByText("0 completas · 2 pendientes")).toBeVisible();
  await expect(page.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Ingresar medidas" }).click();
  await page.getByLabel("Posición del paño").selectOption("pane-1");
  await page.getByLabel("Producto del catálogo").selectOption("501");
  await page.getByLabel("Ancho final (mm)").fill("600");
  await page.getByLabel("Alto final (mm)").fill("1000");
  await page.getByRole("button", { name: "Agregar referencia de vidrio" }).click();
  await page.getByRole("button", { name: "Guardar medidas" }).click();

  await expect(page.getByText("Medidas guardadas. Cobertura actualizada.")).toBeVisible();
  await expect(page.getByText("1 completas · 1 pendientes")).toBeVisible();
  await expect(page.getByText("pane-2 · 1 paño pendiente")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toBeDisabled();
  expect(sourceReads).toBe(2);
  expect(simulatedSaves).toBe(1);
  expect(databaseRequests).toEqual([]);
});
