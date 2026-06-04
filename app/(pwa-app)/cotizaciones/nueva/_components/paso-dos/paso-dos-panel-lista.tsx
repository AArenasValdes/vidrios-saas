"use client";

import { LuCheck, LuFolderOpen, LuPencil, LuTrash2 } from "react-icons/lu";

import type { PasoDosPanelComponentesProps } from "../../_types/paso-dos";

import { EditorRapidoMovil } from "../editor-rapido-movil";
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
  | "onRemoveItem"
  | "onRecalculateTemplatePrice"
  | "onSaveQuickPriceTemplateFromItem"
  | "isSavingQuickPriceTemplate"
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
  onRemoveItem,
  onRecalculateTemplatePrice,
  onSaveQuickPriceTemplateFromItem,
  isSavingQuickPriceTemplate,
}: Props) {
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

      {items.length === 0 ? (
        <div className={`${s.emptyState} ${s.stepTwoPanelEmpty} ${s.stepTwoPanelEmptyMobile}`}>
          <LuFolderOpen size={32} aria-hidden />
          <strong>Aun no agregas componentes</strong>
          <span>Primero elige arriba el componente y despues lo veras aqui.</span>
        </div>
      ) : (
        <div
          className={`${s.stepTwoListViewport} ${viewportModeClass} ${
            shouldUseStepTwoListScroll ? s.stepTwoListViewportScrollable : ""
          }`}
          ref={stepTwoListRef}
        >
          <div className={`${s.stepTwoList} ${s.stepTwoListMobile} ${listModeClass}`}>
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
                    <div
                      className={s.stepTwoListThumbSvg}
                      dangerouslySetInnerHTML={{
                        __html: item.svgMarkup,
                      }}
                    />
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
