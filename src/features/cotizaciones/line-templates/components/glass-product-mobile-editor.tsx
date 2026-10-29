"use client";

import {
  LuArrowLeft,
  LuCheck,
  LuChevronRight,
  LuInfo,
  LuX,
} from "react-icons/lu";

import { formatCurrencyInput } from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  GLASS_TECHNICAL_CATEGORIES,
  glassCategoryRequiresTechnicalReview,
  type GlassManualCutStatus,
  type GlassTechnicalCategory,
} from "@/features/cotizaciones/line-templates/types/glass-technical-spec";

import type { LineTemplateFormDraft } from "./line-template-form-wizard";
import s from "./line-template-mobile-editor.module.css";

const ROUNDING_OPTIONS = [
  { value: "0", label: "Sin redondeo" },
  { value: "1000", label: "A $1.000" },
  { value: "5000", label: "A $5.000" },
  { value: "10000", label: "A $10.000" },
] as const;

const GLASS_CATEGORY_LABELS: Record<GlassTechnicalCategory, string> = {
  monolitico: "Monolítico",
  laminado: "Laminado",
  dvh: "DVH",
  templado: "Templado",
  espejo: "Espejo",
  otro: "Otro especial",
  pendiente: "Pendiente de identificar",
};

const MANUAL_CUT_STATUS_LABELS: Record<GlassManualCutStatus, string> = {
  confirmed: "Apto para corte manual",
  not_admitted: "No apto para corte manual",
  pending_validation: "Pendiente de validar",
};

