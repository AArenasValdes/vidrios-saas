"use client";

import { LuComponent, LuNotebookPen } from "react-icons/lu";

import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

import s from "../../page.module.css";

type PasoDosModoCotizacionProps = {
  onSelectMode: (mode: QuotePricingMode) => void;
  onSelectFreeTotalMode: () => void;
};

export function PasoDosModoCotizacion({
  onSelectMode,
  onSelectFreeTotalMode,
}: PasoDosModoCotizacionProps) {
  return (
    <section className={s.stepTwoModeChoice}>
      <div className={s.stepTwoModeChoiceHead}>
        <h2>¿Cómo quieres calcular el presupuesto?</h2>
        <p>Elige si quieres sumar ítems o ingresar un total final.</p>
      </div>

      <div className={s.stepTwoModeChoiceGrid}>
        <article
          className={`${s.stepTwoModeChoiceCard} ${s.stepTwoModeChoiceCardRecommended}`}
        >
          <span className={`${s.stepTwoModeChoiceBadge} ${s.stepTwoModeChoiceBadgeRecommended}`}>
            Recomendado
          </span>

          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuComponent size={24} />
          </div>

          <div className={s.stepTwoModeChoiceCardCopy}>
            <strong>Cotizar por ítems</strong>
            <p>Para ventanas, puertas, shower o varios trabajos.</p>
          </div>

          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => onSelectMode("por_item")}
          >
            Usar ítems
          </button>
        </article>

        <article
          className={`${s.stepTwoModeChoiceCard} ${s.stepTwoModeChoiceCardFast}`}
        >
          <span className={`${s.stepTwoModeChoiceBadge} ${s.stepTwoModeChoiceBadgeFast}`}>
            Modo rápido
          </span>

          <div
            className={`${s.stepTwoModeChoiceCardIcon} ${s.stepTwoModeChoiceCardIconFast}`}
            aria-hidden
          >
            <LuNotebookPen size={24} />
          </div>

          <div className={s.stepTwoModeChoiceCardCopy}>
            <strong>Cotizar libre por total</strong>
            <p>Para reparaciones, cambios de vidrio o trabajos personalizados.</p>
          </div>

          <button
            type="button"
            className={s.btnPrimary}
            onClick={onSelectFreeTotalMode}
          >
            Usar total final
          </button>
        </article>
      </div>
    </section>
  );
}
