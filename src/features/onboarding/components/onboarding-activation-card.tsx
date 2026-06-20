"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LuBuilding2, LuCheck, LuDownload, LuFileText, LuMessageCircle } from "react-icons/lu";

import type { UseOnboardingChecklistResult } from "../hooks/useOnboardingChecklist";
import type { OnboardingStepKey } from "../types/onboarding-checklist";
import s from "./onboarding-guide.module.css";

const STEP_ICON: Record<OnboardingStepKey, ReactNode> = {
  first_quote: <LuFileText aria-hidden />,
  company_ready: <LuBuilding2 aria-hidden />,
  first_share: <LuMessageCircle aria-hidden />,
  public_page_live: <LuCheck aria-hidden />,
  channel_ready: <LuCheck aria-hidden />,
  first_lead: <LuCheck aria-hidden />,
  activation_complete: <LuCheck aria-hidden />,
};

export function OnboardingActivationCard({
  controller,
}: {
  controller: UseOnboardingChecklistResult;
}) {
  const checklist = controller.checklist;

  if (
    !controller.isVisible ||
    controller.error ||
    !checklist ||
    (!controller.isPreviewMode && checklist.isComplete)
  ) {
    return null;
  }

  const primaryHref = checklist.nextAction?.href ?? "/cotizaciones/nueva";
  const secondaryHref = "/cotizaciones/nueva";

  return (
    <section className={s.activationRoot} aria-labelledby="onboarding-activation-title">
      <div className={s.activationIntro}>
        <div className={s.activationIcon} aria-hidden>
          <LuDownload />
        </div>
        <div className={s.activationCopy}>
          <h2 id="onboarding-activation-title">
            Cotiza rapido desde tu celular y envia presupuestos profesionales por WhatsApp.
          </h2>
          <p>
            Ventora no reemplaza tu experiencia tecnica. Te ayuda a ordenar tus trabajos,
            cotizar mas rapido y enviar un PDF mas profesional a tus clientes.
          </p>
        </div>
      </div>

      <div className={s.activationActions}>
        <Link href={primaryHref} className={s.activationPrimary}>
          Crear mi primera cotizacion
        </Link>
        <Link href={secondaryHref} className={s.activationSecondary}>
          Configurar mi empresa despues
        </Link>
      </div>

      <div className={s.activationSteps}>
        <strong>Empieza con Ventora en 3 pasos</strong>
        <ol>
          {checklist.steps.map((step) => (
            <li key={step.key} data-complete={step.isCompleted}>
              <span className={s.activationStepIcon}>
                {step.isCompleted ? <LuCheck aria-hidden /> : STEP_ICON[step.key]}
              </span>
              <span>{step.title}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
