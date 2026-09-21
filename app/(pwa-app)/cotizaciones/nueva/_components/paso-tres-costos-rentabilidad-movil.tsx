"use client";

import { useState } from "react";
import { LuCalculator, LuChevronDown } from "react-icons/lu";

import {
  buildQuoteStudioApplyRecommendedLabel,
  buildQuoteStudioRecommendedDeltaLabel,
  canApplyQuoteStudioRecommendedPrice,
  formatQuoteProfitabilityPct,
  QUOTE_PROFITABILITY_COPY,
  resolveMaterialCostOriginLabel,
  type QuoteStudioFinancialSummary,
} from "@/features/cotizaciones/services/quote-studio-financial.service";
import { resolveProfitabilityParametersOrigin } from "@/features/cotizaciones/services/quote-profitability-defaults.service";
import {
  createQuoteStudioFinancialDraft,
  type QuoteStudioFinancialDraft,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "../page.module.css";

type QuoteStudioFinancialField = keyof QuoteStudioFinancialDraft;

type PasoTresCostosRentabilidadMovilProps = {
  financialSummary: QuoteStudioFinancialSummary;
  quoteStudioFinancial?: QuoteStudioFinancialDraft;
  formatCurrencyInput: (value: string) => string;
  onQuoteStudioFinancialChange: (field: QuoteStudioFinancialField, value: string) => void;
  onApplyRecommendedPrice?: () => void;
  onRestoreProfitabilityDefaults?: () => void;
};

const UNAVAILABLE_LABEL = "No disponible";
const MARGEN_OBJETIVO_HELP_MOVIL = "Margen real que quieres obtener sobre la venta.";
const BAJO_COSTO_COPY = "Esta cotización está bajo costo.";

function scrollCostInputIntoView(event: { currentTarget: HTMLElement }) {
  event.currentTarget.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: "auto",
  });
}

function formatCurrencyField(value: number, formatCurrencyInput: (value: string) => string) {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return formatCurrencyInput(String(Math.round(value)));
}

export function formatAccordionClp(value: number) {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded)) {
    return "$0";
  }

  const absolute = formatCurrency(Math.abs(rounded));
  return rounded < 0 ? `-${absolute}` : absolute;
}

export function isQuoteUnderCost(summary: QuoteStudioFinancialSummary) {
  if (!summary.isProfitabilityComplete) {
    return false;
  }

  return summary.utilidadEstimada < 0 || summary.costoTotal > summary.precioFinalNeto;
}

function resolveIncompleteStatus(summary: QuoteStudioFinancialSummary) {
  if (summary.isProfitabilityComplete) {
    return null;
  }

  if (summary.materialCostSource === "none" && summary.costoMateriales <= 0) {
    return {
      label: QUOTE_PROFITABILITY_COPY.pendiente,
      hint: QUOTE_PROFITABILITY_COPY.pendienteHint,
    };
  }

  return {
    label: QUOTE_PROFITABILITY_COPY.incompleta,
    hint: QUOTE_PROFITABILITY_COPY.incompletaHint,
  };
}

export function buildCostosRentabilidadClosedSummary(summary: QuoteStudioFinancialSummary) {
  if (!summary.isProfitabilityComplete) {
    return resolveIncompleteStatus(summary)?.label ?? QUOTE_PROFITABILITY_COPY.incompleta;
  }

  return `Costo ${formatAccordionClp(summary.costoTotal)} · Utilidad ${formatAccordionClp(summary.utilidadEstimada)} · Margen ${formatQuoteProfitabilityPct(summary.margenRealPct)}`;
}

function resolveMaterialesValue(summary: QuoteStudioFinancialSummary) {
  if (summary.materialCostSource === "none" && summary.costoMateriales <= 0) {
    return UNAVAILABLE_LABEL;
  }

  if (summary.materialCostSource === "partial") {
    return `${formatAccordionClp(summary.costoMateriales)} · parcial`;
  }

  return formatAccordionClp(summary.costoMateriales);
}

