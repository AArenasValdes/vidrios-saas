import type { FabricationWorkOrder } from "./fabrication-work-order.service";

export const DISTRIBUCION_REFERENCIAL_LABEL = "Distribución referencial";
export const DISTRIBUCION_REFERENCIAL_NOTA = "Los cortes están calculados. Antes de cortar, confirma la pérdida de sierra y el despunte para ajustar la distribución de barras";
export const DISTRIBUCION_REFERENCIAL_PIE = "Distribución referencial · Confirmar parámetros del taller antes de cortar";

export function isReferentialOnlyWorkOrder(order: FabricationWorkOrder): boolean {
  return order.documentStatus.state === "partial"
    && order.cutPlanPhysicalState === "teorica"
    && order.hasJointBars
    && order.cutGroups.length > 0
    && order.documentStatus.pendingComponents.length === 0
    && order.preliminaryCutGroups.length === 0
    && order.reviewCutGroups.length === 0;
}
