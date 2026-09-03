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
import type { QuoteStudioFinancialSummary } from "@/features/cotizaciones/services/quote-studio-financial.service";
import type { QuoteStudioFinancialDraft } from "@/features/cotizaciones/types/cotizacion-workflow";
import { getGlassRecommendations } from "@/features/cotizaciones/services/glass-recommendations.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { generateComponentSVG } from "@/utils/window-drawings";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import { applyCommercialPalilloToGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/services/guided-visual-palillo-compat.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { getGlassOptionsForSubtype } from "./use-paso-dos-agregar-grupo";
import { hasGlassOption, normalizeCustomGlassValue } from "@/features/cotizaciones/new-quote/custom-glass-options";

import type {
  PasoDosFormularioComponenteProps,
  PasoDosPanelComponentesProps,
  VisibleComponentListState,
} from "../_types/paso-dos";

type UsePasoDosPresentacionParams = {
  isMobileViewport: boolean;
  isSaving: boolean;
  isDesktopQuoteStudio: boolean;
  financialSummary: QuoteStudioFinancialSummary;
  quoteStudioFinancial: QuoteStudioFinancialDraft;
  onQuoteStudioFinancialChange: (
    field: keyof QuoteStudioFinancialDraft,
    value: string
  ) => void;
  onApplyQuoteStudioRecommendedPrice: () => void;
  formatCurrencyInput: (value: string) => string;
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
  customGlassOptions: readonly string[];
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
  onTemplatePriceUpdated?: (updated: CotizacionLineTemplate) => void;
  onToggleGlassPanel: () => void;
  onGlassQueryChange: (value: string) => void;
  onGlassSelect: (value: string) => void;
  onCreateCustomGlass: (value: string) => void;
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
  onDuplicateItem: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
  onRecalculateTemplatePrice: (itemId: string) => void;
  onSaveQuickPriceTemplateFromItem: (itemId: string) => void;
  onSaveQuickPriceTemplate: () => void;
  editingFormSnapshot: ComponentFormState | null;
  onDuplicateItemFromEditor: () => void;
  onSaveCubicationLineAdjustment?: import("../_types/paso-dos").PasoDosFormularioComponenteProps["onSaveCubicationLineAdjustment"];
  isSavingCubicationLineAdjustment?: boolean;
};

