"use client";

import { useEffect, useRef } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import {
  getSubtypeGroupLabel,
  repairBrokenText,
} from "./paso-dos-wizard-movil.utils";
import s from "../../page.module.css";

type Props = {
  cantidadDisplayValue: string;
  quickQuantities: readonly number[];
  draft: PasoDosGrupoDraft;
  onCantidadChange: (value: string) => void;
  onSelectCantidad: (cantidad: number) => void;
};

export function PasoDosWizardCantidadMovil({
  cantidadDisplayValue,
  quickQuantities,
  draft,
  onCantidadChange,
  onSelectCantidad,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const groupLabel = repairBrokenText(
    getSubtypeGroupLabel(
      Math.max(1, Number.parseInt(cantidadDisplayValue || "1", 10) || draft.cantidad),
      draft.subtipo
    )
  );

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className={s.stepTwoMobileCreatorStack}>
      <div className={s.stepTwoMobileConfigHint}>
        <strong>
          {cantidadDisplayValue.trim() || draft.cantidad} x {groupLabel}
        </strong>
        <span>Todo este grupo comparte medidas, vidrio y precio.</span>
      </div>

      <div className={s.stepTwoMobileQuantityPanel}>
        <div className={s.stepTwoMobileBlockLabel}>Cantidad del grupo</div>
        <div className={s.stepTwoMobileQuantityStepper}>
          <button
            className={s.stepTwoMobileQuantityStepperButton}
            onClick={() => onSelectCantidad(Math.max(1, draft.cantidad - 1))}
            type="button"
            aria-label="Restar una unidad"
          >
            <LuMinus aria-hidden />
          </button>
          <input
            aria-label="Cantidad del grupo"
            className={s.stepTwoMobileQuantityValueInput}
            inputMode="numeric"
            ref={inputRef}
            type="text"
            value={cantidadDisplayValue}
            onChange={(event) => onCantidadChange(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            className={s.stepTwoMobileQuantityStepperButton}
            onClick={() => onSelectCantidad(draft.cantidad + 1)}
            type="button"
            aria-label="Sumar una unidad"
          >
            <LuPlus aria-hidden />
          </button>
        </div>
        <div className={s.stepTwoMobileQuantityPresets}>
          {quickQuantities.map((cantidad) => (
            <button
              key={cantidad}
              className={`${s.stepTwoMobileChoiceChip} ${
                draft.cantidad === cantidad ? s.stepTwoMobileChoiceChipActive : ""
              }`}
              onClick={() => onSelectCantidad(cantidad)}
              type="button"
            >
              {cantidad}
            </button>
          ))}
        </div>

        <span className={s.stepTwoMobileQuantityHelp}>
          Si necesitas otro numero, borra y escribe la cantidad manualmente.
        </span>
      </div>
    </div>
  );
}
