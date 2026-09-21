"use client";

import { useState } from "react";

import {
  formatQuoteProfitabilityPct,
  QUOTE_PROFITABILITY_COPY,
  type QuoteStudioFinancialSummary,
} from "@/features/cotizaciones/services/quote-studio-financial.service";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "./quote-profitability-summary.module.css";

type QuoteProfitabilitySummaryProps = {
  summary: QuoteStudioFinancialSummary;
  variant?: "compact" | "detail";
  tone?: "default" | "onDark";
  formatMoney?: (value: number) => string;
};

function money(value: number, formatMoney: (value: number) => string) {
  return formatMoney(Math.round(value));
}

function MetricsGrid({
  summary,
  formatMoney,
}: {
  summary: QuoteStudioFinancialSummary;
  formatMoney: (value: number) => string;
}) {
  return (
    <dl className={s.grid}>
      <div>
        <dt>{QUOTE_PROFITABILITY_COPY.costoTotal}</dt>
        <dd>{money(summary.costoTotal, formatMoney)}</dd>
      </div>
      <div>
        <dt>{QUOTE_PROFITABILITY_COPY.utilidad}</dt>
        <dd>{money(summary.utilidadEstimada, formatMoney)}</dd>
      </div>
      <div>
        <dt>{QUOTE_PROFITABILITY_COPY.margenReal}</dt>
        <dd>{formatQuoteProfitabilityPct(summary.margenRealPct)}</dd>
      </div>
      <div>
        <dt>{QUOTE_PROFITABILITY_COPY.ventaNeta}</dt>
        <dd>{money(summary.precioFinalNeto, formatMoney)}</dd>
      </div>
    </dl>
  );
}

export function QuoteProfitabilitySummary({
  summary,
  variant = "compact",
  tone = "default",
  formatMoney = formatCurrency,
}: QuoteProfitabilitySummaryProps) {
  const isComplete = summary.isProfitabilityComplete;
  const [isOpen, setIsOpen] = useState(false);
  const incompleteLabel =
    summary.materialCostSource === "none" && summary.costoMateriales <= 0
      ? QUOTE_PROFITABILITY_COPY.pendiente
      : QUOTE_PROFITABILITY_COPY.incompleta;
  const incompleteHint =
    summary.materialCostSource === "none" && summary.costoMateriales <= 0
      ? QUOTE_PROFITABILITY_COPY.pendienteHint
      : QUOTE_PROFITABILITY_COPY.incompletaHint;
  const compactLine = isComplete
    ? `${QUOTE_PROFITABILITY_COPY.costoTotal} ${money(summary.costoTotal, formatMoney)} · ${QUOTE_PROFITABILITY_COPY.utilidad} ${money(summary.utilidadEstimada, formatMoney)} · ${QUOTE_PROFITABILITY_COPY.margenReal} ${formatQuoteProfitabilityPct(summary.margenRealPct)}`
    : incompleteLabel;

  if (variant === "detail") {
    return (
      <section className={`${s.detail} ${tone === "onDark" ? s.onDark : ""}`} aria-label="Rentabilidad interna">
        <header className={s.header}>
          <strong>Rentabilidad interna</strong>
          {!isComplete ? <span className={s.status}>{incompleteLabel}</span> : null}
        </header>
        {isComplete ? (
          <MetricsGrid summary={summary} formatMoney={formatMoney} />
        ) : (
          <p className={s.hint}>{incompleteHint}</p>
        )}
        <p className={s.privacy}>{QUOTE_PROFITABILITY_COPY.soloInterno}</p>
      </section>
    );
  }

  if (!isComplete) {
    return (
      <section className={`${s.compact} ${tone === "onDark" ? s.onDark : ""}`} aria-label="Rentabilidad interna">
        <p className={s.toggleLabel}>Rentabilidad interna</p>
        <strong className={s.togglePending}>{incompleteLabel}</strong>
        <p className={s.hint}>{incompleteHint}</p>
        <p className={s.privacy}>{QUOTE_PROFITABILITY_COPY.soloInterno}</p>
      </section>
    );
  }

  return (
    <section className={`${s.compact} ${tone === "onDark" ? s.onDark : ""}`} aria-label="Rentabilidad interna">
      <button
        type="button"
        className={s.toggle}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={s.toggleLabel}>
          Rentabilidad <span className={s.chevron}>{isOpen ? "▾" : "▸"}</span>
        </span>
        <strong className={s.toggleValue}>{compactLine}</strong>
      </button>
      {isOpen ? <MetricsGrid summary={summary} formatMoney={formatMoney} /> : null}
      <p className={s.privacy}>{QUOTE_PROFITABILITY_COPY.soloInterno}</p>
    </section>
  );
}
