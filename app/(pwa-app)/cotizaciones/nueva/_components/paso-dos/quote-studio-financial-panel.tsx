"use client";

import { useState, type ReactNode } from "react";

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
import type { QuoteStudioFinancialDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

import d from "../paso-dos-panel-desktop.module.css";

const UNAVAILABLE_LABEL = "No disponible";

type QuoteStudioFinancialField = keyof QuoteStudioFinancialDraft;

type QuoteStudioFinancialPanelProps = {
  summary: QuoteStudioFinancialSummary;
  adjustments: QuoteStudioFinancialDraft;
  formatCurrencyInput: (value: string) => string;
  onAdjustmentChange: (field: QuoteStudioFinancialField, value: string) => void;
  onRestoreProfitabilityDefaults?: () => void;
  onApplyRecommendedPrice: () => void;
  embedded?: boolean;
  initialDetailOpen?: boolean;
};

export {
  buildQuoteStudioApplyRecommendedLabel,
  buildQuoteStudioRecommendedDeltaLabel,
  canApplyQuoteStudioRecommendedPrice,
} from "@/features/cotizaciones/services/quote-studio-financial.service";

const formatPct = formatQuoteProfitabilityPct;

function formatCurrencyField(value: number, formatCurrencyInput: (value: string) => string) {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return formatCurrencyInput(String(Math.round(value)));
}

export function resolveQuoteStudioMarginValueClass(
  summary: QuoteStudioFinancialSummary,
  classes: {
    muted: string;
    danger: string;
    warning: string;
    good: string;
  }
) {
  if (!summary.isProfitabilityComplete) {
    return classes.muted;
  }

  if (summary.margenRealPct < 0) {
    return classes.danger;
  }

  if (summary.margenRealPct < summary.margenObjetivoRealPct) {
    return classes.warning;
  }

  return classes.good;
}

export function resolveQuoteStudioUtilityValueClass(
  summary: QuoteStudioFinancialSummary,
  classes: { danger: string; good: string }
) {
  if (!summary.isProfitabilityComplete) {
    return "";
  }

  if (summary.utilidadEstimada < 0) {
    return classes.danger;
  }

  if (summary.utilidadEstimada > 0) {
    return classes.good;
  }

  return "";
}

function FinancialSummaryRow({
  label,
  value,
  tone = "default",
  valueClassName,
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "highlight" | "margin" | "recommended";
  valueClassName?: string;
}) {
  const rowClassName = [
    d.financialSummaryRow,
    tone === "primary" ? d.financialSummaryRowPrimary : "",
    tone === "highlight" ? d.financialSummaryRowHighlight : "",
    tone === "margin" ? d.financialSummaryRowMargin : "",
    tone === "recommended" ? d.financialSummaryRowRecommended : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rowClassName}>
      <span className={d.financialSummaryLabel}>{label}</span>
      <strong className={`${d.financialSummaryValue} ${valueClassName ?? ""}`}>{value}</strong>
    </div>
  );
}

function FinancialEditRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className={d.financialEditRow}>
      <span className={d.financialEditLabel}>{label}</span>
      <span className={d.financialEditControl}>{children}</span>
    </label>
  );
}

