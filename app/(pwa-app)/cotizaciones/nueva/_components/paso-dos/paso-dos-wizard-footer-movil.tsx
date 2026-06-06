"use client";

import { LuChevronLeft, LuPlus } from "react-icons/lu";

import s from "../../page.module.css";

type Props = {
  canContinueFromQuantity: boolean;
  canSubmitGroup: boolean;
  isCompactDataStep: boolean;
  isFreeValueItem?: boolean;
  isTotalGlobal?: boolean;
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
  precioFormateado = "",
  onBack,
  onClose,
  onConfirm,
  onNext,
  visualStage,
  wizardStep,
}: Props) {
  const agregarLabel = isTotalGlobal
    ? "Continuar al resumen"
    : isFreeValueItem
      ? precioFormateado
        ? `Agregar item por $${precioFormateado}`
        : "Agregar item"
      : "Agregar componente";

  return (
    <footer
      className={`${s.stepTwoMobileCreatorFooter} ${
        isCompactDataStep ? s.stepTwoMobileCreatorFooterCompact : ""
      }`}
    >
      {visualStage === 1 ? (
        <button className={s.btnGhost} onClick={onClose} type="button">
          Cancelar
        </button>
      ) : (
        <button className={s.btnGhost} onClick={onBack} type="button">
          <LuChevronLeft aria-hidden />
          Atras
        </button>
      )}

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
          className={`${s.btnPrimary} ${isTotalGlobal ? "" : s.stepTwoMobileCtaAgregar}`}
          disabled={!canSubmitGroup}
          onClick={onConfirm}
          type="button"
        >
          {isTotalGlobal ? null : <LuPlus aria-hidden />}
          {agregarLabel}
        </button>
      ) : null}
    </footer>
  );
}
