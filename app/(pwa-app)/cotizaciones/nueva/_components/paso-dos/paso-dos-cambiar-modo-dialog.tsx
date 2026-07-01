"use client";

import s from "../../page.module.css";

type PasoDosCambiarModoDialogProps = {
  isOpen: boolean;
  hasLoadedItems: boolean;
  hasDraftInProgress: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function PasoDosCambiarModoDialog({
  isOpen,
  hasLoadedItems,
  hasDraftInProgress,
  onClose,
  onConfirm,
}: PasoDosCambiarModoDialogProps) {
  if (!isOpen) {
    return null;
  }

  const warningText = (() => {
    if (hasLoadedItems && hasDraftInProgress) {
      return "Los datos cargados se conservan, pero perderas el borrador actual sin guardar.";
    }

    if (hasLoadedItems) {
      return "Los datos cargados se conservan. Podras elegir la otra modalidad sin perder el trabajo hecho.";
    }

    if (hasDraftInProgress) {
      return "Perderas el borrador actual si no lo guardaste.";
    }

    return "Podras elegir como preparar el presupuesto al volver al selector.";
  })();

  return (
    <div
      className={s.stepTwoConfirmOverlay}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby="cambiar-modo-titulo"
        aria-modal="true"
        className={s.stepTwoConfirmDialog}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className={s.stepTwoConfirmTitle} id="cambiar-modo-titulo">
          ¿Cambiar de modalidad?
        </h2>
        <p className={s.stepTwoConfirmText}>{warningText}</p>
        <div className={s.stepTwoConfirmActions}>
          <button className={s.btnGhost} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className={s.btnPrimary} onClick={onConfirm} type="button">
            Cambiar modalidad
          </button>
        </div>
      </section>
    </div>
  );
}
