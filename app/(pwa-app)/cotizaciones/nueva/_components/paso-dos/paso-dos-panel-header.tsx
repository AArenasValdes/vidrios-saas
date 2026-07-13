"use client";

import { LuFilePlus2, LuFilterX, LuPlus } from "react-icons/lu";

import type { PasoDosPanelComponentesProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosPanelComponentesProps,
  | "items"
  | "isMobileViewport"
  | "isDesktopQuoteStudio"
  | "pendingItemsCount"
  | "completedItemsCount"
  | "quotePricingMode"
  | "effectiveShowOnlyPendingItems"
  | "showFilterToggle"
  | "activeDraftCard"
  | "onOpenComponentCreator"
  | "onOpenFreeValueItemForm"
  | "onToggleShowOnlyPendingItems"
>;

export function PasoDosPanelHeader({
  items,
  isMobileViewport,
  isDesktopQuoteStudio,
  pendingItemsCount,
  completedItemsCount,
  quotePricingMode,
  effectiveShowOnlyPendingItems,
  showFilterToggle,
  activeDraftCard,
  onOpenComponentCreator,
  onOpenFreeValueItemForm,
  onToggleShowOnlyPendingItems,
}: Props) {
  if (!isMobileViewport) {
    const draftInEdition = Boolean(activeDraftCard);
    const isTotalMode = quotePricingMode === "total_global";
    const piecesLabel = isTotalMode
      ? `${items.length} ${items.length === 1 ? "detalle" : "detalles"}`
      : `${items.length} ${items.length === 1 ? "pieza" : "piezas"}`;
    const editingCount = pendingItemsCount + (draftInEdition ? 1 : 0);
    const hideEditingCount = Boolean(isDesktopQuoteStudio);

    return (
      <div className={s.stepTwoPanelHeader}>
        <div className={s.stepTwoPanelHeaderMain}>
          <div className={s.stepTwoPanelTitle}>
            {isTotalMode ? "Presupuesto por total" : "Presupuesto"}
          </div>
          <div className={s.stepTwoPanelStats}>
            <span>{piecesLabel}</span>
            {!hideEditingCount && editingCount > 0 ? (
              <>
                <span className={s.stepTwoPanelStatDivider} aria-hidden />
                <span className={s.stepTwoPanelStatPending}>
                  {editingCount} en edición
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className={s.stepTwoPanelHeaderActions}>
          {quotePricingMode === "por_item" ? (
            <>
              <button className={s.stepTwoFilterButton} type="button" onClick={onOpenComponentCreator}>
                <LuPlus aria-hidden />
                Componente
              </button>
              <button
                className={s.stepTwoFilterButton}
                type="button"
                onClick={onOpenFreeValueItemForm}
                aria-label="Agregar ítem libre"
              >
                <LuFilePlus2 aria-hidden />
                Libre
              </button>
            </>
          ) : (
            <button className={s.stepTwoFilterButton} type="button" onClick={onOpenComponentCreator}>
              <LuPlus aria-hidden />
              + Agregar componente
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={s.stepTwoPanelHeader}>
      <div className={s.stepTwoPanelHeaderMain}>
        <div className={s.stepTwoPanelTitle}>Componentes cargados</div>
        <div className={s.stepTwoPanelStats}>
          <span className={s.stepTwoPanelStatPending}>{pendingItemsCount} pendientes</span>
          <span className={s.stepTwoPanelStatDivider} aria-hidden />
          <span className={s.stepTwoPanelStatComplete}>{completedItemsCount} listos</span>
        </div>
      </div>
      <div className={s.stepTwoPanelHeaderActions}>
        {items.length > 0 && quotePricingMode === "por_item" ? (
          <>
            <button className={s.stepTwoFilterButton} type="button" onClick={onOpenComponentCreator}>
              <LuPlus aria-hidden />
              {isMobileViewport ? "Agregar componente con precio" : "Con precio"}
            </button>
            <button className={s.stepTwoFilterButton} type="button" onClick={onOpenFreeValueItemForm}>
              <LuFilePlus2 aria-hidden />
              {isMobileViewport ? "Agregar item libre" : "Item libre"}
            </button>
          </>
        ) : null}
        {items.length > 0 && quotePricingMode === "total_global" ? (
          <button className={s.stepTwoFilterButton} type="button" onClick={onOpenComponentCreator}>
            <LuPlus aria-hidden />
            Agregar trabajo
          </button>
        ) : null}
        {items.length === 0 && quotePricingMode === "total_global" ? (
          <button className={s.stepTwoFilterButton} type="button" onClick={onOpenComponentCreator}>
            <LuPlus aria-hidden />
            Agregar primer trabajo
          </button>
        ) : null}
        {showFilterToggle ? (
          <button
            className={`${s.stepTwoFilterButton} ${effectiveShowOnlyPendingItems ? s.stepTwoFilterButtonActive : ""}`}
            type="button"
            onClick={onToggleShowOnlyPendingItems}
          >
            <LuFilterX aria-hidden />
            {effectiveShowOnlyPendingItems ? "Ver todos" : "Solo pendientes"}
          </button>
        ) : null}
        <span className={s.stepTwoCounter}>{items.length}</span>
      </div>
    </div>
  );
}