type Props = {
  sheetMode: "new" | "edit";
  step: number;
  onStepChange: (step: number) => void;
  draft: LineTemplateFormDraft;
  onDraftChange: <K extends keyof LineTemplateFormDraft>(
    key: K,
    value: LineTemplateFormDraft[K]
  ) => void;
  saveDisabled: boolean;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

function moneyValue(value: string) {
  return value ? formatCurrencyInput(value.replace(/[^\d]/g, "")) : "";
}

export function GlassProductMobileEditor({
  sheetMode,
  step,
  onStepChange,
  draft,
  onDraftChange,
  saveDisabled,
  isSaving,
  onSave,
  onClose,
}: Props) {
  const activeStep = step === 2 ? 2 : 1;
  const requiresTechnicalReview = glassCategoryRequiresTechnicalReview(draft.categoriaTecnica);
  const manualCutDecisionBlocked = draft.categoriaTecnica === "pendiente" ||
    (requiresTechnicalReview && !draft.revisionTecnicaExplicita);

  return (
    <section
      className={s.screen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-glass-editor-title"
    >
      <header className={s.header}>
        <button
          type="button"
          className={s.headerButton}
          onClick={activeStep === 2 ? () => onStepChange(1) : onClose}
          aria-label={activeStep === 2 ? "Volver a datos del vidrio" : "Cerrar editor"}
        >
          {activeStep === 2 ? <LuArrowLeft aria-hidden /> : <LuX aria-hidden />}
        </button>
        <div>
          <h2 id="mobile-glass-editor-title">
            {sheetMode === "edit" ? "Editar vidrio" : "Nuevo vidrio"}
          </h2>
          <p>{activeStep === 1 ? "Identificación y compra" : "Formato físico para distribuir"}</p>
        </div>
        <span className={s.stepCount}>{activeStep} de 2</span>
      </header>

      <nav className={s.stepper} aria-label="Pasos del editor de vidrio">
        <button
          type="button"
          className={activeStep === 1 ? s.stepActive : s.stepDone}
          onClick={() => onStepChange(1)}
          aria-current={activeStep === 1 ? "step" : undefined}
        >
          <span>{activeStep > 1 ? <LuCheck aria-hidden /> : "1"}</span>
          Datos del vidrio
        </button>
        <button
          type="button"
          className={activeStep === 2 ? s.stepActive : ""}
          onClick={() => onStepChange(2)}
          aria-current={activeStep === 2 ? "step" : undefined}
        >
          <span>2</span>
          Plancha
        </button>
      </nav>

      <div className={s.scrollArea}>
        {activeStep === 1 ? (
          <form className={s.form} onSubmit={(event) => event.preventDefault()}>
            <label className={s.field}>
              <span>Tipo de vidrio</span>
              <input
                value={draft.nombre}
                onChange={(event) => onDraftChange("nombre", event.target.value)}
                placeholder="Ej. Float 10 mm templado"
                autoComplete="off"
              />
            </label>

            <label className={s.field}>
              <span>Espesor técnico (mm)</span>
              <input
                inputMode="decimal"
                value={draft.espesor}
                onChange={(event) => onDraftChange("espesor", event.target.value)}
                placeholder="Ej. 4 o 6,38"
                aria-label="Espesor técnico en milímetros"
              />
              <small>Se guarda solo si está indicado explícitamente; no se deduce del nombre.</small>
            </label>

            <label className={s.field}>
              <span>Categoría técnica</span>
              <select
                value={draft.categoriaTecnica}
                onChange={(event) => onDraftChange("categoriaTecnica", event.target.value as GlassTechnicalCategory)}
                aria-label="Categoría técnica del vidrio"
              >
                {GLASS_TECHNICAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{GLASS_CATEGORY_LABELS[category]}</option>
                ))}
              </select>
            </label>

            <label className={s.field}>
              <span>Forma de compra</span>
              <select
                value={draft.glassPurchaseMode}
                onChange={(event) => onDraftChange("glassPurchaseMode", event.target.value as LineTemplateFormDraft["glassPurchaseMode"])}
                aria-label="Forma de compra del vidrio"
              >
                <option value="undecided">Por definir</option>
                <option value="full_sheet">Plancha completa</option>
                <option value="supplier_cut">Pieza cortada por proveedor</option>
                {draft.glassPurchaseMode === "legacy" ? <option value="legacy">Ficha antigua · compra por confirmar</option> : null}
              </select>
              <small>Se guarda por separado del precio de venta y no se deduce del nombre.</small>
            </label>

            <details className={s.details}>
              <summary>
                Datos técnicos avanzados
                <span>Aptitud de corte y terminación</span>
              </summary>
              <div className={s.detailsBody}>
                <label className={s.field}>
                  <span>Terminación o descripción</span>
                  <input value={draft.terminacion} onChange={(event) => onDraftChange("terminacion", event.target.value)} placeholder="Ej. Low-E, satinado" />
                </label>
                <label className={s.field}>
                  <span>Aptitud para corte manual en taller</span>
                  <select
                    value={draft.corteManualEstado}
                    onChange={(event) => onDraftChange("corteManualEstado", event.target.value as GlassManualCutStatus)}
                    aria-label="Aptitud del producto para corte manual"
                  >
                    {Object.entries(MANUAL_CUT_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value} disabled={value !== "pending_validation" && manualCutDecisionBlocked}>{label}</option>
                    ))}
                  </select>
                  <small>La aptitud se confirma para el material y proceso; no se asigna por nombre.</small>
                </label>
                {requiresTechnicalReview ? (
                  <label className={s.activeRow}>
                    <span>
                      <strong>Revisión técnica especial</strong>
                      <small>Confirma que revisaste las restricciones de {GLASS_CATEGORY_LABELS[draft.categoriaTecnica].toLocaleLowerCase("es-CL")}.</small>
                    </span>
                    <input type="checkbox" checked={draft.revisionTecnicaExplicita} onChange={(event) => onDraftChange("revisionTecnicaExplicita", event.target.checked)} aria-label="Confirmo que realicé la revisión técnica especial" />
                  </label>
                ) : null}
              </div>
            </details>

            <details className={s.details}>
              <summary>Datos comerciales y de compra<span>Opcionales; no habilitan el corte</span></summary>
              <div className={s.detailsBody}>
                <label className={s.field}>
                  <span>Precio de venta por m² (opcional)</span>
                  <div className={`${s.moneyInput} ${s.moneyInputWithSuffix}`}>
                    <span className={s.moneyPrefix}>$</span>
                    <input inputMode="numeric" value={moneyValue(draft.precioM2Sugerido)} onChange={(event) => onDraftChange("precioM2Sugerido", event.target.value.replace(/[^\d]/g, ""))} placeholder="Sin precio" />
                    <span className={s.moneySuffix}>/ m²</span>
                  </div>
                </label>
                <label className={s.field}>
                  <span>Mínimo cobrable (opcional)</span>
                  <div className={s.moneyInput}><span className={s.moneyPrefix}>$</span><input inputMode="numeric" value={moneyValue(draft.minimoCobrable)} onChange={(event) => onDraftChange("minimoCobrable", event.target.value.replace(/[^\d]/g, ""))} placeholder="Sin mínimo" /></div>
                </label>
                <label className={s.field}>
                  <span>Redondeo del precio</span>
                  <select value={draft.redondeoPrecio} onChange={(event) => onDraftChange("redondeoPrecio", event.target.value)}>{ROUNDING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                </label>
                <label className={s.field}>
                  <span>Costo de compra (opcional)</span>
                  <div className={s.moneyInput}><span className={s.moneyPrefix}>$</span><input inputMode="numeric" value={moneyValue(draft.costoBase)} onChange={(event) => onDraftChange("costoBase", event.target.value.replace(/[^\d]/g, ""))} placeholder="Sin costo" /></div>
                </label>
                <label className={s.field}>
                  <span>Proveedor (opcional)</span>
                  <input value={draft.proveedor} onChange={(event) => onDraftChange("proveedor", event.target.value)} placeholder="Ej. Vidrios del Sur" />
                </label>
                <label className={s.field}>
                  <span>Merma comercial (%)</span>
                  <input inputMode="decimal" value={draft.mermaPct} onChange={(event) => onDraftChange("mermaPct", event.target.value)} placeholder="0" />
                  <small>No cambia los despuntes ni la separación física de la simulación.</small>
                </label>
              </div>
            </details>

            <label className={s.activeRow}>
              <span>
                <strong>Disponible para cotizar</strong>
                <small>Puedes pausarlo sin eliminar sus datos.</small>
              </span>
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => onDraftChange("isActive", event.target.checked)}
              />
            </label>
          </form>
        ) : draft.glassPurchaseMode === "supplier_cut" ? (
          <div className={s.usageContent}>
            <div className={s.explainer}>
              <LuInfo aria-hidden />
              <p>Este producto se compra cortado por proveedor. Puedes guardarlo y cotizarlo; no se distribuirá como plancha de corte del taller.</p>
            </div>
          </div>
        ) : draft.glassPurchaseMode === "undecided" ? (
          <div className={s.usageContent}>
            <div className={s.explainer}>
              <LuInfo aria-hidden />
              <p>Elige si compras el vidrio por plancha o ya cortado. Puedes guardar la ficha incompleta y definirlo después.</p>
            </div>
          </div>
        ) : (
          <div className={s.usageContent}>
            <div className={s.explainer}>
              <LuInfo aria-hidden />
              <p>
                Ingresa el formato físico. Puedes guardar el producto antes de tenerlo; la distribución lo solicitará conservando las medidas finales de los paños.
              </p>
            </div>

            <form className={s.form} onSubmit={(event) => event.preventDefault()}>
              <label className={s.field}>
                <span>Orientación de corte del vidrio</span>
                <select value={draft.pieceOrientation} onChange={(event) => onDraftChange("pieceOrientation", event.target.value as LineTemplateFormDraft["pieceOrientation"])}>
                  <option value="unknown">Sin confirmar</option>
                  <option value="fixed">No se gira</option>
                  <option value="rotatable">Se puede girar 90°</option>
                  <option value="grain_or_coating_directional">Direccional; no se gira</option>
                </select>
                <small>Define el giro de los paños. No cambia las dimensiones finales que ingresaste.</small>
              </label>
              <div className={s.moneyGrid}>
                <label className={s.field}>
                  <span>Ancho de plancha (mm)</span>
                  <input
                    inputMode="numeric"
                    value={draft.planchaAnchoMm}
                    onChange={(event) => onDraftChange("planchaAnchoMm", event.target.value)}
                    placeholder="Ej. 3210"
                  />
                </label>
                <label className={s.field}>
                  <span>Alto de plancha (mm)</span>
                  <input
                    inputMode="numeric"
                    value={draft.planchaAltoMm}
                    onChange={(event) => onDraftChange("planchaAltoMm", event.target.value)}
                    placeholder="Ej. 2250"
                  />
                </label>
              </div>
              <p className={s.validationHint} role="status">
                Capacidad de corte: se calculará con las medidas finales de cada paño y este formato. La merma comercial no se usa como despunte ni como separación física.
              </p>
            </form>
          </div>
        )}
      </div>

      <footer className={s.footer} style={activeStep === 1 ? { display: "grid", gap: 8 } : undefined}>
        {activeStep === 1 ? (
          <>
            <button
              type="button"
              className={s.primaryButton}
              disabled={saveDisabled}
              onClick={() => onStepChange(2)}
            >
              Formato de plancha
              <LuChevronRight aria-hidden />
            </button>
            <button
              type="button"
              className={s.primaryButton}
              disabled={saveDisabled || isSaving}
              onClick={onSave}
              style={{
                color: "#17304f",
                background: "#eef2f7",
                boxShadow: "none",
              }}
            >
              {isSaving ? "Guardando…" : "Guardar producto"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={s.primaryButton}
            disabled={saveDisabled || isSaving}
            onClick={onSave}
          >
            {isSaving
              ? "Guardando…"
              : sheetMode === "edit"
                ? "Guardar cambios"
                : "Guardar vidrio"}
          </button>
        )}
      </footer>
    </section>
  );
}
