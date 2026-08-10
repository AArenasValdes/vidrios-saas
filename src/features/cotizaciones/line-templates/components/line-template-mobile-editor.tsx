"use client";

import Link from "next/link";
import { LuArrowLeft, LuCheck, LuChevronRight, LuInfo, LuX } from "react-icons/lu";

import { formatCurrencyInput } from "@/features/cotizaciones/new-quote/workflow-ui";
import type {
  CotizacionLineTemplateCategoria,
  CotizacionLineTemplateMaterial,
  CotizacionLineTemplateUnidadCobro,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  LINE_TEMPLATE_CATEGORIA_LABELS,
  LINE_TEMPLATE_UNIDAD_LABELS,
} from "@/features/cotizaciones/line-templates/utils/catalog-labels";

import {
  applyLineUsageMode,
  resolveLineUsageMode,
  type LineTemplateFormDraft,
  type LineUsageMode,
} from "./line-template-form-wizard";
import s from "./line-template-mobile-editor.module.css";

const ROUNDING_OPTIONS = [
  { value: "0", label: "Sin redondeo" },
  { value: "1000", label: "A $1.000" },
  { value: "5000", label: "A $5.000" },
  { value: "10000", label: "A $10.000" },
] as const;

const LINE_SYSTEM_OPTIONS = [
  "Corredera",
  "Fija",
  "Proyectante",
  "Puerta",
  "Shower",
  "Cristal",
  "Otro",
] as const;

const USAGE_OPTIONS: Array<{
  value: LineUsageMode;
  title: string;
  description: string;
}> = [
  {
    value: "solo_cotizar",
    title: "Solo cotizar",
    description: "Usa precio y mínimo. No calcula materiales.",
  },
  {
    value: "con_estimacion",
    title: "Estimar materiales",
    description: "Entrega una referencia de consumo, sin pauta validada.",
  },
  {
    value: "cubicacion_pauta",
    title: "Cubicación y pauta",
    description: "Permite preparar y validar una receta para el taller.",
  },
];

type Props = {
  sheetMode: "new" | "edit";
  step: number;
  onStepChange: (step: number) => void;
  draft: LineTemplateFormDraft;
  onDraftChange: <K extends keyof LineTemplateFormDraft>(
    key: K,
    value: LineTemplateFormDraft[K]
  ) => void;
  onDraftPatch: (patch: Partial<LineTemplateFormDraft>) => void;
  isGlassDraft: boolean;
  saveDisabled: boolean;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  technicalAdminHref?: string | null;
};

function moneyValue(value: string) {
  return value ? formatCurrencyInput(value.replace(/[^\d]/g, "")) : "";
}

function priceLabel(unit: CotizacionLineTemplateUnidadCobro | "") {
  if (unit === "metro_lineal") return "Precio por metro lineal";
  if (unit === "unidad") return "Precio por unidad";
  if (unit === "valor_manual") return "Precio de referencia";
  return "Precio por m²";
}

