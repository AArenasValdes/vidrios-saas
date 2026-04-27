import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import { isPositiveNumber } from "./paso-dos-wizard-movil.utils";

type Params = {
  draft: PasoDosGrupoDraft;
  pricingMode: PricingMode;
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
}: Params): PasoDosWizardMovilState {
  const activePricingMode = draft.pricingMode ?? pricingMode;
  const cantidadDisplayValue = draft.usaCantidadPersonalizada
    ? draft.cantidadPersonalizada
    : String(draft.cantidad);
  const canContinueFromQuantity =
    !draft.usaCantidadPersonalizada ||
    (draft.cantidadPersonalizada.trim() !== "" &&
      Number(draft.cantidadPersonalizada) > 0);
  const canSubmitGroup =
    draft.sistema.trim() !== "" &&
    draft.vidrio.trim() !== "" &&
    isPositiveNumber(draft.ancho) &&
    isPositiveNumber(draft.alto) &&
    isPositiveNumber(draft.precio) &&
    (activePricingMode === "precio_directo" || draft.margenPct !== "");
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
