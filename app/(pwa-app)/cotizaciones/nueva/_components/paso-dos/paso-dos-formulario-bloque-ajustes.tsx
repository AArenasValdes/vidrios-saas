"use client";

import { COLOR_OPTIONS } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosFormularioComponenteProps,
  "componentForm" | "isMobileViewport" | "onComponentChange"
>;

export function PasoDosFormularioBloqueAjustes({
  componentForm,
  isMobileViewport,
  onComponentChange,
}: Props) {
  return (
    <details className={`${s.formSection} ${s.advancedSection} ${s.stepTwoSectionSoft}`}>
      <summary className={`${s.mobileMoreButton} ${s.advancedSummaryButton}`}>
        {isMobileViewport ? "Mas opciones" : "Ver opciones avanzadas"}
      </summary>

      <div className={s.formSectionHead}>
        <span className={s.formSectionEyebrow}>Ajustes</span>
        <strong>{isMobileViewport ? "Linea y color" : "Linea, color y ajustes"}</strong>
        {!isMobileViewport ? (
          <p>Aqui puedes corregir la sugerencia si este componente necesita algo distinto.</p>
        ) : null}
      </div>

      <div className={s.formGrid2}>
        <label className={s.field}>
          <span className={s.label}>Referencia o linea habitual</span>
          <input
            className={s.input}
            value={componentForm.referencia}
            onChange={(event) => onComponentChange("referencia", event.target.value)}
            placeholder="Ej: S60, Serie 25, linea propia del maestro"
          />
          {!isMobileViewport ? (
            <span className={s.helpText}>Opcional. Solo aparece en el PDF si la cargas.</span>
          ) : null}
        </label>
      </div>

      <div className={`${s.field} ${s.fieldFull}`}>
        <span className={s.label}>Color</span>
        <div className={s.colorSwatches}>
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.hex}
              type="button"
              title={color.label}
              className={`${s.colorSwatch} ${componentForm.colorHex === color.hex ? s.colorSwatchActive : ""}`}
              style={{ background: color.hex }}
              onClick={() => onComponentChange("colorHex", color.hex)}
            />
          ))}
        </div>
        <div className={s.colorLabel}>
          {COLOR_OPTIONS.find((color) => color.hex === componentForm.colorHex)?.label ?? "Color"}
        </div>
      </div>
    </details>
  );
}
