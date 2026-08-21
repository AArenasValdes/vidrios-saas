"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { QuoteStudioFinancialPanel } from "./paso-dos/quote-studio-financial-panel";
import { PasoDosPanelResumen } from "./paso-dos/paso-dos-panel-resumen";
import {
  hasQuoteStudioCompletedPieces,
  QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT,
} from "./paso-dos/quote-studio-desktop-edition";
import { QuoteConstructorWorkspace } from "@/features/cotizaciones/visual-composer/components/quote-constructor-workspace";
import { DespieceReviewSurface } from "@/features/cotizaciones/visual-composer/components/despiece-review-surface";
import { PasoDosModoCotizacion } from "./paso-dos/paso-dos-modo-cotizacion";
import { isQuoteStudioDesktopPieceInEdition } from "./paso-dos/quote-studio-desktop-edition";
import { resolveQuoteStudioPieceEditionHeadline } from "./paso-dos/quote-studio-piece-edition-label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import d from "./paso-dos-panel-desktop.module.css";
import s from "../page.module.css";
import type { PasoDosPanelDesktopClasses } from "./paso-dos/paso-dos-panel-resumen";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type {
  QuoteConstructorItemPatch,
  QuoteConstructorPresetId,
} from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import {
  QUOTE_DESKTOP_WORKSPACE_MODE_LABELS,
  isPieceCommerciallyComplete,
  readQuoteDesktopWorkspaceModePreference,
  writeQuoteDesktopWorkspaceModePreference,
  type QuoteDesktopWorkspaceMode,
} from "@/features/cotizaciones/new-quote/quote-piece-domain";

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
  constructorLineTemplates: CotizacionLineTemplate[];
  constructorGlassOptions: readonly string[];
  totalClienteManual: number | null;
  formatCurrencyInput: (value: string) => string;
  onAddConstructorPreset: (
    preset: QuoteConstructorPresetId,
    lineTemplateId?: string
  ) => string | null;
  onUpdateConstructorItem: (itemId: string, patch: QuoteConstructorItemPatch) => void;
  onMoveConstructorItem: (itemId: string, direction: -1 | 1) => void;
  onGlobalTotalClienteChange: (value: string) => void;
  onClosePieceEditors?: () => void;
  isSaving?: boolean;
  preferredWorkspaceMode?: QuoteDesktopWorkspaceMode | null;
  onDesktopWorkspaceModeChange?: (mode: QuoteDesktopWorkspaceMode) => void;
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
  constructorLineTemplates,
  constructorGlassOptions,
  totalClienteManual,
  formatCurrencyInput,
  onAddConstructorPreset,
  onUpdateConstructorItem,
  onMoveConstructorItem,
  onGlobalTotalClienteChange,
  onClosePieceEditors,
  isSaving = false,
  preferredWorkspaceMode = null,
  onDesktopWorkspaceModeChange,
}: PasoDosSeccionProps) {
  const [isCambiarModoDialogOpen, setIsCambiarModoDialogOpen] = useState(false);
  const [isFullBudgetPreviewOpen, setIsFullBudgetPreviewOpen] = useState(false);
  const [pendingRemoveItemId, setPendingRemoveItemId] = useState<string | null>(null);
  const [desktopWorkspaceMode, setDesktopWorkspaceMode] = useState<QuoteDesktopWorkspaceMode>(
    () => preferredWorkspaceMode ?? readQuoteDesktopWorkspaceModePreference()
  );
  const [constructorActiveItemId, setConstructorActiveItemId] = useState<string | null>(null);
  const [despieceReviewOpen, setDespieceReviewOpen] = useState(false);
  const primarySurfaceRef = useRef<HTMLDivElement>(null);

  const pendingRemoveItem = useMemo(
    () => panel.items.find((item) => item.id === pendingRemoveItemId) ?? null,
    [panel.items, pendingRemoveItemId]
  );

  const requestRemoveItem = (itemId: string) => {
    setPendingRemoveItemId(itemId);
  };

  const confirmRemoveItem = () => {
    if (!pendingRemoveItemId) return;
    const itemId = pendingRemoveItemId;
    const label =
      pendingRemoveItem?.nombre?.trim() ||
      pendingRemoveItem?.codigo?.trim() ||
      "la pieza";
    setPendingRemoveItemId(null);
    panel.onRemoveItem(itemId);
    if (constructorActiveItemId === itemId) setConstructorActiveItemId(null);
    toast.success(`Se eliminó ${label}`);
  };

  const cancelRemoveItem = () => {
    setPendingRemoveItemId(null);
  };

  const closeOpenPieceEditors = () => {
    if (itemLibreForm.isOpen) {
      itemLibreForm.onCancel();
    }
    onClosePieceEditors?.();
  };

  const setWorkspaceMode = (mode: QuoteDesktopWorkspaceMode) => {
    if (mode === "rapida") {
      // La rápida es el cuaderno: cerrar wizard/editor guiado para no dejar
      // la misma pantalla de "Nueva pieza" con el tab en rápida.
      closeOpenPieceEditors();
    }
    setDesktopWorkspaceMode(mode);
    writeQuoteDesktopWorkspaceModePreference(mode);
    onDesktopWorkspaceModeChange?.(mode);
  };

  useEffect(() => {
    if (!isMobileViewport && quoteModeChosen && quotePricingMode === "por_item") {
      onDesktopWorkspaceModeChange?.(desktopWorkspaceMode);
    }
  }, [
    desktopWorkspaceMode,
    isMobileViewport,
    onDesktopWorkspaceModeChange,
    quoteModeChosen,
    quotePricingMode,
  ]);

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

    // Cotizar por total siempre abre el cuaderno digital, aunque la
    // preferencia desktop sea "Cotización rápida" (esa aplica solo a por ítems).
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
  const showRapidaWorkspace =
    !isMobileViewport &&
    quoteModeChosen &&
    quotePricingMode === "por_item" &&
    desktopWorkspaceMode === "rapida";
  const pieceEditionHeadline = addGroupSheetProps.draft
    ? resolveQuoteStudioPieceEditionHeadline({ duplicateSourceCode })
    : "";

  const completeCount = useMemo(
    () => panel.items.filter((item) => isPieceCommerciallyComplete(item, quotePricingMode)).length,
    [panel.items, quotePricingMode]
  );
  const pendingCount = Math.max(0, panel.items.length - completeCount);

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
            : `Paso ${Math.min(addGroupSheetProps.paso, 5)} de 5`;
          const missingLabel = isFreeVal
            ? "Falta completar detalle y valor"
            : addGroupSheetProps.paso >= 5
              ? "Falta definir el precio"
              : addGroupSheetProps.paso >= 4
                ? "Falta revisar el despiece"
                : addGroupSheetProps.paso >= 3
                  ? "Faltan medidas y despiece"
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

  const openGuidedForItem = (item: (typeof panel.items)[number]) => {
    setWorkspaceMode("guiada");
    panel.onEditItem(item);
  };

  const leftSurface = (() => {
    if (itemLibreForm.isOpen) {
      return <PasoDosItemLibreForm {...itemLibreForm} />;
    }

    if (addGroupSheetProps.isOpen) {
      return (
        <PasoDosAgregarGrupoSheet
          {...addGroupSheetProps}
          variant="embedded"
          pieceEditionHeadline={pieceEditionHeadline}
          onDiscardDraft={onReturnToModeSelector}
          onRequestSwitchMode={handleRequestSwitchMode}
          onOpenDespieceReview={() => {
            if (formulario.editingItemId) {
              setConstructorActiveItemId(formulario.editingItemId);
              panel.onSelectQuickEditItem(formulario.editingItemId);
            }
            setDespieceReviewOpen(true);
          }}
        />
      );
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
            <span className={s.desktopPieceEyebrow}>Cotización guiada</span>
            <h2>{panel.items.length > 0 ? "Agrega otra pieza o revisa el presupuesto" : "Crea la primera pieza"}</h2>
            <p>Cada pieza se completa en cinco pasos: tipo, sistema, medidas, despiece y precio.</p>
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

  const showQuoteStudioRapidaLayout = showRapidaWorkspace && isQuoteStudioDesktop;

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
    showQuoteStudioRapidaLayout || showQuoteStudioBudgetIdle || showQuoteStudioEditingLayout;

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
      ? showQuoteStudioRapidaLayout
        ? s.stepTwoLayoutQuoteStudioRapida
        : showQuoteStudioEditingLayout
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
    onRemoveItem: requestRemoveItem,
    onRecalculateTemplatePrice: panel.onRecalculateTemplatePrice,
    onSaveQuickPriceTemplateFromItem: panel.onSaveQuickPriceTemplateFromItem,
    isSavingQuickPriceTemplate: panel.isSavingQuickPriceTemplate,
    isAddGroupWizardOpen: panel.isAddGroupWizardOpen,
    isTotalGlobalCuadernoOpen: panel.isTotalGlobalCuadernoOpen,
    activeDraftCard,
    onContinueActiveDraft: () =>
      primarySurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
  };
  const closeFullBudgetPreview = () => {
    setIsFullBudgetPreviewOpen(false);
  };

  const openComponentCreatorFromBudget = () => {
    closeFullBudgetPreview();
    panel.onOpenComponentCreator();
    window.requestAnimationFrame(() => {
      primarySurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const openFreeValueItemFormFromBudget = () => {
    closeFullBudgetPreview();
    panel.onOpenFreeValueItemForm();
    window.requestAnimationFrame(() => {
      primarySurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const fullBudgetPanelListaProps = {
    ...panelListaProps,
    onEditItem: (item: Parameters<typeof panel.onEditItem>[0]) => {
      closeFullBudgetPreview();
      panel.onEditItem(item);
      window.requestAnimationFrame(() => {
        primarySurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
  };

  const rapidInspectorRail =
    showQuoteStudioRapidaLayout ? (
      <div className={d.rapidaInspectorRail}>
        <details className={d.rapidaCostsAccordion}>
          <summary>
            <span>
              <strong>Costos y rentabilidad</strong>
              <em>Opcional</em>
            </span>
            <small>Mano de obra, traslado, otros costos y margen.</small>
          </summary>
          <QuoteStudioFinancialPanel
            embedded
            initialDetailOpen
            summary={panel.financialSummary}
            adjustments={panel.quoteStudioFinancial}
            formatCurrencyInput={formatCurrencyInput}
            onAdjustmentChange={panel.onQuoteStudioFinancialChange}
            onApplyRecommendedPrice={panel.onApplyQuoteStudioRecommendedPrice}
          />
        </details>
        <PasoDosPanelResumen
          {...panel}
          isPieceInEdition={false}
          pieceInEditionHint={QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT}
          summaryNavigateHint={
            !hasQuoteStudioCompletedPieces(panel.completedItemsCount)
              ? QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT
              : undefined
          }
          layout="desktop"
          desktopClasses={d as unknown as PasoDosPanelDesktopClasses}
        />
      </div>
    ) : null;

  const rapidWorkspace = (
    <QuoteConstructorWorkspace
      items={panel.items}
      quotePricingMode={quotePricingMode}
      lineTemplates={constructorLineTemplates}
      glassOptions={constructorGlassOptions}
      activeItemId={constructorActiveItemId}
      totalClienteManual={totalClienteManual}
      formatCurrencyInput={formatCurrencyInput}
      embeddedInQuoteStudio={showQuoteStudioRapidaLayout}
      inspectorRailSlot={rapidInspectorRail}
      onActiveItemChange={(itemId) => {
        setConstructorActiveItemId(itemId);
        panel.onSelectQuickEditItem(itemId);
      }}
      onAddPreset={(preset, lineTemplateId) => {
        const itemId = onAddConstructorPreset(preset, lineTemplateId);
        if (itemId) setConstructorActiveItemId(itemId);
        return itemId;
      }}
      onUpdateItem={onUpdateConstructorItem}
      onDuplicateItem={(item) => {
        panel.onDuplicateItem(item);
      }}
      onRemoveItem={requestRemoveItem}
      onMoveItem={onMoveConstructorItem}
      onEditAdvanced={(item) => {
        openGuidedForItem(item);
      }}
      onRecalculateTemplatePrice={panel.onRecalculateTemplatePrice}
      onGlobalTotalChange={onGlobalTotalClienteChange}
      onGoToSummary={panel.onGoToSummary}
      onOpenDespieceReview={(itemId) => {
        if (itemId) {
          setConstructorActiveItemId(itemId);
          panel.onSelectQuickEditItem(itemId);
        }
        setDespieceReviewOpen(true);
      }}
    />
  );

  const reviewPendingPieces = () => {
    const pending = panel.items.find((item) => !isPieceCommerciallyComplete(item, quotePricingMode));
    if (!pending) {
      panel.onGoToSummary();
      return;
    }
    if (desktopWorkspaceMode === "rapida") {
      setConstructorActiveItemId(pending.id);
      panel.onSelectQuickEditItem(pending.id);
      return;
    }
    openGuidedForItem(pending);
  };

  return (
    <div
      className={!isMobileViewport ? s.stepTwoDesktopShell : undefined}
      data-constructor-workspace={showRapidaWorkspace ? "true" : undefined}
    >
      {!isMobileViewport && quoteModeChosen && !showModeChoice ? (
        <header
          className={`${d.desktopWorkspaceModeBar}${
            showQuoteStudioRapidaLayout ? ` ${d.desktopWorkspaceModeBarRapida}` : ""
          }`}
          aria-label="Componentes de la cotización"
        >
          <div className={d.desktopComponentsHeaderCopy}>
            <button
              type="button"
              className={d.desktopComponentsBackButton}
              onClick={handleRequestSwitchMode}
            >
              ← Cambiar modalidad
            </button>
            {!showQuoteStudioRapidaLayout ? (
              <>
                <strong>Componentes de la cotización</strong>
                <span>
                  {panel.items.length} {panel.items.length === 1 ? "pieza" : "piezas"}
                  {panel.items.length > 0
                    ? ` · ${completeCount} de ${panel.items.length} completas`
                    : ""}
                </span>
              </>
            ) : null}
          </div>
          {quotePricingMode === "por_item" ? (
            <div
              className={d.desktopWorkspaceModeTabs}
              role="tablist"
              aria-label="Modo de trabajo de componentes"
            >
              {(["rapida", "guiada"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={desktopWorkspaceMode === mode}
                  className={desktopWorkspaceMode === mode ? d.desktopWorkspaceModeActive : ""}
                  onClick={() => setWorkspaceMode(mode)}
                >
                  {QUOTE_DESKTOP_WORKSPACE_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          ) : null}
          <div className={d.desktopComponentsHeaderMeta}>
            <span className={d.desktopComponentsSaveChip} aria-live="polite">
              {isSaving ? "Guardando…" : "Autoguardado activo"}
            </span>
            {!showQuoteStudioRapidaLayout && panel.items.length > 0 ? (
              <button
                type="button"
                className={d.desktopReviewDespieceButton}
                onClick={() => setDespieceReviewOpen(true)}
              >
                Revisar despiece
              </button>
            ) : null}
            {!showQuoteStudioRapidaLayout ? (
              <button
                type="button"
                onClick={reviewPendingPieces}
                disabled={panel.items.length === 0}
              >
                {pendingCount > 0 ? `Revisar pendientes (${pendingCount})` : "Revisar cotización"}
              </button>
            ) : null}
          </div>
        </header>
      ) : null}

      {showRapidaWorkspace && !showQuoteStudioRapidaLayout ? (
        rapidWorkspace
      ) : showModeChoice ? (
        <div className={s.stepTwoModeChoiceDesktopWrap}>
          <PasoDosModoCotizacion
            variant="desktop"
            contextCliente={budgetContext?.clienteNombre}
            contextObra={budgetContext?.obra}
            onSelectMode={(mode) => {
              onSelectMode(mode);
              if (mode === "por_item" && desktopWorkspaceMode === "guiada") {
                onOpenCreator();
              }
            }}
            onSelectFreeTotalMode={() => {
              onSelectMode("total_global");
              onOpenFreeTotalNotebook();
            }}
          />
        </div>
      ) : showQuoteStudioDesktopLayout ? (
        <div className={stepTwoLayoutClassName}>
          <div className={s.stepTwoPrimarySurface} ref={primarySurfaceRef}>
            {showQuoteStudioRapidaLayout ? (
              rapidWorkspace
            ) : showQuoteStudioBudgetIdle ? (
              <QuoteStudioBudgetWorkspace
                {...panelListaProps}
                onOpenComponentCreator={openComponentCreatorFromBudget}
                onOpenFreeValueItemForm={openFreeValueItemFormFromBudget}
              />
            ) : isFullBudgetPreviewOpen && !itemLibreForm.isOpen ? (
              <>
                <div className={d.budgetPreviewBanner}>
                  <button
                    type="button"
                    className={d.budgetPreviewBack}
                    onClick={closeFullBudgetPreview}
                  >
                    Volver al editor
                  </button>
                  <span>Vista completa del presupuesto</span>
                </div>
                <QuoteStudioBudgetWorkspace
                  {...fullBudgetPanelListaProps}
                  onOpenComponentCreator={openComponentCreatorFromBudget}
                  onOpenFreeValueItemForm={openFreeValueItemFormFromBudget}
                />
              </>
            ) : (
              leftSurface
            )}
          </div>
          {!showQuoteStudioRapidaLayout ? (
            <PasoDosPanelComponentes
              {...panel}
              activeDraftCard={activeDraftCard}
              quoteStudioPanelMode="summary"
              onViewFullBudget={() => setIsFullBudgetPreviewOpen(true)}
              onContinueActiveDraft={panelListaProps.onContinueActiveDraft}
            />
          ) : null}
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

      <ConfirmDialog
        open={Boolean(pendingRemoveItemId)}
        title="¿Eliminar esta pieza?"
        description={
          pendingRemoveItem
            ? `Vas a quitar ${pendingRemoveItem.codigo}${
                pendingRemoveItem.nombre ? ` · ${pendingRemoveItem.nombre}` : ""
              } del presupuesto. Esta acción no se puede deshacer desde aquí.`
            : "Vas a quitar esta pieza del presupuesto. Esta acción no se puede deshacer desde aquí."
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={confirmRemoveItem}
        onCancel={cancelRemoveItem}
      />

      <DespieceReviewSurface
        open={despieceReviewOpen}
        items={panel.items}
        lineTemplates={constructorLineTemplates}
        quotePricingMode={quotePricingMode}
        activeItemId={constructorActiveItemId}
        onActiveItemChange={(itemId) => {
          setConstructorActiveItemId(itemId);
          panel.onSelectQuickEditItem(itemId);
        }}
        onUpdateItem={onUpdateConstructorItem}
        onClose={() => setDespieceReviewOpen(false)}
        onContinueToSummary={() => {
          setDespieceReviewOpen(false);
          panel.onGoToSummary();
        }}
        onSaveCubicationLineAdjustment={formulario.onSaveCubicationLineAdjustment}
        isSavingCubicationLineAdjustment={formulario.isSavingCubicationLineAdjustment}
      />
    </div>
  );
}
