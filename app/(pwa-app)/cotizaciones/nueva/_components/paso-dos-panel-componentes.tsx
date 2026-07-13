"use client";

import type { PasoDosPanelComponentesProps } from "../_types/paso-dos";

import { PasoDosPanelHeader } from "./paso-dos/paso-dos-panel-header";
import { PasoDosPanelLista } from "./paso-dos/paso-dos-panel-lista";
import { PasoDosPanelResumen } from "./paso-dos/paso-dos-panel-resumen";
import { QuoteStudioFinancialPanel } from "./paso-dos/quote-studio-financial-panel";
import { QuoteStudioPanelBudgetSummary } from "./paso-dos/quote-studio-panel-budget-summary";
import { isQuoteStudioDesktopPieceInEdition } from "./paso-dos/quote-studio-desktop-edition";
import {
  hasQuoteStudioCompletedPieces,
  QUOTE_STUDIO_DISCARDED_UNFINISHED_PIECE_TOAST,
  QUOTE_STUDIO_FINISH_PIECE_REVIEW_HINT,
  QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT,
} from "./paso-dos/quote-studio-desktop-edition";
import type { PasoDosPanelDesktopClasses } from "./paso-dos/paso-dos-panel-resumen";
import d from "./paso-dos-panel-desktop.module.css";
import s from "../page.module.css";

export function PasoDosPanelComponentes({
  stepTwoListRef,
  quoteStudioPanelMode = "full",
  onViewFullBudget,
  ...props
}: PasoDosPanelComponentesProps) {
  const desktopClasses = d as unknown as PasoDosPanelDesktopClasses;
  const activeDraft = props.activeDraftCard;
  const isQuoteStudioDesktop = Boolean(props.isDesktopQuoteStudio && !props.isMobileViewport);
  const isPieceInEdition = isQuoteStudioDesktopPieceInEdition({
    isDesktopQuoteStudio: props.isDesktopQuoteStudio,
    isMobileViewport: props.isMobileViewport,
    activeDraftCard: activeDraft,
    editingItemId: props.editingItemId,
    isAddGroupWizardOpen: props.isAddGroupWizardOpen,
  });
  const isSummaryPanel = isQuoteStudioDesktop && quoteStudioPanelMode === "summary";
  const showEditingBudgetSummary = isSummaryPanel && isPieceInEdition;
  const summaryNavigateHint =
    isQuoteStudioDesktop && isPieceInEdition && !hasQuoteStudioCompletedPieces(props.completedItemsCount)
      ? QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT
      : undefined;
  const panelModeClass =
    props.isDesktopQuoteStudio && !props.isMobileViewport
      ? isPieceInEdition
        ? d.panelEditing
        : d.panelIdle
      : "";

  if (props.isMobileViewport) {
    return (
      <aside
        className={`${s.card} ${s.stepTwoPanel} ${s.stepTwoPanelMobile} ${s.stepTwoPanelModeMobile}`}
        id="component-list"
      >
        <PasoDosPanelHeader {...props} />
        <PasoDosPanelLista {...props} stepTwoListRef={stepTwoListRef} />
        <PasoDosPanelResumen {...props} />
      </aside>
    );
  }

  if (isQuoteStudioDesktop) {
    return (
      <aside
        className={`${s.stepTwoPanel} ${s.stepTwoPanelModeDesktop} ${d.panel} ${d.panelQuoteStudio} ${panelModeClass} ${
          isSummaryPanel ? d.panelQuoteStudioSummary : ""
        }`}
        id="component-list"
      >
        <div className={d.panelShell}>
          {!isSummaryPanel ? (
            <div className={d.header}>
              <PasoDosPanelHeader {...props} />
            </div>
          ) : null}

          <div className={d.panelBody}>
            {!isSummaryPanel ? (
              <div className={d.panelListScroll} ref={stepTwoListRef}>
                <PasoDosPanelLista
                  {...props}
                  isPieceInEdition={isPieceInEdition}
                  stepTwoListRef={stepTwoListRef}
                />
              </div>
            ) : null}

            {showEditingBudgetSummary ? (
              <QuoteStudioPanelBudgetSummary
                itemsCount={props.items.length}
                cards={props.visibleComponentListState.cards}
                quotePricingMode={props.quotePricingMode}
                onViewFullBudget={onViewFullBudget ?? (() => undefined)}
              />
            ) : null}

            <QuoteStudioFinancialPanel
              embedded
              summary={props.financialSummary}
              adjustments={props.quoteStudioFinancial}
              formatCurrencyInput={props.formatCurrencyInput}
              onAdjustmentChange={props.onQuoteStudioFinancialChange}
              onApplyRecommendedPrice={props.onApplyQuoteStudioRecommendedPrice}
            />
          </div>

          <PasoDosPanelResumen
            {...props}
            isPieceInEdition={isPieceInEdition}
            pieceInEditionHint={QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT}
            summaryNavigateHint={summaryNavigateHint}
            layout="desktop"
            desktopClasses={desktopClasses}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`${s.stepTwoPanel} ${s.stepTwoPanelModeDesktop} ${d.panel} ${panelModeClass}`}
      id="component-list"
    >
      <div className={d.header}>
        <PasoDosPanelHeader {...props} />
      </div>
      <div className={d.scroll} ref={stepTwoListRef}>
        <div className={d.listRegion}>
          <PasoDosPanelLista
            {...props}
            isPieceInEdition={isPieceInEdition}
            stepTwoListRef={stepTwoListRef}
          />
        </div>
      </div>
      <PasoDosPanelResumen
        {...props}
        isPieceInEdition={isPieceInEdition}
        pieceInEditionHint={QUOTE_STUDIO_FINISH_PIECE_REVIEW_HINT}
        layout="desktop"
        desktopClasses={desktopClasses}
      />
    </aside>
  );
}
