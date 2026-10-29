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
    paneId: "logical-qa-1:manual-pane-1",
    paneUnitIds: ["logical-qa-1:manual-pane-1:1"],
    commercialQuantity: 1,
    finishOrientationKey: "glass-501:monolitico:5:unknown",
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

  await page.reload();
  await expect(page.getByText("1 completas · 1 pendientes")).toBeVisible();
  await expect(page.getByText("600 × 1000 mm")).toBeVisible();
  await expect(page.getByText(/Corredera QA · 1 unidad física/)).toBeVisible();
  await expect(page.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toBeDisabled();
  expect(sourceReads).toBe(3);
  expect(simulatedSaves).toBe(1);
  expect(databaseRequests).toEqual([]);
});

test("muestra geometría recipe_trace parcial con exclusiones y bloquea proveedor", async ({ page }, testInfo) => {
  const completePane = {
    quoteItemId: "qa-item-1",
    paneId: "logical-qa-1:recipe-pane-1",
    paneUnitIds: ["logical-qa-1:recipe-pane-1:1"],
    commercialQuantity: 1,
    finishOrientationKey: "glass-501:monolitico:5:unknown",
    logicalComponentId: "logical-qa-1",
    glassId: "recipe-pane-1",
    productId: "glass-501",
    componentCode: "V1",
    componentName: "Corredera QA",
    displayName: "Float incoloro 5 mm",
    technicalSpec: {
      version: 1,
      productId: "glass-501",
      thicknessMm: 5,
      category: "monolitico",
      manualCutStatus: "pending_validation",
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
    dimensionProvenance: "recipe_trace",
    recipeStatus: "lista_para_validar",
    validationStatus: "requires_review",
    warnings: ["La receta no está validada por el taller."],
    snapshotFingerprint: "qa-recipe-trace-1",
  };
  const excludedPane = {
    ...completePane,
    paneId: "logical-qa-1:recipe-pane-2",
    paneUnitIds: [],
    glassId: "recipe-pane-2",
    displayName: "Float sin medidas",
    widthMm: null,
    heightMm: null,
    quantity: 0,
    physicalUnitCount: null,
    snapshotFingerprint: "qa-recipe-trace-2",
    warnings: ["Faltan dimensiones válidas del paño."],
  };
  const source = {
    quoteCode: "COT-QA-PREVIEW",
    diagnostics: [],
    preliminaryPaneCount: 1,
    previewExclusions: [{
      quoteItemId: "qa-item-1",
      paneId: excludedPane.paneId,
      componentCode: "V1",
      componentName: "Corredera QA",
      displayName: excludedPane.displayName,
      reason: "Faltan dimensiones rectangulares, enteras y positivas congeladas para este paño.",
    }],
    panes: [completePane, excludedPane],
    coverage: {
      status: "unavailable",
      completeReferenceCount: 0,
      pendingReferenceCount: 2,
      pendingReferences: [],
      diagnostics: [],
    },
  };
  const result = {
    status: "feasible",
    sheets: [{
      sheetId: "qa-sheet-1",
      rawSheet: { xMm: 0, yMm: 0, widthMm: 2500, heightMm: 1800 },
      panes: [{ paneUnitId: completePane.paneUnitIds[0], quoteItemId: "qa-item-1", logicalComponentId: "logical-qa-1", componentCode: "V1", rect: { xMm: 0, yMm: 0, widthMm: 600, heightMm: 1000 } }],
      remnants: [],
      areas: { panesMm2: 600000 },
    }],
    summary: { paneCount: 1 },
    verification: { passed: true },
    errors: [],
  };
  const databaseRequests: string[] = [];
  page.on("request", (request) => {
    if (/supabase|127\.0\.0\.1:55432|\/(auth|rest|storage)\/v1\//i.test(request.url())) databaseRequests.push(request.url());
  });
  await page.route("**/api/cotizaciones/qa-h1/optimizacion-vidrios", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: source });
      return;
    }
    await route.fulfill({ json: {
      quoteCode: "COT-QA-PREVIEW",
      mode: "geometric_preview",
      coverage: source.coverage,
      warnings: ["Incluye geometría preliminar de recipe_trace. No está validada por el taller."],
      preliminaryPaneCount: 1,
      previewExclusions: source.previewExclusions,
      results: [result],
      generatedFrom: source.panes.map((pane) => pane.snapshotFingerprint),
    } });
  });

  await page.goto("/e2e-glass-distribution");
  await expect(page.getByRole("heading", { name: "Distribución de planchas" })).toBeVisible();
  await expect(page.getByText(/geometría congelada de una receta preliminar/)).toBeVisible();
  await expect(page.getByText(/Referencias excluidas de la simulación/)).toBeVisible();
  await expect(page.getByText(/Faltan dimensiones rectangulares, enteras y positivas/)).toHaveCount(2);
  await expect(page.getByText(/La vista preliminar incluye 1 unidad física y excluye 1 referencia/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Ingresar medidas" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("recipe-trace-partial-panel.png"), fullPage: true });
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("1 unidad física · 0,60 m²")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("recipe-trace-partial-preview.png"), fullPage: true });
  expect(databaseRequests).toEqual([]);
});
