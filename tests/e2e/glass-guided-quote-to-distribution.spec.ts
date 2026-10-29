import { expect, test } from "@playwright/test";
import type { GlassCuttingProfile, GlassPanePlanningUnit } from "../../src/features/fabricacion/types/glass-sheet-optimizer-contracts";
import { optimizeGlassCuttingBatch } from "../../src/features/fabricacion/services/glass-sheet-optimizer.service";

type SavedMeasurement = { id: string; paneSlotId?: string; productId: string; widthMm: number; heightMm: number; quantity: number; quantityBasis?: string };
type Snapshot = { version: 2; entries: SavedMeasurement[]; manualPaneCount?: number; configurationFingerprint?: string | null; expectedPaneCount?: number | null };

const emptyCoverage = {
  status: "partial" as const,
  completeReferenceCount: 0,
  pendingReferenceCount: 2,
  pendingReferences: [1, 2].map((number) => ({
    quoteItemId: "qa-guided-item", paneId: `qa-pane-${number}`, componentCode: "V1", componentName: "Corredera QA x3",
    displayName: `Paño ${number}`, reason: "Faltan medidas finales del paño.",
  })),
  diagnostics: [],
};

function sourceFor(snapshot: Snapshot) {
  const entries = snapshot.entries;
  const panes = entries.flatMap((entry, entryIndex) => {
    const paneSlotId = entry.paneSlotId ?? `pane-${entryIndex + 1}`;
    const paneId = `qa-guided-item:${paneSlotId}`;
    const physicalUnitCount = entry.quantity * 3;
    return [{
      quoteItemId: "qa-guided-item",
      paneId,
      paneSlotId,
      paneUnitIds: Array.from({ length: physicalUnitCount }, (_, unit) => `${paneId}:unit-${unit + 1}`),
      commercialQuantity: 3,
      finishOrientationKey: "501:monolitico:5:fixed",
      logicalComponentId: "qa-guided-component",
      glassId: `manual:${paneSlotId}`,
      productId: "501",
      componentCode: "V1",
      componentName: "Corredera QA x3",
      displayName: "Float QA 5 mm",
      technicalSpec: {
        version: 1 as const,
        productId: "501",
        thicknessMm: 5,
        category: "monolitico" as const,
        manualCutStatus: "confirmed" as const,
        technicalReviewConfirmed: true,
        sheetWidthMm: 4000,
        sheetHeightMm: 2200,
        pieceOrientation: "fixed" as const,
        purchaseMode: "full_sheet" as const,
        provenance: "catalog" as const,
        sourceProductId: "501",
        sourceValues: null,
        hasConflict: false,
      },
      widthMm: entry.widthMm,
      heightMm: entry.heightMm,
      quantity: physicalUnitCount,
      physicalUnitCount,
      dimensionProvenance: "manual" as const,
      recipeStatus: "manual",
      validationStatus: "eligible_for_manual_planning" as const,
      warnings: [],
      snapshotFingerprint: `${entry.id}:${entry.widthMm}x${entry.heightMm}:${physicalUnitCount}`,
    }];
  });
  const savedSlots = new Set(entries.map((entry, index) => entry.paneSlotId ?? `pane-${index + 1}`));
  const pendingReferences = [1, 2].flatMap((number) => savedSlots.has(`pane-${number}`) ? [] : [{
    quoteItemId: "qa-guided-item", paneId: `qa-pane-${number}`, componentCode: "V1", componentName: "Corredera QA x3",
    displayName: `Paño ${number}`, reason: "Faltan medidas finales del paño.",
  }]);
  return {
    quoteCode: "COT-QA-GUIDED",
    panes,
    diagnostics: [],
    preliminaryPaneCount: panes.length,
    previewExclusions: [],
    coverage: {
      status: pendingReferences.length ? "partial" as const : "complete" as const,
      completeReferenceCount: panes.length,
      pendingReferenceCount: pendingReferences.length,
      pendingReferences,
      diagnostics: [],
    },
  };
}

