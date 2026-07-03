"use client";

import { useCallback, useMemo } from "react";

import type { Cliente } from "@/features/clientes/types/cliente";
import {
  buildClientInitials,
  CLP,
  formatDraftPhoneValue,
  type ComponentFormState,
  type FieldErrors,
  type QuickEditDraftState,
  type QuickEditFieldKey,
  type Step1FieldKey,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowDraft, CotizacionWorkflowItem, CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { VisibleComponentListState } from "../_types/paso-dos";
import { usePasoDosPresentacion } from "./use-paso-dos-presentacion";

type StepKey = 1 | 2 | 3;

type UseFlujoNuevaCotizacionParams = {
  step: StepKey;
  isMobileViewport: boolean;
  isSaving: boolean;
  draft: CotizacionWorkflowDraft;
  fieldErrors: FieldErrors;
  clientQuery: string;
  estadoBusquedaCliente: string;
  clientesFiltrados: Cliente[];
  clienteSeleccionado: Cliente | null;
  selectedClientId: string;
  clientesRecientes: Cliente[];
  clientesRecientesMovil: Cliente[];
  showStep1MoreData: boolean;
  onRegisterStep1InputRef: (
    field: Step1FieldKey,
    node: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  ) => void;
  editingItemId: string | null;
  componentForm: ComponentFormState;
  quotePricingMode: QuotePricingMode;
  totalClienteManual: number | null;
  mostrarIva: boolean;
  activeLineTemplates: CotizacionLineTemplate[];
  globalError: string | null;
  isSavingQuickPriceTemplate: boolean;
  isGlassPanelOpen: boolean;
  glassQuery: string;
  customGlassOptions: readonly string[];
  items: CotizacionWorkflowItem[];
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
  descuento: string;
  iva: string;
  flete: string;
  redondeoComercial: string;
  hasRedondeoComercial: boolean;
  ajusteComercial: string;
  hasAjusteComercial: boolean;
  total: string;
  savedRecord: CotizacionWorkflowRecord | null;
  lastSaveMode: "borrador" | "creada" | "actualizada" | null;
  isEditing: boolean;
  onGoToStep: (step: StepKey) => void;
  onSaveDraft: () => void;
  onSaveQuote: () => void;
  onClientQueryChange: (value: string) => void;
  onSelectClient: (clientId: string) => void;
  onClearSelectedClient: () => void;
  onClienteNombreChange: (value: string) => void;
  onTelefonoChange: (value: string) => void;
  onObraChange: (value: string) => void;
  onDireccionChange: (value: string) => void;
  onValidezChange: (value: string) => void;
  onObservacionesChange: (value: string) => void;
  onCondicionesPagoChange: (value: string) => void;
  onStep1KeyDown: (field: Step1FieldKey, event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onToggleMoreData: () => void;
  onResetStep1: () => void;
  onContinueStep1: () => void;
  onQuotePricingModeChange: (mode: QuotePricingMode) => void;
  onPricingModeSelection: (mode: "margen" | "precio_directo") => void;
  onComponentChange: <K extends keyof ComponentFormState>(key: K, value: ComponentFormState[K]) => void;
  onSelectLineTemplate: (templateId: string) => void;
  onToggleGlassPanel: () => void;
  onGlassQueryChange: (value: string) => void;
  onGlassSelect: (value: string) => void;
  onCreateCustomGlass: (value: string) => void;
  onResetStep2Form: () => void;
  onAddOrUpdateItem: () => void;
  onRecalculateCurrentTemplatePrice: () => void;
  onOpenComponentCreator: () => void;
  onOpenFreeValueItemForm: () => void;
  onToggleShowOnlyPendingItems: () => void;
  onQuickDraftChange: (itemId: string, key: QuickEditFieldKey, value: string) => void;
  onQuickCommit: (itemId: string, draft: QuickEditDraftState) => void;
  onQuickNavigate: (direction: -1 | 1, focusField?: QuickEditFieldKey, options?: { preferIncomplete?: boolean }) => void;
  onScrollToSummary: () => void;
  onStartBatchSelection: () => void;
  onToggleBatchTarget: (itemId: string) => void;
  onApplyQuickEditToSameType: () => void;
  onCancelBatchSelection: () => void;
  onMeasureFirstItem: (node: HTMLElement | null) => void;
  onSelectQuickEditItem: (itemId: string) => void;
  onEditItem: (item: CotizacionWorkflowItem) => void;
  onDuplicateItem: (item: CotizacionWorkflowItem) => void;
  onDuplicateItemPaso3: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
  onRecalculateTemplatePrice: (itemId: string) => void;
  onSaveQuickPriceTemplateFromItem: (itemId: string) => void;
  onSaveQuickPriceTemplate: () => void;
  isDesktopQuoteStudio: boolean;
  editingFormSnapshot: ComponentFormState | null;
  onDuplicateItemFromEditor: () => void;
  onDraftFleteChange: (value: string) => void;
  onDraftDiscountChange: (value: string) => void;
  onDraftDiscountTypeChange: (value: CotizacionWorkflowDraft["descuentoTipo"]) => void;
  onGlobalTotalClienteChange: (value: string) => void;
  onMostrarIvaChange: () => void;
  formatCurrencyInput: (value: string) => string;
  stepTwoListRef: React.RefObject<HTMLDivElement | null>;
  stepTwoSummaryRef: React.RefObject<HTMLDivElement | null>;
};

export function useFlujoNuevaCotizacion(params: UseFlujoNuevaCotizacionParams) {
  const stepOneSummary = useMemo(
    () => ({
      cliente: params.draft.clienteNombre.trim() || "Pendiente",
      proyecto: params.draft.obra.trim() || "Pendiente",
      piezas: params.items.length > 0 ? String(params.items.length) : "0",
      subtotal: params.subtotal !== "0" ? params.subtotal : "0",
      iva: params.iva !== "0" ? params.iva : "0",
      total: params.total !== "0" ? params.total : "0",
      clienteMuted: !params.draft.clienteNombre.trim(),
      proyectoMuted: !params.draft.obra.trim(),
      piezasMuted: params.items.length === 0,
      subtotalMuted: params.subtotal === CLP(0),
      ivaMuted: params.iva === CLP(0),
      totalMuted: params.total === CLP(0),
    }),
    [params.draft.clienteNombre, params.draft.obra, params.iva, params.items.length, params.subtotal, params.total]
  );

  const guardarBorradorYSalir = useCallback(() => {
    params.onSaveDraft();
  }, [params]);
  const pasoDosPresentacion = usePasoDosPresentacion({
    isMobileViewport: params.isMobileViewport,
    isSaving: params.isSaving,
    items: params.items,
    editingItemId: params.editingItemId,
    componentForm: params.componentForm,
    quotePricingMode: params.quotePricingMode,
    activeLineTemplates: params.activeLineTemplates,
    fieldErrors: params.fieldErrors,
    globalError: params.globalError,
    isSavingQuickPriceTemplate: params.isSavingQuickPriceTemplate,
    isGlassPanelOpen: params.isGlassPanelOpen,
    glassQuery: params.glassQuery,
    customGlassOptions: params.customGlassOptions,
    pendingItemsCount: params.pendingItemsCount,
    completedItemsCount: params.completedItemsCount,
    effectiveShowOnlyPendingItems: params.effectiveShowOnlyPendingItems,
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
    visibleComponentListState: params.visibleComponentListState,
    shouldUseStepTwoListScroll: params.shouldUseStepTwoListScroll,
    subtotal: params.subtotal,
    iva: params.iva,
    total: params.total,
    mostrarIva: params.mostrarIva,
    onGoToSummary: () => params.onGoToStep(3),
    onQuotePricingModeChange: params.onQuotePricingModeChange,
    onPricingModeSelection: params.onPricingModeSelection,
    onComponentChange: params.onComponentChange,
    onSelectLineTemplate: params.onSelectLineTemplate,
    onToggleGlassPanel: params.onToggleGlassPanel,
    onGlassQueryChange: params.onGlassQueryChange,
    onGlassSelect: params.onGlassSelect,
    onCreateCustomGlass: params.onCreateCustomGlass,
    onResetStep2Form: params.onResetStep2Form,
    onSaveDraft: params.onSaveDraft,
    onAddOrUpdateItem: params.onAddOrUpdateItem,
    onRecalculateCurrentTemplatePrice: params.onRecalculateCurrentTemplatePrice,
    onOpenComponentCreator: params.onOpenComponentCreator,
    onOpenFreeValueItemForm: params.onOpenFreeValueItemForm,
    stepTwoListRef: params.stepTwoListRef,
    stepTwoSummaryRef: params.stepTwoSummaryRef,
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
    onSaveQuickPriceTemplate: params.onSaveQuickPriceTemplate,
    isDesktopQuoteStudio: params.isDesktopQuoteStudio,
    editingFormSnapshot: params.editingFormSnapshot,
    onDuplicateItemFromEditor: params.onDuplicateItemFromEditor,
  });

  const propsPasoUno = useMemo(() => ({
    draft: params.draft,
    fieldErrors: params.fieldErrors,
    clientQuery: params.clientQuery,
    clientSearchState: params.estadoBusquedaCliente,
    filteredClientes: params.clientesFiltrados,
    selectedClient: params.clienteSeleccionado,
    selectedClientId: params.selectedClientId,
    recentClients: params.clientesRecientes,
    mobileRecentClients: params.clientesRecientesMovil,
    showStep1MoreData: params.showStep1MoreData,
    isMobileViewport: params.isMobileViewport,
    quotePricingMode: params.quotePricingMode,
    isSaving: params.isSaving,
    stepOneSummary,
    buildClientInitials,
    formatDraftPhoneValue,
    onRegisterInputRef: params.onRegisterStep1InputRef,
    onClientQueryChange: params.onClientQueryChange,
    onSelectClient: params.onSelectClient,
    onClearSelectedClient: params.onClearSelectedClient,
    onClienteNombreChange: params.onClienteNombreChange,
    onTelefonoChange: params.onTelefonoChange,
    onObraChange: params.onObraChange,
    onDireccionChange: params.onDireccionChange,
    onValidezChange: params.onValidezChange,
    onObservacionesChange: params.onObservacionesChange,
    onQuotePricingModeChange: params.onQuotePricingModeChange,
    onStep1KeyDown: params.onStep1KeyDown,
    onToggleMoreData: params.onToggleMoreData,
    onReset: params.onResetStep1,
    onSaveAndExit: guardarBorradorYSalir,
    onContinue: params.onContinueStep1,
  }), [guardarBorradorYSalir, params, stepOneSummary]);

  const propsPasoTres = useMemo(() => ({
    draft: params.draft,
    subtotal: params.subtotal,
    descuento: params.descuento,
    iva: params.iva,
    flete: params.flete,
    redondeoComercial: params.redondeoComercial,
    hasRedondeoComercial: params.hasRedondeoComercial,
    ajusteComercial: params.ajusteComercial,
    hasAjusteComercial: params.hasAjusteComercial,
    total: params.total,
    quotePricingMode: params.quotePricingMode,
    totalClienteManual: params.totalClienteManual,
    mostrarIva: params.mostrarIva,
    globalError: params.globalError,
    savedRecord: params.savedRecord,
    lastSaveMode: params.lastSaveMode,
    isMobileViewport: params.isMobileViewport,
    isSaving: params.isSaving,
    onDraftFleteChange: params.onDraftFleteChange,
    onDraftDiscountChange: params.onDraftDiscountChange,
    onDraftDiscountTypeChange: params.onDraftDiscountTypeChange,
    onGlobalTotalClienteChange: params.onGlobalTotalClienteChange,
    onMostrarIvaChange: params.onMostrarIvaChange,
    onValidezChange: params.onValidezChange,
    onObservacionesChange: params.onObservacionesChange,
    onCondicionesPagoChange: params.onCondicionesPagoChange,
    onGoToStepTwo: () => params.onGoToStep(2),
    onEditItem: params.onEditItem,
    onDuplicateItem: params.onDuplicateItemPaso3,
    onRemoveItem: params.onRemoveItem,
    onSaveQuote: params.onSaveQuote,
    onSaveDraft: params.onSaveDraft,
    formatCurrencyInput: params.formatCurrencyInput,
  }), [params]);

  const propsResumenDesktop = useMemo(() => ({
    draft: params.draft,
    totalItems: params.items.length,
    subtotal: params.subtotal,
    iva: params.iva,
    redondeoComercial: params.redondeoComercial,
    hasRedondeoComercial: params.hasRedondeoComercial,
    ajusteComercial: params.ajusteComercial,
    hasAjusteComercial: params.hasAjusteComercial,
    total: params.total,
    mostrarIva: params.mostrarIva,
    quotePricingMode: params.quotePricingMode,
    selectedClientMode: params.clienteSeleccionado ? "Existente" as const : "Nuevo" as const,
    isSaving: params.isSaving,
    onSaveDraft: params.onSaveDraft,
    onSaveQuote: params.onSaveQuote,
    onContinue: params.onContinueStep1,
  }), [params]);

  return {
    paso: params.step,
    esVistaMovil: params.isMobileViewport,
    estaGuardando: params.isSaving,
    esEdicion: params.isEditing,
    clienteSeleccionado: params.clienteSeleccionado,
    propsPasoUno,
    propsPasoDosFormulario: pasoDosPresentacion.propsPasoDosFormulario,
    propsPasoDosPanel: pasoDosPresentacion.propsPasoDosPanel,
    propsPasoTres,
    propsResumenDesktop,
  };
}
