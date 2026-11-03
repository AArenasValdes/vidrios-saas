import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { GlassCuttingProfile, GlassPanePlanningUnit, GlassSheetPlan } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import { optimizeGlassCuttingBatch } from "@/features/fabricacion/services/glass-sheet-optimizer.service";
import {
  calculateGlassDistributionPlanSize,
  createGlassDistributionPdf,
  GLASS_DISTRIBUTION_MAX_PLAN_HEIGHT_MM,
  GLASS_DISTRIBUTION_USABLE_PAGE_HEIGHT_MM,
  validateGlassDistributionPdfInput,
} from "../glass-distribution-pdf.service";

const profile: GlassCuttingProfile = {
  profileId: "qa-profile",
  productId: "qa-glass-5mm",
  thicknessMm: 5,
  category: "monolitico",
  finishOrientationKey: "incoloro",
  sheet: { widthMm: 2500, heightMm: 1800, orientation: "fixed", source: "catalog", sourceReference: "ficha QA" },
  process: {
    tableWidthMm: 2500,
    tableHeightMm: 1800,
    supportedCategories: ["monolitico"],
    supportedThicknessesMm: [5],
    edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 },
    kerfOrSeparationMm: 5,
    minimumStripWidthMm: 1,
    reusableRemnant: { minimumWidthMm: 400, minimumHeightMm: 400, orientation: "fixed" },
    supportedOperations: ["straight_cut", "quiebre"],
    sequence: [],
    workshopValidation: "validated",
    sourceReference: "proceso QA validado",
  },
  purchaseCost: null,
};

function pane(id: string): GlassPanePlanningUnit {
  return {
    organizationId: "qa-org",
    quoteId: "qa-quote",
    quoteCode: "COT-QA-001",
    quoteItemId: "item-qa",
    logicalComponentId: "logical-v1",
    glassId: "glass-qa",
    paneId: `pane-${id}`,
    paneUnitIds: [`unit-${id}`],
    componentCode: "V1",
    productId: "qa-glass-5mm",
    finishOrientationKey: "incoloro",
    orientation: "fixed",
    technicalSpec: {
      version: 1,
      productId: "qa-glass-5mm",
      thicknessMm: 5,
      category: "monolitico",
      manualCutStatus: "confirmed",
      technicalReviewConfirmed: true,
      purchaseMode: "full_sheet",
      sheetWidthMm: 2500,
      sheetHeightMm: 1800,
      pieceOrientation: "fixed",
      provenance: "catalog",
      sourceProductId: "qa-glass-5mm",
      sourceValues: null,
      hasConflict: false,
    },
    widthMm: 750,
    heightMm: 1600,
    quantity: 1,
    commercialQuantity: 1,
    dimensionProvenance: "validated_recipe",
    recipeStatus: "validated",
    validationStatus: "eligible_for_manual_planning",
    warnings: [],
    snapshotFingerprint: `snapshot-${id}`,
  };
}

function pdfText(pdf: Awaited<ReturnType<typeof createGlassDistributionPdf>>) {
  const source = Buffer.from(pdf.output("arraybuffer")).toString("latin1");
  return [...source.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((match) => match[1]!.replace(/\\([\\()])/g, "$1")).join(" ");
}

function formatPdfNumber(value: number) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
}

function formatPdfArea(areaMm2: number) {
  return new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(areaMm2 / 1_000_000);
}

function expectSheetAreaConservation(sheet: GlassSheetPlan) {
  const rawMm2 = sheet.rawSheet.widthMm * sheet.rawSheet.heightMm;
  const panesMm2 = sheet.panes.reduce((sum, pane) => sum + pane.rect.widthMm * pane.rect.heightMm, 0);
  const zonesMm2 = sheet.remnants.reduce((sum, remnant) => {
    const rectAreaMm2 = remnant.rect.widthMm * remnant.rect.heightMm;
    expect(remnant.areaMm2).toBe(rectAreaMm2);
    return sum + rectAreaMm2;
  }, 0);
  const trimMm2 = rawMm2 - sheet.usableSheet.widthMm * sheet.usableSheet.heightMm;
  const separationFromCutsMm2 = sheet.cutSequence.reduce((sum, cut) => sum + cut.separationMm * (cut.toMm - cut.fromMm), 0);
  expect(sheet.areas.panesMm2).toBe(panesMm2);
  expect(sheet.areas.edgeTrimMm2).toBe(trimMm2);
  expect(sheet.areas.separationLossMm2).toBe(separationFromCutsMm2);
  const unclassifiedMm2 = rawMm2 - panesMm2 - zonesMm2 - trimMm2 - separationFromCutsMm2;
  expect(unclassifiedMm2).toBeGreaterThanOrEqual(0);
  expect(rawMm2).toBe(panesMm2 + zonesMm2 + trimMm2 + separationFromCutsMm2 + unclassifiedMm2);
  return { rawMm2, panesMm2, zonesMm2, trimMm2, separationMm2: separationFromCutsMm2, unclassifiedMm2 };
}

function pdfExampleDirectory() {
  return process.env.VENTORA_PDF_OUTPUT_DIR || path.join(process.cwd(), "tmp", "pdfs");
}

