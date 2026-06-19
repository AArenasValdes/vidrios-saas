"use client";

import Link from "next/link";
import { LuArrowLeft, LuCheck, LuFileCheck2, LuSave } from "react-icons/lu";

import { STEP_LABELS, type StepKey } from "@/features/cotizaciones/new-quote/workflow-ui";

import s from "../page.module.css";

type EncabezadoFlujoProps = {
  step: StepKey;
  isSaving: boolean;
  isEditing: boolean;
  onGoToStep: (step: StepKey) => void;
  onSaveDraft: () => void;
  onSaveQuote: () => void;
};

export function EncabezadoFlujo({
  step,
  isSaving,
  onGoToStep,
  onSaveDraft,
  onSaveQuote,
}: EncabezadoFlujoProps) {
  return (
    <div className={s.mobileTopBand}>
      <div className={s.pageHeader}>
        <div className={s.pageHeading}>
          <div className={s.pageBackRow}>
            <Link href="/cotizaciones" className={s.backLink}>
              <LuArrowLeft aria-hidden /> Volver
            </Link>
            <div className={s.pageStepKicker}>Paso {step} de 3</div>
          </div>
        </div>
        <div className={`${s.headerActions} ${step === 1 ? s.headerActionsStep1 : ""}`}>
          {step !== 2 ? (
            <>
              <button className={s.btnGhost} onClick={onSaveDraft} type="button" disabled={isSaving}>
                <LuSave aria-hidden /> {isSaving ? "Guardando..." : "Borrador"}
              </button>
              <button className={s.btnPrimary} onClick={onSaveQuote} type="button" disabled={isSaving}>
                <LuFileCheck2 aria-hidden />{" "}
                {isSaving ? "Guardando..." : step === 3 ? "Guardar y ver resultado" : "Guardar presupuesto"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className={s.wizardWrap}>
        <div className={s.wizardCard}>
          <div className={s.stepper}>
            {STEP_LABELS.map((item, index) => {
              const state = step === item.id ? "active" : step > item.id ? "done" : "idle";
              const lineDone = step > item.id;

              return (
                <div key={item.id} className={s.stepperItem}>
                  <button
                    type="button"
                    className={`${s.stepperButton} ${s[`stepperButton_${state}`] ?? ""}`}
                    onClick={() => onGoToStep(item.id)}
                  >
                    <span className={`${s.stepperDot} ${s[`stepperDot_${state}`]}`}>
                      {state === "done" ? <LuCheck size={12} aria-hidden /> : item.id}
                    </span>
                    <span className={`${s.stepperText} ${s[`stepperText_${state}`]}`}>
                      <strong>{item.title}</strong>
                      <small>{item.sub}</small>
                    </span>
                  </button>
                  {index < STEP_LABELS.length - 1 ? (
                    <span
                      className={`${s.stepperLine} ${lineDone ? s.stepperLine_done : ""}`}
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
