import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

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
};

export function buildPasoDosWizardMovilState({
  draft,
  pricingMode,
  quotePricingMode = "por_item",
}: Params): PasoDosWizardMovilState {
  const activePricingMode = draft.pricingMode ?? pricingMode;
  const cantidadDisplayValue = draft.usaCantidadPersonalizada
    ? draft.cantidadPersonalizada
    : String(draft.cantidad);
  const canContinueFromQuantity =
    !draft.usaCantidadPersonalizada ||
    (draft.cantidadPersonalizada.trim() !== "" &&
      Number(draft.cantidadPersonalizada) > 0);
  const isTrabajoPersonalizado = draft.subtipo === "Trabajo personalizado";
  const hasCustomDescription =
    (draft.nombre ?? "").trim() !== "" || (draft.descripcion ?? "").trim() !== "";
  const hasCommercialDetail =
    isTrabajoPersonalizado
      ? hasCustomDescription
      : draft.sistema.trim() !== "" && draft.vidrio.trim() !== "" && isPositiveNumber(draft.ancho) && isPositiveNumber(draft.alto);
  const hasRequiredPrice =
    quotePricingMode === "total_global"
      ? true
      : isPositiveNumber(draft.precio) &&
        (activePricingMode === "precio_directo" || draft.margenPct !== "");
  const canSubmitGroup = hasCommercialDetail && hasRequiredPrice;
  const priceLabel =
    activePricingMode === "precio_directo" ? "Precio unitario" : "Costo base";
  const priceHelp =
    activePricingMode === "precio_directo"
      ? "Valor por unidad que cobras al cliente."
      : "Base para calcular la venta con margen.";

  return {
    activePricingMode,
    cantidadDisplayValue,
    canContinueFromQuantity,
    canSubmitGroup,
    priceLabel,
    priceHelp,
  };
}
