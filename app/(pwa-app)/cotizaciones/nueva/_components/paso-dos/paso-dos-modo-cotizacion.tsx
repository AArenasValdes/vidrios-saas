"use client";

import { LuComponent, LuFileText } from "react-icons/lu";

import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

import s from "../../page.module.css";

type PasoDosModoCotizacionProps = {
  onSelectMode: (mode: QuotePricingMode) => void;
};

export function PasoDosModoCotizacion({ onSelectMode }: PasoDosModoCotizacionProps) {
  return (
    <section className={s.stepTwoModeChoice}>
      <div className={s.stepTwoModeChoiceHead}>
        <h2>Como quieres empezar?</h2>
        <p>La unica diferencia es como defines el precio: por cada item o con un total al final.</p>
      </div>
      <div className={s.stepTwoModeChoiceGrid}>
        <article className={s.stepTwoModeChoiceCard}>
          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuComponent size={28} />
          </div>
          <div>
            <strong>Cotizar por items</strong>
            <p>Agrega ventanas, puertas, reparaciones o cobros adicionales. Cada item lleva su propio precio y el total se calcula automatico.</p>
          </div>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => onSelectMode("por_item")}
          >
            Armar por items
          </button>
        </article>

        <article className={s.stepTwoModeChoiceCard}>
          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuFileText size={28} />
          </div>
          <div>
            <strong>Presupuesto por total</strong>
            <p>Describe el trabajo completo como una sola partida, sin desglosar precios por componente. Tu defines el valor final al terminar.</p>
          </div>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => onSelectMode("total_global")}
          >
            Crear presupuesto
          </button>
        </article>
      </div>
    </section>
  );
}