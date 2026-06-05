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
        <p>Escoge si quieres armar la cotizacion por items o redactarla como presupuesto rapido.</p>
      </div>
      <div className={s.stepTwoModeChoiceGrid}>
        <article className={s.stepTwoModeChoiceCard}>
          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuComponent size={28} />
          </div>
          <div>
            <strong>Cotizar por componentes</strong>
            <p>Agrega ventanas, puertas, reparaciones o cobros adicionales con precio por item.</p>
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
            <strong>Redactar cotizacion rapida</strong>
            <p>Escribe el trabajo completo, define el total final y genera el PDF.</p>
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