export function usePasoDosPresentacion(
  params: UsePasoDosPresentacionParams
): {
  propsPasoDosFormulario: PasoDosFormularioComponenteProps;
  propsPasoDosPanel: PasoDosPanelComponentesProps;
} {
  const filteredGlassGroups = useMemo(() => {
    const groups = filterGlassOptions(params.glassQuery);
    const normalizedQuery = params.glassQuery.trim();
    const customItems = params.customGlassOptions.filter((option) => {
      if (!normalizedQuery) {
        return true;
      }

      return normalizeCustomGlassValue(option)
        .toLowerCase()
        .includes(normalizeCustomGlassValue(normalizedQuery).toLowerCase());
    });

    if (customItems.length === 0) {
      return groups;
    }

    return [
      {
        grupo: "Vidrios guardados",
        prefix: "",
        items: customItems,
      },
      ...groups,
    ];
  }, [params.customGlassOptions, params.glassQuery]);
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
        getGlassOptionsForSubtype(params.componentForm.tipo, params.customGlassOptions)
      ),
    [
      params.componentForm.referencia,
      params.componentForm.tipo,
      params.customGlassOptions,
      selectedLineTemplate?.vidrioPrincipalRecomendado,
    ]
  );
  const canCreateCustomGlass = useMemo(() => {
    const candidate = normalizeCustomGlassValue(params.glassQuery);

    if (!candidate) {
      return false;
    }

    return !hasGlassOption(
      getGlassOptionsForSubtype(params.componentForm.tipo, params.customGlassOptions),
      candidate
    );
  }, [params.componentForm.tipo, params.customGlassOptions, params.glassQuery]);
  const linePricingSummary = useMemo(
    () => buildComponentFormLinePricingSummary(params.componentForm),
    [params.componentForm]
  );

  const currentComponentPreviewSvg = useMemo(() => {
    if (params.componentForm.guidedVisualConfig) {
      return renderGuidedVisualSvg(applyCommercialPalilloToGuidedVisualConfig({
        config: params.componentForm.guidedVisualConfig,
        palilloEnabled: params.componentForm.palilloEnabled,
        palilloType: params.componentForm.palilloType,
      }), {
        maxW: 92,
        maxH: 72,
        colorHex: params.componentForm.colorHex,
        variant: "thumbnail",
        showSelection: false,
        showLabels: false,
        showDimensions: false,
      });
    }

    return generateComponentSVG({
      tipo: params.componentForm.tipo,
      sistema: params.componentForm.sistema,
      configuracion: params.componentForm.configuracion,
      sheetScheme: params.componentForm.sheetScheme,
      sheetVariant: params.componentForm.sheetVariant,
      customSchemeDescription: params.componentForm.customSchemeDescription,
      isCustomScheme: params.componentForm.isCustomScheme,
      referencia: params.componentForm.referencia,
      ancho: params.componentForm.ancho ? Number(params.componentForm.ancho) : null,
      alto: params.componentForm.alto ? Number(params.componentForm.alto) : null,
      colorHex: params.componentForm.colorHex,
      maxW: 92,
      maxH: 72,
      palilloEnabled: params.componentForm.palilloEnabled,
      palilloType: params.componentForm.palilloType,
      mirrorFormat: params.componentForm.mirrorFormat,
      mirrorPaneCount: params.componentForm.mirrorPaneCount,
      mirrorPaneDirection: params.componentForm.mirrorPaneDirection,
      mirrorInteriorLine: params.componentForm.mirrorInteriorLine,
    });
  }, [
      params.componentForm.alto,
      params.componentForm.ancho,
      params.componentForm.colorHex,
      params.componentForm.configuracion,
      params.componentForm.palilloEnabled,
      params.componentForm.palilloType,
      params.componentForm.referencia,
      params.componentForm.sheetScheme,
      params.componentForm.sheetVariant,
      params.componentForm.customSchemeDescription,
      params.componentForm.isCustomScheme,
      params.componentForm.sistema,
      params.componentForm.tipo,
      params.componentForm.mirrorFormat,
      params.componentForm.mirrorInteriorLine,
      params.componentForm.mirrorPaneCount,
      params.componentForm.mirrorPaneDirection,
      params.componentForm.guidedVisualConfig,
    ]);

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

  const savedCubicationSnapshot = useMemo(() => {
    if (!params.editingItemId) {
      return null;
    }

    const editingItem = params.items.find((item) => item.id === params.editingItemId);
    if (!editingItem) {
      return null;
    }

    return decodeCotizacionItemPresentationMeta(editingItem.observaciones).cubicationSnapshot;
  }, [params.editingItemId, params.items]);

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
      canCreateCustomGlass,
      onQuotePricingModeChange: params.onQuotePricingModeChange,
      onPricingModeSelection: params.onPricingModeSelection,
      onComponentChange: params.onComponentChange,
      onSelectLineTemplate: params.onSelectLineTemplate,
      onTemplatePriceUpdated: params.onTemplatePriceUpdated,
      onToggleGlassPanel: params.onToggleGlassPanel,
      onGlassQueryChange: params.onGlassQueryChange,
      onGlassSelect: params.onGlassSelect,
      onCreateCustomGlass: params.onCreateCustomGlass,
      onResetStep2Form: params.onResetStep2Form,
      onSaveAndExit: guardarBorradorYSalir,
      onAddOrUpdateItem: params.onAddOrUpdateItem,
      onRecalculateCurrentTemplatePrice: params.onRecalculateCurrentTemplatePrice,
      onSaveQuickPriceTemplate: params.onSaveQuickPriceTemplate,
      isDesktopQuoteStudio: params.isDesktopQuoteStudio,
      originalFormSnapshot: params.editingFormSnapshot,
      onDuplicateItemFromEditor: params.onDuplicateItemFromEditor,
      savedCubicationSnapshot,
      onSaveCubicationLineAdjustment: params.onSaveCubicationLineAdjustment,
      isSavingCubicationLineAdjustment: params.isSavingCubicationLineAdjustment,
    }),
    [
      batchPreviewCodes,
      batchPreviewTypeLabel,
      currentComponentPreviewSvg,
      filteredGlassGroups,
      canCreateCustomGlass,
      glassRecommendation.lineTemplateRecommendedOption,
      glassRecommendation.reason,
      glassRecommendation.recommendedOptions,
      guardarBorradorYSalir,
      hiddenBatchPreviewCount,
      linePricingSummary,
      params,
      savedCubicationSnapshot,
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
      isDesktopQuoteStudio: params.isDesktopQuoteStudio,
      financialSummary: params.financialSummary,
      quoteStudioFinancial: params.quoteStudioFinancial,
      onQuoteStudioFinancialChange: params.onQuoteStudioFinancialChange,
      onApplyQuoteStudioRecommendedPrice: params.onApplyQuoteStudioRecommendedPrice,
      formatCurrencyInput: params.formatCurrencyInput,
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
      onDuplicateItem: params.onDuplicateItem,
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
