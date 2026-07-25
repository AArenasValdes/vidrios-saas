"use client";

import { useState, type ReactNode } from "react";

import { formatCurrency } from "@/utils/formatCurrency";
import type { QuoteStudioFinancialSummary } from "@/features/cotizaciones/services/quote-studio-financial.service";
import type { QuoteStudioFinancialDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

import d from "../paso-dos-panel-desktop.module.css";

const UNAVAILABLE_LABEL = "No disponible";

type QuoteStudioFinancialField = keyof QuoteStudioFinancialDraft;

type QuoteStudioFinancialPanelProps = {
  summary: QuoteStudioFinancialSummary;
  adjustments: QuoteStudioFinancialDraft;
  formatCurrencyInput: (value: string) => string;
  onAdjustmentChange: (field: QuoteStudioFinancialField, value: string) => void;
  onApplyRecommendedPrice: () => void;
  embedded?: boolean;
  initialDetailOpen?: boolean;
};

function formatPct(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${value.toLocaleString("es-CL", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Math.abs(value) > 0 && Math.abs(value) < 10 ? 1 : 0,
  })}%`;
}

function formatCurrencyField(value: number, formatCurrencyInput: (value: string) => string) {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return formatCurrencyInput(String(Math.round(value)));
}

export function canApplyQuoteStudioRecommendedPrice(summary: QuoteStudioFinancialSummary) {
  return summary.hasCostBasis && summary.precioRecomendadoNeto > 0;
}

/** Delta venta actual vs precio recomendado (solo display). */
export function buildQuoteStudioRecommendedDeltaLabel(
  summary: QuoteStudioFinancialSummary
): string | null {
  if (!canApplyQuoteStudioRecommendedPrice(summary)) {
    return null;
  }

  const delta = Math.round(summary.precioRecomendadoNeto - summary.precioFinalNeto);

  if (delta === 0) {
    return "La venta ya está en el precio recomendado.";
  }

  if (delta > 0) {
    return `Faltan ${formatCurrency(delta)} para el recomendado.`;
  }

  return `Sobran ${formatCurrency(Math.abs(delta))} sobre el recomendado.`;
}

export function buildQuoteStudioApplyRecommendedLabel(
  summary: QuoteStudioFinancialSummary
): string {
  if (!canApplyQuoteStudioRecommendedPrice(summary)) {
    return "Usar precio recomendado";
  }

  const delta = Math.round(summary.precioRecomendadoNeto - summary.precioFinalNeto);

  if (delta === 0) {
    return "Usar precio recomendado";
  }

  const signed = delta > 0 ? `+${formatCurrency(delta)}` : formatCurrency(delta);
  return `Usar precio recomendado · ${signed}`;
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
  if (!summary.hasCostBasis) {
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
  if (!summary.hasCostBasis) {
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
  onApplyRecommendedPrice,
  embedded = false,
  initialDetailOpen = false,
}: QuoteStudioFinancialPanelProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(initialDetailOpen);
  const hasCostBasis = summary.hasCostBasis;
  const canApplyRecommended = canApplyQuoteStudioRecommendedPrice(summary);
  const recommendedDeltaLabel = buildQuoteStudioRecommendedDeltaLabel(summary);
  const applyRecommendedLabel = buildQuoteStudioApplyRecommendedLabel(summary);
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
  const marginDisplayValue = hasCostBasis
    ? `${formatPct(summary.margenRealPct)} · obj. ${formatPct(summary.margenObjetivoRealPct)}`
    : formatPct(summary.margenRealPct);
  const detailToggleLabel = isDetailOpen
    ? "Ocultar costos"
    : hasCostBasis
      ? "Ajustar costos y margen"
      : "Agregar costos";

  return (
    <section
      className={`${d.financialPanel} ${embedded ? d.financialPanelEmbedded : ""}`}
      aria-label="Control de rentabilidad"
    >
      <div className={embedded ? d.financialEmbedded : d.financialCard}>
        <header className={embedded ? d.panelSectionHeading : d.financialHeaderCompact}>
          <div className={d.financialHeaderRow}>
            <h3 className={embedded ? d.panelSectionTitle : d.financialTitle}>Rentabilidad</h3>
            {!hasCostBasis ? (
              <span className={d.financialStatusChip}>Sin costos</span>
            ) : null}
          </div>
        </header>

        {hasCostBasis ? (
          <div className={d.financialSummaryList} aria-label="Resumen de rentabilidad">
            <FinancialSummaryRow
              label="Precio de venta"
              value={formatCurrency(summary.precioFinalNeto)}
              tone="primary"
            />
            <FinancialSummaryRow
              label="Costo estimado"
              value={formatCurrency(summary.costoTotal)}
            />
            <FinancialSummaryRow
              label="Utilidad"
              value={formatCurrency(summary.utilidadEstimada)}
              tone="highlight"
              valueClassName={utilityValueClass}
            />
            <FinancialSummaryRow
              label="Margen real"
              value={marginDisplayValue}
              tone="margin"
              valueClassName={marginValueClass}
            />
            <FinancialSummaryRow
              label="Precio recomendado"
              value={formatCurrency(summary.precioRecomendadoNeto)}
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
            !hasCostBasis && !isDetailOpen ? d.financialDetailToggleAccent : ""
          }`}
          aria-expanded={isDetailOpen}
          onClick={() => setIsDetailOpen((current) => !current)}
        >
          {detailToggleLabel}
        </button>

        {isDetailOpen ? (
          <section className={d.financialDetailBlock} aria-label="Detalle de costos">
            {!hasCostBasis ? (
              <p className={d.financialDetailIntro}>
                Ingresa mano de obra, traslado u otros. Materiales salen del costo
                proveedor en piezas con margen.
              </p>
            ) : null}

            <div className={d.financialReadList}>
              <div className={d.financialReadRow}>
                <span className={d.financialReadLabel}>Materiales</span>
                <strong className={d.financialReadValue}>
                  {hasCostBasis ? formatCurrency(summary.costoMateriales) : UNAVAILABLE_LABEL}
                </strong>
              </div>
            </div>

            <div className={d.financialEditList}>
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
              <FinancialEditRow label="Traslado">
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
              <FinancialEditRow label="Merma %">
                <input
                  type="text"
                  inputMode="decimal"
                  className={d.financialAdjustInput}
                  value={adjustments.mermaPct > 0 ? String(adjustments.mermaPct) : ""}
                  placeholder="0"
                  onChange={(event) => onAdjustmentChange("mermaPct", event.target.value)}
                />
              </FinancialEditRow>
              <FinancialEditRow label="Margen objetivo %">
                <input
                  type="text"
                  inputMode="decimal"
                  className={d.financialAdjustInput}
                  value={String(adjustments.margenObjetivoRealPct)}
                  onChange={(event) =>
                    onAdjustmentChange("margenObjetivoRealPct", event.target.value)
                  }
                />
              </FinancialEditRow>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
