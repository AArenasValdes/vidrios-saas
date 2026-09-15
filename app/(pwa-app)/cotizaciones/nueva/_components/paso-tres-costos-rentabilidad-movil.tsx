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
    return QUOTE_PROFITABILITY_COPY.pendiente;
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

  // #region agent log
  void globalThis.fetch?.("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "26894a" },
    body: JSON.stringify({
      sessionId: "26894a",
      runId: "post-fix",
      hypothesisId: "A",
      location: "paso-tres-costos-rentabilidad-movil.tsx:render",
      message: "paso 3 mobile costos accordion render",
      data: {
        isOpen,
        hasCostBasis: financialSummary.hasCostBasis,
        mermaLabel: MERMA_LABEL,
        underCost,
        underCostCopyShown: isOpen && underCost,
        closedSummary,
        utilidadFormatted: formatAccordionClp(financialSummary.utilidadEstimada),
        costoTotal: financialSummary.costoTotal,
        utilidad: financialSummary.utilidadEstimada,
        ventaNeta: financialSummary.precioFinalNeto,
        margenRealPct: financialSummary.margenRealPct,
      },
      timestamp: Date.now(),
    }),
  })?.catch(() => {});
  // #endregion

  return (
    <div className={s.stepThreeAdjustmentItem}>
      <button
        type="button"
        className={s.stepThreeAdjustmentRow}
        onClick={() => {
          setIsOpen((current) => {
            const next = !current;
            // #region agent log
            void globalThis.fetch?.("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "26894a" },
              body: JSON.stringify({
                sessionId: "26894a",
                runId: "post-fix",
                hypothesisId: "D",
                location: "paso-tres-costos-rentabilidad-movil.tsx:toggle",
                message: "paso 3 mobile costos accordion toggle",
                data: { next, hasCostBasis: financialSummary.hasCostBasis },
                timestamp: Date.now(),
              }),
            })?.catch(() => {});
            // #endregion
            return next;
          });
        }}
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
                  className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
                  inputMode="numeric"
                  value={formatCurrencyField(adjustments.manoObra, formatCurrencyInput)}
                  onChange={(event) => onQuoteStudioFinancialChange("manoObra", event.target.value)}
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
                  className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
                  inputMode="numeric"
                  value={formatCurrencyField(adjustments.traslado, formatCurrencyInput)}
                  onChange={(event) => onQuoteStudioFinancialChange("traslado", event.target.value)}
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
                  className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
                  inputMode="numeric"
                  value={formatCurrencyField(adjustments.otrosCostos, formatCurrencyInput)}
                  onChange={(event) => onQuoteStudioFinancialChange("otrosCostos", event.target.value)}
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
                  className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
                  inputMode="decimal"
                  value={adjustments.mermaPct > 0 ? String(adjustments.mermaPct) : ""}
                  onChange={(event) => onQuoteStudioFinancialChange("mermaPct", event.target.value)}
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
                  className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
                  inputMode="decimal"
                  value={String(adjustments.margenObjetivoRealPct)}
                  title={MARGEN_OBJETIVO_HELP_MOVIL}
                  aria-label={`${QUOTE_PROFITABILITY_COPY.margenObjetivo} %`}
                  onChange={(event) =>
                    onQuoteStudioFinancialChange("margenObjetivoRealPct", event.target.value)
                  }
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
