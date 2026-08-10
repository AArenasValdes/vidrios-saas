"use client";

import { useEffect, useId, useRef, useState } from "react";

import s from "./fabricacion-workspace.module.css";

type Props = {
  value: number | null | undefined;
  usedByWorkshop: number[];
  otherFrequent: number[];
  readOnly?: boolean;
  onChange: (value: number | null) => void;
};

function formatMm(value: number) {
  return `${value.toLocaleString("es-CL")} mm`;
}

export function RecipeCommercialLengthPicker({
  value,
  usedByWorkshop,
  otherFrequent,
  readOnly = false,
  onChange,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const label =
    typeof value === "number" && value > 0 ? formatMm(value) : "Por confirmar";

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
      <small>mm</small>

      {open ? (
        <div
          id={panelId}
          className={s.recipeBuildPickerPanel}
          role="dialog"
          aria-label="Elegir largo comercial"
        >
          {!customMode ? (
            <>
              {usedByWorkshop.length > 0 ? (
                <div className={s.recipeBuildPickerGroup}>
                  <p>Usados por tu taller</p>
                  <ul>
                    {usedByWorkshop.map((largo) => (
                      <li key={`used-${largo}`}>
                        <button type="button" onClick={() => applyValue(largo)}>
                          <strong>{formatMm(largo)}</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {otherFrequent.length > 0 ? (
                <div className={s.recipeBuildPickerGroup}>
                  <p>{usedByWorkshop.length > 0 ? "Otros frecuentes" : "Frecuentes"}</p>
                  <ul>
                    {otherFrequent.map((largo) => (
                      <li key={`freq-${largo}`}>
                        <button type="button" onClick={() => applyValue(largo)}>
                          <strong>{formatMm(largo)}</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <button
                type="button"
                className={s.recipeBuildPickerCreateAction}
                onClick={() => setCustomMode(true)}
              >
                Otro…
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
                  placeholder="Ej. 6500"
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
