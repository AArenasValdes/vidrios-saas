"use client";

import type {
  PasoDosFormularioComponenteProps,
  PasoDosPanelComponentesProps,
} from "../_types/paso-dos";

import { PasoDosFormularioComponente } from "./paso-dos-formulario-componente";
import { PasoDosPanelComponentes } from "./paso-dos-panel-componentes";
import { PasoDosModoCotizacion } from "./paso-dos/paso-dos-modo-cotizacion";
import s from "../page.module.css";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

type PasoDosSeccionProps = {
  formulario: PasoDosFormularioComponenteProps;
  panel: PasoDosPanelComponentesProps;
  onOpenCreator: () => void;
  onSelectMode: (mode: QuotePricingMode) => void;
};

export function PasoDosSeccion({ formulario, panel, onOpenCreator, onSelectMode }: PasoDosSeccionProps) {
  if (panel.items.length === 0 && !formulario.editingItemId) {
    return (
      <PasoDosModoCotizacion
        onSelectMode={(mode) => {
          onSelectMode(mode);
          onOpenCreator();
        }}
      />
    );
  }

  return (
    <div className={s.stepTwoLayout}>
      <PasoDosFormularioComponente {...formulario} />
      <PasoDosPanelComponentes {...panel} />
    </div>
  );
}
