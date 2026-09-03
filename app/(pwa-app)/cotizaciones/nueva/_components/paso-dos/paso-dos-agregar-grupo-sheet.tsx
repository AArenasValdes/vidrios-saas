"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuArrowRight, LuCheck, LuChevronDown, LuChevronLeft, LuCopy, LuPencil, LuPlus, LuSearch, LuTrash2, LuX } from "react-icons/lu";

import {
  buildGlassValue,
  CLP,
  COLOR_OPTIONS,
  COMPONENT_TYPE_GROUPS,
  FIELD_LIMITS,
  formatCurrencyInput,
  GLASS_OPTIONS,
  getCompositionSectionLabel,
  getSheetSchemeOptions,
  getSheetVariantOptions,
  isBowWindowConfiguration,
  isCorrederaSheetConfiguration,
  isDesktopPieceSystemStepComplete,
  isCubicationPersonalizadoAssistMode,
  isPersonalizadoCompositionSelected,
  isTrabajoPersonalizadoComponentType,
  isGlassCatalogSelection,
  isGuillotinaOrCelosiaConfiguration,
  MATERIAL_OPTIONS,
  requiresCustomSheetDescription,
  SHEET_SCHEME_OPTIONS,
  shouldRequireProfileMaterialForComponent,
  shouldShowGuidedComposerEntry,
  shouldShowSystemSelectionForComponent,
  shouldShowSheetSchemeForComponent,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  getComponentDescripcion,
  isFreeValueComponentType,
} from "@/features/cotizaciones/services/component-catalog.service";
import {
  hasGlassOption,
  normalizeCustomGlassValue,
} from "@/features/cotizaciones/new-quote/custom-glass-options";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { lineTemplateNeedsCommercialPrice } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { LineTemplatePicker } from "@/features/cotizaciones/line-templates/components/line-template-picker";
import { LinePriceEditor } from "@/features/cotizaciones/line-templates/components/line-template-price-editor";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  formatCubicationMm,
  PautaCubicacionPanel,
  resolveActiveCubicationPreview,
} from "./pauta-cubicacion-panel";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { getGlassRecommendations } from "@/features/cotizaciones/services/glass-recommendations.service";
import { generateComponentSVG } from "@/utils/window-drawings";
import {
  GuidedVisualComposer,
  ensureGuidedVisualDraft,
} from "@/features/cotizaciones/visual-composer/components/guided-visual-composer";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import { applyCommercialPalilloToGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/services/guided-visual-palillo-compat.service";
import {
  describeGuidedVisualConfig,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS,
} from "../../_hooks/use-paso-dos-agregar-grupo";
import {
  shouldHideFreeNotebookCategoryInWizard,
  type PasoDosGrupoDraft,
  type PasoDosGrupoEntryMode,
  type PasoDosGrupoPaso,
  type PasoDosGrupoPriceInputMode,
  buildGrupoDraftLinePricingSummary,
  isGrupoDraftPriceStepValid,
  resolveGrupoDraftReferentialUnitPrice,
  resolveGrupoDraftSubtotal,
  resolveGrupoDraftUnitPrice,
} from "../../_hooks/use-paso-dos-agregar-grupo";
import { filterVidrios, getVisibleSubtypeLabel, repairBrokenText, sortGlassOptions } from "./paso-dos-wizard-movil.utils";
import {
  buildDesktopConfigSummary,
  DESKTOP_FREQUENT_TYPES,
  DESKTOP_OTHER_TYPES_EXPANDED,
  DESKTOP_OTHER_TYPES_PRIMARY,
  DESKTOP_TYPE_ICONS,
  getDesktopTypeStepHint,
  shortenCompositionLabel,
} from "./paso-dos-desktop-piece.constants";

import s from "../../page.module.css";
import d from "./paso-dos-desktop-piece-ui.module.css";

type Props = {
  isOpen: boolean;
  variant?: "overlay" | "embedded";
  paso: PasoDosGrupoPaso;
  entryMode: PasoDosGrupoEntryMode;
  draft: PasoDosGrupoDraft;
  subtypeOptions: readonly string[];
  systemOptions: readonly string[];
  glassOptions: readonly string[];
  visibleLineTemplates?: readonly CotizacionLineTemplate[];
  summary: string;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onGoToStep: (paso: PasoDosGrupoPaso) => void;
  onConfirm: () => void;
  globalError?: string | null;
  onDuplicatePiece?: () => void;
  onDiscardDraft?: () => void;
  onRequestSwitchMode?: () => void;
  onOpenComponentCreator?: () => void;
  detailOnlyMode?: boolean;
  pieceCode?: string;
  pieceEditionHeadline?: string;
  onSelectCategoria: (categoria: PasoDosGrupoDraft["categoria"]) => void;
  onSelectSubtipo: (subtipo: string) => void;
  onSelectCantidad: (cantidad: number) => void;
  onEnableCustomQuantity: () => void;
  onCustomQuantityChange: (value: string) => void;
  onCantidadInputChange: (value: string) => void;
  onNormalizeCantidadInput: () => void;
  onMaterialChange: (material: PasoDosGrupoDraft["material"]) => void;
  onSelectLineTemplate?: (templateId: string) => void;
  onTemplatePriceUpdated?: (updated: CotizacionLineTemplate) => void;
  onColorChange: (value: string) => void;
  onNombreChange: (value: string) => void;
  onDescripcionChange: (value: string) => void;
  onSistemaChange: (value: string) => void;
  configurationOptions?: readonly string[];
  onConfiguracionChange?: (value: string) => void;
  onSheetSchemeChange: (value: string) => void;
  onSheetVariantChange: (value: string) => void;
  onCustomSchemeDescriptionChange: (value: string) => void;
  onGuidedVisualConfigChange?: (value: GuidedVisualConfig | null) => void;
  onVidrioChange: (value: string) => void;
  onCreateCustomGlass: (value: string) => void;
  onAnchoChange: (value: string) => void;
  onAltoChange: (value: string) => void;
  onCubicationSnapshotChange?: (value: CotizacionItemCubicationSnapshot | null) => void;
  onFabricationRecipeIdChange?: (recipeId: string) => void;
  onFabricacionSnapshotChange?: (snapshot: FabricacionCotizacionSnapshot | null) => void;
  onFabricacionContextoChange?: (value: {
    tipologia: string;
    hojas: number;
    modulos: number;
    apertura: string;
    herraje: string;
    variante: string;
  }) => void;
  /** Abre la revisión de despiece desktop compartida (rápida/guiada). */
  onOpenDespieceReview?: () => void;
  onPrecioChange: (value: string) => void;
  onPrecioPorM2Change: (value: string) => void;
  onMinimoCobrableChange: (value: string) => void;
  onRedondeoPrecioChange: (value: string) => void;
  onPriceInputModeChange: (mode: PasoDosGrupoPriceInputMode) => void;
  onToggleCustomizeUnitPrice: (enabled: boolean) => void;
  onPricingModeChange: (value: PricingMode) => void;
  onMargenChange: (value: string) => void;
  onCobraPrecioSeparadoChange: (value: boolean) => void;
  onAddAlcanceDetalle: (initialNombre?: string) => void;
  onUpdateAlcanceDetalle: (
    detalleId: string,
    field: "tipo" | "subtipo" | "nombre" | "cantidad" | "ancho" | "alto" | "descripcion",
    value: string
  ) => void;
  onRemoveAlcanceDetalle: (detalleId: string) => void;
  nestedDetailItems?: CotizacionWorkflowItem[];
  onEditNestedDetailItem?: (itemId: string) => void;
  onRemoveNestedDetailItem?: (itemId: string) => void;
  quotePricingMode: QuotePricingMode;
  totalClienteManual: number | null;
  mostrarIva: boolean;
  internalObservation: string;
  onGlobalTotalClienteChange: (value: string) => void;
  onMostrarIvaChange: () => void;
  onInternalObservationChange: (value: string) => void;
  canContinueFromQuantity: boolean;
  canContinueFromConfig: boolean;
};

const STEP_COPY: Record<PasoDosGrupoPaso, { eyebrow: string; title: string; description: string }> = {
  1: {
    eyebrow: "Paso 1 de 5",
    title: "Categoria",
    description: "Elige el grupo principal para partir rapido.",
  },
  2: {
    eyebrow: "Paso 2 de 5",
    title: "Subtipo",
    description: "Define que pieza vas a cargar.",
  },
  3: {
    eyebrow: "Paso 3 de 5",
    title: "Cantidad",
    description: "Crea un solo grupo con la cantidad total.",
  },
  4: {
    eyebrow: "Paso 4 de 5",
    title: "Configuracion global",
    description: "Esto se aplica a todo el grupo.",
  },
  5: {
    eyebrow: "Paso 5 de 5",
    title: "Confirmacion",
    description: "Revisa el resumen antes de agregar.",
  },
};

export const GROUP_SHEET_STEP_TITLES: Record<PasoDosGrupoPaso, string> = {
  1: STEP_COPY[1].title,
  2: STEP_COPY[2].title,
  3: STEP_COPY[3].title,
  4: STEP_COPY[4].title,
  5: STEP_COPY[5].title,
};

const EMBEDDED_PROGRESS_STEPS: { paso: PasoDosGrupoPaso; label: string }[] = [
  { paso: 1, label: "Categoria" },
  { paso: 2, label: "Subtipo" },
  { paso: 3, label: "Cantidad" },
  { paso: 4, label: "Config." },
  { paso: 5, label: "Confirmar" },
];

function getContinueLabel(paso: PasoDosGrupoPaso, shouldConfirmFromCurrentStep = false) {
  if (shouldConfirmFromCurrentStep) {
    return "Agregar trabajo al presupuesto";
  }

  if (paso === 4) {
    return "Ver resumen";
  }

  return "Continuar";
}

function moneyToNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  return Number(String(value ?? "").replace(/[^\d]/g, "")) || 0;
}

function getQuantityInputValue(draft: PasoDosGrupoDraft) {
  if (draft.usaCantidadPersonalizada) {
    return draft.cantidadPersonalizada;
  }

  return draft.cantidad > 0 ? String(draft.cantidad) : "";
}

function getDraftAreaM2(draft: PasoDosGrupoDraft) {
  const summary = buildGrupoDraftLinePricingSummary(draft);
  return summary.areaM2 ?? 0;
}

function getDraftPieceValue(draft: PasoDosGrupoDraft) {
  return resolveGrupoDraftSubtotal(draft);
}

function getDesktopPieceTitle(draft: PasoDosGrupoDraft) {
  if (!draft.sistema.trim()) {
    return draft.subtipo.trim() || "Pieza";
  }

  const parts = [draft.subtipo, draft.sistema].filter((part) => part.trim() !== "");
  const normalizedParts = parts.filter(
    (part, index) =>
      index === 0 || !parts[0].toLowerCase().includes(part.toLowerCase())
  );

  return normalizedParts.join(" ") || "Pieza";
}

function getDesktopTypePreviewSistema(subtipo: string) {
  if (subtipo === "Ventana") {
    return "Abatible";
  }

  return "";
}

function getDesktopTypePreview(draft: PasoDosGrupoDraft, maxW = 128, maxH = 64) {
  return generateComponentSVG({
    tipo: draft.subtipo,
    sistema: getDesktopTypePreviewSistema(draft.subtipo),
    configuracion: "",
    sheetScheme: "",
    sheetVariant: "",
    customSchemeDescription: "",
    isCustomScheme: false,
    referencia: "",
    ancho: null,
    alto: null,
    colorHex: draft.colorHex,
    maxW,
    maxH,
    mirrorFormat: draft.mirrorFormat,
    mirrorPaneCount: draft.mirrorPaneCount,
    mirrorPaneDirection: draft.mirrorPaneDirection,
    mirrorInteriorLine: draft.mirrorInteriorLine,
  });
}

function getDesktopPiecePreview(draft: PasoDosGrupoDraft, maxW = 170, maxH = 92) {
  if (draft.guidedVisualConfig) {
    return renderGuidedVisualSvg(applyCommercialPalilloToGuidedVisualConfig({
      config: draft.guidedVisualConfig,
      palilloEnabled: draft.palilloEnabled,
      palilloType: draft.palilloType,
    }), {
      maxW,
      maxH,
      colorHex: draft.colorHex,
      variant: "thumbnail",
      showSelection: false,
      showLabels: false,
      showDimensions: false,
    });
  }

  return generateComponentSVG({
    tipo: draft.subtipo,
    sistema: draft.sistema,
    configuracion: draft.configuracion,
    sheetScheme: draft.sheetScheme,
    sheetVariant: draft.sheetVariant,
    customSchemeDescription: draft.customSchemeDescription,
    isCustomScheme: draft.isCustomScheme,
    referencia: draft.referencia,
    ancho: draft.ancho ? Number(draft.ancho) : null,
    alto: draft.alto ? Number(draft.alto) : null,
    colorHex: draft.colorHex,
    maxW,
    maxH,
    palilloEnabled: draft.palilloEnabled,
    palilloType: draft.palilloType,
    mirrorFormat: draft.mirrorFormat,
    mirrorPaneCount: draft.mirrorPaneCount,
    mirrorPaneDirection: draft.mirrorPaneDirection,
    mirrorInteriorLine: draft.mirrorInteriorLine,
  });
}

function getCompositionPreviewSvg(
  draft: PasoDosGrupoDraft,
  option: string,
  mode: "scheme" | "variant"
) {
  return generateComponentSVG({
    tipo: draft.subtipo,
    sistema: draft.sistema,
    configuracion: draft.configuracion,
    sheetScheme: mode === "scheme" ? option : draft.sheetScheme,
    sheetVariant: mode === "variant" ? option : draft.sheetVariant,
    customSchemeDescription: draft.customSchemeDescription,
    isCustomScheme: draft.isCustomScheme,
    ancho: draft.ancho ? Number(draft.ancho) : 1200,
    alto: draft.alto ? Number(draft.alto) : 1200,
    colorHex: draft.colorHex,
    maxW: 130,
    maxH: 58,
  });
}

