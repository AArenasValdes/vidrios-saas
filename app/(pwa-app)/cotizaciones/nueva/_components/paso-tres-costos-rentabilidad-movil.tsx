"use client";

import { useState } from "react";
import { LuCalculator, LuChevronDown } from "react-icons/lu";

import {
  formatQuoteProfitabilityPct,
  QUOTE_PROFITABILITY_COPY,
  type QuoteStudioFinancialSummary,
} from "@/features/cotizaciones/services/quote-studio-financial.service";
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
};

const UNAVAILABLE_LABEL = "No disponible";
const MERMA_LABEL = "Merma de materiales %";
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
  if (!summary.hasCostBasis) {
    return false;
  }

  return summary.utilidadEstimada < 0 || summary.costoTotal > summary.precioFinalNeto;
}

export function buildCostosRentabilidadClosedSummary(summary: QuoteStudioFinancialSummary) {
  if (!summary.hasCostBasis) {
    return "Opcional";
  }

  return `Costo ${formatAccordionClp(summary.costoTotal)} · Utilidad ${formatAccordionClp(summary.utilidadEstimada)} · Margen ${formatQuoteProfitabilityPct(summary.margenRealPct)}`;
}

export function PasoTresCostosRentabilidadMovil({
  financialSummary,
  quoteStudioFinancial,
  formatCurrencyInput,
  onQuoteStudioFinancialChange,
}: PasoTresCostosRentabilidadMovilProps) {
  const [isOpen, setIsOpen] = useState(false);
  const adjustments = createQuoteStudioFinancialDraft(quoteStudioFinancial);
  const closedSummary = buildCostosRentabilidadClosedSummary(financialSummary);
  const underCost = isQuoteUnderCost(financialSummary);
  const materialesValue = financialSummary.hasCostBasis
    ? formatAccordionClp(financialSummary.costoMateriales)
    : UNAVAILABLE_LABEL;

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
          <div className={s.stepThreeCostosReadRow}>
            <span>Materiales</span>
            <strong>{materialesValue}</strong>
          </div>

          <div className={s.stepThreeCostosFields}>
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
              <span className={s.label}>{MERMA_LABEL}</span>
              <div className={s.moneyInputWrap}>
                <span className={s.moneyPrefix}>%</span>
                <input
                  id="paso-tres-merma"
                  aria-label={MERMA_LABEL}
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
          {underCost ? <p className={s.stepThreeCostosUnderCost}>{BAJO_COSTO_COPY}</p> : null}
          <p className={s.stepThreeCostosPrivacy}>{QUOTE_PROFITABILITY_COPY.soloInterno}</p>
        </div>
      ) : null}
    </div>
  );
}
