import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  normalizeQuotePricingMode,
  type QuotePricingMode,
} from "@/features/cotizaciones/types/quote-pricing-mode";
import {
  normalizeCostInputScope,
  normalizePricingMode,
  type CostInputScope,
} from "@/features/cotizaciones/types/pricing-mode";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

const DEFAULT_TARGET_REAL_MARGIN_PCT = 30;

export type MaterialCostSource = "none" | "partial" | "calculated" | "manual";

export type CostBasisStatus =
  | "sin_materiales"
  | "materiales_parciales"
  | "materiales_completos"
  | "materiales_manual"
  | "sin_costos"
  | "estimado"
  | "manual";

export const QUOTE_PROFITABILITY_COPY = {
  recargoSobreCosto: "Recargo sobre costo",
  recargoModeTitle: "Costo + recargo",
  recargoModeHint: "Calcula la venta sumando un recargo porcentual al costo.",
  recargoHelp: "Porcentaje que se suma al costo. No es el margen real sobre la venta.",
  recargoZero: "0% (sin recargo)",
  margenReal: "Margen real",
  margenObjetivo: "Margen objetivo",
  margenObjetivoHelp: "Porcentaje de la venta neta que quedaría como utilidad.",
  ventaNeta: "Venta neta",
  costoTotal: "Costo total",
  utilidad: "Utilidad",
  pendiente: "Rentabilidad pendiente",
  incompleta: "Rentabilidad incompleta",
  pendienteHint: "Agrega tus costos internos para calcular utilidad y margen real.",
  incompletaHint:
    "Faltan costos de materiales en alguna pieza. Completa los costos de cada componente para calcular utilidad y margen real.",
  mermaEstimadaLabel: "Merma estimada de materiales %",
  materialOrigenEstimado: "Origen: Estimado comercial",
  materialOrigenParcial: "Origen: Parcial — incompleto",
  materialOrigenSinDatos: "Origen: Sin datos",
  materialOrigenManual: "Origen: Manual",
  valoresPredeterminados: "Valores predeterminados",
  personalizado: "Personalizado",
  restaurarPredeterminados: "Restaurar predeterminados",
  costoMaterialesManualLabel: "Costo total de materiales (manual)",
  costoMaterialesManualHint:
    "Reemplaza por completo el cálculo por pieza. No se suma al costo calculado.",
  soloInterno: "Solo visible para tu empresa",
  recargoDuplica: "100% de recargo duplica el costo.",
  recargoHelpMobile: "Recargo que se suma al costo. No es el margen real sobre la venta.",
  ventaEstimada: "Venta estimada",
  trasladoInterno: "Costo de traslado",
  fleteCliente: "Flete cobrado al cliente",
  fleteClienteHint: "Cobro al cliente. El costo interno se carga en rentabilidad.",
  precioRecomendado: "Precio recomendado",
  ajustarCostos: "Ajustar costos",
  agregarCostos: "Agregar costos",
  ocultarCostos: "Ocultar costos",
} as const;

export function resolveProfitabilityStatusCopy(summary: QuoteStudioFinancialSummary) {
  if (summary.isProfitabilityComplete) {
    return null;
  }

  return {
    label: QUOTE_PROFITABILITY_COPY.incompleta,
    hint: QUOTE_PROFITABILITY_COPY.incompletaHint,
  };
}

export function formatMaterialCostLabel(summary: QuoteStudioFinancialSummary, formattedValue: string) {
  if (summary.materialCostSource === "partial") {
    return `${formattedValue} · parcial`;
  }

  if (summary.materialCostSource === "none") {
    return "No disponible";
  }

  return formattedValue;
}

