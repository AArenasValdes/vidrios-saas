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
<<<<<<< HEAD
        <h2>Elige el tipo de cotizacion</h2>
        <p>Parte simple. Si ya sabes el precio, crea un PDF profesional en pocos pasos.</p>
=======
        <h2>Como quieres calcular el presupuesto?</h2>
        <p>Elige si quieres sumar items o ingresar un total final.</p>
>>>>>>> codex/TWA-Android
      </div>

      <div className={s.stepTwoModeChoiceGrid}>
        <article
          className={`${s.stepTwoModeChoiceCard} ${s.stepTwoModeChoiceCardRecommended}`}
        >
          <span className={`${s.stepTwoModeChoiceBadge} ${s.stepTwoModeChoiceBadgeRecommended}`}>
            Recomendado
          </span>

<<<<<<< HEAD
=======
          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuComponent size={24} />
          </div>

          <div className={s.stepTwoModeChoiceCardCopy}>
            <strong>Cotizar por items</strong>
            <p>Para ventanas, puertas, shower o varios trabajos.</p>
          </div>

          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => onSelectMode("por_item")}
          >
            Usar items
          </button>
        </article>

        <article
          className={`${s.stepTwoModeChoiceCard} ${s.stepTwoModeChoiceCardFast}`}
        >
          <span className={`${s.stepTwoModeChoiceBadge} ${s.stepTwoModeChoiceBadgeFast}`}>
            Modo rapido
          </span>

>>>>>>> codex/TWA-Android
          <div
            className={`${s.stepTwoModeChoiceCardIcon} ${s.stepTwoModeChoiceCardIconFast}`}
            aria-hidden
          >
            <LuNotebookPen size={24} />
          </div>

          <div className={s.stepTwoModeChoiceCardCopy}>
            <strong>Cotizacion rapida</strong>
            <p>Si ya sabes el precio y solo quieres generar un PDF profesional.</p>
          </div>

          <button
            type="button"
            className={s.btnPrimary}
            onClick={onSelectFreeTotalMode}
          >
            Elegir cotizacion rapida
          </button>
        </article>

        <article className={`${s.stepTwoModeChoiceCard} ${s.stepTwoModeChoiceCardFast}`}>
          <span className={`${s.stepTwoModeChoiceBadge} ${s.stepTwoModeChoiceBadgeFast}`}>
            Mas detalle
          </span>

          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuComponent size={24} />
          </div>

          <div className={s.stepTwoModeChoiceCardCopy}>
            <strong>Cotizacion por componentes</strong>
            <p>Si quieres separar ventanas, puertas, shower door, medidas y cantidades.</p>
          </div>

          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => onSelectMode("por_item")}
          >
            Elegir componentes
          </button>
        </article>
      </div>
    </section>
  );
}
