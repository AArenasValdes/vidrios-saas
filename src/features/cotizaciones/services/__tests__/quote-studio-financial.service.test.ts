import {
  applyQuoteStudioRecommendedPrice,
  buildQuoteStudioFinancialSummary,
} from "../quote-studio-financial.service";
import type { CotizacionWorkflowItem } from "../../types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function createItem(overrides: Partial<CotizacionWorkflowItem> = {}): CotizacionWorkflowItem {
  const pricingMode =
    overrides.observaciones?.includes("[pm:precio_directo]") === true
      ? "precio_directo"
      : "margen";

  const observaciones =
    overrides.observaciones ??
    encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      referencia: "Serie prueba",
      pricingMode,
      origenPrecio: pricingMode === "precio_directo" ? "manual" : "margen",
      displayMode: "componente",
      raw: "",
    });

  return {
    id: "item-1",
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "Serie prueba",
    vidrio: "Incoloro 4mm",
    nombre: "Ventana V1",
    descripcion: "Ventana corredera",
    ancho: 1000,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    areaM2: 1,
    costoProveedorUnitario: 700000,
    costoProveedorTotal: 700000,
    margenPct: 30,
    precioUnitario: 1000000,
    precioTotal: 1000000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "margen",
    observaciones,
    ...overrides,
  };
}

