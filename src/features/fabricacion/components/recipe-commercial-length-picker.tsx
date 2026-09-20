"use client";

import { useEffect, useId, useRef, useState } from "react";

import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

import s from "./fabricacion-workspace.module.css";

type Props = {
  value: number | null | undefined;
  usedByWorkshop: number[];
  otherFrequent: number[];
  readOnly?: boolean;
  emptyLabel?: string;
  showUnitSuffix?: boolean;
  onChange: (value: number | null) => void;
};

function formatMeters(value: number) {
  return `${(value / 1000).toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`;
}

function formatOptionLabel(value: number) {
  const meters = formatMeters(value);
  if (value === VENTORA_LARGO_COMERCIAL_PRESET_MM) {
    return `${meters} · sugerido Ventora`;
  }
  return meters;
}

function buildQuickOptions(usedByWorkshop: number[], otherFrequent: number[]) {
  return Array.from(
    new Set([
      VENTORA_LARGO_COMERCIAL_PRESET_MM,
      5950,
      ...usedByWorkshop,
      ...otherFrequent,
    ])
  ).filter((value) => Number.isFinite(value) && value > 0);
}

export function RecipeCommercialLengthPicker({
  value,
  usedByWorkshop,
  otherFrequent,
  readOnly = false,
  emptyLabel = "Por confirmar",
  showUnitSuffix = true,
  onChange,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const label =
    typeof value === "number" && value > 0
      ? formatOptionLabel(value)
      : emptyLabel;
  const quickOptions = buildQuickOptions(usedByWorkshop, otherFrequent);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCustomMode(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setCustomMode(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const applyValue = (next: number | null) => {
    onChange(next);
    setOpen(false);
    setCustomMode(false);
    setCustomValue("");
  };

  return (
    <div
      className={`${s.recipeBuildCommercialLength} ${s.recipeBuildSelectLike} ${s.recipeBuildPicker}`}
      ref={rootRef}
      data-open={open}
    >
      <button
        type="button"
        className={s.recipeBuildPickerTrigger}
        aria-label="Largo comercial"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={readOnly}
        onClick={() => {
          if (readOnly) return;
          setOpen((current) => !current);
          setCustomMode(false);
          setCustomValue(
            typeof value === "number" && value > 0 ? String(value) : ""
          );
        }}
      >
        <span data-empty={!(typeof value === "number" && value > 0)}>{label}</span>
      </button>
      {showUnitSuffix ? <small>mm</small> : null}

      {open ? (
        <div
          id={panelId}
          className={s.recipeBuildPickerPanel}
          role="dialog"
          aria-label="Elegir largo comercial"
        >
          {!customMode ? (
            <>
              <div className={s.recipeBuildPickerGroup} data-picker-options="true">
                <p>Elegir largo</p>
                <ul data-picker-options-list="true">
                  {quickOptions.map((largo) => (
                    <li key={`quick-${largo}`}>
                      <button
                        type="button"
                        data-picker-option="true"
                        data-selected={value === largo}
                        aria-pressed={value === largo}
                        onClick={() => applyValue(largo)}
                      >
                        <strong>{formatMeters(largo)}</strong>
                        {largo === VENTORA_LARGO_COMERCIAL_PRESET_MM ? (
                          <small>Sugerido Ventora</small>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className={s.recipeBuildPickerCreateAction}
                onClick={() => setCustomMode(true)}
              >
                Otro largo…
              </button>
              {typeof value === "number" && value > 0 ? (
                <button
                  type="button"
                  className={s.recipeBuildPickerClearAction}
                  onClick={() => applyValue(null)}
                >
                  Dejar por confirmar
                </button>
              ) : null}
            </>
          ) : (
            <div className={s.recipeBuildPickerCreateForm}>
              <p>Otro largo</p>
              <label>
                <span>Medida en mm</span>
                <input
                  type="number"
                  min={1}
                  value={customValue}
                  placeholder="Ej. 5950"
                  autoFocus
                  onChange={(event) => setCustomValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    const parsed = Math.round(Number(customValue));
                    if (Number.isFinite(parsed) && parsed > 0) applyValue(parsed);
                  }}
                />
              </label>
              <div className={s.recipeBuildPickerCreateActions}>
                <button
                  type="button"
                  className={s.secondaryButton}
                  onClick={() => setCustomMode(false)}
                >
                  Volver
                </button>
                <button
                  type="button"
                  className={s.primaryButton}
                  onClick={() => {
                    const parsed = Math.round(Number(customValue));
                    if (Number.isFinite(parsed) && parsed > 0) applyValue(parsed);
                  }}
                >
                  Usar medida
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