export function QuoteStudioFinancialPanel({
  summary,
  adjustments,
  formatCurrencyInput,
  onAdjustmentChange,
  onRestoreProfitabilityDefaults,
  onApplyRecommendedPrice,
  embedded = false,
  initialDetailOpen = false,
}: QuoteStudioFinancialPanelProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(initialDetailOpen);
  const formatMoney = (value: number) => formatCurrencyInput(String(Math.round(value)));
  const parametersOrigin = resolveProfitabilityParametersOrigin(adjustments);
  const isComplete = summary.isProfitabilityComplete;
  const incompleteCopy = !isComplete
    ? summary.materialCostSource === "none" && summary.costoMateriales <= 0
      ? { label: QUOTE_PROFITABILITY_COPY.pendiente, hint: QUOTE_PROFITABILITY_COPY.pendienteHint }
      : { label: QUOTE_PROFITABILITY_COPY.incompleta, hint: QUOTE_PROFITABILITY_COPY.incompletaHint }
    : null;
  const canApplyRecommended = canApplyQuoteStudioRecommendedPrice(summary);
  const recommendedDeltaLabel = buildQuoteStudioRecommendedDeltaLabel(summary, formatMoney);
  const applyRecommendedLabel = buildQuoteStudioApplyRecommendedLabel(summary, formatMoney);
  const marginValueClass = resolveQuoteStudioMarginValueClass(summary, {
    muted: d.financialValueMuted,
    danger: d.financialValueDanger,
    warning: d.financialValueWarning,
    good: d.financialValueGood,
  });
  const utilityValueClass = resolveQuoteStudioUtilityValueClass(summary, {
    danger: d.financialValueDanger,
    good: d.financialValueGood,
  });
  const marginDisplayValue = isComplete
    ? `${formatPct(summary.margenRealPct)} · obj. ${formatPct(summary.margenObjetivoRealPct)}`
    : formatPct(summary.margenRealPct);
  const detailToggleLabel = isDetailOpen
    ? QUOTE_PROFITABILITY_COPY.ocultarCostos
    : isComplete
      ? QUOTE_PROFITABILITY_COPY.ajustarCostos
      : QUOTE_PROFITABILITY_COPY.agregarCostos;

  return (
    <section
      className={`${d.financialPanel} ${embedded ? d.financialPanelEmbedded : ""}`}
      aria-label="Control de rentabilidad"
    >
      <div className={embedded ? d.financialEmbedded : d.financialCard}>
        <header className={embedded ? d.panelSectionHeading : d.financialHeaderCompact}>
          <div className={d.financialHeaderRow}>
            <h3 className={embedded ? d.panelSectionTitle : d.financialTitle}>Rentabilidad</h3>
            {incompleteCopy ? (
              <span className={d.financialStatusChip}>{incompleteCopy.label}</span>
            ) : (
              <span className={d.financialStatusChip}>
                {parametersOrigin === "organization_defaults"
                  ? QUOTE_PROFITABILITY_COPY.valoresPredeterminados
                  : QUOTE_PROFITABILITY_COPY.personalizado}
              </span>
            )}
          </div>
        </header>

        {isComplete ? (
          <div className={d.financialSummaryList} aria-label="Resumen de rentabilidad">
            <FinancialSummaryRow
              label={QUOTE_PROFITABILITY_COPY.costoTotal}
              value={formatMoney(summary.costoTotal)}
            />
            <FinancialSummaryRow
              label={QUOTE_PROFITABILITY_COPY.utilidad}
              value={formatMoney(summary.utilidadEstimada)}
              tone="highlight"
              valueClassName={utilityValueClass}
            />
            <FinancialSummaryRow
              label={QUOTE_PROFITABILITY_COPY.margenReal}
              value={marginDisplayValue}
              tone="margin"
              valueClassName={marginValueClass}
            />
            <FinancialSummaryRow
              label={QUOTE_PROFITABILITY_COPY.ventaNeta}
              value={formatMoney(summary.precioFinalNeto)}
              tone="primary"
            />
            <FinancialSummaryRow
              label={QUOTE_PROFITABILITY_COPY.precioRecomendado}
              value={formatMoney(summary.precioRecomendadoNeto)}
              tone="recommended"
            />
            {canApplyRecommended ? (
              <div className={d.financialRecommendedAction}>
                {recommendedDeltaLabel ? (
                  <p className={d.financialDeltaHint}>{recommendedDeltaLabel}</p>
                ) : null}
                <button
                  type="button"
                  className={
                    embedded ? d.financialApplyButtonGhost : d.financialApplyButton
                  }
                  onClick={onApplyRecommendedPrice}
                >
                  {applyRecommendedLabel}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className={`${d.financialDetailToggle} ${
            !isComplete && !isDetailOpen ? d.financialDetailToggleAccent : ""
          }`}
          aria-expanded={isDetailOpen}
          onClick={() => setIsDetailOpen((current) => !current)}
        >
          {detailToggleLabel}
        </button>

        {isDetailOpen ? (
          <section className={d.financialDetailBlock} aria-label="Detalle de costos">
            {incompleteCopy ? (
              <p className={d.financialDetailIntro}>
                {incompleteCopy.hint} Materiales salen del costo proveedor en piezas con
                recargo sobre costo.
              </p>
            ) : null}

            <div className={d.financialReadList}>
              <div className={d.financialReadRow}>
                <span className={d.financialReadLabel}>Materiales</span>
                <strong className={d.financialReadValue}>
                  {summary.materialCostSource === "none" && summary.costoMateriales <= 0
                    ? UNAVAILABLE_LABEL
                    : summary.materialCostSource === "partial"
                      ? `${formatMoney(summary.costoMateriales)} · parcial`
                      : formatMoney(summary.costoMateriales)}
                </strong>
              </div>
              <div className={d.financialReadRow}>
                <span className={d.financialReadLabel}>Origen materiales</span>
                <strong className={d.financialReadValue}>
                  {resolveMaterialCostOriginLabel(summary.materialCostSource)}
                </strong>
              </div>
            </div>

            <div className={d.financialEditList}>
              <FinancialEditRow label={QUOTE_PROFITABILITY_COPY.costoMaterialesManualLabel}>
                <input
                  type="text"
                  inputMode="numeric"
                  className={d.financialAdjustInput}
                  value={
                    adjustments.costoMaterialesManual !== null
                      ? formatCurrencyField(adjustments.costoMaterialesManual, formatCurrencyInput)
                      : ""
                  }
                  placeholder="Usar cálculo por pieza"
                  onChange={(event) =>
                    onAdjustmentChange("costoMaterialesManual", event.target.value)
                  }
                />
              </FinancialEditRow>
              <p className={d.financialDetailIntro}>
                {QUOTE_PROFITABILITY_COPY.costoMaterialesManualHint}
              </p>
              <FinancialEditRow label="Mano de obra">
                <input
                  type="text"
                  inputMode="numeric"
                  className={d.financialAdjustInput}
                  value={formatCurrencyField(adjustments.manoObra, formatCurrencyInput)}
                  placeholder="$0"
                  onChange={(event) => onAdjustmentChange("manoObra", event.target.value)}
                />
              </FinancialEditRow>
              <FinancialEditRow label={QUOTE_PROFITABILITY_COPY.trasladoInterno}>
                <input
                  type="text"
                  inputMode="numeric"
                  className={d.financialAdjustInput}
                  value={formatCurrencyField(adjustments.traslado, formatCurrencyInput)}
                  placeholder="$0"
                  onChange={(event) => onAdjustmentChange("traslado", event.target.value)}
                />
              </FinancialEditRow>
              <FinancialEditRow label="Otros costos">
                <input
                  type="text"
                  inputMode="numeric"
                  className={d.financialAdjustInput}
                  value={formatCurrencyField(adjustments.otrosCostos, formatCurrencyInput)}
                  placeholder="$0"
                  onChange={(event) => onAdjustmentChange("otrosCostos", event.target.value)}
                />
              </FinancialEditRow>
              <FinancialEditRow label={QUOTE_PROFITABILITY_COPY.mermaEstimadaLabel}>
                <input
                  type="text"
                  inputMode="decimal"
                  className={d.financialAdjustInput}
                  value={adjustments.mermaPct > 0 ? String(adjustments.mermaPct) : ""}
                  placeholder="0"
                  onChange={(event) => onAdjustmentChange("mermaPct", event.target.value)}
                />
              </FinancialEditRow>
              <FinancialEditRow label={`${QUOTE_PROFITABILITY_COPY.margenObjetivo} %`}>
                <input
                  type="text"
                  inputMode="decimal"
                  className={d.financialAdjustInput}
                  value={String(adjustments.margenObjetivoRealPct)}
                  title={QUOTE_PROFITABILITY_COPY.margenObjetivoHelp}
                  aria-label={QUOTE_PROFITABILITY_COPY.margenObjetivoHelp}
                  onChange={(event) =>
                    onAdjustmentChange("margenObjetivoRealPct", event.target.value)
                  }
                />
              </FinancialEditRow>
              <p className={d.financialDetailIntro}>{QUOTE_PROFITABILITY_COPY.margenObjetivoHelp}</p>
              {parametersOrigin === "customized" && onRestoreProfitabilityDefaults ? (
                <button
                  type="button"
                  className={d.financialApplyButtonGhost}
                  onClick={onRestoreProfitabilityDefaults}
                >
                  {QUOTE_PROFITABILITY_COPY.restaurarPredeterminados}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
