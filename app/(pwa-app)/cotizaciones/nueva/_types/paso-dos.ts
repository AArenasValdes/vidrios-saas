"use client";

import type { RefObject } from "react";
import type {
  ComponentFormLinePricingSummary,
  ComponentFormState,
  ComponentListCardViewModel,
  FieldErrors,
  FreeValueItemFormState,
  QuickEditBatchTarget,
  QuickEditDraftState,
  QuickEditFieldKey,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { QuoteStudioFinancialSummary } from "@/features/cotizaciones/services/quote-studio-financial.service";
import type {
  QuoteStudioFinancialDraft,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

export type VisibleComponentListState = {
  cards: ComponentListCardViewModel[];
  paddingTop: number;
  paddingBottom: number;
};

/** Payload al guardar ajuste de pauta en la línea (evita carrera con setState). */
export type SaveCubicationLineAdjustmentInput = {
  itemId?: string;
  snapshot?: CotizacionItemCubicationSnapshot | null;
};

export type PasoDosFormularioComponenteProps = {
  itemsCount: number;
  editingItemId: string | null;
  componentForm: ComponentFormState;
  quotePricingMode: QuotePricingMode;
  fieldErrors: FieldErrors;
  globalError: string | null;
  isMobileViewport: boolean;
  isSaving: boolean;
  currentComponentPreviewSvg: string;
  batchPreviewCodes: string[];
  visibleBatchPreviewCodes: string[];
  hiddenBatchPreviewCount: number;
  batchPreviewTypeLabel: string;
  activeLineTemplates: CotizacionLineTemplate[];
  linePricingSummary: ComponentFormLinePricingSummary;
  isSavingQuickPriceTemplate: boolean;
  isGlassPanelOpen: boolean;
  glassQuery: string;
  recommendedGlassOptions: string[];
  recommendedGlassReason: string;
  lineTemplateRecommendedGlass: string | null;
  filteredGlassGroups: Array<{
    grupo: string;
    prefix: string;
    items: string[];
  }>;
  canCreateCustomGlass: boolean;
  onPricingModeSelection: (mode: "margen" | "precio_directo") => void;
  onQuotePricingModeChange: (mode: QuotePricingMode) => void;
  onComponentChange: <K extends keyof ComponentFormState>(key: K, value: ComponentFormState[K]) => void;
  onSelectLineTemplate: (templateId: string) => void;
  onTemplatePriceUpdated?: (updated: CotizacionLineTemplate) => void;
  onToggleGlassPanel: () => void;
  onGlassQueryChange: (value: string) => void;
  onGlassSelect: (value: string) => void;
  onCreateCustomGlass: (value: string) => void;
  onResetStep2Form: () => void;
  onSaveAndExit: () => void;
  onAddOrUpdateItem: () => void;
  onRecalculateCurrentTemplatePrice: () => void;
  onSaveQuickPriceTemplate: () => void;
  variant?: "default" | "mobilePointEdit";
  showDesktopContextRail?: boolean;
  desktopAssistantStage?: 1 | 2 | 3 | null;
  isDesktopQuoteStudio?: boolean;
  originalFormSnapshot?: ComponentFormState | null;
  onDuplicateItemFromEditor?: () => void;
  /** Snapshot de cubicación persistido del ítem en edición (si existe). */
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  /** Persiste ajuste manual de pauta en la línea del catálogo (con confirmación). */
  onSaveCubicationLineAdjustment?: (
    input?: SaveCubicationLineAdjustmentInput
  ) => Promise<void> | void;
  isSavingCubicationLineAdjustment?: boolean;
};

export type PasoDosPanelComponentesProps = {
  items: CotizacionWorkflowItem[];
  quotePricingMode: QuotePricingMode;
  pendingItemsCount: number;
  completedItemsCount: number;
  effectiveShowOnlyPendingItems: boolean;
  showFilterToggle: boolean;
  isMobileViewport: boolean;
  isDesktopQuoteStudio: boolean;
  financialSummary: QuoteStudioFinancialSummary;
  quoteStudioFinancial: QuoteStudioFinancialDraft;
  onQuoteStudioFinancialChange: (
    field: keyof QuoteStudioFinancialDraft,
    value: string
  ) => void;
  onApplyQuoteStudioRecommendedPrice: () => void;
  formatCurrencyInput: (value: string) => string;
  selectedQuickEditItem: CotizacionWorkflowItem | null;
  selectedQuickEditViewItem: CotizacionWorkflowItem | null;
  selectedQuickEditDraft: QuickEditDraftState | null;
  selectedQuickEditPricingLabel: string;
  selectedQuickEditIndex: number;
  selectedQuickEditPendingSameTypeCount: number;
  selectedQuickEditBatchTargets: QuickEditBatchTarget[];
  effectiveQuickEditBatchSelectionIds: string[];
  isQuickEditBatchSelectionOpen: boolean;
  expandedQuickEditFocusField: QuickEditFieldKey | null;
  expandedQuickEditItemId: string | null;
  editingItemId: string | null;
  visibleComponentListState: VisibleComponentListState;
  shouldUseStepTwoListScroll: boolean;
  subtotal: string;
  iva: string;
  total: string;
  mostrarIva: boolean;
  fieldErrorItems?: string;
  stepTwoListRef: RefObject<HTMLDivElement | null>;
  stepTwoSummaryRef: RefObject<HTMLDivElement | null>;
  onOpenComponentCreator: () => void;
  onOpenFreeValueItemForm: () => void;
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
  isSavingQuickPriceTemplate: boolean;
  onGoToSummary: () => void;
  isAddGroupWizardOpen?: boolean;
  isTotalGlobalCuadernoOpen?: boolean;
  activeDraftCard?: {
    headline: string;
    componentType: string;
    stepLabel: string;
    missingLabel: string;
  } | null;
  onContinueActiveDraft?: () => void;
  quoteStudioPanelMode?: "summary" | "full";
  onViewFullBudget?: () => void;
};

export type PasoDosItemLibreFormProps = {
  isOpen: boolean;
  editingItemId: string | null;
  form: FreeValueItemFormState;
  fieldErrors: FieldErrors;
  isSaving: boolean;
  onChange: <K extends keyof FreeValueItemFormState>(
    key: K,
    value: FreeValueItemFormState[K]
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
};
