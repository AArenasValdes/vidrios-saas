"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
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

type Props = {
  value?: ManualGlassPaneMeasurementsSnapshot | null;
  templates: readonly CotizacionLineTemplate[];
  onChange: (value: ManualGlassPaneMeasurementsSnapshot) => void;
  compact?: boolean;
  automaticDimensionsAvailable?: boolean;
};

export function ManualGlassMeasurementsEditor({ value, templates, onChange, compact = false, automaticDimensionsAvailable = false }: Props) {
  const headingId = useId();
  const snapshot = normalizeManualGlassPaneMeasurements(value);
  const glassProducts = useMemo(
    () => templates.filter((template) => template.categoria === "vidrio" && template.isActive && !template.eliminadoEn),
    [templates]
  );
  const [productId, setProductId] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedProduct = glassProducts.find((template) => String(template.id) === productId) ?? null;
  const selectedSpec = selectedProduct ? getCatalogGlassTechnicalSpec(selectedProduct) : null;

  const resetForm = () => {
    setProductId("");
    setWidthMm("");
    setHeightMm("");
    setQuantity("1");
    setEditingId(null);
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
      ...(editingId ? { existingId: editingId } : {}),
    });
    const entries = editingId
      ? snapshot.entries.map((entry) => entry.id === editingId ? measurement : entry)
      : [...snapshot.entries, measurement];
    onChange({ version: 1, entries });
    resetForm();
  };

  const beginEdit = (entry: ManualGlassPaneMeasurement) => {
    setProductId(entry.productId);
    setWidthMm(String(entry.widthMm));
    setHeightMm(String(entry.heightMm));
    setQuantity(String(entry.quantity));
    setEditingId(entry.id);
    setError(null);
  };

  const removeEntry = (id: string) => {
    onChange({ version: 1, entries: snapshot.entries.filter((entry) => entry.id !== id) });
    if (editingId === id) resetForm();
  };

  return (
    <section className={`${s.root} ${compact ? s.compact : ""}`} aria-labelledby={headingId}>
      <div className={s.heading}>
        <div>
          <h3 id={headingId}>Medidas finales del vidrio</h3>
          <p>Ingresa medidas de corte por referencia. No se calculan desde el vano.</p>
        </div>
        <span className={s.sourceBadge}>Manual</span>
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
                </div>
                <div className={s.entryActions}>
                  <button type="button" onClick={() => beginEdit(entry)} aria-label={`Editar medidas de ${product?.nombre ?? "vidrio"}`}>Editar</button>
                  <button type="button" onClick={() => removeEntry(entry.id)} aria-label={`Quitar medidas de ${product?.nombre ?? "vidrio"}`}>Quitar</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={s.empty}>{automaticDimensionsAvailable
          ? "La receta aporta medidas automáticas. Puedes guardar referencias manuales como respaldo."
          : "Faltan medidas finales del vidrio para este componente."}</p>
      )}

      {glassProducts.length === 0 ? (
        <p className={s.catalogEmpty}>No hay vidrios activos en el catálogo de esta organización.</p>
      ) : (
        <form className={s.form} onSubmit={saveMeasurement}>
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
            <label><span>Cantidad física</span><input inputMode="numeric" pattern="[0-9]*" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          </div>
          {error ? <p className={s.error} role="alert">{error}</p> : null}
          <div className={s.formActions}>
            {editingId ? <button type="button" className={s.secondaryButton} onClick={resetForm}>Cancelar edición</button> : null}
            <button type="submit" className={s.primaryButton}>
              {editingId ? "Guardar medidas" : "Agregar referencia de vidrio"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
