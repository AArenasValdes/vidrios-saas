"use client";

import { LuX } from "react-icons/lu";

import { formatCurrencyInput, normalizeCurrencyInput } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { PasoDosItemLibreFormProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

export function PasoDosItemLibreForm({
  isOpen,
  editingItemId,
  form,
  fieldErrors,
  isSaving,
  onChange,
  onSubmit,
  onCancel,
}: PasoDosItemLibreFormProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section
      className={`${s.card} ${s.stepTwoFormCard} ${s.stepTwoFormCardMobile}`}
      id="component-form"
    >
      <div className={s.cardHeaderRow}>
        <div>
          <div className={s.cardLabel}>Paso 2 / Item libre</div>
          <h2 className={s.cardTitle}>
            {editingItemId ? "Editar item libre" : "Agregar item libre"}
          </h2>
        </div>
        <button className={s.iconButton} type="button" onClick={onCancel} aria-label="Cerrar">
          <LuX aria-hidden />
        </button>
      </div>

      <div className={s.formFields}>
        <label className={s.field}>
          <span>Nombre del item</span>
          <input
            value={form.nombre}
            onChange={(event) => onChange("nombre", event.target.value)}
            placeholder="Ej: Mantencion de ventanas"
          />
          {fieldErrors.nombre ? <small className={s.inlineError}>{fieldErrors.nombre}</small> : null}
        </label>

        <label className={s.field}>
          <span>Descripcion para el cliente</span>
          <textarea
            value={form.descripcion}
            onChange={(event) => onChange("descripcion", event.target.value)}
            placeholder="Ej: Mantencion de 5 ventanas existentes, ajuste de corredera, revision de pestillos y limpieza de rieles."
            rows={4}
          />
        </label>

        <label className={s.field}>
          <span>Valor CLP</span>
          <input
            inputMode="numeric"
            value={formatCurrencyInput(normalizeCurrencyInput(form.valor))}
            onChange={(event) => onChange("valor", normalizeCurrencyInput(event.target.value))}
            placeholder="Ej: 120.000"
          />
          {fieldErrors.costoProveedorUnitario ? (
            <small className={s.inlineError}>{fieldErrors.costoProveedorUnitario}</small>
          ) : null}
        </label>

        <div className={s.field}>
          <span>IVA</span>
          <div className={s.segmentedChoiceGrid}>
            <label
              className={`${s.segmentedChoice} ${
                form.ivaMode === "total_incluye_iva" ? s.segmentedChoiceActive : ""
              }`}
            >
              <input
                type="radio"
                name="free-item-iva-mode"
                checked={form.ivaMode === "total_incluye_iva"}
                onChange={() => onChange("ivaMode", "total_incluye_iva")}
              />
              <strong>Total incluye IVA</strong>
            </label>
            <label
              className={`${s.segmentedChoice} ${
                form.ivaMode === "neto_mas_iva" ? s.segmentedChoiceActive : ""
              }`}
            >
              <input
                type="radio"
                name="free-item-iva-mode"
                checked={form.ivaMode === "neto_mas_iva"}
                onChange={() => onChange("ivaMode", "neto_mas_iva")}
              />
              <strong>Neto + IVA</strong>
            </label>
          </div>
        </div>
      </div>

      <div className={`${s.cardFooter} ${s.stepTwoFormFooter}`}>
        <div className={`${s.footerButtonGroup} ${s.stepTwoFormFooterGroup}`}>
        <button className={s.btnGhost} type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className={s.btnPrimary} type="button" onClick={onSubmit} disabled={isSaving}>
          {editingItemId ? "Guardar item" : "Agregar item"}
        </button>
        </div>
      </div>
    </section>
  );
}
