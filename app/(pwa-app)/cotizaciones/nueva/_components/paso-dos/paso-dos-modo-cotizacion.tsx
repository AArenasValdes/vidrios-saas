"use client";

import type { KeyboardEvent } from "react";
import { LuComponent, LuNotebookPen } from "react-icons/lu";

import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

import s from "../../page.module.css";

type PasoDosModoCotizacionProps = {
  variant?: "mobile" | "desktop";
  contextCliente?: string;
  contextObra?: string;
  onSelectMode: (mode: QuotePricingMode) => void;
  onSelectFreeTotalMode: () => void;
};

function handleDesktopCardKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  action: () => void
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export function PasoDosModoCotizacion({
  variant = "mobile",
  contextCliente = "",
  contextObra = "",
  onSelectMode,
  onSelectFreeTotalMode,
}: PasoDosModoCotizacionProps) {
  const isDesktop = variant === "desktop";
  const clienteLabel = contextCliente.trim() || "Sin seleccionar";
  const obraLabel = contextObra.trim() || "Sin definir";

  const selectItems = () => onSelectMode("por_item");

  return (
    <section
      className={`${s.stepTwoModeChoice} ${isDesktop ? s.stepTwoModeChoiceDesktop : ""}`}
      aria-label="Seleccion de modalidad de presupuesto"
    >
      {isDesktop ? (
        <p className={s.stepTwoModeChoiceDesktopContext}>
          Cliente: {clienteLabel} · Trabajo: {obraLabel}
        </p>
      ) : null}

      <div className={s.stepTwoModeChoiceHead}>
        <h2>
          {isDesktop
            ? "¿Cómo quieres preparar el presupuesto?"
            : "Como quieres calcular el presupuesto?"}
        </h2>
        <p>
          {isDesktop
            ? "Elige si quieres sumar ítems o ingresar un total final."
            : "Elige si quieres sumar items o ingresar un total final."}
        </p>
      </div>

      <div
        className={`${s.stepTwoModeChoiceGrid} ${isDesktop ? s.stepTwoModeChoiceDesktopGrid : ""}`}
      >
        {isDesktop ? (
          <>
            <button
              type="button"
              className={`${s.stepTwoModeChoiceCard} ${s.stepTwoModeChoiceDesktopCard} ${s.stepTwoModeChoiceDesktopCardAction}`}
              onClick={selectItems}
              onKeyDown={(event) => handleDesktopCardKeyDown(event, selectItems)}
            >
              <div
                className={`${s.stepTwoModeChoiceCardIcon} ${s.stepTwoModeChoiceDesktopCardIconItems}`}
                aria-hidden
              >
                <LuComponent size={24} />
              </div>

              <div className={s.stepTwoModeChoiceCardCopy}>
                <strong>Cotizar por ítems</strong>
                <p>Para ventanas, puertas, shower, cierres o varios trabajos.</p>
              </div>

              <span className={s.stepTwoModeChoiceDesktopCardCta}>Usar ítems</span>
            </button>

            <button
              type="button"
              className={`${s.stepTwoModeChoiceCard} ${s.stepTwoModeChoiceDesktopCard} ${s.stepTwoModeChoiceDesktopCardAction}`}
              onClick={onSelectFreeTotalMode}
              onKeyDown={(event) => handleDesktopCardKeyDown(event, onSelectFreeTotalMode)}
            >
              <div
                className={`${s.stepTwoModeChoiceCardIcon} ${s.stepTwoModeChoiceDesktopCardIconTotal}`}
                aria-hidden
              >
                <LuNotebookPen size={24} />
              </div>

              <div className={s.stepTwoModeChoiceCardCopy}>
                <strong>Cotizar por total</strong>
                <p>Para mantenciones, reparaciones o trabajos con un valor final.</p>
              </div>

              <span className={s.stepTwoModeChoiceDesktopCardCta}>Usar total final</span>
            </button>
          </>
        ) : (
          <>
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
                <strong>Cotizar por items</strong>
                <p>Para ventanas, puertas, shower o varios trabajos.</p>
              </div>

              <button type="button" className={s.btnPrimary} onClick={selectItems}>
                Usar items
              </button>
            </article>

            <article className={`${s.stepTwoModeChoiceCard} ${s.stepTwoModeChoiceCardFast}`}>
              <span className={`${s.stepTwoModeChoiceBadge} ${s.stepTwoModeChoiceBadgeFast}`}>
                Modo rapido
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

              <button type="button" className={s.btnPrimary} onClick={onSelectFreeTotalMode}>
                Usar total final
              </button>
            </article>
          </>
        )}
      </div>
    </section>
  );
}
