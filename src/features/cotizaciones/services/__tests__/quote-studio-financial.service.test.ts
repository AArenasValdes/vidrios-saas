import {
  applyQuoteStudioRecommendedPrice,
  buildQuoteStudioFinancialSummary,
  buildQuoteStudioFinancialSummaryFromPersistedSnapshot,
  calculateSaleFromCostRecargo,
  calculateRecargoLivePreview,
  canApplyQuoteStudioRecommendedPrice,
  QUOTE_PROFITABILITY_COPY,
} from "../quote-studio-financial.service";
import {
  calculateComponentItem,
  calculateCotizacionWorkflowTotals,
} from "../cotizaciones-workflow.service";
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

    expect(summary.materialCostSource).toBe("calculated");
    expect(summary.costBasisStatus).toBe("materiales_completos");
    expect(summary.isProfitabilityComplete).toBe(true);
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

    expect(summary.isProfitabilityComplete).toBe(false);
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

    expect(summary.materialCostSource).toBe("none");
    expect(summary.isProfitabilityComplete).toBe(false);
    expect(summary.hasCostBasis).toBe(false);
    expect(summary.costoMateriales).toBe(0);
    expect(summary.costoTotal).toBe(0);
    expect(summary.margenRealPct).toBe(0);
    expect(summary.precioRecomendadoNeto).toBe(0);
  });

  it("marca rentabilidad parcial cuando hay mezcla de recargo y precio directo", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          id: "item-1",
          costoProveedorUnitario: 100000,
          costoProveedorTotal: 100000,
        }),
        createItem({
          id: "item-2",
          codigo: "V2",
          costoProveedorUnitario: 80000,
          costoProveedorTotal: 80000,
        }),
        createItem({
          id: "item-3",
          codigo: "P1",
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
    });

    expect(summary.materialCostSource).toBe("partial");
    expect(summary.costBasisStatus).toBe("materiales_parciales");
    expect(summary.isProfitabilityComplete).toBe(false);
    expect(summary.costoMateriales).toBe(180000);
    expect(summary.costoTotal).toBe(0);
    expect(summary.utilidadEstimada).toBe(0);
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

  it("no completa rentabilidad solo con mano de obra sin materiales", () => {
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

    expect(summary.isProfitabilityComplete).toBe(false);
    expect(summary.hasCostBasis).toBe(false);
    expect(summary.costoMateriales).toBe(0);
    expect(summary.costoTotal).toBe(0);
    expect(summary.utilidadEstimada).toBe(0);
  });

  it("usa override manual total sin sumar piezas", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          costoProveedorUnitario: 100000,
          costoProveedorTotal: 100000,
        }),
      ],
      quotePricingMode: "por_item",
      neto: 500000,
      total: 595000,
      costoMaterialesManual: 250000,
      manoObra: 50000,
      mermaPct: 4,
    });

    expect(summary.materialCostSource).toBe("manual");
    expect(summary.costBasisStatus).toBe("materiales_manual");
    expect(summary.isProfitabilityComplete).toBe(true);
    expect(summary.costoMateriales).toBe(250000);
    expect(summary.merma).toBe(10000);
    expect(summary.costoTotal).toBe(310000);
    expect(summary.utilidadEstimada).toBe(190000);
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

    expect(summary.materialCostSource).toBe("none");
    expect(summary.isProfitabilityComplete).toBe(false);
    expect(summary.precioFinalNeto).toBe(491634);
    expect(summary.costoTotal).toBe(0);
    expect(summary.utilidadEstimada).toBe(0);
    expect(summary.precioRecomendadoNeto).toBe(0);
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

  it("caso A: recargo sobre costo 30% produce markup, no margen real", () => {
    const item = calculateComponentItem({
      codigo: "V1",
      tipo: "Ventana",
      nombre: "Ventana living",
      costoProveedorUnitario: 100000,
      margenPct: 30,
      cantidad: 1,
    });
    const recargo = calculateSaleFromCostRecargo(100000, 30);
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          costoProveedorUnitario: item.costoProveedorUnitario,
          costoProveedorTotal: item.costoProveedorTotal,
          margenPct: item.margenPct,
          precioUnitario: item.precioUnitario,
          precioTotal: item.precioTotal,
        }),
      ],
      quotePricingMode: "por_item",
      neto: item.precioTotal,
      total: 154700,
    });

    expect(item.precioUnitario).toBe(130000);
    expect(recargo.precio).toBe(130000);
    expect(recargo.utilidad).toBe(30000);
    expect(recargo.margenRealPct).toBe(23.08);
    expect(summary.costoTotal).toBe(100000);
    expect(summary.utilidadEstimada).toBe(30000);
    expect(summary.margenRealPct).toBe(23.08);
    expect(summary.hasCostBasis).toBe(true);
  });

  it("caso B: margen objetivo real 30% recomienda precio de margen, no markup", () => {
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

  it("caso C: descuento baja la venta neta usada en utilidad y margen real", () => {
    const item = createItem({
      costoProveedorUnitario: 600000,
      costoProveedorTotal: 600000,
      precioUnitario: 1000000,
      precioTotal: 1000000,
    });
    const totals = calculateCotizacionWorkflowTotals([item], 10, 0);

    expect(totals.subtotal).toBe(1000000);
    expect(totals.neto).toBe(900000);

    const summary = buildQuoteStudioFinancialSummary({
      items: [item],
      quotePricingMode: "por_item",
      neto: totals.neto,
      total: totals.total,
    });

    expect(summary.precioFinalNeto).toBe(900000);
    expect(summary.costoTotal).toBe(600000);
    expect(summary.utilidadEstimada).toBe(300000);
    expect(summary.margenRealPct).toBe(33.33);
  });

  it("caso D: IVA no entra a utilidad ni margen real", () => {
    const item = createItem({
      costoProveedorUnitario: 600000,
      costoProveedorTotal: 600000,
      precioUnitario: 900000,
      precioTotal: 900000,
    });
    const totals = calculateCotizacionWorkflowTotals([item], 0, 0);

    expect(totals.neto).toBe(900000);
    expect(totals.iva).toBe(171000);
    expect(totals.total).toBe(1071000);

    const summary = buildQuoteStudioFinancialSummary({
      items: [item],
      quotePricingMode: "por_item",
      neto: totals.neto,
      total: totals.total,
    });

    expect(summary.utilidadEstimada).toBe(300000);
    expect(summary.margenRealPct).toBe(33.33);
    expect(summary.precioFinalNeto).toBe(900000);
    expect(summary.precioFinalCliente).toBe(1071000);
  });

  it("caso E: precio comercial sin costos deja rentabilidad pendiente", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          costoProveedorUnitario: 192000,
          costoProveedorTotal: 192000,
          margenPct: 0,
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
      neto: 192000,
      total: 228480,
    });

    expect(summary.hasCostBasis).toBe(false);
    expect(summary.utilidadEstimada).toBe(0);
    expect(summary.margenRealPct).toBe(0);
    expect(QUOTE_PROFITABILITY_COPY.pendiente).toBe("Rentabilidad pendiente");
  });

  it("caso F: cantidad mayor a 1 consolida costo, venta neta, utilidad y margen real", () => {
    const item = calculateComponentItem({
      codigo: "V1",
      tipo: "Ventana",
      nombre: "Ventana living",
      costoProveedorUnitario: 100000,
      margenPct: 30,
      cantidad: 5,
    });
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          cantidad: 5,
          costoProveedorUnitario: item.costoProveedorUnitario,
          costoProveedorTotal: item.costoProveedorTotal,
          margenPct: item.margenPct,
          precioUnitario: item.precioUnitario,
          precioTotal: item.precioTotal,
        }),
      ],
      quotePricingMode: "por_item",
      neto: item.precioTotal,
      total: 773500,
    });

    expect(item.costoProveedorTotal).toBe(500000);
    expect(item.precioTotal).toBe(650000);
    expect(summary.costoTotal).toBe(500000);
    expect(summary.precioFinalNeto).toBe(650000);
    expect(summary.utilidadEstimada).toBe(150000);
    expect(summary.margenRealPct).toBe(23.08);
  });

  it("caso G: distingue margen real de recargo equivalente sobre costo", () => {
    const recargo = calculateSaleFromCostRecargo(585747, 53.03);
    const summary = buildQuoteStudioFinancialSummary({
      items: [
        createItem({
          costoProveedorUnitario: 585747,
          costoProveedorTotal: 585747,
          precioUnitario: 896193,
          precioTotal: 896193,
        }),
      ],
      quotePricingMode: "por_item",
      neto: 896193,
      total: 1066469,
    });

    expect(summary.utilidadEstimada).toBe(310446);
    expect(summary.margenRealPct).toBe(34.64);
    expect(summary.markupEquivalentePct).toBe(53);
    expect(recargo.recargoEquivalentePct).toBeGreaterThan(summary.margenRealPct);
  });

  it("respeta snapshot persistido sin recalcular métricas históricas", () => {
    const summary = buildQuoteStudioFinancialSummaryFromPersistedSnapshot({
      quotePricingMode: "por_item",
      neto: 900000,
      total: 1071000,
      costoTotal: 610000,
      utilidadTotal: 290000,
      margenPct: 32.22,
      precioRecomendadoNeto: 920000,
      costoMaterialesTotal: 500000,
      costoManoObraTotal: 80000,
      costoTrasladoTotal: 20000,
      costoOtrosTotal: 10000,
      mermaTotal: 0,
      mermaPct: 0,
      margenObjetivoPct: 30,
      costBasisStatus: "materiales_completos",
    });

    expect(summary.isProfitabilityComplete).toBe(true);
    expect(summary.costoTotal).toBe(610000);
    expect(summary.utilidadEstimada).toBe(290000);
    expect(summary.margenRealPct).toBe(32.22);
    expect(summary.precioRecomendadoNeto).toBe(920000);
    expect(summary.costBasisStatus).toBe("materiales_completos");
  });

  it("limita el margen objetivo real para no producir infinito ni NaN", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [createItem()],
      quotePricingMode: "por_item",
      neto: 1000000,
      total: 1190000,
      margenObjetivoRealPct: 100,
    });

    expect(summary.margenObjetivoRealPct).toBe(95);
    expect(Number.isFinite(summary.precioRecomendadoNeto)).toBe(true);
    expect(summary.precioRecomendadoNeto).toBe(14000000);
  });

  it("calcula el preview de recargo por unidad y por total del grupo", () => {
    const example = calculateRecargoLivePreview({
      costoIngresado: 120000,
      recargoPct: 100,
      cantidad: 1,
      costInputScope: "unit",
    });
    const unit = calculateRecargoLivePreview({
      costoIngresado: 120000,
      recargoPct: 100,
      cantidad: 5,
      costInputScope: "unit",
    });
    const group = calculateRecargoLivePreview({
      costoIngresado: 120000,
      recargoPct: 100,
      cantidad: 5,
      costInputScope: "group_total",
    });

    expect(example).toMatchObject({
      ready: true,
      ventaEstimada: 240000,
      utilidad: 120000,
      margenRealPct: 50,
    });
    expect(unit).toMatchObject({
      ready: true,
      costoTotal: 600000,
      ventaEstimada: 1200000,
      utilidad: 600000,
      margenRealPct: 50,
    });
    expect(group).toMatchObject({
      ready: true,
      costoTotal: 120000,
      ventaEstimada: 240000,
      utilidad: 120000,
      margenRealPct: 50,
    });
  });

  it("oculta el CTA de precio recomendado cuando la venta ya está en el recomendado", () => {
    const alreadyAtRecommended = {
      isProfitabilityComplete: true,
      precioRecomendadoNeto: 1000000,
      precioFinalNeto: 1000000,
    } as ReturnType<typeof buildQuoteStudioFinancialSummary>;
    const belowRecommended = {
      ...alreadyAtRecommended,
      precioFinalNeto: 900000,
    };

    expect(canApplyQuoteStudioRecommendedPrice(alreadyAtRecommended)).toBe(false);
    expect(canApplyQuoteStudioRecommendedPrice(belowRecommended)).toBe(true);
  });

  it("una cotización nueva sin override no marca materiales como manual", () => {
    const summary = buildQuoteStudioFinancialSummary({
      items: [],
      quotePricingMode: "por_item",
      neto: 0,
      total: 0,
      costoMaterialesManual: null,
      manoObra: 30000,
      traslado: 15000,
      otrosCostos: 5000,
      mermaPct: 5,
      margenObjetivoRealPct: 30,
    });

    expect(summary.materialCostSource).toBe("none");
    expect(summary.costBasisStatus).toBe("sin_materiales");
  });
});
