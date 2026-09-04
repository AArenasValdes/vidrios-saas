"use client";

import { useMemo, useState } from "react";

import { listVentoraGlassCatalogOptions } from "@/features/cotizaciones/new-quote/workflow-ui";
import { GlassOptionPicker } from "@/features/cotizaciones/visual-composer/components/glass-option-picker";

import styles from "./recipe-glass-name-picker.module.css";

type RecipeGlassNamePickerProps = {
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  ariaLabel?: string;
};

export function RecipeGlassNamePicker({
  value,
  onChange,
  readOnly = false,
  ariaLabel = "Elegir tipo de vidrio",
}: RecipeGlassNamePickerProps) {
  const catalogOptions = useMemo(() => listVentoraGlassCatalogOptions(), []);
  const [customDraft, setCustomDraft] = useState("");

  if (readOnly) {
    return <p className={styles.readOnlyValue}>{value.trim() || "Sin tipo definido"}</p>;
  }

  const applyCustomGlass = () => {
    const trimmed = customDraft.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setCustomDraft("");
  };

  return (
    <div className={styles.root}>
      <GlassOptionPicker
        options={catalogOptions}
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel}
        placeholder="Elegir del catálogo Ventora"
      />

      <label className={styles.customField}>
        <span>Otro vidrio del taller</span>
        <div className={styles.customRow}>
          <input
            value={customDraft}
            onChange={(event) => setCustomDraft(event.target.value)}
            placeholder="Ej: DVH Low-E 6+12+6 especial"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyCustomGlass();
              }
            }}
          />
          <button
            type="button"
            className={styles.customApply}
            disabled={!customDraft.trim()}
            onClick={applyCustomGlass}
          >
            Usar este vidrio
          </button>
        </div>
        <small className={styles.customHint}>
          Puedes elegir del catálogo Ventora o escribir uno que no esté listado.
        </small>
      </label>
    </div>
  );
}
