"use client";

import type { PasoDosFormularioComponenteProps } from "../_types/paso-dos";

import { PasoDosFormularioAcciones } from "./paso-dos/paso-dos-formulario-acciones";
import { PasoDosFormularioBloqueAjustes } from "./paso-dos/paso-dos-formulario-bloque-ajustes";
import { PasoDosFormularioBloqueConfiguracion } from "./paso-dos/paso-dos-formulario-bloque-configuracion";
import { PasoDosFormularioBloqueDetalles } from "./paso-dos/paso-dos-formulario-bloque-detalles";
import { PasoDosFormularioBloqueVidrio } from "./paso-dos/paso-dos-formulario-bloque-vidrio";
import s from "../page.module.css";

export function PasoDosFormularioComponente(props: PasoDosFormularioComponenteProps) {
  const {
    itemsCount,
    editingItemId,
    quotePricingMode,
    onQuotePricingModeChange,
    variant = "default",
  } = props;
  const isMobilePointEdit = variant === "mobilePointEdit";
  const modeLabel = quotePricingMode === "total_global" ? "Total del trabajo" : "Por componentes";
  const nextMode = quotePricingMode === "total_global" ? "por_item" : "total_global";

  return (
    <section
      className={`${s.card} ${s.stepTwoFormCard} ${
        isMobilePointEdit ? s.stepTwoFormCardMobilePointEdit : s.stepTwoFormCardMobile
      }`}
      id="component-form"
    >
      {!isMobilePointEdit ? (
        <>
          <div className={s.cardHeaderRow}>
            <div>
              <div className={s.cardLabel}>Paso 2 / Componentes</div>
              <h2 className={s.cardTitle}>
                {editingItemId ? "Editar componente" : "Agregar componente"}
              </h2>
            </div>
            {itemsCount > 0 ? (
              <span className={s.headerPill}>
                {itemsCount} cargado{itemsCount !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {itemsCount > 0 ? (
            <div className={s.stepTwoModeChip}>
              <span>Modo: {modeLabel}</span>
              <button type="button" onClick={() => onQuotePricingModeChange(nextMode)}>
                Cambiar
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <div className={isMobilePointEdit ? s.stepTwoMobilePointEditFields : s.formFields}>
        <PasoDosFormularioBloqueConfiguracion {...props} />
        <PasoDosFormularioBloqueAjustes {...props} />
        <PasoDosFormularioBloqueVidrio {...props} />
        <PasoDosFormularioBloqueDetalles {...props} />
      </div>

      {!isMobilePointEdit ? <PasoDosFormularioAcciones {...props} /> : null}
    </section>
  );
}
