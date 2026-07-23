"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuArrowRight,
  LuCircleAlert,
  LuPencil,
  LuX,
} from "react-icons/lu";

import { CubicationAdjustmentChoiceDialog } from "@/components/ui/cubication-adjustment-choice-dialog";
import {
  getLineTemplateCuttingRules,
  type CotizacionLineTemplate,
  type CotizacionLineTemplateCut,
  type CotizacionLineTemplateCuttingPreview,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { buildConsolidatedCubicationPautaFromSnapshots } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import {
  summarizeCubicationLineAdjustment,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-adjustment";
import {
  buildCubicationSnapshotFromCatalogMetadata,
  buildPersonalizadoManualCubicationDraft,
  createEmptyCubicationCutDraft,
  cubicationSnapshotToPreview,
  GEOMETRIC_FALLBACK_NOTICE,
  isGeometricFallbackSnapshot,
  rebuildCubicationSnapshotWithCuts,
  snapshotUsesFabricationRecipe,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { RECIPE_MISSING_PROFILE_LABEL } from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { resolveRecipeFromMetadata } from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";
import {
  buildPieceDomainView,
  type PieceDomainView,
} from "@/features/cotizaciones/new-quote/quote-piece-domain";
import {
  isCubicationPersonalizadoAssistMode,
  mapItemToForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  resolveActiveCubicationSnapshot,
} from "../../../../../app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/pauta-cubicacion-panel";
import {
  createQuoteConstructorPresetConfig,
  getQuoteConstructorItemConfig,
  isQuoteConstructorCompatibleItem,
  type QuoteConstructorItemPatch,
  type QuoteConstructorPresetId,
} from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";

import styles from "./despiece-review-surface.module.css";

type ReviewTab = "pieza" | "consolidado";

type DespieceUiStatus =
  | "calculado_con_receta"
  | "configuracion_incompleta"
  | "estimacion_geometrica"
  | "sin_reglas";

const DESPIECE_UI_STATUS_LABELS: Record<DespieceUiStatus, string> = {
  calculado_con_receta: "Calculado con receta",
  configuracion_incompleta: "Configuración incompleta",
  estimacion_geometrica: "Estimación geométrica",
  sin_reglas: "Sin reglas técnicas",
};

const BARS_NOT_CALCULABLE_HINT =
  "Configura el código del perfil y el largo comercial de la barra.";
const BARS_INCOMPLETE_WARNING =
  "Faltan códigos de perfil y largos comerciales para calcular barras y sobrantes.";
const GLASS_PRELIMINARY_WARNING =
  "Medida preliminar basada en el ancho y alto de la pieza. Confirma los descuentos de vidrio de esta línea.";

type Props = {
  open: boolean;
  items: CotizacionWorkflowItem[];
  lineTemplates: CotizacionLineTemplate[];
  quotePricingMode: QuotePricingMode;
  activeItemId: string | null;
  onActiveItemChange: (itemId: string) => void;
  onUpdateItem: (itemId: string, patch: QuoteConstructorItemPatch) => void;
  onClose: () => void;
  onContinueToSummary: () => void;
  onSaveCubicationLineAdjustment?: (input?: {
    itemId?: string;
    snapshot?: CotizacionItemCubicationSnapshot | null;
  }) => Promise<void> | void;
  isSavingCubicationLineAdjustment?: boolean;
};

function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
}

function formatM2(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m²`;
}

function formatMl(value: number) {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ml`;
}

function resolveLineTemplate(
  lineTemplates: CotizacionLineTemplate[],
  lineTemplateId: string
) {
  if (!lineTemplateId) return null;
  return lineTemplates.find((template) => String(template.id) === lineTemplateId) ?? null;
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
          ? item.tipo.toLocaleLowerCase("es") === "puerta"
            ? "puerta"
            : "abatible"
          : "fijo";
  return createQuoteConstructorPresetConfig(preset, {
    widthMm: item.ancho ?? 1200,
    heightMm: item.alto ?? 1000,
  });
}

function despieceStatusToneClass(status: DespieceUiStatus) {
  switch (status) {
    case "calculado_con_receta":
      return styles.statusOk;
    case "configuracion_incompleta":
    case "estimacion_geometrica":
      return styles.statusWarn;
    case "sin_reglas":
    default:
      return styles.statusMuted;
  }
}

function isMissingProfileLabel(label: string) {
  const normalized = label.trim().toLocaleLowerCase("es");
  return (
    !normalized ||
    normalized === RECIPE_MISSING_PROFILE_LABEL.toLocaleLowerCase("es") ||
    normalized === "por asignar"
  );
}

function areBarsCalculable(preview: CotizacionLineTemplateCuttingPreview | null) {
  if (!preview || preview.bars.length === 0) return false;
  return preview.cuts.some((cut) => !isMissingProfileLabel(cut.label));
}

function countCutUnits(cuts: CotizacionLineTemplateCut[]) {
  return cuts.reduce((sum, cut) => sum + Math.max(1, cut.quantity), 0);
}

function resolveDespieceUiStatus(input: {
  snapshot: CotizacionItemCubicationSnapshot | null;
  preview: CotizacionLineTemplateCuttingPreview | null;
  template: CotizacionLineTemplate | null;
}): DespieceUiStatus {
  const { snapshot, preview, template } = input;
  if (isGeometricFallbackSnapshot(snapshot)) {
    return "estimacion_geometrica";
  }

  const recipeApplied =
    snapshotUsesFabricationRecipe(snapshot) || snapshot?.estimationKind === "recipe";
  if (recipeApplied && preview && preview.cuts.length > 0) {
    return "calculado_con_receta";
  }

  const recipeOnTemplate = template
    ? resolveRecipeFromMetadata(template.catalogMetadata)
    : null;
  if (recipeOnTemplate && recipeOnTemplate.components.length > 0) {
    return "configuracion_incompleta";
  }

  if (!preview || preview.cuts.length === 0) {
    return "sin_reglas";
  }

  return "configuracion_incompleta";
}

function parsePositiveIntegerInput(value: string, fallback = 0) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function DespieceReviewSurface({
  open,
  items,
  lineTemplates,
  quotePricingMode,
  activeItemId,
  onActiveItemChange,
  onUpdateItem,
  onClose,
  onContinueToSummary,
  onSaveCubicationLineAdjustment,
  isSavingCubicationLineAdjustment,
}: Props) {
  const [tab, setTab] = useState<ReviewTab>("pieza");
  const [mounted, setMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdjustmentChoiceOpen, setIsAdjustmentChoiceOpen] = useState(false);
  const [hasOfferedAdjustmentChoice, setHasOfferedAdjustmentChoice] = useState(false);
  const [pendingAdjustmentSnapshot, setPendingAdjustmentSnapshot] =
    useState<CotizacionItemCubicationSnapshot | null>(null);
  const scrollRestoreRef = useRef(0);
  const visualItems = useMemo(
    () => items.filter(isQuoteConstructorCompatibleItem),
    [items]
  );
  const selectedItem =
    visualItems.find((item) => item.id === activeItemId) ?? visualItems[0] ?? null;
  const selectedForm = selectedItem ? mapItemToForm(selectedItem) : null;
  const selectedTemplate = selectedForm
    ? resolveLineTemplate(lineTemplates, selectedForm.lineTemplateId)
    : null;
  const selectedView = selectedItem
    ? buildPieceDomainView(selectedItem, quotePricingMode, selectedTemplate)
    : null;
  const personalizadoAssistMode = selectedForm
    ? isCubicationPersonalizadoAssistMode({
        tipo: selectedForm.tipo,
        sistema: selectedForm.sistema,
        sheetScheme: selectedForm.sheetScheme,
        configuracion: selectedForm.configuracion,
        isCustomScheme: selectedForm.isCustomScheme,
      })
    : false;
  const activeSnapshot = selectedForm
    ? resolveActiveCubicationSnapshot({
        componentForm: {
          ancho: selectedForm.ancho,
          alto: selectedForm.alto,
          cantidad: selectedForm.cantidad,
          lineTemplateId: selectedForm.lineTemplateId,
          cubicationSnapshot: selectedForm.cubicationSnapshot,
        },
        selectedTemplate,
        savedCubicationSnapshot: selectedView?.cubicationSnapshot,
        personalizadoAssistMode,
      })
    : null;
  const preview = activeSnapshot ? cubicationSnapshotToPreview(activeSnapshot) : null;
  const rules = selectedTemplate
    ? getLineTemplateCuttingRules(selectedTemplate.catalogMetadata)
    : null;
  const autoSnapshot = useMemo(() => {
    if (
      !selectedForm ||
      !selectedTemplate ||
      personalizadoAssistMode ||
      !rules?.enabled
    ) {
      return null;
    }
    const widthMm = parsePositiveIntegerInput(selectedForm.ancho);
    const heightMm = parsePositiveIntegerInput(selectedForm.alto);
    const quantity = parsePositiveIntegerInput(selectedForm.cantidad, 1);
    if (widthMm <= 0 || heightMm <= 0) return null;
    return buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: String(selectedTemplate.id),
      catalogMetadata: selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  }, [selectedForm, selectedTemplate, personalizadoAssistMode, rules?.enabled]);
  const adjustmentSummary = useMemo(() => {
    if (
      !selectedTemplate ||
      !activeSnapshot ||
      activeSnapshot.source !== "manual" ||
      !autoSnapshot
    ) {
      return null;
    }
    return summarizeCubicationLineAdjustment({
      catalogMetadata: selectedTemplate.catalogMetadata,
      cuts: activeSnapshot.cuts,
      widthMm: activeSnapshot.widthMm,
      heightMm: activeSnapshot.heightMm,
      sashCount: rules?.sashCount,
      autoCuts: autoSnapshot.cuts,
      autoGlass: autoSnapshot.glass,
      manualGlass: activeSnapshot.glass,
    });
  }, [selectedTemplate, activeSnapshot, autoSnapshot, rules?.sashCount]);
  const consolidated = useMemo(() => {
    const carriers = visualItems
      .map((item) => {
        const form = mapItemToForm(item);
        const template = resolveLineTemplate(lineTemplates, form.lineTemplateId);
        const view = buildPieceDomainView(item, quotePricingMode, template);
        const personalizado = isCubicationPersonalizadoAssistMode({
          tipo: form.tipo,
          sistema: form.sistema,
          sheetScheme: form.sheetScheme,
          configuracion: form.configuracion,
          isCustomScheme: form.isCustomScheme,
        });
        const snapshot = resolveActiveCubicationSnapshot({
          componentForm: {
            ancho: form.ancho,
            alto: form.alto,
            cantidad: form.cantidad,
            lineTemplateId: form.lineTemplateId,
            cubicationSnapshot: form.cubicationSnapshot,
          },
          selectedTemplate: template,
          savedCubicationSnapshot: view.cubicationSnapshot,
          personalizadoAssistMode: personalizado,
        });
        if (!snapshot) return null;
        return {
          codigo: item.codigo,
          lineaComercial: item.lineaComercial || template?.nombre || null,
          nombre: item.nombre,
          snapshot,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    return buildConsolidatedCubicationPautaFromSnapshots(carriers);
  }, [visualItems, lineTemplates, quotePricingMode]);
  const consolidatedCutUnits = useMemo(
    () => consolidated.rows.reduce((sum, row) => sum + Math.max(1, row.quantity), 0),
    [consolidated.rows]
  );
  const consolidatedBarsCalculable = useMemo(
    () =>
      consolidated.totalBars > 0 &&
      consolidated.rows.some((row) => !isMissingProfileLabel(row.profile)),
    [consolidated.totalBars, consolidated.rows]
  );
  const warnings = useMemo(() => {
    return visualItems
      .map((item) => {
        const form = mapItemToForm(item);
        const template = resolveLineTemplate(lineTemplates, form.lineTemplateId);
        const view = buildPieceDomainView(item, quotePricingMode, template);
        const personalizado = isCubicationPersonalizadoAssistMode({
          tipo: form.tipo,
          sistema: form.sistema,
          sheetScheme: form.sheetScheme,
          configuracion: form.configuracion,
          isCustomScheme: form.isCustomScheme,
        });
        const snapshot = resolveActiveCubicationSnapshot({
          componentForm: {
            ancho: form.ancho,
            alto: form.alto,
            cantidad: form.cantidad,
            lineTemplateId: form.lineTemplateId,
            cubicationSnapshot: form.cubicationSnapshot,
          },
          selectedTemplate: template,
          savedCubicationSnapshot: view.cubicationSnapshot,
          personalizadoAssistMode: personalizado,
        });
        const previewForItem = snapshot ? cubicationSnapshotToPreview(snapshot) : null;
        const uiStatus = resolveDespieceUiStatus({
          snapshot,
          preview: previewForItem,
          template,
        });
        return { item, view, uiStatus };
      })
      .filter(
        ({ uiStatus }) =>
          uiStatus === "sin_reglas" ||
          uiStatus === "configuracion_incompleta" ||
          uiStatus === "estimacion_geometrica"
      );
  }, [visualItems, lineTemplates, quotePricingMode]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollRestoreRef.current = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      window.scrollTo({ top: scrollRestoreRef.current });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!activeItemId && visualItems[0]) {
      onActiveItemChange(visualItems[0].id);
    }
  }, [open, activeItemId, visualItems, onActiveItemChange]);

  useEffect(() => {
    setHasOfferedAdjustmentChoice(false);
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    setIsEditMode(false);
  }, [selectedItem?.id, selectedForm?.lineTemplateId]);

  useEffect(() => {
    if (tab !== "pieza") setIsEditMode(false);
  }, [tab]);

  if (!open || !mounted || typeof document === "undefined") {
    return null;
  }

  const commitSnapshot = (next: CotizacionItemCubicationSnapshot | null) => {
    if (!selectedItem) return;
    onUpdateItem(selectedItem.id, { cubicationSnapshot: next });
  };

  const ensureEditableBase = () => {
    if (activeSnapshot) return activeSnapshot;
    if (!selectedForm || !selectedTemplate) return null;
    const widthMm = parsePositiveIntegerInput(selectedForm.ancho);
    const heightMm = parsePositiveIntegerInput(selectedForm.alto);
    const quantity = parsePositiveIntegerInput(selectedForm.cantidad, 1);
    if (personalizadoAssistMode) {
      return buildPersonalizadoManualCubicationDraft({
        lineTemplateId: String(selectedTemplate.id),
        catalogMetadata: selectedTemplate.catalogMetadata,
        widthMm,
        heightMm,
        quantity,
      });
    }
    if (!rules?.enabled || widthMm <= 0 || heightMm <= 0) return null;
    return buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: String(selectedTemplate.id),
      catalogMetadata: selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  };

  const handleCutFieldChange = (
    cutIndex: number,
    field: "label" | "functionLabel" | "lengthMm" | "quantity",
    value: string
  ) => {
    const base = ensureEditableBase();
    if (!base || !selectedItem) return;
    const previousLength = base.cuts[cutIndex]?.lengthMm;
    const nextCuts = base.cuts.map((cut, index) => {
      if (index !== cutIndex) return cut;
      if (field === "label" || field === "functionLabel") {
        return { ...cut, [field]: value };
      }
      const numeric = parsePositiveIntegerInput(value, 1);
      return {
        ...cut,
        [field]: numeric,
        totalLinealMm:
          field === "lengthMm" ? numeric * cut.quantity : cut.lengthMm * numeric,
      };
    });
    const nextSnapshot = rebuildCubicationSnapshotWithCuts(base, nextCuts, {
      source: "manual",
      barLengthMm: rules?.barLengthMm,
      sawKerfMm: rules?.sawKerfMm,
    });
    commitSnapshot(nextSnapshot);

    if (
      field === "lengthMm" &&
      !personalizadoAssistMode &&
      onSaveCubicationLineAdjustment &&
      !hasOfferedAdjustmentChoice
    ) {
      const nextLength = parsePositiveIntegerInput(value, 1);
      if (previousLength != null && previousLength !== nextLength) {
        setHasOfferedAdjustmentChoice(true);
        setPendingAdjustmentSnapshot(nextSnapshot);
        setIsAdjustmentChoiceOpen(true);
      }
    }
  };

  const handleAddCut = () => {
    const base = ensureEditableBase();
    if (!base) return;
    commitSnapshot(
      rebuildCubicationSnapshotWithCuts(base, [...base.cuts, createEmptyCubicationCutDraft()], {
        source: "manual",
        barLengthMm: rules?.barLengthMm,
        sawKerfMm: rules?.sawKerfMm,
      })
    );
  };

  const handleRemoveCut = (cutIndex: number) => {
    const base = ensureEditableBase();
    if (!base || base.cuts.length <= 1) return;
    commitSnapshot(
      rebuildCubicationSnapshotWithCuts(
        base,
        base.cuts.filter((_, index) => index !== cutIndex),
        {
          source: "manual",
          barLengthMm: rules?.barLengthMm,
          sawKerfMm: rules?.sawKerfMm,
        }
      )
    );
  };

  const handleRecalcular = () => {
    if (!selectedForm || !selectedTemplate || personalizadoAssistMode) return;
    const widthMm = parsePositiveIntegerInput(selectedForm.ancho);
    const heightMm = parsePositiveIntegerInput(selectedForm.alto);
    const quantity = parsePositiveIntegerInput(selectedForm.cantidad, 1);
    if (!rules?.enabled || widthMm <= 0 || heightMm <= 0) return;
    const next = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: String(selectedTemplate.id),
      catalogMetadata: selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
    setHasOfferedAdjustmentChoice(false);
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    if (next) commitSnapshot(next);
  };

  const handleRestaurar = () => {
    handleRecalcular();
  };

  const handleGuardarAjusteLinea = () => {
    if (!onSaveCubicationLineAdjustment || activeSnapshot?.source !== "manual") {
      return;
    }
    setPendingAdjustmentSnapshot(activeSnapshot);
    setIsAdjustmentChoiceOpen(true);
  };

  const handleKeepQuoteOnly = () => {
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
  };

  const handleConfirmSaveToLine = () => {
    if (!selectedItem) return;
    const snapshot =
      pendingAdjustmentSnapshot?.source === "manual"
        ? pendingAdjustmentSnapshot
        : activeSnapshot?.source === "manual"
          ? activeSnapshot
          : null;
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    void onSaveCubicationLineAdjustment?.({
      itemId: selectedItem.id,
      snapshot,
    });
  };

  const areaCalculated =
    selectedView?.technicalSummary.areaVidrioM2 ??
    selectedView?.technicalSummary.areaVanoM2 ??
    null;
  const areaProjected = selectedView?.technicalSummary.areaVanoM2 ?? null;
  const glassYield =
    areaCalculated != null && areaProjected != null && areaProjected > 0
      ? Math.min(100, Math.round((areaCalculated / areaProjected) * 100))
      : null;

  const pieceUiStatus = resolveDespieceUiStatus({
    snapshot: activeSnapshot,
    preview,
    template: selectedTemplate,
  });
  const barsCalculable = areBarsCalculable(preview);
  const cutUnits = preview ? countCutUnits(preview.cuts) : 0;
  const showBarsIncompleteWarning =
    pieceUiStatus === "calculado_con_receta" && !barsCalculable;

  const config = selectedItem ? inferConfig(selectedItem) : null;
  const colorHex = selectedForm?.colorHex;

  return createPortal(
    <>
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Revisión de despiece">
      <div className={styles.surface}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Componentes</p>
            <h2>Revisión de despiece</h2>
          </div>
          <div className={styles.tabs} role="tablist" aria-label="Vista de despiece">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "pieza"}
              className={tab === "pieza" ? styles.tabActive : styles.tab}
              onClick={() => setTab("pieza")}
            >
              Por pieza
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "consolidado"}
              className={tab === "consolidado" ? styles.tabActive : styles.tab}
              onClick={() => setTab("consolidado")}
            >
              Consolidado
            </button>
          </div>
          <button type="button" className={styles.closeButton} aria-label="Cerrar revisión" onClick={onClose}>
            <LuX aria-hidden />
          </button>
        </header>

        {tab === "pieza" ? (
          <div className={styles.pieceLayout}>
            <aside className={styles.pieceList} aria-label="Piezas de la cotización">
              <p className={styles.listEyebrow}>Piezas</p>
              <ul>
                {visualItems.map((item) => {
                  const form = mapItemToForm(item);
                  const template = resolveLineTemplate(lineTemplates, form.lineTemplateId);
                  const view = buildPieceDomainView(item, quotePricingMode, template);
                  const personalizado = isCubicationPersonalizadoAssistMode({
                    tipo: form.tipo,
                    sistema: form.sistema,
                    sheetScheme: form.sheetScheme,
                    configuracion: form.configuracion,
                    isCustomScheme: form.isCustomScheme,
                  });
                  const snapshot = resolveActiveCubicationSnapshot({
                    componentForm: {
                      ancho: form.ancho,
                      alto: form.alto,
                      cantidad: form.cantidad,
                      lineTemplateId: form.lineTemplateId,
                      cubicationSnapshot: form.cubicationSnapshot,
                    },
                    selectedTemplate: template,
                    savedCubicationSnapshot: view.cubicationSnapshot,
                    personalizadoAssistMode: personalizado,
                  });
                  const itemPreview = snapshot ? cubicationSnapshotToPreview(snapshot) : null;
                  const uiStatus = resolveDespieceUiStatus({
                    snapshot,
                    preview: itemPreview,
                    template,
                  });
                  const selected = selectedItem?.id === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={selected ? styles.pieceListItemActive : styles.pieceListItem}
                        onClick={() => onActiveItemChange(item.id)}
                      >
                        <strong>
                          {item.codigo} {item.nombre || "Sin nombre"}
                        </strong>
                        <em className={despieceStatusToneClass(uiStatus)}>
                          {DESPIECE_UI_STATUS_LABELS[uiStatus]}
                        </em>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section className={styles.pieceDetail} aria-label="Detalle de pieza">
              {selectedItem && selectedView && selectedForm ? (
                <>
                  <header className={styles.detailHead}>
                    <div>
                      <h3>
                        {selectedItem.codigo} — {selectedItem.nombre || "Sin nombre"}
                      </h3>
                      <p>
                        Medidas: {formatMm(selectedItem.ancho ?? 0)} ×{" "}
                        {formatMm(selectedItem.alto ?? 0)}
                        {selectedTemplate ? ` · Línea: ${selectedTemplate.nombre}` : ""}
                        {selectedTemplate?.proveedor
                          ? ` · Serie: ${selectedTemplate.proveedor}`
                          : selectedItem.lineaComercial
                            ? ` · ${selectedItem.lineaComercial}`
                            : ""}
                      </p>
                    </div>
                    <em className={despieceStatusToneClass(pieceUiStatus)}>
                      {DESPIECE_UI_STATUS_LABELS[pieceUiStatus]}
                    </em>
                  </header>

                  {showBarsIncompleteWarning ? (
                    <p className={styles.compactWarning} role="status">
                      <LuCircleAlert aria-hidden />
                      {BARS_INCOMPLETE_WARNING}
                    </p>
                  ) : null}
                  {isGeometricFallbackSnapshot(activeSnapshot) ? (
                    <p className={styles.compactWarning} role="status">
                      <LuCircleAlert aria-hidden />
                      {GEOMETRIC_FALLBACK_NOTICE}
                    </p>
                  ) : null}

                  <div className={styles.visualMetrics}>
                    <div className={styles.drawingCard}>
                      {config ? (
                        <div
                          className={styles.drawing}
                          dangerouslySetInnerHTML={{
                            __html: renderGuidedVisualSvg(config, {
                              maxW: 280,
                              maxH: 180,
                              variant: "summary",
                              colorHex,
                            }),
                          }}
                        />
                      ) : (
                        <p className={styles.emptyDrawing}>Sin croquis</p>
                      )}
                    </div>
                    <div className={styles.metricGrid}>
                      <span>
                        <small>Vidrio</small>
                        <strong>
                          {preview?.glass ? formatM2(preview.glass.totalM2) : "—"}
                        </strong>
                        <em>
                          {preview?.glass
                            ? `${preview.glass.quantity} ${
                                preview.glass.quantity === 1 ? "unidad" : "unidades"
                              }`
                            : "Sin dato"}
                        </em>
                      </span>
                      <span>
                        <small>Perfiles</small>
                        <strong>
                          {preview
                            ? formatMm(preview.totalProfilesLinealMm)
                            : "—"}
                        </strong>
                        <em>
                          {preview
                            ? `${cutUnits} ${cutUnits === 1 ? "corte" : "cortes"}`
                            : "Sin cortes"}
                        </em>
                      </span>
                      <span>
                        <small>Barras</small>
                        <strong className={!barsCalculable ? styles.notCalculable : undefined}>
                          {barsCalculable ? preview?.bars.length ?? 0 : "No calculable"}
                        </strong>
                        <em>{barsCalculable ? "referencia" : "Falta código y largo"}</em>
                      </span>
                      <span>
                        <small>Accesorios</small>
                        <strong>{preview?.accessoryUnits ?? 0}</strong>
                        <em>unidades</em>
                      </span>
                    </div>
                  </div>

                  {preview?.glass ? (
                    <p className={styles.glassNote} role="note">
                      <LuCircleAlert aria-hidden />
                      {GLASS_PRELIMINARY_WARNING}
                    </p>
                  ) : null}

                  <div className={styles.tableBlock}>
                    <div className={styles.tableToolbar}>
                      <strong>Despiece de perfiles</strong>
                      <div className={styles.tableActions}>
                        <button
                          type="button"
                          className={isEditMode ? styles.editModeActive : styles.editModeButton}
                          onClick={() => setIsEditMode((current) => !current)}
                        >
                          <LuPencil aria-hidden />
                          {isEditMode ? "Listo" : "Editar despiece"}
                        </button>
                        {isEditMode && !personalizadoAssistMode ? (
                          <>
                            <button type="button" onClick={handleRecalcular} disabled={!rules?.enabled && !activeSnapshot}>
                              Recalcular
                            </button>
                            <button
                              type="button"
                              onClick={handleRestaurar}
                              disabled={activeSnapshot?.source !== "manual"}
                            >
                              Restaurar cálculo
                            </button>
                            {onSaveCubicationLineAdjustment ? (
                              <button
                                type="button"
                                onClick={handleGuardarAjusteLinea}
                                disabled={
                                  activeSnapshot?.source !== "manual" ||
                                  Boolean(isSavingCubicationLineAdjustment)
                                }
                              >
                                {isSavingCubicationLineAdjustment
                                  ? "Guardando…"
                                  : "Guardar ajuste para esta línea"}
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        {isEditMode ? (
                          <button type="button" onClick={handleAddCut} disabled={!ensureEditableBase()}>
                            Agregar corte
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {preview && preview.cuts.length > 0 ? (
                      <div
                        className={`${styles.table} ${isEditMode ? styles.tableEditing : styles.tableReading}`}
                        role="table"
                        aria-label="Despiece de perfiles"
                      >
                        <div className={styles.tableHead} role="row">
                          <span role="columnheader">Perfil</span>
                          <span role="columnheader">Función</span>
                          <span role="columnheader">Medida</span>
                          <span role="columnheader">Cant.</span>
                          <span role="columnheader">Total lineal</span>
                          {isEditMode ? (
                            <span role="columnheader">
                              <span className={styles.srOnly}>Quitar</span>
                            </span>
                          ) : null}
                        </div>
                        {preview.cuts.map((cut: CotizacionLineTemplateCut, cutIndex: number) => {
                          const missingProfile = isMissingProfileLabel(cut.label);
                          return (
                            <div
                              key={`cut-${cutIndex}`}
                              className={`${styles.tableRow} ${
                                missingProfile ? styles.rowMissingProfile : ""
                              }`}
                              role="row"
                            >
                              {isEditMode ? (
                                <label>
                                  <span className={styles.srOnly}>Perfil</span>
                                  <input
                                    value={cut.label}
                                    onChange={(event) =>
                                      handleCutFieldChange(cutIndex, "label", event.target.value)
                                    }
                                  />
                                </label>
                              ) : (
                                <span
                                  role="cell"
                                  className={`${styles.readCell} ${
                                    missingProfile ? styles.missingProfileChip : ""
                                  }`}
                                >
                                  {cut.label || RECIPE_MISSING_PROFILE_LABEL}
                                </span>
                              )}
                              {isEditMode ? (
                                <label className={styles.functionEditCell}>
                                  <span className={styles.srOnly}>Función</span>
                                  <input
                                    value={cut.functionLabel}
                                    onChange={(event) =>
                                      handleCutFieldChange(
                                        cutIndex,
                                        "functionLabel",
                                        event.target.value
                                      )
                                    }
                                  />
                                  {cut.measureExplanation ? (
                                    <small className={styles.formulaLine}>
                                      {cut.measureExplanation}
                                    </small>
                                  ) : null}
                                </label>
                              ) : (
                                <span role="cell" className={styles.functionReadCell}>
                                  <strong>{cut.functionLabel}</strong>
                                  {cut.measureExplanation ? (
                                    <small className={styles.formulaLine}>
                                      {cut.measureExplanation}
                                    </small>
                                  ) : null}
                                </span>
                              )}
                              {isEditMode ? (
                                <label>
                                  <span className={styles.srOnly}>Medida mm</span>
                                  <input
                                    inputMode="numeric"
                                    value={String(cut.lengthMm)}
                                    onChange={(event) =>
                                      handleCutFieldChange(cutIndex, "lengthMm", event.target.value)
                                    }
                                  />
                                </label>
                              ) : (
                                <span role="cell" className={`${styles.readCell} ${styles.numCell}`}>
                                  {formatMm(cut.lengthMm)}
                                </span>
                              )}
                              {isEditMode ? (
                                <label>
                                  <span className={styles.srOnly}>Cantidad</span>
                                  <input
                                    inputMode="numeric"
                                    value={String(cut.quantity)}
                                    onChange={(event) =>
                                      handleCutFieldChange(cutIndex, "quantity", event.target.value)
                                    }
                                  />
                                </label>
                              ) : (
                                <span role="cell" className={`${styles.readCell} ${styles.numCell}`}>
                                  {cut.quantity}
                                </span>
                              )}
                              <strong role="cell" className={styles.totalCell}>
                                {formatMm(cut.totalLinealMm)}
                              </strong>
                              {isEditMode ? (
                                <button
                                  type="button"
                                  aria-label="Quitar corte"
                                  disabled={preview.cuts.length <= 1}
                                  onClick={() => handleRemoveCut(cutIndex)}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                        <div className={styles.tableFoot} role="row">
                          <span>Total perfiles</span>
                          <strong>{formatMm(preview.totalProfilesLinealMm)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.emptyTable}>
                        {pieceUiStatus === "sin_reglas"
                          ? "Esta pieza no tiene reglas técnicas de cubicación. Puedes cotizar igual; define la pauta cuando el taller la tenga."
                          : "Aún no hay cortes para esta pieza. Completa línea y medidas, o agrega cortes manualmente."}
                      </div>
                    )}
                    {activeSnapshot?.source === "manual" ? (
                      <p className={styles.manualNote}>
                        Ajuste solo para esta cotización. No cambia el catálogo.
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className={styles.emptyTable}>Selecciona una pieza para revisar su despiece.</div>
              )}
            </section>

            <aside className={styles.summaryRail} aria-label="Resumen de resultados">
              <p className={styles.listEyebrow}>Resumen</p>
              <div className={styles.summaryCard}>
                <span>
                  <small>Área calculada</small>
                  <strong>{areaCalculated != null ? formatM2(areaCalculated) : "—"}</strong>
                </span>
                <span>
                  <small>Área proyectada</small>
                  <strong>{areaProjected != null ? formatM2(areaProjected) : "—"}</strong>
                </span>
                <span>
                  <small>Aprovechamiento de vidrio</small>
                  <strong>{glassYield != null ? `${glassYield}%` : "—"}</strong>
                </span>
              </div>

              <div className={styles.summaryCard}>
                <span>
                  <small>Cortes totales</small>
                  <strong>{cutUnits}</strong>
                </span>
                <span>
                  <small>Accesorios</small>
                  <strong>{preview?.accessoryUnits ?? 0}</strong>
                </span>
                <span>
                  <small>Barras</small>
                  <strong className={!barsCalculable ? styles.notCalculable : undefined}>
                    {barsCalculable ? preview?.bars.length ?? 0 : "No calculable"}
                  </strong>
                </span>
                <span>
                  <small>Sobrantes</small>
                  <strong className={!barsCalculable ? styles.notCalculable : undefined}>
                    {barsCalculable
                      ? formatMm(preview?.totalWasteMm ?? 0)
                      : "No calculable"}
                  </strong>
                </span>
                {!barsCalculable ? (
                  <p className={styles.barMeta}>{BARS_NOT_CALCULABLE_HINT}</p>
                ) : null}
              </div>

              {warnings.length > 0 ? (
                <div className={styles.warnings}>
                  <strong>
                    <LuCircleAlert aria-hidden /> Atención
                  </strong>
                  <ul>
                    {warnings.slice(0, 4).map(({ item, uiStatus }) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => onActiveItemChange(item.id)}>
                          {item.codigo}: {DESPIECE_UI_STATUS_LABELS[uiStatus]}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        ) : (
          <div className={styles.consolidatedLayout}>
            <header className={styles.consolidatedHead}>
              <div>
                <h3>Despiece consolidado</h3>
                <p className={styles.consolidatedSubtitle}>
                  Agrupado por línea, código de perfil, función y medida.
                </p>
                <p>
                  {consolidated.itemCountWithPauta}{" "}
                  {consolidated.itemCountWithPauta === 1 ? "pieza" : "piezas"} ·{" "}
                  {consolidatedCutUnits} cortes ·{" "}
                  {formatMl(consolidated.totalProfilesLinealMm / 1000)} perfiles ·{" "}
                  {formatM2(consolidated.totalGlassM2)} vidrio · {consolidated.totalAccessories}{" "}
                  accesorios
                </p>
              </div>
              {!consolidatedBarsCalculable ? (
                <p className={styles.compactWarning} role="status">
                  <LuCircleAlert aria-hidden />
                  Barras no calculables · falta largo comercial y código de perfil
                </p>
              ) : null}
            </header>

            {consolidated.lineGroups.length === 0 ? (
              <div className={styles.emptyTable}>
                Todavía no hay despiece consolidable. Revisa piezas con línea, medidas y cortes.
              </div>
            ) : (
              consolidated.lineGroups.map((group) => {
                const groupBarsCalculable =
                  group.bars > 0 &&
                  group.rows.some((row) => !isMissingProfileLabel(row.profile));
                return (
                  <section
                    key={group.lineTemplateId || group.lineName}
                    className={styles.lineGroup}
                  >
                    <header>
                      <div>
                        <strong>{group.lineName}</strong>
                        <span>
                          {groupBarsCalculable
                            ? `${group.bars} barras · sobra ${formatMm(group.wasteMm)}`
                            : "Barras no calculables · falta largo comercial y código de perfil"}
                          {" · "}
                          {group.accessories} accesorios
                        </span>
                      </div>
                      <em>{formatMl(group.totalLinealMm / 1000)}</em>
                    </header>
                    <div className={styles.consolidatedTable} role="table">
                      <div className={styles.consolidatedHeadRow} role="row">
                        <span role="columnheader">Perfil</span>
                        <span role="columnheader">Función</span>
                        <span role="columnheader">Medida</span>
                        <span role="columnheader">Cortes</span>
                        <span role="columnheader">Total lineal</span>
                        <span role="columnheader">Piezas</span>
                      </div>
                      {group.rows.map((row) => {
                        const missingProfile = isMissingProfileLabel(row.profile);
                        return (
                          <div
                            key={row.key}
                            className={`${styles.consolidatedRow} ${
                              missingProfile ? styles.rowMissingProfile : ""
                            }`}
                            role="row"
                          >
                            <strong
                              role="cell"
                              className={missingProfile ? styles.missingProfileChip : undefined}
                            >
                              {row.profile}
                            </strong>
                            <span role="cell" title={row.measureExplanation ?? undefined}>
                              {row.functionLabel}
                            </span>
                            <span role="cell" className={styles.numCell}>
                              {formatMm(row.lengthMm)}
                            </span>
                            <span role="cell" className={styles.numCell}>
                              {row.quantity}
                            </span>
                            <span role="cell" className={`${styles.numCell} ${styles.alignRight}`}>
                              {formatMm(row.totalLinealMm)}
                            </span>
                            <span role="cell">{row.pieceCodes.join(", ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}

            {consolidated.glassRows.length > 0 ? (
              <section className={`${styles.lineGroup} ${styles.glassGroup}`} aria-label="Vidrios consolidados">
                <header>
                  <div>
                    <strong>Vidrios</strong>
                    <span>Separados de los metros lineales de perfiles</span>
                  </div>
                  <em>{formatM2(consolidated.totalGlassM2)}</em>
                </header>
                <div className={`${styles.consolidatedTable} ${styles.glassTable}`} role="table">
                  <div className={styles.consolidatedHeadRow} role="row">
                    <span role="columnheader">Medida</span>
                    <span role="columnheader">Unidades</span>
                    <span role="columnheader">Total m²</span>
                    <span role="columnheader">Piezas</span>
                  </div>
                  {consolidated.glassRows.map((row) => (
                    <div key={row.key} className={styles.consolidatedRow} role="row">
                      <strong role="cell">
                        {formatMm(row.widthMm)} × {formatMm(row.heightMm)}
                      </strong>
                      <span role="cell" className={styles.numCell}>
                        {row.quantity}
                      </span>
                      <span role="cell" className={`${styles.numCell} ${styles.alignRight}`}>
                        {formatM2(row.totalM2)}
                      </span>
                      <span role="cell">{row.pieceCodes.join(", ")}</span>
                    </div>
                  ))}
                </div>
                <p className={styles.glassNote}>
                  <LuCircleAlert aria-hidden />
                  {GLASS_PRELIMINARY_WARNING}
                </p>
              </section>
            ) : null}

            {consolidated.totalAccessories > 0 ? (
              <section className={`${styles.lineGroup} ${styles.accessoryGroup}`} aria-label="Accesorios consolidados">
                <header>
                  <div>
                    <strong>Accesorios</strong>
                    <span>No forman parte de los metros lineales</span>
                  </div>
                  <em>{consolidated.totalAccessories} unidades</em>
                </header>
              </section>
            ) : null}

            <div className={styles.consolidatedTotals}>
              <span>
                Barras necesarias:{" "}
                <strong className={!consolidatedBarsCalculable ? styles.notCalculable : undefined}>
                  {consolidatedBarsCalculable ? consolidated.totalBars : "No calculable"}
                </strong>
              </span>
              <span>
                Sobrantes:{" "}
                <strong className={!consolidatedBarsCalculable ? styles.notCalculable : undefined}>
                  {consolidatedBarsCalculable
                    ? formatMm(consolidated.totalWasteMm)
                    : "No calculable"}
                </strong>
              </span>
              <span>
                Accesorios: <strong>{consolidated.totalAccessories}</strong>
              </span>
              <span>
                Perfiles:{" "}
                <strong>{formatMl(consolidated.totalProfilesLinealMm / 1000)}</strong>
              </span>
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <button type="button" className={styles.secondaryFooter} onClick={onClose}>
            Volver a componentes
          </button>
          <button
            type="button"
            className={styles.primaryFooter}
            onClick={() => {
              onClose();
              onContinueToSummary();
            }}
          >
            Continuar al resumen
            <LuArrowRight aria-hidden />
          </button>
        </footer>
      </div>
    </div>
    <CubicationAdjustmentChoiceDialog
      open={isAdjustmentChoiceOpen}
      lineName={selectedTemplate?.nombre}
      summaryLines={
        pendingAdjustmentSnapshot && selectedTemplate && autoSnapshot
          ? summarizeCubicationLineAdjustment({
              catalogMetadata: selectedTemplate.catalogMetadata,
              cuts: pendingAdjustmentSnapshot.cuts,
              widthMm: pendingAdjustmentSnapshot.widthMm,
              heightMm: pendingAdjustmentSnapshot.heightMm,
              sashCount: rules?.sashCount,
              autoCuts: autoSnapshot.cuts,
              autoGlass: autoSnapshot.glass,
              manualGlass: pendingAdjustmentSnapshot.glass,
            }).lines
          : (adjustmentSummary?.lines ?? [])
      }
      isSaving={Boolean(isSavingCubicationLineAdjustment)}
      onKeepQuoteOnly={handleKeepQuoteOnly}
      onSaveToLine={handleConfirmSaveToLine}
      onCancel={() => {
        setIsAdjustmentChoiceOpen(false);
        setPendingAdjustmentSnapshot(null);
      }}
    />
    </>,
    document.body
  );
}

/** Resumen compacto para el inspector (sin tabla). */
export function DespieceInspectorSummary({
  view,
  canRecalculate,
  onOpenReview,
  onRecalculate,
}: {
  view: PieceDomainView;
  canRecalculate: boolean;
  onOpenReview: () => void;
  onRecalculate: () => void;
}) {
  const summary = view.technicalSummary;
  const barsCalculableHere = summary.hasSnapshot && summary.barras > 0;
  const badgeStatus: DespieceUiStatus =
    view.technicalStatus === "sin_reglas"
      ? "sin_reglas"
      : view.technicalStatus === "sin_configurar"
        ? "configuracion_incompleta"
        : view.cubicationSnapshot && isGeometricFallbackSnapshot(view.cubicationSnapshot)
          ? "estimacion_geometrica"
          : summary.hasSnapshot
            ? "calculado_con_receta"
            : "sin_reglas";

  return (
    <div className={styles.inspectorSummary}>
      <em className={despieceStatusToneClass(badgeStatus)}>
        {DESPIECE_UI_STATUS_LABELS[badgeStatus]}
      </em>
      <dl className={styles.inspectorMetrics}>
        <div>
          <dt>Área</dt>
          <dd>
            {summary.areaVanoM2 != null
              ? formatM2(summary.areaVanoM2)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Perfiles</dt>
          <dd>
            {summary.hasSnapshot ? formatMl(summary.mlPerfiles) : "—"}
          </dd>
        </div>
        <div>
          <dt>Barras</dt>
          <dd className={!barsCalculableHere ? styles.notCalculable : undefined}>
            {summary.hasSnapshot
              ? barsCalculableHere
                ? summary.barras
                : "No calculable"
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Cortes</dt>
          <dd>{summary.hasSnapshot ? summary.cortes : "—"}</dd>
        </div>
        <div>
          <dt>Accesorios</dt>
          <dd>{summary.hasSnapshot ? summary.accesorios : "—"}</dd>
        </div>
        <div>
          <dt>Sobrantes</dt>
          <dd className={!barsCalculableHere ? styles.notCalculable : undefined}>
            {summary.hasSnapshot
              ? barsCalculableHere
                ? formatMm(summary.sobranteMm)
                : "No calculable"
              : "—"}
          </dd>
        </div>
      </dl>
      <div className={styles.inspectorActions}>
        <button type="button" className={styles.inspectorPrimary} onClick={onOpenReview}>
          Abrir despiece
        </button>
        <button
          type="button"
          className={styles.inspectorSecondary}
          onClick={onRecalculate}
          disabled={!canRecalculate}
        >
          Recalcular
        </button>
      </div>
    </div>
  );
}
