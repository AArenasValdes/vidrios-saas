"use client";

import { LuFilePlus2, LuPlus } from "react-icons/lu";

import type { PasoDosPanelComponentesProps } from "../../_types/paso-dos";

import { PasoDosPanelLista } from "./paso-dos-panel-lista";
import d from "../paso-dos-panel-desktop.module.css";

type QuoteStudioBudgetWorkspaceProps = Pick<
  PasoDosPanelComponentesProps,
  | "items"
  | "quotePricingMode"
  | "isMobileViewport"
  | "selectedQuickEditItem"
  | "selectedQuickEditViewItem"
  | "selectedQuickEditDraft"
  | "selectedQuickEditPricingLabel"
  | "selectedQuickEditIndex"
  | "selectedQuickEditPendingSameTypeCount"
  | "selectedQuickEditBatchTargets"
  | "effectiveQuickEditBatchSelectionIds"
  | "isQuickEditBatchSelectionOpen"
  | "expandedQuickEditFocusField"
  | "expandedQuickEditItemId"
  | "editingItemId"
  | "visibleComponentListState"
  | "shouldUseStepTwoListScroll"
  | "fieldErrorItems"
  | "stepTwoListRef"
  | "onQuickDraftChange"
  | "onQuickCommit"
  | "onQuickNavigate"
  | "onScrollToSummary"
  | "onStartBatchSelection"
  | "onToggleBatchTarget"
  | "onApplyQuickEditToSameType"
  | "onCancelBatchSelection"
  | "onMeasureFirstItem"
  | "onSelectQuickEditItem"
  | "onEditItem"
  | "onDuplicateItem"
  | "onRemoveItem"
  | "onRecalculateTemplatePrice"
  | "onSaveQuickPriceTemplateFromItem"
  | "isSavingQuickPriceTemplate"
  | "isAddGroupWizardOpen"
  | "isTotalGlobalCuadernoOpen"
  | "onOpenComponentCreator"
  | "onOpenFreeValueItemForm"
>;

export function QuoteStudioBudgetWorkspace({
  items,
  onOpenComponentCreator,
  onOpenFreeValueItemForm,
  ...listaProps
}: QuoteStudioBudgetWorkspaceProps) {
  const piecesLabel = `${items.length} ${items.length === 1 ? "pieza" : "piezas"}`;

  return (
    <section className={d.budgetWorkspace} aria-label="Presupuesto y piezas">
      <header className={d.budgetWorkspaceHeader}>
        <h2 className={d.budgetWorkspaceTitle}>Presupuesto · {piecesLabel}</h2>
        <div className={d.budgetWorkspaceActions}>
          <button
            type="button"
            className={d.budgetWorkspaceActionPrimary}
            onClick={onOpenComponentCreator}
          >
            <LuPlus aria-hidden />
            Agregar pieza
          </button>
          <button
            type="button"
            className={d.budgetWorkspaceActionSecondary}
            onClick={onOpenFreeValueItemForm}
          >
            <LuFilePlus2 aria-hidden />
            Trabajo libre
          </button>
        </div>
      </header>

      <div className={d.budgetWorkspaceList}>
        <PasoDosPanelLista
          {...listaProps}
          items={items}
          isDesktopQuoteStudio
          isPieceInEdition={false}
          listSurface="workspace"
        />
      </div>
    </section>
  );
}
