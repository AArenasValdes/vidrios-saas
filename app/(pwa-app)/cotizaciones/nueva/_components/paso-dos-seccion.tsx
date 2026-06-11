"use client";

import type {
  PasoDosItemLibreFormProps,
  PasoDosFormularioComponenteProps,
  PasoDosPanelComponentesProps,
} from "../_types/paso-dos";

import { PasoDosFormularioComponente } from "./paso-dos-formulario-componente";
import { PasoDosItemLibreForm } from "./paso-dos/paso-dos-item-libre-form";
import { PasoDosPanelComponentes } from "./paso-dos-panel-componentes";
import { PasoDosModoCotizacion } from "./paso-dos/paso-dos-modo-cotizacion";
import s from "../page.module.css";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

type PasoDosSeccionProps = {
  formulario: PasoDosFormularioComponenteProps;
  panel: PasoDosPanelComponentesProps;
  itemLibreForm: PasoDosItemLibreFormProps;
  quoteModeChosen: boolean;
  onOpenCreator: () => void;
  onOpenFreeTotalNotebook: () => void;
  onSelectMode: (mode: QuotePricingMode) => void;
};

export function PasoDosSeccion({
  formulario,
  panel,
  itemLibreForm,
  quoteModeChosen,
  onOpenCreator,
  onOpenFreeTotalNotebook,
  onSelectMode,
}: PasoDosSeccionProps) {
  const showModeChoice =
    panel.items.length === 0 &&
    !formulario.editingItemId &&
    !itemLibreForm.isOpen &&
    !quoteModeChosen;

  if (showModeChoice) {
    return (
      <PasoDosModoCotizacion
        onSelectMode={(mode) => {
          onSelectMode(mode);
          if (mode === "por_item") {
            onOpenCreator();
          }
        }}
        onSelectFreeTotalMode={() => {
          onSelectMode("total_global");
          onOpenFreeTotalNotebook();
        }}
      />
    );
  }

  return (
    <div className={s.stepTwoLayout}>
      {itemLibreForm.isOpen ? (
        <PasoDosItemLibreForm {...itemLibreForm} />
      ) : (
        <PasoDosFormularioComponente {...formulario} />
      )}
      <PasoDosPanelComponentes {...panel} />
    </div>
  );
}
