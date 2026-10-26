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
};

export function ManualGlassMeasurementsEditor({ value, templates, onChange, compact = false, automaticDimensionsAvailable = false, selectedGlassProductId = null, componentId = null, paneConfiguration }: Props) {
  const headingId = useId();
  const shouldOpenFromDeepLink = typeof window !== "undefined" && (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("focus") === "glass" && Boolean(componentId) && params.get("itemId") === componentId;
  })();
  const snapshot = normalizeManualGlassPaneMeasurements(value);
  const paneResolution = resolveManualGlassPaneSlots(paneConfiguration ?? {});
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const selectedProduct = glassProducts.find((template) => String(template.id) === productId) ?? null;
  const selectedSpec = selectedProduct ? getCatalogGlassTechnicalSpec(selectedProduct) : null;

  useEffect(() => {
    if (!shouldOpenFromDeepLink) return;
    const timer = window.setTimeout(() => {
      setIsFormOpen(true);
      if (selectedGlassProductId) setProductId(selectedGlassProductId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedGlassProductId, shouldOpenFromDeepLink]);

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
      allPanesConfirmed: paneResolution.countIsKnown ? undefined : confirmationValid && snapshot.allPanesConfirmed === true,
    });
    resetForm();
  };

  const beginEdit = (entry: ManualGlassPaneMeasurement) => {
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
    beginEdit(entry);
    setEditingId(entry.id);
    setDuplicateEntry(true);
  };

  const removeEntry = (id: string) => {
    onChange({ version: 2, entries: snapshot.entries.filter((entry) => entry.id !== id), configurationFingerprint: paneResolution.configurationFingerprint, expectedPaneCount: paneResolution.countIsKnown ? expectedSlots.length : null, allPanesConfirmed: false });
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
                  <button type="button" onClick={() => beginDuplicate(entry)} aria-label={`Duplicar ${product?.nombre ?? "vidrio"}`}>Duplicar</button>
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
          <button type="button" className={s.entryButton} onClick={() => {
            if (selectedGlassProductId) setProductId(selectedGlassProductId);
            setIsFormOpen(true);
          }}>
            {automaticDimensionsAvailable ? "Agregar medidas manuales" : "Ingresar medidas"}
          </button>
        </div>
      )}

      {snapshot.entries.length > 0 ? (
        <button type="button" className={s.entryButton} onClick={() => setIsFormOpen((open) => !open)}>
          {isFormOpen ? "Cerrar ingreso" : "Agregar referencia"}
        </button>
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
          {expectedSlots.length > 0 ? (
            <label className={s.productField}>
              <span>Posición del paño</span>
              <select value={editingSlotId} onChange={(event) => setEditingSlotId(event.target.value)} required>
                <option value="">Seleccionar paño</option>
                {expectedSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
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
              Completa y confirma espesor, categoría, formato de plancha y corte en la ficha de este vidrio para usarlo en la distribución.
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
