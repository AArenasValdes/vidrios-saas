"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuChevronDown, LuX } from "react-icons/lu";
import { toast } from "sonner";

import {
  LINE_TEMPLATE_HABITUAL_GLASS_NONE,
  LINE_TEMPLATE_HABITUAL_GLASS_OPTIONS,
} from "@/features/cotizaciones/line-templates/constants/line-template-habitual-glass";

import { cotizacionLineTemplatesService } from "@/features/cotizaciones/line-templates/services/cotizacion-line-templates.service";
import {
  lineTemplateNeedsCommercialPrice,
  getLineTemplateSystemMetadata,
  type CotizacionLineTemplate,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import styles from "./line-template-price-editor.module.css";

/* ────────────────────────────── types ────────────────────────────── */

type LinePriceEditorProps = {
  template: CotizacionLineTemplate;
  organizationId: string | number;
  /** Called after a successful save with the updated template. */
  onSaved: (updated: CotizacionLineTemplate) => void;
  onClose: () => void;
  /** Render as portal overlay (default true). Set false to embed inline. */
  overlay?: boolean;
};

const ROUNDING_OPTIONS = [
  { value: 1000, label: "$1.000" },
  { value: 5000, label: "$5.000" },
  { value: 10000, label: "$10.000" },
] as const;

/* ────────────────────────── helpers ───────────────────────────── */

function stripNonDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function formatMoneyDisplay(raw: string) {
  const digits = stripNonDigits(raw);
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CL");
}

/* ────────────────────────── component ────────────────────────── */

export function LinePriceEditor({
  template,
  organizationId,
  onSaved,
  onClose,
  overlay = true,
}: LinePriceEditorProps) {
  const isNew = lineTemplateNeedsCommercialPrice(template);
  const systemMeta = getLineTemplateSystemMetadata(template.catalogMetadata);

  const [precioRaw, setPrecioRaw] = useState(
    isNew ? "" : String(Math.round(template.precioM2Sugerido))
  );
  const [minimoRaw, setMinimoRaw] = useState(
    template.minimoCobrable > 0 ? String(Math.round(template.minimoCobrable)) : ""
  );
  const [redondeo, setRedondeo] = useState(
    ROUNDING_OPTIONS.some((o) => o.value === template.redondeoPrecio)
      ? template.redondeoPrecio
      : 1000
  );
  const [habitualGlass, setHabitualGlass] = useState(
    template.vidrioPrincipalRecomendado ?? LINE_TEMPLATE_HABITUAL_GLASS_NONE
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveLockRef = useRef(false);

  const handleSave = useCallback(async () => {
    if (saveLockRef.current) return;

    const precio = Number(stripNonDigits(precioRaw));
    if (!precio || precio <= 0) {
      setError("Ingresa un precio por m² válido.");
      return;
    }

    const minimo = Number(stripNonDigits(minimoRaw)) || 0;
    if (minimo < 0) {
      setError("El mínimo cobrable no puede ser negativo.");
      return;
    }

    saveLockRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      const updated = await cotizacionLineTemplatesService.updateTemplate(
        template.id,
        organizationId,
        {
          precioM2Sugerido: precio,
          minimoCobrable: minimo,
          redondeoPrecio: redondeo,
          vidrioPrincipalRecomendado:
            habitualGlass.trim() === LINE_TEMPLATE_HABITUAL_GLASS_NONE
              ? null
              : habitualGlass,
        }
      );
      toast.success("Precio guardado");
      onSaved(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el precio. Intenta nuevamente."
      );
    } finally {
      setIsSaving(false);
      saveLockRef.current = false;
    }
  }, [precioRaw, minimoRaw, redondeo, habitualGlass, template.id, organizationId, onSaved]);

  const title = isNew ? "Agregar precio de la línea" : "Editar precio de la línea";

  const body = (
    <div className={styles.editor} role="dialog" aria-modal={overlay} aria-label={title}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.lineName}>
            {template.nombre}
            <span className={styles.material}>
              {template.material}
              {systemMeta.lineSystem ? ` · ${systemMeta.lineSystem}` : ""}
            </span>
          </p>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Cerrar"
          onClick={onClose}
        >
          <LuX aria-hidden />
        </button>
      </header>

      {/* Help */}
      <p className={styles.help}>
        Este es el precio de venta por m² de esta línea. Queda guardado para
        futuras cotizaciones. Ventora calculará el total según las medidas y la
        cantidad.
      </p>

      {/* Fields */}
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Precio por m² <span className={styles.required}>*</span>
          </span>
          <div className={styles.moneyInputWrap}>
            <span className={styles.moneyPrefix}>$</span>
            <input
              className={styles.moneyInput}
              type="text"
              inputMode="numeric"
              placeholder="65.000"
              value={formatMoneyDisplay(precioRaw)}
              onChange={(e) => setPrecioRaw(stripNonDigits(e.target.value))}
              autoFocus
            />
          </div>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Mínimo cobrable</span>
          <div className={styles.moneyInputWrap}>
            <span className={styles.moneyPrefix}>$</span>
            <input
              className={styles.moneyInput}
              type="text"
              inputMode="numeric"
              placeholder="Sin mínimo"
              value={formatMoneyDisplay(minimoRaw)}
              onChange={(e) => setMinimoRaw(stripNonDigits(e.target.value))}
            />
          </div>
        </label>

        <fieldset className={styles.field}>
          <legend className={styles.fieldLabel}>Redondeo</legend>
          <div className={styles.roundingGroup}>
            {ROUNDING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.roundingChip} ${
                  redondeo === opt.value ? styles.roundingChipActive : ""
                }`}
                onClick={() => setRedondeo(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.advancedSection}>
          <button
            type="button"
            className={styles.advancedToggle}
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <span>Opciones avanzadas</span>
            <LuChevronDown
              aria-hidden
              className={`${styles.advancedChevron} ${
                advancedOpen ? styles.advancedChevronOpen : ""
              }`}
            />
          </button>

          {advancedOpen ? (
            <div className={styles.advancedBody}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Vidrio habitual de esta línea</span>
                <select
                  className={styles.glassSelect}
                  value={habitualGlass}
                  onChange={(event) => setHabitualGlass(event.target.value)}
                >
                  {LINE_TEMPLATE_HABITUAL_GLASS_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className={styles.fieldHelp}>
                  Se utilizará como sugerencia al crear una cotización. Puedes cambiarlo en cada
                  trabajo.
                </span>
              </label>
            </div>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {error ? <p className={styles.error}>{error}</p> : null}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onClose}
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={() => void handleSave()}
          disabled={isSaving}
        >
          {isSaving ? "Guardando…" : "Guardar precio"}
        </button>
      </div>
    </div>
  );

  if (!overlay) return body;

  return createPortal(
    <div className={styles.overlay}>
      <div
        className={styles.backdrop}
        role="presentation"
        onClick={onClose}
      />
      {body}
    </div>,
    document.body
  );
}
