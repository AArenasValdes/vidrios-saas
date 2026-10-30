import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import type { WorkMaterialsDocument } from "../fabrication-work-materials.service";
import { buildFabricationWorkOrder, workOrderPriceSource } from "../fabrication-work-order.service";
import { createFabricationWorkOrderPdf } from "../fabrication-work-order-pdf.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function savedWork(): FabricacionTrabajoSnapshot {
  return {
    schemaVersion: 1, tipo: "fabricacion_trabajo_snapshot", packing: "first_fit_decreasing_sugerido",
    capturedAt: "2026-10-06T10:00:00.000Z", itemCountWithPauta: 2, totalBars: 1,
    totalProfilesLinealMm: 2600, totalWasteMm: 3391, sourcePresentations: [],
    bars: [{
      materialKey: "perfil-5001", presentationKey: "barra-6m", codigoPerfil: "5001",
      nombrePerfil: "Riel superior", acabadoKey: "Aluminio mate", lineaIds: [1],
      largoComercialMm: 6000, supplierSku: "SKU-5001", indice: 1,
      despunteInicialMm: 0, perdidaCorteMm: 9, usadoMm: 2609, sobranteMm: 3391,
      cortes: [
        { itemId: "v1", codigoItem: "V1", nombreItem: "Ventana corredera 2 hojas", componenteId: "rail", codigoPerfil: "5001", funcion: "Riel superior", corte: null, largoMm: 1000 },
        { itemId: "v1", codigoItem: "V1", nombreItem: "Ventana corredera 2 hojas", componenteId: "rail", codigoPerfil: "5001", funcion: "Riel superior", corte: null, largoMm: 1000 },
        { itemId: "v2", codigoItem: "V2", nombreItem: "Ventana corredera 2 hojas", componenteId: "rail", codigoPerfil: "5001", funcion: "Riel superior", corte: null, largoMm: 600 },
      ],
    }],
  };
}

function summary(work: FabricacionTrabajoSnapshot | null): FabricationQuoteSummary {
  return {
    items: [], compositionsPendingRecipe: [], totalItems: 2, totalProfilesMl: 2.6,
    totalGlassM2: 1.2, totalAccessoryUnits: 2, totalBars: work?.totalBars ?? null,
    trabajoSnapshot: work,
  };
}

function materials(): WorkMaterialsDocument {
  return {
    profiles: [{
      key: "5001|6m", code: "5001", supplierSku: "SKU-5001", description: "Riel superior",
      line: "Línea 5000", finish: "Aluminio mate", configuredFinish: "Aluminio mate",
      commercialLengthMm: 6000, bars: 1, itemCodes: ["V1", "V2"],
      price: {
        sku: "SKU-5001", providerKey: "arquetipo", isWorkshopCode: false, sourceKind: "reference", sourceLabel: "Arquetipo",
        sourceRevision: "archivo-interno-privado", pricedAt: "2026-10-06T10:00:00.000Z",
        basis: "por tira", unitPrice: 10000, subtotal: 10000, currency: "CLP",
      },
    }],
    accessories: [
      {
        key: "acc-1", code: "ACC-1", description: "Cierre", quantity: 2, unit: "unidad",
        line: "Línea 5000", finish: "Aluminio mate", configuredFinish: "Aluminio mate", itemCodes: ["V1"],
        price: {
          sku: "SKU-ACC-1", isWorkshopCode: false, sourceKind: "adjusted", sourceLabel: "Proveedor",
          sourceRevision: "revision-privada", pricedAt: null, basis: "por unidad",
          unitPrice: 750, subtotal: 1500, currency: "CLP",
        },
      },
      {
        key: "acc-2", code: null, description: "Carros", quantity: 2, unit: "unidad",
        line: "Línea 5000", finish: "Aluminio mate", configuredFinish: "Aluminio mate", itemCodes: ["V2"], price: null,
      },
    ],
    glass: [],
    glassOrder: [{
      key: "v1|pane-1", groupKey: "incoloro", groupLabel: "Incoloro 5 mm", code: null,
      componentCode: "V1", componentName: "Ventana 1", paneReference: "V1 · Paño 1",
      description: "Incoloro monolítico", thickness: "5 mm", glassType: "Incoloro monolítico", snapshotThickness: "5 mm", finish: "Incoloro", composition: "monolítico",
      widthMm: 600, heightMm: 1000, quantity: 2, areaEachM2: 0.6, totalM2: 1.2, measuresPending: false,
    }],
    hasJointCuttingPlan: true,
    pricing: { status: "partial", knownNetTotal: 11500, currency: "CLP", pricedMaterialCount: 2, pendingMaterialCount: 1, calculatedAt: "2026-10-06T10:00:00.000Z" },
  };
}

