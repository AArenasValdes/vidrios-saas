"use client";

import { useMemo, useState } from "react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { ManualGlassPaneMeasurementsSnapshot } from "@/features/cotizaciones/types/manual-glass-pane-measurements";
import { ManualGlassMeasurementsEditor } from "@/features/cotizaciones/components/manual-glass-measurements-editor";
import { refreshDirectGlassDistribution } from "@/features/fabricacion/hooks/use-direct-glass-distribution";
import type { GlassDistributionCoverage } from "@/features/fabricacion/services/glass-distribution-coverage.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import s from "./glass-distribution-coverage-notice.module.css";

type Props = {
  quoteId: string;
  coverage: GlassDistributionCoverage | null;
  items?: readonly CotizacionWorkflowItem[];
  templates?: readonly CotizacionLineTemplate[];
  previewablePaneIds?: readonly string[];
  previewableUnitCount?: number;
  excludedPreviewCount?: number;
  onSaveMeasurements?: (itemId: string, value: ManualGlassPaneMeasurementsSnapshot) => Promise<void>;
  isRefreshing?: boolean;
  isCoverageCurrent?: boolean;
  refreshError?: string | null;
  onRetryRefresh?: () => Promise<void>;
};

export function GlassDistributionCoverageNotice({ quoteId, coverage, items = [], templates = [], previewablePaneIds = [], previewableUnitCount = 0, excludedPreviewCount = 0, onSaveMeasurements = async () => undefined, isRefreshing = false, isCoverageCurrent = true, refreshError = null, onRetryRefresh }: Props) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManualGlassPaneMeasurementsSnapshot | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [retryingRefresh, setRetryingRefresh] = useState(false);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const pendingGroups = useMemo(() => {
    const groups = new Map<string, { itemId: string; componentCode: string; componentName: string; displayNames: string[]; count: number }>();
    for (const reference of coverage?.pendingReferences ?? []) {
      if (reference.paneId && previewablePaneIds.includes(reference.paneId)) continue;
      const key = reference.quoteItemId || `${reference.componentCode}:${reference.componentName}`;
      const current = groups.get(key);
      if (current) {
        current.count += 1;
        if (reference.displayName && !current.displayNames.includes(reference.displayName)) current.displayNames.push(reference.displayName);
      } else {
        groups.set(key, {
          itemId: reference.quoteItemId,
          componentCode: reference.componentCode,
          componentName: reference.componentName,
          displayNames: reference.displayName ? [reference.displayName] : [],
          count: 1,
        });
      }
    }
    return [...groups.values()];
  }, [coverage, previewablePaneIds]);

  if (!coverage || (coverage.status === "complete" && !saveNotice && !saveError && !refreshError)) return null;

  const partial = coverage.status === "partial";
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

  return (
    <aside className={s.notice} aria-label="Cobertura de medidas de vidrio" aria-live="polite" data-quote-id={quoteId}>
      <div className={s.summary}>
        <strong>{coverage.status === "complete" ? "Cobertura completa" : partial ? "Distribución parcial" : previewableUnitCount > 0 ? "Simulación preliminar disponible" : "Medidas de vidrio pendientes"}</strong>
        <span>{isRefreshing ? "Actualizando cobertura…" : !isCoverageCurrent ? "Cobertura desactualizada" : `Cobertura operativa: ${coverage.completeReferenceCount} completas · ${coverage.pendingReferenceCount} pendientes`}</span>
      </div>
      {isRefreshing ? <p role="status">Actualizando paños, referencias y disponibilidad de descarga…</p> : null}
      {!isCoverageCurrent && !isRefreshing ? <p role="status">Se ocultan los conteos anteriores hasta confirmar la cobertura vigente.</p> : null}
      {isCoverageCurrent && !isRefreshing && pendingGroups.length > 0 ? (
        <ul>
          {pendingGroups.map((group) => {
            const editing = activeItemId === group.itemId;
            return (
              <li key={`${group.itemId}:${group.componentCode}`}>
                <div className={s.pendingRow}>
                  <div className={s.pendingCopy}>
                    <b>{group.componentCode} · {group.componentName}</b>
                    <small>{group.displayNames.length > 0 ? `${group.displayNames.join(", ")} · ` : ""}{group.count} {group.count === 1 ? "paño pendiente" : "paños pendientes"}</small>
                  </div>
                  {group.itemId && itemsById.has(group.itemId) ? (
                    <button type="button" className={s.editButton} onClick={() => editing ? setActiveItemId(null) : openEditor(group.itemId)}>
                      {editing ? "Cerrar" : "Ingresar medidas"}
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
                      paneConfiguration={{
                        componentType: activePresentation?.fabricacionTipologia || activeItem.tipo,
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
                        {savingItemId === group.itemId ? "Guardando…" : "Guardar medidas"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : isCoverageCurrent && coverage.status !== "complete" && !isRefreshing ? <p>{previewableUnitCount > 0
        ? `La vista preliminar incluye ${previewableUnitCount} ${previewableUnitCount === 1 ? "unidad física" : "unidades físicas"}${excludedPreviewCount > 0 ? ` y excluye ${excludedPreviewCount} ${excludedPreviewCount === 1 ? "referencia" : "referencias"}` : ""}. El PDF de proveedor sigue bloqueado hasta completar la cobertura operativa.`
        : "Aún no hay medidas de vidrio disponibles para distribuir."}</p> : null}
      {saveNotice ? <p className={s.saveNotice} role="status">{saveNotice}</p> : null}
      {saveError && !activeItemId ? <p className={s.saveError} role="alert">{saveError}</p> : null}
      {refreshError && !saveError ? <p className={s.saveError} role="alert">{refreshError}</p> : null}
      {saveError && onRetryRefresh && !activeItemId ? <button type="button" className={s.retryButton} onClick={() => void retryCoverageRefresh()} disabled={retryingRefresh}>
        {retryingRefresh ? "Actualizando…" : "Reintentar actualización"}
      </button> : null}
    </aside>
  );
}
