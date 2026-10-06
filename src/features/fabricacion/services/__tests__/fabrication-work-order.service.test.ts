import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import type { WorkMaterialsDocument } from "../fabrication-work-materials.service";
import { buildFabricationWorkOrder } from "../fabrication-work-order.service";
import { createFabricationWorkOrderPdf } from "../fabrication-work-order-pdf.service";

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
        { itemId: "v1", codigoItem: "V1", nombreItem: "Ventana 1", componenteId: "rail", codigoPerfil: "5001", funcion: "Riel superior", corte: null, largoMm: 1000 },
        { itemId: "v1", codigoItem: "V1", nombreItem: "Ventana 1", componenteId: "rail", codigoPerfil: "5001", funcion: "Riel superior", corte: null, largoMm: 1000 },
        { itemId: "v2", codigoItem: "V2", nombreItem: "Ventana 2", componenteId: "rail", codigoPerfil: "5001", funcion: "Riel superior", corte: null, largoMm: 600 },
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
        sku: "SKU-5001", isWorkshopCode: false, sourceKind: "reference", sourceLabel: "Lista referencial · proveedor",
        sourceRevision: "archivo-interno-privado", pricedAt: "2026-10-06T10:00:00.000Z",
        basis: "por barra", unitPrice: 10000, subtotal: 10000, currency: "CLP",
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

describe("orden de fabricación y materiales", () => {
  it("conserva barras, cantidades y largos del snapshot, y reconcilia subtotales con el total parcial guardado", () => {
    const order = buildFabricationWorkOrder({ summary: summary(savedWork()), materials: materials(), technicalCostSnapshot: savedCost() });
    expect(order.pricing).toMatchObject({ status: "partial", knownNetTotal: 11500, pricedCount: 2, pendingCount: 1 });
    expect(order.materials.profiles[0]?.price?.subtotal! + order.materials.accessories[0]?.price?.subtotal!).toBe(order.pricing.knownNetTotal);
    expect(order.cutGroups).toHaveLength(1);
    expect(order.cutGroups[0]).toMatchObject({ technicalCode: "5001", barIndex: 1, commercialLengthMm: 6000, theoreticalRemnantMm: 3391 });
    expect(order.cutGroups[0]?.cuts).toMatchObject([
      { itemCode: "V1", quantity: 2, lengthMm: 1000 },
      { itemCode: "V2", quantity: 1, lengthMm: 600 },
    ]);
    expect(order.glass[0]).toMatchObject({ itemCode: "V1", widthMm: 600, heightMm: 1000, quantity: 2, totalM2: 1.2, issue: null });
    expect(order.pending.filter((row) => row.subject === "Carros: precio")).toHaveLength(1);
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
    let logoDataUrl: string | null = null;
    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const svg = readFileSync(path.join(process.cwd(), "public", "brand", "ventora-logo-boot.svg"));
      const png = await sharp(svg).png().toBuffer();
      logoDataUrl = `data:image/png;base64,${png.toString("base64")}`;
    }
    const pdf = createFabricationWorkOrderPdf(order, {
      companyName: "Taller Ejemplo", quoteCode: "COT-EJEMPLO", workName: "Ventanas", issueDate: "6 oct 2026",
    }, logoDataUrl);
    const text = pdfText(pdf);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    for (const value of ["Orden de fabricación", "Resumen de compra", "Pauta de corte", "Orden de vidrios", "Pendientes para el maestro", "SKU-5001", "5001", "V1", "V2", "2 × 1.000 mm", "1 × 600 mm", "6.000 mm", "3.391 mm", "11.500", "1,20 m²", "Remanente teórico", "Ajustado por el taller"]) {
      expect(text).toContain(value);
    }
    expect((text.match(/3\.391 mm/g) ?? [])).toHaveLength(1);
    if (logoDataUrl) expect(pdf.internal.pages[1]?.join(" ")).toContain("Do");
    expect(pdf.getNumberOfPages()).toBe(1);
    expect(text).not.toContain("archivo-privado");
    expect(text).not.toContain("archivo-interno-privado");
    expect(text).not.toContain("arquetipo");

    if (process.env.VENTORA_PDF_EXAMPLE === "1") {
      const output = path.join(process.cwd(), "output", "pdf", "orden-fabricacion-materiales-ejemplo.pdf");
      mkdirSync(path.dirname(output), { recursive: true });
      writeFileSync(output, Buffer.from(pdf.output("arraybuffer")));
    }
  });

  it("repite encabezados al continuar tablas largas y muestra el código interno cuando corresponde", () => {
    const many = materials();
    many.profiles[0]!.price = { ...many.profiles[0]!.price!, sku: "TALLER-5001", isWorkshopCode: true, sourceKind: "own" };
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
