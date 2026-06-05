"use client";

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
      </div>
      <div className={s.stepTwoModeChoiceGrid}>
        <article className={s.stepTwoModeChoiceCard}>
          <div>
            <strong>Cotizar por componentes</strong>
            <p>Agrega ventanas, puertas, shower o panos con medidas, linea y precio por grupo.</p>
          </div>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => onSelectMode("por_item")}
          >
            Agregar componente con precio
          </button>
        </article>

        <article className={s.stepTwoModeChoiceCard}>
          <div>
            <strong>Cotizacion rapida por total</strong>
            <p>Redacta la obra completa, escribe el valor final y genera el PDF rapido.</p>
          </div>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => onSelectMode("total_global")}
          >
            Crear cotizacion rapida
          </button>
        </article>
      </div>
    </section>
  );
}
