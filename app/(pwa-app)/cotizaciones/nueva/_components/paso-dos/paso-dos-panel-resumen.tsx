"use client";

import { LuChevronRight } from "react-icons/lu";

import type { PasoDosPanelComponentesProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosPanelComponentesProps,
  "items" | "isMobileViewport" | "subtotal" | "iva" | "total" | "stepTwoSummaryRef" | "onGoToSummary"
>;

export function PasoDosPanelResumen({
  items,
  isMobileViewport,
  subtotal,
  iva,
  total,
  stepTwoSummaryRef,
  onGoToSummary,
}: Props) {
  return (
    <>
      <div className={s.stepTwoPanelFooter} ref={stepTwoSummaryRef}>
        <div className={s.stepTwoTotalsGrid}>
          <div className={s.stepTwoTotalCell}>
            <span>Subtotal</span>
            <strong>{subtotal}</strong>
          </div>
          <div className={s.stepTwoTotalCell}>
            <span>IVA</span>
            <strong>{iva}</strong>
          </div>
          <div className={`${s.stepTwoTotalCell} ${s.stepTwoTotalCellWide}`}>
            <span>Total</span>
            <strong>{total}</strong>
          </div>
        </div>
        <button className={`${s.btnPrimary} ${s.stepTwoSummaryButton}`} type="button" onClick={onGoToSummary}>
          Ir al resumen <LuChevronRight aria-hidden />
        </button>
      </div>
      {isMobileViewport && items.length > 0 ? (
        <div className={`${s.stepTwoMobileDock} ${s.stepTwoMobileDockEnhanced}`}>
          <div className={s.stepTwoMobileDockInfo}>
            <span>
              {items.length} {items.length === 1 ? "componente cargado" : "componentes cargados"}
            </span>
            <strong>{total}</strong>
          </div>
          <button className={`${s.btnPrimary} ${s.stepTwoMobileDockButton}`} type="button" onClick={onGoToSummary}>
            Ir al resumen <LuChevronRight aria-hidden />
          </button>
        </div>
      ) : null}
    </>
  );
}
