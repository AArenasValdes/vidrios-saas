"use client";

import { LuComponent, LuFileText, LuWrench } from "react-icons/lu";

import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

import s from "../../page.module.css";

type PasoDosModoCotizacionProps = {
  onSelectMode: (mode: QuotePricingMode) => void;
  onOpenFreeValueItemForm: () => void;
};

export function PasoDosModoCotizacion({
  onSelectMode,
  onOpenFreeValueItemForm,
}: PasoDosModoCotizacionProps) {
  return (
    <section className={s.stepTwoModeChoice}>
      <div className={s.stepTwoModeChoiceHead}>
        <h2>Como quieres empezar?</h2>
        <p>Elige como quieres armar esta cotizacion.</p>
      </div>
      <div className={s.stepTwoModeChoiceGrid}>
        <article className={s.stepTwoModeChoiceCard}>
          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuComponent size={28} />
          </div>
          <div>
            <strong>Cotizar por componentes</strong>
            <p>Usa medidas, linea, vidrio y precio por grupo. Ideal para ventanas, puertas, panos, shower y barandas.</p>
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
          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuWrench size={28} />
          </div>
          <div>
            <strong>Agregar item libre con valor</strong>
            <p>Redacta un trabajo, reparacion, mantencion o cobro adicional sin usar el calculador tecnico.</p>
          </div>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={onOpenFreeValueItemForm}
          >
            Agregar item libre
          </button>
        </article>

        <article className={s.stepTwoModeChoiceCard}>
          <div className={s.stepTwoModeChoiceCardIcon} aria-hidden>
            <LuFileText size={28} />
          </div>
          <div>
            <strong>Redactar cotizacion rapida</strong>
            <p>Escribe el trabajo completo, define el total a cobrar al cliente y genera el PDF sin desglosar componentes.</p>
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