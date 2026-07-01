"use client";

import { LuCheck, LuCopy, LuFolderOpen, LuPencil, LuTrash2 } from "react-icons/lu";

import type { ComponentListCardViewModel } from "@/features/cotizaciones/new-quote/workflow-ui";

import type { PasoDosPanelComponentesProps } from "../../_types/paso-dos";

import { EditorRapidoMovil } from "../editor-rapido-movil";
import panelDesktop from "../paso-dos-panel-desktop.module.css";
import s from "../../page.module.css";

type Props = Pick<
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
  | "activeDraftCard"
  | "onContinueActiveDraft"
>;

export function PasoDosPanelLista({
  items,
  quotePricingMode,
  isMobileViewport,
  selectedQuickEditItem,
  selectedQuickEditViewItem,
  selectedQuickEditDraft,
  selectedQuickEditPricingLabel,
  selectedQuickEditIndex,
  selectedQuickEditPendingSameTypeCount,
  selectedQuickEditBatchTargets,
  effectiveQuickEditBatchSelectionIds,
  isQuickEditBatchSelectionOpen,
  expandedQuickEditFocusField,
  expandedQuickEditItemId,
  editingItemId,
  visibleComponentListState,
  shouldUseStepTwoListScroll,
  fieldErrorItems,
  stepTwoListRef,
  onQuickDraftChange,
  onQuickCommit,
  onQuickNavigate,
  onScrollToSummary,
  onStartBatchSelection,
  onToggleBatchTarget,
  onApplyQuickEditToSameType,
  onCancelBatchSelection,
  onMeasureFirstItem,
  onSelectQuickEditItem,
  onEditItem,
  onDuplicateItem,
  onRemoveItem,
  onRecalculateTemplatePrice,
  onSaveQuickPriceTemplateFromItem,
  isSavingQuickPriceTemplate,
  isAddGroupWizardOpen = false,
  activeDraftCard = null,
  onContinueActiveDraft,
}: Props) {
  if (!isMobileViewport) {
    const allCards = visibleComponentListState.cards;
    const incompleteCards = allCards.filter((item) => !item.isComplete);
    const completeCards = allCards.filter((item) => item.isComplete);
    const hasEditingSection = Boolean(activeDraftCard) || incompleteCards.length > 0;
    const isEmpty = items.length === 0 && !activeDraftCard;

    const renderDesktopCard = (item: ComponentListCardViewModel) => {
      const isQuickEditSelected = expandedQuickEditItemId === item.id;
      const isEditing = editingItemId === item.id;
      const cardClassName = [
        panelDesktop.pieceCard,
        panelDesktop.pieceCardClickable,
        !item.isComplete ? panelDesktop.pieceCardEditing : "",
        isQuickEditSelected || isEditing ? panelDesktop.pieceCardSelected : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <article
          key={item.id}
          data-step-two-item-id={item.id}
          className={cardClassName}
          onClick={() => onEditItem(item.source)}
        >
          <div className={panelDesktop.pieceCardRowTop}>
            <span className={panelDesktop.pieceCardTitle}>{item.title}</span>
            {quotePricingMode === "por_item" ? (
              <strong className={panelDesktop.pieceCardAmount}>{item.price}</strong>
            ) : null}
          </div>
          <p className={panelDesktop.pieceCardMeta}>{item.metaPrimary || item.compactMeta}</p>
          <div className={panelDesktop.pieceCardFooter}>
            <span
              className={`${panelDesktop.pieceBadge} ${
                item.isComplete ? panelDesktop.pieceBadgeComplete : panelDesktop.pieceBadgePending
              }`}
            >
              {item.isComplete ? <LuCheck size={11} aria-hidden /> : null}
              {item.isComplete ? "Completo" : "Pendiente"}
            </span>
            <div className={panelDesktop.pieceCardActions}>
              <button
                className={panelDesktop.pieceIconButton}
                onClick={(event) => {
                  event.stopPropagation();
                  onEditItem(item.source);
                }}
                type="button"
                title="Editar"
                aria-label={`Editar ${item.title}`}
              >
                <LuPencil size={13} aria-hidden />
              </button>
              <button
                className={panelDesktop.pieceIconButton}
                type="button"
                title="Duplicar"
                aria-label={`Duplicar ${item.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicateItem(item.source);
                }}
              >
                <LuCopy size={13} aria-hidden />
              </button>
              <button
                className={panelDesktop.pieceIconButtonDanger}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveItem(item.id);
                }}
                type="button"
                title="Eliminar"
                aria-label={`Eliminar ${item.title}`}
              >
                <LuTrash2 size={13} aria-hidden />
              </button>
            </div>
          </div>
        </article>
      );
    };

    return (
      <>
        {fieldErrorItems ? <div className={s.inlineError}>{fieldErrorItems}</div> : null}

        {isEmpty ? (
          <div className={panelDesktop.emptyState}>
            <LuFolderOpen size={28} aria-hidden />
            <strong>Aun no agregas componentes</strong>
            <span>
              {isAddGroupWizardOpen
                ? "Termina el asistente de la izquierda."
                : "Agrega el primer componente desde la izquierda."}
            </span>
          </div>
        ) : (
          <div className={panelDesktop.listBody}>
            {hasEditingSection ? (
              <section className={panelDesktop.pieceSection} aria-label="Piezas en edición">
                <h4 className={panelDesktop.pieceSectionTitle}>En edición</h4>

                {activeDraftCard ? (
                  <article className={`${panelDesktop.pieceCard} ${panelDesktop.pieceCardEditing}`}>
                    <div className={panelDesktop.pieceCardRowTop}>
                      <span className={panelDesktop.pieceCardTitle}>
                        {activeDraftCard.code} · {activeDraftCard.title}
                      </span>
                    </div>
                    <span className={`${panelDesktop.pieceBadge} ${panelDesktop.pieceBadgeEditing}`}>
                      En edición · {activeDraftCard.stepLabel}
                    </span>
                    <p className={panelDesktop.pieceCardMeta}>{activeDraftCard.missingLabel}</p>
                    {onContinueActiveDraft ? (
                      <button
                        type="button"
                        className={panelDesktop.pieceContinueButton}
                        onClick={onContinueActiveDraft}
                      >
                        Continuar
                      </button>
                    ) : null}
                  </article>
                ) : null}

                {incompleteCards.map(renderDesktopCard)}
              </section>
            ) : null}

            {completeCards.length > 0 ? (
              <section className={panelDesktop.pieceSection} aria-label="Piezas completas">
                <h4 className={panelDesktop.pieceSectionTitle}>Completas · {completeCards.length}</h4>
                {completeCards.map(renderDesktopCard)}
              </section>
            ) : null}
          </div>
        )}
      </>
    );
  }

  const viewportModeClass = isMobileViewport
    ? s.stepTwoListViewportModeMobile
    : s.stepTwoListViewportModeDesktop;
  const listModeClass = isMobileViewport ? s.stepTwoListModeMobile : s.stepTwoListModeDesktop;
  const cardModeClass = isMobileViewport
    ? s.stepTwoListCardModeMobile
    : s.stepTwoListCardModeDesktop;

  return (
    <>
      {selectedQuickEditItem && selectedQuickEditViewItem && selectedQuickEditDraft ? (
        <EditorRapidoMovil
          key={selectedQuickEditViewItem.id}
          item={selectedQuickEditViewItem}
          draft={selectedQuickEditDraft}
          initialFocusField={expandedQuickEditFocusField}
          isMobileViewport={isMobileViewport}
          itemIndex={selectedQuickEditIndex}
          totalItems={items.length}
          sameTypePendingCount={selectedQuickEditPendingSameTypeCount}
          batchTargets={selectedQuickEditBatchTargets}
          selectedBatchTargetIds={effectiveQuickEditBatchSelectionIds}
          isBatchSelectionOpen={isQuickEditBatchSelectionOpen}
          quotePricingMode={quotePricingMode}
          pricingLabel={selectedQuickEditPricingLabel}
          onDraftChange={onQuickDraftChange}
          onCommit={onQuickCommit}
          onNavigate={onQuickNavigate}
          onScrollToSummary={onScrollToSummary}
          onStartBatchSelection={onStartBatchSelection}
          onToggleBatchTarget={onToggleBatchTarget}
          onApplyToSameType={onApplyQuickEditToSameType}
          onCancelBatchSelection={onCancelBatchSelection}
          onRecalculateTemplatePrice={() => onRecalculateTemplatePrice(selectedQuickEditViewItem.id)}
          onSaveQuickPriceTemplate={() =>
            onSaveQuickPriceTemplateFromItem(selectedQuickEditViewItem.id)
          }
          isSavingQuickPriceTemplate={isSavingQuickPriceTemplate}
        />
      ) : null}

      {fieldErrorItems ? <div className={s.inlineError}>{fieldErrorItems}</div> : null}

      {items.length === 0 && !activeDraftCard ? (
        <div
          className={`${s.emptyState} ${s.stepTwoPanelEmpty} ${
            isMobileViewport ? s.stepTwoPanelEmptyMobile : s.stepTwoPanelEmptyDesktop
          }`}
        >
          <LuFolderOpen size={isMobileViewport ? 32 : 28} aria-hidden />
          <strong>Aun no agregas componentes</strong>
          <span>
            {isAddGroupWizardOpen
              ? "Termina el asistente de la izquierda."
              : isMobileViewport
                ? "Primero elige arriba el componente y despues lo veras aqui."
                : "Agrega el primer componente desde la izquierda."}
          </span>
        </div>
      ) : (
        <div
          className={`${s.stepTwoListViewport} ${viewportModeClass} ${
            shouldUseStepTwoListScroll ? s.stepTwoListViewportScrollable : ""
          }`}
          ref={stepTwoListRef}
        >
          <div className={`${s.stepTwoList} ${s.stepTwoListMobile} ${listModeClass}`}>
            {activeDraftCard ? (
              <article
                className={`${s.stepTwoListCard} ${s.stepTwoListCardMobile} ${s.stepTwoListCardModeDesktop} ${s.desktopEditingDraftCard}`}
              >
                <div className={s.stepTwoListBody}>
                  <div className={s.stepTwoListTop}>
                    <div className={s.stepTwoListHeading}>
                      <div className={s.stepTwoListName}>
                        {activeDraftCard.code} · {activeDraftCard.title}
                      </div>
                      <div className={s.stepTwoStatusGroup}>
                        <span className={`${s.stepTwoStatusPill} ${s.stepTwoStatusPillPending}`}>
                          En edicion · {activeDraftCard.stepLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={s.stepTwoMetaLine}>{activeDraftCard.missingLabel}</div>
                  {onContinueActiveDraft ? (
                    <button
                      type="button"
                      className={panelDesktop.pieceContinueButton}
                      onClick={onContinueActiveDraft}
                    >
                      Continuar
                    </button>
                  ) : null}
                </div>
              </article>
            ) : null}
            {visibleComponentListState.paddingTop > 0 ? (
              <div
                aria-hidden
                className={s.stepTwoVirtualSpacer}
                style={{ height: `${visibleComponentListState.paddingTop}px` }}
              />
            ) : null}
            {visibleComponentListState.cards.map((item, index) => {
              const isQuickEditSelected = expandedQuickEditItemId === item.id;
              const isEditing = editingItemId === item.id;
              const cardSelectionStatusLabel = isEditing ? "Editando" : isQuickEditSelected ? "Activo" : null;

              return (
                <article
                  key={item.id}
                  data-step-two-item-id={item.id}
                  ref={(node) => {
                    if (index === 0) {
                      onMeasureFirstItem(node);
                    }
                  }}
                  onClick={() => onSelectQuickEditItem(item.id)}
                  className={`${s.stepTwoListCard} ${s.stepTwoListCardMobile} ${isEditing ? s.stepTwoListCardEditing : ""} ${
                    isQuickEditSelected ? s.stepTwoListCardSelected : ""
                  } ${cardModeClass}`}
                >
                  <div className={s.stepTwoListThumb}>
                    {item.svgMarkup ? (
                      <div
                        className={s.stepTwoListThumbSvg}
                        dangerouslySetInnerHTML={{
                          __html: item.svgMarkup,
                        }}
                      />
                    ) : (
                      <div className={s.customWorkThumb}>Descripcion</div>
                    )}
                  </div>

                  <div className={s.stepTwoListBody}>
                    <div className={s.stepTwoListTop}>
                      <div className={s.stepTwoListHeading}>
                        <div className={s.stepTwoListName}>{item.title}</div>
                        <div className={s.stepTwoStatusGroup}>
                          <span
                            className={`${s.stepTwoStatusPill} ${
                              item.isComplete ? s.stepTwoStatusPillComplete : s.stepTwoStatusPillPending
                            }`}
                          >
                            {item.isComplete ? <LuCheck size={12} aria-hidden /> : null}
                            {item.isComplete ? "Completo" : "Pendiente"}
                          </span>
                          {cardSelectionStatusLabel ? (
                            <span
                              className={`${s.stepTwoStatusPill} ${
                                isEditing ? s.stepTwoStatusPillEditing : s.stepTwoStatusPillSelected
                              }`}
                            >
                              {cardSelectionStatusLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {quotePricingMode === "por_item" ? (
                        <span className={s.stepTwoListPrice}>
                          {item.priceLabel} {item.price}
                        </span>
                      ) : null}
                    </div>

                    {isMobileViewport ? (
                      <div className={s.stepTwoMetaLine}>{item.compactMeta}</div>
                    ) : (
                      <>
                        <div className={s.stepTwoMetaLine}>{item.metaPrimary}</div>
                        <div className={s.stepTwoMetaLine}>{item.metaSecondary}</div>
                        {item.metaTertiary ? <div className={s.stepTwoMetaLine}>{item.metaTertiary}</div> : null}
                      </>
                    )}
                  </div>

                  <div className={s.stepTwoCardActions}>
                    <button
                      className={s.iconButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditItem(item.source);
                      }}
                      type="button"
                      title="Editar"
                      aria-label={`Editar ${item.title}`}
                    >
                      <LuPencil size={14} aria-hidden />
                    </button>
                    <button
                      className={s.iconButtonDanger}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveItem(item.id);
                      }}
                      type="button"
                      title="Eliminar"
                      aria-label={`Eliminar ${item.title}`}
                    >
                      <LuTrash2 size={14} aria-hidden />
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleComponentListState.paddingBottom > 0 ? (
              <div
                aria-hidden
                className={s.stepTwoVirtualSpacer}
                style={{ height: `${visibleComponentListState.paddingBottom}px` }}
              />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
