import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  normalizeQuotePricingMode,
  type QuotePricingMode,
} from "@/features/cotizaciones/types/quote-pricing-mode";
import { normalizePricingMode } from "@/features/cotizaciones/types/pricing-mode";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

const DEFAULT_TARGET_REAL_MARGIN_PCT = 30;

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

function resolveExplicitItemMaterialCost(item: CotizacionWorkflowItem) {
  if (item.tipoItem === "item_libre_con_valor") {
    return 0;
  }

  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
  const pricingMode = normalizePricingMode(presentation.pricingMode);

  if (pricingMode !== "margen") {
    return 0;
  }

  return normalizeNonNegative(item.costoProveedorTotal);
}

export type QuoteStudioFinancialSummary = {
  quotePricingMode: QuotePricingMode;
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
  hasCostBasis: boolean;
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

export function buildQuoteStudioFinancialSummary(input: {
  items: CotizacionWorkflowItem[];
  quotePricingMode?: QuotePricingMode;
  neto: number;
  total: number;
  costoTotalFabricacion?: number | null;
  margenObjetivoRealPct?: number | null;
  manoObra?: number | null;
  traslado?: number | null;
  otrosCostos?: number | null;
  mermaPct?: number | null;
}): QuoteStudioFinancialSummary {
  const quotePricingMode = normalizeQuotePricingMode(input.quotePricingMode);
  const costoMateriales = round(
    input.items.reduce(
      (accumulator, item) => accumulator + resolveExplicitItemMaterialCost(item),
      0
    ),
    2
  );
  const costoTotalFabricacion = normalizeNonNegative(input.costoTotalFabricacion);
  const manoObra = normalizeNonNegative(input.manoObra);
  const traslado = normalizeNonNegative(input.traslado);
  const otrosCostosBase = normalizeNonNegative(input.otrosCostos);
  const mermaPct = normalizeNonNegative(input.mermaPct);
  const merma = round(costoMateriales * (mermaPct / 100), 2);
  const costoDesglosado = round(costoMateriales + manoObra + traslado + otrosCostosBase + merma, 2);
  const costoTotal =
    quotePricingMode === "total_global" && costoTotalFabricacion > 0
      ? round(costoTotalFabricacion, 2)
      : costoDesglosado;
  const otrosCostos =
    quotePricingMode === "total_global" && costoTotalFabricacion > costoDesglosado
      ? round(otrosCostosBase + (costoTotalFabricacion - costoDesglosado), 2)
      : otrosCostosBase;
  const margenObjetivoRealPct = normalizeTargetMargin(input.margenObjetivoRealPct);
  const precioRecomendadoNeto =
    costoTotal > 0
      ? round(costoTotal / (1 - margenObjetivoRealPct / 100), 2)
      : 0;
  const precioFinalNeto = round(normalizeNonNegative(input.neto), 2);
  const precioFinalCliente = round(normalizeNonNegative(input.total), 2);
  const hasCostBasis = costoTotal > 0;
  const utilidadEstimada = hasCostBasis ? round(precioFinalNeto - costoTotal, 2) : 0;
  const margenRealPct =
    hasCostBasis && precioFinalNeto > 0 ? round((utilidadEstimada / precioFinalNeto) * 100, 2) : 0;
  const markupEquivalentePct =
    hasCostBasis ? round((utilidadEstimada / costoTotal) * 100, 2) : 0;

  return {
    quotePricingMode,
    costoMateriales,
    manoObra,
    traslado,
    otrosCostos,
    merma,
    costoTotal,
    margenObjetivoRealPct,
    precioRecomendadoNeto,
    precioFinalNeto,
    precioFinalCliente,
    utilidadEstimada,
    margenRealPct,
    markupEquivalentePct,
    hasCostBasis,
  };
}
