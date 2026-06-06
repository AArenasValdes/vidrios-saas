"use client";

import { LuEye, LuX } from "react-icons/lu";

import {
  formatCurrencyInput,
  normalizeCurrencyInput,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { PasoDosItemLibreFormProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

function formatearCLP(valor: number): string {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 0,
  }).format(valor);
}

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
  const valorNumerico = Number(normalizeCurrencyInput(form.valor)) || 0;
  const tieneValor = valorNumerico > 0;

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
          <p className={s.cardSubtitle}>
            Redacta el trabajo y define el valor que vera el cliente.
          </p>
        </div>
        <button className={s.iconButton} type="button" onClick={onCancel} aria-label="Cerrar">
          <LuX aria-hidden />
        </button>
      </div>

      <div className={s.formFields}>
        <label className={s.field}>
          <span className={s.label}>Nombre del item</span>
          <input
            className={s.input}
            value={form.nombre}
            onChange={(event) => onChange("nombre", event.target.value)}
            placeholder="Ej: Mantencion de ventanas"
          />
          {fieldErrors.nombre ? (
            <small className={s.inlineError}>{fieldErrors.nombre}</small>
          ) : null}
        </label>

        <label className={s.field}>
          <span className={s.label}>Descripcion para cliente</span>
          <textarea
            className={s.textarea}
            value={form.descripcion}
            onChange={(event) => onChange("descripcion", event.target.value)}
            placeholder="Ej: Mantencion de 5 ventanas existentes, ajuste de corredera, revision de pestillos y limpieza de rieles."
            rows={3}
          />
        </label>

        <div className={s.suggestionChips}>
          <span className={s.suggestionChipsLabel}>Sugerencias:</span>
          {["Cambio de vidrio", "Mantencion", "Sellado", "Reparacion shower", "Otro"].map(
            (chip) => (
              <button
                key={chip}
                type="button"
                className={`${s.suggestionChip} ${
                  form.nombre === chip ? s.suggestionChipActive : ""
                }`}
                onClick={() => onChange("nombre", chip)}
              >
                {chip}
              </button>
            )
          )}
        </div>

        <label className={s.field}>
          <span className={s.label}>Valor a cobrar</span>
          <input
            className={s.input}
            inputMode="numeric"
            value={formatCurrencyInput(normalizeCurrencyInput(form.valor))}
            onChange={(event) => onChange("valor", normalizeCurrencyInput(event.target.value))}
            placeholder="Ej: 120.000"
          />
          {fieldErrors.costoProveedorUnitario ? (
            <small className={s.inlineError}>
              {fieldErrors.costoProveedorUnitario}
            </small>
          ) : null}
          <span className={s.helpText}>
            Este valor seguira la configuracion de IVA de la cotizacion.
          </span>
        </label>

        {tieneValor ? (
          <div className={s.freeValuePreviewCard}>
            <div className={s.freeValuePreviewHeader}>
              <LuEye size={15} aria-hidden />
              <span>Asi se vera en el PDF:</span>
            </div>
            <div className={s.freeValuePreviewBody}>
              <strong>{form.nombre.trim() || "Item libre"}</strong>
              {form.descripcion.trim() ? (
                <p>{form.descripcion}</p>
              ) : null}
              <div className={s.freeValuePreviewTotal}>
                <span>Total</span>
                <strong>${formatearCLP(valorNumerico)}</strong>
              </div>
              <div className={s.freeValuePreviewBreakdown}>
                <span>El IVA se definira en el resumen de la cotizacion.</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className={`${s.cardFooter} ${s.stepTwoFormFooter}`}>
        <div className={`${s.footerButtonGroup} ${s.stepTwoFormFooterGroup}`}>
          <button className={s.btnGhost} type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={s.btnPrimary}
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
          >
            {editingItemId
              ? "Guardar item"
              : tieneValor
                ? `Agregar item por $${formatearCLP(valorNumerico)}`
                : "Agregar item"}
          </button>
        </div>
      </div>
    </section>
  );
}
