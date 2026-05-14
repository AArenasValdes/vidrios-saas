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
        <strong>{isMobileViewport ? "Color y detalles" : "Color y detalles visuales"}</strong>
        {!isMobileViewport ? (
          <p>Aqui puedes ajustar color y otros detalles visuales del componente.</p>
        ) : null}
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
