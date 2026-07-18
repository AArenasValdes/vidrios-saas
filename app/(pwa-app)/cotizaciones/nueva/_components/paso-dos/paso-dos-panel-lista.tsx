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
  | "isDesktopQuoteStudio"
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
  | "activeDraftCard"
  | "onContinueActiveDraft"
> & {
  isPieceInEdition?: boolean;
  listSurface?: "panel" | "workspace" | "belowEditor";
};

export function PasoDosPanelLista({
  items,
  quotePricingMode,
  isMobileViewport,
  isDesktopQuoteStudio,
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
  isTotalGlobalCuadernoOpen = false,
  activeDraftCard = null,
  onContinueActiveDraft,
  isPieceInEdition = false,
  listSurface = "panel",
}: Props) {
  const showPanelContinueAction = Boolean(onContinueActiveDraft) && !isPieceInEdition;
  const isWorkspaceList = listSurface === "workspace";
  const isBelowEditorList = listSurface === "belowEditor";
  if (!isMobileViewport) {
    const allCards = visibleComponentListState.cards;
    const incompleteCards = allCards.filter((item) => !item.isComplete);
    const completeCards = allCards.filter((item) => item.isComplete);
    const shouldUseCompactDraftSignal = isDesktopQuoteStudio;
    const hasEditingSection =
      (!shouldUseCompactDraftSignal && Boolean(activeDraftCard)) || incompleteCards.length > 0;
    const isEmpty = items.length === 0 && (!activeDraftCard || shouldUseCompactDraftSignal);

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

    const renderQuoteStudioDesktopCard = (item: ComponentListCardViewModel) => {
      const isQuickEditSelected = expandedQuickEditItemId === item.id;
      const isEditing = editingItemId === item.id;
      const isCompact = isPieceInEdition && listSurface !== "belowEditor";
      const listCode = item.listCode ?? item.title.split(" · ")[0] ?? item.title;
      const listName =
        item.listName ?? item.title.split(" · ").slice(1).join(" · ") ?? item.title;
      const listMeasures = item.listMeasures ?? item.metaPrimary ?? item.compactMeta;
      const listConfiguration = item.listConfiguration ?? item.metaSecondary ?? "";
      const listQuantity = item.listQuantity ?? "";
      const cardClassName = [
        panelDesktop.pieceCard,
        panelDesktop.pieceCardClickable,
        isCompact ? panelDesktop.pieceCardCompact : panelDesktop.pieceCardRich,
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
          <div className={panelDesktop.pieceCardThumb} aria-hidden>
            {item.svgMarkup ? (
              <div
                className={panelDesktop.pieceCardThumbSvg}
                dangerouslySetInnerHTML={{ __html: item.svgMarkup }}
              />
            ) : (
              <div className={panelDesktop.pieceCardThumbFallback}>
                {item.source.tipoItem === "item_libre_con_valor" ||
                item.listMeasures === "Trabajo libre"
                  ? "Trabajo libre"
                  : "Sin croquis"}
              </div>
            )}
          </div>

          <div className={panelDesktop.pieceCardMain}>
            <div className={panelDesktop.pieceCardHeadline}>
              <div className={panelDesktop.pieceCardIdentity}>
                <span className={panelDesktop.pieceCardCode}>{listCode}</span>
                <span className={panelDesktop.pieceCardName}>{listName}</span>
              </div>
              {quotePricingMode === "por_item" ? (
                <strong className={panelDesktop.pieceCardAmount}>{item.price}</strong>
              ) : null}
            </div>

            {isCompact ? (
              <p className={panelDesktop.pieceCardMetaCompact}>
                {listMeasures}
                {listConfiguration ? ` · ${listConfiguration}` : ""}
              </p>
            ) : (
              <>
                <p className={panelDesktop.pieceCardMeasures}>{listMeasures}</p>
                {listConfiguration ? (
                  <p className={panelDesktop.pieceCardConfig}>{listConfiguration}</p>
                ) : null}
              </>
            )}

            <div className={panelDesktop.pieceCardFooter}>
              <div className={panelDesktop.pieceCardFooterMeta}>
                {listQuantity ? (
                  <span className={panelDesktop.pieceCardQuantity}>{listQuantity}</span>
                ) : null}
                {!item.isComplete ? (
                  <span
                    className={`${panelDesktop.pieceBadge} ${panelDesktop.pieceBadgePending}`}
                  >
                    Incompleto
                  </span>
                ) : null}
              </div>
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
          </div>
        </article>
      );
    };

    const renderCard = isDesktopQuoteStudio ? renderQuoteStudioDesktopCard : renderDesktopCard;

    return (
      <>
        {fieldErrorItems ? <div className={s.inlineError}>{fieldErrorItems}</div> : null}

        {isEmpty ? (
          <div
            className={`${panelDesktop.emptyState} ${
              isWorkspaceList ? panelDesktop.emptyStateWorkspace : ""
            }`}
          >
            <LuFolderOpen size={28} aria-hidden />
            <strong>
              {isWorkspaceList
                ? "Aún no agregas piezas"
                : isTotalGlobalCuadernoOpen
                  ? "Trabajo en preparación"
                  : "Aún no agregas piezas"}
            </strong>
            <span>
              {isWorkspaceList
                ? "Usa Agregar pieza o Trabajo libre para comenzar."
                : isTotalGlobalCuadernoOpen
                  ? "Los componentes de este trabajo se arman en el cuaderno del centro."
                  : isAddGroupWizardOpen
                    ? "Termina el asistente de la izquierda."
                    : isBelowEditorList
                      ? "Las piezas del presupuesto aparecerán aquí."
                      : "Agrega la primera pieza desde la izquierda."}
            </span>
          </div>
        ) : (
          <div
            className={`${panelDesktop.listBody} ${
              isWorkspaceList ? panelDesktop.listBodyWorkspace : ""
            } ${isBelowEditorList ? panelDesktop.listBodyBelowEditor : ""} ${
              isDesktopQuoteStudio && !isPieceInEdition && !isWorkspaceList && !isBelowEditorList
                ? panelDesktop.listBodyIdle
                : ""
            } ${isDesktopQuoteStudio && isPieceInEdition && !isBelowEditorList ? panelDesktop.listBodyEditing : ""}`}
          >
            {isWorkspaceList || isBelowEditorList ? (
              <section className={panelDesktop.pieceSection} aria-label="Piezas del presupuesto">
                {!isBelowEditorList ? (
                  <h4 className={panelDesktop.pieceSectionTitle}>Piezas · {allCards.length}</h4>
                ) : null}
                {allCards.map(renderCard)}
              </section>
            ) : null}

            {!isWorkspaceList && !isBelowEditorList && hasEditingSection ? (
              <section className={panelDesktop.pieceSection} aria-label="Piezas en edición">
                <h4 className={panelDesktop.pieceSectionTitle}>
                  {shouldUseCompactDraftSignal
                    ? `Pendientes · ${incompleteCards.length}`
                    : "En edición"}
                </h4>

                {!shouldUseCompactDraftSignal && activeDraftCard ? (
                  <article className={`${panelDesktop.pieceCard} ${panelDesktop.pieceCardEditing}`}>
                    <div className={panelDesktop.pieceCardRowTop}>
                      <span className={panelDesktop.pieceCardTitle}>
                        {activeDraftCard.headline} · {activeDraftCard.componentType}
                      </span>
                    </div>
                    <span className={`${panelDesktop.pieceBadge} ${panelDesktop.pieceBadgeEditing}`}>
                      En edición · {activeDraftCard.stepLabel}
                    </span>
                    <p className={panelDesktop.pieceCardMeta}>{activeDraftCard.missingLabel}</p>
                    {showPanelContinueAction ? (
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

                {incompleteCards.map(renderCard)}
              </section>
            ) : null}

            {!isWorkspaceList && !isBelowEditorList && completeCards.length > 0 ? (
              <section
                className={panelDesktop.pieceSection}
                aria-label={isWorkspaceList ? "Piezas del presupuesto" : "Piezas completas"}
              >
                <h4 className={panelDesktop.pieceSectionTitle}>
                  {isWorkspaceList
                    ? `Piezas · ${completeCards.length}`
                    : shouldUseCompactDraftSignal
                      ? `Piezas agregadas · ${completeCards.length}`
                      : `Completas · ${completeCards.length}`}
                </h4>
                {completeCards.map(renderCard)}
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
                        {activeDraftCard.headline} · {activeDraftCard.componentType}
                      </div>
                      <div className={s.stepTwoStatusGroup}>
                        <span className={`${s.stepTwoStatusPill} ${s.stepTwoStatusPillPending}`}>
                          En edicion · {activeDraftCard.stepLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={s.stepTwoMetaLine}>{activeDraftCard.missingLabel}</div>
                  {showPanelContinueAction ? (
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
