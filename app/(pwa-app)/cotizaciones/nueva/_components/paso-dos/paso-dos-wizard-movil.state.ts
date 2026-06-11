import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import {
  isFreeValueComponentType,
  hasPerSystemConfigurations,
} from "@/features/cotizaciones/services/component-catalog.service";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import { isPositiveNumber } from "./paso-dos-wizard-movil.utils";

type Params = {
  draft: PasoDosGrupoDraft;
  pricingMode: PricingMode;
  quotePricingMode?: QuotePricingMode;
};

export type PasoDosWizardMovilState = {
  activePricingMode: PricingMode;
  cantidadDisplayValue: string;
  canContinueFromQuantity: boolean;
  canSubmitGroup: boolean;
  priceLabel: string;
  priceHelp: string;
  shouldShowPriceField: boolean;
};

export function buildPasoDosWizardMovilState({
  draft,
  pricingMode,
  quotePricingMode = "por_item",
}: Params): PasoDosWizardMovilState {
  const isFreeValue = isFreeValueComponentType(draft.subtipo);
  const activePricingMode = isFreeValue ? "precio_directo" : (draft.pricingMode ?? pricingMode);
  const cantidadDisplayValue = draft.usaCantidadPersonalizada
    ? draft.cantidadPersonalizada
    : String(draft.cantidad);
  const canContinueFromQuantity =
    !draft.usaCantidadPersonalizada ||
    (draft.cantidadPersonalizada.trim() !== "" &&
      Number(draft.cantidadPersonalizada) > 0);
  const isTrabajoPersonalizado = draft.subtipo === "Trabajo personalizado";
  const shouldShowPriceField = quotePricingMode !== "total_global" || draft.cobraPrecioSeparado;
  const hasValidMirrorFormat =
    draft.subtipo !== "Espejo" ||
    draft.mirrorFormat !== "divided" ||
    Boolean(draft.mirrorPaneCount && draft.mirrorPaneCount >= 2);
  const hasCustomDescription =
    quotePricingMode === "total_global" && isFreeValue
      ? (draft.nombre ?? "").trim() !== "" && (draft.descripcion ?? "").trim() !== ""
      : (draft.nombre ?? "").trim() !== "" || (draft.descripcion ?? "").trim() !== "";
  const hasPerSystem = hasPerSystemConfigurations(draft.subtipo);
  const hasCommercialDetail =
    isFreeValue
      ? hasCustomDescription
      : isTrabajoPersonalizado
        ? hasCustomDescription
        : draft.sistema.trim() !== "" &&
          (!hasPerSystem || draft.configuracion.trim() !== "") &&
          draft.vidrio.trim() !== "" &&
          hasValidMirrorFormat &&
          isPositiveNumber(draft.ancho) &&
          isPositiveNumber(draft.alto);
  const hasRequiredPrice =
    quotePricingMode === "total_global" && !draft.cobraPrecioSeparado
      ? true
      : isFreeValue
        ? isPositiveNumber(draft.precio)
        : isPositiveNumber(draft.precio) &&
          (activePricingMode === "precio_directo" || draft.margenPct !== "");
  const canSubmitGroup = hasCommercialDetail && hasRequiredPrice;
  const priceLabel =
    isFreeValue ? "Valor a cobrar"
      : activePricingMode === "precio_directo" ? "Valor total" : "Costo base";
  const priceHelp =
    isFreeValue
      ? "El valor que ingreses sera el total visible para el cliente."
      : activePricingMode === "precio_directo"
        ? "Total que cobras por todas las unidades de este grupo."
        : "Base para calcular la venta con margen.";

  return {
    activePricingMode,
    cantidadDisplayValue,
    canContinueFromQuantity,
    canSubmitGroup,
    priceLabel,
    priceHelp,
    shouldShowPriceField,
  };
}
