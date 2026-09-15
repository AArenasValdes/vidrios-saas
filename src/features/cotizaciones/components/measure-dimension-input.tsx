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
  "value" | "onChange" | "type"
>;

type MeasureDimensionInputProps = NativeInputProps & {
  valueMm: string;
  unit: MeasureUnit;
  onChangeMm: (valueMm: string) => void;
  onBlurMm?: (valueMm: string) => void;
};

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
