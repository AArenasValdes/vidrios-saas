"use client";

import { useCallback, useMemo } from "react";

import {
  buildComponentFormLinePricingSummary,
  buildUpcomingComponentCodes,
  filterGlassOptions,
  getComponentTypeLabelForBatch,
  getRemainingComponentSlots,
  type ComponentFormState,
  type FieldErrors,
  type QuickEditDraftState,
  type QuickEditFieldKey,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getGlassRecommendations } from "@/features/cotizaciones/services/glass-recommendations.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { generateComponentSVG } from "@/utils/window-drawings";
import { getGlassOptionsForSubtype } from "./use-paso-dos-agregar-grupo";

import type {
  PasoDosFormularioComponenteProps,
  PasoDosPanelComponentesProps,
  VisibleComponentListState,
} from "../_types/paso-dos";

type UsePasoDosPresentacionParams = {
  isMobileViewport: boolean;
  isSaving: boolean;
  items: CotizacionWorkflowItem[];
  editingItemId: string | null;
  componentForm: ComponentFormState;
  quotePricingMode: QuotePricingMode;
  activeLineTemplates: CotizacionLineTemplate[];
  fieldErrors: FieldErrors;
  globalError: string | null;
  isSavingQuickPriceTemplate: boolean;
  isGlassPanelOpen: boolean;
  glassQuery: string;
  pendingItemsCount: number;
  completedItemsCount: number;
  effectiveShowOnlyPendingItems: boolean;
  selectedQuickEditItem: CotizacionWorkflowItem | null;
  selectedQuickEditViewItem: CotizacionWorkflowItem | null;
  selectedQuickEditDraft: QuickEditDraftState | null;
  selectedQuickEditPricingLabel: string;
  selectedQuickEditIndex: number;
  selectedQuickEditPendingSameTypeCount: number;
  selectedQuickEditBatchTargets: Array<{ id: string; code: string; title: string }>;
  effectiveQuickEditBatchSelectionIds: string[];
  isQuickEditBatchSelectionOpen: boolean;
  expandedQuickEditFocusField: QuickEditFieldKey | null;
  expandedQuickEditItemId: string | null;
  visibleComponentListState: VisibleComponentListState;
  shouldUseStepTwoListScroll: boolean;
  subtotal: string;
  iva: string;
  total: string;
  mostrarIva: boolean;
  onGoToSummary: () => void;
  onQuotePricingModeChange: (mode: QuotePricingMode) => void;
  onPricingModeSelection: (mode: "margen" | "precio_directo") => void;
  onComponentChange: <K extends keyof ComponentFormState>(key: K, value: ComponentFormState[K]) => void;
  onSelectLineTemplate: (templateId: string) => void;
  onToggleGlassPanel: () => void;
  onGlassQueryChange: (value: string) => void;
  onGlassSelect: (value: string) => void;
  onResetStep2Form: () => void;
  onSaveDraft: () => void;
  onAddOrUpdateItem: () => void;
  onRecalculateCurrentTemplatePrice: () => void;
  onOpenComponentCreator: () => void;
  onOpenFreeValueItemForm: () => void;
  stepTwoListRef: React.RefObject<HTMLDivElement | null>;
  stepTwoSummaryRef: React.RefObject<HTMLDivElement | null>;
  onToggleShowOnlyPendingItems: () => void;
  onQuickDraftChange: (itemId: string, key: QuickEditFieldKey, value: string) => void;
  onQuickCommit: (itemId: string, draft: QuickEditDraftState) => void;
  onQuickNavigate: (
    direction: -1 | 1,
    focusField?: QuickEditFieldKey,
    options?: { preferIncomplete?: boolean }
  ) => void;
  onScrollToSummary: () => void;
  onStartBatchSelection: () => void;
  onToggleBatchTarget: (itemId: string) => void;
  onApplyQuickEditToSameType: () => void;
  onCancelBatchSelection: () => void;
  onMeasureFirstItem: (node: HTMLElement | null) => void;
  onSelectQuickEditItem: (itemId: string) => void;
  onEditItem: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
  onRecalculateTemplatePrice: (itemId: string) => void;
  onSaveQuickPriceTemplateFromItem: (itemId: string) => void;
  onSaveQuickPriceTemplate: () => void;
};

