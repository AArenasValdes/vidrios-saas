"use client";

import type { ComponentListCardViewModel } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

import d from "../paso-dos-panel-desktop.module.css";

type QuoteStudioPanelBudgetSummaryProps = {
  itemsCount: number;
  cards: ComponentListCardViewModel[];
  quotePricingMode: QuotePricingMode;
  onViewFullBudget: () => void;
};

export function QuoteStudioPanelBudgetSummary({
  itemsCount,
  cards,
  quotePricingMode,
  onViewFullBudget,
}: QuoteStudioPanelBudgetSummaryProps) {
  const piecesLabel = `${itemsCount} ${itemsCount === 1 ? "pieza" : "piezas"}`;

  return (
    <section className={d.panelBudgetSummary} aria-label="Resumen del presupuesto">
      <h3 className={d.panelBudgetSummaryTitle}>Presupuesto · {piecesLabel}</h3>

      {cards.length === 0 ? (
        <p className={d.panelBudgetSummaryEmpty}>Aún no hay piezas en el presupuesto.</p>
      ) : (
        <ul className={d.panelBudgetSummaryList}>
          {cards.map((card) => {
            const code = card.listCode ?? card.title.split(" · ")[0] ?? card.title;
            const name =
              card.listName ?? card.title.split(" · ").slice(1).join(" · ") ?? card.title;
            const measures = card.listMeasures?.trim() || "";

            return (
              <li key={card.id} className={d.panelBudgetSummaryRow}>
                <span className={d.panelBudgetSummaryCode}>{code}</span>
                <div className={d.panelBudgetSummaryIdentity}>
                  <span className={d.panelBudgetSummaryName}>{name}</span>
                  {measures ? (
                    <span className={d.panelBudgetSummaryMeasures}>{measures}</span>
                  ) : null}
                </div>
                {quotePricingMode === "por_item" ? (
                  <strong className={d.panelBudgetSummaryPrice}>{card.price}</strong>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className={d.panelBudgetSummaryAction} onClick={onViewFullBudget}>
        Ver presupuesto completo
      </button>
    </section>
  );
}
