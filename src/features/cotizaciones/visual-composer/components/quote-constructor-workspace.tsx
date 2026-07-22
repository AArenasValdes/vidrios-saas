"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  LuArrowRight,
  LuCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuCircleAlert,
  LuCopy,
  LuEllipsis,
  LuPencilRuler,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";

import {
  DespieceInspectorSummary,
} from "@/features/cotizaciones/visual-composer/components/despiece-review-surface";
import { LineTemplatePicker } from "@/features/cotizaciones/line-templates/components/line-template-picker";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  buildCubicationSnapshotFromCatalogMetadata,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { getLineTemplateCuttingRules } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { GlassOptionPicker } from "@/features/cotizaciones/visual-composer/components/glass-option-picker";
import {
  buildPieceDomainView,
  formatPieceTechnicalSummaryLines,
  getPiecePresentationMeta,
  isPieceCommerciallyComplete,
  type PieceDomainView,
} from "@/features/cotizaciones/new-quote/quote-piece-domain";
import {
  COLOR_OPTIONS,
  mapItemToForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { GuidedVisualComposer } from "@/features/cotizaciones/visual-composer/components/guided-visual-composer";
import {
  QUOTE_CONSTRUCTOR_PRESETS,
  createQuoteConstructorPresetConfig,
  getQuoteConstructorItemConfig,
  isQuoteConstructorCompatibleItem,
  isQuoteConstructorPresetDefaultName,
  resolveQuoteConstructorCommercialName,
  type QuoteConstructorItemPatch,
  type QuoteConstructorPresetId,
} from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import {
  renderGuidedModuleTypeIcon,
  renderGuidedVisualSvg,
} from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import {
  findNodeById,
  isModuleNode,
  listLeafModules,
  setGuidedVisualDimensions,
  updateModuleOpeningSide,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

import s from "./quote-constructor-workspace.module.css";

type Props = {
  items: CotizacionWorkflowItem[];
  quotePricingMode: QuotePricingMode;
  lineTemplates: CotizacionLineTemplate[];
  glassOptions: readonly string[];
  activeItemId: string | null;
  totalClienteManual: number | null;
  formatCurrencyInput: (value: string) => string;
  onActiveItemChange: (itemId: string) => void;
  onAddPreset: (preset: QuoteConstructorPresetId) => void;
  onUpdateItem: (itemId: string, patch: QuoteConstructorItemPatch) => void;
  onDuplicateItem: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
  onMoveItem: (itemId: string, direction: -1 | 1) => void;
  onEditAdvanced: (item: CotizacionWorkflowItem) => void;
  onRecalculateTemplatePrice: (itemId: string) => void;
  onGlobalTotalChange: (value: string) => void;
  onGoToSummary: () => void;
  onOpenDespieceReview: (itemId?: string) => void;
};

type InspectorSectionId =
  | "identificacion"
  | "sistema"
  | "vidrio"
  | "apertura"
  | "cubicacion"
  | "precio";

type DimensionFieldKey = "ancho" | "alto" | "cantidad";
type LocalFieldDraft = { text: string; error: string | null };
type ItemFieldDrafts = Partial<Record<DimensionFieldKey, LocalFieldDraft>>;

function validateDimensionMm(raw: string, label: "Ancho" | "Alto"): string | null {
  const digits = raw.replace(/[^\d]/g, "").trim();
  if (!digits) return `${label} mínimo 200 mm`;
  const value = Math.round(Number(digits));
  if (!Number.isFinite(value) || value < 200) return `${label} mínimo 200 mm`;
  return null;
}

function validateQuantityValue(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "").trim();
  if (!digits) return "Cantidad inválida";
  const value = Math.round(Number(digits));
  if (!Number.isFinite(value) || value < 1) return "Cantidad inválida";
  return null;
}

function parseDimensionMm(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "").trim();
  if (!digits) return null;
  const value = Math.round(Number(digits));
  return Number.isFinite(value) && value >= 200 ? value : null;
}

function parseQuantityValue(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "").trim();
  if (!digits) return null;
  const value = Math.round(Number(digits));
  return Number.isFinite(value) && value >= 1 ? value : null;
}

function itemHasLocalFieldErrors(drafts: ItemFieldDrafts | undefined) {
  if (!drafts) return false;
  return Boolean(drafts.ancho?.error || drafts.alto?.error || drafts.cantidad?.error);
}

function getCommittedFieldText(
  item: CotizacionWorkflowItem,
  key: DimensionFieldKey
): string {
  if (key === "cantidad") return String(item.cantidad);
  const value = item[key];
  return value ? String(value) : "";
}

function inferConfig(item: CotizacionWorkflowItem) {
  const persisted = getQuoteConstructorItemConfig(item);
  if (persisted) return persisted;
  const haystack = `${item.tipo} ${item.nombre} ${item.lineaComercial}`.toLocaleLowerCase("es");
  const preset: QuoteConstructorPresetId = haystack.includes("oscilo")
    ? "oscilobatiente"
    : haystack.includes("corre")
      ? "corredera"
      : haystack.includes("proyect")
        ? "proyectante"
        : haystack.includes("abat") || haystack.includes("puerta")
          ? item.tipo.toLocaleLowerCase("es") === "puerta" ? "puerta" : "abatible"
          : "fijo";
  return createQuoteConstructorPresetConfig(preset, {
    widthMm: item.ancho ?? 1200,
    heightMm: item.alto ?? 1000,
  });
}

function resolveLineTemplate(
  lineTemplates: CotizacionLineTemplate[],
  lineTemplateId: string
) {
  if (!lineTemplateId) return null;
  return lineTemplates.find((template) => String(template.id) === lineTemplateId) ?? null;
}

function buildItemDomainView(
  item: CotizacionWorkflowItem,
  pricingMode: QuotePricingMode,
  lineTemplates: CotizacionLineTemplate[]
) {
  const form = mapItemToForm(item);
  return buildPieceDomainView(
    item,
    pricingMode,
    resolveLineTemplate(lineTemplates, form.lineTemplateId)
  );
}

