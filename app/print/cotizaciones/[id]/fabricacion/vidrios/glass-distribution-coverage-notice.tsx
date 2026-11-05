"use client";

import { useMemo, useState } from "react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { ManualGlassPaneMeasurementsSnapshot } from "@/features/cotizaciones/types/manual-glass-pane-measurements";
import { ManualGlassMeasurementsEditor } from "@/features/cotizaciones/components/manual-glass-measurements-editor";
import { resolveManualGlassPaneComponentType } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";
import { refreshDirectGlassDistribution } from "@/features/fabricacion/hooks/use-direct-glass-distribution";
import { classifyGlassPaneGeometryReason, type GlassDistributionCoverage, type GlassDistributionGeometryStatus, type GlassPaneGeometryExclusion } from "@/features/fabricacion/services/glass-distribution-coverage.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import s from "./glass-distribution-coverage-notice.module.css";

type Props = {
  quoteId: string;
  coverage: GlassDistributionCoverage | null;
  items?: readonly CotizacionWorkflowItem[];
  templates?: readonly CotizacionLineTemplate[];
  previewablePaneIds?: readonly string[];
  previewableUnitCount?: number;
  previewExclusions?: readonly GlassPaneGeometryExclusion[];
  onSaveMeasurements?: (itemId: string, value: ManualGlassPaneMeasurementsSnapshot) => Promise<void>;
  isRefreshing?: boolean;
  isCoverageCurrent?: boolean;
  refreshError?: string | null;
  onRetryRefresh?: () => Promise<void>;
};

type ReferenceGroup = {
  itemId: string;
  componentCode: string;
  componentName: string;
  displayNames: string[];
  reasons: string[];
  referenceKeys: Set<string>;
  geometryStatuses: Set<GlassDistributionGeometryStatus>;
  count: number;
};