describe("quote-studio-financial.service", () => {
  it("calcula precio recomendado con margen real y no markup", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [createItem()],
      quotePricingMode: "por_item",
      neto: 1000000,
      total: 1190000,
      margenObjetivoRealPct: 30,
    });

    expect(summary.costoTotal).toBe(700000);
    expect(summary.precioRecomendadoNeto).toBe(1000000);
    expect(summary.utilidadEstimada).toBe(300000);
    expect(summary.margenRealPct).toBe(30);
    expect(summary.markupEquivalentePct).toBe(42.86);
  });

  it("usa costo de fabricacion global cuando el modo es presupuesto por total", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [createItem({ costoProveedorTotal: 120000 })],
      quotePricingMode: "total_global",
      neto: 500000,
      total: 595000,
      costoTotalFabricacion: 300000,
      margenObjetivoRealPct: 40,
    });

    expect(summary.costoMateriales).toBe(120000);
    expect(summary.otrosCostos).toBe(180000);
    expect(summary.costoTotal).toBe(300000);
    expect(summary.precioRecomendadoNeto).toBe(500000);
    expect(summary.margenRealPct).toBe(40);
  });

  it("mantiene valores seguros cuando no hay base de costo", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [],
      quotePricingMode: "por_item",
      neto: 0,
      total: 0,
    });

    expect(summary.hasCostBasis).toBe(false);
    expect(summary.costoTotal).toBe(0);
    expect(summary.precioRecomendadoNeto).toBe(0);
    expect(summary.margenRealPct).toBe(0);
  });

  it("no infiere utilidad ni margen cuando existe precio final sin base de costo", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [],
      quotePricingMode: "total_global",
      neto: 600000,
      total: 714000,
    });

    expect(summary.hasCostBasis).toBe(false);
    expect(summary.costoTotal).toBe(0);
    expect(summary.utilidadEstimada).toBe(0);
    expect(summary.margenRealPct).toBe(0);
  });

  it("no usa precio de venta en modo precio directo como base de costo", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          margenPct: 0,
          costoProveedorUnitario: 500000,
          costoProveedorTotal: 500000,
          precioUnitario: 500000,
          precioTotal: 500000,
          observaciones: encodeCotizacionItemPresentationMeta({
            colorHex: "#a8a8a8",
            material: "Aluminio",
            referencia: "Sin linea",
            pricingMode: "precio_directo",
            origenPrecio: "manual",
            displayMode: "componente",
            raw: "",
          }),
        }),
      ],
      quotePricingMode: "por_item",
      neto: 500000,
      total: 595000,
    });

    expect(summary.hasCostBasis).toBe(false);
    expect(summary.costoMateriales).toBe(0);
    expect(summary.costoTotal).toBe(0);
    expect(summary.margenRealPct).toBe(0);
    expect(summary.precioRecomendadoNeto).toBe(0);
  });

  it("calcula margen negativo cuando el costo supera el precio neto", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          costoProveedorUnitario: 900000,
          costoProveedorTotal: 900000,
          margenPct: 10,
          precioUnitario: 800000,
          precioTotal: 800000,
        }),
      ],
      quotePricingMode: "por_item",
      neto: 800000,
      total: 952000,
    });

    expect(summary.hasCostBasis).toBe(true);
    expect(summary.utilidadEstimada).toBe(-100000);
    expect(summary.margenRealPct).toBe(-12.5);
  });

  it("considera ajustes manuales del panel como base de costo explicita", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          margenPct: 0,
          costoProveedorUnitario: 0,
          costoProveedorTotal: 0,
          precioUnitario: 400000,
          precioTotal: 400000,
          observaciones: encodeCotizacionItemPresentationMeta({
            colorHex: "#a8a8a8",
            material: "Aluminio",
            referencia: "Sin linea",
            pricingMode: "precio_directo",
            origenPrecio: "manual",
            displayMode: "componente",
            raw: "",
          }),
        }),
      ],
      quotePricingMode: "por_item",
      neto: 400000,
      total: 476000,
      manoObra: 150000,
    });

    expect(summary.hasCostBasis).toBe(true);
    expect(summary.costoMateriales).toBe(0);
    expect(summary.costoTotal).toBe(150000);
    expect(summary.utilidadEstimada).toBe(250000);
  });

  it("calcula rentabilidad sobre la suma de varios componentes en modo por_item", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          id: "item-1",
          precioUnitario: 71634,
          precioTotal: 71634,
          observaciones: encodeCotizacionItemPresentationMeta({
            colorHex: "#a8a8a8",
            material: "Aluminio",
            referencia: "Serie prueba",
            pricingMode: "precio_directo",
            origenPrecio: "manual",
            displayMode: "componente",
            raw: "",
          }),
        }),
        createItem({
          id: "item-2",
          codigo: "V2",
          precioUnitario: 228000,
          precioTotal: 228000,
          observaciones: encodeCotizacionItemPresentationMeta({
            colorHex: "#a8a8a8",
            material: "Aluminio",
            referencia: "Serie prueba",
            pricingMode: "precio_directo",
            origenPrecio: "manual",
            displayMode: "componente",
            raw: "",
          }),
        }),
        createItem({
          id: "item-3",
          codigo: "P1",
          tipo: "Puerta",
          precioUnitario: 192000,
          precioTotal: 192000,
          observaciones: encodeCotizacionItemPresentationMeta({
            colorHex: "#a8a8a8",
            material: "Aluminio",
            referencia: "Serie prueba",
            pricingMode: "precio_directo",
            origenPrecio: "manual",
            displayMode: "componente",
            raw: "",
          }),
        }),
      ],
      quotePricingMode: "por_item",
      neto: 491634,
      total: 585044,
      manoObra: 120000,
      traslado: 20000,
      otrosCostos: 12222,
      margenObjetivoRealPct: 30,
    });

    expect(summary.precioFinalNeto).toBe(491634);
    expect(summary.costoTotal).toBe(152222);
    expect(summary.utilidadEstimada).toBe(339412);
    expect(summary.margenRealPct).toBe(69.04);
    expect(summary.precioRecomendadoNeto).toBe(217460);
  });

  it("aplica precio recomendado escalando items en modo por_item", () => {
    const items = [
      createItem({ id: "item-1", precioUnitario: 200000, precioTotal: 200000 }),
      createItem({ id: "item-2", precioUnitario: 248000, precioTotal: 248000 }),
    ];

    const result = applyQuoteStudioRecommendedPrice({
      items,
      quotePricingMode: "por_item",
      precioRecomendadoNeto: 940000,
      currentNeto: 448000,
    });

    expect(result.applied).toBe(true);
    expect(result.totalClienteManual).toBe(940000);
    expect(result.items.reduce((accumulator, item) => accumulator + item.precioTotal, 0)).toBe(
      940000
    );
    expect(result.items.every((item) => item.precioAjustadoManual)).toBe(true);
  });

  it("no persiste margen negativo al escalar precio bajo el costo", () => {
    const item = createItem({
      costoProveedorUnitario: 700000,
      costoProveedorTotal: 700000,
      margenPct: 30,
      precioUnitario: 1000000,
      precioTotal: 1000000,
    });

    const result = applyQuoteStudioRecommendedPrice({
      items: [item],
      quotePricingMode: "por_item",
      precioRecomendadoNeto: 500000,
      currentNeto: 1000000,
    });

    expect(result.applied).toBe(true);
    expect(result.items[0]?.precioTotal).toBe(500000);
    expect(result.items[0]?.margenPct).toBe(0);
  });

  it("marca observaciones como precio manual al aplicar precio recomendado", () => {
    const item = createItem({
      precioUnitario: 289000,
      precioTotal: 289000,
      observaciones: "",
    });

    const result = applyQuoteStudioRecommendedPrice({
      items: [item],
      quotePricingMode: "por_item",
      precioRecomendadoNeto: 1520000,
      currentNeto: 289000,
    });

    expect(result.applied).toBe(true);
    expect(result.items[0]?.observaciones).toContain("[man:1]");
    expect(result.items[0]?.observaciones).toContain("[po:manual]");
  });

  it("aplica precio recomendado en modo total_global", () => {
    const result = applyQuoteStudioRecommendedPrice({
      items: [createItem({ precioTotal: 0 })],
      quotePricingMode: "total_global",
      precioRecomendadoNeto: 940000,
      currentNeto: 448000,
      totalClienteManual: 448000,
    });

    expect(result.applied).toBe(true);
    expect(result.totalClienteManual).toBe(940000);
  });

  it("escala items por subtotal cuando el neto viene de totalClienteManual", () => {
    const items = [
      createItem({ id: "item-1", precioUnitario: 304000, precioTotal: 304000 }),
      createItem({ id: "item-2", precioUnitario: 144000, precioTotal: 144000 }),
    ];

    const result = applyQuoteStudioRecommendedPrice({
      items,
      quotePricingMode: "por_item",
      precioRecomendadoNeto: 940000,
      currentNeto: 448000,
      totalClienteManual: 448000,
    });

    expect(result.applied).toBe(true);
    expect(result.totalClienteManual).toBe(940000);
    expect(result.items.reduce((accumulator, item) => accumulator + item.precioTotal, 0)).toBe(
      940000
    );
  });
});
