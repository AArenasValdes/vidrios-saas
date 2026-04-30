"use client";

import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";

import s from "../../page.module.css";

type Props = {
  activePricingMode: PricingMode;
  formattedPriceValue: string;
  marginValue: string;
  onMargenChange: (value: string) => void;
  onPrecioChange: (value: string) => void;
  onPricingModeChange: (mode: PricingMode) => void;
  priceHelp: string;
  priceLabel: string;
};

export function PasoDosWizardPrecioMovil({
  activePricingMode,
  formattedPriceValue,
  marginValue,
  onMargenChange,
  onPrecioChange,
  onPricingModeChange,
  priceHelp,
  priceLabel,
}: Props) {
  return (
    <div className={s.stepTwoMobileBlockPrecio}>
      <div className={s.stepTwoMobileBlockLabel}>Modo de precio</div>
      <div
        className={s.stepTwoMobilePricingRadioGroup}
        role="radiogroup"
        aria-label="Modo de precio"
      >
        {(
          [
            { value: "precio_directo", label: "Valor directo" },
            { value: "margen", label: "Con margen" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            className={`${s.stepTwoMobilePricingRadio} ${
              activePricingMode === option.value ? s.stepTwoMobilePricingRadioActive : ""
            }`}
            role="radio"
            aria-checked={activePricingMode === option.value}
            tabIndex={activePricingMode === option.value ? 0 : -1}
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onPricingModeChange(option.value)}
          >
            <span className={s.stepTwoMobilePricingRadioControl} aria-hidden />
            <span className={s.stepTwoMobilePricingRadioLabel}>{option.label}</span>
          </button>
        ))}
      </div>

      {activePricingMode === "margen" ? (
        <div className={s.stepTwoMobilePricingModeSlot}>
          <div className={s.stepTwoMobileMarginField}>
            <label className={s.stepTwoMobileMedidaLabel} htmlFor="grupo-margen">
              Margen (%)
            </label>
            <input
              aria-describedby="grupo-margen-help"
              className={s.stepTwoMobileMarginInput}
              id="grupo-margen"
              inputMode="numeric"
              placeholder="60"
              type="text"
              value={marginValue}
              onChange={(event) => onMargenChange(event.target.value)}
            />
            <span className={s.stepTwoMobileInlineHelp} id="grupo-margen-help">
              Usado para calcular venta.
            </span>
          </div>
        </div>
      ) : null}

      <div className={s.stepTwoMobileBlockLabel}>{priceLabel}</div>
      <input
        className={s.stepTwoMobilePrecioInput}
        id="grupo-precio"
        inputMode="numeric"
        placeholder="$ 120.000"
        type="text"
        value={formattedPriceValue}
        onChange={(event) => onPrecioChange(event.target.value)}
      />
      <span className={s.stepTwoMobileBlockHelp}>{priceHelp}</span>
    </div>
  );
}
