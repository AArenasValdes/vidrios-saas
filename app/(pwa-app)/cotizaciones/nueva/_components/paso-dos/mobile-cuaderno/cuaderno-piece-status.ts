import {
  buildPieceDomainView,
  isPieceCommerciallyComplete,
  type PieceDomainView,
} from "@/features/cotizaciones/new-quote/quote-piece-domain";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

/** Badge único prioritario en tarjeta del cuaderno móvil (diseño Fase 1). */
export type CuadernoPiecePriorityStatus =
  | "lista"
  | "falta_precio"
  | "faltan_datos"
  | "sin_configurar";

export const CUADERNO_PIECE_PRIORITY_LABELS: Record<CuadernoPiecePriorityStatus, string> = {
  lista: "Lista",
  falta_precio: "Falta precio",
  faltan_datos: "Faltan datos",
  sin_configurar: "Sin configurar",
};

export function deriveCuadernoPiecePriorityStatus(
  item: CotizacionWorkflowItem,
  pricingMode: QuotePricingMode,
  lineTemplate: CotizacionLineTemplate | null = null
): CuadernoPiecePriorityStatus {
  const view = buildPieceDomainView(item, pricingMode, lineTemplate);

  if (!item.nombre.trim() || !item.ancho || !item.alto || item.cantidad < 1) {
    return "faltan_datos";
  }
  if (pricingMode === "por_item" && item.precioUnitario <= 0) {
    return "falta_precio";
  }
  if (
    item.tipoItem !== "item_libre_con_valor" &&
    !view.guidedVisualConfigPresent &&
    (item.tipo === "Ventana" || item.tipo === "Puerta")
  ) {
    return "sin_configurar";
  }
  return "lista";
}

export function isCuadernoPieceIncomplete(
  item: CotizacionWorkflowItem,
  pricingMode: QuotePricingMode
) {
  return !isPieceCommerciallyComplete(item, pricingMode);
}

export function findFirstIncompleteCuadernoPieceId(
  items: readonly CotizacionWorkflowItem[],
  pricingMode: QuotePricingMode
): string | null {
  const incomplete = items.find((item) => isCuadernoPieceIncomplete(item, pricingMode));
  return incomplete?.id ?? null;
}

export function countIncompleteCuadernoPieces(
  items: readonly CotizacionWorkflowItem[],
  pricingMode: QuotePricingMode
) {
  return items.filter((item) => isCuadernoPieceIncomplete(item, pricingMode)).length;
}

export function buildCuadernoPieceView(
  item: CotizacionWorkflowItem,
  pricingMode: QuotePricingMode,
  lineTemplate: CotizacionLineTemplate | null = null
): PieceDomainView & { priorityStatus: CuadernoPiecePriorityStatus; priorityLabel: string } {
  const view = buildPieceDomainView(item, pricingMode, lineTemplate);
  const priorityStatus = deriveCuadernoPiecePriorityStatus(item, pricingMode, lineTemplate);
  return {
    ...view,
    priorityStatus,
    priorityLabel: CUADERNO_PIECE_PRIORITY_LABELS[priorityStatus],
  };
}
