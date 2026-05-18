"use client";

import type { RefObject } from "react";
import type {
  ComponentFormLinePricingSummary,
  ComponentFormState,
  ComponentListCardViewModel,
  FieldErrors,
  QuickEditBatchTarget,
  QuickEditDraftState,
  QuickEditFieldKey,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

export type VisibleComponentListState = {
  cards: ComponentListCardViewModel[];
  paddingTop: number;
  paddingBottom: number;
};

export type PasoDosFormularioComponenteProps = {
  itemsCount: number;
  editingItemId: string | null;
  componentForm: ComponentFormState;
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
  onPricingModeSelection: (mode: "margen" | "precio_directo") => void;
  onComponentChange: <K extends keyof ComponentFormState>(key: K, value: ComponentFormState[K]) => void;
  onSelectLineTemplate: (templateId: string) => void;
  onToggleGlassPanel: () => void;
  onGlassQueryChange: (value: string) => void;
  onGlassSelect: (value: string) => void;
  onResetStep2Form: () => void;
  onSaveAndExit: () => void;
  onAddOrUpdateItem: () => void;
  onRecalculateCurrentTemplatePrice: () => void;
  onSaveQuickPriceTemplate: () => void;
};

export type PasoDosPanelComponentesProps = {
  items: CotizacionWorkflowItem[];
  pendingItemsCount: number;
  completedItemsCount: number;
  effectiveShowOnlyPendingItems: boolean;
  showFilterToggle: boolean;
  isMobileViewport: boolean;
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
  fieldErrorItems?: string;
  stepTwoListRef: RefObject<HTMLDivElement | null>;
  stepTwoSummaryRef: RefObject<HTMLDivElement | null>;
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
  isSavingQuickPriceTemplate: boolean;
  onGoToSummary: () => void;
};
