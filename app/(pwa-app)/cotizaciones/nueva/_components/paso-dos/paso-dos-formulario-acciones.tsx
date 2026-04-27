"use client";

import { LuFilterX, LuPencil, LuPlus, LuSave } from "react-icons/lu";

import type { PasoDosFormularioComponenteProps } from "../../_types/paso-dos";

import s from "../../page.module.css";

type Props = Pick<
  PasoDosFormularioComponenteProps,
  "editingItemId" | "fieldErrors" | "globalError" | "isMobileViewport" | "isSaving" | "onResetStep2Form" | "onSaveAndExit" | "onAddOrUpdateItem"
>;

export function PasoDosFormularioAcciones({
  editingItemId,
  fieldErrors,
  globalError,
  isMobileViewport,
  isSaving,
  onResetStep2Form,
  onSaveAndExit,
  onAddOrUpdateItem,
}: Props) {
  return (
    <>
      {fieldErrors.step2 ? <div className={s.inlineError}>{fieldErrors.step2}</div> : null}
      {globalError ? <div className={s.inlineError}>{globalError}</div> : null}

      <div className={`${s.cardFooter} ${s.stepTwoFormFooter}`}>
        <div className={`${s.footerButtonGroup} ${s.stepTwoFormFooterGroup}`}>
          <button className={s.btnGhost} type="button" onClick={onResetStep2Form}>
            <LuFilterX aria-hidden />
            {isMobileViewport ? "Limpiar" : editingItemId ? "Limpiar edicion" : "Limpiar"}
          </button>
          <button className={s.btnGhost} type="button" onClick={onSaveAndExit} disabled={isSaving}>
            <LuSave aria-hidden /> {isSaving ? "Guardando..." : isMobileViewport ? "Borrador" : "Guardar borrador"}
          </button>
          <button className={s.btnPrimary} onClick={onAddOrUpdateItem} type="button">
            {editingItemId ? <LuPencil aria-hidden /> : <LuPlus aria-hidden />}
            {editingItemId ? (isMobileViewport ? "Guardar" : "Guardar componente") : isMobileViewport ? "Agregar" : "Agregar componente"}
          </button>
        </div>
      </div>
    </>
  );
}
