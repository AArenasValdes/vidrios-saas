import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import {
  crearRecetaVeratec7400Corredera,
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  VERATEC_7400_SOURCE_REVISION,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { VERATEC_7400_JUNIO_2026_IMPORT } from "../../fixtures/veratec-7400-junio-2026";
import {
  buildPartialTechnicalCostSnapshot,
  getRecipeAccessoriesFromItemSnapshot,
  type CatalogPresentationPrice,
} from "../costo-tecnico-parcial.service";
import type { OrganizationPurchasePricing } from "../precio-compra.service";

const capturedAt = "2026-10-02T12:00:00.000Z";
const definition = crearRecetaVeratec7400Corredera({
  lineName: "Veratec 7400",
  variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
  createId: (() => {
    let next = 0;
    return () => `veratec-cost-integration-${next++}`;
  })(),
});
const recipe: FabricationRecipeRecord = {
  id: "a9400000-0000-4000-8000-000000000001",
  organizationId: 3,
  lineTemplateId: 1396,
  scope: "organization",
  providerName: "VERATEC",
  lineName: "Veratec 7400",
  typology: "corredera",
  leavesCount: 2,
  variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
  version: 1,
  status: "draft",
  definition,
  sourceType: "manufacturer",
  sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  sourceName: "VERATEC",
  sourceRevision: VERATEC_7400_SOURCE_REVISION,
  parentRecipeId: null,
  validatedAt: null,
  validatedBy: null,
  createdAt: capturedAt,
  updatedAt: capturedAt,
  eliminadoEn: null,
};

function quoteItem(code: string): CotizacionWorkflowItem {
  return {
    id: `item-${code}`,
    codigo: code,
    tipo: "Ventana",
    lineaComercial: "Veratec 7400",
    vidrio: "Incoloro monolítico 4 mm",
    nombre: "Ventana corredera 2 hojas",
    descripcion: "1200 × 1500 mm",
    ancho: 1200,
    alto: 1500,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1.8,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: "1396",
      catalogLineKey: VERATEC_7400_CATALOG_KEY,
      sistema: "Corredera",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      fabricacionModulos: 2,
    }),
  };
}

const technicalInputs = new Map(
  VERATEC_7400_JUNIO_2026_IMPORT.technicalInputs.map((input) => [input.technicalKey, input])
);
const prices: CatalogPresentationPrice[] = VERATEC_7400_JUNIO_2026_IMPORT.presentations.map((entry) => {
  const technical = technicalInputs.get(entry.technicalKey);
  if (!technical) throw new Error(`Insumo técnico ausente: ${entry.technicalKey}`);
  return {
    presentationId: entry.sku,
    providerKey: VERATEC_7400_JUNIO_2026_IMPORT.supplierKey,
    technicalCode: technical.sourceCode,
    recipeComponentCodes: technical.recipeComponentCodes,
    recipeAccessoryNames: technical.recipeAccessoryNames,
    technicalName: technical.name,
    supplierSku: entry.sku,
    presentationDescription: entry.description,
    finishCode: entry.finishCode ?? "",
    finishName: entry.finishName,
    finishResolution: entry.finishResolution,
    purchaseUnit: entry.purchaseUnit,
    commercialLengthMm: entry.commercialLengthMm,
    netPrice: entry.netPrice,
    priceBasis: VERATEC_7400_JUNIO_2026_IMPORT.priceListPriceBasis,
    currency: entry.currency,
    priceListId: "fixture-veratec-2026-06",
    priceListRevision: VERATEC_7400_JUNIO_2026_IMPORT.priceListRevision,
  };
});

function calculate(finishes: readonly ("Blanco" | "Negro")[], organizationPricing?: OrganizationPurchasePricing) {
  const resolved = finishes.map((finish, index) => {
    const item = quoteItem(`V${index + 1}`);
    const result = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 3,
    });
    expect(result.estado).toBe("calculado");
    expect(result.formal?.recipeId).toBe(recipe.id);
    expect(result.formal?.recipeStatus).toBe("draft");
    expect(result.formal?.pautaBarras?.calculable).toBe(true);
    return { item, finish, snapshot: result.formal! };
  });
  const workSnapshot = construirFabricacionTrabajoSnapshot({
    capturedAt,
    items: resolved.map(({ item, finish, snapshot }) => ({
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      lineaComercial: item.lineaComercial,
      colorHex: finish === "Blanco" ? "#ffffff" : "#2a2a2a",
      catalogLineKey: VERATEC_7400_CATALOG_KEY,
      snapshot,
    })),
  });
  expect(workSnapshot).not.toBeNull();
  const cost = buildPartialTechnicalCostSnapshot({
    workSnapshot,
    quoteItems: resolved.map(({ item, finish, snapshot }) => ({
      code: item.codigo,
      color: finish,
      catalogLineKey: VERATEC_7400_CATALOG_KEY,
      glassDescription: item.vidrio,
      recipeAccessories: getRecipeAccessoriesFromItemSnapshot(snapshot, item.codigo),
    })),
    availablePrices: prices,
    organizationPricing,
    calculatedAt: capturedAt,
  });
  expect(cost).not.toBeNull();
  return { resolved, workSnapshot: workSnapshot!, cost: cost! };
}

