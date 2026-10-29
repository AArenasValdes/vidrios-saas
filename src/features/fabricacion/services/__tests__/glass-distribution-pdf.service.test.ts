import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { GlassCuttingProfile, GlassPanePlanningUnit } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
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
      panes: [{ quoteItemId: "item-qa", componentCode: "V1", componentName: "Ventana corredera", productId: "qa-glass-5mm", displayName: "Float incoloro QA 5mmm", thicknessMm: 5, category: "monolitico", widthMm: 750, heightMm: 1600, quantity: 2, physicalUnitCount: 2 }],
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
    expect(text).not.toContain("unit-1");
    expect(text).not.toContain("logical-v1");
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("Do"))).toBe(true);
    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-distribucion-1-plancha.pdf"), Buffer.from(pdf.output("arraybuffer")));
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
        { quoteItemId: "item-qa", paneId: firstPane.paneId, componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float", thicknessMm: 5, category: "monolitico", widthMm: 750, heightMm: 1600, quantity: 1, physicalUnitCount: 1 },
        { quoteItemId: "item-qa", paneId: secondPane.paneId, componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float", thicknessMm: 5, category: "monolitico", widthMm: 700, heightMm: 1000, quantity: 1, physicalUnitCount: 1 },
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
      panes: [{ quoteItemId: "item-qa", componentCode: "V1", productId: "qa-glass-5mm", displayName: "Float incoloro", thicknessMm: 5, category: "monolitico", widthMm: 750, heightMm: 1600, quantity: 4, physicalUnitCount: 4 }],
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

  it("permite un PDF de simulación parcial marcado NO APTO PARA CORTE y conserva las exclusiones", async () => {
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
      panes: [{ quoteItemId: "item-qa", componentCode: "V1", componentName: "Corredera", productId: "qa-glass-5mm", displayName: "Float incoloro", thicknessMm: 5, category: "monolitico", widthMm: 750, heightMm: 1600, quantity: 2, physicalUnitCount: 2 }],
      results,
      simulationWarnings: ["Separación asumida de 0 mm; revisar el proceso del taller."],
      previewExclusions: [{ componentCode: "V2", componentName: "Paño fijo", displayName: "Paño 2", reason: "Faltan medidas finales." }],
    };

    expect(validateGlassDistributionPdfInput(input)).toBeNull();
    const pdf = await createGlassDistributionPdf(input);
    const text = pdfText(pdf);
    expect(text).toContain("SIMULACIÓN GEOMÉTRICA");
    expect(text).toContain("NO APTO PARA CORTE");
    expect(text).toContain("2 unidades físicas incluidas");
    expect(text).toContain("Paño 2: Faltan medidas finales.");
    expect(text).toContain("Separación asumida de 0 mm");
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

    expect(pages.length).toBeGreaterThan(2);
    expect(pages.every((page) => page.join(" ").includes("NO APTO PARA CORTE"))).toBe(true);
    expect(text).toContain("Separación física sin confirmar");
    for (const exclusion of exclusions) expect(text).toContain(exclusion.displayName);
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

