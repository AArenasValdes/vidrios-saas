"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { ManualGlassPaneMeasurement, ManualGlassPaneMeasurementsSnapshot } from "@/features/cotizaciones/types/manual-glass-pane-measurements";
import {
  createManualGlassPaneMeasurement,
  getCatalogGlassTechnicalSpec,
  isCatalogGlassPlanable,
  normalizeManualGlassPaneMeasurements,
  validateManualGlassPaneMeasurementInput,
} from "@/features/cotizaciones/services/manual-glass-pane-measurements.service";
import s from "./manual-glass-measurements-editor.module.css";
import { resolveManualGlassPaneSlots, type ManualGlassPaneConfiguration } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";

type Props = {
  value?: ManualGlassPaneMeasurementsSnapshot | null;
  templates: readonly CotizacionLineTemplate[];
  onChange: (value: ManualGlassPaneMeasurementsSnapshot) => void;
  compact?: boolean;
  automaticDimensionsAvailable?: boolean;
  selectedGlassProductId?: string | null;
  componentId?: string | null;
  paneConfiguration?: ManualGlassPaneConfiguration;
  openImmediately?: boolean;
  automaticPanes?: readonly { id: string; name: string; widthMm: number; heightMm: number; quantity: number }[];
  automaticRecipeStatus?: string | null;
};

