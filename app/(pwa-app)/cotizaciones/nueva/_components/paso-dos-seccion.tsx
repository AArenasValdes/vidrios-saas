"use client";

import type { ComponentProps } from "react";

import type {
  PasoDosItemLibreFormProps,
  PasoDosFormularioComponenteProps,
  PasoDosPanelComponentesProps,
} from "../_types/paso-dos";

import { PasoDosFormularioComponente } from "./paso-dos-formulario-componente";
import { PasoDosAgregarGrupoEmbedded } from "./paso-dos/paso-dos-agregar-grupo-embedded";
import { PasoDosItemLibreForm } from "./paso-dos/paso-dos-item-libre-form";
import { PasoDosPanelComponentes } from "./paso-dos-panel-componentes";
import { PasoDosModoCotizacion } from "./paso-dos/paso-dos-modo-cotizacion";
import s from "../page.module.css";
import styles from "./paso-dos-seccion.module.css";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

type PasoDosSeccionProps = {
  formulario: PasoDosFormularioComponenteProps;
  panel: PasoDosPanelComponentesProps;
  itemLibreForm: PasoDosItemLibreFormProps;
  quoteModeChosen: boolean;
  onOpenCreator: () => void;
  onOpenFreeTotalNotebook: () => void;
  onSelectMode: (mode: QuotePricingMode) => void;
  addGroupSheet?: ComponentProps<typeof PasoDosAgregarGrupoEmbedded>;
};

export function PasoDosSeccion({
  formulario,
  panel,
  itemLibreForm,
  quoteModeChosen,
  onOpenCreator,
  onOpenFreeTotalNotebook,
  onSelectMode,
  addGroupSheet,
}: PasoDosSeccionProps) {
  const isAssistantOpen = Boolean(addGroupSheet?.isOpen);
  const showModeChoice =
    panel.items.length === 0 &&
    !formulario.editingItemId &&
    !itemLibreForm.isOpen &&
    !quoteModeChosen &&
    !isAssistantOpen;

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
    <div className={styles.workspace}>
      <div className={styles.assistant}>
        {isAssistantOpen && addGroupSheet ? (
          <PasoDosAgregarGrupoEmbedded {...addGroupSheet} />
        ) : itemLibreForm.isOpen ? (
          <PasoDosItemLibreForm {...itemLibreForm} />
        ) : (
          <PasoDosFormularioComponente {...formulario} />
        )}
      </div>

      <div className={styles.panel}>
        <PasoDosPanelComponentes {...panel} />
      </div>
    </div>
  );
}