test("Guiada simulada guarda, reabre y distribuye medidas finales sin duplicar unidades físicas", async ({ page }, testInfo) => {
  let savedSnapshot: Snapshot = { version: 2, entries: [] };
  const databaseRequests: string[] = [];
  page.on("request", (request) => {
    if (/supabase|\/rest\/v1\/|\/auth\/v1\/|\/storage\/v1\//i.test(request.url())) databaseRequests.push(request.url());
  });

  await page.route("**/api/cotizaciones/qa-guided/optimizacion-vidrios", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: sourceFor(savedSnapshot) });
      return;
    }
    const input = route.request().postDataJSON() as { mode?: string };
    expect(input.mode).toBe("geometric_preview");
    const source = sourceFor(savedSnapshot);
    const panes = source.panes.map((pane) => ({
      organizationId: "qa-org",
      quoteId: "qa-guided",
      quoteCode: source.quoteCode,
      quoteItemId: pane.quoteItemId,
      logicalComponentId: pane.logicalComponentId,
      glassId: pane.glassId,
      paneId: pane.paneId,
      paneUnitIds: pane.paneUnitIds,
      productId: pane.productId,
      technicalSpec: pane.technicalSpec,
      widthMm: pane.widthMm,
      heightMm: pane.heightMm,
      quantity: pane.quantity,
      commercialQuantity: pane.commercialQuantity,
      dimensionProvenance: pane.dimensionProvenance,
      recipeStatus: pane.recipeStatus,
      validationStatus: pane.validationStatus,
      warnings: pane.warnings,
      snapshotFingerprint: pane.snapshotFingerprint,
      componentCode: pane.componentCode,
      finishOrientationKey: pane.finishOrientationKey,
      orientation: "fixed" as const,
    } satisfies GlassPanePlanningUnit));
    const profile: GlassCuttingProfile = {
      profileId: "qa-profile",
      productId: "501",
      thicknessMm: 5,
      category: "monolitico",
      finishOrientationKey: "501:monolitico:5:fixed",
      sheet: { widthMm: 4000, heightMm: 2200, orientation: "fixed", source: "catalog", sourceReference: null },
      process: {
        tableWidthMm: 4000,
        tableHeightMm: 2200,
        supportedCategories: ["monolitico"],
        supportedThicknessesMm: [5],
        edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 },
        kerfOrSeparationMm: 0,
        minimumStripWidthMm: 0,
        reusableRemnant: { minimumWidthMm: 1, minimumHeightMm: 1, orientation: "fixed" },
        supportedOperations: [],
        sequence: [],
        workshopValidation: "unvalidated",
        sourceReference: null,
      },
      purchaseCost: null,
    };
    const results = optimizeGlassCuttingBatch({ panes, profiles: [profile], mode: "geometric_preview" });
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("feasible");
    expect(results[0]?.verification.passed).toBe(true);
    expect(results[0]?.sheets.flatMap((sheet) => sheet.panes)).toHaveLength(6);
    for (const sheet of results[0]!.sheets) for (const plannedPane of sheet.panes) {
      expect(plannedPane.rect.xMm + plannedPane.rect.widthMm).toBeLessThanOrEqual(sheet.rawSheet.widthMm);
      expect(plannedPane.rect.yMm + plannedPane.rect.heightMm).toBeLessThanOrEqual(sheet.rawSheet.heightMm);
    }
    await route.fulfill({ json: {
      quoteCode: "COT-QA-GUIDED",
      mode: "geometric_preview",
      coverage: source.coverage,
      warnings: ["Simulación E2E controlada; el cálculo fue respondido por el test."],
      results,
      generatedFrom: source.panes.map((pane) => pane.snapshotFingerprint),
      preliminaryPaneCount: source.panes.length,
      previewExclusions: [],
    } });
  });
  await page.route("**/__e2e/glass-guided-save", async (route) => {
    const body = route.request().postDataJSON() as { value: Snapshot };
    savedSnapshot = body.value;
    await route.fulfill({ status: 200, json: { ok: true } });
  });

  await page.goto("/e2e-glass-guided");
  await expect(page.getByRole("heading", { name: /QA local simulado/ })).toBeVisible();
  await expect(page.getByText("Cobertura operativa: 0 completas · 2 pendientes")).toBeVisible();

  await page.getByRole("button", { name: "Ingresar medidas" }).click();
  await page.getByLabel("Posición del paño").selectOption("pane-1");
  await page.getByLabel("Producto del catálogo").selectOption("501");
  await page.getByLabel("Ancho final (mm)").fill("600");
  await page.getByLabel("Alto final (mm)").fill("1000");
  await page.getByRole("button", { name: "Agregar referencia de vidrio" }).click();
  await page.getByRole("button", { name: "Guardar medidas" }).click();

  await expect(page.getByText("Medidas guardadas. Cobertura actualizada.")).toBeVisible();
  await expect(page.getByText("Cobertura operativa: 1 completas · 1 pendientes")).toBeVisible();
  await expect(page.getByRole("button", { name: /PDF bloqueado · cobertura incompleta/ })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("guided-glass-partial-coverage.png"), fullPage: true });

  await page.reload();
  await expect(page.getByText("Cobertura operativa: 1 completas · 1 pendientes")).toBeVisible();
  await expect(page.getByText("600 × 1000 mm")).toBeVisible();
  await page.getByRole("button", { name: "Ingresar medidas" }).click();
  await page.getByLabel("Posición del paño").selectOption("pane-2");
  await page.getByLabel("Producto del catálogo").selectOption("501");
  await page.getByLabel("Ancho final (mm)").fill("700");
  await page.getByLabel("Alto final (mm)").fill("1000");
  await page.getByRole("button", { name: "Agregar referencia de vidrio" }).click();
  await page.getByRole("button", { name: "Guardar medidas" }).click();

  await expect(page.getByText("Cobertura operativa: 2 completas · 0 pendientes")).toBeVisible();
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("6 unidades físicas · 3,90 m²")).toBeVisible();
  await expect(page.getByRole("button", { name: "PDF simulación · NO APTO PARA CORTE" })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("guided-glass-distribution-preview.png"), fullPage: true });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: /PDF simulación · NO APTO PARA CORTE/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/simulacion-vidrios-no-apto-corte/);
  expect(savedSnapshot.entries).toHaveLength(2);
  expect(savedSnapshot.entries.map((entry) => entry.paneSlotId)).toEqual(["pane-1", "pane-2"]);
  expect(sourceFor(savedSnapshot).panes.reduce((sum, pane) => sum + pane.physicalUnitCount!, 0)).toBe(6);
  expect(new Set(sourceFor(savedSnapshot).panes.flatMap((pane) => pane.paneUnitIds)).size).toBe(6);
  expect(databaseRequests).toEqual([]);
});
