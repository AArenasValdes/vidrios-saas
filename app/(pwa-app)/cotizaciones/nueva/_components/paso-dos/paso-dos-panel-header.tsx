"use client";

import { LuFilterX } from "react-icons/lu";

import type { PasoDosPanelComponentesProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosPanelComponentesProps,
  | "items"
  | "pendingItemsCount"
  | "completedItemsCount"
  | "effectiveShowOnlyPendingItems"
  | "showFilterToggle"
  | "onToggleShowOnlyPendingItems"
>;

export function PasoDosPanelHeader({
  items,
  pendingItemsCount,
  completedItemsCount,
  effectiveShowOnlyPendingItems,
  showFilterToggle,
  onToggleShowOnlyPendingItems,
}: Props) {
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