it("rotula el origen de Alumco con su nombre en la orden", () => {
  expect(workOrderPriceSource({
    sku: "TI5001A", providerKey: "alumco", isWorkshopCode: false, sourceKind: "reference",
    sourceLabel: "Alumco · 2026", sourceRevision: "2026", pricedAt: null, basis: "por tira",
    unitPrice: 12000, subtotal: 12000, currency: "CLP",
  })).toBe("Alumco · 2026");
});

function savedCost(): TechnicalCostSnapshot {
  return {
    schemaVersion: 2, status: "partial", calculatedAt: "2026-10-06T10:00:00.000Z", currency: "CLP",
    knownNetTotal: 11500, sourcePautaCapturedAt: "2026-10-06T10:00:00.000Z", assumptions: [],
    lines: [
      { technicalCode: "5001", technicalName: "Riel superior", supplierSku: "SKU-5001", finishCode: "mate", finishName: "Aluminio mate", commercialLengthMm: 6000, purchaseUnit: "barra", bars: 1, netPricePerPresentation: 10000, sourcePrice: 10000, effectivePriceSource: "reference", priceBasis: "commercial_presentation", lineNet: 10000, currency: "CLP", priceListId: "lista", priceListRevision: "archivo-privado", cuts: [] },
      { technicalCode: "ACC-1", technicalName: "Cierre", supplierSku: "SKU-ACC-1", finishCode: "mate", finishName: "Aluminio mate", commercialLengthMm: null, purchaseUnit: "unidad", bars: 0, quantity: 2, netPricePerPresentation: 750, sourcePrice: 750, effectivePriceSource: "provider_adjustment", priceBasis: "commercial_presentation", lineNet: 1500, currency: "CLP", priceListId: "lista", priceListRevision: "archivo-privado", cuts: [] },
    ],
    missing: [{ technicalCode: null, description: "Carros", reason: "Precio no configurado", quantity: 2, unit: "unidad" }],
  };
}

