"use client";

import Link from "next/link";
import { LuArrowUpRight, LuCheck, LuClock3, LuPlay } from "react-icons/lu";

import type { UseOnboardingChecklistResult } from "@/features/onboarding/hooks/useOnboardingChecklist";
import type { OnboardingStepKey, OnboardingStepViewModel } from "@/features/onboarding/types/onboarding-checklist";

import s from "./onboarding-checklist-card.module.css";

type OnboardingChecklistCardProps = {
  controller: UseOnboardingChecklistResult;
  variant?: "full" | "compact";
  focusStepKey?: OnboardingStepKey;
  showOnlyFocusedStep?: boolean;
  className?: string;
};

function stepStateLabel(step: OnboardingStepViewModel) {
  if (step.estado === "completado") return "Completado";
  if (step.estado === "en_progreso") return "En progreso";
  if (step.isCurrent) return "Siguiente paso";
  return "Pendiente";
}

function renderStepIcon(step: OnboardingStepViewModel) {
  if (step.estado === "completado") {
    return (
      <span className={`${s.stepIcon} ${s.stepIconDone}`}>
        <LuCheck aria-hidden />
      </span>
    );
  }

  if (step.estado === "en_progreso") {
    return (
      <span className={`${s.stepIcon} ${s.stepIconProgress}`}>
        <LuPlay aria-hidden />
      </span>
    );
  }

  return (
    <span className={`${s.stepIcon} ${s.stepIconPending}`}>
      <LuClock3 aria-hidden />
    </span>
  );
}

export function OnboardingProgressPill({
  progressPct,
  completedCount,
  totalCount,
  compact = false,
}: {
  progressPct: number;
  completedCount: number;
  totalCount: number;
  compact?: boolean;
}) {
  return (
    <div className={`${s.progressPill} ${compact ? s.progressPillCompact : ""}`}>
      <span className={s.progressCount}>
        {completedCount}/{totalCount}
      </span>
      <span className={s.progressLabel}>{progressPct}% activado</span>
    </div>
  );
}

export function OnboardingStepRow({
  step,
  compact = false,
}: {
  step: OnboardingStepViewModel;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        s.stepRow,
        compact ? s.stepRowCompact : "",
        step.isCurrent ? s.stepRowCurrent : "",
        step.isCompleted ? s.stepRowDone : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {renderStepIcon(step)}
      <div className={s.stepBody}>
        <span className={s.stepTitle}>{step.title}</span>
        <span className={s.stepHelper}>{step.helper}</span>
      </div>
      {!compact ? <span className={s.stepState}>{stepStateLabel(step)}</span> : null}
    </div>
  );
}

export function OnboardingChecklistCard({
  controller,
  variant = "full",
  focusStepKey,
  showOnlyFocusedStep = false,
  className,
}: OnboardingChecklistCardProps) {
  const resolved = controller;

  if (resolved.isLoading && !resolved.checklist) {
    return (
      <section
        className={[s.card, variant === "compact" ? s.cardCompact : "", className]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[s.inner, variant === "compact" ? s.innerCompact : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <p className={s.loading}>Cargando onboarding comercial...</p>
        </div>
      </section>
    );
  }

  if (resolved.error || !resolved.isVisible || !resolved.checklist) {
    if (!resolved.error) {
      return null;
    }

    return (
      <section
        className={[s.card, variant === "compact" ? s.cardCompact : "", className]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[s.inner, variant === "compact" ? s.innerCompact : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <p className={s.error}>{resolved.error}</p>
        </div>
      </section>
    );
  }

  const checklist = resolved.checklist;
  const compact = variant === "compact";
  const focusedStep = focusStepKey
    ? checklist.steps.find((step) => step.key === focusStepKey) ?? null
    : null;

  if (focusStepKey && !focusedStep) {
    return null;
  }

  if (focusStepKey && focusedStep?.isCompleted) {
    return null;
  }

  const steps = showOnlyFocusedStep && focusedStep ? [focusedStep] : checklist.steps;
  const nextAction =
    focusedStep && showOnlyFocusedStep
      ? {
          href: focusedStep.href,
          label: focusedStep.ctaLabel,
          openInNewTab: focusedStep.openInNewTab,
        }
      : checklist.nextAction;

  return (
    <section
      className={[s.card, compact ? s.cardCompact : "", className].filter(Boolean).join(" ")}
    >
      <div className={[s.inner, compact ? s.innerCompact : ""].filter(Boolean).join(" ")}>
        <div className={s.header}>
          <div className={s.copy}>
            <span className={s.eyebrow}>Onboarding comercial</span>
            <h2 className={s.title}>
              {focusedStep && showOnlyFocusedStep
                ? "Te falta compartir tu primera cotizacion"
                : "Activa tu circuito comercial"}
            </h2>
            <p className={s.subtitle}>
              {focusedStep && showOnlyFocusedStep
                ? focusedStep.helper
                : "Completa estos pasos para captar, cotizar y cerrar sin desorden."}
            </p>
          </div>

          <OnboardingProgressPill
            progressPct={checklist.progressPct}
            completedCount={checklist.completedCount}
            totalCount={checklist.totalCount}
            compact={compact}
          />
        </div>

        {!focusedStep || !showOnlyFocusedStep ? (
          <div className={`${s.progressBar} ${compact ? s.progressBarCompact : ""}`}>
            <div className={s.progressValue} style={{ width: `${checklist.progressPct}%` }} />
          </div>
        ) : null}

        <div className={s.steps}>
          {steps.map((step) => (
            <OnboardingStepRow key={step.key} step={step} compact={compact} />
          ))}
        </div>

        {nextAction ? (
          <div className={s.footer}>
            <span className={s.footerCopy}>
              {checklist.completedCount === 0
                ? "Empieza por el primer paso para dejar lista tu captacion."
                : `Llevas ${checklist.completedCount} de ${checklist.totalCount} pasos.`}
            </span>
            {nextAction.openInNewTab ? (
              <a
                href={nextAction.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.ctaLink} ${compact ? s.ctaGhost : ""}`}
              >
                {nextAction.label}
                <LuArrowUpRight aria-hidden />
              </a>
            ) : (
              <Link href={nextAction.href} className={`${s.ctaLink} ${compact ? s.ctaGhost : ""}`}>
                {nextAction.label}
                <LuArrowUpRight aria-hidden />
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