export function formatQuoteProfitabilityPct(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${value.toLocaleString("es-CL", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Math.abs(value) > 0 && Math.abs(value) < 10 ? 1 : 0,
  })}%`;
}

export function calculateSaleFromCostRecargo(costo: number, recargoPct: number) {
  const safeCost = normalizeNonNegative(costo);
  const safeRecargo = Number.isFinite(recargoPct) && recargoPct > 0 ? recargoPct : 0;
  const precio = round(safeCost * (1 + safeRecargo / 100), 2);
  const utilidad = round(precio - safeCost, 2);
  const margenRealPct = precio > 0 ? round((utilidad / precio) * 100, 2) : 0;
  const recargoEquivalentePct = safeCost > 0 ? round((utilidad / safeCost) * 100, 2) : 0;

  return {
    precio,
    utilidad,
    margenRealPct,
    recargoEquivalentePct,
  };
}

export function calculateRecargoLivePreview(input: {
  costoIngresado: number;
  recargoPct: number;
  cantidad?: number;
  costInputScope?: CostInputScope;
}) {
  const costoIngresado = normalizeNonNegative(input.costoIngresado);
  const recargoPct = Number(input.recargoPct);
  const cantidad = Number(input.cantidad) > 0 ? Number(input.cantidad) : 1;
  const costInputScope = normalizeCostInputScope(input.costInputScope);
  const ready =
    costoIngresado > 0 && Number.isFinite(recargoPct) && recargoPct >= 0;

  if (!ready) {
    return {
      ready: false as const,
      costoTotal: 0,
      ventaEstimada: 0,
      utilidad: 0,
      margenRealPct: 0,
    };
  }

  const costoUnitario =
    costInputScope === "group_total" && cantidad > 1
      ? round(costoIngresado / cantidad, 2)
      : costoIngresado;
  const costoTotal =
    costInputScope === "group_total"
      ? costoIngresado
      : round(costoUnitario * cantidad, 2);
  const precioUnitario = round(costoUnitario * (1 + recargoPct / 100), 2);
  const ventaEstimada =
    costInputScope === "group_total"
      ? round(costoIngresado * (1 + recargoPct / 100), 2)
      : round(precioUnitario * cantidad, 2);
  const utilidad = round(ventaEstimada - costoTotal, 2);
  const margenRealPct =
    ventaEstimada > 0 ? round((utilidad / ventaEstimada) * 100, 2) : 0;

  return {
    ready: true as const,
    costoTotal,
    ventaEstimada,
    utilidad,
    margenRealPct,
  };
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

function normalizeNonNegative(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value);
}

function normalizeTargetMargin(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return DEFAULT_TARGET_REAL_MARGIN_PCT;
  }

  return Math.min(95, Math.max(0, Number(value)));
}

function isItemEligibleForMaterialCompleteness(item: CotizacionWorkflowItem) {
  return item.tipoItem !== "item_libre_con_valor";
}

function itemHasKnownMaterialCost(item: CotizacionWorkflowItem) {
  if (!isItemEligibleForMaterialCompleteness(item)) {
    return false;
  }

  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
  const pricingMode = normalizePricingMode(presentation.pricingMode);

  if (pricingMode !== "margen") {
    return false;
  }

  return normalizeNonNegative(item.costoProveedorTotal) > 0;
}

function itemHasUnknownMaterialCost(item: CotizacionWorkflowItem) {
  return isItemEligibleForMaterialCompleteness(item) && !itemHasKnownMaterialCost(item);
}

function hasManualMaterialOverride(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0;
}

function buildCompleteProfitabilitySummary(input: {
  quotePricingMode: QuotePricingMode;
  materialCostSource: MaterialCostSource;
  costBasisStatus: CostBasisStatus;
  costoMateriales: number;
  manoObra: number;
  traslado: number;
  otrosCostos: number;
  merma: number;
  margenObjetivoRealPct: number;
  precioFinalNeto: number;
  precioFinalCliente: number;
  unknownMaterialItemCount?: number;
}): QuoteStudioFinancialSummary {
  const costoTotal = round(
    input.costoMateriales + input.manoObra + input.traslado + input.otrosCostos + input.merma,
    2
  );
  const utilidadEstimada = round(input.precioFinalNeto - costoTotal, 2);
  const margenRealPct =
    input.precioFinalNeto > 0 ? round((utilidadEstimada / input.precioFinalNeto) * 100, 2) : 0;
  const precioRecomendadoNeto = round(
    costoTotal / (1 - input.margenObjetivoRealPct / 100),
    2
  );
  const markupEquivalentePct =
    costoTotal > 0 ? round((utilidadEstimada / costoTotal) * 100, 2) : 0;

  return {
    quotePricingMode: input.quotePricingMode,
    materialCostSource: input.materialCostSource,
    costBasisStatus: input.costBasisStatus,
    costoMateriales: input.costoMateriales,
    manoObra: input.manoObra,
    traslado: input.traslado,
    otrosCostos: input.otrosCostos,
    merma: input.merma,
    costoTotal,
    margenObjetivoRealPct: input.margenObjetivoRealPct,
    precioRecomendadoNeto,
    precioFinalNeto: input.precioFinalNeto,
    precioFinalCliente: input.precioFinalCliente,
    utilidadEstimada,
    margenRealPct,
    markupEquivalentePct,
    isProfitabilityComplete: true,
    hasCostBasis: true,
    unknownMaterialItemCount: input.unknownMaterialItemCount ?? 0,
  };
}

export function resolveMaterialCostFromItems(items: CotizacionWorkflowItem[]) {
  const eligibleItems = items.filter(isItemEligibleForMaterialCompleteness);
  const knownItems = eligibleItems.filter(itemHasKnownMaterialCost);
  const unknownItems = eligibleItems.filter(itemHasUnknownMaterialCost);
  const costoMaterialesCalculado = round(
    knownItems.reduce(
      (accumulator, item) => accumulator + normalizeNonNegative(item.costoProveedorTotal),
      0
    ),
    2
  );

  if (eligibleItems.length === 0 || knownItems.length === 0) {
    return {
      materialCostSource: "none" as const,
      costBasisStatus: "sin_materiales" as const,
      costoMaterialesCalculado,
      unknownMaterialItemCount: unknownItems.length,
    };
  }

  if (unknownItems.length > 0) {
    return {
      materialCostSource: "partial" as const,
      costBasisStatus: "materiales_parciales" as const,
      costoMaterialesCalculado,
      unknownMaterialItemCount: unknownItems.length,
    };
  }

  return {
    materialCostSource: "calculated" as const,
    costBasisStatus: "materiales_completos" as const,
    costoMaterialesCalculado,
    unknownMaterialItemCount: 0,
  };
}

export function normalizePersistedCostBasisStatus(
  value: string | null | undefined
): CostBasisStatus {
  switch (value) {
    case "sin_materiales":
    case "materiales_parciales":
    case "materiales_completos":
    case "materiales_manual":
    case "sin_costos":
    case "estimado":
    case "manual":
      return value;
    default:
      return "sin_materiales";
  }
}

export function deriveMaterialCostSourceFromPersisted(input: {
  costBasisStatus: string | null | undefined;
  costoMaterialesTotal: number | null | undefined;
}): MaterialCostSource {
  const status = normalizePersistedCostBasisStatus(input.costBasisStatus);
  const costoMateriales = normalizeNonNegative(input.costoMaterialesTotal);

  switch (status) {
    case "materiales_manual":
      return "manual";
    case "materiales_completos":
    case "estimado":
      return costoMateriales > 0 ? "calculated" : "none";
    case "materiales_parciales":
      return "partial";
    case "manual":
      return costoMateriales > 0 ? "calculated" : "partial";
    case "sin_costos":
    case "sin_materiales":
    default:
      return "none";
  }
}

export function isPersistedProfitabilityComplete(input: {
  costBasisStatus: string | null | undefined;
  costoTotal: number | null | undefined;
  utilidadTotal: number | null | undefined;
}): boolean {
  const costoTotal = normalizeNonNegative(input.costoTotal);
  if (costoTotal <= 0 || input.utilidadTotal === null || input.utilidadTotal === undefined) {
    return false;
  }

  const status = normalizePersistedCostBasisStatus(input.costBasisStatus);

  return (
    status === "materiales_completos" ||
    status === "materiales_manual" ||
    status === "estimado" ||
    status === "manual"
  );
}

export type QuoteStudioFinancialSummary = {
  quotePricingMode: QuotePricingMode;
  materialCostSource: MaterialCostSource;
  costBasisStatus: CostBasisStatus;
  costoMateriales: number;
  manoObra: number;
  traslado: number;
  otrosCostos: number;
  merma: number;
  costoTotal: number;
  margenObjetivoRealPct: number;
  precioRecomendadoNeto: number;
  precioFinalNeto: number;
  precioFinalCliente: number;
  utilidadEstimada: number;
  margenRealPct: number;
  markupEquivalentePct: number;
  isProfitabilityComplete: boolean;
  /** @deprecated Usar isProfitabilityComplete */
  hasCostBasis: boolean;
  unknownMaterialItemCount: number;
};

export type ApplyQuoteStudioRecommendedPriceResult = {
  items: CotizacionWorkflowItem[];
  totalClienteManual: number | null;
  applied: boolean;
};

function scaleItemPrice(
  item: CotizacionWorkflowItem,
  precioTotal: number
): CotizacionWorkflowItem {
  const cantidad = Math.max(1, item.cantidad);
  const precioUnitario = round(precioTotal / cantidad, 2);
  const costoUnitario = item.costoProveedorUnitario;
  const computedMargenPct =
    precioUnitario > 0 && costoUnitario > 0
      ? round(((precioUnitario - costoUnitario) / precioUnitario) * 100, 2)
      : item.margenPct;
  const margenPct = Math.max(0, computedMargenPct);
  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);

  return {
    ...item,
    precioTotal,
    precioUnitario,
    margenPct,
    precioAjustadoManual: true,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      colorHex: presentation.colorHex,
      material: presentation.material,
      referencia: presentation.referencia,
      sistema: presentation.sistema,
      configuracion: presentation.configuracion,
      hojasBase: presentation.hojasBase,
      sheetScheme: presentation.sheetScheme,
      sheetVariant: presentation.sheetVariant,
      customSchemeDescription: presentation.customSchemeDescription,
      isCustomScheme: presentation.isCustomScheme,
      pricingMode: presentation.pricingMode,
      lineTemplateId: presentation.lineTemplateId,
      precioPorM2: presentation.precioPorM2,
      minimoCobrable: presentation.minimoCobrable,
      redondeoPrecio: presentation.redondeoPrecio,
      precioPlantillaSugerido: presentation.precioPlantillaSugerido,
      precioAjustadoManual: true,
      origenPrecio: "manual",
      margenPct,
      costInputScope: presentation.encodedCostInputScope,
      palilloEnabled: presentation.palilloEnabled,
      palilloType: presentation.palilloType,
      mirrorFormat: presentation.mirrorFormat,
      mirrorPaneCount: presentation.mirrorPaneCount,
      mirrorPaneDirection: presentation.mirrorPaneDirection,
      mirrorInteriorLine: presentation.mirrorInteriorLine,
      guidedVisualConfig: presentation.guidedVisualConfig,
      cubicationSnapshot: presentation.cubicationSnapshot,
      raw: presentation.raw,
    }),
  };
}

export function applyQuoteStudioRecommendedPrice(input: {
  items: CotizacionWorkflowItem[];
  quotePricingMode?: QuotePricingMode;
  precioRecomendadoNeto: number;
  currentNeto: number;
  targetSubtotal?: number;
  totalClienteManual?: number | null;
}): ApplyQuoteStudioRecommendedPriceResult {
  const targetNeto = round(normalizeNonNegative(input.precioRecomendadoNeto), 2);
  const quotePricingMode = normalizeQuotePricingMode(input.quotePricingMode);

  if (targetNeto <= 0 || input.items.length === 0) {
    return {
      items: input.items,
      totalClienteManual: input.totalClienteManual ?? null,
      applied: false,
    };
  }

  if (quotePricingMode === "total_global") {
    const extraTotal = round(
      input.items
        .filter((item) => item.tipoItem === "item_libre_con_valor" && item.precioTotal > 0)
        .reduce((accumulator, item) => accumulator + item.precioTotal, 0),
      2
    );

    return {
      items: input.items,
      totalClienteManual: round(Math.max(0, targetNeto - extraTotal), 2),
      applied: true,
    };
  }

  const currentNeto = round(normalizeNonNegative(input.currentNeto), 2);
  const currentSubtotal = round(
    input.items.reduce((accumulator, item) => accumulator + item.precioTotal, 0),
    2
  );
  const scalingTarget = round(
    normalizeNonNegative(input.targetSubtotal ?? input.precioRecomendadoNeto),
    2
  );

  if (currentSubtotal > 0) {
    const factor = scalingTarget / currentSubtotal;
    const nextItems = input.items.map((item, index) => {
      if (index < input.items.length - 1) {
        return scaleItemPrice(item, round(item.precioTotal * factor, 2));
      }

      const allocated = round(
        input.items
          .slice(0, -1)
          .reduce(
            (accumulator, currentItem) => accumulator + round(currentItem.precioTotal * factor, 2),
            0
          ),
        2
      );
      const targetSubtotal = round(currentSubtotal * factor, 2);

      return scaleItemPrice(item, round(targetSubtotal - allocated, 2));
    });

    return {
      items: nextItems,
      totalClienteManual: targetNeto,
      applied: true,
    };
  }

  if (currentNeto > 0) {
    const factor = targetNeto / currentNeto;
    const nextItems = input.items.map((item, index) => {
      if (index < input.items.length - 1) {
        return scaleItemPrice(item, round(item.precioTotal * factor, 2));
      }

      const allocated = round(
        input.items
          .slice(0, -1)
          .reduce((accumulator, currentItem) => accumulator + round(currentItem.precioTotal * factor, 2), 0),
        2
      );
      const targetSubtotal = round(
        input.items.reduce((accumulator, currentItem) => accumulator + currentItem.precioTotal, 0) *
          factor,
        2
      );

      return scaleItemPrice(item, round(targetSubtotal - allocated, 2));
    });

    return {
      items: nextItems,
      totalClienteManual: targetNeto,
      applied: true,
    };
  }

  const costBase = round(
    input.items.reduce((accumulator, item) => accumulator + normalizeNonNegative(item.costoProveedorTotal), 0),
    2
  );
  let allocated = 0;
  const nextItems = input.items.map((item, index) => {
    if (index < input.items.length - 1) {
      const weight =
        costBase > 0
          ? normalizeNonNegative(item.costoProveedorTotal) / costBase
          : 1 / input.items.length;
      const precioTotal = round(targetNeto * weight, 2);
      allocated = round(allocated + precioTotal, 2);
      return scaleItemPrice(item, precioTotal);
    }

    return scaleItemPrice(item, round(targetNeto - allocated, 2));
  });

  return {
    items: nextItems,
    totalClienteManual: targetNeto,
    applied: true,
  };
}

function buildIncompleteProfitabilityMetrics(input: {
  quotePricingMode: QuotePricingMode;
  materialCostSource: MaterialCostSource;
  costBasisStatus: CostBasisStatus;
  costoMateriales: number;
  manoObra: number;
  traslado: number;
  otrosCostos: number;
  merma: number;
  margenObjetivoRealPct: number;
  precioFinalNeto: number;
  precioFinalCliente: number;
  unknownMaterialItemCount: number;
}): QuoteStudioFinancialSummary {
  return {
    quotePricingMode: input.quotePricingMode,
    materialCostSource: input.materialCostSource,
    costBasisStatus: input.costBasisStatus,
    costoMateriales: input.costoMateriales,
    manoObra: input.manoObra,
    traslado: input.traslado,
    otrosCostos: input.otrosCostos,
    merma: input.merma,
    costoTotal: 0,
    margenObjetivoRealPct: input.margenObjetivoRealPct,
    precioRecomendadoNeto: 0,
    precioFinalNeto: input.precioFinalNeto,
    precioFinalCliente: input.precioFinalCliente,
    utilidadEstimada: 0,
    margenRealPct: 0,
    markupEquivalentePct: 0,
    isProfitabilityComplete: false,
    hasCostBasis: false,
    unknownMaterialItemCount: input.unknownMaterialItemCount,
  };
}

export function buildQuoteStudioFinancialSummaryFromPersistedSnapshot(input: {
  quotePricingMode?: QuotePricingMode;
  neto: number;
  total: number;
  costoTotal: number | null | undefined;
  utilidadTotal: number | null | undefined;
  margenPct: number | null | undefined;
  precioRecomendadoNeto: number | null | undefined;
  costoMaterialesTotal: number | null | undefined;
  costoManoObraTotal: number | null | undefined;
  costoTrasladoTotal: number | null | undefined;
  costoOtrosTotal: number | null | undefined;
  mermaTotal: number | null | undefined;
  mermaPct: number | null | undefined;
  margenObjetivoPct: number | null | undefined;
  costBasisStatus: string | null | undefined;
}): QuoteStudioFinancialSummary {
  const quotePricingMode = normalizeQuotePricingMode(input.quotePricingMode);
  const costoMateriales = round(normalizeNonNegative(input.costoMaterialesTotal), 2);
  const manoObra = round(normalizeNonNegative(input.costoManoObraTotal), 2);
  const traslado = round(normalizeNonNegative(input.costoTrasladoTotal), 2);
  const otrosCostos = round(normalizeNonNegative(input.costoOtrosTotal), 2);
  const merma = round(normalizeNonNegative(input.mermaTotal), 2);
  const costoTotal = round(normalizeNonNegative(input.costoTotal), 2);
  const utilidadEstimada = round(Number(input.utilidadTotal ?? 0), 2);
  const margenRealPct = round(Number(input.margenPct ?? 0), 2);
  const precioRecomendadoNeto = round(normalizeNonNegative(input.precioRecomendadoNeto), 2);
  const margenObjetivoRealPct = normalizeTargetMargin(input.margenObjetivoPct);
  const precioFinalNeto = round(normalizeNonNegative(input.neto), 2);
  const precioFinalCliente = round(normalizeNonNegative(input.total), 2);
  const costBasisStatus = normalizePersistedCostBasisStatus(input.costBasisStatus);
  const materialCostSource = deriveMaterialCostSourceFromPersisted({
    costBasisStatus: input.costBasisStatus,
    costoMaterialesTotal: input.costoMaterialesTotal,
  });
  const isProfitabilityComplete = isPersistedProfitabilityComplete({
    costBasisStatus: input.costBasisStatus,
    costoTotal: input.costoTotal,
    utilidadTotal: input.utilidadTotal,
  });

  return {
    quotePricingMode,
    materialCostSource,
    costBasisStatus,
    costoMateriales,
    manoObra,
    traslado,
    otrosCostos,
    merma,
    costoTotal: isProfitabilityComplete ? costoTotal : 0,
    margenObjetivoRealPct,
    precioRecomendadoNeto: isProfitabilityComplete ? precioRecomendadoNeto : 0,
    precioFinalNeto,
    precioFinalCliente,
    utilidadEstimada: isProfitabilityComplete ? utilidadEstimada : 0,
    margenRealPct: isProfitabilityComplete ? margenRealPct : 0,
    markupEquivalentePct:
      isProfitabilityComplete && costoTotal > 0
        ? round((utilidadEstimada / costoTotal) * 100, 2)
        : 0,
    isProfitabilityComplete,
    hasCostBasis: isProfitabilityComplete,
    unknownMaterialItemCount: 0,
  };
}

export function buildQuoteStudioFinancialSummary(input: {
  items: CotizacionWorkflowItem[];
  quotePricingMode?: QuotePricingMode;
  neto: number;
  total: number;
  costoTotalFabricacion?: number | null;
  costoMaterialesManual?: number | null;
  margenObjetivoRealPct?: number | null;
  manoObra?: number | null;
  traslado?: number | null;
  otrosCostos?: number | null;
  mermaPct?: number | null;
}): QuoteStudioFinancialSummary {
  const quotePricingMode = normalizeQuotePricingMode(input.quotePricingMode);
  const materialResolution = resolveMaterialCostFromItems(input.items);
  const costoTotalFabricacion = normalizeNonNegative(input.costoTotalFabricacion);
  const manoObra = normalizeNonNegative(input.manoObra);
  const traslado = normalizeNonNegative(input.traslado);
  const otrosCostosBase = normalizeNonNegative(input.otrosCostos);
  const mermaPct = normalizeNonNegative(input.mermaPct);
  const margenObjetivoRealPct = normalizeTargetMargin(input.margenObjetivoRealPct);
  const precioFinalNeto = round(normalizeNonNegative(input.neto), 2);
  const precioFinalCliente = round(normalizeNonNegative(input.total), 2);

  if (quotePricingMode === "total_global") {
    const costoMateriales = materialResolution.costoMaterialesCalculado;
    const merma =
      costoTotalFabricacion > 0
        ? round(costoMateriales * (mermaPct / 100), 2)
        : 0;
    const costoDesglosado = round(costoMateriales + manoObra + traslado + otrosCostosBase + merma, 2);
    const costoTotal =
      costoTotalFabricacion > 0 ? round(costoTotalFabricacion, 2) : costoDesglosado;
    const otrosCostos =
      costoTotalFabricacion > costoDesglosado
        ? round(otrosCostosBase + (costoTotalFabricacion - costoDesglosado), 2)
        : otrosCostosBase;
    const isProfitabilityComplete = costoTotalFabricacion > 0;
    const utilidadEstimada = isProfitabilityComplete
      ? round(precioFinalNeto - costoTotal, 2)
      : 0;
    const margenRealPct =
      isProfitabilityComplete && precioFinalNeto > 0
        ? round((utilidadEstimada / precioFinalNeto) * 100, 2)
        : 0;
    const precioRecomendadoNeto = isProfitabilityComplete
      ? round(costoTotal / (1 - margenObjetivoRealPct / 100), 2)
      : 0;

    return {
      quotePricingMode,
      materialCostSource: isProfitabilityComplete ? "calculated" : materialResolution.materialCostSource,
      costBasisStatus: isProfitabilityComplete
        ? "materiales_completos"
        : materialResolution.costBasisStatus,
      costoMateriales,
      manoObra,
      traslado,
      otrosCostos,
      merma,
      costoTotal: isProfitabilityComplete ? costoTotal : 0,
      margenObjetivoRealPct,
      precioRecomendadoNeto,
      precioFinalNeto,
      precioFinalCliente,
      utilidadEstimada,
      margenRealPct,
      markupEquivalentePct:
        isProfitabilityComplete && costoTotal > 0
          ? round((utilidadEstimada / costoTotal) * 100, 2)
          : 0,
      isProfitabilityComplete,
      hasCostBasis: isProfitabilityComplete,
      unknownMaterialItemCount: materialResolution.unknownMaterialItemCount,
    };
  }

  if (hasManualMaterialOverride(input.costoMaterialesManual)) {
    const costoMateriales = round(input.costoMaterialesManual, 2);
    const merma = round(costoMateriales * (mermaPct / 100), 2);

    return buildCompleteProfitabilitySummary({
      quotePricingMode,
      materialCostSource: "manual",
      costBasisStatus: "materiales_manual",
      costoMateriales,
      manoObra,
      traslado,
      otrosCostos: otrosCostosBase,
      merma,
      margenObjetivoRealPct,
      precioFinalNeto,
      precioFinalCliente,
    });
  }

  const costoMateriales = materialResolution.costoMaterialesCalculado;
  const isProfitabilityComplete = materialResolution.materialCostSource === "calculated";
  const merma = isProfitabilityComplete ? round(costoMateriales * (mermaPct / 100), 2) : 0;
  const otrosCostos = otrosCostosBase;

  if (!isProfitabilityComplete) {
    return buildIncompleteProfitabilityMetrics({
      quotePricingMode,
      materialCostSource: materialResolution.materialCostSource,
      costBasisStatus: materialResolution.costBasisStatus,
      costoMateriales,
      manoObra,
      traslado,
      otrosCostos,
      merma,
      margenObjetivoRealPct,
      precioFinalNeto,
      precioFinalCliente,
      unknownMaterialItemCount: materialResolution.unknownMaterialItemCount,
    });
  }

  return buildCompleteProfitabilitySummary({
    quotePricingMode,
    materialCostSource: materialResolution.materialCostSource,
    costBasisStatus: materialResolution.costBasisStatus,
    costoMateriales,
    manoObra,
    traslado,
    otrosCostos,
    merma,
    margenObjetivoRealPct,
    precioFinalNeto,
    precioFinalCliente,
  });
}

export function canApplyQuoteStudioRecommendedPrice(summary: QuoteStudioFinancialSummary) {
  if (!summary.isProfitabilityComplete || summary.precioRecomendadoNeto <= 0) {
    return false;
  }

  return Math.round(summary.precioRecomendadoNeto - summary.precioFinalNeto) !== 0;
}

export function buildQuoteStudioRecommendedDeltaLabel(
  summary: QuoteStudioFinancialSummary,
  formatMoney: (value: number) => string = formatCurrency
): string | null {
  if (!canApplyQuoteStudioRecommendedPrice(summary)) {
    return null;
  }

  const delta = Math.round(summary.precioRecomendadoNeto - summary.precioFinalNeto);

  if (delta === 0) {
    return "La venta ya está en el precio recomendado.";
  }

  if (delta > 0) {
    return `Faltan ${formatMoney(delta)} para el recomendado.`;
  }

  return `Sobran ${formatMoney(Math.abs(delta))} sobre el recomendado.`;
}

export function buildQuoteStudioApplyRecommendedLabel(
  summary: QuoteStudioFinancialSummary,
  formatMoney: (value: number) => string = formatCurrency
): string {
  if (!canApplyQuoteStudioRecommendedPrice(summary)) {
    return "Usar precio recomendado";
  }

  const delta = Math.round(summary.precioRecomendadoNeto - summary.precioFinalNeto);

  if (delta === 0) {
    return "Usar precio recomendado";
  }

  const signed = delta > 0 ? `+${formatMoney(delta)}` : formatMoney(delta);
  return `Usar precio recomendado · ${signed}`;
}

export function resolveMaterialCostOriginLabel(source: MaterialCostSource) {
  switch (source) {
    case "calculated":
      return QUOTE_PROFITABILITY_COPY.materialOrigenEstimado;
    case "manual":
      return QUOTE_PROFITABILITY_COPY.materialOrigenManual;
    case "partial":
      return QUOTE_PROFITABILITY_COPY.materialOrigenParcial;
    case "none":
    default:
      return QUOTE_PROFITABILITY_COPY.materialOrigenSinDatos;
  }
}
