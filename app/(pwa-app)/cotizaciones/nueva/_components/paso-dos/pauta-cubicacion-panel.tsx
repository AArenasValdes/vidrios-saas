"use client";

import { useEffect, useMemo, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

import { CubicationAdjustmentChoiceDialog } from "@/components/ui/cubication-adjustment-choice-dialog";
import {
  getLineTemplateCubicationConfig,
  getLineTemplateCuttingRules,
  LINE_TEMPLATE_CUBICATION_STATUS_LABELS,
  type CotizacionLineTemplate,
  type CotizacionLineTemplateCut,
  type CotizacionLineTemplateCuttingPreview,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  summarizeCubicationLineAdjustment,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-adjustment";
import {
  buildCubicationSnapshotFromCatalogMetadata,
  buildPersonalizadoManualCubicationDraft,
  createEmptyCubicationCutDraft,
  cubicationSnapshotMatchesDimensions,
  cubicationSnapshotToPreview,
  rebuildCubicationSnapshotWithCuts,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import {
  RECIPE_STATUS_LABELS,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { resolveRecipeFromMetadata } from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";

import editor from "./pauta-cubicacion-panel.module.css";

export type PautaCubicacionFormSlice = {
  ancho: string;
  alto: string;
  cantidad: string;
  lineTemplateId: string;
  cubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
};

type Props = {
  componentForm: PautaCubicacionFormSlice;
  selectedTemplate: CotizacionLineTemplate | null;
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  onCubicationSnapshotChange: (value: CotizacionItemCubicationSnapshot | null) => void;
  onSaveCubicationLineAdjustment?: (input?: {
    snapshot?: CotizacionItemCubicationSnapshot | null;
  }) => Promise<void> | void;
  isSavingCubicationLineAdjustment?: boolean;
  /** Dónde se elige la línea, para el mensaje de estado pendiente. */
  lineSelectionHint?: "medidas" | "precio";
  /**
   * Si false, oculta el bloque de barras al pie de la pauta expandida
   * (p. ej. cuando el resumen vive en el rail lateral).
   */
  showBarUsageInline?: boolean;
  /**
   * Composición Personalizado: pauta solo como borrador editable,
   * sin plantilla automática de la línea.
   */
  personalizadoAssistMode?: boolean;
  /**
   * `compact`: resumen en Medidas (columna estrecha).
   * `workspace`: paso/tab Despiece con más aire.
   */
  layout?: "compact" | "workspace";
};

function parsePositiveIntegerInput(value: string, fallback = 0) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatMm(value: number) {
  return `${Math.round(value).toLocaleString("es-CL")} mm`;
}

/** Resuelve el snapshot activo (draft / guardado / auto) para UI de pauta o rail. */
export function resolveActiveCubicationSnapshot(input: {
  componentForm: PautaCubicacionFormSlice;
  selectedTemplate: CotizacionLineTemplate | null;
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  personalizadoAssistMode?: boolean;
}): CotizacionItemCubicationSnapshot | null {
  return resolveActiveCubicationSnapshotInternal(input);
}

function resolveActiveCubicationSnapshotInternal(input: {
  componentForm: PautaCubicacionFormSlice;
  selectedTemplate: CotizacionLineTemplate | null;
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  personalizadoAssistMode?: boolean;
}): CotizacionItemCubicationSnapshot | null {
  const widthMm = parsePositiveIntegerInput(input.componentForm.ancho);
  const heightMm = parsePositiveIntegerInput(input.componentForm.alto);
  const quantity = parsePositiveIntegerInput(input.componentForm.cantidad, 1);
  const lineTemplateId = input.selectedTemplate
    ? String(input.selectedTemplate.id)
    : input.componentForm.lineTemplateId;
  const rules = input.selectedTemplate
    ? getLineTemplateCuttingRules(input.selectedTemplate.catalogMetadata)
    : null;
  const dims = { lineTemplateId, widthMm, heightMm, quantity };
  const draftMatches = cubicationSnapshotMatchesDimensions(
    input.componentForm.cubicationSnapshot,
    dims
  );
  const savedMatches = cubicationSnapshotMatchesDimensions(
    input.savedCubicationSnapshot,
    dims
  );

  if (input.personalizadoAssistMode) {
    if (draftMatches && input.componentForm.cubicationSnapshot?.source === "manual") {
      return input.componentForm.cubicationSnapshot;
    }
    if (savedMatches && input.savedCubicationSnapshot?.source === "manual") {
      return input.savedCubicationSnapshot;
    }
    if (!input.selectedTemplate || widthMm <= 0 || heightMm <= 0) {
      return null;
    }
    return buildPersonalizadoManualCubicationDraft({
      lineTemplateId,
      catalogMetadata: input.selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
  }

  const autoSnapshot =
    input.selectedTemplate && rules?.enabled && widthMm > 0 && heightMm > 0
      ? buildCubicationSnapshotFromCatalogMetadata({
          lineTemplateId,
          catalogMetadata: input.selectedTemplate.catalogMetadata,
          widthMm,
          heightMm,
          quantity,
        })
      : null;

  if (draftMatches) {
    return input.componentForm.cubicationSnapshot ?? null;
  }
  if (savedMatches) {
    return input.savedCubicationSnapshot ?? null;
  }
  return autoSnapshot;
}

/** Resuelve el preview activo (draft / guardado / auto) para UI de pauta o rail. */
export function resolveActiveCubicationPreview(input: {
  componentForm: PautaCubicacionFormSlice;
  selectedTemplate: CotizacionLineTemplate | null;
  savedCubicationSnapshot?: CotizacionItemCubicationSnapshot | null;
  personalizadoAssistMode?: boolean;
}): CotizacionLineTemplateCuttingPreview | null {
  const activeSnapshot = resolveActiveCubicationSnapshot(input);
  return activeSnapshot ? cubicationSnapshotToPreview(activeSnapshot) : null;
}

export function formatCubicationMm(value: number) {
  return formatMm(value);
}

export function PautaCubicacionPanel({
  componentForm,
  selectedTemplate,
  savedCubicationSnapshot,
  onCubicationSnapshotChange,
  onSaveCubicationLineAdjustment,
  isSavingCubicationLineAdjustment,
  lineSelectionHint = "precio",
  showBarUsageInline = true,
  personalizadoAssistMode = false,
  layout = "workspace",
}: Props) {
  const widthMm = parsePositiveIntegerInput(componentForm.ancho);
  const heightMm = parsePositiveIntegerInput(componentForm.alto);
  const quantity = parsePositiveIntegerInput(componentForm.cantidad, 1);
  const lineTemplateId = selectedTemplate
    ? String(selectedTemplate.id)
    : componentForm.lineTemplateId;
  const rules = selectedTemplate
    ? getLineTemplateCuttingRules(selectedTemplate.catalogMetadata)
    : null;
  const cubicationConfig = selectedTemplate
    ? getLineTemplateCubicationConfig(selectedTemplate.catalogMetadata)
    : null;
  const fabricationRecipe = selectedTemplate
    ? resolveRecipeFromMetadata(selectedTemplate.catalogMetadata)
    : null;
  const dims = { lineTemplateId, widthMm, heightMm, quantity };
  const draftMatches = cubicationSnapshotMatchesDimensions(
    componentForm.cubicationSnapshot,
    dims
  );
  const savedMatches = cubicationSnapshotMatchesDimensions(savedCubicationSnapshot, dims);
  const autoSnapshot =
    !personalizadoAssistMode &&
    selectedTemplate &&
    rules?.enabled &&
    widthMm > 0 &&
    heightMm > 0
      ? buildCubicationSnapshotFromCatalogMetadata({
          lineTemplateId,
          catalogMetadata: selectedTemplate.catalogMetadata,
          widthMm,
          heightMm,
          quantity,
        })
      : null;
  useEffect(() => {
    if (!personalizadoAssistMode || !selectedTemplate || widthMm <= 0 || heightMm <= 0) {
      return;
    }
    const hasUsableManual =
      (draftMatches && componentForm.cubicationSnapshot?.source === "manual") ||
      (savedMatches && savedCubicationSnapshot?.source === "manual");
    if (hasUsableManual) {
      return;
    }
    const next = buildPersonalizadoManualCubicationDraft({
      lineTemplateId: String(selectedTemplate.id),
      catalogMetadata: selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
    if (next) {
      onCubicationSnapshotChange(next);
    }
    // Solo sembrar cuando faltan medidas/manual usable; no reaccionar al objeto draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed acotado a dims/modo
  }, [
    personalizadoAssistMode,
    selectedTemplate?.id,
    widthMm,
    heightMm,
    quantity,
    draftMatches,
    savedMatches,
    componentForm.cubicationSnapshot?.source,
    savedCubicationSnapshot?.source,
  ]);

  const activeSnapshot: CotizacionItemCubicationSnapshot | null = resolveActiveCubicationSnapshot({
    componentForm,
    selectedTemplate,
    savedCubicationSnapshot,
    personalizadoAssistMode,
  });
  const preview = activeSnapshot ? cubicationSnapshotToPreview(activeSnapshot) : null;
  const hasCuts = Boolean(preview && preview.cuts.length > 0);
  const isManual = activeSnapshot?.source === "manual";
  const statusLabel = personalizadoAssistMode
    ? "Borrador manual"
    : isManual
      ? "Ajustada manualmente"
      : draftMatches || savedMatches
        ? "Snapshot guardado"
        : fabricationRecipe
          ? RECIPE_STATUS_LABELS[fabricationRecipe.status]
          : cubicationConfig
            ? LINE_TEMPLATE_CUBICATION_STATUS_LABELS[cubicationConfig.status]
            : "Sin configurar";
  const isValidated = personalizadoAssistMode
    ? false
    : isManual
      ? false
      : activeSnapshot
        ? activeSnapshot.status === "validada"
        : fabricationRecipe
          ? fabricationRecipe.status === "validada"
          : cubicationConfig?.status === "validada";

  const [isPautaExpanded, setIsPautaExpanded] = useState(layout === "workspace");
  const [isAdjustmentChoiceOpen, setIsAdjustmentChoiceOpen] = useState(false);
  const [hasOfferedAdjustmentChoice, setHasOfferedAdjustmentChoice] = useState(false);
  const [pendingAdjustmentSnapshot, setPendingAdjustmentSnapshot] =
    useState<CotizacionItemCubicationSnapshot | null>(null);

  useEffect(() => {
    setHasOfferedAdjustmentChoice(false);
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
  }, [selectedTemplate?.id, widthMm, heightMm, quantity]);

  const adjustmentSummary = useMemo(() => {
    if (!selectedTemplate || !activeSnapshot || activeSnapshot.source !== "manual") {
      return null;
    }
    if (!autoSnapshot) return null;
    return summarizeCubicationLineAdjustment({
      catalogMetadata: selectedTemplate.catalogMetadata,
      cuts: activeSnapshot.cuts,
      widthMm,
      heightMm,
      sashCount: rules?.sashCount,
      autoCuts: autoSnapshot.cuts,
      autoGlass: autoSnapshot.glass,
      manualGlass: activeSnapshot.glass,
    });
  }, [
    selectedTemplate,
    activeSnapshot,
    autoSnapshot,
    widthMm,
    heightMm,
    rules?.sashCount,
  ]);

  const commitSnapshot = (next: CotizacionItemCubicationSnapshot | null) => {
    onCubicationSnapshotChange(next);
  };

  const ensureEditableBase = () => {
    if (activeSnapshot) return activeSnapshot;
    if (personalizadoAssistMode && selectedTemplate) {
      return buildPersonalizadoManualCubicationDraft({
        lineTemplateId,
        catalogMetadata: selectedTemplate.catalogMetadata,
        widthMm,
        heightMm,
        quantity,
      });
    }
    return autoSnapshot;
  };

  const handleCutFieldChange = (
    cutIndex: number,
    field: "label" | "functionLabel" | "lengthMm" | "quantity",
    value: string
  ) => {
    const base = ensureEditableBase();
    if (!base) return;

    const previousLength = base.cuts[cutIndex]?.lengthMm;
    const nextCuts = base.cuts.map((cut, index) => {
      if (index !== cutIndex) return cut;
      if (field === "label" || field === "functionLabel") {
        return { ...cut, [field]: value };
      }
      const numeric = parsePositiveIntegerInput(value, field === "quantity" ? 1 : 1);
      return {
        ...cut,
        [field]: numeric,
        totalLinealMm: field === "lengthMm" ? numeric * cut.quantity : cut.lengthMm * numeric,
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
    const nextCuts = base.cuts.filter((_, index) => index !== cutIndex);
    commitSnapshot(
      rebuildCubicationSnapshotWithCuts(base, nextCuts, {
        source: "manual",
        barLengthMm: rules?.barLengthMm,
        sawKerfMm: rules?.sawKerfMm,
      })
    );
  };

  const handleRecalcular = () => {
    if (personalizadoAssistMode) {
      return;
    }
    if (!autoSnapshot) return;
    setHasOfferedAdjustmentChoice(false);
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    commitSnapshot(autoSnapshot);
  };

  const handleRestaurar = () => {
    if (personalizadoAssistMode) {
      return;
    }
    if (!autoSnapshot) return;
    setHasOfferedAdjustmentChoice(false);
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    commitSnapshot({ ...autoSnapshot, source: "auto" });
  };

  const handleReiniciarBorradorPersonalizado = () => {
    if (!personalizadoAssistMode || !selectedTemplate) {
      return;
    }
    const next = buildPersonalizadoManualCubicationDraft({
      lineTemplateId,
      catalogMetadata: selectedTemplate.catalogMetadata,
      widthMm,
      heightMm,
      quantity,
    });
    if (next) {
      commitSnapshot(next);
    }
  };

  const handleGuardarAjusteLinea = () => {
    if (!isManual || !onSaveCubicationLineAdjustment) {
      return;
    }
    setPendingAdjustmentSnapshot(
      activeSnapshot?.source === "manual" ? activeSnapshot : null
    );
    setIsAdjustmentChoiceOpen(true);
  };

  const handleKeepQuoteOnly = () => {
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
  };

  const handleConfirmSaveToLine = () => {
    const snapshot =
      pendingAdjustmentSnapshot?.source === "manual"
        ? pendingAdjustmentSnapshot
        : activeSnapshot?.source === "manual"
          ? activeSnapshot
          : null;
    setIsAdjustmentChoiceOpen(false);
    setPendingAdjustmentSnapshot(null);
    void onSaveCubicationLineAdjustment?.({ snapshot });
  };

  const glassAreaLabel = preview?.glass
    ? `${preview.glass.totalM2.toLocaleString("es-CL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} m²`
    : "—";
  const glassSizeLabel = preview?.glass
    ? `${preview.glass.widthMm.toLocaleString("es-CL")} × ${preview.glass.heightMm.toLocaleString("es-CL")} mm`
    : null;
  const profilesSummary = preview
    ? `${(preview.totalProfilesLinealMm / 1000).toFixed(2)} ml`
    : "—";
  const profilesCutsLabel = preview
    ? `${preview.cuts.length} ${preview.cuts.length === 1 ? "corte" : "cortes"}`
    : null;

  const waitingReason = !selectedTemplate
    ? lineSelectionHint === "medidas"
      ? personalizadoAssistMode
        ? "Elige una línea comercial en Terminaciones para armar el borrador de pauta."
        : "Elige una línea comercial en Terminaciones para generar la pauta."
      : personalizadoAssistMode
        ? "Elige una línea comercial en Precio para armar el borrador de pauta."
        : "Elige una línea comercial en Precio para generar la pauta de esta pieza."
    : !personalizadoAssistMode && !rules?.enabled
      ? "Esta línea no tiene pauta activa. Actívala en Líneas y precios."
      : widthMm <= 0 || heightMm <= 0
        ? "Completa ancho y alto para ver vidrio, perfiles y cortes."
        : !hasCuts
          ? "Con estas medidas aún no hay cortes para mostrar."
          : null;

  if (waitingReason) {
    return (
      <section
        className={`${editor.cubicacionCard} ${
          layout === "compact" ? editor.cubicacionCardCompact : editor.cubicacionCardWorkspace
        }`}
        aria-label="Cubicación y pauta"
      >
        <header className={editor.cubicacionCardHead}>
          <div>
            <small>{layout === "compact" ? "Estimación" : "Despiece"}</small>
            <strong>Cubicación y pauta</strong>
            <p>
              {personalizadoAssistMode
                ? "Composición Personalizado: la pauta se arma a mano."
                : "Estimación interna sin precio. Aparece al tener línea y vano."}
            </p>
          </div>
          <em className={editor.cubicacionStatusMuted}>Pendiente</em>
        </header>
        <div className={editor.cubicacionWaiting}>{waitingReason}</div>
      </section>
    );
  }

  if (!preview || !activeSnapshot) {
    return null;
  }

  const cardClassName = [
    editor.cubicacionCard,
    layout === "compact" ? editor.cubicacionCardCompact : editor.cubicacionCardWorkspace,
    personalizadoAssistMode ? editor.cubicacionCardPersonalizado : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cardClassName} aria-label="Cubicación y pauta">
      <header className={editor.cubicacionCardHead}>
        <div>
          <small>{layout === "compact" ? "Estimación de materiales" : "Despiece"}</small>
          <strong>
            {personalizadoAssistMode ? "Pauta manual (Personalizado)" : "Cubicación y pauta"}
          </strong>
          <p>
            {formatMm(widthMm)} × {formatMm(heightMm)} · {quantity}{" "}
            {quantity === 1 ? "unidad" : "unidades"}
            {selectedTemplate ? ` · ${selectedTemplate.nombre}` : ""}
          </p>
        </div>
        <em
          className={
            personalizadoAssistMode || isManual || !isValidated
              ? editor.cubicacionStatusWarn
              : editor.cubicacionStatusOk
          }
        >
          {statusLabel}
        </em>
      </header>

      <div className={editor.cubicacionHero} aria-label="Resumen de cubicación">
        <span>
          <small>{personalizadoAssistMode ? "Vidrio (vano)" : "Vidrio"}</small>
          <strong>{glassAreaLabel}</strong>
          {glassSizeLabel ? <em>{glassSizeLabel}</em> : null}
        </span>
        <span>
          <small>Perfiles</small>
          <strong>{profilesSummary}</strong>
          {profilesCutsLabel ? <em>{profilesCutsLabel}</em> : null}
        </span>
        <span>
          <small>Barras ref.</small>
          <strong>{preview.bars.length}</strong>
          <em>sobra {formatMm(preview.totalWasteMm)}</em>
        </span>
        <span>
          <small>Accesorios</small>
          <strong>{preview.accessoryUnits}</strong>
          <em>unidades est.</em>
        </span>
      </div>

      {personalizadoAssistMode ? (
        <p className={`${editor.cubicacionNotice} ${editor.cubicacionNoticePersonalizado}`}>
          Esta composición es Personalizado: no usamos la pauta automática de la línea.
          Completa o corrige los cortes abajo. Es un borrador de taller, no fabricación
          automática.
        </p>
      ) : isManual ? (
        <p className={editor.cubicacionNotice}>
          Ajuste solo para esta cotización. No cambia la línea del catálogo.
        </p>
      ) : savedMatches && !draftMatches ? (
        <p className={editor.cubicacionNotice}>
          Pauta congelada al guardar esta pieza. Puedes editarla o recalcular.
        </p>
      ) : !isValidated ? (
        <p className={editor.cubicacionNotice}>
          Pauta referencial. Revisa la línea antes de usarla como fabricación.
        </p>
      ) : null}

      <div className={editor.cubicacionToolbar}>
        <div className={editor.cubicacionActions}>
          {personalizadoAssistMode ? (
            <button
              type="button"
              className={editor.cubicacionActionBtn}
              onClick={handleReiniciarBorradorPersonalizado}
            >
              Reiniciar borrador
            </button>
          ) : (
            <>
              <button
                type="button"
                className={editor.cubicacionActionBtn}
                onClick={handleRecalcular}
              >
                Recalcular
              </button>
              <button
                type="button"
                className={editor.cubicacionActionBtn}
                onClick={handleRestaurar}
                disabled={!isManual || !autoSnapshot}
              >
                Restaurar cálculo
              </button>
            </>
          )}
          {isPautaExpanded ? (
            <button type="button" className={editor.cubicacionActionBtn} onClick={handleAddCut}>
              Agregar corte
            </button>
          ) : null}
          {!personalizadoAssistMode && onSaveCubicationLineAdjustment ? (
            <button
              type="button"
              className={editor.cubicacionActionBtnPrimary}
              onClick={handleGuardarAjusteLinea}
              disabled={!isManual || Boolean(isSavingCubicationLineAdjustment)}
            >
              {isSavingCubicationLineAdjustment
                ? "Guardando…"
                : "Guardar ajuste para esta línea"}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={`${editor.cubicacionToggle} ${isPautaExpanded ? editor.cubicacionToggleOpen : ""}`}
          onClick={() => setIsPautaExpanded((current) => !current)}
          aria-expanded={isPautaExpanded}
        >
          {isPautaExpanded ? "Ocultar pauta" : "Ver pauta de cortes"}
          <LuChevronDown aria-hidden />
        </button>
      </div>

      {isPautaExpanded ? (
        <div className={editor.cubicacionPanelBody}>
          <div className={editor.cubicacionTableScroll}>
            <div className={editor.cubicacionTable} role="table" aria-label="Pauta de corte editable">
              <div className={editor.cubicacionTableHeadEditable} role="row">
                <span role="columnheader">Perfil</span>
                <span role="columnheader">Función</span>
                <span role="columnheader">Medida mm</span>
                <span role="columnheader">Cant.</span>
                <span role="columnheader">Total</span>
                <span role="columnheader">
                  <span className={editor.srOnly}>Acciones</span>
                </span>
              </div>
              {preview.cuts.map((cut: CotizacionLineTemplateCut, cutIndex: number) => (
                <div
                  key={`cut-row-${cutIndex}`}
                  className={editor.cubicacionTableRowEditable}
                  role="row"
                >
                  <label className={editor.cubicacionCellField}>
                    <span className={editor.srOnly}>Perfil</span>
                    <input
                      value={cut.label}
                      onChange={(event) =>
                        handleCutFieldChange(cutIndex, "label", event.target.value)
                      }
                    />
                  </label>
                  <label className={editor.cubicacionCellField}>
                    <span className={editor.srOnly}>Función</span>
                    <input
                      value={cut.functionLabel}
                      onChange={(event) =>
                        handleCutFieldChange(cutIndex, "functionLabel", event.target.value)
                      }
                    />
                  </label>
                  <label className={editor.cubicacionCellField}>
                    <span className={editor.srOnly}>Medida mm</span>
                    <input
                      inputMode="numeric"
                      value={String(cut.lengthMm)}
                      onChange={(event) =>
                        handleCutFieldChange(cutIndex, "lengthMm", event.target.value)
                      }
                    />
                  </label>
                  <label className={editor.cubicacionCellField}>
                    <span className={editor.srOnly}>Cantidad</span>
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
                    className={editor.cubicacionRemoveCut}
                    onClick={() => handleRemoveCut(cutIndex)}
                    disabled={preview.cuts.length <= 1}
                    aria-label="Quitar corte"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {showBarUsageInline ? (
            <div className={editor.cubicacionBars}>
              <span className={editor.cubicacionBarsNote}>
                Distribución sugerida por perfil (pauta referencial)
              </span>
              {preview.bars.slice(0, 3).map((bar) => (
                <span key={bar.index}>
                  Barra {bar.index}: usado {formatMm(bar.usedMm)} · sobra{" "}
                  {formatMm(bar.wasteMm)}
                </span>
              ))}
              {preview.bars.length > 3 ? (
                <span>+ {preview.bars.length - 3} barras más</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <CubicationAdjustmentChoiceDialog
        open={isAdjustmentChoiceOpen}
        lineName={selectedTemplate?.nombre}
        summaryLines={
          pendingAdjustmentSnapshot && selectedTemplate && autoSnapshot
            ? summarizeCubicationLineAdjustment({
                catalogMetadata: selectedTemplate.catalogMetadata,
                cuts: pendingAdjustmentSnapshot.cuts,
                widthMm,
                heightMm,
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
    </section>
  );
}
