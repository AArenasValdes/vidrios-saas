"use client";

import { LuChevronRight } from "react-icons/lu";

import type { PasoDosPanelComponentesProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosPanelComponentesProps,
  "items" | "quotePricingMode" | "isMobileViewport" | "subtotal" | "iva" | "total" | "stepTwoSummaryRef" | "onGoToSummary"
  | "mostrarIva"
>;

export function PasoDosPanelResumen({
  items,
  quotePricingMode,
  isMobileViewport,
  subtotal,
  iva,
  total,
  mostrarIva,
  stepTwoSummaryRef,
  onGoToSummary,
}: Props) {
  return (
    <>
      <div className={s.stepTwoPanelFooter} ref={stepTwoSummaryRef}>
        {quotePricingMode === "total_global" ? (
          <div className={s.stepTwoGlobalSummary}>
            <strong>
              {items.length} trabajo{items.length !== 1 ? "s" : ""} agregado{items.length !== 1 ? "s" : ""}
            </strong>
            <span>Total se define en el resumen</span>
          </div>
        ) : (
          <div className={s.stepTwoTotalsGrid}>
            <div className={s.stepTwoTotalCell}>
              <span>{mostrarIva ? "Subtotal neto" : "Precios finales"}</span>
              <strong>{subtotal}</strong>
            </div>
            {mostrarIva ? (
              <div className={s.stepTwoTotalCell}>
                <span>IVA 19%</span>
                <strong>{iva}</strong>
              </div>
            ) : null}
            <div className={`${s.stepTwoTotalCell} ${s.stepTwoTotalCellWide}`}>
              <span>Total final</span>
              <strong>{total}</strong>
            </div>
          </div>
        )}
        <button className={`${s.btnPrimary} ${s.stepTwoSummaryButton}`} type="button" onClick={onGoToSummary}>
          Ir al resumen <LuChevronRight aria-hidden />
        </button>
      </div>
      {isMobileViewport && items.length > 0 ? (
        <div className={`${s.stepTwoMobileDock} ${s.stepTwoMobileDockEnhanced}`}>
          <div className={s.stepTwoMobileDockInfo}>
            <span>
              {quotePricingMode === "total_global"
                ? `${items.length} trabajo${items.length !== 1 ? "s" : ""} agregado${items.length !== 1 ? "s" : ""}`
                : `${items.length} ${items.length === 1 ? "componente cargado" : "componentes cargados"}`}
            </span>
            <strong>{quotePricingMode === "total_global" ? "Total se define en el resumen" : total}</strong>
          </div>
          <button className={`${s.btnPrimary} ${s.stepTwoMobileDockButton}`} type="button" onClick={onGoToSummary}>
            Ir al resumen <LuChevronRight aria-hidden />
          </button>
        </div>
      ) : null}
    </>
  );
}