export function ManualGlassMeasurementsEditor({ value, templates, onChange, compact = false, automaticDimensionsAvailable = false, selectedGlassProductId = null, componentId = null, paneConfiguration, openImmediately = false, automaticPanes = [], automaticRecipeStatus = null }: Props) {
  const headingId = useId();
  const glassDeepLinkRequestKey = typeof window !== "undefined" && (() => {
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get("edit");
    const targetItemId = params.get("itemId");
    return params.get("focus") === "glass" && Boolean(componentId) && targetItemId === componentId
      ? `${quoteId ?? ""}:${targetItemId}`
      : null;
  })() || null;
  const snapshot = normalizeManualGlassPaneMeasurements(value);
  const paneResolution = resolveManualGlassPaneSlots({ ...(paneConfiguration ?? {}), manualPaneCount: snapshot.manualPaneCount });
  const expectedSlots = paneResolution.slots;
  const confirmationValid = snapshot.configurationFingerprint === paneResolution.configurationFingerprint;
  const glassProducts = useMemo(
    () => templates.filter((template) => template.categoria === "vidrio" && template.isActive && !template.eliminadoEn),
    [templates]
  );
  const [productId, setProductId] = useState(selectedGlassProductId ?? "");
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [quantityBasis, setQuantityBasis] = useState<"total" | "per_component">("per_component");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState("");
  const [duplicateEntry, setDuplicateEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(openImmediately);
  const [manualPaneCountDraft, setManualPaneCountDraft] = useState("");
  const selectedProduct = glassProducts.find((template) => String(template.id) === productId) ?? null;
  const selectedSpec = selectedProduct ? getCatalogGlassTechnicalSpec(selectedProduct) : null;

  useEffect(() => {
    if (!openImmediately && !glassDeepLinkRequestKey) return;
    const timer = window.setTimeout(() => {
      setIsFormOpen(true);
      if (selectedGlassProductId) setProductId(selectedGlassProductId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedGlassProductId, glassDeepLinkRequestKey, openImmediately]);

  useEffect(() => {
    setManualPaneCountDraft(snapshot.manualPaneCount ? String(snapshot.manualPaneCount) : "");
  }, [snapshot.manualPaneCount]);

  const resetForm = () => {
    setProductId(selectedGlassProductId ?? "");
    setWidthMm("");
    setHeightMm("");
    setQuantity("1");
    setQuantityBasis("per_component");
    setEditingId(null);
    setEditingSlotId("");
    setDuplicateEntry(false);
    setError(null);
  };

  const saveMeasurement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const width = Number(widthMm);
    const height = Number(heightMm);
    const count = Number(quantity);
    const validationError = validateManualGlassPaneMeasurementInput({
      product: selectedProduct,
      widthMm: width,
      heightMm: height,
      quantity: count,
    });
    if (validationError || !selectedProduct) {
      setError(validationError ?? "Selecciona un vidrio activo del catálogo.");
      return;
    }
    const measurement = createManualGlassPaneMeasurement({
      product: selectedProduct,
      widthMm: width,
      heightMm: height,
      quantity: count,
      quantityBasis,
      paneSlotId: editingSlotId || undefined,
      sourcePosition: expectedSlots.find((slot) => slot.id === editingSlotId)?.position,
      rectangularVerified: expectedSlots.find((slot) => slot.id === editingSlotId)?.rectangular ?? true,
      ...((editingId && !duplicateEntry) ? { existingId: editingId } : {}),
    });
    const entries = editingId && !duplicateEntry
      ? snapshot.entries.map((entry) => entry.id === editingId ? measurement : entry)
      : [...snapshot.entries, measurement];
    onChange({
      version: 2,
      entries,
      configurationFingerprint: paneResolution.configurationFingerprint,
      expectedPaneCount: paneResolution.countIsKnown ? expectedSlots.length : null,
      ...(snapshot.manualPaneCount ? { manualPaneCount: snapshot.manualPaneCount } : {}),
      allPanesConfirmed: paneResolution.countIsKnown ? undefined : confirmationValid && snapshot.allPanesConfirmed === true,
    });
    resetForm();
  };

  const beginEdit = (entry: ManualGlassPaneMeasurement) => {
    setIsFormOpen(true);
    setProductId(entry.productId);
    setWidthMm(String(entry.widthMm));
    setHeightMm(String(entry.heightMm));
    setQuantity(String(entry.quantity));
    setQuantityBasis(entry.quantityBasis ?? (entry.version === 1 ? "total" : "per_component"));
    setEditingId(entry.id);
    setEditingSlotId(entry.paneSlotId ?? "");
    setDuplicateEntry(false);
    setError(null);
  };

  const beginDuplicate = (entry: ManualGlassPaneMeasurement) => {
    if (paneResolution.countIsKnown) {
      const occupiedSlots = new Set(snapshot.entries.map((candidate) => candidate.paneSlotId).filter(Boolean));
      const nextSlot = expectedSlots.find((slot) => !occupiedSlots.has(slot.id));
      if (!nextSlot) {
        setError("Todos los paños ya tienen medidas; no se creó una referencia duplicada.");
        return;
      }
      beginEdit(entry);
      setEditingSlotId(nextSlot.id);
      setDuplicateEntry(true);
      return;
    }
    beginEdit(entry);
    setEditingId(entry.id);
    setDuplicateEntry(true);
  };

  const createManualSlots = () => {
    const count = Number(manualPaneCountDraft);
    if (!Number.isSafeInteger(count) || count < 1 || count > 12) return;
    const resolution = resolveManualGlassPaneSlots({ ...(paneConfiguration ?? {}), manualPaneCount: count });
    if (!resolution.countIsKnown) return;
    onChange({
      version: 2,
      entries: snapshot.entries,
      configurationFingerprint: resolution.configurationFingerprint,
      expectedPaneCount: count,
      manualPaneCount: count,
      allPanesConfirmed: undefined,
    });
  };

  const occupiedSlotIds = new Set(snapshot.entries
    .filter((entry) => !editingId || duplicateEntry || entry.id !== editingId)
    .map((entry) => entry.paneSlotId)
    .filter((slotId): slotId is string => Boolean(slotId)));
  const availableSlots = expectedSlots.filter((slot) => !occupiedSlotIds.has(slot.id) || (!duplicateEntry && slot.id === editingSlotId));
  const canDuplicateToSlot = !paneResolution.countIsKnown
    || expectedSlots.some((slot) => !snapshot.entries.some((entry) => entry.paneSlotId === slot.id));

  const removeEntry = (id: string) => {
    onChange({ version: 2, entries: snapshot.entries.filter((entry) => entry.id !== id), configurationFingerprint: paneResolution.configurationFingerprint, expectedPaneCount: paneResolution.countIsKnown ? expectedSlots.length : null, ...(snapshot.manualPaneCount ? { manualPaneCount: snapshot.manualPaneCount } : {}), allPanesConfirmed: false });
    if (editingId === id) resetForm();
  };

  return (
    <section className={`${s.root} ${compact ? s.compact : ""}`} aria-labelledby={headingId}>
      <div className={s.heading}>
        <div>
          <h3 id={headingId}>Medidas finales del vidrio</h3>
          <p>Medidas de corte por referencia; no se calculan desde el vano.</p>
        </div>
        {snapshot.entries.length > 0 ? <span className={s.sourceBadge}>Manual</span> : null}
      </div>

      {automaticPanes.some((pane) => Number.isSafeInteger(pane.widthMm) && pane.widthMm > 0 && Number.isSafeInteger(pane.heightMm) && pane.heightMm > 0) ? (
        <div className={s.entries} aria-label="Medidas congeladas de fabricación">
          <div className={s.heading}>
            <div><h4>Medidas guardadas en el snapshot</h4><p>Se reutilizan tal como están; no se calculan desde el vano.</p></div>
            <span className={s.sourceBadge}>{automaticRecipeStatus === "validated" ? "Receta: validada" : `Receta: ${automaticRecipeStatus ?? "estado no disponible"}`}</span>
          </div>
          <ul className={s.entries}>
            {automaticPanes.filter((pane) => Number.isSafeInteger(pane.widthMm) && pane.widthMm > 0 && Number.isSafeInteger(pane.heightMm) && pane.heightMm > 0).map((pane, index) => (
              <li className={s.entry} key={pane.id}>
                <div className={s.entryCopy}><strong>{pane.name || `Paño ${index + 1}`}</strong><span>{pane.widthMm} × {pane.heightMm} mm · {pane.quantity} {pane.quantity === 1 ? "unidad física" : "unidades físicas"}</span></div>
                <span className={s.sourceBadge}>Snapshot congelado</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshot.entries.length > 0 ? (
        <ul className={s.entries}>
          {snapshot.entries.map((entry) => {
            const product = templates.find((template) => String(template.id) === entry.productId);
            return (
              <li className={s.entry} key={entry.id}>
                <div className={s.entryCopy}>
                  <strong>{product?.nombre ?? `Vidrio del catálogo ${entry.productId}`}</strong>
                  <span>{entry.widthMm} × {entry.heightMm} mm · {entry.quantity} {entry.quantity === 1 ? "unidad" : "unidades"}</span>
                  {entry.sourcePosition ? <span>{entry.sourcePosition}{entry.rectangularVerified === false ? " · forma no rectangular" : ""}</span> : null}
                </div>
                <div className={s.entryActions}>
                  <button type="button" onClick={() => beginEdit(entry)} aria-label={`Editar medidas de ${product?.nombre ?? "vidrio"}`}>Editar</button>
                  <button type="button" onClick={() => beginDuplicate(entry)} disabled={!canDuplicateToSlot} aria-label={`Copiar medidas de ${product?.nombre ?? "vidrio"} a otro paño`}>Copiar a otro paño</button>
                  <button type="button" onClick={() => removeEntry(entry.id)} aria-label={`Quitar medidas de ${product?.nombre ?? "vidrio"}`}>Quitar</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={s.emptyState}>
          <p className={s.empty}>{automaticDimensionsAvailable
            ? "Medidas automáticas disponibles"
            : "Medidas de vidrio pendientes"}</p>
          {paneResolution.countIsKnown ? <button type="button" className={s.entryButton} onClick={() => {
            if (selectedGlassProductId) setProductId(selectedGlassProductId);
            setIsFormOpen(true);
          }}>
            {automaticDimensionsAvailable ? "Agregar medidas manuales" : "Ingresar medidas"}
          </button> : null}
        </div>
      )}

      {snapshot.entries.length > 0 ? (
        <button type="button" className={s.entryButton} onClick={() => setIsFormOpen((open) => !open)}>
          {isFormOpen ? "Cerrar ingreso" : "Agregar referencia"}
        </button>
      ) : null}

      {!paneResolution.countIsKnown ? (
        <div className={s.form}>
          <label className={s.productField}>
            <span>¿Cuántos paños rectangulares tiene el componente?</span>
            <select aria-label="Cantidad de paños del componente" value={manualPaneCountDraft} onChange={(event) => setManualPaneCountDraft(event.target.value)}>
              <option value="">Indicar cantidad</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? "paño" : "paños"}</option>)}
            </select>
          </label>
          <button type="button" className={s.entryButton} onClick={createManualSlots} disabled={!manualPaneCountDraft}>Crear posiciones de paño</button>
          {snapshot.entries.length > 0 && snapshot.manualPaneCount == null ? <p className={s.validationHint}>Las medidas anteriores no tenían posiciones identificadas. Confirma la cantidad y vuelve a asociarlas para distribuirlas sin duplicar.</p> : null}
        </div>
      ) : null}

      {paneResolution.countIsKnown ? (
        <p className={s.validationHint} role="status">
          {!confirmationValid && snapshot.configurationFingerprint
            ? "La composición cambió; revisa las posiciones guardadas. "
            : null}
          {expectedSlots.length} {expectedSlots.length === 1 ? "paño identificado" : "paños identificados"}. {expectedSlots.filter((slot) => !snapshot.entries.some((entry) => entry.paneSlotId === slot.id)).map((slot) => slot.label).join(" · ") || "Todos tienen una referencia guardada."}
        </p>
      ) : snapshot.entries.length > 0 ? (
        <label className={s.confirmAll}>
          <input
            type="checkbox"
            checked={confirmationValid && snapshot.allPanesConfirmed === true}
            onChange={(event) => onChange({ version: 2, entries: snapshot.entries, configurationFingerprint: paneResolution.configurationFingerprint, expectedPaneCount: null, allPanesConfirmed: event.target.checked })}
          />
          <span>Confirmo que registré todos los paños de este componente.</span>
        </label>
      ) : null}

      {isFormOpen && glassProducts.length === 0 ? (
        <p className={s.catalogEmpty}>No hay vidrios activos en el catálogo de esta organización.</p>
      ) : isFormOpen ? (
        <form className={s.form} onSubmit={saveMeasurement}>
          <p className={s.validationHint}>Selecciona un paño y un vidrio, ingresa ancho, alto y cantidad, y pulsa «Agregar referencia de vidrio». Al completar las posiciones, pulsa «Guardar cambios».</p>
          {expectedSlots.length > 0 ? (
            <label className={s.productField}>
              <span>Posición del paño</span>
              <select value={editingSlotId} onChange={(event) => setEditingSlotId(event.target.value)} required>
                <option value="">Seleccionar paño</option>
                {availableSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
              </select>
            </label>
          ) : null}
          <label className={s.productField}>
            <span>Producto del catálogo</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">Seleccionar vidrio</option>
              {glassProducts.map((product) => (
                <option key={product.id} value={String(product.id)}>{product.nombre}</option>
              ))}
            </select>
          </label>
          {selectedSpec && !isCatalogGlassPlanable(selectedSpec) ? (
            <p className={s.validationHint} role="status">
              {selectedSpec.purchaseMode === "supplier_cut"
                ? "Este vidrio se compra cortado por proveedor. Puedes guardar medidas finales para la cotización, pero no se distribuirá como plancha de corte del taller."
                : "Puedes guardar las medidas finales ahora. Para distribuirlas, la ficha deberá tener espesor, categoría, formato de plancha y aptitud de corte confirmados."}
            </p>
          ) : null}
          <div className={s.measureFields}>
            <label><span>Ancho final (mm)</span><input inputMode="numeric" pattern="[0-9]*" value={widthMm} onChange={(event) => setWidthMm(event.target.value)} placeholder="Ej. 600" /></label>
            <label><span>Alto final (mm)</span><input inputMode="numeric" pattern="[0-9]*" value={heightMm} onChange={(event) => setHeightMm(event.target.value)} placeholder="Ej. 1000" /></label>
            <label><span>{quantityBasis === "per_component" ? "Cantidad por componente" : "Cantidad física total"}</span><input inputMode="numeric" pattern="[0-9]*" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          </div>
          {error ? <p className={s.error} role="alert">{error}</p> : null}
          <div className={s.formActions}>
            {editingId ? <button type="button" className={s.secondaryButton} onClick={resetForm}>Cancelar edición</button> : null}
            <button type="submit" className={s.primaryButton}>
              {editingId && !duplicateEntry ? "Guardar medidas" : duplicateEntry ? "Guardar copia" : "Agregar referencia de vidrio"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
