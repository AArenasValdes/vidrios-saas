"use client";

import { buildAutoComponentName } from "@/features/cotizaciones/new-quote/workflow-ui";
import { isFreeValueComponentType } from "@/features/cotizaciones/services/component-catalog.service";
import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosFormularioComponenteProps,
  "editingItemId" | "componentForm" | "fieldErrors" | "isMobileViewport" | "onComponentChange"
>;

export function PasoDosFormularioBloqueDetalles({
  editingItemId,
  componentForm,
  fieldErrors,
  isMobileViewport,
  onComponentChange,
}: Props) {
  const isTrabajoPersonalizado =
    componentForm.tipo === "Trabajo personalizado" || isFreeValueComponentType(componentForm.tipo);

  return (
    <details
      className={`${s.formSection} ${s.advancedSection} ${
        isTrabajoPersonalizado ? s.stepTwoSectionStrong : s.stepTwoSectionSoft
      }`}
      open={isTrabajoPersonalizado ? true : undefined}
    >
      <summary className={`${s.mobileMoreButton} ${s.advancedSummaryButton}`}>
        {isTrabajoPersonalizado
          ? "Descripcion del trabajo"
          : isMobileViewport
            ? editingItemId
              ? "Codigo y nombre"
              : "Nombre del espacio"
            : "Codigo, cantidad y detalles"}
      </summary>

      <div className={s.formGrid2}>
        {!isMobileViewport || editingItemId ? (
          <label className={s.field}>
            <span className={s.label}>
              Codigo <span className={s.required}>*</span>
            </span>
            <input
              className={`${s.input} ${s.inputMono} ${fieldErrors.codigo ? s.inputError : ""}`}
              value={componentForm.codigo}
              onChange={(event) => onComponentChange("codigo", event.target.value.toUpperCase())}
              placeholder="V1"
            />
            {fieldErrors.codigo ? <span className={s.fieldError}>{fieldErrors.codigo}</span> : null}
          </label>
        ) : null}

        {!isMobileViewport || editingItemId ? (
          <label className={s.field}>
            <span className={s.label}>
              {isMobileViewport ? "Unidades de esta misma pieza" : "Cantidad por componente"}
            </span>
            <input
              className={`${s.input} ${fieldErrors.cantidad ? s.inputError : ""}`}
              type="number"
              min="1"
              step="1"
              value={componentForm.cantidad}
              onChange={(event) => onComponentChange("cantidad", event.target.value)}
            />
            {fieldErrors.cantidad ? <span className={s.fieldError}>{fieldErrors.cantidad}</span> : null}
          </label>
        ) : null}
      </div>

      <div className={s.formGrid2}>
        <label className={s.field}>
          <span className={s.label}>
            {isTrabajoPersonalizado
              ? "Nombre del trabajo"
              : isMobileViewport
                ? "Espacio o ubicacion (opcional)"
                : "Nombre visible"}
          </span>
          <input
            className={`${s.input} ${fieldErrors.nombre ? s.inputError : ""}`}
            value={componentForm.nombre}
            onChange={(event) => onComponentChange("nombre", event.target.value)}
            placeholder={
              isTrabajoPersonalizado
                ? "Ej: Cierre terraza a medida"
                : isMobileViewport
                  ? "Ej: Living, cocina, bano"
                  : "Ej: Ventana living"
            }
          />
          <span className={s.helpText}>
            {isTrabajoPersonalizado
              ? "Este nombre aparece como detalle del alcance."
              : isMobileViewport
                ? `Si lo dejas vacio, se vera como ${buildAutoComponentName(componentForm)}.`
                : `Opcional. Si lo dejas vacio, usamos ${buildAutoComponentName(componentForm)}.`}
          </span>
        </label>
      </div>

      {!isMobileViewport || editingItemId || isTrabajoPersonalizado ? (
        <div className={s.formGrid2}>
          <label className={s.field}>
            <span className={s.label}>
              {isTrabajoPersonalizado ? "Descripcion para cliente" : "Descripcion comercial"}
            </span>
            <textarea
              className={s.textarea}
              rows={isTrabajoPersonalizado ? 4 : 2}
              value={componentForm.descripcion}
              onChange={(event) => onComponentChange("descripcion", event.target.value)}
              placeholder={
                isTrabajoPersonalizado
                  ? "Ej: Cierre de terraza con 4 hojas, sistema especial, fabricacion a medida e instalacion incluida."
                  : "Ej: Ventana corredera 2 hojas color negro linea S60, vidrio 5mm."
              }
            />
          </label>
        </div>
      ) : null}
    </details>
  );
}