export function LineTemplateMobileEditor({
  sheetMode,
  step,
  onStepChange,
  draft,
  onDraftChange,
  onDraftPatch,
  isGlassDraft,
  saveDisabled,
  isSaving,
  onSave,
  onClose,
  technicalAdminHref,
}: Props) {
  const activeStep = step === 2 ? 2 : 1;
  const usageMode = resolveLineUsageMode(draft);

  return (
    <section
      className={s.screen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-line-editor-title"
    >
      <header className={s.header}>
        <button
          type="button"
          className={s.headerButton}
          onClick={activeStep === 2 ? () => onStepChange(1) : onClose}
          aria-label={activeStep === 2 ? "Volver a datos básicos" : "Cerrar editor"}
        >
          {activeStep === 2 ? <LuArrowLeft aria-hidden /> : <LuX aria-hidden />}
        </button>
        <div>
          <h2 id="mobile-line-editor-title">
            {sheetMode === "edit" ? "Editar línea" : "Nueva línea"}
          </h2>
          <p>{activeStep === 1 ? "Datos comerciales" : "Cómo usarás esta línea"}</p>
        </div>
        <span className={s.stepCount}>{activeStep} de 2</span>
      </header>

      <nav className={s.stepper} aria-label="Pasos del editor">
        <button
          type="button"
          className={activeStep === 1 ? s.stepActive : s.stepDone}
          onClick={() => onStepChange(1)}
          aria-current={activeStep === 1 ? "step" : undefined}
        >
          <span>{activeStep > 1 ? <LuCheck aria-hidden /> : "1"}</span>
          Datos básicos
        </button>
        <button
          type="button"
          className={activeStep === 2 ? s.stepActive : ""}
          onClick={() => onStepChange(2)}
          aria-current={activeStep === 2 ? "step" : undefined}
        >
          <span>2</span>
          Uso de la línea
        </button>
      </nav>

      <div className={s.scrollArea}>
        {activeStep === 1 ? (
          <form className={s.form} onSubmit={(event) => event.preventDefault()}>
            <label className={s.field}>
              <span>Nombre de la línea</span>
              <input
                value={draft.nombre}
                onChange={(event) => onDraftChange("nombre", event.target.value)}
                placeholder="Ej. Serie 32"
                autoComplete="off"
              />
            </label>

            <label className={s.field}>
              <span>Categoría</span>
              <select
                value={draft.categoria}
                onChange={(event) =>
                  onDraftChange(
                    "categoria",
                    event.target.value as CotizacionLineTemplateCategoria
                  )
                }
              >
                {Object.entries(LINE_TEMPLATE_CATEGORIA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {!isGlassDraft ? (
              <fieldset className={s.fieldset}>
                <legend>Material del perfil</legend>
                <div className={s.segmented}>
                  {(["Aluminio", "PVC"] as const).map((material) => (
                    <button
                      key={material}
                      type="button"
                      className={draft.material === material ? s.segmentActive : ""}
                      onClick={() =>
                        onDraftChange(
                          "material",
                          material as CotizacionLineTemplateMaterial
                        )
                      }
                      aria-pressed={draft.material === material}
                    >
                      {material}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <label className={s.field}>
              <span>Unidad de cobro</span>
              <select
                value={draft.unidadCobro}
                onChange={(event) =>
                  onDraftChange(
                    "unidadCobro",
                    event.target.value as CotizacionLineTemplateUnidadCobro
                  )
                }
              >
                {Object.entries(LINE_TEMPLATE_UNIDAD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className={s.moneyGrid}>
              <label className={s.field}>
                <span>{priceLabel(draft.unidadCobro)}</span>
                <div className={s.moneyInput}>
                  <span>$</span>
                  <input
                    inputMode="numeric"
                    value={moneyValue(draft.precioM2Sugerido)}
                    onChange={(event) =>
                      onDraftChange(
                        "precioM2Sugerido",
                        event.target.value.replace(/[^\d]/g, "")
                      )
                    }
                    placeholder="0"
                  />
                </div>
              </label>
              <label className={s.field}>
                <span>Mínimo cobrable</span>
                <div className={s.moneyInput}>
                  <span>$</span>
                  <input
                    inputMode="numeric"
                    value={moneyValue(draft.minimoCobrable)}
                    onChange={(event) =>
                      onDraftChange(
                        "minimoCobrable",
                        event.target.value.replace(/[^\d]/g, "")
                      )
                    }
                    placeholder="0"
                  />
                </div>
              </label>
            </div>

            <details className={s.details}>
              <summary>
                Más información
                <span>Proveedor, sistema y costos</span>
              </summary>
              <div className={s.detailsBody}>
                <label className={s.field}>
                  <span>Proveedor</span>
                  <input
                    value={draft.proveedor}
                    onChange={(event) => onDraftChange("proveedor", event.target.value)}
                    placeholder="Opcional"
                  />
                </label>
                <label className={s.field}>
                  <span>Tipo o sistema</span>
                  <select
                    value={draft.lineSystem}
                    onChange={(event) => onDraftChange("lineSystem", event.target.value)}
                  >
                    <option value="">Sin definir</option>
                    {LINE_SYSTEM_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={s.field}>
                  <span>Costo de referencia</span>
                  <div className={s.moneyInput}>
                    <span>$</span>
                    <input
                      inputMode="numeric"
                      value={moneyValue(draft.costoBase)}
                      onChange={(event) =>
                        onDraftChange("costoBase", event.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="0"
                    />
                  </div>
                </label>
                <label className={s.field}>
                  <span>Redondeo del precio</span>
                  <select
                    value={draft.redondeoPrecio}
                    onChange={(event) => onDraftChange("redondeoPrecio", event.target.value)}
                  >
                    {ROUNDING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>

            <label className={s.activeRow}>
              <span>
                <strong>Disponible para cotizar</strong>
                <small>Puedes pausarla sin eliminar sus datos.</small>
              </span>
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => onDraftChange("isActive", event.target.checked)}
              />
            </label>
          </form>
        ) : (
          <div className={s.usageContent}>
            <div className={s.explainer}>
              <LuInfo aria-hidden />
              <p>
                El precio se guarda por separado. Puedes cotizar aunque todavía no prepares
                materiales.
              </p>
            </div>

            <fieldset className={s.usageList}>
              <legend>Elige una opción</legend>
              {USAGE_OPTIONS.map((option) => {
                const selected = usageMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={selected ? s.usageSelected : ""}
                    onClick={() => onDraftPatch(applyLineUsageMode(option.value, draft))}
                    aria-pressed={selected}
                  >
                    <span className={s.radio} aria-hidden>
                      {selected ? <span /> : null}
                    </span>
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.description}</small>
                    </span>
                  </button>
                );
              })}
            </fieldset>

            {technicalAdminHref && usageMode !== "solo_cotizar" ? (
              <Link href={technicalAdminHref} className={s.technicalLink}>
                Administrar fabricación
                <LuChevronRight aria-hidden />
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <footer className={s.footer}>
        {activeStep === 1 ? (
          <button
            type="button"
            className={s.primaryButton}
            disabled={saveDisabled}
            onClick={() => onStepChange(2)}
          >
            Continuar
            <LuChevronRight aria-hidden />
          </button>
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
                : "Crear línea"}
          </button>
        )}
      </footer>
    </section>
  );
}
