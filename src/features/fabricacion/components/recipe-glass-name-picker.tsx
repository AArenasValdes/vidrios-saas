"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

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
  const [showCustom, setShowCustom] = useState(false);
  const trimmedValue = value.trim();

  if (readOnly) {
    return <p className={styles.readOnlyValue}>{trimmedValue || "Sin tipo definido"}</p>;
  }

  const applyCustomGlass = () => {
    const trimmed = customDraft.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setCustomDraft("");
    setShowCustom(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.primaryBlock}>
        <div className={styles.blockHeader}>
          <span className={styles.blockEyebrow}>Catálogo Ventora</span>
          {trimmedValue ? (
            <span className={styles.blockStatus}>Seleccionado</span>
          ) : (
            <span className={styles.blockStatusMuted}>Opcional</span>
          )}
        </div>
        <GlassOptionPicker
          options={catalogOptions}
          value={value}
          onChange={onChange}
          ariaLabel={ariaLabel}
          placeholder="Elegir vidrio habitual"
        />
      </div>

      <details
        className={styles.customDetails}
        open={showCustom}
        onToggle={(event) => setShowCustom(event.currentTarget.open)}
      >
        <summary className={styles.customSummary}>
          <span>¿No está en el catálogo?</span>
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <div className={styles.customBody}>
          <label className={styles.customField}>
            <span>Nombre del vidrio en tu taller</span>
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
          </label>
          <button
            type="button"
            className={styles.customApply}
            disabled={!customDraft.trim()}
            onClick={applyCustomGlass}
          >
            Usar este vidrio
          </button>
        </div>
      </details>
    </div>
  );
}