export function usePasoDosPresentacion(
  params: UsePasoDosPresentacionParams
): {
  propsPasoDosFormulario: PasoDosFormularioComponenteProps;
  propsPasoDosPanel: PasoDosPanelComponentesProps;
} {
  const filteredGlassGroups = useMemo(() => filterGlassOptions(params.glassQuery), [params.glassQuery]);
  const selectedLineTemplate = useMemo(
    () =>
      params.activeLineTemplates.find(
        (template) => String(template.id) === params.componentForm.lineTemplateId
      ) ?? null,
    [params.activeLineTemplates, params.componentForm.lineTemplateId]
  );
  const glassRecommendation = useMemo(
    () =>
      getGlassRecommendations(
        {
          subtipo: params.componentForm.tipo,
          sistema: params.componentForm.referencia,
          lineTemplateRecommendedGlass: selectedLineTemplate?.vidrioPrincipalRecomendado ?? null,
        },
        getGlassOptionsForSubtype(params.componentForm.tipo)
      ),
    [
      params.componentForm.referencia,
      params.componentForm.tipo,
      selectedLineTemplate?.vidrioPrincipalRecomendado,
    ]
  );
  const linePricingSummary = useMemo(
    () => buildComponentFormLinePricingSummary(params.componentForm),
    [params.componentForm]
  );

  const currentComponentPreviewSvg = useMemo(
    () =>
      generateComponentSVG({
        tipo: params.componentForm.tipo,
        referencia: params.componentForm.referencia,
        ancho: params.componentForm.ancho ? Number(params.componentForm.ancho) : null,
        alto: params.componentForm.alto ? Number(params.componentForm.alto) : null,
        colorHex: params.componentForm.colorHex,
        maxW: 92,
        maxH: 72,
      }),
    [
      params.componentForm.alto,
      params.componentForm.ancho,
      params.componentForm.colorHex,
      params.componentForm.referencia,
      params.componentForm.tipo,
    ]
  );

  const batchPreviewCodes = useMemo(() => {
    if (params.editingItemId) {
      return [];
    }

    const availableSlots = getRemainingComponentSlots(params.items.length);
    const quantity =
      availableSlots > 0
        ? Math.min(
            availableSlots,
            Math.max(1, Number.parseInt(params.componentForm.loteCantidad || "1", 10) || 1)
          )
        : 0;

    return buildUpcomingComponentCodes(params.items, params.componentForm.tipo, quantity);
  }, [params.componentForm.loteCantidad, params.componentForm.tipo, params.editingItemId, params.items]);

  const batchPreviewTypeLabel = useMemo(
    () => getComponentTypeLabelForBatch(params.componentForm.tipo, batchPreviewCodes.length),
    [batchPreviewCodes.length, params.componentForm.tipo]
  );
  const visibleBatchPreviewCodes = useMemo(() => batchPreviewCodes.slice(0, 6), [batchPreviewCodes]);
  const hiddenBatchPreviewCount = Math.max(0, batchPreviewCodes.length - visibleBatchPreviewCodes.length);

  const guardarBorradorYSalir = useCallback(() => {
    params.onSaveDraft();
  }, [params]);

  const propsPasoDosFormulario = useMemo(
    () => ({
      itemsCount: params.items.length,
      editingItemId: params.editingItemId,
      componentForm: params.componentForm,
      quotePricingMode: params.quotePricingMode,
      fieldErrors: params.fieldErrors,
      globalError: params.globalError,
      isMobileViewport: params.isMobileViewport,
      isSaving: params.isSaving,
      currentComponentPreviewSvg,
      batchPreviewCodes,
      visibleBatchPreviewCodes,
      hiddenBatchPreviewCount,
      batchPreviewTypeLabel,
      activeLineTemplates: params.activeLineTemplates,
      linePricingSummary,
      isSavingQuickPriceTemplate: params.isSavingQuickPriceTemplate,
      isGlassPanelOpen: params.isGlassPanelOpen,
      glassQuery: params.glassQuery,
      recommendedGlassOptions: glassRecommendation.recommendedOptions,
      recommendedGlassReason: glassRecommendation.reason,
      lineTemplateRecommendedGlass: glassRecommendation.lineTemplateRecommendedOption,
      filteredGlassGroups,
      onQuotePricingModeChange: params.onQuotePricingModeChange,
      onPricingModeSelection: params.onPricingModeSelection,
      onComponentChange: params.onComponentChange,
      onSelectLineTemplate: params.onSelectLineTemplate,
      onToggleGlassPanel: params.onToggleGlassPanel,
      onGlassQueryChange: params.onGlassQueryChange,
      onGlassSelect: params.onGlassSelect,
      onResetStep2Form: params.onResetStep2Form,
      onSaveAndExit: guardarBorradorYSalir,
      onAddOrUpdateItem: params.onAddOrUpdateItem,
      onRecalculateCurrentTemplatePrice: params.onRecalculateCurrentTemplatePrice,
      onSaveQuickPriceTemplate: params.onSaveQuickPriceTemplate,
    }),
    [
      batchPreviewCodes,
      batchPreviewTypeLabel,
      currentComponentPreviewSvg,
      filteredGlassGroups,
      glassRecommendation.lineTemplateRecommendedOption,
      glassRecommendation.reason,
      glassRecommendation.recommendedOptions,
      guardarBorradorYSalir,
      hiddenBatchPreviewCount,
      linePricingSummary,
      params,
      visibleBatchPreviewCodes,
    ]
  );

  const propsPasoDosPanel = useMemo(
    () => ({
      items: params.items,
      quotePricingMode: params.quotePricingMode,
      pendingItemsCount: params.pendingItemsCount,
      completedItemsCount: params.completedItemsCount,
      effectiveShowOnlyPendingItems: params.effectiveShowOnlyPendingItems,
      showFilterToggle: params.items.length > 6 && params.pendingItemsCount > 0,
      isMobileViewport: params.isMobileViewport,
      selectedQuickEditItem: params.selectedQuickEditItem,
      selectedQuickEditViewItem: params.selectedQuickEditViewItem,
      selectedQuickEditDraft: params.selectedQuickEditDraft,
      selectedQuickEditPricingLabel: params.selectedQuickEditPricingLabel,
      selectedQuickEditIndex: params.selectedQuickEditIndex,
      selectedQuickEditPendingSameTypeCount: params.selectedQuickEditPendingSameTypeCount,
      selectedQuickEditBatchTargets: params.selectedQuickEditBatchTargets,
      effectiveQuickEditBatchSelectionIds: params.effectiveQuickEditBatchSelectionIds,
      isQuickEditBatchSelectionOpen: params.isQuickEditBatchSelectionOpen,
      expandedQuickEditFocusField: params.expandedQuickEditFocusField,
      expandedQuickEditItemId: params.expandedQuickEditItemId,
      editingItemId: params.editingItemId,
      visibleComponentListState: params.visibleComponentListState,
      shouldUseStepTwoListScroll: params.shouldUseStepTwoListScroll,
      subtotal: params.subtotal,
      iva: params.iva,
      total: params.total,
      mostrarIva: params.mostrarIva,
      fieldErrorItems: params.fieldErrors.items,
      stepTwoListRef: params.stepTwoListRef,
      stepTwoSummaryRef: params.stepTwoSummaryRef,
      onOpenComponentCreator: params.onOpenComponentCreator,
      onOpenFreeValueItemForm: params.onOpenFreeValueItemForm,
      onToggleShowOnlyPendingItems: params.onToggleShowOnlyPendingItems,
      onQuickDraftChange: params.onQuickDraftChange,
      onQuickCommit: params.onQuickCommit,
      onQuickNavigate: params.onQuickNavigate,
      onScrollToSummary: params.onScrollToSummary,
      onStartBatchSelection: params.onStartBatchSelection,
      onToggleBatchTarget: params.onToggleBatchTarget,
      onApplyQuickEditToSameType: params.onApplyQuickEditToSameType,
      onCancelBatchSelection: params.onCancelBatchSelection,
      onMeasureFirstItem: params.onMeasureFirstItem,
      onSelectQuickEditItem: params.onSelectQuickEditItem,
      onEditItem: params.onEditItem,
      onRemoveItem: params.onRemoveItem,
      onRecalculateTemplatePrice: params.onRecalculateTemplatePrice,
      onSaveQuickPriceTemplateFromItem: params.onSaveQuickPriceTemplateFromItem,
      isSavingQuickPriceTemplate: params.isSavingQuickPriceTemplate,
      onGoToSummary: params.onGoToSummary,
    }),
    [params]
  );

  return {
    propsPasoDosFormulario,
    propsPasoDosPanel,
  };
}