export function PasoTresCostosRentabilidadMovil({
  financialSummary,
  quoteStudioFinancial,
  formatCurrencyInput,
  onQuoteStudioFinancialChange,
  onApplyRecommendedPrice,
  onRestoreProfitabilityDefaults,
}: PasoTresCostosRentabilidadMovilProps) {
  const [isOpen, setIsOpen] = useState(false);
  const adjustments = createQuoteStudioFinancialDraft(quoteStudioFinancial);
  const parametersOrigin = resolveProfitabilityParametersOrigin(adjustments);
  const closedSummary = buildCostosRentabilidadClosedSummary(financialSummary);
  const underCost = isQuoteUnderCost(financialSummary);
  const isComplete = financialSummary.isProfitabilityComplete;
  const incompleteStatus = resolveIncompleteStatus(financialSummary);
  const materialesValue = resolveMaterialesValue(financialSummary);
  const formatMoney = (value: number) => formatCurrencyInput(String(Math.round(value)));
  const canApplyRecommended = canApplyQuoteStudioRecommendedPrice(financialSummary);
  const recommendedDeltaLabel = buildQuoteStudioRecommendedDeltaLabel(financialSummary, formatMoney);
  const applyRecommendedLabel = buildQuoteStudioApplyRecommendedLabel(financialSummary, formatMoney);

  return (
    <div className={s.stepThreeAdjustmentItem}>
      <button
        type="button"
        className={s.stepThreeAdjustmentRow}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="Costos y rentabilidad"
      >
        <span className={s.stepThreeFreightIcon}>
          <LuCalculator aria-hidden />
        </span>
        <span className={s.stepThreeFreightText}>
          <strong>Costos y rentabilidad</strong>
          <span className={s.stepThreeCostosSummary}>{closedSummary}</span>
        </span>
        <LuChevronDown className={isOpen ? s.stepThreeFreightToggleOpen : ""} aria-hidden />
      </button>

      {isOpen ? (
        <div className={s.stepThreeCostosEditor}>
          {incompleteStatus ? (
            <p className={s.helpText}>{incompleteStatus.hint}</p>
          ) : (
            <p className={s.helpText}>
              {parametersOrigin === "organization_defaults"
                ? QUOTE_PROFITABILITY_COPY.valoresPredeterminados
                : QUOTE_PROFITABILITY_COPY.personalizado}
            </p>
          )}

          <div className={s.stepThreeCostosReadRow}>
            <span>Materiales</span>
            <strong>{materialesValue}</strong>
          </div>
          <div className={s.stepThreeCostosReadRow}>
            <span>Origen materiales</span>
            <strong>{resolveMaterialCostOriginLabel(financialSummary.materialCostSource)}</strong>
          </div>

          <div className={s.stepThreeCostosFields}>
            <label className={s.field} htmlFor="paso-tres-materiales-manual">
              <span className={s.label}>{QUOTE_PROFITABILITY_COPY.costoMaterialesManualLabel}</span>
              <div className={s.moneyInputWrap}>
                <span className={s.moneyPrefix}>CLP</span>
                <input
                  id="paso-tres-materiales-manual"
                  aria-label={QUOTE_PROFITABILITY_COPY.costoMaterialesManualLabel}
                  className={`${s.input} ${s.inputMono} ${s.moneyInput} ${s.stepThreeMobileNumericInput}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={
                    adjustments.costoMaterialesManual !== null
                      ? formatCurrencyField(adjustments.costoMaterialesManual, formatCurrencyInput)
                      : ""
                  }
                  onChange={(event) =>
                    onQuoteStudioFinancialChange("costoMaterialesManual", event.target.value)
                  }
                  onFocus={scrollCostInputIntoView}
                  placeholder="Usar cálculo por pieza"
                />
              </div>
              <span className={s.helpText}>{QUOTE_PROFITABILITY_COPY.costoMaterialesManualHint}</span>
            </label>
            <label className={s.field} htmlFor="paso-tres-mano-obra">
              <span className={s.label}>Mano de obra</span>
              <div className={s.moneyInputWrap}>
                <span className={s.moneyPrefix}>CLP</span>
                <input
                  id="paso-tres-mano-obra"
                  aria-label="Mano de obra"
                  className={`${s.input} ${s.inputMono} ${s.moneyInput} ${s.stepThreeMobileNumericInput}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={formatCurrencyField(adjustments.manoObra, formatCurrencyInput)}
                  onChange={(event) => onQuoteStudioFinancialChange("manoObra", event.target.value)}
                  onFocus={scrollCostInputIntoView}
                  placeholder="0"
                />
              </div>
            </label>
            <label className={s.field} htmlFor="paso-tres-traslado">
              <span className={s.label}>{QUOTE_PROFITABILITY_COPY.trasladoInterno}</span>
              <div className={s.moneyInputWrap}>
                <span className={s.moneyPrefix}>CLP</span>
                <input
                  id="paso-tres-traslado"
                  aria-label="Costo de traslado"
                  className={`${s.input} ${s.inputMono} ${s.moneyInput} ${s.stepThreeMobileNumericInput}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={formatCurrencyField(adjustments.traslado, formatCurrencyInput)}
                  onChange={(event) => onQuoteStudioFinancialChange("traslado", event.target.value)}
                  onFocus={scrollCostInputIntoView}
                  placeholder="0"
                />
              </div>
            </label>
            <label className={s.field} htmlFor="paso-tres-otros-costos">
              <span className={s.label}>Otros costos</span>
              <div className={s.moneyInputWrap}>
                <span className={s.moneyPrefix}>CLP</span>
                <input
                  id="paso-tres-otros-costos"
                  aria-label="Otros costos"
                  className={`${s.input} ${s.inputMono} ${s.moneyInput} ${s.stepThreeMobileNumericInput}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={formatCurrencyField(adjustments.otrosCostos, formatCurrencyInput)}
                  onChange={(event) => onQuoteStudioFinancialChange("otrosCostos", event.target.value)}
                  onFocus={scrollCostInputIntoView}
                  placeholder="0"
                />
              </div>
            </label>
            <label className={s.field} htmlFor="paso-tres-merma">
              <span className={s.label}>{QUOTE_PROFITABILITY_COPY.mermaEstimadaLabel}</span>
              <div className={s.moneyInputWrap}>
                <span className={s.moneyPrefix}>%</span>
                <input
                  id="paso-tres-merma"
                  aria-label={QUOTE_PROFITABILITY_COPY.mermaEstimadaLabel}
                  className={`${s.input} ${s.inputMono} ${s.moneyInput} ${s.stepThreeMobileNumericInput}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={adjustments.mermaPct > 0 ? String(adjustments.mermaPct) : ""}
                  onChange={(event) => onQuoteStudioFinancialChange("mermaPct", event.target.value)}
                  onFocus={scrollCostInputIntoView}
                  placeholder="0"
                />
              </div>
            </label>
            <label className={s.field} htmlFor="paso-tres-margen-objetivo">
              <span className={s.label}>{QUOTE_PROFITABILITY_COPY.margenObjetivo} %</span>
              <div className={s.moneyInputWrap}>
                <span className={s.moneyPrefix}>%</span>
                <input
                  id="paso-tres-margen-objetivo"
                  className={`${s.input} ${s.inputMono} ${s.moneyInput} ${s.stepThreeMobileNumericInput}`}
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={String(adjustments.margenObjetivoRealPct)}
                  title={MARGEN_OBJETIVO_HELP_MOVIL}
                  aria-label={`${QUOTE_PROFITABILITY_COPY.margenObjetivo} %`}
                  onChange={(event) =>
                    onQuoteStudioFinancialChange("margenObjetivoRealPct", event.target.value)
                  }
                  onFocus={scrollCostInputIntoView}
                  placeholder="30"
                />
              </div>
              <span className={s.helpText}>{MARGEN_OBJETIVO_HELP_MOVIL}</span>
            </label>
          </div>

          {isComplete ? (
            <dl className={s.stepThreeCostosMetrics}>
              <div className={s.stepThreeCostosMetric}>
                <dt>{QUOTE_PROFITABILITY_COPY.costoTotal}</dt>
                <dd>{formatAccordionClp(financialSummary.costoTotal)}</dd>
              </div>
              <div className={s.stepThreeCostosMetric}>
                <dt>{QUOTE_PROFITABILITY_COPY.utilidad}</dt>
                <dd>{formatAccordionClp(financialSummary.utilidadEstimada)}</dd>
              </div>
              <div className={s.stepThreeCostosMetric}>
                <dt>{QUOTE_PROFITABILITY_COPY.margenReal}</dt>
                <dd>{formatQuoteProfitabilityPct(financialSummary.margenRealPct)}</dd>
              </div>
              <div className={s.stepThreeCostosMetric}>
                <dt>{QUOTE_PROFITABILITY_COPY.ventaNeta}</dt>
                <dd>{formatAccordionClp(financialSummary.precioFinalNeto)}</dd>
              </div>
            </dl>
          ) : null}

          {parametersOrigin === "customized" && onRestoreProfitabilityDefaults ? (
            <button
              type="button"
              className={s.stepThreeSecondaryButton}
              onClick={onRestoreProfitabilityDefaults}
            >
              {QUOTE_PROFITABILITY_COPY.restaurarPredeterminados}
            </button>
          ) : null}

          {canApplyRecommended && onApplyRecommendedPrice ? (
            <div className={s.stepThreeCostosRecommended}>
              {recommendedDeltaLabel ? (
                <p className={s.stepThreeCostosRecommendedHint}>{recommendedDeltaLabel}</p>
              ) : null}
              <button
                type="button"
                className={s.stepThreeCostosRecommendedButton}
                onClick={onApplyRecommendedPrice}
              >
                {applyRecommendedLabel}
              </button>
            </div>
          ) : isComplete && financialSummary.precioRecomendadoNeto > 0 ? (
            <div className={s.stepThreeCostosRecommendedDone}>
              <p className={s.stepThreeCostosRecommendedHint}>
                Venta alineada al precio recomendado (
                {formatMoney(financialSummary.precioRecomendadoNeto)}).
              </p>
            </div>
          ) : null}

          {underCost ? <p className={s.stepThreeCostosUnderCost}>{BAJO_COSTO_COPY}</p> : null}
          <p className={s.stepThreeCostosPrivacy}>{QUOTE_PROFITABILITY_COPY.soloInterno}</p>
        </div>
      ) : null}
    </div>
  );
}
