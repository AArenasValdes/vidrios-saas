"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";

import {
  formatMeasureFromMm,
  isCompleteMeasureDraft,
  parseMeasureToMm,
  sanitizeMeasureInput,
} from "@/features/organization-profile/services/measure-unit.service";
import type { MeasureUnit } from "@/features/organization-profile/types/measure-unit";

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onBlur" | "type"
>;

type MeasureDimensionInputProps = NativeInputProps & {
  valueMm: string;
  unit: MeasureUnit;
  onChangeMm: (valueMm: string) => void;
  onBlurMm?: (valueMm: string) => void;
};

function emitMeasureDebugLog(data: {
  hypothesisId: string;
  message: string;
  unit: MeasureUnit;
  display: string;
  valueMm: string;
}) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  // #region agent log
  fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "26894a",
    },
    body: JSON.stringify({
      sessionId: "26894a",
      runId: "measure-unit",
      hypothesisId: data.hypothesisId,
      location: "measure-dimension-input.tsx:commit",
      message: data.message,
      data: {
        unit: data.unit,
        display: data.display,
        valueMm: data.valueMm,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export const MeasureDimensionInput = forwardRef<HTMLInputElement, MeasureDimensionInputProps>(
  function MeasureDimensionInput(
    {
      valueMm,
      unit,
      onChangeMm,
      onBlurMm,
      className,
      placeholder,
      id,
      ...inputProps
    },
    ref
  ) {
    const [draft, setDraft] = useState(() => formatMeasureFromMm(valueMm, unit));
    const [focused, setFocused] = useState(false);

    useEffect(() => {
      if (!focused) {
        setDraft(formatMeasureFromMm(valueMm, unit));
      }
    }, [focused, unit, valueMm]);

    const commit = (raw: string, source: "change" | "blur") => {
      const nextMm = parseMeasureToMm(raw, unit);
      onChangeMm(nextMm);

      if (source === "blur") {
        emitMeasureDebugLog({
          hypothesisId: unit === "cm" ? "H2" : "H4",
          message: "commit measure input",
          unit,
          display: raw,
          valueMm: nextMm,
        });
        onBlurMm?.(nextMm);
      }
    };

    return (
      <input
        {...inputProps}
        ref={ref}
        id={id}
        className={className}
        type="text"
        inputMode={unit === "cm" ? "decimal" : "numeric"}
        placeholder={placeholder}
        value={focused ? draft : formatMeasureFromMm(valueMm, unit)}
        onFocus={(event: FocusEvent<HTMLInputElement>) => {
          setFocused(true);
          setDraft(formatMeasureFromMm(valueMm, unit));
          inputProps.onFocus?.(event);
        }}
        onChange={(event) => {
          const raw = sanitizeMeasureInput(event.target.value);
          setDraft(raw);
          if (raw === "" || isCompleteMeasureDraft(raw)) {
            commit(raw, "change");
          }
        }}
        onBlur={(event) => {
          setFocused(false);
          commit(draft, "blur");
          inputProps.onBlur?.(event);
        }}
      />
    );
  }
);