async function officialLogoDataUrl() {
  const svg = readFileSync(path.join(process.cwd(), "public", "brand", "ventora-logo-compact-on-light.svg"));
  const png = await sharp(svg, { density: 300 }).resize({ width: 1000, height: 212, fit: "contain" }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

const completeCoverage = {
  status: "complete" as const,
  completeReferenceCount: 1,
  pendingReferenceCount: 0,
  pendingReferences: [],
  diagnostics: [],
};

describe("createGlassDistributionPdf", () => {
  it("keeps the drawing within 40% of useful page height while scaling to sheet proportions", () => {
    const landscapeSheet = calculateGlassDistributionPlanSize(2500, 1800);
    const tallSheet = calculateGlassDistributionPlanSize(1200, 3000);

    expect(GLASS_DISTRIBUTION_MAX_PLAN_HEIGHT_MM / GLASS_DISTRIBUTION_USABLE_PAGE_HEIGHT_MM).toBeLessThanOrEqual(0.4);
    expect(landscapeSheet.heightMm).toBeLessThanOrEqual(GLASS_DISTRIBUTION_MAX_PLAN_HEIGHT_MM);
    expect(tallSheet.heightMm).toBeLessThanOrEqual(GLASS_DISTRIBUTION_MAX_PLAN_HEIGHT_MM);
    expect(landscapeSheet.widthMm / landscapeSheet.heightMm).toBeCloseTo(2500 / 1800);
    expect(tallSheet.widthMm / tallSheet.heightMm).toBeCloseTo(1200 / 3000);
  });

  it("exports the same verified two-pane plan with a consistent summary and plan on one A4 page", async () => {
    const results = optimizeGlassCuttingBatch({ panes: [pane("1"), pane("2")], profiles: [profile], mode: "workshop" });
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("feasible");
    expect(results[0]?.productionReadiness).toBe("workshop_validated");
    expect(results[0]?.verification.passed).toBe(true);
    expect(results[0]?.summary.sheetCount).toBe(1);

    const pdf = await createGlassDistributionPdf({
      quoteCode: "COT-QA-001",
      clientName: "Cliente de prueba",
      workName: "Trabajo QA",
      logoDataUrl: await officialLogoDataUrl(),
      coverage: completeCoverage,
      panes: [pane("1"), pane("2")].map((item) => ({ quoteItemId: item.quoteItemId, paneId: item.paneId, paneUnitIds: item.paneUnitIds, componentCode: "V1", componentName: "Ventana corredera", productId: item.productId, displayName: "Float incoloro QA 5mmm", thicknessMm: 5, category: "monolitico", widthMm: item.widthMm, heightMm: item.heightMm, quantity: 1, physicalUnitCount: 1 })),
      results,
    });
    const text = pdfText(pdf);

    expect(pdf.getNumberOfPages()).toBe(1);
    expect(text).toContain("COT-QA-001");
    expect(text).toContain("Float incoloro");
    expect(text).not.toContain("5mmm");
    expect(text).toContain("5 mm");
    expect(text).toContain("2.500 × 1.800 mm");
    expect(text).toContain("750 × 1.600 mm");
    expect(text).toContain("Planchas necesarias: 1 · Tipos de paño: 1 · Unidades físicas: 2");
    expect(text).toContain("Cobertura técnica completa: 1 de 1 referencias · 2 unidades físicas verificadas");
    expect(text).toContain("V1 · Ventana corredera");
    expect(text).toContain("Sobrantes:");
    expect(text).toContain("3 sobrantes geométricos");
    expect(text).toContain("Despuntes y separación asumidos: 0 mm · plancha sin giro.");
    expect(text).toContain("Confirmar medidas y tolerancias con el proveedor antes de cortar.");
    expect(text).toContain("Documento de fabricación");
    expect(text).toContain("Emisión");
    expect(text).toContain("VENTORA · FABRICACIÓN · COT-QA-001");
    expect(text).not.toContain("unit-1");
    expect(text).not.toContain("logical-v1");
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("Do"))).toBe(true);
    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-distribucion-1-plancha.pdf"), Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("genera la simulación QA 1290 compacta en una página y distingue referencias, unidades y superficies", async () => {
    const qaProfile: GlassCuttingProfile = {
      ...profile,
      productId: "3763",
      sheet: { ...profile.sheet, widthMm: 4000, heightMm: 2200, orientation: "fixed", sourceReference: "Formato QA 4000 × 2200 mm" },
      process: { ...profile.process, tableWidthMm: 4000, tableHeightMm: 2200, kerfOrSeparationMm: 0, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 } },
    };
    const panes: GlassPanePlanningUnit[] = ["F1", "F2"].map((code) => ({
      ...pane(code),
      quoteItemId: code === "F1" ? "4078" : "4079",
      logicalComponentId: `${code}-logical-component`,
      glassId: `${code}-glass`,
      paneId: `${code}-pane-1`,
      paneUnitIds: [`${code}-unit-1`],
      componentCode: code,
      componentName: "Paño fijo",
      productId: "3763",
      widthMm: 600,
      heightMm: 1000,
      quantity: 1,
      commercialQuantity: 1,
      technicalSpec: {
        ...pane(code).technicalSpec,
        productId: "3763",
        thicknessMm: 5,
        category: "monolitico",
        sheetWidthMm: 4000,
        sheetHeightMm: 2200,
      },
      dimensionProvenance: "manual",
      recipeStatus: "manual",
    }));
    const results = optimizeGlassCuttingBatch({ panes, profiles: [qaProfile], mode: "geometric_preview" });
    expect(results).toHaveLength(1);
    expect(results[0]?.sheets).toHaveLength(1);
    expect(results[0]?.calculationMode).toBe("geometric_preview");
    expect(results[0]?.verification.passed).toBe(true);

    const pdf = await createGlassDistributionPdf({
      mode: "simulation",
      quoteCode: "COT-301026-002",
      clientName: "Cliente QA",
      workName: "F1 + F2 · Paño fijo",
      generatedAt: "2026-11-02T12:00:00-03:00",
      quoteCreatedAt: "2026-10-30T09:00:00-03:00",
      logoDataUrl: await officialLogoDataUrl(),
      coverage: { ...completeCoverage, completeReferenceCount: 2 },
      panes: panes.map((item) => ({
        quoteItemId: item.quoteItemId,
        paneId: item.paneId,
        paneUnitIds: item.paneUnitIds,
        paneSlotId: "pane-1",
        componentCode: item.componentCode,
        componentName: item.componentName,
        productId: item.productId,
        displayName: "Monolítico incoloro",
        thicknessMm: 5,
        category: "monolitico",
        widthMm: 600,
        heightMm: 1000,
        quantity: 1,
        physicalUnitCount: 1,
        dimensionProvenance: "manual",
      })),
      results,
      simulationWarnings: ["Despuntes y separación asumidos: 0 mm.", "Sobrantes geométricos; no representan retazos físicamente reutilizables."],
    });
    const text = pdfText(pdf);
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pdf.internal.pages[1]?.join(" ")).toContain("Plancha 1");
    expect(pdf.internal.pages[1]?.join(" ")).toContain("600 × 1.000 mm");
    expect(text).toContain("PRELIMINAR");
    expect(text).toContain("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE");
    expect(text).toContain("Separación usada 0 mm");
    expect(text).toContain("Sin secuencia de corte");
    expect(text).toContain("zonas libres no necesariamente reutilizables");
    expect(text).toContain("COT-301026-002");
    expect(text).toContain("02 nov 2026");
    expect(text).toContain("Cotización creada: 30 oct 2026 · PDF generado: 02 nov 2026");
    expect(text).toContain("2 de 2");
    expect(text).toContain("0 referencias excluidas de 2");
    expect(text).toContain("Unidades físicas");
    expect(text).toContain("4.000 × 2.200 mm");
    expect(text).toContain("1,20 m²");
    expect(text).toContain("13,6 %");
    expect(text).toContain("7,60 m²");
    expect(text).toContain("Restante geométrico estimado 7,60 m²");
    expect(text).toContain("F1 · 1");
    expect(text).toContain("F2 · 1");
    expect(text).toContain("600 × 1.000 mm");
    expect(text).toContain("Medida manual final");
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE"))).toBe(true);
    expect(text).toContain("Sobrante geométrico estimado");
    expect(text).not.toContain("Supuestos y exclusiones");
    expect(text).not.toContain("Documento de fabricación");
    if (process.env.VENTORA_PDF_QA1290 === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-1290-simulacion-planchas.pdf"), Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("muestra las dimensiones y áreas de las zonas libres a partir de los rectángulos verificados", async () => {
    const planningPane = { ...pane("remnant-large"), widthMm: 600, heightMm: 1000 };
    const results = optimizeGlassCuttingBatch({ panes: [planningPane], profiles: [profile], mode: "geometric_preview" });
    const sheet = results[0]?.sheets[0];
    expect(sheet).toBeDefined();
    expect(sheet?.remnants.length).toBeGreaterThan(0);

    const ordered = [...(sheet?.remnants ?? [])].sort((left, right) =>
      right.areaMm2 - left.areaMm2
      || left.rect.yMm - right.rect.yMm
      || left.rect.xMm - right.rect.xMm
      || left.remnantId.localeCompare(right.remnantId)
    );
    const pdf = await createGlassDistributionPdf({
      mode: "simulation",
      quoteCode: "COT-QA-ZONAS",
      clientName: "Cliente QA",
      workName: "Zonas geométricas",
      coverage: completeCoverage,
      panes: [{ quoteItemId: planningPane.quoteItemId, paneId: planningPane.paneId, paneUnitIds: planningPane.paneUnitIds, componentCode: "V1", productId: planningPane.productId, displayName: "Float QA", thicknessMm: 5, category: "monolitico", widthMm: planningPane.widthMm, heightMm: planningPane.heightMm, quantity: 1, physicalUnitCount: 1 }],
      results,
    });
    const text = pdfText(pdf);

    expect(text).toContain("Zonas geométricas libres");
    expect(text).toContain("Restante geométrico estimado");
    ordered.slice(0, 3).forEach((remnant, index) => {
      const row = `Zona ${index + 1} · ${formatPdfNumber(remnant.rect.widthMm)} × ${formatPdfNumber(remnant.rect.heightMm)} mm · ${formatPdfArea(remnant.areaMm2)} m²`;
      expect(text).toContain(row);
      expect(text).toContain(`Zona ${index + 1}`);
    });
    expect(text).toContain(`Superficie total de zonas libres: ${formatPdfArea(ordered.reduce((sum, remnant) => sum + remnant.areaMm2, 0))} m²`);
    expect(text).toContain("m² restantes estimados");
    expect(text).toContain("no necesariamente reutilizable");
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE"))).toBe(true);
  });

  it("muestra cero zonas cuando la plancha está ocupada y resume las restantes cuando hay más de tres", async () => {
    const fullProfile: GlassCuttingProfile = {
      ...profile,
      process: { ...profile.process, kerfOrSeparationMm: 0 },
    };
    const fullPane = { ...pane("full-sheet"), widthMm: 2500, heightMm: 1800 };
    const fullResults = optimizeGlassCuttingBatch({ panes: [fullPane], profiles: [fullProfile], mode: "geometric_preview" });
    expect(fullResults[0]?.sheets[0]?.remnants).toHaveLength(0);
    const fullPdf = await createGlassDistributionPdf({
      mode: "simulation", quoteCode: "COT-QA-LLENA", clientName: "QA", workName: "Plancha ocupada",
      coverage: completeCoverage,
      panes: [{ quoteItemId: fullPane.quoteItemId, paneId: fullPane.paneId, paneUnitIds: fullPane.paneUnitIds, componentCode: "V1", productId: fullPane.productId, displayName: "Float QA", thicknessMm: 5, category: "monolitico", widthMm: 2500, heightMm: 1800, quantity: 1, physicalUnitCount: 1 }],
      results: fullResults,
    });
    expect(pdfText(fullPdf)).toContain("No hay zonas geométricas libres registradas.");

    const manyDimensions = [[600, 700], [900, 900], [400, 800], [500, 600], [700, 500], [400, 400]] as const;
    const manyPanes = manyDimensions.map(([widthMm, heightMm], index) => ({ ...pane(`many-${index}`), paneId: `pane-many-${index}`, paneUnitIds: [`unit-many-${index}`], widthMm, heightMm }));
    const manyResults = optimizeGlassCuttingBatch({ panes: manyPanes, profiles: [fullProfile], mode: "geometric_preview" });
    const manyRemnants = manyResults.flatMap((result) => result.sheets.flatMap((sheet) => sheet.remnants));
    expect(manyRemnants.length).toBeGreaterThan(3);
    const manyPdf = await createGlassDistributionPdf({
      mode: "simulation", quoteCode: "COT-QA-MUCHAS-ZONAS", clientName: "QA", workName: "Varias zonas",
      coverage: completeCoverage,
      panes: manyPanes.map((item, index) => ({ quoteItemId: item.quoteItemId, paneId: item.paneId, paneUnitIds: item.paneUnitIds, componentCode: `V${index + 1}`, productId: item.productId, displayName: "Float QA", thicknessMm: 5, category: "monolitico", widthMm: item.widthMm, heightMm: item.heightMm, quantity: 1, physicalUnitCount: 1 })),
      results: manyResults,
    });
    const manyText = pdfText(manyPdf);
    expect(manyText).toMatch(/\d+ zonas restantes · [\d,.]+ m² en conjunto/);
    expect(manyText).toContain("Superficie total de zonas libres:");
  });

  it("conserva el área exacta en una y varias planchas con paños de distintos tamaños", async () => {
    const onePane = { ...pane("ledger-one"), widthMm: 600, heightMm: 1000 };
    const onePlan = optimizeGlassCuttingBatch({ panes: [onePane], profiles: [profile], mode: "geometric_preview" });
    expect(onePlan[0]?.status).toBe("feasible");
    expect(onePlan.flatMap((result) => result.sheets).map(expectSheetAreaConservation)).toHaveLength(1);

    const trimmedProfile: GlassCuttingProfile = {
      ...profile,
      process: {
        ...profile.process,
        edgeTrimMm: { top: 10, right: 20, bottom: 30, left: 40 },
        kerfOrSeparationMm: 7,
      },
    };
    const panes = [
      { ...pane("ledger-a"), widthMm: 750, heightMm: 1600 },
      { ...pane("ledger-b"), paneId: "pane-ledger-b", paneUnitIds: ["unit-ledger-b"], widthMm: 750, heightMm: 1600 },
      { ...pane("ledger-c"), paneId: "pane-ledger-c", paneUnitIds: ["unit-ledger-c"], widthMm: 700, heightMm: 900 },
      { ...pane("ledger-d"), paneId: "pane-ledger-d", paneUnitIds: ["unit-ledger-d"], widthMm: 620, heightMm: 1100 },
    ];
    const plan = optimizeGlassCuttingBatch({ panes, profiles: [trimmedProfile], mode: "geometric_preview" });
    const sheets = plan.flatMap((result) => result.sheets);
    expect(sheets.length).toBeGreaterThan(1);
    sheets.forEach(expectSheetAreaConservation);
    const pdf = await createGlassDistributionPdf({
      mode: "simulation",
      quoteCode: "COT-QA-AREA-LEDGER",
      clientName: "QA",
      workName: "Conservación de áreas",
      coverage: { ...completeCoverage, completeReferenceCount: panes.length },
      panes: panes.map((item, index) => ({
        quoteItemId: item.quoteItemId,
        paneId: item.paneId,
        paneUnitIds: item.paneUnitIds,
        componentCode: `V${index + 1}`,
        productId: item.productId,
        displayName: "Float QA",
        thicknessMm: 5,
        category: "monolitico",
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        quantity: 1,
        physicalUnitCount: 1,
      })),
      results: plan,
    });
    const pdfTextContent = pdfText(pdf);
    expect(pdfTextContent).toContain("Separación usada 7 mm");
    expect(pdfTextContent).toContain("despuntes sup/der/inf/izq 10/20/30/40 mm");
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("Separación usada 7 mm"))).toBe(true);
  });

  it("conserva posición original del paño en etiquetas de packing y tabla", async () => {
    const sourceSlots = [
      { slot: "pane-1", widthMm: 600, heightMm: 1000 },
      { slot: "pane-2", widthMm: 600, heightMm: 1000 },
      { slot: "pane-3", widthMm: 600, heightMm: 1100 },
      { slot: "pane-4", widthMm: 600, heightMm: 1100 },
    ];
    const panes = sourceSlots.map(({ slot, widthMm, heightMm }) => ({
      ...pane(slot),
      paneId: `pane-id-${slot}`,
      paneSlotId: slot,
      paneUnitIds: [`unit-${slot}`],
      widthMm,
      heightMm,
      technicalSpec: {
        ...pane(slot).technicalSpec,
        sheetWidthMm: 4000,
        sheetHeightMm: 2200,
      },
    }));
    const secondComponent = {
      ...pane("v2"),
      quoteItemId: "item-v2",
      logicalComponentId: "logical-v2",
      glassId: "glass-v2",
      paneId: "pane-id-v2",
      paneSlotId: "pane-1",
      paneUnitIds: ["unit-v2-1", "unit-v2-2"],
      componentCode: "V2",
      widthMm: 900,
      heightMm: 1000,
      quantity: 2,
      commercialQuantity: 1,
      technicalSpec: { ...pane("v2").technicalSpec, sheetWidthMm: 4000, sheetHeightMm: 2200 },
    };
    const planningPanes = [...panes, secondComponent];

    const sourcePanes = sourceSlots.map(({ slot, widthMm, heightMm }) => ({
      quoteItemId: "item-qa",
      paneId: `pane-id-${slot}`,
      paneSlotId: slot,
      paneUnitIds: [`unit-${slot}`],
      componentCode: "V1",
      componentName: "Corredera 4 hojas",
      productId: "qa-glass-5mm",
      displayName: "Float QA",
      thicknessMm: 5,
      category: "monolitico",
      widthMm,
      heightMm,
      quantity: 1,
      physicalUnitCount: 1,
      dimensionProvenance: "manual",
    })).concat([{
      quoteItemId: "item-v2",
      paneId: "pane-id-v2",
      paneSlotId: "pane-1",
      paneUnitIds: ["unit-v2-1", "unit-v2-2"],
      componentCode: "V2",
      componentName: "Paño fijo",
      productId: "qa-glass-5mm",
      displayName: "Float QA",
      thicknessMm: 5,
      category: "monolitico",
      widthMm: 900,
      heightMm: 1000,
      quantity: 2,
      physicalUnitCount: 2,
      dimensionProvenance: "manual",
    }]);

    const combinedResults = optimizeGlassCuttingBatch({ panes: planningPanes, profiles: [{
      ...profile,
      sheet: { ...profile.sheet, widthMm: 4000, heightMm: 2200 },
      process: {
        ...profile.process,
        tableWidthMm: 4000,
        tableHeightMm: 2200,
        edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 },
        kerfOrSeparationMm: 0,
        minimumStripWidthMm: 0,
      },
    }], mode: "geometric_preview" });
    expect(combinedResults[0]?.summary.paneCount).toBe(6);
    expect(combinedResults[0]?.sheets[0]?.panes.find((planned) => planned.paneUnitId === "unit-pane-1")?.paneSlotId).toBe("pane-1");
    const conserved = expectSheetAreaConservation(combinedResults[0]!.sheets[0]!);
    expect(conserved).toEqual({ rawMm2: 8_800_000, panesMm2: 4_320_000, zonesMm2: 4_480_000, trimMm2: 0, separationMm2: 0, unclassifiedMm2: 0 });
    expect(combinedResults[0]!.sheets[0]!.remnants
      .map(({ rect }) => `${rect.widthMm}×${rect.heightMm}`)
      .sort((left, right) => {
        const [leftWidth, leftHeight] = left.split("×").map(Number);
        const [rightWidth, rightHeight] = right.split("×").map(Number);
        return rightWidth! * rightHeight! - leftWidth! * leftHeight!;
      }))
      .toEqual(["1900×1200", "900×1200", "1000×1000", "600×200"]);
    const fiveMmResults = optimizeGlassCuttingBatch({
      panes: planningPanes,
      profiles: [{
        ...profile,
        sheet: { ...profile.sheet, widthMm: 4000, heightMm: 2200 },
        process: { ...profile.process, tableWidthMm: 4000, tableHeightMm: 2200 },
      }],
      mode: "geometric_preview",
    });
    const fiveMmConserved = expectSheetAreaConservation(fiveMmResults[0]!.sheets[0]!);
    expect(fiveMmConserved).toEqual({ rawMm2: 8_800_000, panesMm2: 4_320_000, zonesMm2: 4_426_000, trimMm2: 0, separationMm2: 54_000, unclassifiedMm2: 0 });

    const pdf = await createGlassDistributionPdf({
      mode: "simulation",
      quoteCode: "COT-QA-1309",
      clientName: "Cliente QA",
      workName: "Corredera V1",
      logoDataUrl: await officialLogoDataUrl(),
      coverage: { ...completeCoverage, completeReferenceCount: 5 },
      panes: sourcePanes,
      results: combinedResults,
    });
    const text = pdfText(pdf);
    const firstPositionRow = text.lastIndexOf("V1 · 1");
    const secondPositionRow = text.lastIndexOf("V1 · 2");

    expect(firstPositionRow).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("600 × 1.000 mm", firstPositionRow)).toBeGreaterThan(firstPositionRow);
    expect(secondPositionRow).toBeGreaterThan(firstPositionRow);
    expect(text.indexOf("600 × 1.000 mm", firstPositionRow)).toBeLessThan(secondPositionRow);
    expect(text).toContain("600 × 1.100 mm");
    expect(text).toContain("V2 · 1 · unidad 1");
    expect(text).toContain("V2 · 1 · unidad 2");
    for (const reference of ["V1 · 1", "V1 · 2", "V1 · 3", "V1 · 4"]) {
      expect(text).toContain(reference);
    }
    expect(text).toContain("4,32 m²");
    expect(text).toContain("Restante geométrico estimado 4,48 m²");
    expect(text).toContain("separación 0,00 m²");
    expect(text).toContain("no clasificada 0,00 m²");
    expect(text).toContain("Separación usada 0 mm");
    expect(text).toContain("despuntes sup/der/inf/izq 0/0/0/0 mm");
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pdf.internal.pages[1]?.join(" ")).toContain("Plancha 1");
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE"))).toBe(true);
    if (process.env.VENTORA_PDF_PAGINATION_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-cot-1309-simulacion.pdf"), Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("mantiene juntas en una página las seis unidades de 1309 cuando hay espacio legible", async () => {
    const sourceSlots = [
      { slot: "pane-1", widthMm: 600, heightMm: 1000 },
      { slot: "pane-2", widthMm: 600, heightMm: 1000 },
      { slot: "pane-3", widthMm: 600, heightMm: 1100 },
      { slot: "pane-4", widthMm: 600, heightMm: 1100 },
    ];
    const firstComponent = sourceSlots.map(({ slot, widthMm, heightMm }) => ({
      ...pane(slot),
      quoteItemId: "item-v1",
      logicalComponentId: "logical-v1",
      glassId: `glass-${slot}`,
      paneId: `pane-id-${slot}`,
      paneSlotId: slot,
      paneUnitIds: [`unit-${slot}`],
      componentCode: "V1",
      componentName: "Corredera V1",
      widthMm,
      heightMm,
      technicalSpec: { ...pane(slot).technicalSpec, sheetWidthMm: 4000, sheetHeightMm: 2200 },
    }));
    const secondComponent = {
      ...pane("v2"),
      quoteItemId: "item-v2",
      logicalComponentId: "logical-v2",
      glassId: "glass-v2",
      paneId: "pane-id-v2",
      paneSlotId: "pane-1",
      paneUnitIds: ["unit-v2-1", "unit-v2-2"],
      componentCode: "V2",
      componentName: "Corredera V2",
      widthMm: 900,
      heightMm: 1000,
      quantity: 2,
      commercialQuantity: 1,
      technicalSpec: { ...pane("v2").technicalSpec, sheetWidthMm: 4000, sheetHeightMm: 2200 },
    };
    const planningPanes = [...firstComponent, secondComponent];
    const results = optimizeGlassCuttingBatch({
      panes: planningPanes,
      profiles: [{
        ...profile,
        sheet: { ...profile.sheet, widthMm: 4000, heightMm: 2200 },
        process: { ...profile.process, tableWidthMm: 4000, tableHeightMm: 2200, edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 }, kerfOrSeparationMm: 0, minimumStripWidthMm: 0 },
      }],
      mode: "geometric_preview",
    });
    expect(results[0]?.sheets).toHaveLength(1);

    const sourcePanes = [
      ...firstComponent.map((item) => ({
        quoteItemId: item.quoteItemId,
        paneId: item.paneId,
        paneSlotId: item.paneSlotId,
        paneUnitIds: item.paneUnitIds,
        componentCode: item.componentCode,
        componentName: item.componentName,
        productId: item.productId,
        displayName: "Float QA",
        thicknessMm: 5,
        category: "monolitico" as const,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        quantity: 1,
        physicalUnitCount: 1,
        dimensionProvenance: "manual" as const,
      })),
      {
        quoteItemId: secondComponent.quoteItemId,
        paneId: secondComponent.paneId,
        paneSlotId: secondComponent.paneSlotId,
        paneUnitIds: secondComponent.paneUnitIds,
        componentCode: secondComponent.componentCode,
        componentName: secondComponent.componentName,
        productId: secondComponent.productId,
        displayName: "Float QA",
        thicknessMm: 5,
        category: "monolitico" as const,
        widthMm: secondComponent.widthMm,
        heightMm: secondComponent.heightMm,
        quantity: 2,
        physicalUnitCount: 2,
        dimensionProvenance: "manual" as const,
      },
    ];
    const pdf = await createGlassDistributionPdf({
      mode: "simulation",
      quoteCode: "COT-QA-1309",
      clientName: "Cliente QA",
      workName: "Correderas V1 y V2",
      logoDataUrl: await officialLogoDataUrl(),
      coverage: { ...completeCoverage, completeReferenceCount: 5 },
      panes: sourcePanes,
      results,
    });

    expect(pdf.getNumberOfPages()).toBe(1);
    const pageText = pdf.internal.pages[1]?.join(" ") ?? "";
    for (const reference of ["V1 · 1", "V1 · 2", "V1 · 3", "V1 · 4", "V2 · 1 · unidad 1", "V2 · 1 · unidad 2"]) {
      expect(pageText).toContain(reference);
    }
    expect(pageText).toContain("4,32 m²");
    expect(pageText).toContain("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE");
  });

  it("evita filas huérfanas en una simulación representativa de dos planchas y once unidades", async () => {
    const plan = Array.from({ length: 9 }, (_, index) => {
      const quoteItemId = `item-1315-${index + 1}`;
      const unitCount = index < 2 ? 2 : 1;
      const unitIds = Array.from({ length: unitCount }, (_, unitIndex) => `unit-1315-${index + 1}-${unitIndex + 1}`);
      const widthMm = index === 8 ? 630 : 800;
      const planningPane: GlassPanePlanningUnit = {
        ...pane(`1315-${index + 1}`),
        quoteItemId,
        paneId: `pane-1315-${index + 1}`,
        paneSlotId: "pane-1",
        paneUnitIds: unitIds,
        componentCode: `V${index + 1}`,
        widthMm,
        heightMm: 1000,
        quantity: unitCount,
        commercialQuantity: 1,
        technicalSpec: {
          ...pane("1315").technicalSpec,
          sheetWidthMm: 4000,
          sheetHeightMm: 2200,
          edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 },
          kerfOrSeparationMm: 0,
          minimumStripWidthMm: 0,
        },
      };
      return {
        planningPane,
        sourcePane: {
          quoteItemId,
          paneId: planningPane.paneId,
          paneSlotId: planningPane.paneSlotId,
          paneUnitIds: unitIds,
          componentCode: `V${index + 1}`,
          componentName: `Componente QA ${index + 1} con descripción extendida para revisar el ajuste de filas`,
          productId: planningPane.productId,
          displayName: "Float QA",
          thicknessMm: 5,
          category: "monolitico" as const,
          widthMm,
          heightMm: 1000,
          quantity: unitCount,
          physicalUnitCount: unitCount,
          dimensionProvenance: "manual" as const,
        },
      };
    });
    const multiSheetProfile: GlassCuttingProfile = {
      ...profile,
      sheet: { ...profile.sheet, widthMm: 4000, heightMm: 2200 },
      process: {
        ...profile.process,
        tableWidthMm: 4000,
        tableHeightMm: 2200,
        edgeTrimMm: { top: 0, right: 0, bottom: 0, left: 0 },
        kerfOrSeparationMm: 0,
        minimumStripWidthMm: 0,
      },
    };
    const results = optimizeGlassCuttingBatch({
      panes: plan.map((item) => item.planningPane),
      profiles: [multiSheetProfile],
      mode: "geometric_preview",
    });
    expect(results[0]?.summary.sheetCount).toBe(2);
    expect(results[0]?.sheets.flatMap((sheet) => sheet.panes)).toHaveLength(11);

    const pdf = await createGlassDistributionPdf({
      mode: "simulation",
      quoteCode: "COT-QA-1315-PAGINACION",
      clientName: "Cliente QA",
      workName: "Fixture de paginación · 9 referencias y 11 unidades",
      logoDataUrl: await officialLogoDataUrl(),
      coverage: { ...completeCoverage, completeReferenceCount: 9 },
      panes: plan.map((item) => item.sourcePane),
      results,
    });
    const pages = pdf.internal.pages.slice(1).map((page) => page?.join(" ") ?? "");
    const manualRowCounts = pages.map((page) => page.match(/Medida manual final/g)?.length ?? 0);

    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(pages.reduce((sum, page) => sum + (page.match(/Medida manual final/g)?.length ?? 0), 0)).toBe(11);
    expect(pages.filter((page) => page.includes("detalle de paños")).every((page) => (page.match(/Medida manual final/g)?.length ?? 0) >= 2)).toBe(true);
    expect(manualRowCounts.reduce((sum, count) => sum + count, 0)).toBe(11);
    expect(pages.every((page) => page.includes("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE"))).toBe(true);
    if (process.env.VENTORA_PDF_PAGINATION_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-cot-1315-paginacion-representativa.pdf"), Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("mantiene separadas especificaciones de vidrio y conserva referencias y nombres largos", async () => {
    const laminatedProfile: GlassCuttingProfile = {
      ...profile,
      profileId: "qa-laminated-profile",
      productId: "qa-laminated-4mm",
      thicknessMm: 4,
      category: "laminado",
      finishOrientationKey: "laminado-claro",
      process: { ...profile.process, supportedCategories: ["laminado"], supportedThicknessesMm: [4] },
    };
    const monolithic = { ...pane("long-mono"), paneId: "pane-long-mono", componentCode: "VENTANA-REFERENCIA-QA-EXTENSA-001", componentName: "Paño fijo de acceso principal con dimensión especial de prueba" };
    const laminated: GlassPanePlanningUnit = {
      ...pane("long-laminated"),
      quoteItemId: "item-laminated",
      paneId: "pane-long-laminated",
      componentCode: "PUERTA-VIDRIADA-REFERENCIA-QA-EXTENSA-002",
      componentName: "Puerta vidriada laminada de seguridad para acceso lateral de prueba",
      productId: "qa-laminated-4mm",
      finishOrientationKey: "laminado-claro",
      technicalSpec: { ...pane("long-laminated").technicalSpec, productId: "qa-laminated-4mm", thicknessMm: 4, category: "laminado" },
    };
    const results = optimizeGlassCuttingBatch({ panes: [monolithic, laminated], profiles: [profile, laminatedProfile], mode: "geometric_preview" });
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.verification.passed)).toBe(true);
    const pdf = await createGlassDistributionPdf({
      mode: "simulation",
      quoteCode: "COT-QA-TIPOS",
      clientName: "Cliente QA",
      workName: "Vidrios con especificaciones distintas",
      generatedAt: "2026-11-02T12:00:00-03:00",
      logoDataUrl: await officialLogoDataUrl(),
      coverage: { ...completeCoverage, completeReferenceCount: 2 },
      panes: [
        { quoteItemId: monolithic.quoteItemId, paneId: monolithic.paneId, paneUnitIds: monolithic.paneUnitIds, componentCode: monolithic.componentCode, componentName: monolithic.componentName, productId: monolithic.productId, displayName: "Vidrio monolítico QA", thicknessMm: 5, category: "monolitico", widthMm: monolithic.widthMm, heightMm: monolithic.heightMm, quantity: 1, physicalUnitCount: 1, dimensionProvenance: "manual" },
        { quoteItemId: laminated.quoteItemId, paneId: laminated.paneId, paneUnitIds: laminated.paneUnitIds, componentCode: laminated.componentCode, componentName: laminated.componentName, productId: laminated.productId, displayName: "Vidrio laminado QA", thicknessMm: 4, category: "laminado", widthMm: laminated.widthMm, heightMm: laminated.heightMm, quantity: 1, physicalUnitCount: 1, dimensionProvenance: "manual" },
      ],
      results,
    });
    const text = pdfText(pdf);
    const compactText = text.replace(/\s+/g, "");
    expect(text).toContain("Monolítico");
    expect(text).toContain("5 mm");
    expect(text).toContain("Laminado");
    expect(text).toContain("4 mm");
    expect(text).toContain("VENTANA-REFERE");
    expect(compactText).toContain("EXTENSA-001");
    expect(text).toContain("PUERTA-VIDRIADA");
    expect(compactText).toContain("EXTENSA-002");
    expect(text).toContain("dimensión especial");
    expect(text).toContain("seguridad para acceso lateral");
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("PRELIMINAR"))).toBe(true);
    if (process.env.VENTORA_PDF_PAGINATION_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-pdf-tipos-y-espesores.pdf"), Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("asocia dimensiones distintas por identidad de paño dentro del mismo componente y producto", async () => {
    const firstPane = pane("same-product-1");
    const secondPane = { ...pane("same-product-2"), paneId: "pane-second", widthMm: 700, heightMm: 1000 };
    const results = optimizeGlassCuttingBatch({ panes: [firstPane, secondPane], profiles: [profile], mode: "workshop" });
    const input = {
      quoteCode: "COT-QA-2H",
      clientName: "Cliente QA",
      workName: "Corredera 2H",
      coverage: { ...completeCoverage, completeReferenceCount: 2 },
      panes: [
        { quoteItemId: "item-qa", paneId: firstPane.paneId, paneUnitIds: firstPane.paneUnitIds, componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float", thicknessMm: 5, category: "monolitico", widthMm: 750, heightMm: 1600, quantity: 1, physicalUnitCount: 1 },
        { quoteItemId: "item-qa", paneId: secondPane.paneId, paneUnitIds: secondPane.paneUnitIds, componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float", thicknessMm: 5, category: "monolitico", widthMm: 700, heightMm: 1000, quantity: 1, physicalUnitCount: 1 },
      ],
      results,
    };

    expect(validateGlassDistributionPdfInput(input)).toBeNull();
    const pdf = await createGlassDistributionPdf(input);
    expect(pdfText(pdf)).toContain("700 × 1.000 mm");
  });

  it("blocks a PDF when the source summary omits dimensions even if the geometry has a verified plan", async () => {
    const results = optimizeGlassCuttingBatch({ panes: [pane("1"), pane("2")], profiles: [profile], mode: "workshop" });
    const error = validateGlassDistributionPdfInput({
      quoteCode: "COT-QA-003",
      clientName: "Cliente de prueba",
      workName: "Trabajo QA",
      logoDataUrl: await officialLogoDataUrl(),
      coverage: completeCoverage,
      panes: [{ quoteItemId: "item-qa", componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float incoloro", thicknessMm: 5, category: "monolitico" }],
      results,
    });

    expect(error).toContain("V1 tiene medidas o unidades físicas pendientes");
    await expect(createGlassDistributionPdf({
      quoteCode: "COT-QA-003",
      clientName: "Cliente de prueba",
      workName: "Trabajo QA",
      coverage: completeCoverage,
      panes: [{ quoteItemId: "item-qa", componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float incoloro", thicknessMm: 5, category: "monolitico" }],
      results,
    })).rejects.toThrow("No se puede generar el PDF");
  });

  it("keeps page totals consistent for a multi-sheet plan", async () => {
    const results = optimizeGlassCuttingBatch({ panes: [pane("1"), pane("2"), pane("3"), pane("4")], profiles: [profile], mode: "workshop" });
    expect(results[0]?.verification.passed).toBe(true);
    expect(results[0]?.summary.sheetCount).toBeGreaterThan(1);

    const pdf = await createGlassDistributionPdf({
      quoteCode: "COT-QA-002",
      clientName: "Cliente de prueba",
      workName: "Trabajo QA",
      coverage: completeCoverage,
      panes: [pane("1"), pane("2"), pane("3"), pane("4")].map((item) => ({ quoteItemId: item.quoteItemId, paneId: item.paneId, paneUnitIds: item.paneUnitIds, componentCode: "V1", productId: item.productId, displayName: "Float incoloro", thicknessMm: 5, category: "monolitico", widthMm: item.widthMm, heightMm: item.heightMm, quantity: 1, physicalUnitCount: 1 })),
      results,
    });
    const text = pdfText(pdf);

    expect(pdf.getNumberOfPages()).toBe(results[0]!.sheets.length);
    expect(text).toContain(`Planchas necesarias: ${results[0]!.sheets.length} · Tipos de paño: 1 · Unidades físicas: 4`);
    expect(text).toContain(`Plancha ${results[0]!.sheets.length} de ${results[0]!.sheets.length}`);
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("Do"))).toBe(true);
    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-distribucion-multiples-planchas.pdf"), Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("rechaza el PDF incluso con plano válido cuando la cobertura de la cotización es parcial", async () => {
    const results = optimizeGlassCuttingBatch({ panes: [pane("1"), pane("2")], profiles: [profile], mode: "workshop" });
    const input = {
      quoteCode: "COT-QA-PARCIAL", clientName: "Cliente QA", workName: "Trabajo QA",
      coverage: {
        status: "partial" as const, completeReferenceCount: 1, pendingReferenceCount: 1,
        pendingReferences: [{ quoteItemId: "item-fixed", componentCode: "V2", componentName: "Paño fijo", displayName: "Float", reason: "Faltan dimensiones." }],
        diagnostics: ["V2 · Paño fijo: faltan dimensiones."],
      },
      panes: [{ quoteItemId: "item-qa", componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float incoloro", thicknessMm: 5, category: "monolitico", widthMm: 750, heightMm: 1600, quantity: 2, physicalUnitCount: 2 }],
      results,
    };

    expect(validateGlassDistributionPdfInput(input)).toMatch(/cobertura de vidrio está incompleta/i);
    await expect(createGlassDistributionPdf(input)).rejects.toThrow(/cobertura de vidrio está incompleta/i);
  });

  it("permite un PDF de simulación preliminar parcial y conserva las exclusiones", async () => {
    const results = optimizeGlassCuttingBatch({ panes: [pane("1"), pane("2")], profiles: [profile], mode: "geometric_preview" });
    const input = {
      mode: "simulation" as const,
      quoteCode: "COT-QA-SIMULACION",
      clientName: "Cliente QA",
      workName: "Trabajo QA",
      coverage: {
        status: "partial" as const,
        completeReferenceCount: 1,
        pendingReferenceCount: 1,
        pendingReferences: [{ quoteItemId: "item-fixed", componentCode: "V2", componentName: "Paño fijo", displayName: "Paño 2", reason: "Faltan medidas finales." }],
        diagnostics: [],
      },
      panes: [pane("1"), pane("2")].map((item) => ({ quoteItemId: item.quoteItemId, paneId: item.paneId, paneUnitIds: item.paneUnitIds, componentCode: "V1", componentName: "Corredera", productId: item.productId, displayName: "Float incoloro", thicknessMm: 5, category: "monolitico", widthMm: item.widthMm, heightMm: item.heightMm, quantity: 1, physicalUnitCount: 1 })),
      results,
      simulationWarnings: ["Separación asumida de 0 mm; revisar el proceso del taller."],
      previewExclusions: [{ componentCode: "V2", componentName: "Paño fijo", displayName: "Paño 2", reason: "Faltan medidas finales." }],
    };

    expect(validateGlassDistributionPdfInput(input)).toBeNull();
    const pdf = await createGlassDistributionPdf(input);
    const text = pdfText(pdf);
    expect(text).toContain("Simulación de planchas de vidrio");
    expect(text).toContain("PRELIMINAR");
    expect(text).toContain("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE");
    expect(text).toContain("Separación usada 5 mm");
    expect(text).toContain("Sin secuencia de corte");
    expect(text).toContain("zonas libres no necesariamente reutilizables");
    expect(text).toContain("2 unidades físicas incluidas");
    expect(text).toContain("1 referencias excluidas de 2");
    expect(text).toContain("Referencias excluidas: V2");
    expect(text).not.toContain("Supuestos y exclusiones");
  });

  it("pagina todas las advertencias y exclusiones en una simulación de varias planchas", async () => {
    const panes = [pane("page-1"), pane("page-2"), pane("page-3"), pane("page-4")];
    const results = optimizeGlassCuttingBatch({ panes, profiles: [profile], mode: "geometric_preview" });
    const exclusions = Array.from({ length: 22 }, (_, index) => ({
      componentCode: `V${index + 2}`,
      componentName: `Componente excluido ${index + 2}`,
      displayName: `Paño pendiente ${index + 2}`,
      reason: `La geometría rectangular congelada del paño ${index + 2} no está disponible para simular.`,
    }));
    const input = {
      mode: "simulation" as const,
      quoteCode: "COT-QA-PAGINADO",
      clientName: "Cliente QA",
      workName: "Simulación de varias planchas",
      logoDataUrl: await officialLogoDataUrl(),
      coverage: {
        status: "partial" as const,
        completeReferenceCount: 4,
        pendingReferenceCount: exclusions.length,
        pendingReferences: [],
        diagnostics: [],
      },
      panes: panes.map((glassPane) => ({
        quoteItemId: glassPane.quoteItemId,
        paneId: glassPane.paneId,
        paneUnitIds: glassPane.paneUnitIds,
        componentCode: glassPane.componentCode,
        productId: glassPane.productId,
        displayName: "Float QA",
        thicknessMm: 5,
        category: "monolitico" as const,
        widthMm: glassPane.widthMm,
        heightMm: glassPane.heightMm,
        quantity: 1,
        physicalUnitCount: 1,
      })),
      results,
      simulationWarnings: ["Separación física sin confirmar; esta simulación supone 0 mm.", "No constituye una pauta de corte."],
      previewExclusions: exclusions,
    };

    expect(results[0]?.sheets.length).toBeGreaterThan(1);
    expect(validateGlassDistributionPdfInput(input)).toBeNull();
    const pdf = await createGlassDistributionPdf(input);
    const text = pdfText(pdf);
    const pages = pdf.internal.pages.slice(1);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => {
      const pageText = page.join(" ");
      return pageText.includes("SIMULACIÓN GEOMÉTRICA · NO APTO PARA CORTE")
        && pageText.includes("Separación usada 5 mm")
        && pageText.includes("Sin secuencia de corte")
        && pageText.includes("zonas libres no necesariamente reutilizables");
    })).toBe(true);
    expect(text).toContain("22 referencias excluidas de 26");
    expect(text).toContain("Referencias excluidas: V2-V23");
    expect(text).not.toContain("Supuestos y exclusiones");
    if (process.env.VENTORA_PDF_PAGINATION_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-pdf-paginacion-extensa.pdf"), Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("rechaza en el generador PDF un resultado geométrico aunque la cobertura esté completa", async () => {
    const results = optimizeGlassCuttingBatch({ panes: [pane("1"), pane("2")], profiles: [profile], mode: "geometric_preview" });
    expect(results[0]?.calculationMode).toBe("geometric_preview");
    const input = {
      quoteCode: "COT-QA-GEOM", clientName: "Cliente QA", workName: "Trabajo QA",
      coverage: completeCoverage,
      panes: [{ quoteItemId: "item-qa", componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float", thicknessMm: 5, category: "monolitico", widthMm: 750, heightMm: 1600, quantity: 2, physicalUnitCount: 2 }],
      results,
    };
    expect(validateGlassDistributionPdfInput(input)).toMatch(/proceso de taller validado/i);
    await expect(createGlassDistributionPdf(input)).rejects.toThrow(/proceso de taller validado/i);
  });
});