function resolveFirstPendingInspectorSection(view: PieceDomainView): InspectorSectionId | null {
  switch (view.commercialStatus) {
    case "falta_nombre":
      return "identificacion";
    case "falta_linea":
      return "sistema";
    case "falta_vidrio":
      return "vidrio";
    case "falta_precio":
      return "precio";
    case "completa":
      break;
    default:
      break;
  }

  if (view.technicalStatus !== "configurado" && view.technicalStatus !== "sin_reglas") {
    return "cubicacion";
  }

  return null;
}

function isInspectorSectionPending(sectionId: InspectorSectionId, view: PieceDomainView) {
  switch (sectionId) {
    case "identificacion":
      return view.commercialStatus === "falta_nombre";
    case "sistema":
      return view.commercialStatus === "falta_linea";
    case "vidrio":
      return view.commercialStatus === "falta_vidrio";
    case "apertura":
      return false;
    case "cubicacion":
      return view.technicalStatus !== "configurado" && view.technicalStatus !== "sin_reglas";
    case "precio":
      return view.commercialStatus === "falta_precio";
    default:
      return false;
  }
}

type InspectorSectionStatus = "pending" | "ready" | "optional";
type PieceGapTarget = InspectorSectionId | "medidas";

type PieceGap = {
  id: string;
  label: string;
  required: boolean;
  target: PieceGapTarget;
};

function getInspectorSectionStatus(
  sectionId: InspectorSectionId,
  view: PieceDomainView,
  pricingMode: QuotePricingMode,
  item: CotizacionWorkflowItem
): InspectorSectionStatus {
  if (sectionId === "apertura") return "optional";
  if (sectionId === "precio" && pricingMode === "total_global") return "optional";

  if (sectionId === "identificacion") {
    return item.nombre.trim() ? "ready" : "pending";
  }

  if (sectionId === "sistema") {
    const meta = getPiecePresentationMeta(item);
    return meta.lineTemplateId || item.lineaComercial.trim() ? "ready" : "pending";
  }

  if (sectionId === "vidrio") {
    return item.vidrio.trim() ? "ready" : "pending";
  }

  if (sectionId === "precio") {
    return pricingMode === "por_item" && item.precioUnitario <= 0 ? "pending" : "ready";
  }

  if (sectionId === "cubicacion") {
    return isInspectorSectionPending("cubicacion", view) ? "pending" : "ready";
  }

  return "ready";
}

function listPieceGaps(params: {
  item: CotizacionWorkflowItem;
  view: PieceDomainView;
  pricingMode: QuotePricingMode;
  hasLocalErrors: boolean;
}): PieceGap[] {
  const { item, view, pricingMode, hasLocalErrors } = params;
  const gaps: PieceGap[] = [];

  if (!item.nombre.trim()) {
    gaps.push({
      id: "nombre",
      label: "Nombre",
      required: true,
      target: "identificacion",
    });
  }

  if (hasLocalErrors || !item.ancho || !item.alto || item.cantidad < 1) {
    gaps.push({
      id: "medidas",
      label: "Medidas o cantidad",
      required: true,
      target: "medidas",
    });
  }

  if (pricingMode === "por_item" && item.precioUnitario <= 0) {
    gaps.push({
      id: "precio",
      label: "Precio unitario",
      required: true,
      target: "precio",
    });
  }

  const meta = getPiecePresentationMeta(item);
  if (!meta.lineTemplateId && !item.lineaComercial.trim()) {
    gaps.push({
      id: "linea",
      label: "Línea comercial",
      required: false,
      target: "sistema",
    });
  }

  if (!item.vidrio.trim()) {
    gaps.push({
      id: "vidrio",
      label: "Vidrio",
      required: false,
      target: "vidrio",
    });
  }

  if (isInspectorSectionPending("cubicacion", view)) {
    gaps.push({
      id: "cubicacion",
      label: "Cubicación",
      required: false,
      target: "cubicacion",
    });
  }

  return gaps;
}

type EditableInputProps = {
  label: string;
  value: string;
  inputMode?: "text" | "numeric";
  suffix?: string;
  error?: string | null;
  /** Con onChange el input es controlado (draft local). Sin onChange usa defaultValue. */
  onChange?: (value: string) => void;
  onCommit: (value: string) => void;
};

