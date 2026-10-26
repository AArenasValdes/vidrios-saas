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
  onSaveMeasurements?: (itemId: string, value: ManualGlassPaneMeasurementsSnapshot) => Promise<void>;
};

export function GlassDistributionCoverageNotice({ quoteId, coverage, items = [], templates = [], onSaveMeasurements = async () => undefined }: Props) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManualGlassPaneMeasurementsSnapshot | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const pendingGroups = useMemo(() => {
    const groups = new Map<string, { itemId: string; componentCode: string; componentName: string; displayNames: string[]; count: number }>();
    for (const reference of coverage?.pendingReferences ?? []) {
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
  }, [coverage]);

  if (!coverage || coverage.status === "complete") return null;

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
      refreshDirectGlassDistribution(quoteId);
      setActiveItemId(null);
      setDraft(null);
      setSaveNotice("Medidas guardadas. Actualizando cobertura…");
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "No pudimos guardar las medidas. Intenta nuevamente.");
    } finally {
      setSavingItemId(null);
    }
  };

  return (
    <aside className={s.notice} aria-label="Cobertura de medidas de vidrio" aria-live="polite" data-quote-id={quoteId}>
      <div className={s.summary}>
        <strong>{partial ? "Distribución parcial" : "Medidas de vidrio pendientes"}</strong>
        <span>{coverage.completeReferenceCount} completas · {coverage.pendingReferenceCount} pendientes</span>
      </div>
      {pendingGroups.length > 0 ? (
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
      ) : <p>Aún no hay medidas de vidrio disponibles para distribuir.</p>}
      {saveNotice ? <p className={s.saveNotice} role="status">{saveNotice}</p> : null}
    </aside>
  );
}
