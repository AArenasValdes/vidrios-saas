"use client";

import { formatCurrency } from "@/utils/formatCurrency";

import s from "../page.module.css";

type ActivationMoneyInputProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (rawDigits: string) => void;
  helpText?: string;
  placeholder?: string;
  suffix?: string;
};

function parseActivationMoney(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ActivationMoneyInput({
  id,
  label,
  value,
  onChange,
  helpText,
  placeholder = "$0",
  suffix,
}: ActivationMoneyInputProps) {
  const numericValue = parseActivationMoney(value);
  const displayValue = numericValue > 0 ? formatCurrency(numericValue) : "";

  return (
    <label className={s.activationField} htmlFor={id}>
      <span className={s.activationLabelReadable}>{label}</span>
      <div className={s.activationMoneyField}>
        <input
          id={id}
          className={s.activationInput}
          value={displayValue}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          placeholder={placeholder}
          inputMode="numeric"
          autoComplete="off"
        />
        {suffix ? <span className={s.activationMoneySuffix}>{suffix}</span> : null}
      </div>
      {helpText ? <span className={s.activationHelpText}>{helpText}</span> : null}
    </label>
  );
}