function EditableInput({
  label,
  value,
  inputMode = "text",
  suffix,
  error = null,
  onChange,
  onCommit,
}: EditableInputProps) {
  const isControlled = typeof onChange === "function";
  const errorId = error ? `${label.replace(/\s+/g, "-").toLowerCase()}-error` : undefined;

  return (
    <label className={`${s.inlineField} ${error ? s.inlineFieldError : ""}`}>
      <span>{label}</span>
      <span className={s.inputShell}>
        {isControlled ? (
          <input
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange(event.currentTarget.value)
            }
            inputMode={inputMode}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            onBlur={(event) => onCommit(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        ) : (
          <input
            key={value}
            defaultValue={value}
            inputMode={inputMode}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            onBlur={(event) => onCommit(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        )}
        {suffix ? <small>{suffix}</small> : null}
      </span>
      {error ? (
        <em className={s.fieldError} id={errorId}>
          {error}
        </em>
      ) : null}
    </label>
  );
}

type InspectorAccordionSectionProps = {
  title: string;
  isOpen: boolean;
  status: InspectorSectionStatus;
  onToggle: () => void;
  children: ReactNode;
};

function InspectorAccordionSection({
  title,
  isOpen,
  status,
  onToggle,
  children,
}: InspectorAccordionSectionProps) {
  return (
    <section
      className={`${s.accordion} ${isOpen ? s.accordionOpen : ""} ${
        status === "ready" ? s.accordionReadyState : ""
      } ${status === "pending" ? s.accordionPendingState : ""}`}
    >
      <button
        type="button"
        className={s.accordionTrigger}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className={s.accordionTitle}>{title}</span>
        {status === "pending" ? (
          <span className={s.accordionPending}>Pendiente</span>
        ) : null}
        {status === "ready" ? (
          <span className={s.accordionReady}>
            <LuCheck aria-hidden />
            Listo
          </span>
        ) : null}
        {status === "optional" ? (
          <span className={s.accordionOptional}>Opcional</span>
        ) : null}
        <LuChevronDown aria-hidden className={s.accordionChevron} />
      </button>
      <div className={s.accordionPanel}>
        <div className={s.accordionInner}>{children}</div>
      </div>
    </section>
  );
}

export function QuoteConstructorWorkspace({
  items,
  quotePricingMode,
  lineTemplates,
  glassOptions,
  activeItemId,
  totalClienteManual,
  formatCurrencyInput,
  onActiveItemChange,
  onAddPreset,
  onUpdateItem,
  onDuplicateItem,
  onRemoveItem,
  onMoveItem,
  onEditAdvanced,
  onRecalculateTemplatePrice,
  onGlobalTotalChange,
  onGoToSummary,
  onOpenDespieceReview,
}: Props) {
  const visualItems = useMemo(() => items.filter(isQuoteConstructorCompatibleItem), [items]);
  const nonVisualCount = items.length - visualItems.length;
  const activeItem = visualItems.find((item) => item.id === activeItemId) ?? visualItems[0] ?? null;
  const activeForm = activeItem ? mapItemToForm(activeItem) : null;
  const activeConfig = activeItem ? inferConfig(activeItem) : null;
  const activeTemplate = activeForm
    ? resolveLineTemplate(lineTemplates, activeForm.lineTemplateId)
    : null;
  const activeView = activeItem
    ? buildPieceDomainView(activeItem, quotePricingMode, activeTemplate)
    : null;
  const selectedColor = activeForm
    ? COLOR_OPTIONS.find(
        (option) => option.hex.toLowerCase() === activeForm.colorHex.toLowerCase()
      )
    : null;
  const [composerItemId, setComposerItemId] = useState<string | null>(null);
  const [actionMenuItemId, setActionMenuItemId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<InspectorSectionId>>(
    () => new Set<InspectorSectionId>(["identificacion"])
  );
  const [inspectorSyncedItemId, setInspectorSyncedItemId] = useState<string | null>(null);
  const [fieldDraftsByItemId, setFieldDraftsByItemId] = useState<
    Record<string, ItemFieldDrafts>
  >({});
  const [confirmedPieceIds, setConfirmedPieceIds] = useState<Set<string>>(() => new Set());
  const [highlightAddBar, setHighlightAddBar] = useState(false);
  const presetBarRef = useRef<HTMLElement | null>(null);
  const composerItem = visualItems.find((item) => item.id === composerItemId) ?? null;
  const activeId = activeItem?.id ?? null;

  const isItemEffectivelyIncomplete = (item: CotizacionWorkflowItem) =>
    itemHasLocalFieldErrors(fieldDraftsByItemId[item.id]) ||
    !isPieceCommerciallyComplete(item, quotePricingMode);

  const incompleteCount = visualItems.filter(isItemEffectivelyIncomplete).length;
  const completeCount = visualItems.length - incompleteCount;
  const missingPriceCount = visualItems.filter(
    (item) =>
      !itemHasLocalFieldErrors(fieldDraftsByItemId[item.id]) &&
      quotePricingMode === "por_item" &&
      item.precioUnitario <= 0
  ).length;
  const canContinue = visualItems.length > 0 && incompleteCount === 0;
  const activeHasLocalErrors = activeItem
    ? itemHasLocalFieldErrors(fieldDraftsByItemId[activeItem.id])
    : false;
  const activeEffectivelyComplete = Boolean(
    activeView?.isCommerciallyComplete && !activeHasLocalErrors
  );
  const activeGaps =
    activeItem && activeView
      ? listPieceGaps({
          item: activeItem,
          view: activeView,
          pricingMode: quotePricingMode,
          hasLocalErrors: activeHasLocalErrors,
        })
      : [];
  const activeRequiredGaps = activeGaps.filter((gap) => gap.required);
  const activeRecommendedGaps = activeGaps.filter((gap) => !gap.required);
  const activeIsConfirmed =
    Boolean(activeItem) &&
    activeEffectivelyComplete &&
    confirmedPieceIds.has(activeItem!.id);
  const activeCommercialLabel = activeHasLocalErrors
    ? "Faltan medidas"
    : activeIsConfirmed
      ? "Lista"
      : activeEffectivelyComplete
        ? "Completa"
        : activeView?.commercialLabel ?? "";

  useEffect(() => {
    if (!activeItemId && visualItems[0]) onActiveItemChange(visualItems[0].id);
  }, [activeItemId, visualItems, onActiveItemChange]);

  useEffect(() => {
    if (!highlightAddBar) return;
    const timer = window.setTimeout(() => setHighlightAddBar(false), 1400);
    return () => window.clearTimeout(timer);
  }, [highlightAddBar]);

  useEffect(() => {
    setConfirmedPieceIds((current) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of current) {
        const item = visualItems.find((entry) => entry.id === id);
        if (!item) {
          changed = true;
          continue;
        }
        if (
          itemHasLocalFieldErrors(fieldDraftsByItemId[id]) ||
          !isPieceCommerciallyComplete(item, quotePricingMode)
        ) {
          changed = true;
          continue;
        }
        next.add(id);
      }
      return changed ? next : current;
    });
  }, [visualItems, fieldDraftsByItemId, quotePricingMode]);

  // Si el croquis ya no coincide con un nombre preset ("Ventana fija" → corredera),
  // alinear el nombre comercial sin pedir reabrir el compositor.
  useEffect(() => {
    if (!activeItem || !activeForm?.guidedVisualConfig) return;
    if (!isQuoteConstructorPresetDefaultName(activeItem.nombre)) return;
    const suggested = resolveQuoteConstructorCommercialName(activeForm.guidedVisualConfig);
    if (!suggested) return;
    if (
      activeItem.nombre.trim().toLocaleLowerCase("es") ===
      suggested.trim().toLocaleLowerCase("es")
    ) {
      return;
    }
    onUpdateItem(activeItem.id, { nombre: suggested });
    // Intencional: no depender de onUpdateItem (identidad inestable en el page).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync acotado a pieza/config/nombre
  }, [activeItem?.id, activeItem?.nombre, activeForm?.guidedVisualConfig]);

  if (activeId !== inspectorSyncedItemId) {
    setInspectorSyncedItemId(activeId);
    if (activeView) {
      const pendingSection = resolveFirstPendingInspectorSection(activeView);
      setOpenSections(
        pendingSection
          ? new Set<InspectorSectionId>([pendingSection])
          : new Set<InspectorSectionId>(["identificacion"])
      );
    } else {
      setOpenSections(new Set<InspectorSectionId>(["identificacion"]));
    }
  }

  const toggleSection = (sectionId: InspectorSectionId) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const focusGap = (target: PieceGapTarget) => {
    if (target === "medidas") {
      const card = document.querySelector<HTMLElement>(
        `[data-constructor-piece-id="${activeItem?.id ?? ""}"]`
      );
      card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const labels = Array.from(card?.querySelectorAll("label") ?? []);
      const widthLabel = labels.find((label) =>
        Boolean(label.querySelector("span")?.textContent?.includes("Ancho"))
      );
      widthLabel?.querySelector("input")?.focus();
      return;
    }
    setOpenSections(new Set<InspectorSectionId>([target]));
  };

  const focusAddBar = () => {
    setHighlightAddBar(true);
    presetBarRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const confirmActivePiece = () => {
    if (!activeItem || !activeEffectivelyComplete) {
      const firstRequired = activeRequiredGaps[0];
      if (firstRequired) focusGap(firstRequired.target);
      return;
    }

    setConfirmedPieceIds((current) => {
      const next = new Set(current);
      next.add(activeItem.id);
      return next;
    });

    const nextPending = visualItems.find(
      (item) => item.id !== activeItem.id && isItemEffectivelyIncomplete(item)
    );
    if (nextPending) {
      onActiveItemChange(nextPending.id);
      return;
    }

    const nextUnconfirmed = visualItems.find(
      (item) =>
        item.id !== activeItem.id &&
        !confirmedPieceIds.has(item.id) &&
        isPieceCommerciallyComplete(item, quotePricingMode) &&
        !itemHasLocalFieldErrors(fieldDraftsByItemId[item.id])
    );
    if (nextUnconfirmed) {
      onActiveItemChange(nextUnconfirmed.id);
    }
  };

  const setLocalFieldDraft = (
    itemId: string,
    key: DimensionFieldKey,
    draft: LocalFieldDraft | null
  ) => {
    setFieldDraftsByItemId((current) => {
      const previous = current[itemId] ?? {};
      if (!draft) {
        if (!(key in previous)) return current;
        const nextItem: ItemFieldDrafts = { ...previous };
        delete nextItem[key];
        if (Object.keys(nextItem).length === 0) {
          const nextMap = { ...current };
          delete nextMap[itemId];
          return nextMap;
        }
        return { ...current, [itemId]: nextItem };
      }
      return {
        ...current,
        [itemId]: {
          ...previous,
          [key]: draft,
        },
      };
    });
  };

  const handleLocalFieldChange = (
    itemId: string,
    key: DimensionFieldKey,
    text: string
  ) => {
    setLocalFieldDraft(itemId, key, { text, error: null });
  };

  const commitDimension = (
    item: CotizacionWorkflowItem,
    key: "ancho" | "alto",
    raw: string
  ) => {
    const label = key === "ancho" ? "Ancho" : "Alto";
    const error = validateDimensionMm(raw, label);
    if (error) {
      setLocalFieldDraft(item.id, key, { text: raw, error });
      return;
    }

    const value = parseDimensionMm(raw);
    if (value == null) {
      setLocalFieldDraft(item.id, key, { text: raw, error: `${label} mínimo 200 mm` });
      return;
    }

    setLocalFieldDraft(item.id, key, null);
    const config = inferConfig(item);
    onUpdateItem(item.id, {
      [key]: String(value),
      guidedVisualConfig: setGuidedVisualDimensions(config, {
        widthMm: key === "ancho" ? value : config.widthMm,
        heightMm: key === "alto" ? value : config.heightMm,
      }),
    });
  };

  const commitQuantity = (item: CotizacionWorkflowItem, raw: string) => {
    const error = validateQuantityValue(raw);
    if (error) {
      setLocalFieldDraft(item.id, "cantidad", { text: raw, error });
      return;
    }

    const quantity = parseQuantityValue(raw);
    if (quantity == null) {
      setLocalFieldDraft(item.id, "cantidad", { text: raw, error: "Cantidad inválida" });
      return;
    }

    setLocalFieldDraft(item.id, "cantidad", null);
    onUpdateItem(item.id, { cantidad: String(quantity) });
  };

  const updateOpeningSide = (side: "left" | "right") => {
    if (!activeItem || !activeConfig) return;
    const selected = activeConfig.selectedNodeId
      ? findNodeById(activeConfig.root, activeConfig.selectedNodeId)
      : null;
    const targetModule = selected && isModuleNode(selected) ? selected : listLeafModules(activeConfig.root)[0];
    onUpdateItem(activeItem.id, {
      guidedVisualConfig: updateModuleOpeningSide(activeConfig, targetModule.id, side),
    });
  };

  const reviewPending = () => {
    const pendingItem = visualItems.find(isItemEffectivelyIncomplete);
    if (pendingItem) {
      onActiveItemChange(pendingItem.id);
      return;
    }
    onGoToSummary();
  };

  const openDespieceReview = (itemId?: string) => {
    onOpenDespieceReview(itemId);
  };

  const recalculateActiveCubication = () => {
    if (!activeItem || !activeForm || !activeTemplate || activeForm.isCustomScheme) return;
    const widthMm = Math.round(Number(activeForm.ancho));
    const heightMm = Math.round(Number(activeForm.alto));
    const quantity = Math.max(1, Math.round(Number(activeForm.cantidad)) || 1);
    const rules = getLineTemplateCuttingRules(activeTemplate.catalogMetadata);
    if (!rules?.enabled || widthMm <= 0 || heightMm <= 0) return;
    const next = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: String(activeTemplate.id),
      catalogMetadata: activeTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
    if (next) onUpdateItem(activeItem.id, { cubicationSnapshot: next });
  };

  const footerActionLabel = canContinue
    ? "Continuar al resumen"
    : visualItems.length === 0
      ? "Agrega una pieza para continuar"
      : missingPriceCount === incompleteCount
        ? `Faltan precios en ${incompleteCount} ${incompleteCount === 1 ? "pieza" : "piezas"}`
        : "Completa los campos pendientes";

  return (
    <section className={s.workspace} aria-label="Constructor de componentes">
      <header className={s.header}>
        <div>
          <span className={s.headerEyebrow}>Constructor</span>
          <h2>Cuaderno de componentes</h2>
          <p>
            <strong>{completeCount} de {visualItems.length} completas</strong>
            <span aria-hidden>·</span>
            Cambios guardados en borrador
          </p>
        </div>
        <div className={s.headerActions}>
          {visualItems.length > 0 ? (
            <button
              type="button"
              className={s.reviewDespieceButton}
              onClick={() => openDespieceReview(activeItem?.id)}
            >
              Revisar despiece
            </button>
          ) : null}
          <button
            type="button"
            className={s.reviewButton}
            onClick={incompleteCount > 0 ? reviewPending : onGoToSummary}
            disabled={visualItems.length === 0}
          >
            {incompleteCount > 0 ? "Revisar pendientes" : "Revisar cotización"}
          </button>
        </div>
      </header>

      <nav
        ref={presetBarRef}
        className={`${s.presetBar} ${highlightAddBar ? s.presetBarHighlight : ""}`}
        aria-label="Agregar componente"
      >
        <div className={s.presetIntro}>
          <span className={s.presetLabel}>
            <LuPlus aria-hidden />
            Agregar pieza
          </span>
          <p>Elige un tipo para sumarlo al cuaderno</p>
        </div>
        <div className={s.presetButtons}>
          {QUOTE_CONSTRUCTOR_PRESETS.map((preset) => (
            <button key={preset.id} type="button" onClick={() => onAddPreset(preset.id)}>
              <span
                aria-hidden
                dangerouslySetInnerHTML={{ __html: renderGuidedModuleTypeIcon(preset.id, 30) }}
              />
              {preset.label}
            </button>
          ))}
        </div>
      </nav>

      <div className={s.body}>
        <div className={s.board}>
          {visualItems.length === 0 ? (
            <div className={s.emptyState}>
              <LuPencilRuler aria-hidden />
              <h3>Empieza agregando la primera pieza</h3>
              <p>
                Usa los botones de arriba o elige un tipo aquí. Después ajustas medidas
                en la tarjeta y el resto en el panel derecho.
              </p>
              <div className={s.emptyPresetGrid}>
                {QUOTE_CONSTRUCTOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onAddPreset(preset.id)}
                  >
                    <span
                      aria-hidden
                      dangerouslySetInnerHTML={{
                        __html: renderGuidedModuleTypeIcon(preset.id, 34),
                      }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={s.pieceGrid}>
              {visualItems.map((item, index) => {
                const config = inferConfig(item);
                const active = activeItem?.id === item.id;
                const view = buildItemDomainView(item, quotePricingMode, lineTemplates);
                const techLines = formatPieceTechnicalSummaryLines(view.technicalSummary);
                const itemDrafts = fieldDraftsByItemId[item.id];
                const hasLocalErrors = itemHasLocalFieldErrors(itemDrafts);
                const isEffectivelyComplete =
                  view.isCommerciallyComplete && !hasLocalErrors;
                const isConfirmed =
                  isEffectivelyComplete && confirmedPieceIds.has(item.id);
                const commercialLabel = hasLocalErrors
                  ? "Faltan medidas"
                  : isConfirmed
                    ? "Lista"
                    : isEffectivelyComplete
                      ? "Completa"
                      : view.commercialLabel;
                const anchoDraft = itemDrafts?.ancho;
                const altoDraft = itemDrafts?.alto;
                const cantidadDraft = itemDrafts?.cantidad;
                return (
                  <article
                    key={item.id}
                    data-constructor-piece-id={item.id}
                    className={`${s.pieceCard} ${active ? s.pieceCardActive : ""} ${
                      isConfirmed ? s.pieceCardConfirmed : ""
                    }`}
                    onClick={() => onActiveItemChange(item.id)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      const target = event.target as HTMLElement | null;
                      if (target?.closest("button, input, select, textarea, a, [role='menuitem']")) {
                        return;
                      }
                      event.preventDefault();
                      onActiveItemChange(item.id);
                    }}
                    tabIndex={0}
                    aria-current={active ? "true" : undefined}
                    aria-label={`${item.codigo}, ${item.nombre || "Pieza sin nombre"}, ${commercialLabel}, ${view.technicalLabel}`}
                  >
                    <header className={s.pieceHeader}>
                      <div>
                        <span>{item.codigo}</span>
                        <strong>{item.nombre || "Pieza sin nombre"}</strong>
                      </div>
                      <div className={s.badgeRow}>
                        <span
                          className={
                            isConfirmed || isEffectivelyComplete ? s.ready : s.pending
                          }
                        >
                          {isConfirmed || isEffectivelyComplete ? (
                            <LuCheck aria-hidden />
                          ) : (
                            <LuCircleAlert aria-hidden />
                          )}
                          {commercialLabel}
                        </span>
                        <span
                          className={
                            view.technicalStatus === "configurado" ? s.techReady : s.techPending
                          }
                        >
                          {view.technicalLabel}
                        </span>
                      </div>
                    </header>
                    <div className={s.drawingStage}>
                      <button
                        type="button"
                        className={s.drawing}
                        aria-label={`Abrir composición de ${item.codigo}`}
                        title="Abrir composición"
                        onClick={(event) => {
                          event.stopPropagation();
                          onActiveItemChange(item.id);
                          setComposerItemId(item.id);
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderGuidedVisualSvg(config, {
                            maxW: 380,
                            maxH: 220,
                            variant: "summary",
                            colorHex: mapItemToForm(item).colorHex,
                            showSelection: false,
                            showDimensions: true,
                            resourceKey: `constructor-piece-${item.id}`,
                          }),
                        }}
                      />
                    </div>
                    <div className={s.cardFields}>
                      <EditableInput
                        label="Ancho"
                        value={anchoDraft?.text ?? getCommittedFieldText(item, "ancho")}
                        inputMode="numeric"
                        suffix="mm"
                        error={anchoDraft?.error ?? null}
                        onChange={(value) => handleLocalFieldChange(item.id, "ancho", value)}
                        onCommit={(value) => commitDimension(item, "ancho", value)}
                      />
                      <EditableInput
                        label="Alto"
                        value={altoDraft?.text ?? getCommittedFieldText(item, "alto")}
                        inputMode="numeric"
                        suffix="mm"
                        error={altoDraft?.error ?? null}
                        onChange={(value) => handleLocalFieldChange(item.id, "alto", value)}
                        onCommit={(value) => commitDimension(item, "alto", value)}
                      />
                      <EditableInput
                        label="Cantidad"
                        value={cantidadDraft?.text ?? getCommittedFieldText(item, "cantidad")}
                        inputMode="numeric"
                        error={cantidadDraft?.error ?? null}
                        onChange={(value) => handleLocalFieldChange(item.id, "cantidad", value)}
                        onCommit={(value) => commitQuantity(item, value)}
                      />
                    </div>
                    <div className={s.techSummary}>
                      {techLines.length > 0 ? (
                        <div className={s.techSummaryLines}>
                          {techLines.map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </div>
                      ) : (
                        <span className={s.techSummaryMuted}>Sin cubicación aún</span>
                      )}
                      <button
                        type="button"
                        className={s.viewCutsButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          openDespieceReview(item.id);
                        }}
                      >
                        Ver despiece
                      </button>
                    </div>
                    <footer className={s.cardActions}>
                      <span className={s.cardOrder}>Pieza {index + 1} de {visualItems.length}</span>
                      <div className={s.cardMenu}>
                        <button
                          type="button"
                          className={s.cardMenuTrigger}
                          aria-label={`Acciones de ${item.codigo}`}
                          aria-expanded={actionMenuItemId === item.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            onActiveItemChange(item.id);
                            setActionMenuItemId((current) => (current === item.id ? null : item.id));
                          }}
                        >
                          <LuEllipsis aria-hidden />
                        </button>
                        {actionMenuItemId === item.id ? (
                          <div className={s.cardMenuPanel} onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={() => { onMoveItem(item.id, -1); setActionMenuItemId(null); }} disabled={index === 0} aria-label="Mover pieza a la izquierda"><LuChevronLeft aria-hidden /> Mover antes</button>
                            <button type="button" onClick={() => { onMoveItem(item.id, 1); setActionMenuItemId(null); }} disabled={index === visualItems.length - 1} aria-label="Mover pieza a la derecha"><LuChevronRight aria-hidden /> Mover después</button>
                            <button type="button" onClick={() => { onDuplicateItem(item); setActionMenuItemId(null); }} aria-label="Duplicar pieza"><LuCopy aria-hidden /> Duplicar</button>
                            <button type="button" className={s.dangerAction} onClick={() => { onRemoveItem(item.id); setActionMenuItemId(null); }} aria-label="Eliminar pieza"><LuTrash2 aria-hidden /> Eliminar</button>
                          </div>
                        ) : null}
                      </div>
                    </footer>
                  </article>
                );
              })}
              <button
                type="button"
                className={s.addPieceTile}
                onClick={focusAddBar}
                aria-label="Agregar otra pieza"
              >
                <span className={s.addPieceTileIcon}>
                  <LuPlus aria-hidden />
                </span>
                <strong>Agregar otra pieza</strong>
                <span>Fijo, corredera, puerta y más</span>
              </button>
            </div>
          )}
          {nonVisualCount > 0 ? (
            <p className={s.nonVisualNote}>
              {nonVisualCount} elementos no visuales siguen disponibles en Cotización guiada.
            </p>
          ) : null}
        </div>

        <aside className={s.inspector} aria-label="Propiedades de pieza">
          {activeItem && activeForm && activeConfig && activeView ? (
            <>
              <div className={s.inspectorTitle}>
                <div>
                  <span>Pieza activa</span>
                  <strong>{activeItem.codigo}</strong>
                </div>
                <div className={s.badgeRow}>
                  <span
                    className={
                      activeIsConfirmed || activeEffectivelyComplete ? s.ready : s.pending
                    }
                  >
                    {activeIsConfirmed || activeEffectivelyComplete ? (
                      <LuCheck aria-hidden />
                    ) : (
                      <LuCircleAlert aria-hidden />
                    )}
                    {activeCommercialLabel}
                  </span>
                  <span
                    className={
                      activeView.technicalStatus === "configurado" ? s.techReady : s.techPending
                    }
                  >
                    {activeView.technicalLabel}
                  </span>
                </div>
              </div>

              <div
                className={`${s.checklistPanel} ${
                  activeIsConfirmed
                    ? s.checklistReady
                    : activeRequiredGaps.length > 0
                      ? s.checklistPending
                      : s.checklistSoft
                }`}
                aria-live="polite"
              >
                {activeIsConfirmed ? (
                  <>
                    <div className={s.checklistHeader}>
                      <LuCheck aria-hidden />
                      <strong>Pieza lista</strong>
                    </div>
                    <p>Ya puedes seguir con otra pieza o ir al resumen.</p>
                  </>
                ) : activeRequiredGaps.length > 0 ? (
                  <>
                    <div className={s.checklistHeader}>
                      <LuCircleAlert aria-hidden />
                      <strong>
                        Falta completar {activeRequiredGaps.length}{" "}
                        {activeRequiredGaps.length === 1 ? "dato" : "datos"}
                      </strong>
                    </div>
                    <div className={s.checklistChips}>
                      {activeRequiredGaps.map((gap) => (
                        <button
                          key={gap.id}
                          type="button"
                          className={s.checklistChipRequired}
                          onClick={() => focusGap(gap.target)}
                        >
                          {gap.label}
                        </button>
                      ))}
                    </div>
                    {activeRecommendedGaps.length > 0 ? (
                      <div className={s.checklistChipsSoft}>
                        <span>Recomendado:</span>
                        {activeRecommendedGaps.map((gap) => (
                          <button
                            key={gap.id}
                            type="button"
                            className={s.checklistChipSoft}
                            onClick={() => focusGap(gap.target)}
                          >
                            {gap.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className={s.checklistHeader}>
                      <LuCheck aria-hidden />
                      <strong>Lista para confirmar</strong>
                    </div>
                    <p>Revisa el precio y marca la pieza como lista cuando esté OK.</p>
                    {activeRecommendedGaps.length > 0 ? (
                      <div className={s.checklistChipsSoft}>
                        <span>Opcional:</span>
                        {activeRecommendedGaps.map((gap) => (
                          <button
                            key={gap.id}
                            type="button"
                            className={s.checklistChipSoft}
                            onClick={() => focusGap(gap.target)}
                          >
                            {gap.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className={s.accordionList}>
                <InspectorAccordionSection
                  title="Identificación"
                  isOpen={openSections.has("identificacion")}
                  status={getInspectorSectionStatus(
                    "identificacion",
                    activeView,
                    quotePricingMode,
                    activeItem
                  )}
                  onToggle={() => toggleSection("identificacion")}
                >
                  <EditableInput
                    label="Nombre"
                    value={activeItem.nombre}
                    onCommit={(value) =>
                      value.trim() && onUpdateItem(activeItem.id, { nombre: value.slice(0, 120) })
                    }
                  />
                </InspectorAccordionSection>

                <InspectorAccordionSection
                  title="Sistema y material"
                  isOpen={openSections.has("sistema")}
                  status={getInspectorSectionStatus(
                    "sistema",
                    activeView,
                    quotePricingMode,
                    activeItem
                  )}
                  onToggle={() => toggleSection("sistema")}
                >
                  <div className={s.inspectorField}>
                    <span>Línea comercial</span>
                    <LineTemplatePicker
                      templates={lineTemplates.filter(
                        (template) => template.categoria !== "vidrio"
                      )}
                      value={activeForm.lineTemplateId}
                      onChange={(lineTemplateId) =>
                        onUpdateItem(activeItem.id, { lineTemplateId })
                      }
                      mode="profile"
                      ariaLabel="Elegir línea comercial"
                    />
                  </div>
                  <label className={s.inspectorField}>
                    <span>Material</span>
                    <select
                      value={activeForm.material}
                      onChange={(event) =>
                        onUpdateItem(activeItem.id, {
                          material: event.target.value as "Aluminio" | "PVC",
                        })
                      }
                    >
                      <option value="Aluminio">Aluminio</option>
                      <option value="PVC">PVC</option>
                    </select>
                  </label>
                </InspectorAccordionSection>

                <InspectorAccordionSection
                  title="Vidrio y color"
                  isOpen={openSections.has("vidrio")}
                  status={getInspectorSectionStatus(
                    "vidrio",
                    activeView,
                    quotePricingMode,
                    activeItem
                  )}
                  onToggle={() => toggleSection("vidrio")}
                >
                  <div className={s.inspectorField}>
                    <span>Vidrio</span>
                    <GlassOptionPicker
                      options={glassOptions}
                      value={activeForm.vidrio}
                      onChange={(vidrio) => onUpdateItem(activeItem.id, { vidrio })}
                      ariaLabel="Elegir tipo de vidrio"
                      placeholder="Elegir vidrio"
                    />
                  </div>
                  <div className={s.inspectorField}>
                    <span>Color del perfil</span>
                    <div className={s.colorGrid} role="group" aria-label="Colores del perfil">
                      {COLOR_OPTIONS.map((color) => {
                        const isSelected =
                          color.hex.toLowerCase() === activeForm.colorHex.toLowerCase();
                        return (
                          <button
                            key={color.hex}
                            type="button"
                            className={isSelected ? s.colorSwatchActive : s.colorSwatch}
                            style={{ backgroundColor: color.hex }}
                            aria-label={`Seleccionar ${color.label}`}
                            aria-pressed={isSelected}
                            title={color.label}
                            onClick={() => onUpdateItem(activeItem.id, { colorHex: color.hex })}
                          >
                            {isSelected ? <LuCheck aria-hidden /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <span className={s.selectedColorLabel}>
                      {selectedColor?.label ?? "Color personalizado"}
                    </span>
                    <span className={s.colorField}>
                      <input
                        aria-label="Elegir color personalizado"
                        type="color"
                        value={activeForm.colorHex}
                        onChange={(event) =>
                          onUpdateItem(activeItem.id, { colorHex: event.target.value })
                        }
                      />
                      <input
                        key={activeForm.colorHex}
                        aria-label="Código hexadecimal del color"
                        defaultValue={activeForm.colorHex}
                        onBlur={(event) => {
                          const value = event.currentTarget.value.trim();
                          if (/^#[0-9a-f]{6}$/i.test(value)) {
                            onUpdateItem(activeItem.id, { colorHex: value.toLowerCase() });
                          } else {
                            event.currentTarget.value = activeForm.colorHex;
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                      />
                    </span>
                  </div>
                </InspectorAccordionSection>

                <InspectorAccordionSection
                  title="Apertura y composición"
                  isOpen={openSections.has("apertura")}
                  status={getInspectorSectionStatus(
                    "apertura",
                    activeView,
                    quotePricingMode,
                    activeItem
                  )}
                  onToggle={() => toggleSection("apertura")}
                >
                  <div className={s.openingField}>
                    <span>Sentido de apertura</span>
                    <div>
                      <button
                        type="button"
                        onClick={() => updateOpeningSide("left")}
                        className={
                          listLeafModules(activeConfig.root)[0]?.openingSide !== "right"
                            ? s.selectedChoice
                            : ""
                        }
                      >
                        Izquierda
                      </button>
                      <button
                        type="button"
                        onClick={() => updateOpeningSide("right")}
                        className={
                          listLeafModules(activeConfig.root)[0]?.openingSide === "right"
                            ? s.selectedChoice
                            : ""
                        }
                      >
                        Derecha
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={s.composerButton}
                    onClick={() => setComposerItemId(activeItem.id)}
                  >
                    <LuPencilRuler aria-hidden /> Editar composición
                  </button>
                </InspectorAccordionSection>

                <InspectorAccordionSection
                  title="Cubicación y despiece"
                  isOpen={openSections.has("cubicacion")}
                  status={getInspectorSectionStatus(
                    "cubicacion",
                    activeView,
                    quotePricingMode,
                    activeItem
                  )}
                  onToggle={() => toggleSection("cubicacion")}
                >
                  <DespieceInspectorSummary
                    view={activeView}
                    canRecalculate={Boolean(
                      activeTemplate &&
                        !activeForm.isCustomScheme &&
                        getLineTemplateCuttingRules(activeTemplate.catalogMetadata)?.enabled &&
                        Number(activeForm.ancho) > 0 &&
                        Number(activeForm.alto) > 0
                    )}
                    onOpenReview={() => openDespieceReview(activeItem.id)}
                    onRecalculate={recalculateActiveCubication}
                  />
                </InspectorAccordionSection>

                <InspectorAccordionSection
                  title="Precio"
                  isOpen={openSections.has("precio")}
                  status={getInspectorSectionStatus(
                    "precio",
                    activeView,
                    quotePricingMode,
                    activeItem
                  )}
                  onToggle={() => toggleSection("precio")}
                >
                  <div className={s.priceSectionInner}>
                    {quotePricingMode === "por_item" ? (
                      <>
                        <EditableInput
                          label="Precio unitario"
                          value={formatCurrencyInput(String(activeItem.precioUnitario || ""))}
                          inputMode="numeric"
                          suffix="$"
                          onCommit={(value) =>
                            onUpdateItem(activeItem.id, {
                              costoProveedorUnitario: value.replace(/[^\d]/g, ""),
                              markPriceManual: true,
                            })
                          }
                        />
                        {activeItem.precioAjustadoManual && activeForm.lineTemplateId ? (
                          <button
                            type="button"
                            className={s.secondaryButton}
                            onClick={() => onRecalculateTemplatePrice(activeItem.id)}
                          >
                            Recalcular con plantilla
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <EditableInput
                        label="Total del presupuesto"
                        value={totalClienteManual ? formatCurrencyInput(String(totalClienteManual)) : ""}
                        inputMode="numeric"
                        suffix="$"
                        onCommit={onGlobalTotalChange}
                      />
                    )}
                  </div>
                </InspectorAccordionSection>
              </div>

              <div className={s.inspectorFooter}>
                <button
                  type="button"
                  className={
                    activeIsConfirmed
                      ? s.confirmPieceDone
                      : activeEffectivelyComplete
                        ? s.confirmPieceReady
                        : s.confirmPieceBlocked
                  }
                  onClick={
                    activeIsConfirmed && incompleteCount === 0
                      ? onGoToSummary
                      : confirmActivePiece
                  }
                >
                  {activeIsConfirmed ? (
                    incompleteCount === 0 ? (
                      <>
                        Ir al resumen
                        <LuArrowRight aria-hidden />
                      </>
                    ) : (
                      <>
                        <LuCheck aria-hidden />
                        Pieza confirmada
                      </>
                    )
                  ) : activeEffectivelyComplete ? (
                    <>
                      <LuCheck aria-hidden />
                      Confirmar pieza lista
                    </>
                  ) : (
                    <>Completar lo pendiente</>
                  )}
                </button>
                <button
                  type="button"
                  className={s.advancedButton}
                  onClick={() => onEditAdvanced(activeItem)}
                >
                  Abrir configuración guiada
                </button>
              </div>
            </>
          ) : (
            <div className={s.inspectorEmpty}>
              <LuPlus aria-hidden />
              <strong>Sin pieza seleccionada</strong>
              <p>Agrega un tipo arriba o elige una tarjeta del cuaderno.</p>
              <button type="button" className={s.emptyFocusAdd} onClick={focusAddBar}>
                Ir a agregar pieza
              </button>
            </div>
          )}
        </aside>
      </div>

      <footer className={s.workspaceFooter}>
        <div>
          <span>Progreso del presupuesto</span>
          <strong>{completeCount} de {visualItems.length} piezas completas</strong>
        </div>
        <button
          type="button"
          onClick={canContinue ? onGoToSummary : reviewPending}
          disabled={visualItems.length === 0}
          className={canContinue ? s.continueButton : s.pendingButton}
        >
          {footerActionLabel}
          <LuArrowRight aria-hidden />
        </button>
      </footer>

      {composerItem ? (
        <GuidedVisualComposer
          open
          config={inferConfig(composerItem)}
          colorHex={mapItemToForm(composerItem).colorHex}
          pieceTitle={composerItem.nombre}
          onChange={() => undefined}
          onApply={(config: GuidedVisualConfig) => {
            const suggestedName = resolveQuoteConstructorCommercialName(config);
            onUpdateItem(composerItem.id, {
              ancho: String(config.widthMm),
              alto: String(config.heightMm),
              guidedVisualConfig: config,
              nombre: suggestedName ?? "",
            });
            setComposerItemId(null);
          }}
          onClose={() => setComposerItemId(null)}
        />
      ) : null}
    </section>
  );
}
