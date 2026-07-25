"use client";

import { LuChevronRight } from "react-icons/lu";

import type { PasoDosPanelComponentesProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

export type PasoDosPanelDesktopClasses = {
  footer: string;
  footerHint: string;
  totalsRow: string;
  totalItem: string;
  totalItemWide: string;
  summaryButton: string;
};

type Props = Pick<
  PasoDosPanelComponentesProps,
  | "items"
  | "quotePricingMode"
  | "isMobileViewport"
  | "subtotal"
  | "iva"
  | "total"
  | "stepTwoSummaryRef"
  | "onGoToSummary"
  | "mostrarIva"
  | "pendingItemsCount"
  | "completedItemsCount"
  | "isDesktopQuoteStudio"
> & {
  layout?: "mobile" | "desktop";
  desktopClasses?: PasoDosPanelDesktopClasses;
  isPieceInEdition?: boolean;
  pieceInEditionHint?: string;
  summaryNavigateHint?: string;
};

export function PasoDosPanelResumen({
  items,
  quotePricingMode,
  isMobileViewport,
  subtotal,
  iva,
  total,
  mostrarIva,
  pendingItemsCount,
  completedItemsCount,
  isDesktopQuoteStudio,
  stepTwoSummaryRef,
  onGoToSummary,
  layout = "mobile",
  desktopClasses,
  isPieceInEdition = false,
  pieceInEditionHint = "Finaliza la pieza para continuar con la revisión",
  summaryNavigateHint,
}: Props) {
  const isDesktopLayout = layout === "desktop" && desktopClasses;
  const isQuoteStudioFinancialLayout = Boolean(isDesktopLayout && isDesktopQuoteStudio);
  const isQuoteStudioEditingNavigate = Boolean(isQuoteStudioFinancialLayout && isPieceInEdition);
  const hasCompletedPieces = completedItemsCount > 0;
  const shouldHideReviewAction = false;
  const isTotalMode = quotePricingMode === "total_global";
  const hasZeroValueItem = items.some((item) => Number(item.precioTotal ?? 0) <= 0);
  const totalValor = Number(String(total ?? "0").replace(/[^0-9]/g, ""));
  const blockedReason = isTotalMode
    ? (totalValor > 0
        ? ""
        : "Define el valor final del presupuesto para continuar.")
    : pendingItemsCount > 0
      ? `Completa ${pendingItemsCount} ${pendingItemsCount === 1 ? "pieza pendiente" : "piezas pendientes"} para continuar.`
      : items.length === 0
        ? "Agrega al menos una pieza para continuar."
        : hasZeroValueItem
          ? "Define precio mayor a $0 en cada pieza."
          : "";
  const isSummaryBlocked =
    isQuoteStudioEditingNavigate && !hasCompletedPieces
      ? true
      : isDesktopLayout && Boolean(blockedReason);
  const reviewButtonLabel = isQuoteStudioFinancialLayout
    ? "Ir al resumen"
    : isDesktopLayout
      ? "Continuar a revisar"
      : "Ir al resumen";
  const footerHint =
    summaryNavigateHint ??
    (isQuoteStudioEditingNavigate && !hasCompletedPieces
      ? pieceInEditionHint
      : isDesktopLayout && blockedReason
        ? blockedReason
        : "");

  return (
    <>
      <div
        className={isDesktopLayout ? desktopClasses.footer : s.stepTwoPanelFooter}
        ref={stepTwoSummaryRef}
      >
        <div className={isDesktopLayout ? desktopClasses.totalsRow : s.stepTwoTotalsGrid}>
          <div className={isDesktopLayout ? desktopClasses.totalItem : s.stepTwoTotalCell}>
            <span>
              {isQuoteStudioFinancialLayout
                ? "Subtotal neto"
                : mostrarIva
                  ? "Subtotal neto"
                  : "Precios finales"}
            </span>
            <strong>{subtotal}</strong>
          </div>
          {mostrarIva ? (
            <div className={isDesktopLayout ? desktopClasses.totalItem : s.stepTwoTotalCell}>
              <span>IVA 19%</span>
              <strong>{iva}</strong>
            </div>
          ) : null}
          <div
            className={
              isDesktopLayout
                ? `${desktopClasses.totalItem} ${desktopClasses.totalItemWide}`
                : `${s.stepTwoTotalCell} ${s.stepTwoTotalCellWide}`
            }
          >
            <span>{isQuoteStudioFinancialLayout ? "Total a cobrar con IVA" : "Total final"}</span>
            <strong>{total}</strong>
          </div>
        </div>
        <button
          className={`${s.btnPrimary} ${isDesktopLayout ? desktopClasses.summaryButton : s.stepTwoSummaryButton}`}
          type="button"
          onClick={onGoToSummary}
          disabled={isSummaryBlocked}
          hidden={shouldHideReviewAction}
        >
          {reviewButtonLabel} <LuChevronRight aria-hidden />
        </button>
        {footerHint ? (
          <p className={desktopClasses?.footerHint ?? s.desktopSummaryBlockReason}>{footerHint}</p>
        ) : null}
      </div>
      {isMobileViewport && items.length > 0 ? (
        <div className={`${s.stepTwoMobileDock} ${s.stepTwoMobileDockEnhanced}`}>
          <div className={s.stepTwoMobileDockInfo}>
            <span>
              {quotePricingMode === "total_global"
                ? `${items.length} ${items.length === 1 ? "trabajo cargado" : "trabajos cargados"}`
                : `${items.length} ${items.length === 1 ? "componente cargado" : "componentes cargados"}`}
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
