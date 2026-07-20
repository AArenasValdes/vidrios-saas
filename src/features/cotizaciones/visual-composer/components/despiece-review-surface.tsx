"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuArrowRight,
  LuCircleAlert,
  LuDownload,
  LuX,
} from "react-icons/lu";

import { CubicationAdjustmentChoiceDialog } from "@/components/ui/cubication-adjustment-choice-dialog";
import {
  getLineTemplateCuttingRules,
  type CotizacionLineTemplate,
  type CotizacionLineTemplateCut,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { buildConsolidatedCubicationPauta } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import {
  summarizeCubicationLineAdjustment,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-adjustment";
import {
  buildCubicationSnapshotFromCatalogMetadata,
  buildPersonalizadoManualCubicationDraft,
  createEmptyCubicationCutDraft,
  cubicationSnapshotToPreview,
  rebuildCubicationSnapshotWithCuts,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import {
  buildPieceDomainView,
  type PieceDomainView,
  type PieceTechnicalStatus,
} from "@/features/cotizaciones/new-quote/quote-piece-domain";
import { mapItemToForm } from "@/features/cotizaciones/new-quote/workflow-ui";
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

function statusToneClass(status: PieceTechnicalStatus) {
  switch (status) {
    case "configurado":
      return styles.statusOk;
    case "referencial":
      return styles.statusWarn;
    case "requiere_revision":
      return styles.statusWarn;
    case "sin_reglas":
      return styles.statusMuted;
    default:
      return styles.statusMuted;
  }
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
  const personalizadoAssistMode = Boolean(selectedForm?.isCustomScheme);
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
  const consolidated = useMemo(
    () => buildConsolidatedCubicationPauta(items),
    [items]
  );
  const warnings = useMemo(() => {
    return visualItems
      .map((item) => {
        const form = mapItemToForm(item);
        const template = resolveLineTemplate(lineTemplates, form.lineTemplateId);
        const view = buildPieceDomainView(item, quotePricingMode, template);
        return { item, view };
      })
      .filter(
        ({ view }) =>
          view.technicalStatus === "sin_reglas" ||
          view.technicalStatus === "requiere_revision" ||
          view.technicalStatus === "sin_configurar"
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
  }, [selectedItem?.id, selectedForm?.lineTemplateId]);

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

  const primaryBar = preview?.bars[0] ?? null;
  const barLengthMm = primaryBar ? primaryBar.usedMm + primaryBar.wasteMm : null;
  const usedPct =
    primaryBar && barLengthMm && barLengthMm > 0
      ? Math.min(100, Math.round((primaryBar.usedMm / barLengthMm) * 100))
      : 0;

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
                        <em className={statusToneClass(view.technicalStatus)}>{view.technicalLabel}</em>
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
                    <em className={statusToneClass(selectedView.technicalStatus)}>
                      {selectedView.technicalLabel}
                    </em>
                  </header>

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
                            ? formatMl(preview.totalProfilesLinealMm / 1000)
                            : "—"}
                        </strong>
                        <em>
                          {preview
                            ? `${preview.cuts.length} ${
                                preview.cuts.length === 1 ? "corte" : "cortes"
                              }`
                            : "Sin cortes"}
                        </em>
                      </span>
                      <span>
                        <small>Barras ref.</small>
                        <strong>{preview?.bars.length ?? 0}</strong>
                        <em>
                          {barLengthMm ? `sobre ${formatMm(barLengthMm)}` : "Sin barra"}
                        </em>
                      </span>
                      <span>
                        <small>Accesorios</small>
                        <strong>{preview?.accessoryUnits ?? 0}</strong>
                        <em>unidades est.</em>
                      </span>
                    </div>
                  </div>

                  <div className={styles.tableBlock}>
                    <div className={styles.tableToolbar}>
                      <strong>Despiece de perfiles</strong>
                      <div className={styles.tableActions}>
                        {!personalizadoAssistMode ? (
                          <>
                            <button type="button" onClick={handleRecalcular} disabled={!rules?.enabled}>
                              Recalcular
                            </button>
                            <button
                              type="button"
                              onClick={handleRestaurar}
                              disabled={!rules?.enabled || activeSnapshot?.source !== "manual"}
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
                        <button type="button" onClick={handleAddCut} disabled={!ensureEditableBase()}>
                          Agregar corte
                        </button>
                        <button
                          type="button"
                          className={styles.exportGhost}
                          aria-label="Exportar (próximamente)"
                          disabled
                          title="Exportación disponible en un corte futuro"
                        >
                          <LuDownload aria-hidden />
                        </button>
                      </div>
                    </div>

                    {preview && preview.cuts.length > 0 ? (
                      <div className={styles.table} role="table" aria-label="Despiece de perfiles">
                        <div className={styles.tableHead} role="row">
                          <span role="columnheader">Perfil</span>
                          <span role="columnheader">Función</span>
                          <span role="columnheader">Medida mm</span>
                          <span role="columnheader">Cant.</span>
                          <span role="columnheader">Total</span>
                          <span role="columnheader">
                            <span className={styles.srOnly}>Quitar</span>
                          </span>
                        </div>
                        {preview.cuts.map((cut: CotizacionLineTemplateCut, cutIndex: number) => (
                          <div key={`cut-${cutIndex}`} className={styles.tableRow} role="row">
                            <label>
                              <span className={styles.srOnly}>Perfil</span>
                              <input
                                value={cut.label}
                                onChange={(event) =>
                                  handleCutFieldChange(cutIndex, "label", event.target.value)
                                }
                              />
                            </label>
                            <label>
                              <span className={styles.srOnly}>Función</span>
                              <input
                                value={cut.functionLabel}
                                onChange={(event) =>
                                  handleCutFieldChange(cutIndex, "functionLabel", event.target.value)
                                }
                              />
                            </label>
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
                            <strong role="cell">{formatMm(cut.totalLinealMm)}</strong>
                            <button
                              type="button"
                              aria-label="Quitar corte"
                              disabled={preview.cuts.length <= 1}
                              onClick={() => handleRemoveCut(cutIndex)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className={styles.tableFoot} role="row">
                          <span>Total perfiles</span>
                          <strong>{formatMm(preview.totalProfilesLinealMm)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.emptyTable}>
                        {selectedView.technicalStatus === "sin_reglas"
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
                <strong className={styles.summaryTitle}>Uso de barras</strong>
                {primaryBar && barLengthMm ? (
                  <>
                    <p className={styles.barMeta}>
                      {selectedForm?.material || "Perfil"} {formatMm(barLengthMm)}
                    </p>
                    <div className={styles.barTrack} aria-hidden>
                      <span style={{ width: `${usedPct}%` }} />
                    </div>
                    <p className={styles.barMeta}>
                      Usado: {formatMm(primaryBar.usedMm)} · Sobrante:{" "}
                      {formatMm(primaryBar.wasteMm)}
                    </p>
                  </>
                ) : (
                  <p className={styles.barMeta}>Sin barras estimadas</p>
                )}
              </div>

              <div className={styles.summaryCard}>
                <span>
                  <small>Cortes totales</small>
                  <strong>{preview?.cuts.length ?? 0}</strong>
                </span>
                <span>
                  <small>Sobrantes estimados</small>
                  <strong>
                    {preview
                      ? `${(preview.totalWasteMm / 1000).toLocaleString("es-CL", {
                          maximumFractionDigits: 2,
                        })} m`
                      : "—"}
                  </strong>
                </span>
              </div>

              {warnings.length > 0 ? (
                <div className={styles.warnings}>
                  <strong>
                    <LuCircleAlert aria-hidden /> Advertencias
                  </strong>
                  <ul>
                    {warnings.slice(0, 4).map(({ item, view }) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => onActiveItemChange(item.id)}>
                          {item.codigo}: {view.technicalLabel}
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
                <h3>Pauta consolidada</h3>
                <p>
                  {consolidated.itemCountWithPauta}{" "}
                  {consolidated.itemCountWithPauta === 1 ? "pieza" : "piezas"} ·{" "}
                  {formatMl(consolidated.totalProfilesLinealMm / 1000)} perfiles ·{" "}
                  {formatM2(consolidated.totalGlassM2)} vidrio · {consolidated.totalBars} barras
                  {consolidated.dominantBarLengthMm
                    ? ` · barra ref. ${formatMm(consolidated.dominantBarLengthMm)}`
                    : ""}
                </p>
              </div>
              <p className={styles.consolidatedHint}>
                Agrupado por línea, perfil y medida. Preparado para una futura optimización de
                cortes (sin nesting en V1).
              </p>
            </header>

            {consolidated.lineGroups.length === 0 ? (
              <div className={styles.emptyTable}>
                Todavía no hay pauta consolidable. Revisa piezas con línea, medidas y cortes.
              </div>
            ) : (
              consolidated.lineGroups.map((group) => (
                <section key={group.lineTemplateId || group.lineName} className={styles.lineGroup}>
                  <header>
                    <div>
                      <strong>{group.lineName}</strong>
                      <span>
                        {group.barLengthMm
                          ? `Barra comercial ${formatMm(group.barLengthMm)}`
                          : "Barra comercial no definida"}
                        {" · "}
                        {group.bars} barras · sobra {formatMm(group.wasteMm)} ·{" "}
                        {group.accessories} accesorios
                      </span>
                    </div>
                    <em>{formatMl(group.totalLinealMm / 1000)}</em>
                  </header>
                  <div className={styles.consolidatedTable} role="table">
                    <div className={styles.consolidatedHeadRow} role="row">
                      <span role="columnheader">Perfil</span>
                      <span role="columnheader">Longitud</span>
                      <span role="columnheader">Cortes</span>
                      <span role="columnheader">Total lineal</span>
                      <span role="columnheader">Piezas</span>
                    </div>
                    {group.rows.map((row) => (
                      <div key={row.key} className={styles.consolidatedRow} role="row">
                        <strong role="cell">{row.profile}</strong>
                        <span role="cell">{formatMm(row.lengthMm)}</span>
                        <span role="cell">{row.quantity}</span>
                        <span role="cell">{formatMm(row.totalLinealMm)}</span>
                        <span role="cell">{row.pieceCodes.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}

            <div className={styles.consolidatedTotals}>
              <span>
                Barras necesarias: <strong>{consolidated.totalBars}</strong>
              </span>
              <span>
                Sobrantes totales: <strong>{formatMm(consolidated.totalWasteMm)}</strong>
              </span>
              <span>
                Accesorios: <strong>{consolidated.totalAccessories}</strong>
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
  return (
    <div className={styles.inspectorSummary}>
      <em className={statusToneClass(view.technicalStatus)}>{view.technicalLabel}</em>
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
          <dd>{summary.hasSnapshot ? summary.barras : "—"}</dd>
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
          <dt>Sobrante est.</dt>
          <dd>
            {summary.hasSnapshot && summary.sobranteMm > 0
              ? formatMm(summary.sobranteMm)
              : summary.hasSnapshot
                ? "0 mm"
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