export function GlassDistributionCoverageNotice({ quoteId, coverage, items = [], templates = [], previewablePaneIds, previewableUnitCount, previewExclusions, onSaveMeasurements = async () => undefined, isRefreshing = false, isCoverageCurrent = true, refreshError = null, onRetryRefresh }: Props) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManualGlassPaneMeasurementsSnapshot | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [retryingRefresh, setRetryingRefresh] = useState(false);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const pendingGroups = useMemo(() => {
    const groups = new Map<string, ReferenceGroup>();
    const previewable = new Set(previewablePaneIds ?? []);
    const excluded = new Set((previewExclusions ?? []).map((entry) => `${entry.quoteItemId}|${entry.paneId}`));
    const addReference = (reference: { quoteItemId: string; paneId?: string | null; componentCode: string; componentName: string; displayName?: string | null; reason: string; geometryStatus?: GlassDistributionGeometryStatus }) => {
      const geometryStatus = reference.geometryStatus ?? classifyGlassPaneGeometryReason(reference.reason);
      if (geometryStatus !== "complete") return;
      const key = reference.quoteItemId || `${reference.componentCode}:${reference.componentName}`;
      const group = groups.get(key) ?? {
        itemId: reference.quoteItemId,
        componentCode: reference.componentCode,
        componentName: reference.componentName,
        displayNames: [],
        reasons: [],
        referenceKeys: new Set<string>(),
        geometryStatuses: new Set<GlassDistributionGeometryStatus>(),
        count: 0,
      };
      group.geometryStatuses.add(geometryStatus);
      const referenceKey = reference.paneId ? `${reference.quoteItemId}|${reference.paneId}` : null;
      if (referenceKey) {
        if (!group.referenceKeys.has(referenceKey)) group.count += 1;
        group.referenceKeys.add(referenceKey);
      } else {
        group.count += 1;
      }
      if (reference.displayName && !group.displayNames.includes(reference.displayName)) group.displayNames.push(reference.displayName);
      if (reference.reason && !group.reasons.includes(reference.reason)) group.reasons.push(reference.reason);
      groups.set(key, group);
    };
    for (const reference of coverage?.pendingReferences ?? []) {
      if (reference.paneId && (previewable.has(`${reference.quoteItemId}|${reference.paneId}`) || excluded.has(`${reference.quoteItemId}|${reference.paneId}`))) continue;
      addReference(reference);
    }
    return [...groups.values()];
  }, [coverage, previewablePaneIds, previewExclusions]);
  const exclusionGroups = useMemo(() => {
    const groups = new Map<string, ReferenceGroup>();
    const addReference = (reference: { quoteItemId: string; paneId?: string | null; componentCode: string; componentName: string; displayName?: string | null; reason: string; geometryStatus?: GlassDistributionGeometryStatus }) => {
      const geometryStatus = reference.geometryStatus ?? classifyGlassPaneGeometryReason(reference.reason);
      if (geometryStatus === "complete") return;
      const key = reference.quoteItemId || `${reference.componentCode}:${reference.componentName}`;
      const group = groups.get(key) ?? {
        itemId: reference.quoteItemId,
        componentCode: reference.componentCode,
        componentName: reference.componentName,
        displayNames: [],
        reasons: [],
        referenceKeys: new Set<string>(),
        geometryStatuses: new Set<GlassDistributionGeometryStatus>(),
        count: 0,
      };
      group.geometryStatuses.add(geometryStatus);
      const referenceKey = reference.paneId ? `${reference.quoteItemId}|${reference.paneId}` : null;
      if (referenceKey) {
        if (!group.referenceKeys.has(referenceKey)) group.count += 1;
        group.referenceKeys.add(referenceKey);
      } else {
        group.count += 1;
      }
      if (reference.displayName && !group.displayNames.includes(reference.displayName)) group.displayNames.push(reference.displayName);
      if (reference.reason && !group.reasons.includes(reference.reason)) group.reasons.push(reference.reason);
      groups.set(key, group);
    };
    for (const reference of coverage?.pendingReferences ?? []) {
      addReference(reference);
    }
    for (const exclusion of previewExclusions ?? []) {
      addReference(exclusion);
    }
    return [...groups.values()];
  }, [coverage, previewExclusions]);

  if (!coverage) return null;

  const hasPreviewReferences = previewablePaneIds !== undefined;
  const previewableReferenceCount = hasPreviewReferences
    ? new Set(previewablePaneIds).size
    : coverage.geometricReferenceCount ?? 0;
  const displayedUnitCount = hasPreviewReferences ? previewableUnitCount ?? 0 : coverage.geometricUnitCount ?? 0;
  const excludedReferenceCount = hasPreviewReferences
    ? new Set((previewExclusions ?? []).map((entry) => `${entry.quoteItemId}|${entry.paneId}`)).size
    : coverage.geometricPendingReferenceCount ?? 0;
  const geometricStatus = previewableReferenceCount > 0 && excludedReferenceCount === 0
    ? "Simulación geométrica completa"
    : previewableReferenceCount > 0
      ? "Simulación parcial"
      : "Geometría pendiente";
  const activeItem = activeItemId ? itemsById.get(activeItemId) : undefined;
  const activePresentation = activeItem ? decodeCotizacionItemPresentationMeta(activeItem.observaciones) : null;
  const automaticDimensionsAvailable = Boolean(activeItem?.fabricacionSnapshot?.result?.vidrios?.some(
    (pane) => pane.anchoMm > 0 && pane.altoMm > 0
  ));

  const openEditor = (itemId: string) => {
    const item = itemsById.get(itemId);
    if (!item) return;
    setActiveItemId(itemId);
    setDraft(item.manualGlassMeasurements ?? decodeCotizacionItemPresentationMeta(item.observaciones).manualGlassMeasurements);
    setSaveError(null);
    setSaveNotice(null);
  };

  const saveMeasurements = async () => {
    if (!activeItemId || !draft || draft.entries.length === 0) return;
    setSavingItemId(activeItemId);
    setSaveError(null);
    setSaveNotice(null);
    try {
      await onSaveMeasurements(activeItemId, draft);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "No pudimos guardar las medidas. Intenta nuevamente.");
      setSavingItemId(null);
      return;
    }
    refreshDirectGlassDistribution(quoteId);
    setActiveItemId(null);
    setDraft(null);
    if (!onRetryRefresh) {
      setSaveNotice("Medidas guardadas. La cobertura se actualizará al volver a abrir la distribución.");
      setSavingItemId(null);
      return;
    }
    setSaveNotice("Medidas guardadas. Actualizando cobertura…");
    try {
      await onRetryRefresh?.();
      setSaveNotice("Medidas guardadas. Cobertura actualizada.");
    } catch (cause) {
      const reason = cause instanceof Error ? ` ${cause.message}` : "";
      setSaveError(`Las medidas quedaron guardadas, pero no pudimos actualizar la cobertura.${reason}`);
    } finally {
      setSavingItemId(null);
    }
  };

  const retryCoverageRefresh = async () => {
    if (!onRetryRefresh || retryingRefresh) return;
    setRetryingRefresh(true);
    setSaveError(null);
    setSaveNotice("Actualizando cobertura…");
    try {
      await onRetryRefresh();
      setSaveNotice("Medidas guardadas. Cobertura actualizada.");
    } catch {
      setSaveError("No pudimos actualizar la cobertura. Puedes reintentar sin volver a guardar las medidas.");
    } finally {
      setRetryingRefresh(false);
    }
  };

  const renderReferenceGroup = (group: ReferenceGroup, kind: "excluded" | "coverage") => {
    const editing = activeItemId === group.itemId;
    const groupItem = itemsById.get(group.itemId);
    const savedManualEntries = groupItem?.manualGlassMeasurements?.entries
      ?? decodeCotizacionItemPresentationMeta(groupItem?.observaciones ?? "").manualGlassMeasurements.entries;
    const missingDimensions = group.geometryStatuses.has("missing_dimensions");
    const needsTechnicalReview = group.geometryStatuses.has("review_required");
    const actionLabel = missingDimensions
      ? savedManualEntries.length > 0 ? "Completar medidas" : "Ingresar medidas"
      : needsTechnicalReview && savedManualEntries.length > 0 ? "Revisar datos técnicos" : null;
    const groupStatusLabel = missingDimensions
        ? `${group.count} ${group.count === 1 ? "referencia necesita medidas finales" : "referencias necesitan medidas finales"}`
        : needsTechnicalReview
          ? `${group.count} ${group.count === 1 ? "referencia requiere revisar datos técnicos" : "referencias requieren revisar datos técnicos"}`
          : kind === "excluded"
            ? `${group.count} ${group.count === 1 ? "referencia excluida" : "referencias excluidas"} de la simulación`
            : `${group.count} ${group.count === 1 ? "referencia con revisión operativa pendiente" : "referencias con revisión operativa pendiente"}`;
    return (
      <li key={`${kind}:${group.itemId}:${group.componentCode}`}>
        <div className={s.pendingRow}>
          <div className={s.pendingCopy}>
            <b>{group.componentCode} · {group.componentName}</b>
            <small>{group.displayNames.length > 0 ? `${group.displayNames.join(", ")} · ` : ""}{groupStatusLabel}</small>
            {group.reasons.map((reason) => <small key={reason}>{reason}</small>)}
          </div>
          {actionLabel && group.itemId && itemsById.has(group.itemId) ? (
            <button type="button" className={s.editButton} onClick={() => editing ? setActiveItemId(null) : openEditor(group.itemId)}>
              {editing ? "Cerrar" : actionLabel}
            </button>
          ) : null}
        </div>
        {editing && activeItem && draft ? (
          <div className={s.inlineEditor}>
            <ManualGlassMeasurementsEditor
              compact
              value={draft}
              templates={templates}
              selectedGlassProductId={activePresentation?.vidrioLineTemplateId}
              componentId={activeItem.id}
              openImmediately
              automaticDimensionsAvailable={automaticDimensionsAvailable}
              automaticPanes={activeItem?.fabricacionSnapshot?.result?.vidrios?.map((pane) => ({ id: pane.vidrioId, name: pane.nombre, widthMm: pane.anchoMm, heightMm: pane.altoMm, quantity: pane.cantidadPiezas }))}
              automaticRecipeStatus={activeItem?.fabricacionSnapshot?.recipeStatus}
              paneConfiguration={{
                componentType: resolveManualGlassPaneComponentType({
                  itemType: activeItem.tipo,
                  fabricationType: activePresentation?.fabricacionTipologia,
                }),
                system: activePresentation?.sistema,
                configuration: activePresentation?.configuracion,
                sheetScheme: activePresentation?.sheetScheme,
                fabricacionHojas: activePresentation?.fabricacionHojas,
                guidedVisualConfig: activePresentation?.guidedVisualConfig,
                quickCompositionAdjustment: activePresentation?.quickCompositionAdjustment,
              }}
              onChange={setDraft}
            />
            {saveError ? <p className={s.saveError} role="alert">{saveError}</p> : null}
            <div className={s.editorActions}>
              <button type="button" className={s.cancelButton} onClick={() => { setActiveItemId(null); setDraft(null); }}>Cancelar</button>
              <button type="button" className={s.saveButton} onClick={() => void saveMeasurements()} disabled={savingItemId !== null || draft.entries.length === 0} aria-busy={savingItemId === group.itemId}>
                {savingItemId === group.itemId ? "Guardando…" : "Guardar medidas en cotización"}
              </button>
            </div>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <aside className={s.notice} aria-label="Cobertura de medidas de vidrio" aria-live="polite" data-quote-id={quoteId}>
      <section className={s.geometrySection} aria-labelledby="glass-geometry-status">
        <div className={s.summary}>
          <strong id="glass-geometry-status">{isRefreshing || !isCoverageCurrent ? "Actualizando simulación" : geometricStatus}</strong>
          <span>{`${previewableReferenceCount} ${previewableReferenceCount === 1 ? "referencia incluida" : "referencias incluidas"} · ${displayedUnitCount} ${displayedUnitCount === 1 ? "unidad física" : "unidades físicas"}`}</span>
        </div>
        {excludedReferenceCount > 0 ? <p>{`${excludedReferenceCount} ${excludedReferenceCount === 1 ? "referencia excluida" : "referencias excluidas"} de la simulación; revisa el motivo indicado.`}</p> : null}
        {exclusionGroups.length > 0 ? <ul className={s.exclusionList} aria-label="Motivos de exclusión geométrica">
          {exclusionGroups.map((group) => renderReferenceGroup(group, "excluded"))}
        </ul> : null}
        {isRefreshing ? <p role="status">Actualizando paños, referencias y disponibilidad de descarga…</p> : null}
        {!isCoverageCurrent && !isRefreshing ? <p role="status">Se ocultan los conteos anteriores hasta confirmar la cobertura vigente.</p> : null}
      </section>
      <section className={s.operationalSection} aria-labelledby="glass-operational-status">
        <strong id="glass-operational-status">Preparación operativa del taller</strong>
        <span>{isRefreshing || !isCoverageCurrent ? "Actualizando cobertura operativa…" : `${coverage.completeReferenceCount} ${coverage.completeReferenceCount === 1 ? "referencia con cobertura completa" : "referencias con cobertura completa"} · ${coverage.pendingReferenceCount} ${coverage.pendingReferenceCount === 1 ? "pendiente" : "pendientes"}`}</span>
        <p>La simulación geométrica no habilita documentos operativos; estos requieren validación técnica del taller.</p>
      </section>
      {isCoverageCurrent && !isRefreshing && pendingGroups.length > 0 ? (
        <ul aria-label="Referencias pendientes para cobertura operativa">
          {pendingGroups.map((group) => renderReferenceGroup(group, "coverage"))}
        </ul>
      ) : null}
      {saveNotice ? <p className={s.saveNotice} role="status">{saveNotice}</p> : null}
      {saveError && !activeItemId ? <p className={s.saveError} role="alert">{saveError}</p> : null}
      {refreshError && !saveError ? <p className={s.saveError} role="alert">{refreshError}</p> : null}
      {saveError && onRetryRefresh && !activeItemId ? <button type="button" className={s.retryButton} onClick={() => void retryCoverageRefresh()} disabled={retryingRefresh}>
        {retryingRefresh ? "Actualizando…" : "Reintentar actualización"}
      </button> : null}
    </aside>
  );
}
