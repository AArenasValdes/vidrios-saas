"use client";

import { LuCheck, LuX } from "react-icons/lu";

import type { PasoDosGrupoPasoMovil } from "../../_hooks/use-paso-dos-agregar-grupo-movil";
import s from "../../page.module.css";

type Stage = {
  id: number;
  label: string;
  paso?: PasoDosGrupoPasoMovil;
};

function resolveStagePaso(stage: Stage): PasoDosGrupoPasoMovil {
  return stage.paso ?? (stage.id as PasoDosGrupoPasoMovil);
}

type Props = {
  stages: readonly Stage[];
  hideStages?: boolean;
  centerStages?: boolean;
  visualStage: PasoDosGrupoPasoMovil;
  title: string;
  subtitle: string;
  onClose: () => void;
  onGoToStep: (paso: PasoDosGrupoPasoMovil) => void;
};

export function PasoDosWizardEncabezadoMovil({
  stages,
  hideStages = false,
  centerStages = false,
  visualStage,
  title,
  subtitle,
  onClose,
  onGoToStep,
}: Props) {
  return (
    <>
      <header className={s.stepTwoMobileCreatorHeader}>
        <div className={s.stepTwoMobileCreatorCopy}>
          <span className={s.cardLabel}>Paso 2 / Agregar</span>
          <h2 className={s.stepTwoMobileTitle}>{title}</h2>
          <p className={s.stepTwoMobileSubtle}>{subtitle}</p>
        </div>
        <button className={s.stepTwoMobileHeaderAction} onClick={onClose} type="button">
          <LuX aria-hidden />
        </button>
      </header>

      {hideStages ? null : (
        <div
          className={`${s.stepTwoMobileCreatorStageRow} ${
            centerStages ? s.stepTwoMobileCreatorStageRowCentered : ""
          }`}
        >
          {stages.map((stage) => {
            const stagePaso = resolveStagePaso(stage);
            const isDone = stagePaso < visualStage;
            const isActive = stagePaso === visualStage;

            return (
              <button
                key={`${stage.id}-${stage.label}`}
                type="button"
                onClick={() => onGoToStep(stagePaso)}
                className={`${s.stepTwoMobileCreatorStagePill} ${
                  isActive ? s.stepTwoMobileCreatorStagePillActive : ""
                } ${isDone ? s.stepTwoMobileCreatorStagePillDone : ""}`}
              >
                <span>{isDone ? <LuCheck aria-hidden size={10} /> : stage.id}</span>
                <strong>{stage.label}</strong>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