export function PasoDosAgregarGrupoSheet({
  isOpen,
  variant = "overlay",
  paso,
  entryMode,
  draft,
  subtypeOptions,
  systemOptions,
  glassOptions,
  visibleLineTemplates = [],
  summary,
  onClose,
  onBack,
  onNext,
  onGoToStep,
  onConfirm,
  globalError = null,
  onDuplicatePiece,
  onDiscardDraft,
  onRequestSwitchMode,
  onOpenComponentCreator,
  detailOnlyMode = false,
  pieceCode = "P1",
  pieceEditionHeadline = "",
  onSelectCategoria,
  onSelectSubtipo,
  onSelectCantidad,
  onEnableCustomQuantity,
  onCustomQuantityChange,
  onCantidadInputChange,
  onNormalizeCantidadInput,
  onMaterialChange,
  onSelectLineTemplate,
  onTemplatePriceUpdated,
  onColorChange,
  onNombreChange,
  onDescripcionChange,
  onSistemaChange,
  configurationOptions = [],
  onConfiguracionChange,
  onSheetSchemeChange,
  onSheetVariantChange,
  onCustomSchemeDescriptionChange,
  onGuidedVisualConfigChange,
  onVidrioChange,
  onCreateCustomGlass,
  onAnchoChange,
  onAltoChange,
  onCubicationSnapshotChange,
  onFabricationRecipeIdChange,
  onFabricacionSnapshotChange,
  onFabricacionContextoChange,
  onOpenDespieceReview,
  onPrecioChange,
  onPrecioPorM2Change,
  onMinimoCobrableChange,
  onRedondeoPrecioChange,
  onPriceInputModeChange,
  onToggleCustomizeUnitPrice,
  onCobraPrecioSeparadoChange,
  onAddAlcanceDetalle,
  onUpdateAlcanceDetalle,
  onRemoveAlcanceDetalle,
  nestedDetailItems = [],
  onEditNestedDetailItem,
  onRemoveNestedDetailItem,
  quotePricingMode,
  totalClienteManual,
  internalObservation,
  onGlobalTotalClienteChange,
  onInternalObservationChange,
  canContinueFromQuantity,
  canContinueFromConfig,
}: Props) {
  const [isInternalObservationOpen, setIsInternalObservationOpen] = useState(
    Boolean(internalObservation.trim())
  );
  const [showAllOtherTypes, setShowAllOtherTypes] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isDesktopGlassCatalogOpen, setIsDesktopGlassCatalogOpen] = useState(false);
  const [desktopGlassSearch, setDesktopGlassSearch] = useState("");
  const [desktopGlassGroup, setDesktopGlassGroup] = useState("");
  const [desktopGlassPopoverStyle, setDesktopGlassPopoverStyle] = useState({
    top: 0,
    left: 0,
    width: 560,
    maxHeight: 440,
  });
  const [isDesktopGlassPopoverReady, setIsDesktopGlassPopoverReady] = useState(false);
  const [isGuidedComposerOpen, setIsGuidedComposerOpen] = useState(false);
  const { organizacionId } = useAuth();
  const [priceEditorTemplate, setPriceEditorTemplate] = useState<CotizacionLineTemplate | null>(null);
  const [guidedDraft, setGuidedDraft] = useState<GuidedVisualConfig | null>(null);
  const desktopGlassTriggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopGlassPopoverRef = useRef<HTMLDivElement | null>(null);
  const isOverlay = variant === "overlay";
  const hasAutoAdvancedFreeValue = useRef(false);
  const stepCopy = STEP_COPY[paso];
  const disableContinue =
    (paso === 3 && !canContinueFromQuantity) || (paso === 4 && !canContinueFromConfig);
  const showSheetScheme = shouldShowSheetSchemeForComponent({
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const showSystemSelection = shouldShowSystemSelectionForComponent(draft.subtipo);
  const isGlassCatalogItem = isGlassCatalogSelection(draft);
  const requiresProfileMaterial =
    shouldRequireProfileMaterialForComponent(draft.subtipo) && !isGlassCatalogItem;
  const catalogLabel = isGlassCatalogItem ? "Producto de cristal" : "Linea comercial";
  const catalogAriaLabel = isGlassCatalogItem
    ? "Seleccionar producto de cristal"
    : "Seleccionar linea comercial";
  const isTrabajoPersonalizado = draft.subtipo === "Trabajo personalizado";
  const isFreeValue = isFreeValueComponentType(draft.subtipo);
  const canAutoAdvanceFree = false;
  useEffect(() => {
    if (!canAutoAdvanceFree || hasAutoAdvancedFreeValue.current) {
      return;
    }

    hasAutoAdvancedFreeValue.current = true;
    onGoToStep(5);
  }, [canAutoAdvanceFree, onGoToStep]);
  const orderedGlassOptions = useMemo(() => sortGlassOptions(glassOptions), [glassOptions]);
  const selectedLineTemplate =
    visibleLineTemplates.find((template) => String(template.id) === draft.lineTemplateId) ?? null;
  const selectedLineTemplateRecommendedGlass =
    selectedLineTemplate
      ?.vidrioPrincipalRecomendado ?? null;
  const glassRecommendation = useMemo(
    () =>
      getGlassRecommendations(
        {
          subtipo: draft.subtipo,
          sistema: draft.sistema,
          lineTemplateRecommendedGlass: selectedLineTemplateRecommendedGlass,
        },
        orderedGlassOptions
      ),
    [draft.sistema, draft.subtipo, orderedGlassOptions, selectedLineTemplateRecommendedGlass]
  );
  const canSaveDesktopGlass =
    Boolean(normalizeCustomGlassValue(desktopGlassSearch)) &&
    !hasGlassOption(orderedGlassOptions, normalizeCustomGlassValue(desktopGlassSearch));
  const desktopGlassSearchResults = useMemo(
    () => filterVidrios(desktopGlassSearch, orderedGlassOptions),
    [desktopGlassSearch, orderedGlassOptions]
  );
  const desktopGlassCatalogGroups = useMemo(() => {
    const groups = GLASS_OPTIONS.map((group) => ({
      grupo: group.grupo,
      options: sortGlassOptions(
        group.items.map((item) => buildGlassValue(group.prefix, item))
      ),
    }));

    if (draft.subtipo !== "Espejo") {
      return groups;
    }

    const mirrorGroup = groups.find((group) => group.grupo === "Espejos");
    const otherGroups = groups.filter((group) => group.grupo !== "Espejos");

    return mirrorGroup ? [mirrorGroup, ...otherGroups] : groups;
  }, [draft.subtipo]);
  const activeDesktopGlassGroup =
    desktopGlassGroup || desktopGlassCatalogGroups[0]?.grupo || "";
  const activeDesktopGlassOptions =
    desktopGlassCatalogGroups.find((group) => group.grupo === activeDesktopGlassGroup)?.options ??
    desktopGlassCatalogGroups[0]?.options ??
    [];
  const desktopRecommendedGlassOptions = glassRecommendation.recommendedOptions.slice(0, 3);
  const positionDesktopGlassPopover = useCallback(() => {
    const trigger = desktopGlassTriggerRef.current;

    if (!trigger || typeof window === "undefined") {
      setIsDesktopGlassPopoverReady(false);
      return false;
    }

    const rect = trigger.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      setIsDesktopGlassPopoverReady(false);
      return false;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const editorRect =
      trigger.closest(`.${s.desktopPieceEditor}`)?.getBoundingClientRect() ?? {
        left: 12,
        right: viewportWidth - 12,
      };
    const desktopSidebarSafeLeft = viewportWidth >= 1024 ? 264 : 12;
    const boundaryLeft = Math.max(desktopSidebarSafeLeft, Math.min(editorRect.left, rect.left));
    const boundaryRight = Math.min(
      viewportWidth - 12,
      Math.max(editorRect.right, rect.right, boundaryLeft + 560)
    );
    const availableWidth = Math.max(320, boundaryRight - boundaryLeft);
    const width = Math.min(620, Math.max(560, rect.width), availableWidth);
    const left = Math.min(Math.max(rect.left, boundaryLeft), boundaryRight - width);
    const gap = 10;
    const maxHeight = Math.min(440, viewportHeight - 24);
    const spaceBelow = viewportHeight - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const shouldOpenAbove = spaceBelow < maxHeight && spaceAbove > spaceBelow;
    const top = shouldOpenAbove
      ? Math.max(12, rect.top - gap - maxHeight)
      : Math.min(rect.bottom + gap, viewportHeight - maxHeight - 12);

    setDesktopGlassPopoverStyle({ top, left, width, maxHeight });
    setIsDesktopGlassPopoverReady(true);
    return true;
  }, []);

  useEffect(() => {
    if (!isDesktopGlassCatalogOpen) {
      return;
    }

    window.addEventListener("resize", positionDesktopGlassPopover);
    window.addEventListener("scroll", positionDesktopGlassPopover, true);

    return () => {
      window.removeEventListener("resize", positionDesktopGlassPopover);
      window.removeEventListener("scroll", positionDesktopGlassPopover, true);
    };
  }, [isDesktopGlassCatalogOpen, positionDesktopGlassPopover]);

  useEffect(() => {
    if (!isDesktopGlassCatalogOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        desktopGlassTriggerRef.current?.contains(target) ||
        desktopGlassPopoverRef.current?.contains(target)
      ) {
        return;
      }

      setIsDesktopGlassCatalogOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setIsDesktopGlassCatalogOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isDesktopGlassCatalogOpen]);

  if (!isOpen) {
    return null;
  }
  const freeValueGuidance = getComponentDescripcion(draft.subtipo);
  const shouldShowFreeValuePrice =
    quotePricingMode !== "total_global" || draft.cobraPrecioSeparado;
  const isSingleStepFreeTotal = entryMode === "free_total_single";
  const shouldConfirmFromCurrentStep = !isOverlay && isSingleStepFreeTotal && paso === 4;
  const visibleTypeGroups = shouldHideFreeNotebookCategoryInWizard(quotePricingMode, entryMode)
    ? COMPONENT_TYPE_GROUPS.filter((group) => group.title !== "Proyecto libre y Mantencion")
    : COMPONENT_TYPE_GROUPS;
  const sheetSchemeOptions = getSheetSchemeOptions({
    tipo: draft.subtipo,
    sistema: draft.sistema,
    configuracion: draft.configuracion,
  });
  const sheetVariantOptions = getSheetVariantOptions(draft.sheetScheme, {
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const compositionSectionLabel = getCompositionSectionLabel({
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const showCustomSchemeDescription = requiresCustomSheetDescription({
    sheetScheme: draft.sheetScheme,
    sheetVariant: draft.sheetVariant,
  });
  const stepDescription =
    isSingleStepFreeTotal && paso === 4
      ? "Describe el trabajo y define el precio final."
      : stepCopy.description;
  const sheetTitle = isSingleStepFreeTotal && paso === 4 ? "Cuaderno comercial" : stepCopy.title;
  const globalTotalInputValue =
    totalClienteManual !== null && totalClienteManual !== undefined
      ? formatCurrencyInput(String(totalClienteManual))
      : "";

  const priceEditor =
    priceEditorTemplate && organizacionId ? (
      <LinePriceEditor
        template={priceEditorTemplate}
        organizationId={organizacionId}
        onSaved={(updated) => {
          setPriceEditorTemplate(null);
          onTemplatePriceUpdated?.(updated);
        }}
        onClose={() => setPriceEditorTemplate(null)}
      />
    ) : null;

  if (!isOverlay && entryMode !== "free_total_single" && (quotePricingMode === "por_item" || quotePricingMode === "total_global")) {
    const totalGlobalDetailMode = detailOnlyMode || quotePricingMode === "total_global";
    const maxDesktopStep = totalGlobalDetailMode ? (3 as const) : (5 as const);
    const typeOptions = visibleTypeGroups.flatMap((group) =>
      group.items.map((item) => ({ categoria: group.title, label: item }))
    );
    const editionHeadline = pieceEditionHeadline.trim();
    const usesCompactEditionHeader = editionHeadline.length > 0;
    const pCode = pieceCode;
    const isFreeType = isFreeValue;

    const frequentTypeOptions = typeOptions.filter((option) =>
      (DESKTOP_FREQUENT_TYPES as readonly string[]).includes(option.label)
    );
    const otherTypeOptions = typeOptions.filter(
      (option) => !(DESKTOP_FREQUENT_TYPES as readonly string[]).includes(option.label)
    );
    const primaryOtherTypeOptions = otherTypeOptions.filter((option) =>
      (DESKTOP_OTHER_TYPES_PRIMARY as readonly string[]).includes(option.label)
    );
    const expandedOtherTypeOptions = otherTypeOptions.filter((option) =>
      (DESKTOP_OTHER_TYPES_EXPANDED as readonly string[]).includes(option.label)
    );
    const shouldShowExpandedOtherTypes =
      showAllOtherTypes ||
      (DESKTOP_OTHER_TYPES_EXPANDED as readonly string[]).includes(draft.subtipo);

    if (isFreeType && paso > 2) {
      const rawFreeStep = paso <= 2 ? 1 : 2;
      const freeStepVal = rawFreeStep;
      const hasFreeTypeSelected = draft.subtipo.trim() !== "";
      const hasFreeNombre = (draft.nombre ?? "").trim() !== "";
      const hasFreeDescripcion = (draft.descripcion ?? "").trim() !== "";
      const hasFreePrecio = (draft.precio ?? "").trim() !== "";
      const canFinishFree = hasFreeNombre && hasFreeDescripcion && hasFreePrecio;
      const hasAvanzadoTipo = hasFreeTypeSelected && freeStepVal > 1;

      return (
        <section className={s.desktopPieceEditor} aria-label="Editor de item libre">
          <header className={d.headerStrip}>
            <div className={d.headerCopy}>
              {usesCompactEditionHeader ? (
                <>
                  <h2 className={d.headerTitle}>{editionHeadline}</h2>
                  <p className={d.headerMeta}>
                    {hasFreeTypeSelected ? draft.subtipo : "Trabajo libre / Mantención"} · Paso{" "}
                    {freeStepVal} de 2
                  </p>
                </>
              ) : (
                <>
                  <h2 className={d.headerTitle}>
                    {`${pCode} · ${
                      hasFreeTypeSelected ? draft.subtipo : "Trabajo libre / Mantencion"
                    }`}
                  </h2>
                  <p className={d.headerMeta}>Completa el detalle y el valor del trabajo.</p>
                </>
              )}
            </div>
            <div className={d.headerActions}>
              {onRequestSwitchMode ? (
                <button type="button" className={d.headerModeSwitch} onClick={onRequestSwitchMode}>
                  Por componentes · Cambiar
                </button>
              ) : null}
              <button
                type="button"
                className={d.headerIconButton}
                aria-label="Cerrar editor"
                title="Cerrar editor"
                onClick={() => {
                  const hasFreeDraftData =
                    draft.nombre.trim() !== "" ||
                    draft.descripcion.trim() !== "" ||
                    draft.precio !== "";
                  if (hasFreeDraftData && onDiscardDraft) {
                    setIsDiscardModalOpen(true);
                    return;
                  }
                  if (hasFreeDraftData) {
                    if (!window.confirm("Tienes un item sin finalizar. Perderas los cambios si cierras el editor. \u00bfQuieres cerrarlo?")) {
                      return;
                    }
                  }
                  onClose();
                }}
              >
                <LuX aria-hidden />
              </button>
            </div>
          </header>

          <ol className={d.stepperRail} aria-label="Pasos del item libre">
            <li className={`${d.stepperRailItem} ${freeStepVal === 1 ? d.stepperRailActive : hasAvanzadoTipo ? d.stepperRailComplete : d.stepperRailFuture}`}>
              <button
                type="button"
                className={`${d.stepperRailButton} ${freeStepVal === 1 ? d.stepperRailActive : hasAvanzadoTipo ? d.stepperRailComplete : d.stepperRailFuture}`}
                onClick={() => onGoToStep(1)}
              >
                <span className={d.stepperRailMark} aria-hidden>{hasAvanzadoTipo ? <LuCheck /> : 1}</span>
                <span className={d.stepperRailLabel}>Tipo</span>
              </button>
            </li>
            <li className={`${d.stepperRailItem} ${freeStepVal === 2 ? d.stepperRailActive : d.stepperRailFuture}`}>
              <span className={`${d.stepperRailConnector} ${hasAvanzadoTipo ? d.stepperRailConnectorComplete : ""}`} aria-hidden />
              <button
                type="button"
                className={`${d.stepperRailButton} ${freeStepVal === 2 ? d.stepperRailActive : hasAvanzadoTipo ? d.stepperRailFuture : d.stepperRailFuture}`}
                onClick={() => onGoToStep(5)}
              >
                <span className={d.stepperRailMark} aria-hidden>2</span>
                <span className={d.stepperRailLabel}>Detalle y valor</span>
              </button>
            </li>
          </ol>

          {freeStepVal === 1 ? (
            <div className={s.desktopPieceBody}>
              <h3 className={s.desktopPieceStepHeading}>{"\u00bfQu\u00e9 est\u00e1s cotizando?"}</h3>
              <div className={d.typeSection}>
                {frequentTypeOptions.length > 0 ? (
                  <div>
                    <p className={d.typeSectionLabel}>Frecuentes</p>
                    <div className={d.typeGrid}>
                      {frequentTypeOptions.map((option) => {
                        const isActive = draft.subtipo === option.label;
                        const isFreeVal = option.label === "Trabajo libre / Mantencion";
                        return (
                          <button
                            key={`freq-${option.label}`}
                            type="button"
                            className={`${d.typeTile} ${d.typeTileFrequent} ${isActive ? d.typeTileActive : ""}`}
                            onClick={() => {
                              onSelectCategoria(option.categoria);
                              onSelectSubtipo(option.label);
                              if (isFreeVal) {
                                setTimeout(() => onGoToStep(5), 0);
                              }
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {primaryOtherTypeOptions.length > 0 ? (
                  <div>
                    <p className={d.typeSectionLabel}>Otros trabajos</p>
                    <div className={d.typeGrid}>
                      {primaryOtherTypeOptions.map((option) => {
                        const isActive = draft.subtipo === option.label;
                        return (
                          <button
                            key={`other-${option.label}`}
                            type="button"
                            className={`${d.typeTile} ${d.typeTileSecondary} ${isActive ? d.typeTileActive : ""}`}
                            onClick={() => {
                              onSelectCategoria(option.categoria);
                              onSelectSubtipo(option.label);
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {expandedOtherTypeOptions.length > 0 && shouldShowExpandedOtherTypes ? (
                      <div className={`${d.typeGrid} ${d.typeGridExpanded}`}>
                        {expandedOtherTypeOptions.map((option) => {
                          const isActive = draft.subtipo === option.label;
                          return (
                            <button
                              key={`expanded-${option.label}`}
                              type="button"
                              className={`${d.typeTile} ${d.typeTileSecondary} ${isActive ? d.typeTileActive : ""}`}
                              onClick={() => {
                                onSelectCategoria(option.categoria);
                                onSelectSubtipo(option.label);
                              }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : expandedOtherTypeOptions.length > 0 ? (
                      <button
                        type="button"
                        className={d.showAllTypesButton}
                        onClick={() => setShowAllOtherTypes(true)}
                      >
                        Ver todos los trabajos
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <footer className={d.footer}>
                <div className={d.footerSummary}>
                  <span className={d.footerInstruction}>Elige el tipo de pieza para comenzar.</span>
                </div>
                <div className={d.footerActions}>
                  <button type="button" className={s.btnPrimary} disabled={!hasFreeTypeSelected} onClick={() => onGoToStep(5)}>
                    Continuar a detalle y valor
                  </button>
                </div>
              </footer>
            </div>
          ) : null}

          {freeStepVal === 2 ? (
            <div className={s.desktopPieceBody}>
              <h3 className={s.desktopPieceStepHeading}>Detalle y valor del trabajo</h3>
              <div className={d.desktopFreeValueStep}>
                <label className={d.desktopFreeValueField}>
                  <span className={d.desktopFreeValueLabel}>Nombre del trabajo</span>
                  <input
                    className={d.desktopFreeValueInput}
                    value={draft.nombre}
                    onChange={(e) => onNombreChange(e.target.value)}
                    placeholder="Ej. Cambio de vidrio en bano principal"
                  />
                </label>

                <label className={d.desktopFreeValueField}>
                  <span className={d.desktopFreeValueLabel}>Descripcion para el cliente</span>
                  <textarea
                    className={d.desktopFreeValueTextarea}
                    value={draft.descripcion}
                    onChange={(e) => onDescripcionChange(e.target.value)}
                    placeholder="Describe el trabajo, materiales, instalacion, reparacion o condiciones incluidas."
                    rows={3}
                  />
                </label>

                <label className={d.desktopFreeValueField}>
                  <span className={d.desktopFreeValueLabel}>Precio final del item</span>
                  <div className={s.rtMoneyInputWrap}>
                    <span className={s.rtMoneyPrefix}>$</span>
                    <input
                      className={s.rtMoneyInput}
                      inputMode="numeric"
                      value={draft.precio}
                      onChange={(e) => onPrecioChange(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <span className={d.desktopFreeValueHint}>El IVA se define al revisar el presupuesto.</span>
                </label>

                <div className={d.freeValueActions}>
                  <button type="button" className={s.btnGhost} onClick={() => onGoToStep(1)}>
                    Volver a tipo
                  </button>
                  <button type="button" className={s.btnPrimary} disabled={!canFinishFree} onClick={onConfirm}>
                    Finalizar item
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      );
    }

    const desktopStep = Math.min(paso, maxDesktopStep) as 1 | 2 | 3 | 4 | 5;
    const pieceTitle = getDesktopPieceTitle(draft);
    const subtitle = draft.sistema.trim()
      ? [
          requiresProfileMaterial ? draft.material : null,
          draft.vidrio,
          `${Math.max(1, draft.cantidad)} unidad${draft.cantidad === 1 ? "" : "es"}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : [
          "Sistema por definir",
          `${Math.max(1, draft.cantidad)} unidad${draft.cantidad === 1 ? "" : "es"}`,
        ].join(" · ");
    const selectedColorLabel =
      COLOR_OPTIONS.find(
        (option) => option.hex.toLowerCase() === draft.colorHex.toLowerCase()
      )?.label ?? "Color";
    const largePreviewSvg = getDesktopPiecePreview(draft, 330, 130);
    const measuresPreviewSvg = getDesktopPiecePreview(draft, 300, 150);
    const personalizadoAssistMode = isCubicationPersonalizadoAssistMode({
      tipo: draft.subtipo,
      sistema: draft.sistema,
      sheetScheme: draft.sheetScheme,
      configuracion: draft.configuracion,
      isCustomScheme: draft.isCustomScheme,
    });
    const measuresCubicationPreview = resolveActiveCubicationPreview({
      componentForm: {
        ancho: draft.ancho,
        alto: draft.alto,
        cantidad: String(Math.max(1, draft.cantidad)),
        lineTemplateId: draft.lineTemplateId,
        cubicationSnapshot: draft.cubicationSnapshot,
      },
      selectedTemplate: selectedLineTemplate,
      personalizadoAssistMode,
    });
    const measuresBarUsage =
      measuresCubicationPreview && measuresCubicationPreview.bars.length > 0
        ? measuresCubicationPreview
        : null;
    const areaM2 = getDraftAreaM2(draft);
    const pieceValue = getDraftPieceValue(draft);
    const quantityValue = getQuantityInputValue(draft);
    const hasType = draft.subtipo.trim() !== "";
    const isCorredera = isCorrederaSheetConfiguration({ tipo: draft.subtipo, sistema: draft.sistema });
    const isBowWindow = isBowWindowConfiguration({ tipo: draft.subtipo, sistema: draft.sistema });
    const isGuillotinaOrCelosia = isGuillotinaOrCelosiaConfiguration({
      tipo: draft.subtipo,
      sistema: draft.sistema,
    });
    const hasSystem = isDesktopPieceSystemStepComplete({
      subtipo: draft.subtipo,
      sistema: draft.sistema,
      configuracion: draft.configuracion,
      sheetScheme: draft.sheetScheme,
      sheetVariant: draft.sheetVariant,
      customSchemeDescription: draft.customSchemeDescription,
      isCustomScheme: draft.isCustomScheme,
      configurationOptionsCount: configurationOptions.length,
      guidedVisualConfig: draft.guidedVisualConfig,
    });
    const personalizadoPending =
      (isTrabajoPersonalizadoComponentType(draft.subtipo) ||
        isPersonalizadoCompositionSelected({
          sistema: draft.sistema,
          sheetScheme: draft.sheetScheme,
          configuracion: draft.configuracion,
        })) &&
      !draft.guidedVisualConfig &&
      draft.customSchemeDescription.trim() === "";
    const hasMeasurements =
      !isFreeValue &&
      Number(draft.ancho) > 0 &&
        Number(draft.alto) > 0 &&
        draft.cantidad > 0 &&
        (!draft.usaCantidadPersonalizada || draft.cantidadPersonalizada.trim() !== "");
    const canFinishPiece = totalGlobalDetailMode
      ? hasType && hasSystem && hasMeasurements
      : hasType && hasSystem && hasMeasurements && isGrupoDraftPriceStepValid(draft);
    const finishBlockedHint = !hasType
      ? "Elige el tipo de pieza para continuar."
      : personalizadoPending
        ? "Abre el constructor o describe la composición personalizada."
        : !hasSystem
          ? "Completa sistema y composición para continuar."
          : !hasMeasurements
            ? totalGlobalDetailMode
              ? "Completa medidas para finalizar el detalle."
              : "Completa medidas para continuar."
            : !totalGlobalDetailMode && !isGrupoDraftPriceStepValid(draft)
              ? "Define un precio válido para finalizar la pieza."
              : "Completa los datos pendientes para finalizar.";
    const isLineM2Pricing = draft.priceInputMode === "line_m2";
    const isUnitDirectPricing = draft.priceInputMode === "unit_direct";
    const isPieceTotalPricing = draft.priceInputMode === "piece_total";
    const linePricingSummary = buildGrupoDraftLinePricingSummary(draft);
    const unitPrice = resolveGrupoDraftUnitPrice(draft);
    const referentialUnitPrice = resolveGrupoDraftReferentialUnitPrice(draft);
    const pieceSubtotal = resolveGrupoDraftSubtotal(draft);
    const quantityForPrice = Math.max(1, draft.cantidad);
    const showCustomizeUnitPrice = isLineM2Pricing && draft.precioAjustadoManual;
    const desktopStepCta: Record<1 | 2 | 3 | 4 | 5, string> = {
      1: isFreeType ? "Continuar a detalle y valor" : "Continuar a sistema",
      2: "Continuar a medidas",
      3: totalGlobalDetailMode ? "Agregar detalle al presupuesto" : "Continuar a despiece",
      4: "Continuar a precio",
      5: "Finalizar pieza",
    };
    const desktopStepFooterHint: Record<1 | 2 | 3 | 4 | 5, string> = {
      1: "Elige el tipo de pieza para comenzar.",
      2: personalizadoPending
        ? "Abre el constructor o describe la composición personalizada."
        : isCorredera
          ? "Define sistema, cantidad de hojas y composición."
          : isBowWindow
            ? "Elige apertura y composición del bow window."
            : isGuillotinaOrCelosia
              ? "Selecciona la configuración del sistema."
              : "Confirma el sistema y su composición.",
      3: "Ingresa medidas, cantidad y terminaciones.",
      4: "Revisa la cubicación y la pauta de cortes.",
      5: "Revisa el valor antes de finalizar la pieza.",
    };
    const canAdvanceFromCurrentStep =
      desktopStep === 1
        ? hasType
        : desktopStep === 2
          ? hasSystem
          : desktopStep === 3
            ? totalGlobalDetailMode
              ? canFinishPiece
              : hasMeasurements
            : desktopStep === 4
              ? hasMeasurements
              : canFinishPiece;
    const internalSteps: Array<{
      id: 1 | 2 | 3 | 4 | 5;
      label: string;
      instruction: string;
      complete: boolean;
      locked: boolean;
    }> = [
      {
        id: 1,
        label: "Tipo",
        instruction: desktopStepFooterHint[1],
        complete: hasType && desktopStep > 1,
        locked: false,
      },
      {
        id: 2,
        label: "Sistema",
        instruction: desktopStepFooterHint[2],
        complete: hasSystem,
        locked: isFreeType || !hasType,
      },
      {
        id: 3,
        label: "Medidas",
        instruction: desktopStepFooterHint[3],
        complete: hasMeasurements,
        locked: isFreeType || !hasType || !hasSystem,
      },
      ...(totalGlobalDetailMode
        ? []
        : [
            {
              id: 4 as const,
              label: "Despiece",
              instruction: desktopStepFooterHint[4],
              complete: hasMeasurements,
              locked: isFreeType || !hasType || !hasSystem || !hasMeasurements,
            },
            {
              id: 5 as const,
              label: "Precio",
              instruction: desktopStepFooterHint[5],
              complete: pieceValue > 0,
              locked: isFreeType || !hasType || !hasSystem || !hasMeasurements,
            },
          ]),
    ];
    const stepHeadings: Record<1 | 2 | 3 | 4 | 5, string> = {
      1: "\u00bfQu\u00e9 est\u00e1s cotizando?",
      2: "Sistema y composición",
      3: "Medidas y terminaciones",
      4: "Despiece y pauta",
      5: "Define el precio",
    };
    const configSummary = buildDesktopConfigSummary({
      sistema: draft.sistema,
      configuracion: draft.configuracion,
      sheetScheme: draft.sheetScheme,
      sheetVariant: draft.sheetVariant,
    });
    const typePreviewSvg = hasType ? getDesktopTypePreview(draft, 128, 64) : "";
    const typeStepHint = hasType ? getDesktopTypeStepHint(draft.subtipo) : "";
    const desktopGlassDatalistId = `desktop-glass-options-${usesCompactEditionHeader ? "active-piece" : String(pieceCode).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    const useVisualComposition =
      (isCorredera && sheetVariantOptions.length > 0) ||
      (isBowWindow && sheetSchemeOptions.length > 0) ||
      (showSheetScheme && !isCorredera && sheetSchemeOptions.length >= 3);
    const desktopGlassPopover =
      isDesktopGlassCatalogOpen && isDesktopGlassPopoverReady && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={desktopGlassPopoverRef}
              id={desktopGlassDatalistId}
              className={d.glassCatalogPanel}
              role="dialog"
              aria-label="Catalogo de vidrios"
              style={{
                top: `${desktopGlassPopoverStyle.top}px`,
                left: `${desktopGlassPopoverStyle.left}px`,
                width: `${desktopGlassPopoverStyle.width}px`,
                maxHeight: `${desktopGlassPopoverStyle.maxHeight}px`,
              }}
            >
              <div className={d.glassCatalogHeader}>
                <div>
                  <strong>Seleccionar vidrio</strong>
                  <span>{glassRecommendation.reason}</span>
                </div>
                <button
                  type="button"
                  className={d.glassCatalogClose}
                  aria-label="Cerrar catalogo de vidrios"
                  onClick={() => setIsDesktopGlassCatalogOpen(false)}
                >
                  <LuX aria-hidden />
                </button>
              </div>

              <div className={d.glassSearchWrap}>
                <LuSearch aria-hidden />
                <input
                  className={d.glassSearchInput}
                  value={desktopGlassSearch}
                  onChange={(event) => setDesktopGlassSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || !canSaveDesktopGlass) {
                      return;
                    }

                    event.preventDefault();
                    onCreateCustomGlass(desktopGlassSearch);
                    setDesktopGlassSearch("");
                    setIsDesktopGlassCatalogOpen(false);
                  }}
                  placeholder="Buscar: incoloro, DVH, 5 mm, 4+12+4..."
                  autoFocus
                />
                {desktopGlassSearch ? (
                  <button
                    type="button"
                    className={d.glassSearchClear}
                    aria-label="Limpiar busqueda"
                    onClick={() => setDesktopGlassSearch("")}
                  >
                    <LuX aria-hidden />
                  </button>
                ) : null}
              </div>

              <div className={d.glassPopoverBody}>
                {!desktopGlassSearch.trim() && desktopRecommendedGlassOptions.length > 0 ? (
                  <section className={d.glassCatalogGroup}>
                    <h4>Recomendados para esta linea</h4>
                    <div className={d.glassCatalogChips}>
                      {desktopRecommendedGlassOptions.map((option) => {
                        const isActive = draft.vidrio === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${d.glassCatalogChip} ${d.glassCatalogChipRecommended} ${isActive ? d.glassCatalogChipActive : ""}`}
                            aria-pressed={isActive}
                            onClick={() => {
                              onVidrioChange(option);
                              setIsDesktopGlassCatalogOpen(false);
                            }}
                          >
                            <span>{repairBrokenText(option)}</span>
                            {isActive ? <LuCheck aria-hidden /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {!desktopGlassSearch.trim() ? (
                  <div className={d.glassCategoryFilters} aria-label="Categorias de vidrio">
                    {desktopGlassCatalogGroups.map((group) => {
                      const isActive = group.grupo === activeDesktopGlassGroup;

                      return (
                        <button
                          key={group.grupo}
                          type="button"
                          className={`${d.glassCategoryButton} ${isActive ? d.glassCategoryButtonActive : ""}`}
                          onClick={() => setDesktopGlassGroup(group.grupo)}
                        >
                          {repairBrokenText(group.grupo)}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {desktopGlassSearch.trim() ? (
                  <div className={d.glassCatalogChips}>
                    {desktopGlassSearchResults.length > 0 ? (
                      desktopGlassSearchResults.map((option) => {
                        const isActive = draft.vidrio === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${d.glassCatalogChip} ${isActive ? d.glassCatalogChipActive : ""}`}
                            aria-pressed={isActive}
                            onClick={() => {
                              onVidrioChange(option);
                              setDesktopGlassSearch("");
                              setIsDesktopGlassCatalogOpen(false);
                            }}
                          >
                            <span>{repairBrokenText(option)}</span>
                            {isActive ? <LuCheck aria-hidden /> : null}
                          </button>
                        );
                      })
                    ) : (
                      <span className={d.glassNoResults}>
                        Sin resultados para {desktopGlassSearch}.
                      </span>
                    )}
                    {canSaveDesktopGlass ? (
                      <button
                        type="button"
                        className={`${d.glassCatalogChip} ${d.glassCatalogChipSave}`}
                        onClick={() => {
                          onCreateCustomGlass(desktopGlassSearch);
                          setDesktopGlassSearch("");
                          setIsDesktopGlassCatalogOpen(false);
                        }}
                      >
                        Guardar {desktopGlassSearch.trim()}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <section className={d.glassCatalogGroup}>
                    <h4>{repairBrokenText(activeDesktopGlassGroup)}</h4>
                    <div className={d.glassCatalogChips}>
                      {activeDesktopGlassOptions.map((option) => {
                        const isActive = draft.vidrio === option;
                        const isRecommended = glassRecommendation.recommendedOptions.includes(option);

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${d.glassCatalogChip} ${isRecommended ? d.glassCatalogChipRecommended : ""} ${isActive ? d.glassCatalogChipActive : ""}`}
                            aria-pressed={isActive}
                            onClick={() => {
                              onVidrioChange(option);
                              setIsDesktopGlassCatalogOpen(false);
                            }}
                          >
                            <span>{repairBrokenText(option)}</span>
                            {isActive ? <LuCheck aria-hidden /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            </div>,
            document.body
          )
        : null;

    return (
      <>
      <section className={s.desktopPieceEditor} aria-label="Editor de pieza activa">
        <header className={d.headerStrip}>
          <div className={d.headerCopy}>
            {usesCompactEditionHeader ? (
              <>
                <h2 className={d.headerTitle}>{editionHeadline}</h2>
                <p className={d.headerMeta}>
                  {pieceTitle} · Paso {desktopStep} de {totalGlobalDetailMode ? 3 : 5}
                </p>
              </>
            ) : (
              <>
                <h2 className={d.headerTitle}>{`${pieceCode} · ${pieceTitle}`}</h2>
                <p className={d.headerMeta}>
                  {subtitle || "Completa la informacion comercial de esta pieza."}
                </p>
              </>
            )}
          </div>
          <div className={d.headerActions}>
            {onRequestSwitchMode ? (
              <button type="button" className={d.headerModeSwitch} onClick={onRequestSwitchMode}>
                Por componentes · Cambiar
              </button>
            ) : null}
            {onDuplicatePiece ? (
              <button
                type="button"
                className={d.headerIconButton}
                aria-label="Duplicar pieza"
                onClick={onDuplicatePiece}
              >
                <LuCopy aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className={d.headerIconButton}
              aria-label="Cerrar editor"
              title="Cerrar editor"
              onClick={() => {
                if (quotePricingMode === "total_global") {
                  onClose();
                  return;
                }
                const hasDraftData =
                  draft.subtipo.trim() !== "" ||
                  draft.nombre.trim() !== "" ||
                  draft.precio !== "";
                if (hasDraftData && onDiscardDraft) {
                  setIsDiscardModalOpen(true);
                  return;
                }
                if (hasDraftData) {
                  if (!window.confirm("Tienes una pieza sin finalizar. Perderas los cambios si cierras el editor. \u00bfQuieres cerrarlo?")) {
                    return;
                  }
                }
                onClose();
              }}
            >
              <LuX aria-hidden />
            </button>
          </div>
        </header>

        <ol className={d.stepperRail} aria-label="Pasos de la pieza">
          {internalSteps.map((item, index) => {
            const isActive = item.id === desktopStep;
            const isComplete = item.complete && !isActive;
            const stateClass = isActive
              ? d.stepperRailActive
              : isComplete
                ? d.stepperRailComplete
                : d.stepperRailFuture;
            const canNavigate =
              !item.locked &&
              (item.id <= desktopStep ||
                item.complete ||
                (item.id === desktopStep + 1 && canAdvanceFromCurrentStep));
            const connectorComplete = index > 0 && internalSteps[index - 1]?.complete;
            const showValidActiveMark = isActive && item.id === 1 && hasType && !isComplete;

            return (
              <li key={item.id} className={`${d.stepperRailItem} ${stateClass}`}>
                {index > 0 ? (
                  <span
                    className={`${d.stepperRailConnector} ${connectorComplete ? d.stepperRailConnectorComplete : ""}`}
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  className={`${d.stepperRailButton} ${stateClass} ${showValidActiveMark ? d.stepperRailValidActive : ""}`}
                  disabled={!canNavigate}
                  onClick={() => onGoToStep(item.id)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className={d.stepperRailMark} aria-hidden>
                    {isComplete || showValidActiveMark ? <LuCheck /> : item.id}
                  </span>
                  <span className={d.stepperRailLabel}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div
          className={`${s.desktopPieceBody} ${desktopStep === 1 ? d.typeBody : ""} ${desktopStep === 3 ? d.measuresBody : ""} ${desktopStep === 4 ? d.despieceBody : ""}`}
        >
          {desktopStep !== 3 ? <h3 className={s.desktopPieceStepHeading}>{stepHeadings[desktopStep]}</h3> : null}

          {desktopStep === 1 ? (
            <div className={d.typeSection}>
              <div>
                <p className={d.typeSectionLabel}>Frecuentes</p>
                <div className={d.typeGrid}>
                  {frequentTypeOptions.map((option) => {
                    const isActive = draft.subtipo === option.label;
                    const Icon = DESKTOP_TYPE_ICONS[option.label];

                    return (
                      <button
                        key={`freq-${option.label}`}
                        type="button"
                        className={`${d.typeTile} ${d.typeTileFrequent} ${isActive ? d.typeTileActive : ""}`}
                        onClick={() => {
                          onSelectCategoria(option.categoria);
                          onSelectSubtipo(option.label);
                        }}
                      >
                        {Icon ? (
                          <span className={d.typeTileIcon} aria-hidden>
                            <Icon />
                          </span>
                        ) : null}
                        {getVisibleSubtypeLabel(option.label)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {primaryOtherTypeOptions.length > 0 ? (
                <div>
                  <p className={d.typeSectionLabel}>Otros trabajos</p>
                  <div className={d.typeGrid}>
                    {primaryOtherTypeOptions.map((option) => {
                      const isActive = draft.subtipo === option.label;

                      return (
                        <button
                          key={`other-primary-${option.label}`}
                          type="button"
                          className={`${d.typeTile} ${d.typeTileSecondary} ${isActive ? d.typeTileActive : ""}`}
                          onClick={() => {
                            onSelectCategoria(option.categoria);
                            onSelectSubtipo(option.label);
                          }}
                        >
                          {getVisibleSubtypeLabel(option.label)}
                        </button>
                      );
                    })}
                  </div>

                  {shouldShowExpandedOtherTypes && expandedOtherTypeOptions.length > 0 ? (
                    <div className={`${d.typeGrid} ${d.typeGridExpanded}`}>
                      {expandedOtherTypeOptions.map((option) => {
                        const isActive = draft.subtipo === option.label;

                        return (
                          <button
                            key={`other-expanded-${option.label}`}
                            type="button"
                            className={`${d.typeTile} ${d.typeTileSecondary} ${isActive ? d.typeTileActive : ""}`}
                            onClick={() => {
                              onSelectCategoria(option.categoria);
                              onSelectSubtipo(option.label);
                            }}
                          >
                            {getVisibleSubtypeLabel(option.label)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {!shouldShowExpandedOtherTypes && expandedOtherTypeOptions.length > 0 ? (
                    <button
                      type="button"
                      className={d.typeExpandButton}
                      onClick={() => setShowAllOtherTypes(true)}
                    >
                      Ver todos los trabajos
                    </button>
                  ) : null}
                </div>
              ) : null}

              {hasType ? (
                <div className={d.typeContextBand}>
                  <div className={d.typeContextCopy}>
                    <strong>{getVisibleSubtypeLabel(draft.subtipo)}</strong>
                    <span>{typeStepHint}</span>
                  </div>
                  <div className={d.typeContextPreview} aria-hidden>
                    <div dangerouslySetInnerHTML={{ __html: typePreviewSvg }} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {desktopStep === 2 ? (
            <div className={d.systemLayout}>
              <div className={d.systemControls}>
                {showSystemSelection ? (
                  <div className={s.desktopPieceConfigBlock}>
                    <span className={s.stepOneFieldLabel}>Sistema</span>
                    <div className={`${s.desktopChipGrid} ${d.systemChipGrid}`}>
                      {systemOptions.map((option) => {
                        const isActive = draft.sistema === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${s.desktopChoiceChip} ${isActive ? s.desktopChoiceChipActive : ""}`}
                            onClick={() => onSistemaChange(option)}
                          >
                            {isActive ? <LuCheck aria-hidden /> : null}
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div
                  className={
                    isBowWindow && configurationOptions.length > 0
                      ? d.systemTwoCol
                      : undefined
                  }
                >
                  {configurationOptions.length > 0 ? (
                    <div className={s.desktopPieceConfigBlock}>
                      <span className={s.stepOneFieldLabel}>
                        {isBowWindow ? "Configuracion principal" : "Configuracion"}
                      </span>
                      <div className={`${s.desktopChipGrid} ${d.systemChipGrid}`}>
                        {configurationOptions.map((option) => {
                          const isActive = draft.configuracion === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${s.desktopChoiceChip} ${isActive ? s.desktopChoiceChipActive : ""}`}
                              onClick={() => onConfiguracionChange?.(option)}
                            >
                              {isActive ? <LuCheck aria-hidden /> : null}
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {isCorredera && draft.sistema ? (
                    <div className={s.desktopPieceConfigBlock}>
                      <span className={s.stepOneFieldLabel}>Cantidad de hojas</span>
                      <div className={`${s.desktopChipGrid} ${d.systemChipGrid}`}>
                        {SHEET_SCHEME_OPTIONS.map((option) => {
                          const isActive = draft.sheetScheme === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${s.desktopChoiceChip} ${isActive ? s.desktopChoiceChipActive : ""}`}
                              onClick={() => onSheetSchemeChange(option)}
                            >
                              {isActive ? <LuCheck aria-hidden /> : null}
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {isCorredera &&
                draft.sheetScheme &&
                draft.sheetScheme !== "Personalizado" &&
                sheetVariantOptions.length > 0 ? (
                  <div className={s.desktopPieceConfigBlock}>
                    <span className={s.stepOneFieldLabel}>Composicion</span>
                    <div className={d.compositionCardGrid}>
                      {sheetVariantOptions.map((option) => {
                        const isActive = draft.sheetVariant === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${d.compositionCard} ${isActive ? d.compositionCardActive : ""}`}
                            onClick={() => onSheetVariantChange(option)}
                          >
                            <div
                              className={d.compositionCardPreview}
                              aria-hidden
                              dangerouslySetInnerHTML={{
                                __html: getCompositionPreviewSvg(draft, option, "variant"),
                              }}
                            />
                            <p className={d.compositionCardLabel}>
                              {shortenCompositionLabel(option, 36)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {!isCorredera && showSheetScheme && sheetSchemeOptions.length > 0 ? (
                  <div className={s.desktopPieceConfigBlock}>
                    <span className={s.stepOneFieldLabel}>
                      {isBowWindow ? "Composicion" : compositionSectionLabel}
                    </span>
                    {useVisualComposition ? (
                      <div className={d.compositionCardGrid}>
                        {sheetSchemeOptions.map((option) => {
                          const isActive = draft.sheetScheme === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${d.compositionCard} ${isActive ? d.compositionCardActive : ""}`}
                              onClick={() => onSheetSchemeChange(option)}
                            >
                              <div
                                className={d.compositionCardPreview}
                                aria-hidden
                                dangerouslySetInnerHTML={{
                                  __html: getCompositionPreviewSvg(draft, option, "scheme"),
                                }}
                              />
                              <p className={d.compositionCardLabel}>
                                {shortenCompositionLabel(option, 40)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`${s.desktopChipGrid} ${d.systemChipGrid}`}>
                        {sheetSchemeOptions.map((option) => {
                          const isActive = draft.sheetScheme === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${s.desktopChoiceChip} ${isActive ? s.desktopChoiceChipActive : ""}`}
                              onClick={() => onSheetSchemeChange(option)}
                            >
                              {isActive ? <LuCheck aria-hidden /> : null}
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {onGuidedVisualConfigChange &&
                !isFreeValueComponentType(draft.subtipo) &&
                shouldShowGuidedComposerEntry({
                  tipo: draft.subtipo,
                  material: draft.material,
                  catalogCategoria: draft.catalogCategoria,
                  sistema: draft.sistema,
                  sheetScheme: draft.sheetScheme,
                  configuracion: draft.configuracion,
                  guidedVisualConfig: draft.guidedVisualConfig,
                }) ? (
                  <div className={s.desktopPieceConfigBlock}>
                    <span className={s.stepOneFieldLabel}>
                      {isTrabajoPersonalizadoComponentType(draft.subtipo)
                        ? "Constructor a medida"
                        : "Composición personalizada"}
                    </span>
                    <p className={d.systemHelperText}>
                      {isTrabajoPersonalizadoComponentType(draft.subtipo)
                        ? "Arma el trabajo dividiendo módulos. La pauta de corte queda como borrador editable."
                        : draft.sistema === "Personalizado"
                          ? "Arma la ventana dividiendo módulos sobre el marco."
                          : "Divide el marco y asigna el tipo de cada módulo."}
                    </p>
                    <div className={`${s.desktopChipGrid} ${d.systemChipGrid}`}>
                      <button
                        type="button"
                        className={`${s.desktopChoiceChip} ${
                          draft.guidedVisualConfig ? s.desktopChoiceChipActive : ""
                        }`}
                        onClick={() => {
                          setGuidedDraft(
                            ensureGuidedVisualDraft({
                              current: draft.guidedVisualConfig,
                              widthMm: draft.ancho ? Number(draft.ancho) : null,
                              heightMm: draft.alto ? Number(draft.alto) : null,
                            })
                          );
                          setIsGuidedComposerOpen(true);
                        }}
                      >
                        {draft.guidedVisualConfig ? <LuCheck aria-hidden /> : null}
                        {draft.guidedVisualConfig
                          ? "Editar composición"
                          : "Abrir constructor"}
                      </button>
                      {draft.guidedVisualConfig ? (
                        <button
                          type="button"
                          className={s.desktopChoiceChip}
                          onClick={() => {
                            const confirmed = window.confirm(
                              "Se quitará el dibujo del constructor. Puedes volver a abrirlo o elegir otro preset."
                            );
                            if (confirmed) {
                              onGuidedVisualConfigChange(null);
                            }
                          }}
                        >
                          Quitar dibujo
                        </button>
                      ) : null}
                    </div>
                    {draft.guidedVisualConfig ? (
                      <p className={d.systemHelperText}>
                        Composición aplicada ·{" "}
                        {describeGuidedVisualConfig(draft.guidedVisualConfig)}
                      </p>
                    ) : personalizadoPending ? (
                      <p className={d.systemHelperText}>
                        Para continuar: abre el constructor o describe la composición abajo.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {(showCustomSchemeDescription || personalizadoPending) &&
                !draft.guidedVisualConfig ? (
                  <label className={`${s.field} ${s.desktopPieceConfigBlock}`}>
                    <span className={s.stepOneFieldLabel}>Describe la composición</span>
                    <textarea
                      className={`${s.textarea} ${d.systemDescribeInput}`}
                      rows={2}
                      maxLength={FIELD_LIMITS.observaciones}
                      value={draft.customSchemeDescription}
                      onChange={(event) =>
                        onCustomSchemeDescriptionChange(event.target.value)
                      }
                      placeholder="Ej. 2 fijas laterales + 2 moviles centrales"
                    />
                  </label>
                ) : null}
              </div>

              {draft.sistema || draft.subtipo ? (
                <aside className={d.systemPreviewPane} aria-hidden>
                  <div className={d.previewCompact}>
                    <div dangerouslySetInnerHTML={{ __html: largePreviewSvg }} />
                  </div>
                </aside>
              ) : null}
            </div>
          ) : null}

          {desktopStep === 3 ? (
            <div className={d.measuresWorkspace}>
              <div className={d.measuresFormColumn}>
                <section className={d.measuresFormGroup}>
                  <p className={d.measuresSectionTitle}>Medidas</p>
                  <div className={d.measuresFieldGrid}>
                    <label className={d.measureField}>
                      <span className={d.measureFieldLabel}>Ancho (mm)</span>
                      <input
                        className={d.measureInput}
                        inputMode="numeric"
                        value={draft.ancho}
                        onChange={(event) => onAnchoChange(event.target.value)}
                      />
                    </label>
                    <label className={d.measureField}>
                      <span className={d.measureFieldLabel}>Alto (mm)</span>
                      <input
                        className={d.measureInput}
                        inputMode="numeric"
                        value={draft.alto}
                        onChange={(event) => onAltoChange(event.target.value)}
                      />
                    </label>
                    <label className={d.measureField}>
                      <span className={d.measureFieldLabel}>Cantidad</span>
                      <input
                        className={d.measureInput}
                        inputMode="numeric"
                        value={quantityValue}
                        onChange={(event) => onCantidadInputChange(event.target.value)}
                        onBlur={onNormalizeCantidadInput}
                      />
                    </label>
                  </div>
                </section>

                <section className={d.measuresFormGroup}>
                  <p className={d.measuresSectionTitle}>Terminaciones</p>
                  {requiresProfileMaterial || isGlassCatalogItem ? (
                    <div className={d.measuresTerminationsRow}>
                      <div className={`${d.measureField} ${d.measureFieldLineCommercial}`}>
                        <span className={d.measureFieldLabel}>{catalogLabel}</span>
                        <LineTemplatePicker
                          templates={visibleLineTemplates}
                          value={draft.lineTemplateId}
                          onChange={(templateId) => onSelectLineTemplate?.(templateId)}
                          onTemplatePriceUpdated={onTemplatePriceUpdated}
                          mode={isGlassCatalogItem ? "glass" : "profile"}
                          ariaLabel={catalogAriaLabel}
                        />
                      </div>
                      {requiresProfileMaterial ? (
                      <div className={d.colorField}>
                        <span className={d.measureFieldLabel}>Color</span>
                        <div className={d.colorSelectRow}>
                          <span
                            className={d.colorSwatch}
                            style={{ backgroundColor: draft.colorHex }}
                            aria-hidden
                          />
                          <span className={d.colorSelectLabel}>{selectedColorLabel}</span>
                          <LuChevronDown className={d.colorSelectCaret} aria-hidden />
                          <select
                            className={d.colorSelect}
                            value={draft.colorHex}
                            aria-label={`Color: ${selectedColorLabel}`}
                            onChange={(event) => onColorChange(event.target.value)}
                          >
                            {COLOR_OPTIONS.map((option) => (
                              <option key={option.hex} value={option.hex}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={d.measuresTerminationsRowSingle}>
                      <div className={d.colorField}>
                        <span className={d.measureFieldLabel}>Color</span>
                        <div className={d.colorSelectRow}>
                          <span
                            className={d.colorSwatch}
                            style={{ backgroundColor: draft.colorHex }}
                            aria-hidden
                          />
                          <span className={d.colorSelectLabel}>{selectedColorLabel}</span>
                          <LuChevronDown className={d.colorSelectCaret} aria-hidden />
                          <select
                            className={d.colorSelect}
                            value={draft.colorHex}
                            aria-label={`Color: ${selectedColorLabel}`}
                            onChange={(event) => onColorChange(event.target.value)}
                          >
                            {COLOR_OPTIONS.map((option) => (
                              <option key={option.hex} value={option.hex}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isFreeValue && totalGlobalDetailMode ? (
                    <div className={d.despieceReviewLaunch}>
                      <div>
                        <strong>Cubicación y despiece</strong>
                        <p>
                          Resumen técnico ampliado fuera del formulario. No bloquea el presupuesto
                          si la línea aún no tiene reglas.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={d.despieceReviewLaunchButton}
                        onClick={() => onOpenDespieceReview?.()}
                      >
                        Abrir despiece
                      </button>
                    </div>
                  ) : null}

                  <div className={`${d.measureField} ${d.measureFieldFull}`}>
                    <span className={d.measureFieldLabel}>Vidrio</span>
                    {glassRecommendation.recommendedOptions.length > 0 ? (
                      <div className={d.glassRecommendedRow} aria-label="Vidrios recomendados">
                        {glassRecommendation.recommendedOptions.map((option) => {
                          const isActive = draft.vidrio === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${d.glassRecommendationChip} ${isActive ? d.glassRecommendationChipActive : ""}`}
                              onClick={() => onVidrioChange(option)}
                              aria-pressed={isActive}
                              title={repairBrokenText(option)}
                            >
                              <span>{repairBrokenText(option)}</span>
                              <small>
                                {selectedLineTemplateRecommendedGlass === option
                                  ? "Linea"
                                  : draft.subtipo === "Espejo"
                                    ? "Recomendado"
                                    : "Sugerido"}
                              </small>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className={d.glassCatalogField}>
                      <button
                        ref={desktopGlassTriggerRef}
                        type="button"
                        className={d.glassCatalogTrigger}
                        aria-label="Abrir catalogo de vidrios"
                        aria-expanded={isDesktopGlassCatalogOpen}
                        aria-controls={desktopGlassDatalistId}
                        onClick={() => {
                          if (isDesktopGlassCatalogOpen) {
                            setIsDesktopGlassCatalogOpen(false);
                            return;
                          }

                          if (positionDesktopGlassPopover()) {
                            setIsDesktopGlassCatalogOpen(true);
                          }
                        }}
                      >
                        <span>
                          {draft.vidrio ? repairBrokenText(draft.vidrio) : "Elegir vidrio"}
                        </span>
                        <LuChevronDown aria-hidden />
                      </button>

                      {false ? (
                        <div
                          id={desktopGlassDatalistId}
                          className={d.glassCatalogPanel}
                          role="dialog"
                          aria-label="Catalogo de vidrios"
                        >
                          <div className={d.glassCatalogHeader}>
                            <div>
                              <strong>Catálogo de vidrios</strong>
                              <span>{glassRecommendation.reason}</span>
                            </div>
                            <button
                              type="button"
                              className={d.glassCatalogClose}
                              aria-label="Cerrar catalogo de vidrios"
                              onClick={() => setIsDesktopGlassCatalogOpen(false)}
                            >
                              <LuX aria-hidden />
                            </button>
                          </div>

                          <div className={d.glassSearchWrap}>
                            <LuSearch aria-hidden />
                            <input
                              className={d.glassSearchInput}
                              value={desktopGlassSearch}
                              onChange={(event) => setDesktopGlassSearch(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" || !canSaveDesktopGlass) {
                                  return;
                                }

                                event.preventDefault();
                                onCreateCustomGlass(desktopGlassSearch);
                                setDesktopGlassSearch("");
                                setIsDesktopGlassCatalogOpen(false);
                              }}
                              placeholder='Buscar... ej: "inc", "dvh", "temp"'
                            />
                            {desktopGlassSearch ? (
                              <button
                                type="button"
                                className={d.glassSearchClear}
                                aria-label="Limpiar busqueda"
                                onClick={() => setDesktopGlassSearch("")}
                              >
                                <LuX aria-hidden />
                              </button>
                            ) : null}
                          </div>

                          {desktopGlassSearch.trim() ? (
                            <div className={d.glassCatalogChips}>
                              {desktopGlassSearchResults.length > 0 ? (
                                desktopGlassSearchResults.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    className={`${d.glassCatalogChip} ${draft.vidrio === option ? d.glassCatalogChipActive : ""}`}
                                    onClick={() => {
                                      onVidrioChange(option);
                                      setDesktopGlassSearch("");
                                      setIsDesktopGlassCatalogOpen(false);
                                    }}
                                  >
                                    {repairBrokenText(option)}
                                  </button>
                                ))
                              ) : (
                                <span className={d.glassNoResults}>
                                  Sin resultados para {desktopGlassSearch}.
                                </span>
                              )}
                              {canSaveDesktopGlass ? (
                                <button
                                  type="button"
                                  className={`${d.glassCatalogChip} ${d.glassCatalogChipSave}`}
                                  onClick={() => {
                                    onCreateCustomGlass(desktopGlassSearch);
                                    setDesktopGlassSearch("");
                                    setIsDesktopGlassCatalogOpen(false);
                                  }}
                                >
                                  Guardar {desktopGlassSearch.trim()}
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <div className={d.glassCatalogGroups}>
                              {desktopGlassCatalogGroups.map((group) => (
                                <section key={group.grupo} className={d.glassCatalogGroup}>
                                  <h4>{repairBrokenText(group.grupo)}</h4>
                                  <div className={d.glassCatalogChips}>
                                    {group.options.map((option) => {
                                      const isActive = draft.vidrio === option;
                                      const isRecommended = glassRecommendation.recommendedOptions.includes(option);

                                      return (
                                        <button
                                          key={option}
                                          type="button"
                                          className={`${d.glassCatalogChip} ${isRecommended ? d.glassCatalogChipRecommended : ""} ${isActive ? d.glassCatalogChipActive : ""}`}
                                          aria-pressed={isActive}
                                          onClick={() => {
                                            onVidrioChange(option);
                                            setIsDesktopGlassCatalogOpen(false);
                                          }}
                                        >
                                          {repairBrokenText(option)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </section>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              </div>

              <aside className={d.measuresContextColumn} aria-label="Configuracion elegida">
                <p className={d.measuresContextEyebrow}>Configuración elegida</p>
                <h3 className={d.measuresContextTitle}>{pieceTitle}</h3>
                <p className={d.measuresContextSummary}>
                  {configSummary || draft.sistema || "Completa la configuracion en el paso anterior."}
                </p>
                <div className={d.measuresContextPreview} aria-hidden>
                  <div dangerouslySetInnerHTML={{ __html: measuresPreviewSvg }} />
                </div>
                <div className={d.areaResult} aria-live="polite">
                  <span className={d.areaResultLabel}>Área calculada</span>
                  <strong className={d.areaResultValue}>
                    {areaM2.toLocaleString("es-CL", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    m²
                  </strong>
                  <span className={d.areaResultHint}>Calculada segun ancho × alto</span>
                </div>
                {measuresBarUsage ? (
                  <div className={d.measuresBarsRail} aria-label="Uso de barras">
                    <div className={d.measuresBarsRailHead}>
                      <span className={d.areaResultLabel}>Uso de barras</span>
                      <strong>
                        {measuresBarUsage.bars.length} barra
                        {measuresBarUsage.bars.length === 1 ? "" : "s"} · sobra{" "}
                        {formatCubicationMm(measuresBarUsage.totalWasteMm)}
                      </strong>
                    </div>
                    <ul className={d.measuresBarsRailList}>
                      {measuresBarUsage.bars.slice(0, 4).map((bar) => {
                        const barLengthMm = bar.usedMm + bar.wasteMm;
                        const usedPct =
                          barLengthMm > 0
                            ? Math.min(100, Math.round((bar.usedMm / barLengthMm) * 100))
                            : 0;
                        return (
                          <li key={bar.index} className={d.measuresBarsRailItem}>
                            <div className={d.measuresBarsRailItemMeta}>
                              <span>Barra {bar.index}</span>
                              <span>
                                {formatCubicationMm(bar.usedMm)} · sobra{" "}
                                {formatCubicationMm(bar.wasteMm)}
                              </span>
                            </div>
                            <div
                              className={d.measuresBarsRailTrack}
                              aria-hidden
                            >
                              <span
                                className={d.measuresBarsRailFill}
                                style={{ width: `${usedPct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {measuresBarUsage.bars.length > 4 ? (
                      <p className={d.measuresBarsRailMore}>
                        + {measuresBarUsage.bars.length - 4} barras más en la pauta
                      </p>
                    ) : (
                      <p className={d.measuresBarsRailHint}>
                        {personalizadoAssistMode
                          ? "Según tu borrador manual. No es pauta automática."
                          : "Continúa al paso de despiece para revisar la pauta de cortes."}
                      </p>
                    )}
                  </div>
                ) : null}
              </aside>
            </div>
          ) : null}

          {!totalGlobalDetailMode && desktopStep === 4 ? (
            <div className={d.despieceWorkspace}>
              {!isFreeValue ? (
                <>
                  <div className={d.despieceReviewLaunch}>
                    <div>
                      <strong>Revisión de despiece</strong>
                      <p>
                        Revisa cortes, barras y sobrantes. Los ajustes manuales solo afectan
                        esta cotización.
                      </p>
                    </div>
                    {onOpenDespieceReview ? (
                      <button
                        type="button"
                        className={d.despieceReviewLaunchButton}
                        onClick={() => onOpenDespieceReview()}
                      >
                        Abrir despiece
                      </button>
                    ) : null}
                  </div>
                  <PautaCubicacionPanel
                    componentForm={{
                      ancho: draft.ancho,
                      alto: draft.alto,
                      cantidad: getQuantityInputValue(draft) || "1",
                      lineTemplateId: draft.lineTemplateId,
                      tipo: draft.subtipo,
                      sistema: draft.sistema,
                      fabricationRecipeId: draft.fabricationRecipeId,
                      fabricacionTipologia: draft.fabricacionTipologia,
                      fabricacionHojas: draft.fabricacionHojas,
                      fabricacionModulos: draft.fabricacionModulos,
                      fabricacionApertura: draft.fabricacionApertura,
                      fabricacionHerraje: draft.fabricacionHerraje,
                      fabricacionVariante: draft.fabricacionVariante,
                      fabricacionSnapshot: draft.fabricacionSnapshot,
                      cubicationSnapshot: draft.cubicationSnapshot,
                    }}
                    selectedTemplate={selectedLineTemplate}
                    onCubicationSnapshotChange={(value) =>
                      onCubicationSnapshotChange?.(value)
                    }
                    onFabricationRecipeIdChange={onFabricationRecipeIdChange}
                    onFabricacionSnapshotChange={onFabricacionSnapshotChange}
                    onFabricacionContextoChange={onFabricacionContextoChange}
                    lineSelectionHint="medidas"
                    showBarUsageInline
                    personalizadoAssistMode={personalizadoAssistMode}
                    layout="workspace"
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {!totalGlobalDetailMode && desktopStep === 5 ? (
            <div className={d.priceStep}>
              <p className={d.priceMethodTitle}>¿Como quieres definir el valor?</p>
              <div className={d.priceModeSegmented} role="tablist" aria-label="Modo de precio">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isLineM2Pricing}
                  className={`${d.priceModeSegmentedButton} ${
                    isLineM2Pricing ? d.priceModeSegmentedButtonActive : ""
                  }`}
                  onClick={() => onPriceInputModeChange("line_m2")}
                >
                  Calcular por m²
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isUnitDirectPricing}
                  className={`${d.priceModeSegmentedButton} ${
                    isUnitDirectPricing ? d.priceModeSegmentedButtonActive : ""
                  }`}
                  onClick={() => onPriceInputModeChange("unit_direct")}
                >
                  Valor por unidad
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isPieceTotalPricing}
                  className={`${d.priceModeSegmentedButton} ${
                    isPieceTotalPricing ? d.priceModeSegmentedButtonActive : ""
                  }`}
                  onClick={() => onPriceInputModeChange("piece_total")}
                >
                  Valor total de la pieza
                </button>
              </div>

              {isLineM2Pricing ? (
                <>
                  {selectedLineTemplate && lineTemplateNeedsCommercialPrice(selectedLineTemplate) ? (
                    <div style={{ margin: "0 0 8px", padding: "8px 12px", borderRadius: "8px", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: "0.82rem" }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        La línea <strong>{selectedLineTemplate.nombre}</strong> no tiene precio configurado.
                      </p>
                      <p style={{ margin: "4px 0 8px", fontWeight: 500 }}>
                        Agrégalo ahora. Queda guardado para futuras cotizaciones.
                      </p>
                      <button
                        type="button"
                        onClick={() => setPriceEditorTemplate(selectedLineTemplate)}
                        style={{ minHeight: 36, padding: "0 12px", borderRadius: 8, border: "1px solid #fde68a", background: "#fff", color: "#92400e", fontWeight: 700, cursor: "pointer" }}
                      >
                        Agregar precio ahora
                      </button>
                    </div>
                  ) : null}
                  <div className={d.priceFieldsGrid}>
                    <label className={d.measureField}>
                      <span className={d.measureFieldLabel}>Precio por m²</span>
                      <input
                        className={d.measureInput}
                        inputMode="numeric"
                        value={formatCurrencyInput(draft.precioPorM2)}
                        onChange={(event) => onPrecioPorM2Change(event.target.value)}
                      />
                    </label>
                    <label className={d.measureField}>
                      <span className={d.measureFieldLabel}>Minimo cobrable</span>
                      <input
                        className={d.measureInput}
                        inputMode="numeric"
                        value={formatCurrencyInput(draft.minimoCobrable)}
                        onChange={(event) => onMinimoCobrableChange(event.target.value)}
                      />
                    </label>
                    <label className={d.measureField}>
                      <span className={d.measureFieldLabel}>Redondeo</span>
                      <input
                        className={d.measureInput}
                        inputMode="numeric"
                        value={formatCurrencyInput(draft.redondeoPrecio)}
                        onChange={(event) => onRedondeoPrecioChange(event.target.value)}
                      />
                    </label>
                  </div>

                  {linePricingSummary.areaM2 !== null && moneyToNumber(draft.precioPorM2) > 0 ? (
                    <div className={d.priceBreakdown} aria-live="polite">
                      <div className={d.priceBreakdownRow}>
                        <span>Area</span>
                        <strong>
                          {linePricingSummary.areaM2.toLocaleString("es-CL", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          m²
                        </strong>
                      </div>
                      <div className={d.priceBreakdownRow}>
                        <span>Calculo base</span>
                        <strong>
                          {linePricingSummary.areaM2.toLocaleString("es-CL", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          m² × {CLP(moneyToNumber(draft.precioPorM2))} ={" "}
                          {CLP(linePricingSummary.precioBaseUnitario ?? 0)}
                        </strong>
                      </div>
                      <div className={d.priceBreakdownRow}>
                        <span>Minimo cobrable</span>
                        <strong>
                          {linePricingSummary.minimoAplicado
                            ? CLP(linePricingSummary.minimoAplicado)
                            : "No aplica"}
                        </strong>
                      </div>
                      <div className={d.priceBreakdownRow}>
                        <span>Redondeo</span>
                        <strong>
                          {linePricingSummary.redondeoPrecio
                            ? CLP(linePricingSummary.redondeoPrecio)
                            : "Sin redondeo"}
                        </strong>
                      </div>
                      <div className={d.priceBreakdownRow}>
                        <span>Valor unitario sugerido</span>
                        <strong>{CLP(unitPrice)}</strong>
                      </div>
                      <div className={d.priceBreakdownRow}>
                        <span>Cantidad</span>
                        <strong>{quantityForPrice}</strong>
                      </div>
                      <div className={d.priceBreakdownRow}>
                        <span>Subtotal de la pieza</span>
                        <strong>{CLP(pieceSubtotal)}</strong>
                      </div>
                    </div>
                  ) : (
                    <p className={d.priceBreakdownHint}>
                      Completa medidas y precio por m² para ver el calculo comercial.
                    </p>
                  )}

                  {!showCustomizeUnitPrice ? (
                    <button
                      type="button"
                      className={d.priceCustomizeButton}
                      onClick={() => onToggleCustomizeUnitPrice(true)}
                    >
                      Personalizar valor unitario
                    </button>
                  ) : (
                    <>
                      <span className={d.priceAdjustedBadge}>Precio ajustado para esta pieza</span>
                      <label className={d.measureField}>
                        <span className={d.measureFieldLabel}>Valor unitario personalizado</span>
                        <input
                          className={d.measureInput}
                          inputMode="numeric"
                          value={formatCurrencyInput(draft.precio)}
                          onChange={(event) => onPrecioChange(event.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className={d.priceCustomizeButton}
                        onClick={() => onToggleCustomizeUnitPrice(false)}
                      >
                        Volver al calculo automatico
                      </button>
                    </>
                  )}
                </>
              ) : isUnitDirectPricing ? (
                <>
                  <label className={d.measureField}>
                    <span className={d.measureFieldLabel}>Valor por unidad</span>
                    <input
                      className={d.measureInput}
                      inputMode="numeric"
                      value={formatCurrencyInput(draft.precio)}
                      onChange={(event) => onPrecioChange(event.target.value)}
                    />
                  </label>
                  <div className={d.priceDirectSummary} aria-live="polite">
                    <div className={d.priceBreakdownRow}>
                      <span>Cantidad</span>
                      <strong>{quantityForPrice}</strong>
                    </div>
                    <div className={d.priceBreakdownRow}>
                      <span>Subtotal de la pieza</span>
                      <strong>{CLP(pieceSubtotal)}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <label className={d.measureField}>
                    <span className={d.measureFieldLabel}>Valor total de las unidades</span>
                    <input
                      className={d.measureInput}
                      inputMode="numeric"
                      value={formatCurrencyInput(draft.precio)}
                      onChange={(event) => onPrecioChange(event.target.value)}
                    />
                  </label>
                  <div className={d.priceDirectSummary} aria-live="polite">
                    <div className={d.priceBreakdownRow}>
                      <span>Cantidad</span>
                      <strong>{quantityForPrice}</strong>
                    </div>
                    <div className={d.priceBreakdownRow}>
                      <span>Valor unitario referencial</span>
                      <strong>{CLP(Math.round(referentialUnitPrice))}</strong>
                    </div>
                    <div className={d.priceBreakdownRow}>
                      <span>Subtotal de la pieza</span>
                      <strong>{CLP(pieceSubtotal)}</strong>
                    </div>
                  </div>
                </>
              )}

              <div className={d.priceValueStrip}>
                <span>Valor de esta pieza</span>
                <strong>{CLP(pieceSubtotal)}</strong>
              </div>

              <label className={s.field}>
                <span>Nota comercial breve</span>
                <textarea
                  className={s.textarea}
                  rows={2}
                  maxLength={FIELD_LIMITS.observaciones}
                  value={draft.descripcion}
                  onChange={(event) => onDescripcionChange(event.target.value)}
                  placeholder="Ej. Incluye instalacion y sellado"
                />
              </label>
            </div>
          ) : null}
        </div>

        <footer className={s.desktopPieceFooter}>
          <div className={d.footerStatusStack}>
            {desktopStep === 1 ? (
              <>
                <strong className={d.footerStatusStep}>Paso 1 de {totalGlobalDetailMode ? 3 : 5}</strong>
                <span className={d.footerStatusHint}>{desktopStepFooterHint[1]}</span>
              </>
            ) : (
              <span className={s.desktopPieceFooterStatus}>
                {desktopStep < maxDesktopStep
                  ? `Paso ${desktopStep} de ${totalGlobalDetailMode ? 3 : 5} · ${desktopStepFooterHint[desktopStep]}`
                  : canFinishPiece
                    ? `Paso ${maxDesktopStep} de ${totalGlobalDetailMode ? 3 : 5} · ${
                        totalGlobalDetailMode
                          ? "Listo para agregar el detalle al presupuesto."
                          : "Listo para finalizar la pieza."
                      }`
                    : `Paso ${maxDesktopStep} de ${totalGlobalDetailMode ? 3 : 5} · ${finishBlockedHint}`}
              </span>
            )}
            {globalError ? (
              <div className={s.inlineError} role="alert">
                {globalError}
              </div>
            ) : null}
          </div>
          <div className={s.desktopPieceFooterActions}>
            {desktopStep > 1 ? (
              <button type="button" className={s.btnGhost} onClick={() => onGoToStep((desktopStep - 1) as PasoDosGrupoPaso)}>
                Volver
              </button>
            ) : null}
            {desktopStep < maxDesktopStep ? (
              <button
                type="button"
                className={s.btnPrimary}
                disabled={!canAdvanceFromCurrentStep}
                onClick={() => onGoToStep(isFreeType && desktopStep === 1 ? 5 : ((desktopStep + 1) as PasoDosGrupoPaso))}
              >
                {desktopStepCta[desktopStep]} <LuArrowRight aria-hidden />
              </button>
            ) : (
              <button type="button" className={s.btnPrimary} disabled={!canFinishPiece} onClick={onConfirm}>
                {desktopStepCta[desktopStep]}
              </button>
            )}
          </div>
        </footer>

        {isDiscardModalOpen ? (
          <div
            className={s.stepTwoConfirmOverlay}
            onClick={() => setIsDiscardModalOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.nativeEvent.stopImmediatePropagation();
                setIsDiscardModalOpen(false);
              }
            }}
            role="presentation"
          >
            <section
              aria-labelledby="descartar-borrador-titulo"
              aria-modal="true"
              className={s.stepTwoConfirmDialog}
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className={s.stepTwoConfirmTitle} id="descartar-borrador-titulo">
                ¿Descartar esta pieza?
              </h2>
              <p className={s.stepTwoConfirmText}>
                Perderas los cambios de esta pieza sin finalizar. Las piezas ya agregadas no se eliminaran.
              </p>
              <div className={s.stepTwoConfirmActions}>
                <button className={s.btnGhost} type="button" onClick={() => setIsDiscardModalOpen(false)}>
                  Seguir editando
                </button>
                <button
                  className={s.btnPrimary}
                  type="button"
                  onClick={() => {
                    if (onDiscardDraft) {
                      onDiscardDraft();
                    } else {
                      onClose();
                    }
                  }}
                >
                  Descartar pieza
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
      {desktopGlassPopover}
      {guidedDraft && onGuidedVisualConfigChange ? (
        <GuidedVisualComposer
          open={isGuidedComposerOpen}
          config={guidedDraft}
          colorHex={draft.colorHex}
          pieceTitle={draft.subtipo || draft.nombre || "Pieza"}
          onChange={setGuidedDraft}
          onApply={(next) => {
            onGuidedVisualConfigChange(next);
            setGuidedDraft(next);
            setIsGuidedComposerOpen(false);
          }}
          onClose={() => setIsGuidedComposerOpen(false)}
          onClear={
            draft.guidedVisualConfig
              ? () => {
                  onGuidedVisualConfigChange(null);
                  setIsGuidedComposerOpen(false);
                }
              : undefined
          }
        />
      ) : null}
      </>
    );
  }

  const sheet = (
    <section
        aria-labelledby="paso-dos-grupo-title"
        aria-modal={isOverlay ? "true" : undefined}
        className={`${s.groupSheet} ${!isOverlay ? s.groupSheetEmbedded : ""}`}
        role={isOverlay ? "dialog" : "region"}
        onClick={isOverlay ? (event) => event.stopPropagation() : undefined}
      >
        <div className={s.groupSheetHandle} />

        <header className={s.groupSheetHeader}>
          <div className={s.groupSheetHeaderCopy}>
            {!isOverlay && isSingleStepFreeTotal && onRequestSwitchMode ? (
              <button
                type="button"
                className={s.desktopPieceInlineModeSwitch}
                onClick={onRequestSwitchMode}
              >
                {quotePricingMode === "total_global" ? "Por total" : "Por componentes"} · Cambiar
              </button>
            ) : null}
            {isOverlay ? <span className={s.cardLabel}>{stepCopy.eyebrow}</span> : null}
            <h2 className={s.groupSheetTitle} id="paso-dos-grupo-title">
              {sheetTitle}
            </h2>
            <p className={s.groupSheetDescription}>{stepDescription}</p>
          </div>

          <button
            aria-label="Cerrar flujo de grupo"
            className={s.groupSheetCloseButton}
            onClick={() => {
              if (!isOverlay && isSingleStepFreeTotal) {
                const hasNotebookData =
                  draft.nombre.trim() !== "" ||
                  draft.descripcion.trim() !== "" ||
                  (quotePricingMode === "total_global" && (totalClienteManual ?? 0) > 0);
                if (hasNotebookData) {
                  setIsDiscardModalOpen(true);
                  return;
                }
                if (onDiscardDraft) {
                  onDiscardDraft();
                  return;
                }
              }
              onClose();
            }}
            type="button"
          >
            <LuX aria-hidden />
          </button>
        </header>

        {isSingleStepFreeTotal ? null : isOverlay ? (
          <div className={s.groupSheetProgress} aria-hidden="true">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <span
                key={stepNumber}
                className={`${s.groupSheetProgressStep} ${
                  stepNumber <= paso ? s.groupSheetProgressStepActive : ""
                }`}
              />
            ))}
          </div>
        ) : (
          <ol
            aria-label="Progreso del asistente"
            className={s.groupSheetProgressDesktop}
          >
            {EMBEDDED_PROGRESS_STEPS.map((step) => {
              const isActive = step.paso === paso;
              const isComplete = step.paso < paso;

              return (
                <li
                  key={step.paso}
                  aria-current={isActive ? "step" : undefined}
                  className={`${s.groupSheetProgressDesktopStep} ${
                    isActive
                      ? s.groupSheetProgressDesktopStepActive
                      : isComplete
                        ? s.groupSheetProgressDesktopStepComplete
                        : ""
                  }`}
                >
                  <span className={s.groupSheetProgressDesktopStepNumber}>{step.paso}</span>
                  <span className={s.groupSheetProgressDesktopStepLabel}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className={s.groupSheetBody}>
          {paso === 1 ? (
              <div className={s.groupSheetOptionGrid}>
                {visibleTypeGroups.map((group) => {
                  const isSingle = group.items.length === 1;
                  const isActive = !isSingle && draft.categoria === group.title;
                  const handleClick = () => {
                    onSelectCategoria(group.title);
                    if (isSingle) {
                      onSelectSubtipo(group.items[0]);
                    }
                  };

                  return (
                  <button
                    key={group.title}
                    className={`${s.groupSheetOptionButton} ${
                      isActive ? s.groupSheetOptionButtonActive : ""
                    }`}
                    onClick={handleClick}
                    type="button"
                  >
                    <strong>{group.title}</strong>
                    <span>{group.items.slice(0, 2).map(getVisibleSubtypeLabel).join(", ")}</span>
                  </button>
                  );
                })}
              </div>
          ) : null}

          {paso === 2 ? (
            <div className={s.groupSheetOptionGrid}>
              {subtypeOptions.map((subtipo) => (
                <button
                  key={subtipo}
                  className={`${s.groupSheetOptionButton} ${
                    draft.subtipo === subtipo ? s.groupSheetOptionButtonActive : ""
                  }`}
                  onClick={() => onSelectSubtipo(subtipo)}
                  type="button"
                >
                  <strong>{getVisibleSubtypeLabel(subtipo)}</strong>
                  <span>{isFreeValueComponentType(subtipo) ? "Libre" : draft.categoria}</span>
                </button>
              ))}
            </div>
          ) : null}

          {paso === 3 ? (
            <div className={s.groupSheetStepBlock}>
              <div className={s.groupSheetQuestion}>Cuantas unidades?</div>

              <div className={s.batchCountRow}>
                {[1, 2, 3, 4].map((cantidad) => (
                  <button
                    key={cantidad}
                    className={`${s.batchCountButton} ${
                      !draft.usaCantidadPersonalizada && draft.cantidad === cantidad
                        ? s.batchCountButtonActive
                        : ""
                    }`}
                    onClick={() => onSelectCantidad(cantidad)}
                    type="button"
                  >
                    {cantidad}
                  </button>
                ))}

                <button
                  className={`${s.batchCountButton} ${
                    draft.usaCantidadPersonalizada ? s.batchCountButtonActive : ""
                  }`}
                  onClick={onEnableCustomQuantity}
                  type="button"
                >
                  +
                </button>
              </div>

              {draft.usaCantidadPersonalizada ? (
                <div className={s.groupSheetInlineField}>
                  <label className={s.label} htmlFor="grupo-cantidad-personalizada">
                    Cantidad personalizada
                  </label>
                  <input
                    className={`${s.input} ${s.groupSheetQuantityInput}`}
                    id="grupo-cantidad-personalizada"
                    inputMode="numeric"
                    min="1"
                    pattern="[0-9]*"
                    type="text"
                    value={draft.cantidadPersonalizada}
                    onChange={(event) => onCustomQuantityChange(event.target.value)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {paso === 4 ? (
            <div className={s.groupSheetConfigStack}>
              {isFreeValue ? (
                <>
                  <section className={s.formSection}>
                    <div className={s.formSectionHead}>
                      <span className={s.formSectionEyebrow}>
                        {quotePricingMode === "total_global" && isSingleStepFreeTotal
                          ? "Trabajo principal"
                          : "Item libre con valor"}
                      </span>
                      <strong>
                        {quotePricingMode === "total_global"
                          ? isSingleStepFreeTotal
                            ? "Define el alcance general y el precio final del trabajo"
                            : "Redacta trabajo principal, detalles incluidos y precio final"
                          : "Redacta el trabajo y define el valor"}
                      </strong>
                    </div>
                    <label className={s.field}>
                      <span className={s.label}>Nombre del item</span>
                      <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Ej: Mantencion de ventanas"
                        value={draft.nombre}
                        onChange={(event) => onNombreChange(event.target.value)}
                      />
                    </label>
                    <label className={s.field}>
                      <span className={s.label}>Descripcion para cliente</span>
                      {freeValueGuidance ? (
                        <div className={s.stepTwoMobileGuidanceBox}>
                          <strong>{draft.nombre || draft.subtipo}</strong>
                          <span>{freeValueGuidance}</span>
                        </div>
                      ) : null}
                      <textarea
                        className={s.textarea}
                        maxLength={360}
                        placeholder="Ej: Mantencion de 5 ventanas existentes, ajuste de corredera y limpieza de rieles."
                        rows={3}
                        value={draft.descripcion}
                        onChange={(event) => onDescripcionChange(event.target.value)}
                      />
                    </label>
                    <div className={s.suggestionChips}>
                      <span className={s.suggestionChipsLabel}>Sugerencias:</span>
                      {["Cambio de vidrio", "Mantencion", "Sellado", "Reparacion shower", "Otro"].map(
                        (chip) => (
                          <button
                            key={chip}
                            type="button"
                            className={`${s.suggestionChip} ${
                              draft.nombre === chip ? s.suggestionChipActive : ""
                            }`}
                            onClick={() => onNombreChange(chip)}
                          >
                            {chip}
                          </button>
                        )
                      )}
                    </div>
                    {quotePricingMode === "total_global" && !isSingleStepFreeTotal ? (
                      <div className={s.field}>
                        <span className={s.label}>Cobro del detalle</span>
                        <button
                          type="button"
                          className={draft.cobraPrecioSeparado ? s.btnGhost : s.btnPrimary}
                          onClick={() => onCobraPrecioSeparadoChange(!draft.cobraPrecioSeparado)}
                        >
                          {draft.cobraPrecioSeparado
                            ? "Incluir dentro del precio final"
                            : "Sumar este detalle como extra"}
                        </button>
                        <small className={s.helpText}>
                          {draft.cobraPrecioSeparado
                            ? "Este monto se sumara aparte al precio final."
                            : "Este detalle queda incluido dentro del precio final."}
                        </small>
                      </div>
                    ) : null}

                    {shouldShowFreeValuePrice ? (
                      <>
                        <label className={s.field}>
                          <span className={s.label}>Valor a cobrar</span>
                          <input
                            className={s.input}
                            inputMode="numeric"
                            placeholder="Ej: 120.000"
                            value={draft.precio}
                            onChange={(event) => onPrecioChange(event.target.value)}
                          />
                          <small className={s.helpText}>
                            Este valor seguira la configuracion de IVA de la cotizacion.
                          </small>
                        </label>
                      </>
                    ) : null}

                    {quotePricingMode === "total_global" && isSingleStepFreeTotal ? (
                      <section className={s.formSection}>
                        <div className={s.formSectionHead}>
                          <span className={s.formSectionEyebrow}>Detalles incluidos</span>
                          <strong>Componentes y notas que quedan dentro de este trabajo.</strong>
                        </div>

                        {nestedDetailItems.length > 0 ? (
                          <div className={s.cuadernoNestedList}>
                            {nestedDetailItems.map((item) => {
                              const measures =
                                item.ancho && item.alto
                                  ? `${Math.round(item.ancho)} × ${Math.round(item.alto)} mm`
                                  : null;
                              const material = decodeCotizacionItemPresentationMeta(
                                item.observaciones
                              ).material;

                              return (
                                <article key={item.id} className={s.cuadernoNestedCard}>
                                  <div className={s.cuadernoNestedCardMain}>
                                    <span className={s.cuadernoNestedCode}>{item.codigo}</span>
                                    <strong className={s.cuadernoNestedTitle}>
                                      {item.nombre || item.tipo}
                                    </strong>
                                    <p className={s.cuadernoNestedMeta}>
                                      {[item.tipo, material, measures, item.cantidad > 1 ? `×${item.cantidad}` : null]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  </div>
                                  <div className={s.cuadernoNestedActions}>
                                    {onEditNestedDetailItem ? (
                                      <button
                                        type="button"
                                        className={s.iconButton}
                                        aria-label={`Editar ${item.codigo}`}
                                        onClick={() => onEditNestedDetailItem(item.id)}
                                      >
                                        <LuPencil aria-hidden size={14} />
                                      </button>
                                    ) : null}
                                    {onRemoveNestedDetailItem ? (
                                      <button
                                        type="button"
                                        className={s.iconButton}
                                        aria-label={`Eliminar ${item.codigo}`}
                                        onClick={() => onRemoveNestedDetailItem(item.id)}
                                      >
                                        <LuTrash2 aria-hidden size={14} />
                                      </button>
                                    ) : null}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        ) : (
                          <p className={s.cuadernoNestedEmpty}>
                            Aun no hay componentes dentro de este trabajo.
                          </p>
                        )}

                        {draft.alcanceDetalles.map((detalle) => (
                          <div key={detalle.id} className={s.alcanceDetalleCard}>
                            <div className={s.alcanceDetalleHeader}>
                              <span className={s.alcanceDetalleIndex}>
                                {detalle.nombre.trim() || "Detalle"}
                              </span>
                              <button
                                type="button"
                                className={s.iconButton}
                                onClick={() => onRemoveAlcanceDetalle(detalle.id)}
                                aria-label="Eliminar detalle"
                              >
                                <LuX aria-hidden size={14} />
                              </button>
                            </div>
                            <label className={s.field}>
                              <span className={s.label}>Nombre</span>
                              <input
                                className={s.input}
                                placeholder="Ej: Sellado perimetral"
                                value={detalle.nombre}
                                onChange={(e) =>
                                  onUpdateAlcanceDetalle(detalle.id, "nombre", e.target.value)
                                }
                              />
                            </label>
                            <label className={s.field}>
                              <span className={s.label}>Descripcion</span>
                              <input
                                className={s.input}
                                placeholder="Ej: Sellado interior y exterior"
                                value={detalle.descripcion}
                                onChange={(e) =>
                                  onUpdateAlcanceDetalle(
                                    detalle.id,
                                    "descripcion",
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                          </div>
                        ))}

                        <div className={s.formGrid2}>
                          <button
                            type="button"
                            className={s.btnGhost}
                            onClick={() => onAddAlcanceDetalle()}
                          >
                            + Agregar detalle
                          </button>
                          {onOpenComponentCreator ? (
                            <button
                              type="button"
                              className={s.btnPrimary}
                              onClick={onOpenComponentCreator}
                            >
                              + Agregar componentes
                            </button>
                          ) : null}
                        </div>
                      </section>
                    ) : quotePricingMode === "total_global" ? (
                      <section className={s.formSection}>
                        <div className={s.formSectionHead}>
                          <span className={s.formSectionEyebrow}>Detalles incluidos</span>
                          <strong>Manual para texto libre. Estructurado para croquis en PDF.</strong>
                        </div>

                        {draft.alcanceDetalles.map((detalle) => (
                          <div key={detalle.id} className={s.alcanceDetalleCard}>
                            <div className={s.alcanceDetalleHeader}>
                              <span className={s.alcanceDetalleIndex}>
                                {detalle.nombre.trim() || "Detalle"}
                              </span>
                              <button
                                type="button"
                                className={s.iconButton}
                                onClick={() => onRemoveAlcanceDetalle(detalle.id)}
                                aria-label="Eliminar detalle"
                              >
                                <LuX aria-hidden size={14} />
                              </button>
                            </div>
                            <div className={s.stepTwoMobileChoiceChips}>
                              <button
                                type="button"
                                className={`${s.stepTwoMobileChoiceChip} ${
                                  detalle.tipo === "manual" ? s.stepTwoMobileChoiceChipActive : ""
                                }`}
                                onClick={() => onUpdateAlcanceDetalle(detalle.id, "tipo", "manual")}
                              >
                                Manual
                              </button>
                              <button
                                type="button"
                                className={`${s.stepTwoMobileChoiceChip} ${
                                  detalle.tipo === "estructurado" ? s.stepTwoMobileChoiceChipActive : ""
                                }`}
                                onClick={() =>
                                  onUpdateAlcanceDetalle(detalle.id, "tipo", "estructurado")
                                }
                              >
                                Estructurado
                              </button>
                            </div>
                            {detalle.tipo === "estructurado" ? (
                              <>
                                <label className={s.field}>
                                  <span className={s.label}>Componente</span>
                                  <div className={s.selectWrap}>
                                    <select
                                      className={s.input}
                                      value={detalle.subtipo || ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS[0]}
                                      onChange={(event) =>
                                        onUpdateAlcanceDetalle(
                                          detalle.id,
                                          "subtipo",
                                          event.target.value
                                        )
                                      }
                                    >
                                      {ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </label>
                                <div className={s.alcanceDetalleGrid}>
                                  <label className={s.field}>
                                    <span className={s.label}>Cantidad</span>
                                    <input
                                      className={s.input}
                                      inputMode="numeric"
                                      placeholder="1"
                                      value={detalle.cantidad}
                                      onChange={(e) =>
                                        onUpdateAlcanceDetalle(
                                          detalle.id,
                                          "cantidad",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                  <label className={s.field}>
                                    <span className={s.label}>Ancho (mm)</span>
                                    <input
                                      className={s.input}
                                      inputMode="numeric"
                                      placeholder="1500"
                                      value={detalle.ancho}
                                      onChange={(e) =>
                                        onUpdateAlcanceDetalle(
                                          detalle.id,
                                          "ancho",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                  <label className={s.field}>
                                    <span className={s.label}>Alto (mm)</span>
                                    <input
                                      className={s.input}
                                      inputMode="numeric"
                                      placeholder="2000"
                                      value={detalle.alto}
                                      onChange={(e) =>
                                        onUpdateAlcanceDetalle(
                                          detalle.id,
                                          "alto",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                </div>
                                <label className={s.field}>
                                  <span className={s.label}>Etiqueta visible</span>
                                  <input
                                    className={s.input}
                                    placeholder="Ej: 3 ventanas correderas 1500 x 2000"
                                    value={detalle.nombre}
                                    onChange={(e) =>
                                      onUpdateAlcanceDetalle(detalle.id, "nombre", e.target.value)
                                    }
                                  />
                                </label>
                                <label className={s.field}>
                                  <span className={s.label}>Nota opcional</span>
                                  <input
                                    className={s.input}
                                    placeholder="Ej: Con retiro de marco existente"
                                    value={detalle.descripcion}
                                    onChange={(e) =>
                                      onUpdateAlcanceDetalle(
                                        detalle.id,
                                        "descripcion",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              </>
                            ) : (
                              <>
                                <label className={s.field}>
                                  <span className={s.label}>Nombre</span>
                                  <input
                                    className={s.input}
                                    placeholder="Ej: Sellado perimetral"
                                    value={detalle.nombre}
                                    onChange={(e) =>
                                      onUpdateAlcanceDetalle(detalle.id, "nombre", e.target.value)
                                    }
                                  />
                                </label>
                                <label className={s.field}>
                                  <span className={s.label}>Descripcion</span>
                                  <input
                                    className={s.input}
                                    placeholder="Ej: Sellado interior y exterior"
                                    value={detalle.descripcion}
                                    onChange={(e) =>
                                      onUpdateAlcanceDetalle(
                                        detalle.id,
                                        "descripcion",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          className={s.btnGhost}
                          onClick={() => onAddAlcanceDetalle()}
                        >
                          + Agregar detalle
                        </button>
                      </section>
                    ) : null}

                    {quotePricingMode === "total_global" ? (
                      <section className={s.formSection}>
                        <div className={s.formSectionHead}>
                          <span className={s.formSectionEyebrow}>Valor final</span>
                          <strong>Define valor final en esta misma pantalla</strong>
                        </div>
                        <label className={s.field}>
                          <span className={s.label}>Valor final</span>
                          <input
                            className={`${s.input} ${s.stepTwoMobileFinalPriceInput}`}
                            inputMode="numeric"
                            placeholder="Ej: 600.000"
                            value={globalTotalInputValue}
                            onChange={(event) => onGlobalTotalClienteChange(event.target.value)}
                          />
                        </label>
                      </section>
                    ) : null}

                    {quotePricingMode === "total_global" ? (
                      <section className={s.formSection}>
                        {!isInternalObservationOpen ? (
                          <button
                            type="button"
                            className={s.stepTwoMobileSecondaryLink}
                            onClick={() => setIsInternalObservationOpen(true)}
                          >
                            + Agregar observación interna
                          </button>
                        ) : (
                          <label className={s.field}>
                            <div className={s.stepTwoMobileBlockHeaderInline}>
                              <span className={s.label}>Observación interna</span>
                              <button
                                type="button"
                                className={s.stepTwoMobileSecondaryLink}
                                onClick={() => setIsInternalObservationOpen(false)}
                              >
                                Ocultar
                              </button>
                            </div>
                            <textarea
                              className={s.textarea}
                              maxLength={FIELD_LIMITS.observaciones}
                              placeholder="Uso interno. No sale en el PDF."
                              rows={3}
                              value={internalObservation}
                              onChange={(event) =>
                                onInternalObservationChange(event.target.value)
                              }
                            />
                          </label>
                        )}
                      </section>
                    ) : null}
                  </section>
                </>
              ) : (
                <>
              {isTrabajoPersonalizado ? (
                <section className={s.formSection}>
                  <div className={s.formSectionHead}>
                    <span className={s.formSectionEyebrow}>Descripcion del trabajo</span>
                    <strong>Redacta el alcance para el cliente</strong>
                  </div>
                  <div className={s.formGrid2}>
                    <label className={s.field}>
                      <span className={s.label}>Nombre del trabajo</span>
                      <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Ej: Cierre terraza a medida"
                        value={draft.nombre}
                        onChange={(event) => onNombreChange(event.target.value)}
                      />
                    </label>
                  </div>
                  <label className={s.field}>
                    <span className={s.label}>Descripcion para cliente</span>
                    <textarea
                      className={s.textarea}
                      maxLength={360}
                      placeholder="Ej: Cierre de terraza con 4 hojas, sistema especial, fabricacion a medida e instalacion incluida."
                      rows={4}
                      value={draft.descripcion}
                      onChange={(event) => onDescripcionChange(event.target.value)}
                    />
                  </label>
                </section>
              ) : null}

              {requiresProfileMaterial ? (
                <section className={s.formSection}>
                  <div className={s.formSectionHead}>
                    <span className={s.formSectionEyebrow}>Material</span>
                    <strong>Se aplica a todo el grupo</strong>
                  </div>

                  <div className={s.segmentedChoiceGrid} role="radiogroup" aria-label="Material del grupo">
                    {MATERIAL_OPTIONS.map((materialOption) => (
                      <label
                        key={materialOption}
                        className={`${s.segmentedChoice} ${
                          draft.material === materialOption ? s.segmentedChoiceActive : ""
                        }`}
                      >
                        <input
                          checked={draft.material === materialOption}
                          className={s.segmentedChoiceInput}
                          name="group-material"
                          onChange={() => onMaterialChange(materialOption)}
                          type="radio"
                          value={materialOption}
                        />
                        <span className={s.segmentedChoiceTitle}>{materialOption}</span>
                      </label>
                    ))}
                  </div>
                </section>
              ) : null}

              {showSystemSelection ? (
              <div className={s.groupSheetInlineField}>
                <label className={s.label} htmlFor="grupo-sistema">
                  Tipo de sistema
                </label>
                <div className={s.selectWrap}>
                  <select
                    className={s.input}
                    id="grupo-sistema"
                    value={draft.sistema}
                    onChange={(event) => onSistemaChange(event.target.value)}
                  >
                    {systemOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              ) : null}

              {showSheetScheme ? (
                <section className={s.formSection}>
                  <div className={s.formSectionHead}>
                    <span className={s.formSectionEyebrow}>{compositionSectionLabel}</span>
                    <strong>Describe la composición</strong>
                  </div>

                  <div className={s.batchCountRow} role="group" aria-label={compositionSectionLabel}>
                    {sheetSchemeOptions.map((option) => (
                      <button
                        key={option}
                        className={`${s.batchCountButton} ${
                          draft.sheetScheme === option ? s.batchCountButtonActive : ""
                        }`}
                        onClick={() => onSheetSchemeChange(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  {sheetVariantOptions.length > 0 ? (
                    <div className={s.typeGroupGrid} role="group" aria-label="Variante del esquema">
                      {sheetVariantOptions.map((option) => (
                        <button
                          key={option}
                          className={`${s.typeChip} ${
                            draft.sheetVariant === option ? s.typeChipActive : ""
                          }`}
                          onClick={() => onSheetVariantChange(option)}
                          type="button"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {showCustomSchemeDescription ? (
                    <label className={s.field}>
                      <span className={s.label}>Describe la composición</span>
                      <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Ej: fijo superior + lateral"
                        value={draft.customSchemeDescription}
                        onChange={(event) => onCustomSchemeDescriptionChange(event.target.value)}
                      />
                    </label>
                  ) : null}
                </section>
              ) : null}

              <div className={s.groupSheetInlineField}>
                <label className={s.label} htmlFor="grupo-vidrio">
                  Tipo de vidrio
                </label>
                <div>
                  <input
                    className={s.input}
                    list="grupo-vidrio-opciones"
                    id="grupo-vidrio"
                    placeholder="Buscar o escribir vidrio"
                    value={draft.vidrio}
                    onBlur={(event) => onCreateCustomGlass(event.target.value)}
                    onChange={(event) => onVidrioChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onCreateCustomGlass(event.currentTarget.value);
                      }
                    }}
                  />
                  <datalist id="grupo-vidrio-opciones">
                    {glassOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
              </>
              )}
            </div>
          ) : null}

          {paso === 5 ? (
            <div className={s.groupSheetConfirmStack}>
              <div className={s.groupSheetSummaryCard}>
                <span className={s.cardLabel}>Resumen</span>
                <strong className={s.groupSheetSummaryText}>{summary}</strong>
              </div>

              <dl className={s.groupSheetSummaryGrid}>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Categoria</dt>
                  <dd>{draft.categoria}</dd>
                </div>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Subtipo</dt>
                  <dd>{draft.subtipo}</dd>
                </div>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Unidades</dt>
                  <dd>{draft.cantidad}</dd>
                </div>
                {requiresProfileMaterial ? (
                  <div className={s.groupSheetSummaryRow}>
                    <dt>Material</dt>
                    <dd>{draft.material}</dd>
                  </div>
                ) : null}
                {showSystemSelection ? (
                <div className={s.groupSheetSummaryRow}>
                  <dt>Sistema</dt>
                  <dd>{draft.sistema}</dd>
                </div>
                ) : null}
                {draft.sheetScheme ? (
                  <div className={s.groupSheetSummaryRow}>
                    <dt>Composición</dt>
                    <dd>
                      {[draft.sheetScheme, draft.sheetVariant]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                ) : null}
                <div className={s.groupSheetSummaryRow}>
                  <dt>Vidrio</dt>
                  <dd>{draft.vidrio}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <footer className={s.groupSheetFooter}>
          <button
            className={s.btnGhost}
            disabled={paso === 1}
            onClick={onBack}
            type="button"
          >
            <LuChevronLeft aria-hidden />
            Atras
          </button>

          {paso < 5 && !shouldConfirmFromCurrentStep ? (
            <button
              className={s.btnPrimary}
              disabled={disableContinue}
              onClick={onNext}
              type="button"
            >
              {getContinueLabel(paso)}
            </button>
          ) : (
            <button
              className={s.btnPrimary}
              disabled={shouldConfirmFromCurrentStep ? disableContinue : false}
              onClick={onConfirm}
              type="button"
            >
              <LuPlus aria-hidden />
              {shouldConfirmFromCurrentStep
                ? getContinueLabel(paso, true)
                : isSingleStepFreeTotal
                  ? "Agregar trabajo"
                  : "Agregar"}
            </button>
          )}
        </footer>
      </section>
  );

  const guidedComposer =
    guidedDraft && onGuidedVisualConfigChange ? (
      <GuidedVisualComposer
        open={isGuidedComposerOpen}
        config={guidedDraft}
        colorHex={draft.colorHex}
        pieceTitle={[draft.subtipo, draft.sistema].filter(Boolean).join(" ") || "Pieza"}
        onChange={setGuidedDraft}
        onApply={(next) => {
          onGuidedVisualConfigChange(next);
          setGuidedDraft(next);
          setIsGuidedComposerOpen(false);
        }}
        onClose={() => setIsGuidedComposerOpen(false)}
        onClear={
          draft.guidedVisualConfig
            ? () => {
                onGuidedVisualConfigChange(null);
                setIsGuidedComposerOpen(false);
              }
            : undefined
        }
      />
    ) : null;

  if (!isOverlay) {
    return (
      <>
        {sheet}
        {guidedComposer}
        {isDiscardModalOpen ? (
          <div
            className={s.stepTwoConfirmOverlay}
            onClick={() => setIsDiscardModalOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.nativeEvent.stopImmediatePropagation();
                setIsDiscardModalOpen(false);
              }
            }}
            role="presentation"
          >
            <section
              aria-labelledby="descartar-borrador-titulo"
              aria-modal="true"
              className={s.stepTwoConfirmDialog}
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className={s.stepTwoConfirmTitle} id="descartar-borrador-titulo">
                ¿Descartar presupuesto por total?
              </h2>
              <p className={s.stepTwoConfirmText}>
                Perderas los cambios ingresados en este presupuesto. Los detalles ya agregados se conservaran.
              </p>
              <div className={s.stepTwoConfirmActions}>
                <button className={s.btnGhost} type="button" onClick={() => setIsDiscardModalOpen(false)}>
                  Seguir editando
                </button>
                <button
                  className={s.btnPrimary}
                  type="button"
                  onClick={() => {
                    if (onDiscardDraft) {
                      onDiscardDraft();
                    } else {
                      onClose();
                    }
                  }}
                >
                  Descartar presupuesto
                </button>
              </div>
            </section>
          </div>
        ) : null}
        {priceEditor}
      </>
    );
  }

  return (
    <div className={s.groupSheetOverlay} role="presentation" onClick={onClose}>
      {sheet}
      {guidedComposer}
      {priceEditor}
    </div>
  );
}
