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
  const hasCostBasis = summary.hasCostBasis;
  const [isOpen, setIsOpen] = useState(false);
  const compactLine = hasCostBasis
    ? `${QUOTE_PROFITABILITY_COPY.costoTotal} ${money(summary.costoTotal, formatMoney)} · ${QUOTE_PROFITABILITY_COPY.utilidad} ${money(summary.utilidadEstimada, formatMoney)} · ${QUOTE_PROFITABILITY_COPY.margenReal} ${formatQuoteProfitabilityPct(summary.margenRealPct)}`
    : QUOTE_PROFITABILITY_COPY.pendiente;

  // #region agent log
  void globalThis.fetch?.("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "26894a" },
    body: JSON.stringify({
      sessionId: "26894a",
      runId: "post-fix",
      hypothesisId: "A",
      location: "quote-profitability-summary.tsx:render",
      message: "profitability summary render",
      data: { variant, tone, hasCostBasis, isOpen, costoTotal: summary.costoTotal },
      timestamp: Date.now(),
    }),
  })?.catch(() => {});
  // #endregion

  if (variant === "detail") {
    return (
      <section className={`${s.detail} ${tone === "onDark" ? s.onDark : ""}`} aria-label="Rentabilidad interna">
        <header className={s.header}>
          <strong>Rentabilidad interna</strong>
          {!hasCostBasis ? (
            <span className={s.status}>{QUOTE_PROFITABILITY_COPY.pendiente}</span>
          ) : null}
        </header>
        {hasCostBasis ? (
          <MetricsGrid summary={summary} formatMoney={formatMoney} />
        ) : (
          <p className={s.hint}>{QUOTE_PROFITABILITY_COPY.pendienteHint}</p>
        )}
        <p className={s.privacy}>{QUOTE_PROFITABILITY_COPY.soloInterno}</p>
      </section>
    );
  }

  if (!hasCostBasis) {
    return (
      <section className={`${s.compact} ${tone === "onDark" ? s.onDark : ""}`} aria-label="Rentabilidad interna">
        <p className={s.toggleLabel}>Rentabilidad interna</p>
        <strong className={s.togglePending}>{QUOTE_PROFITABILITY_COPY.pendiente}</strong>
        <p className={s.hint}>{QUOTE_PROFITABILITY_COPY.pendienteHint}</p>
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
                hypothesisId: "C",
                location: "quote-profitability-summary.tsx:toggle",
                message: "compact metrics toggle",
                data: { next, hasCostBasis },
                timestamp: Date.now(),
              }),
            })?.catch(() => {});
            // #endregion
            return next;
          });
        }}
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
