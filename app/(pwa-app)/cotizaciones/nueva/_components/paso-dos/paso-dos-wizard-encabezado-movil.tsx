"use client";

import { LuCheck, LuX } from "react-icons/lu";

import type { PasoDosGrupoPasoMovil } from "../../_hooks/use-paso-dos-agregar-grupo-movil";
import s from "../../page.module.css";

type Stage = {
  id: number;
  label: string;
};

type Props = {
  stages: readonly Stage[];
  visualStage: PasoDosGrupoPasoMovil;
  title: string;
  subtitle: string;
  onClose: () => void;
  onGoToStep: (paso: PasoDosGrupoPasoMovil) => void;
};

export function PasoDosWizardEncabezadoMovil({
  stages,
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
          <span className={s.cardLabel}>Nuevo componente</span>
          <h2 className={s.stepTwoMobileTitle}>{title}</h2>
          <p className={s.stepTwoMobileSubtle}>{subtitle}</p>
        </div>
        <button className={s.stepTwoMobileHeaderAction} onClick={onClose} type="button">
          <LuX aria-hidden />
        </button>
      </header>

      <div className={s.stepTwoMobileCreatorStageRow}>
        {stages.map((stage) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => onGoToStep(stage.id as PasoDosGrupoPasoMovil)}
            className={`${s.stepTwoMobileCreatorStagePill} ${
              stage.id === visualStage ? s.stepTwoMobileCreatorStagePillActive : ""
            } ${stage.id < visualStage ? s.stepTwoMobileCreatorStagePillDone : ""}`}
          >
            <span>
              {stage.id < visualStage ? <LuCheck aria-hidden size={10} /> : stage.id}
            </span>
            <strong>{stage.label}</strong>
          </button>
        ))}
      </div>
    </>
  );
}
