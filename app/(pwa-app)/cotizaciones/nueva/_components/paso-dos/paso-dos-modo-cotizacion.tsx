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
        <h2>¿Cómo quieres armar esta cotización?</h2>
      </div>
      <div className={s.stepTwoModeChoiceGrid}>
        <article className={s.stepTwoModeChoiceCard}>
          <div>
            <strong>Cotizar por componentes</strong>
            <p>Agrega ventanas, puertas o shower con medidas, línea y precio por grupo.</p>
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
            <strong>Cotizar por total del trabajo</strong>
            <p>Describe la obra completa y escribe un único total final en el resumen.</p>
          </div>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => onSelectMode("total_global")}
          >
            Agregar trabajo por total
          </button>
        </article>
      </div>
    </section>
  );
}
