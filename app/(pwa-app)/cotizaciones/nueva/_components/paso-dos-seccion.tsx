"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";

import type {
  PasoDosItemLibreFormProps,
  PasoDosFormularioComponenteProps,
  PasoDosPanelComponentesProps,
} from "../_types/paso-dos";

import { PasoDosFormularioComponente } from "./paso-dos-formulario-componente";
import { PasoDosAgregarGrupoSheet } from "./paso-dos/paso-dos-agregar-grupo-sheet";
import { PasoDosCambiarModoDialog } from "./paso-dos/paso-dos-cambiar-modo-dialog";
import { PasoDosItemLibreForm } from "./paso-dos/paso-dos-item-libre-form";
import { PasoDosPanelComponentes } from "./paso-dos-panel-componentes";
import { QuoteStudioBudgetWorkspace } from "./paso-dos/quote-studio-budget-workspace";
import { PasoDosModoCotizacion } from "./paso-dos/paso-dos-modo-cotizacion";
import { isQuoteStudioDesktopPieceInEdition } from "./paso-dos/quote-studio-desktop-edition";
import { resolveQuoteStudioPieceEditionHeadline } from "./paso-dos/quote-studio-piece-edition-label";
import d from "./paso-dos-panel-desktop.module.css";
import s from "../page.module.css";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

type PasoDosAgregarGrupoSheetProps = ComponentProps<typeof PasoDosAgregarGrupoSheet>;

type PasoDosSeccionProps = {
  formulario: PasoDosFormularioComponenteProps;
  panel: PasoDosPanelComponentesProps;
  itemLibreForm: PasoDosItemLibreFormProps;
  quoteModeChosen: boolean;
  quotePricingMode: QuotePricingMode;
  isMobileViewport: boolean;
  hasComponentDraftInProgress: boolean;
  budgetContext?: {
    clienteNombre: string;
    obra: string;
  };
  addGroupSheetProps: PasoDosAgregarGrupoSheetProps;
  onOpenCreator: () => void;
  onOpenFreeTotalNotebook: () => void;
  onSelectMode: (mode: QuotePricingMode) => void;
  onReturnToModeSelector: () => void;
  duplicateSourceCode?: string;
};