describe("Veratec 7400: receta real → pauta conjunta → costo parcial", () => {
  it("resuelve 1200×1500 blanco y conserva faltantes sin precio cero", () => {
    const result = calculate(["Blanco"]);
    expect(result.workSnapshot.bars.flatMap((bar) => bar.cortes)).toHaveLength(40);
    expect(result.workSnapshot.totalBars).toBe(11);
    expect(result.cost.status).toBe("partial");
    expect(result.cost.currency).toBe("CLP");
    expect(result.cost.knownNetTotal).toBe(208021);
    expect(result.cost.lines.find((line) => line.supplierSku === "61016VER001"))
      .toMatchObject({ technicalCode: "AB01016-E", bars: 1, commercialLengthMm: 5800, lineNet: 10940 });
    expect(result.cost.lines.find((line) => line.supplierSku === "66306VER000"))
      .toMatchObject({ technicalCode: "6306", bars: 2, commercialLengthMm: 5800, lineNet: 15164 });
    expect(result.cost.lines.find((line) => line.supplierSku === "61012VER000"))
      .toMatchObject({ quantity: 2, lineNet: 2152 });
    expect(result.cost.missing.some((entry) => entry.description === "Incoloro monolítico 4 mm")).toBe(true);
    expect(result.resolved[0].item.precioUnitario).toBe(100000);
  });

  it("resuelve negro con riel neutro y deja junquillo sin variante confirmada", () => {
    const white = calculate(["Blanco"]);
    const black = calculate(["Negro"]);
    expect(black.workSnapshot.totalBars).toBe(11);
    expect(black.cost.knownNetTotal).toBe(352759);
    expect(black.cost.lines.find((line) => line.supplierSku === "67401VER200"))
      .toMatchObject({ bars: 1, commercialLengthMm: 6800, lineNet: 85259 });
    expect(black.cost.lines.some((line) => line.supplierSku === "61016VER001")).toBe(true);
    expect(black.cost.lines.some((line) => line.supplierSku === "66306VER000")).toBe(false);
    expect(black.cost.missing.some((entry) => entry.technicalCode === "6306")).toBe(true);
    expect(black.cost.knownNetTotal).not.toBe(white.cost.knownNetTotal);
  });

  it("consolida dos ventanas blancas y traza cortes de ambas en barras compartidas", () => {
    const result = calculate(["Blanco", "Blanco"]);
    expect(result.workSnapshot.itemCountWithPauta).toBe(2);
    expect(result.workSnapshot.bars.flatMap((bar) => bar.cortes)).toHaveLength(80);
    expect(result.workSnapshot.totalBars).toBe(16);
    expect(result.cost.knownNetTotal).toBe(317075);
    expect(result.cost.lines.find((line) => line.supplierSku === "61016VER001"))
      .toMatchObject({ bars: 1, lineNet: 10940 });
    expect(result.workSnapshot.bars.some((bar) =>
      new Set(bar.cortes.map((cut) => cut.codigoItem)).size === 2
    )).toBe(true);
    expect(result.cost.lines.some((line) =>
      new Set(line.cuts.map((cut) => cut.itemCode)).size === 2
    )).toBe(true);
  });

  it("separa los acabados en la pauta y no mezcla presentaciones de blanco y negro", () => {
    const result = calculate(["Blanco", "Negro"]);
    expect(new Set(result.workSnapshot.bars.map((bar) => bar.acabadoKey))).toEqual(
      new Set(["#ffffff", "#2a2a2a"])
    );
    expect(result.cost.lines.some((line) => line.supplierSku === "67401VER000")).toBe(true);
    expect(result.cost.lines.some((line) => line.supplierSku === "67401VER200")).toBe(true);
  });

  it("aplica descuento de taller al costo real y prioriza un override, sin recalcular el snapshot anterior", () => {
    const original = calculate(["Blanco"]).cost;
    const discounted = calculate(["Blanco"], {
      adjustments: [{ providerKey: "xelena", percentage: -10, active: true }],
      overrides: [],
    }).cost;
    const overridden = calculate(["Blanco"], {
      adjustments: [{ providerKey: "xelena", percentage: -10, active: true }],
      overrides: [{ presentationId: "61016VER001", netPrice: 9000, currency: "CLP" }],
    }).cost;

    expect(discounted.knownNetTotal).toBe(187218.9);
    expect(discounted.priceOrigin).toBe("own");
    expect(discounted.lines.every((line) => line.effectivePriceSource === "provider_adjustment")).toBe(true);
    expect(overridden.lines.find((line) => line.supplierSku === "61016VER001"))
      .toMatchObject({ netPricePerPresentation: 9000, referenceUnitNetPrice: 10940, effectivePriceSource: "organization_override" });
    expect(overridden.knownNetTotal).toBe(186372.9);
    expect(original.knownNetTotal).toBe(208021);
    expect(original.lines.find((line) => line.supplierSku === "61016VER001"))
      .toMatchObject({ netPricePerPresentation: 10940, effectivePriceSource: "reference" });
    expect(original.missing).toEqual(discounted.missing);
  });
});
