"use client";

import Link from "next/link";
import { LuArrowLeft, LuCheck, LuFileCheck2, LuSave } from "react-icons/lu";

import { STEP_LABELS, type StepKey } from "@/features/cotizaciones/new-quote/workflow-ui";

import s from "../page.module.css";

type EncabezadoFlujoProps = {
  step: StepKey;
  isMobileViewport?: boolean;
  isSaving: boolean;
  isEditing: boolean;
  onGoToStep: (step: StepKey) => void;
  onSaveDraft: () => void;
  onSaveQuote: () => void;
  isSummaryStepBlocked?: boolean;
  summaryStepBlockedHint?: string;
};

function DesktopFlowStepper({
  step,
  onGoToStep,
  isSummaryStepBlocked = false,
  summaryStepBlockedHint,
}: {
  step: StepKey;
  onGoToStep: (step: StepKey) => void;
  isSummaryStepBlocked?: boolean;
  summaryStepBlockedHint?: string;
}) {
  return (
    <div className={s.desktopFlowStepper}>
      {STEP_LABELS.map((item, index) => {
        const isLast = index === STEP_LABELS.length - 1;
        const state = step === item.id ? "active" : step > item.id ? "done" : "idle";
        const isBlockedSummaryStep = item.id === 3 && isSummaryStepBlocked && step < 3;

        return (
          <div key={item.id} className={s.desktopFlowStepperStep}>
            <button
              type="button"
              className={s.desktopFlowStepperButton}
              onClick={() => onGoToStep(item.id)}
              disabled={isBlockedSummaryStep}
              title={isBlockedSummaryStep ? summaryStepBlockedHint : undefined}
              aria-disabled={isBlockedSummaryStep}
            >
              <span className={`${s.desktopFlowStepperDot} ${s[`desktopFlowStepperDot_${state}`]}`}>
                {state === "done" ? <LuCheck size={14} aria-hidden /> : item.id}
              </span>
              <span className={`${s.desktopFlowStepperText} ${s[`desktopFlowStepperText_${state}`]}`}>
                <strong>{item.title}</strong>
                <small>{item.sub}</small>
              </span>
            </button>
            {!isLast ? (
              <span
                className={`${s.desktopFlowStepperLine} ${state !== "idle" ? s.desktopFlowStepperLineDone : ""}`}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function EncabezadoFlujo({
  step,
  isMobileViewport = true,
  isSaving,
  onGoToStep,
  onSaveDraft,
  onSaveQuote,
  isSummaryStepBlocked = false,
  summaryStepBlockedHint,
}: EncabezadoFlujoProps) {
  if (!isMobileViewport) {
    return (
      <div className={s.desktopFlowHeader}>
        <div className={s.desktopFlowHeaderInner}>
          <Link href="/cotizaciones" className={s.desktopFlowHeaderBack}>
            <LuArrowLeft aria-hidden /> Volver
          </Link>
          <DesktopFlowStepper
            step={step}
            onGoToStep={onGoToStep}
            isSummaryStepBlocked={isSummaryStepBlocked}
            summaryStepBlockedHint={summaryStepBlockedHint}
          />
          <div className={s.desktopFlowHeaderSpacer} aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className={s.mobileTopBand}>
      <div className={s.pageHeader}>
        <div className={s.pageHeading}>
          <div className={s.pageBackRow}>
            <Link href="/cotizaciones" className={s.backLink}>
              <LuArrowLeft aria-hidden /> Volver
            </Link>
            <div className={`${s.pageStepKicker} ${step === 3 ? s.pageStepKickerSimple : ""}`}>
              {step === 3 ? "3 de 3" : `Paso ${step} de 3`}
            </div>
          </div>
        </div>
        <div className={`${s.headerActions} ${step === 1 ? s.headerActionsStep1 : ""}`}>
          {isMobileViewport && step !== 2 ? (
            <>
              <button className={s.btnGhost} onClick={onSaveDraft} type="button" disabled={isSaving}>
                <LuSave aria-hidden /> {isSaving ? "Guardando..." : "Borrador"}
              </button>
              <button className={s.btnPrimary} onClick={onSaveQuote} type="button" disabled={isSaving}>
                <LuFileCheck2 aria-hidden />{" "}
                {isSaving ? "Guardando..." : step === 3 ? "Guardar y abrir PDF" : "Guardar presupuesto"}
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