export function PasoDosSeccion({
  formulario,
  panel,
  itemLibreForm,
  quoteModeChosen,
  quotePricingMode,
  isMobileViewport,
  hasComponentDraftInProgress,
  budgetContext,
  addGroupSheetProps,
  onOpenCreator,
  onOpenFreeTotalNotebook,
  onSelectMode,
  onReturnToModeSelector,
  duplicateSourceCode,
}: PasoDosSeccionProps) {
  const [isCambiarModoDialogOpen, setIsCambiarModoDialogOpen] = useState(false);
  const [isFullBudgetPreviewOpen, setIsFullBudgetPreviewOpen] = useState(false);
  const primarySurfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      isMobileViewport ||
      !quoteModeChosen ||
      quotePricingMode !== "total_global" ||
      itemLibreForm.isOpen ||
      formulario.editingItemId ||
      addGroupSheetProps.isOpen
    ) {
      return;
    }

    onOpenFreeTotalNotebook();
  }, [
    isMobileViewport,
    quoteModeChosen,
    quotePricingMode,
    itemLibreForm.isOpen,
    formulario.editingItemId,
    addGroupSheetProps.isOpen,
    onOpenFreeTotalNotebook,
  ]);

  const showModeChoice =
    !formulario.editingItemId &&
    !itemLibreForm.isOpen &&
    !addGroupSheetProps.isOpen &&
    !quoteModeChosen;

  const showDesktopWorkspace =
    !isMobileViewport &&
    quoteModeChosen &&
    !itemLibreForm.isOpen &&
    !showModeChoice;
  const pieceEditionHeadline = addGroupSheetProps.draft
    ? resolveQuoteStudioPieceEditionHeadline({ duplicateSourceCode })
    : "";

  const activeDraftCard =
    !isMobileViewport &&
    addGroupSheetProps.isOpen &&
    addGroupSheetProps.entryMode !== "free_total_single" &&
    addGroupSheetProps.draft
      ? (() => {
          const isFreeVal = addGroupSheetProps.draft.subtipo === "Trabajo libre / Mantencion";
          const headline = pieceEditionHeadline;
          const componentType =
            addGroupSheetProps.draft.subtipo.trim() || "Tipo por definir";
          const stepLabel = isFreeVal
            ? "Paso 2 de 2"
            : `Paso ${Math.min(addGroupSheetProps.paso, 4)} de 4`;
          const missingLabel = isFreeVal
            ? "Falta completar detalle y valor"
            : addGroupSheetProps.paso >= 5
              ? "Falta finalizar la pieza"
              : addGroupSheetProps.paso >= 4
                ? "Falta definir el precio"
                : addGroupSheetProps.paso >= 3
                  ? "Faltan medidas y precio"
                  : addGroupSheetProps.draft.subtipo.trim()
                    ? "Falta elegir sistema, medidas y precio"
                    : "Faltan sistema, medidas y precio";
          return { headline, componentType, stepLabel, missingLabel };
        })()
      : null;

  const handleRequestSwitchMode = () => {
    if (hasComponentDraftInProgress || panel.items.length > 0) {
      setIsCambiarModoDialogOpen(true);
    } else {
      onReturnToModeSelector();
    }
  };

  const leftSurface = (() => {
    if (addGroupSheetProps.isOpen) {
      return (
        <PasoDosAgregarGrupoSheet
          {...addGroupSheetProps}
          variant="embedded"
          pieceEditionHeadline={pieceEditionHeadline}
          onDiscardDraft={onReturnToModeSelector}
          onRequestSwitchMode={handleRequestSwitchMode}
        />
      );
    }

    if (itemLibreForm.isOpen) {
      return <PasoDosItemLibreForm {...itemLibreForm} />;
    }

    if (
      showDesktopWorkspace &&
      quotePricingMode === "por_item" &&
      !addGroupSheetProps.isOpen &&
      !formulario.editingItemId &&
      !(panel.isDesktopQuoteStudio && !isMobileViewport)
    ) {
      return (
        <section className={s.desktopPieceEditor}>
          <div className={s.desktopEmptyPieceSurface}>
            {quotePricingMode === "por_item" ? (
              <button
                type="button"
                className={s.desktopPieceInlineModeSwitch}
                onClick={() => {
                  if (hasComponentDraftInProgress || panel.items.length > 0) {
                    setIsCambiarModoDialogOpen(true);
                  } else {
                    onReturnToModeSelector();
                  }
                }}
              >
                Por componentes · Cambiar
              </button>
            ) : null}
            <span className={s.desktopPieceEyebrow}>Presupuesto</span>
            <h2>{panel.items.length > 0 ? "Agrega otra pieza o revisa el presupuesto" : "Crea la primera pieza"}</h2>
            <p>Cada pieza se completa en cuatro pasos: tipo, sistema, medidas y precio.</p>
            <div>
              <button type="button" className={s.btnPrimary} onClick={onOpenCreator}>
                {panel.items.length > 0 ? "+ Agregar otra pieza" : "+ Agregar primera pieza"}
              </button>
            </div>
          </div>
        </section>
      );
    }

    return <PasoDosFormularioComponente {...formulario} />;
  })();

  const isQuoteStudioDesktop = Boolean(panel.isDesktopQuoteStudio && !isMobileViewport);

  const isQuoteStudioPieceEditing =
    isQuoteStudioDesktop &&
    isQuoteStudioDesktopPieceInEdition({
      isDesktopQuoteStudio: panel.isDesktopQuoteStudio,
      isMobileViewport,
      activeDraftCard,
      editingItemId: formulario.editingItemId,
      isAddGroupWizardOpen: addGroupSheetProps.isOpen,
    });

  const showQuoteStudioEditingLayout =
    isQuoteStudioDesktop && (isQuoteStudioPieceEditing || itemLibreForm.isOpen);

  const showQuoteStudioBudgetIdle =
    isQuoteStudioDesktop &&
    !showQuoteStudioEditingLayout &&
    showDesktopWorkspace &&
    quotePricingMode === "por_item";

  const showQuoteStudioDesktopLayout =
    showQuoteStudioBudgetIdle || showQuoteStudioEditingLayout;

  useEffect(() => {
    if (!showQuoteStudioEditingLayout) {
      const timeoutId = window.setTimeout(() => {
        setIsFullBudgetPreviewOpen(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [showQuoteStudioEditingLayout]);

  const stepTwoLayoutClassName = [
    s.stepTwoLayout,
    isQuoteStudioDesktop
      ? showQuoteStudioEditingLayout
        ? s.stepTwoLayoutQuoteStudioEditing
        : s.stepTwoLayoutQuoteStudioIdle
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const panelListaProps = {
    items: panel.items,
    quotePricingMode: panel.quotePricingMode,
    isMobileViewport: panel.isMobileViewport,
    isDesktopQuoteStudio: panel.isDesktopQuoteStudio,
    selectedQuickEditItem: panel.selectedQuickEditItem,
    selectedQuickEditViewItem: panel.selectedQuickEditViewItem,
    selectedQuickEditDraft: panel.selectedQuickEditDraft,
    selectedQuickEditPricingLabel: panel.selectedQuickEditPricingLabel,
    selectedQuickEditIndex: panel.selectedQuickEditIndex,
    selectedQuickEditPendingSameTypeCount: panel.selectedQuickEditPendingSameTypeCount,
    selectedQuickEditBatchTargets: panel.selectedQuickEditBatchTargets,
    effectiveQuickEditBatchSelectionIds: panel.effectiveQuickEditBatchSelectionIds,
    isQuickEditBatchSelectionOpen: panel.isQuickEditBatchSelectionOpen,
    expandedQuickEditFocusField: panel.expandedQuickEditFocusField,
    expandedQuickEditItemId: panel.expandedQuickEditItemId,
    editingItemId: panel.editingItemId,
    visibleComponentListState: panel.visibleComponentListState,
    shouldUseStepTwoListScroll: panel.shouldUseStepTwoListScroll,
    fieldErrorItems: panel.fieldErrorItems,
    stepTwoListRef: panel.stepTwoListRef,
    onQuickDraftChange: panel.onQuickDraftChange,
    onQuickCommit: panel.onQuickCommit,
    onQuickNavigate: panel.onQuickNavigate,
    onScrollToSummary: panel.onScrollToSummary,
    onStartBatchSelection: panel.onStartBatchSelection,
    onToggleBatchTarget: panel.onToggleBatchTarget,
    onApplyQuickEditToSameType: panel.onApplyQuickEditToSameType,
    onCancelBatchSelection: panel.onCancelBatchSelection,
    onMeasureFirstItem: panel.onMeasureFirstItem,
    onSelectQuickEditItem: panel.onSelectQuickEditItem,
    onEditItem: panel.onEditItem,
    onDuplicateItem: panel.onDuplicateItem,
    onRemoveItem: panel.onRemoveItem,
    onRecalculateTemplatePrice: panel.onRecalculateTemplatePrice,
    onSaveQuickPriceTemplateFromItem: panel.onSaveQuickPriceTemplateFromItem,
    isSavingQuickPriceTemplate: panel.isSavingQuickPriceTemplate,
    isAddGroupWizardOpen: panel.isAddGroupWizardOpen,
    isTotalGlobalCuadernoOpen: panel.isTotalGlobalCuadernoOpen,
    activeDraftCard,
    onContinueActiveDraft: () =>
      primarySurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
  };

  return (
    <div className={!isMobileViewport ? s.stepTwoDesktopShell : undefined}>
      {showModeChoice ? (
        <div className={s.stepTwoModeChoiceDesktopWrap}>
          <PasoDosModoCotizacion
            variant="desktop"
            contextCliente={budgetContext?.clienteNombre}
            contextObra={budgetContext?.obra}
            onSelectMode={onSelectMode}
            onSelectFreeTotalMode={() => {
              onSelectMode("total_global");
              onOpenFreeTotalNotebook();
            }}
          />
        </div>
      ) : showQuoteStudioDesktopLayout ? (
        <div className={stepTwoLayoutClassName}>
          <div className={s.stepTwoPrimarySurface} ref={primarySurfaceRef}>
            {showQuoteStudioBudgetIdle ? (
              <QuoteStudioBudgetWorkspace
                {...panelListaProps}
                onOpenComponentCreator={panel.onOpenComponentCreator}
                onOpenFreeValueItemForm={panel.onOpenFreeValueItemForm}
              />
            ) : isFullBudgetPreviewOpen ? (
              <>
                <div className={d.budgetPreviewBanner}>
                  <button
                    type="button"
                    className={d.budgetPreviewBack}
                    onClick={() => setIsFullBudgetPreviewOpen(false)}
                  >
                    Volver al editor
                  </button>
                  <span>Vista completa del presupuesto</span>
                </div>
                <QuoteStudioBudgetWorkspace
                  {...panelListaProps}
                  onOpenComponentCreator={panel.onOpenComponentCreator}
                  onOpenFreeValueItemForm={panel.onOpenFreeValueItemForm}
                />
              </>
            ) : (
              leftSurface
            )}
          </div>
          <PasoDosPanelComponentes
            {...panel}
            activeDraftCard={activeDraftCard}
            quoteStudioPanelMode="summary"
            onViewFullBudget={() => setIsFullBudgetPreviewOpen(true)}
            onContinueActiveDraft={panelListaProps.onContinueActiveDraft}
          />
        </div>
      ) : (
        <div className={stepTwoLayoutClassName}>
          <div className={s.stepTwoPrimarySurface} ref={primarySurfaceRef}>
            {leftSurface}
          </div>
          <PasoDosPanelComponentes
            {...panel}
            activeDraftCard={activeDraftCard}
            onContinueActiveDraft={() =>
              primarySurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
            }
          />
        </div>
      )}

      <PasoDosCambiarModoDialog
        hasDraftInProgress={hasComponentDraftInProgress}
        hasLoadedItems={panel.items.length > 0}
        isOpen={isCambiarModoDialogOpen}
        onClose={() => setIsCambiarModoDialogOpen(false)}
        onConfirm={() => {
          setIsCambiarModoDialogOpen(false);
          onReturnToModeSelector();
        }}
      />
    </div>
  );
}
