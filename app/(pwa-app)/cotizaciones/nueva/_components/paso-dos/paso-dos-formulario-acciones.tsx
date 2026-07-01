"use client";

import { LuArrowLeft, LuCheck } from "react-icons/lu";

import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosFormularioComponenteProps,
  | "editingItemId"
  | "fieldErrors"
  | "globalError"
  | "isMobileViewport"
  | "isSaving"
  | "variant"
  | "onResetStep2Form"
  | "onSaveAndExit"
  | "onAddOrUpdateItem"
>;

export function PasoDosFormularioAcciones({
  editingItemId,
  fieldErrors,
  globalError,
  isMobileViewport,
  isSaving,
  variant = "default",
  onResetStep2Form,
  onSaveAndExit,
  onAddOrUpdateItem,
}: Props) {
  const isMobilePointEdit = variant === "mobilePointEdit";

  if (isMobilePointEdit) {
    return (
      <>
        {fieldErrors.step2 ? <div className={s.inlineError}>{fieldErrors.step2}</div> : null}
        {globalError ? <div className={s.inlineError}>{globalError}</div> : null}
        <div className={s.stepTwoMobilePointEditFooter}>
          <button className={s.btnGhost} type="button" onClick={onResetStep2Form}>
            <LuArrowLeft aria-hidden />
            Volver
          </button>
          <button className={s.btnPrimary} onClick={onAddOrUpdateItem} type="button">
            <LuCheck aria-hidden />
            Guardar cambios
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {fieldErrors.step2 ? <div className={s.inlineError}>{fieldErrors.step2}</div> : null}
      {globalError ? <div className={s.inlineError}>{globalError}</div> : null}

      <div className={`${s.cardFooter} ${s.stepTwoFormFooter}`}>
        <div className={`${s.footerButtonGroup} ${s.stepTwoFormFooterGroup}`}>
          <button className={s.btnGhost} type="button" onClick={onResetStep2Form}>
            {isMobileViewport ? "Limpiar" : editingItemId ? "Limpiar edicion" : "Limpiar"}
          </button>
          <button className={s.btnGhost} type="button" onClick={onSaveAndExit} disabled={isSaving}>
            {isSaving ? "Guardando..." : isMobileViewport ? "Borrador" : "Guardar borrador"}
          </button>
          <button className={s.btnPrimary} onClick={onAddOrUpdateItem} type="button">
            {editingItemId
              ? isMobileViewport
                ? "Guardar"
                : "Guardar cambios"
              : isMobileViewport
                ? "Agregar"
                : "Agregar componente"}
          </button>
        </div>
      </div>
    </>
  );
}
