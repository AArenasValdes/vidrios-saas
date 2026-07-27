"use client";

import { useState } from "react";
import { LuChevronLeft, LuPlus } from "react-icons/lu";

import s from "../../page.module.css";

type Props = {
  canContinueFromQuantity: boolean;
  canSubmitGroup: boolean;
  isCompactDataStep: boolean;
  isFreeValueItem?: boolean;
  isTotalGlobal?: boolean;
  isSingleStepFreeTotal?: boolean;
  precioFormateado?: string;
  onBack: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onNext: () => void;
  visualStage: number;
  wizardStep: number;
};

export function PasoDosWizardFooterMovil({
  canContinueFromQuantity,
  canSubmitGroup,
  isCompactDataStep,
  isFreeValueItem = false,
  isTotalGlobal = false,
  isSingleStepFreeTotal = false,
  precioFormateado = "",
  onBack,
  onClose,
  onConfirm,
  onNext,
  visualStage,
  wizardStep,
}: Props) {
  const [isIphoneViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return /iphone|ipod/i.test(window.navigator.userAgent);
  });
  const agregarLabel = isTotalGlobal
    ? isSingleStepFreeTotal
      ? "Continuar al resumen"
      : "Agregar"
    : isFreeValueItem
      ? precioFormateado
        ? `Agregar item por $${precioFormateado}`
        : "Agregar item"
      : "Agregar componente";

  return (
    <footer
      className={`${s.stepTwoMobileCreatorFooter} ${
        isCompactDataStep ? s.stepTwoMobileCreatorFooterCompact : ""
      } ${
        isIphoneViewport ? s.stepTwoMobileCreatorFooterIphone : ""
      }`}
    >
      {visualStage === 1 || isSingleStepFreeTotal ? null : (
        <button className={s.btnGhost} onClick={onBack} type="button">
          <LuChevronLeft aria-hidden />
          Atras
        </button>
      )}

      {visualStage === 1 && isSingleStepFreeTotal ? (
        <button className={s.btnGhost} onClick={onClose} type="button">
          Cancelar
        </button>
      ) : null}

      {wizardStep === 2 ? (
        <button
          className={s.btnPrimary}
          disabled={!canContinueFromQuantity}
          onClick={onNext}
          type="button"
        >
          Continuar
        </button>
      ) : null}

      {wizardStep === 3 ? (
        <button
          className={`${s.btnPrimary} ${
            isTotalGlobal && isSingleStepFreeTotal ? "" : s.stepTwoMobileCtaAgregar
          }`}
          disabled={!canSubmitGroup}
          onClick={onConfirm}
          type="button"
        >
          {isTotalGlobal && isSingleStepFreeTotal ? null : <LuPlus aria-hidden />}
          {agregarLabel}
        </button>
      ) : null}
    </footer>
  );
}
