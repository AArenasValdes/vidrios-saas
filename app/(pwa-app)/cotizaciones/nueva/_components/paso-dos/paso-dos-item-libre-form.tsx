"use client";

import { useMemo } from "react";
import { LuEye, LuX } from "react-icons/lu";

import {
  formatCurrencyInput,
  normalizeCurrencyInput,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { PasoDosItemLibreFormProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

const IVA = 0.19;

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
  const totalCliente =
    form.ivaMode === "total_incluye_iva"
      ? valorNumerico
      : Math.round(valorNumerico * (1 + IVA));
  const tieneValor = valorNumerico > 0;

  const previewFormateado = useMemo(() => {
    if (!tieneValor) {
      return null;
    }

    const neto =
      form.ivaMode === "total_incluye_iva"
        ? Math.round(valorNumerico / (1 + IVA))
        : valorNumerico;
    const iva =
      form.ivaMode === "total_incluye_iva"
        ? valorNumerico - neto
        : Math.round(valorNumerico * IVA);

    return { neto: formatearCLP(neto), iva: formatearCLP(iva), total: formatearCLP(totalCliente) };
  }, [form.ivaMode, tieneValor, totalCliente, valorNumerico]);

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
        </label>

        <div className={s.field}>
          <span className={s.label}>IVA</span>
          <div className={s.ivaCompactRow}>
            <button
              type="button"
              className={`${s.ivaCompactOption} ${
                form.ivaMode === "total_incluye_iva" ? s.ivaCompactOptionActive : ""
              }`}
              onClick={() => onChange("ivaMode", "total_incluye_iva")}
            >
              <span className={s.ivaCompactLabel}>Incluido</span>
            </button>
            <button
              type="button"
              className={`${s.ivaCompactOption} ${
                form.ivaMode === "neto_mas_iva" ? s.ivaCompactOptionActive : ""
              }`}
              onClick={() => onChange("ivaMode", "neto_mas_iva")}
            >
              <span className={s.ivaCompactLabel}>Agregar IVA</span>
            </button>
          </div>
          <span className={s.helpText}>
            {form.ivaMode === "total_incluye_iva"
              ? "El valor ingresado sera el total visible para el cliente."
              : "Ventora sumara el 19% al valor ingresado."}
          </span>
        </div>

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
                <strong>${formatearCLP(totalCliente)}</strong>
              </div>
              {previewFormateado ? (
                <div className={s.freeValuePreviewBreakdown}>
                  {form.ivaMode === "neto_mas_iva" ? (
                    <>
                      <span>Neto ${previewFormateado.neto} + IVA ${previewFormateado.iva}</span>
                    </>
                  ) : (
                    <>
                      <span>IVA incluido (${previewFormateado.iva})</span>
                    </>
                  )}
                </div>
              ) : null}
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
                ? `Agregar item por $${formatearCLP(totalCliente)}`
                : "Agregar item"}
          </button>
        </div>
      </div>
    </section>
  );
}