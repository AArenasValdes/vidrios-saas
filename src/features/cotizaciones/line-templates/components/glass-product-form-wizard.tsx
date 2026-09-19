"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuBadgeDollarSign,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuLayers,
  LuSlidersHorizontal,
  LuTag,
  LuTruck,
  LuX,
} from "react-icons/lu";

import { formatCurrencyInput } from "@/features/cotizaciones/new-quote/workflow-ui";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatLineTemplatePriceLabel } from "@/features/cotizaciones/line-templates/utils/catalog-labels";

import type { LineTemplateFormDraft } from "./line-template-form-wizard";
import { GlassProductMobileEditor } from "./glass-product-mobile-editor";
import s from "./lineas-precios-page-client.module.css";

const ROUNDING_OPTIONS = [
  { value: "0", label: "Sin redondeo" },
  { value: "1000", label: "Redondear a $1.000" },
  { value: "5000", label: "Redondear a $5.000" },
  { value: "10000", label: "Redondear a $10.000" },
] as const;

type Props = {
  sheetMode: "new" | "edit";
  wizardStep: number;
  onWizardStepChange: (step: number) => void;
  draft: LineTemplateFormDraft;
  onDraftChange: <K extends keyof LineTemplateFormDraft>(
    key: K,
    value: LineTemplateFormDraft[K]
  ) => void;
  showAdvancedDetails: boolean;
  onShowAdvancedDetailsChange: (show: boolean) => void;
  saveDisabled: boolean;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  pricePerM2: number;
  costoBase: number;
};

function getDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatMoneyDigits(value: string) {
  return formatCurrencyInput(getDigits(value));
}

function hasSheetFormatDraft(draft: LineTemplateFormDraft) {
  return Boolean(
    draft.planchaAnchoMm.trim() ||
      draft.planchaAltoMm.trim() ||
      draft.costoBase.trim() ||
      draft.mermaPct.trim()
  );
}