function pdfText(pdf: ReturnType<typeof createFabricationWorkOrderPdf>) {
  const raw = Buffer.from(pdf.output("arraybuffer")).toString("latin1");
  return [...raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((match) => match[1]!.replace(/\\([\\()])/g, "$1")).join(" ");
}

function pdfExampleDirectory() {
  return process.env.VENTORA_PDF_OUTPUT_DIR || path.join(process.cwd(), "tmp", "pdfs");
}

describe("orden de fabricación y materiales", () => {
  it("usa el acabado elegido en la cotización también en la pauta PDF", () => {
    const quoteItem = {
      id: "v1", observaciones: encodeCotizacionItemPresentationMeta({
        colorHex: "#7d8791", material: "Aluminio", catalogTerminacion: "Incoloro",
      }),
    } as CotizacionWorkflowItem;
    const snapshot = savedWork();
    snapshot.bars[0]!.nombrePerfil = "Riel superior Blanco";
    snapshot.bars[0]!.acabadoKey = "Blanco";
    const order = buildFabricationWorkOrder({
      summary: summary(snapshot), materials: materials(), technicalCostSnapshot: savedCost(), quoteItems: [quoteItem],
    });
    expect(order.cutGroups[0]).toMatchObject({ profileName: "Riel superior", finish: "Titanio" });
    const text = pdfText(createFabricationWorkOrderPdf(order, {
      companyName: "Taller", quoteCode: "COT-TITANIO", workName: "Ventanas", issueDate: "19 oct 2026",
    }));
    expect(text).toContain("Riel superior");
    expect(text).toContain("Color aluminio: Titanio");
    expect(text).not.toContain("Riel superior Blanco");
  });

  it("conserva barras, cantidades y largos del snapshot, y reconcilia subtotales con el total parcial guardado", () => {
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: materials(), technicalCostSnapshot: savedCost() });
    expect(order.pricing).toMatchObject({ status: "partial", knownNetTotal: 11500, pricedCount: 2, pendingCount: 1 });
    const profileSubtotal = order.materials.profiles[0]?.price?.subtotal;
    const accessorySubtotal = order.materials.accessories[0]?.price?.subtotal;
    expect(profileSubtotal).toEqual(expect.any(Number));
    expect(accessorySubtotal).toEqual(expect.any(Number));
    expect((profileSubtotal ?? Number.NaN) + (accessorySubtotal ?? Number.NaN)).toBe(order.pricing.knownNetTotal);
    expect(order.cutGroups).toHaveLength(1);
    expect(order.cutGroups[0]).toMatchObject({
      technicalCode: "5001", line: "Línea 5000", finish: "Aluminio mate", supplierLabel: "Arquetipo",
      supplierSku: "SKU-5001", barIndex: 1, commercialLengthMm: 6000, theoreticalRemnantMm: 3391,
    });
    expect(order.cutGroups[0]?.cuts).toMatchObject([
      { itemCode: "V1", quantity: 2, lengthMm: 1000 },
      { itemCode: "V2", quantity: 1, lengthMm: 600 },
    ]);
    expect(order.glass[0]).toMatchObject({ itemCode: "V1", widthMm: 600, heightMm: 1000, quantity: 2, totalM2: 1.2, issue: null });
    expect(order.pending.filter((row) => row.subject === "Carros: precio")).toHaveLength(1);
  });

  it("vincula proveedor y SKU al perfil de la pauta en el PDF combinado", () => {
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: materials(), technicalCostSnapshot: savedCost() });
    const text = pdfText(createFabricationWorkOrderPdf(order, {
      companyName: "Taller QA", quoteCode: "COT-QA-ENLACE", workName: "Referencia en pauta", issueDate: "Muestra QA",
    }));

    expect(text).toContain("Color aluminio");
    expect(text).toContain("Arquetipo");
    expect(text).toContain("SKU-5001");
    expect(text).toContain("referencial");
    expect(text).toContain("10.000");
  });

  it("marca datos contradictorios como pendientes sin sustituir la superficie guardada", () => {
    const inconsistent = materials();
    inconsistent.glassOrder[0]!.totalM2 = 1.3;
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: inconsistent, technicalCostSnapshot: savedCost() });
    expect(order.glass[0]).toMatchObject({ widthMm: 600, heightMm: 1000, quantity: 2, totalM2: null, issue: "superficie contradictoria" });
    expect(order.pending.some((row) => row.subject.includes("V1 · Paño 1") && row.action.includes("superficie contradictoria"))).toBe(true);
    const wrongCost = savedCost();
    wrongCost.knownNetTotal = 12000;
    const different = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: materials(), technicalCostSnapshot: wrongCost });
    expect(different.pricing.knownNetTotal).toBeNull();
    expect(different.pending.some((row) => row.key === "price-total")).toBe(true);
  });

  it("imprime cortes históricos por pieza sin inventar distribución ni remanente", () => {
    const historic = summary(null);
    historic.items = [{
      itemId: "v1", codigo: "V1", nombre: "Ventana", snapshot: {
        cuts: [{ profileCode: "5001", profileName: "Riel superior", label: "Riel", functionLabel: "Horizontal", quantity: 2, lengthMm: 900 }],
      },
    } as FabricationQuoteSummary["items"][number]];
    const order = buildFabricationWorkOrder({ summary: historic, materials: { ...materials(), profiles: [], hasJointCuttingPlan: false }, technicalCostSnapshot: null });
    expect(order.hasJointBars).toBe(false);
    expect(order.cutGroups[0]).toMatchObject({ technicalCode: "5001", barIndex: null, theoreticalRemnantMm: null });
    expect(order.cutGroups[0]?.cuts[0]).toMatchObject({ quantity: 2, lengthMm: 900 });
    expect(order.pending.some((row) => row.key === "bar-distribution")).toBe(true);
    const withEmptyPauta = { ...historic, trabajoSnapshot: { ...savedWork(), bars: [], totalBars: 0 } };
    const emptyFallback = buildFabricationWorkOrder({ summary: withEmptyPauta, materials: { ...materials(), profiles: [] }, technicalCostSnapshot: null });
    expect(emptyFallback.hasJointBars).toBe(false);
    expect(emptyFallback.cutGroups[0]?.cuts[0]).toMatchObject({ quantity: 2, lengthMm: 900 });
  });

  it("separa geometría estructural preliminar de la pauta y advierte en PDF combinado y de cortes", () => {
    const partial = summary(null);
    partial.items = [{
      itemId: "l32-geometry-only", codigo: "L32-1", nombre: "Proyectante Serie 32",
      geometryOnly: true, statusLabel: "Despiece estructural preliminar · acristalamiento pendiente",
      snapshot: { cuts: [
        { profileCode: "3201", profileName: "Marco", label: "Marco", functionLabel: "Marco", quantity: 2, lengthMm: 1200 },
        { profileCode: "3202", profileName: "Hoja", label: "Hoja", functionLabel: "Hoja", quantity: 2, lengthMm: 1100 },
      ] },
    } as FabricationQuoteSummary["items"][number]];
    const order = buildFabricationWorkOrder({
      summary: partial,
      materials: { ...materials(), profiles: [], hasJointCuttingPlan: false },
      technicalCostSnapshot: null,
    });

    expect(order.cutGroups).toEqual([]);
    expect(order.preliminaryCutGroups.map((group) => group.technicalCode)).toEqual(["3201", "3202"]);
    expect(order.materials.profiles).toEqual([]);
    expect(order.pending).toContainEqual(expect.objectContaining({
      subject: "Despiece estructural preliminar",
      action: expect.stringContaining("no apto para fabricación"),
    }));

    const metadata = { companyName: "Taller", quoteCode: "COT-L32-PARCIAL", workName: "Serie 32", issueDate: "29 oct 2026" };
    for (const kind of ["combined", "profile-cuts"] as const) {
      const text = pdfText(createFabricationWorkOrderPdf(order, metadata, undefined, kind));
      expect(text).toContain("DOCUMENTO PARCIAL");
      expect(text).toContain("NO APTO PARA FABRICACIÓN");
      expect(text).toContain("Despiece estructural preliminar");
      expect(text).toContain("3201");
      expect(text).toContain("3202");
      expect(text).toContain("Acristalamiento pendiente");
    }
  });

  it("invalida la presentación operativa conjunta si una tira incluye geometría preliminar", () => {
    const mixed = summary(savedWork());
    mixed.items = [{
      itemId: "v1", codigo: "V1", nombre: "Proyectante Serie 32", geometryOnly: true,
      statusLabel: "Despiece estructural preliminar · acristalamiento pendiente",
      snapshot: { cuts: [{ profileCode: "3201", profileName: "Marco", label: "Marco", functionLabel: "Marco", quantity: 2, lengthMm: 1200 }] },
    } as FabricationQuoteSummary["items"][number]];

    const order = buildFabricationWorkOrder({ summary: mixed, materials: materials(), technicalCostSnapshot: savedCost() });

    expect(order.hasJointBars).toBe(false);
    expect(order.cutGroups).toEqual([]);
    expect(order.preliminaryCutGroups.map((group) => group.technicalCode)).toEqual(["3201"]);
    expect(order.materials.profiles).toEqual([]);
    expect(order.pending.some((row) => row.key === "joint-plan-preliminary-geometry")).toBe(true);
  });

  it("deja pendientes tipo y espesor cuando solo el catálogo editable los aporta", () => {
    const withCatalogValues = materials();
    withCatalogValues.glassOrder[0]!.glassType = null;
    withCatalogValues.glassOrder[0]!.snapshotThickness = null;
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: withCatalogValues, technicalCostSnapshot: savedCost() });
    expect(order.glass[0]).toMatchObject({ type: null, thickness: null, widthMm: 600, heightMm: 1000 });
    expect(order.pending.some((row) => row.action.includes("tipo pendiente") && row.action.includes("espesor pendiente"))).toBe(true);
  });

  it("no presenta un snapshot sin precios como total parcial", () => {
    const noPrices = materials();
    noPrices.profiles[0]!.price = null;
    noPrices.accessories[0]!.price = null;
    const cost = savedCost();
    cost.status = "no_data";
    cost.lines = [];
    cost.knownNetTotal = 0;
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: noPrices, technicalCostSnapshot: cost });
    expect(order.pricing.status).toBe("pending");
    expect(order.pricing.knownNetTotal).toBeNull();
    expect(order.pricing.pendingCount).toBe(3);
  });

  it("genera un PDF único con logo Ventora real, compra, cortes agrupados, vidrios y pendientes", async () => {
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: materials(), technicalCostSnapshot: savedCost() });
    const svg = readFileSync(path.join(process.cwd(), "public", "brand", "ventora-logo-compact-on-light.svg"));
    const png = await sharp(svg, { density: 300 }).resize({ width: 1000, height: 212, fit: "contain" }).png().toBuffer();
    const logoDataUrl = `data:image/png;base64,${png.toString("base64")}`;
    const pdf = createFabricationWorkOrderPdf(order, {
      companyName: "Taller Ejemplo", quoteCode: "COT-EJEMPLO", workName: "Ventanas", issueDate: "6 oct 2026",
    }, logoDataUrl);
    const text = pdfText(pdf);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    for (const value of ["Orden de fabricación", "Resumen de compra", "Pauta de corte", "Orden de vidrios", "Pendientes para el maestro", "SKU-5001", "5001", "V1 · Riel superior", "V2 · Riel superior", "2 × 1.000 mm", "1 × 600 mm", "6.000 mm", "3.391 mm", "11.500", "1,20 m²", "Remanente teórico", "Ajustado por el taller", "Arquetipo"]) {
      expect(text).toContain(value);
    }
    expect(text).not.toContain("V1 · Ventana corredera 2 hojas · Riel superior");
    expect(text).not.toContain("V2 · Ventana corredera 2 hojas · Riel superior");
    expect((text.match(/3\.391 mm/g) ?? [])).toHaveLength(1);
    expect(pdf.internal.pages.slice(1).every((page) => page.join(" ").includes("Do"))).toBe(true);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(text).not.toContain("archivo-privado");
    expect(text).not.toContain("archivo-interno-privado");
    expect(text).not.toContain("arquetipo");

    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      const output = path.join(outputDirectory, "qa-orden-fabricacion-combinada.pdf");
      writeFileSync(output, Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("exporta PDF independientes de vidrios y cortes sin arrastrar las otras secciones ni precios", async () => {
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: materials(), technicalCostSnapshot: savedCost() });
    const metadata = { companyName: "Taller", quoteCode: "COT-SEPARADO", workName: "Ventanas", issueDate: "19 oct 2026" };
    const svg = readFileSync(path.join(process.cwd(), "public", "brand", "ventora-logo-compact-on-light.svg"));
    const png = await sharp(svg, { density: 300 }).resize({ width: 1000, height: 212, fit: "contain" }).png().toBuffer();
    const logoDataUrl = `data:image/png;base64,${png.toString("base64")}`;
    const glassPdf = createFabricationWorkOrderPdf(order, metadata, logoDataUrl, "glass-order");
    const glassText = pdfText(glassPdf);
    expect(glassPdf.getNumberOfPages()).toBe(1);
    expect(glassText).toContain("Orden de vidrios");
    expect(glassText).toContain("Espesor: 5 mm");
    expect(glassText).toContain("600 mm");
    expect(glassText).not.toContain("Plan de corte de vidrios");
    expect(glassText).not.toContain("Pauta de corte");
    expect(glassText).not.toContain("11.500");

    const cutsPdf = createFabricationWorkOrderPdf(order, metadata, logoDataUrl, "profile-cuts");
    const cutsText = pdfText(cutsPdf);
    expect(cutsText).toContain("Pauta de cortes de perfiles");
    expect(cutsText).toContain("V1 · Riel superior");
    expect(cutsText).toContain("3.391 mm");
    expect(cutsText).toMatch(/remanente teórico/i);
    expect(cutsText).not.toContain("Orden de vidrios");
    expect(cutsText).not.toContain("11.500");

    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const outputDirectory = pdfExampleDirectory();
      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(path.join(outputDirectory, "qa-orden-vidrios.pdf"), Buffer.from(glassPdf.output("arraybuffer")));
      writeFileSync(path.join(outputDirectory, "qa-pauta-perfiles.pdf"), Buffer.from(cutsPdf.output("arraybuffer")));
    }
  });

  it("muestra unitarios de perfiles aunque no haya pauta, sin sumarlos como costo de fabricación", () => {
    const noCutMaterials = materials();
    noCutMaterials.profiles = [];
    noCutMaterials.profilePriceReferences = [{
      key: "V1:5001:arquetipo:p-5001", itemCode: "V1", line: "Serie 5000", finish: "Aluminio mate",
      technicalCode: "5001", profileName: "Riel superior", providerKey: "arquetipo", providerLabel: "Arquetipo",
      presentationId: "p-5001", supplierSku: "30895001", presentationDescription: "Tira 6 m",
      purchaseUnit: "tira", commercialLengthMm: 6000, netPrice: 13_477, currency: "CLP",
      priceSource: "reference", status: "priced",
    }];
    const order = buildFabricationWorkOrder({ summary: summary(null), materials: noCutMaterials, technicalCostSnapshot: null });
    const text = pdfText(createFabricationWorkOrderPdf(order, {
      companyName: "Taller", quoteCode: "COT-SIN-PAUTA", workName: "Corredera", issueDate: "17 oct 2026",
    }));

    expect(text).toContain("Referencias unitarias de perfiles");
    expect(text).toContain("30895001");
    expect(text).toContain("13.477");
    expect(text).toContain("no representan cantidades de corte");
    expect(order.pricing.status).toBe("pending");
    expect(order.pricing.knownNetTotal).toBeNull();
    expect(order.cutGroups).toHaveLength(0);
  });

  it("repite encabezados al continuar tablas largas y muestra el código interno cuando corresponde", () => {
    const many = materials();
    many.profiles[0]!.price = { ...many.profiles[0]!.price!, sku: "TALLER-5001", providerKey: null, isWorkshopCode: true, sourceKind: "own", sourceLabel: "Propio del taller" };
    many.accessories = Array.from({ length: 42 }, (_, index) => ({
      ...many.accessories[1]!, key: `acc-${index}`, code: `ACC-${index}`, description: `Accesorio ${index}`,
    }));
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: many, technicalCostSnapshot: null });
    const pdf = createFabricationWorkOrderPdf(order, { companyName: "Taller", quoteCode: "COT-LARGA", workName: "Ventanas", issueDate: "6 oct 2026" });
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    const text = pdfText(pdf);
    expect(text).toContain("Interno taller: TALLER-5001");
    expect(text).toContain("Propio del taller");
    expect(text).toContain("Accesorios · continuación");
    expect(text).toContain("Accesorio 41");
  });
});