export function GlassProductFormWizard({
  sheetMode,
  wizardStep,
  onWizardStepChange,
  draft,
  onDraftChange,
  showAdvancedDetails,
  onShowAdvancedDetailsChange,
  saveDisabled,
  isSaving,
  onSave,
  onClose,
  pricePerM2,
  costoBase,
}: Props) {
  const sheetBodyRef = useRef<HTMLDivElement | null>(null);
  const moreDetailsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isDesktopLayout, setIsDesktopLayout] = useState<boolean | null>(null);

  const maxStep = 2;
  const openStep = Math.min(wizardStep, maxStep);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => setIsDesktopLayout(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    sheetBodyRef.current?.scrollTo({ top: 0 });
  }, [openStep]);

  if (isDesktopLayout === null) {
    return (
      <div className={s.wizardLoadingOverlay} role="status" aria-live="polite">
        <div className={s.wizardLoading}>Preparando editor...</div>
      </div>
    );
  }

  if (!isDesktopLayout) {
    return (
      <GlassProductMobileEditor
        sheetMode={sheetMode}
        step={openStep}
        onStepChange={onWizardStepChange}
        draft={draft}
        onDraftChange={onDraftChange}
        saveDisabled={saveDisabled}
        isSaving={isSaving}
        onSave={onSave}
        onClose={onClose}
      />
    );
  }

  const step1Summary = [
    draft.nombre.trim() || "Sin tipo",
    pricePerM2 > 0 ? formatLineTemplatePriceLabel("m2", pricePerM2, formatCurrency) : "Sin precio",
    draft.isActive ? "Activo" : "Inactivo",
  ].join(" · ");

  const step2Summary = hasSheetFormatDraft(draft)
    ? [
        draft.planchaAnchoMm && draft.planchaAltoMm
          ? `${draft.planchaAnchoMm} × ${draft.planchaAltoMm} mm`
          : "Plancha sin medidas",
        costoBase > 0 ? `Compra ${formatCurrency(costoBase)}` : "Sin costo de plancha",
        draft.mermaPct.trim() ? `Merma ${draft.mermaPct}%` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Sin formato configurado (opcional)";

  const renderStepHeader = (
    stepId: number,
    title: string,
    subtitle: string,
    summary: string,
    isComplete: boolean
  ) => {
    const isOpen = openStep === stepId;
    return (
      <button
        type="button"
        className={`${s.wizardStepHeader} ${isOpen ? s.wizardStepHeaderOpen : ""} ${
          isComplete ? s.wizardStepHeaderComplete : ""
        }`}
        onClick={() => onWizardStepChange(stepId)}
        aria-expanded={isOpen}
      >
        <span className={s.wizardStepBadge}>
          {isComplete && !isOpen ? <LuCheck aria-hidden /> : stepId}
        </span>
        <span className={s.wizardStepHeaderCopy}>
          <strong>{title}</strong>
          <span>{isOpen ? subtitle : summary}</span>
        </span>
        {isOpen ? <LuChevronUp aria-hidden /> : <LuChevronDown aria-hidden />}
      </button>
    );
  };

  const handleNext = () => onWizardStepChange(Math.min(openStep + 1, maxStep));
  const handleBack = () => onWizardStepChange(Math.max(openStep - 1, 1));

  return (
    <div className={s.overlay} role="presentation" onClick={onClose}>
      <section
        className={`${s.sheet} ${s.sheetWizard}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="glass-product-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={s.sheetHandle} />

        <header className={s.sheetHeader}>
          <div className={s.wizardHeaderTop}>
            <div className={s.sheetHeaderCopy}>
              <h2 id="glass-product-title">
                {sheetMode === "edit" ? "Editar vidrio" : "Nuevo vidrio"}
              </h2>
              <p>
                {openStep === 1
                  ? "Paso 1: tipo de vidrio y precio de venta por m²."
                  : "Paso 2: formato de plancha y costo de compra (opcional)."}
              </p>
            </div>
            <button type="button" className={s.sheetClose} onClick={onClose} aria-label="Cerrar">
              <LuX aria-hidden />
            </button>
          </div>

          {openStep > 1 ? (
            <div className={s.wizardCompactSummary} aria-label="Resumen del vidrio">
              <span>
                <strong>Venta</strong>
                {pricePerM2 > 0
                  ? formatLineTemplatePriceLabel("m2", pricePerM2, formatCurrency)
                  : "Pendiente"}
              </span>
              <span>
                <strong>Compra</strong>
                {costoBase > 0 ? formatCurrency(costoBase) : "Sin plancha"}
              </span>
              <span>
                <strong>Estado</strong>
                {draft.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          ) : null}

          <nav className={s.wizardProgress} aria-label="Progreso del asistente de vidrio">
            {[
              { id: 1, label: "Datos del vidrio" },
              { id: 2, label: "Formato y costo" },
            ].map((step) => {
              const isActive = openStep === step.id;
              const isDone = openStep > step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`${s.wizardProgressItem} ${
                    isActive ? s.wizardProgressItemActive : ""
                  } ${isDone ? s.wizardProgressItemDone : ""}`}
                  onClick={() => onWizardStepChange(step.id)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className={s.wizardProgressDot}>
                    {isDone ? <LuCheck aria-hidden /> : step.id}
                  </span>
                  <span className={s.wizardProgressLabel}>{step.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <div className={`${s.sheetBody} ${s.wizardBodyWorkspace}`} ref={sheetBodyRef}>
          <article
            className={`${s.wizardStep} ${openStep === 1 ? s.wizardStepOpen : ""} ${
              openStep !== 1 ? s.wizardStepCollapsed : ""
            }`}
          >
            {openStep !== 1
              ? renderStepHeader(
                  1,
                  "Datos del vidrio",
                  "Tipo, precio de venta y mínimo cobrable",
                  step1Summary,
                  openStep > 1
                )
              : null}
            {openStep === 1 ? (
              <div className={`${s.wizardStepBody} ${s.wizardStepBodyWide}`}>
                <div className={s.wizardStep1Surface}>
                  <div className={s.wizardStep1Layout}>
                    <section className={s.wizardStep1Section}>
                      <div className={s.wizardFieldGroupHead}>
                        <LuTag aria-hidden />
                        <div>
                          <strong>Identidad del cristal</strong>
                          <span>Así aparecerá al cotizar piezas de vidrio</span>
                        </div>
                      </div>

                      <label className={`${s.fieldBlock} ${s.fieldSpan2}`}>
                        <span className={s.fieldLabel}>Tipo de vidrio</span>
                        <input
                          className={s.textInput}
                          value={draft.nombre}
                          onChange={(event) => onDraftChange("nombre", event.target.value)}
                          placeholder="Ej: Float 10 mm templado, Laminado 3+3"
                        />
                      </label>
                    </section>

                    <section className={s.wizardStep1Section}>
                      <div className={s.wizardFieldGroupHead}>
                        <LuBadgeDollarSign aria-hidden />
                        <div>
                          <strong>Precio comercial</strong>
                          <span>Lo que cobrarás al cliente por metro cuadrado</span>
                        </div>
                      </div>

                      <div className={`${s.pricingFieldsStack} ${s.pricingFieldsWide}`}>
                        <label
                          className={`${s.fieldBlock} ${s.fieldHighlight} ${s.pricingSaleField}`}
                        >
                          <span className={s.fieldLabel}>
                            Precio de venta por m²
                            <em className={s.pricingUnitMark}>/ m²</em>
                          </span>
                          <span className={s.pricingFieldHelp}>
                            Valor comercial por metro cuadrado vendido al cliente.
                          </span>
                          <div className={s.moneyWrap}>
                            <span className={s.moneyPrefix}>$</span>
                            <input
                              className={`${s.moneyInput} ${s.moneyInputPrimary} ${s.moneyInputWithSuffix}`}
                              inputMode="numeric"
                              value={formatMoneyDigits(draft.precioM2Sugerido)}
                              onChange={(event) =>
                                onDraftChange("precioM2Sugerido", getDigits(event.target.value))
                              }
                              placeholder="Ej: 65.000"
                            />
                            <span className={s.moneySuffix}>/ m²</span>
                          </div>
                        </label>

                        <label className={`${s.fieldBlock} ${s.pricingCostField}`}>
                          <span className={s.fieldLabel}>
                            Mínimo cobrable
                            <em className={s.optionalMark}>Opcional</em>
                          </span>
                          <span className={s.pricingFieldHelp}>
                            Si el cálculo por m² queda bajo, se cobra este mínimo.
                          </span>
                          <div className={s.moneyWrap}>
                            <span className={s.moneyPrefix}>$</span>
                            <input
                              className={s.moneyInput}
                              inputMode="numeric"
                              value={formatMoneyDigits(draft.minimoCobrable)}
                              onChange={(event) =>
                                onDraftChange("minimoCobrable", getDigits(event.target.value))
                              }
                              placeholder="Ej: 95.000"
                            />
                          </div>
                        </label>
                      </div>
                    </section>
                  </div>

                  <div className={`${s.activeCard} ${s.activeCardInline} ${s.wizardStep1ActiveRow}`}>
                    <div className={s.activeCardCopy}>
                      <strong>Usar en cotizaciones</strong>
                      <span>Si está apagado, no aparece al cotizar.</span>
                    </div>
                    <button
                      type="button"
                      className={`${s.switch} ${draft.isActive ? s.switchOn : ""}`}
                      onClick={() => onDraftChange("isActive", !draft.isActive)}
                      aria-pressed={draft.isActive}
                      aria-label="Cambiar estado del vidrio"
                    >
                      <span className={s.switchThumb} />
                    </button>
                  </div>
                </div>

                <button
                  ref={moreDetailsButtonRef}
                  type="button"
                  className={`${s.moreDetailsButton} ${
                    showAdvancedDetails ? s.moreDetailsButtonOpen : ""
                  }`}
                  onClick={() => {
                    const body = sheetBodyRef.current;
                    const previousScrollTop = body?.scrollTop ?? 0;
                    onShowAdvancedDetailsChange(!showAdvancedDetails);
                    window.requestAnimationFrame(() => {
                      if (!body) return;
                      body.scrollTop = previousScrollTop;
                      moreDetailsButtonRef.current?.scrollIntoView({
                        block: "nearest",
                        inline: "nearest",
                      });
                    });
                  }}
                  aria-expanded={showAdvancedDetails}
                >
                  <span className={s.moreDetailsButtonCopy}>
                    <strong>
                      {showAdvancedDetails ? "Ocultar detalles" : "Más información"}
                    </strong>
                    <span>
                      {showAdvancedDetails
                        ? "Proveedor y redondeo"
                        : draft.proveedor.trim()
                          ? `Proveedor: ${draft.proveedor.trim()}`
                          : "Proveedor y redondeo (opcional)"}
                    </span>
                  </span>
                  {showAdvancedDetails ? (
                    <LuChevronUp aria-hidden />
                  ) : (
                    <LuChevronDown aria-hidden />
                  )}
                </button>

                {showAdvancedDetails ? (
                  <div className={s.advancedDetails}>
                    <section className={`${s.formSection} ${s.formSectionPrecio}`}>
                      <div className={s.formSectionHead}>
                        <span className={s.formSectionIcon} aria-hidden>
                          <LuSlidersHorizontal />
                        </span>
                        <div className={s.formSectionHeadCopy}>
                          <h3>Reglas de precio</h3>
                          <p>Redondeo comercial</p>
                        </div>
                      </div>
                      <label className={s.fieldBlock}>
                        <span className={s.fieldLabel}>Redondeo</span>
                        <select
                          className={s.selectInput}
                          value={draft.redondeoPrecio}
                          onChange={(event) =>
                            onDraftChange("redondeoPrecio", event.target.value)
                          }
                        >
                          {ROUNDING_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </section>

                    <section className={`${s.formSection} ${s.formSectionProveedor}`}>
                      <div className={s.formSectionHead}>
                        <span className={s.formSectionIcon} aria-hidden>
                          <LuTruck />
                        </span>
                        <div className={s.formSectionHeadCopy}>
                          <h3>Proveedor</h3>
                          <p>Referencia comercial opcional</p>
                        </div>
                      </div>
                      <label className={s.fieldBlock}>
                        <span className={s.fieldLabel}>
                          Proveedor <em className={s.optionalMark}>opcional</em>
                        </span>
                        <input
                          className={s.textInput}
                          value={draft.proveedor}
                          onChange={(event) => onDraftChange("proveedor", event.target.value)}
                          placeholder="Ej: Vidrios del Sur"
                        />
                      </label>
                    </section>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className={s.wizardStepSummary}>{step1Summary}</p>
            )}
          </article>

          <article
            className={`${s.wizardStep} ${openStep === 2 ? s.wizardStepOpen : ""} ${
              openStep !== 2 ? s.wizardStepCollapsed : ""
            }`}
          >
            {openStep !== 2
              ? renderStepHeader(
                  2,
                  "Formato y costo",
                  "Plancha, costo de compra y merma para optimización",
                  step2Summary,
                  false
                )
              : null}
            {openStep === 2 ? (
              <div className={s.wizardStepBody}>
                <div className={s.wizardFieldGroupHead}>
                  <LuLayers aria-hidden />
                  <div>
                    <strong>Optimización de plancha (opcional)</strong>
                    <span>
                      Ventora usa estos datos para calcular aprovechamiento, desperdicio y
                      costo real del vidrio.
                    </span>
                  </div>
                </div>

                <p className={s.fieldHint}>
                  El precio de venta por m² se define en el paso anterior. Aquí registras el
                  costo de compra de la plancha completa, distinto al precio comercial.
                </p>

                <div className={s.formSectionGrid}>
                  <label className={s.fieldBlock}>
                    <span className={s.fieldLabel}>
                      Ancho de plancha (mm) <em className={s.optionalMark}>opcional</em>
                    </span>
                    <input
                      className={s.textInput}
                      inputMode="numeric"
                      value={draft.planchaAnchoMm}
                      onChange={(event) => onDraftChange("planchaAnchoMm", event.target.value)}
                      placeholder="Ej: 3210"
                    />
                  </label>

                  <label className={s.fieldBlock}>
                    <span className={s.fieldLabel}>
                      Alto de plancha (mm) <em className={s.optionalMark}>opcional</em>
                    </span>
                    <input
                      className={s.textInput}
                      inputMode="numeric"
                      value={draft.planchaAltoMm}
                      onChange={(event) => onDraftChange("planchaAltoMm", event.target.value)}
                      placeholder="Ej: 2250"
                    />
                  </label>

                  <label className={`${s.fieldBlock} ${s.fieldSpan2}`}>
                    <span className={s.fieldLabel}>
                      Costo de compra de la plancha completa
                      <em className={s.optionalMark}>Opcional</em>
                    </span>
                    <span className={s.pricingFieldHelp}>
                      Precio que pagas por la plancha entera al proveedor, no por m².
                    </span>
                    <div className={s.moneyWrap}>
                      <span className={s.moneyPrefix}>$</span>
                      <input
                        className={s.moneyInput}
                        inputMode="numeric"
                        value={formatMoneyDigits(draft.costoBase)}
                        onChange={(event) =>
                          onDraftChange("costoBase", getDigits(event.target.value))
                        }
                        placeholder="Ej: 180.000"
                      />
                    </div>
                  </label>

                  <label className={s.fieldBlock}>
                    <span className={s.fieldLabel}>
                      Merma % <em className={s.optionalMark}>opcional</em>
                    </span>
                    <input
                      className={s.textInput}
                      inputMode="decimal"
                      value={draft.mermaPct}
                      onChange={(event) => onDraftChange("mermaPct", event.target.value)}
                      placeholder="5"
                    />
                  </label>

                  <label className={s.fieldBlock}>
                    <span className={s.fieldLabel}>
                      Proveedor de compra <em className={s.optionalMark}>opcional</em>
                    </span>
                    <input
                      className={s.textInput}
                      value={draft.proveedor}
                      onChange={(event) => onDraftChange("proveedor", event.target.value)}
                      placeholder="Ej: Planta de vidrio"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <p className={s.wizardStepSummary}>{step2Summary}</p>
            )}
          </article>
        </div>

        <footer className={`${s.sheetFooter} ${s.wizardFooter}`}>
          <button
            type="button"
            className={s.wizardSecondaryButton}
            onClick={handleBack}
            disabled={openStep <= 1}
          >
            Atrás
          </button>
          <div className={s.wizardFooterActions}>
            {openStep < maxStep ? (
              <>
                <button
                  type="button"
                  className={s.wizardSecondaryButton}
                  onClick={onSave}
                  disabled={saveDisabled || isSaving}
                >
                  {isSaving ? "Guardando…" : "Guardar vidrio"}
                </button>
                <button
                  type="button"
                  className={s.primaryButton}
                  onClick={handleNext}
                  disabled={saveDisabled}
                >
                  Formato y costo (opcional)
                </button>
              </>
            ) : (
              <button
                type="button"
                className={s.primaryButton}
                onClick={onSave}
                disabled={saveDisabled || isSaving}
              >
                {isSaving
                  ? "Guardando…"
                  : sheetMode === "edit"
                    ? "Guardar cambios"
                    : "Guardar vidrio"}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
