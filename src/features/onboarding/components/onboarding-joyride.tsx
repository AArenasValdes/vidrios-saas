"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  Joyride,
  type EventData,
  type Step,
  STATUS,
} from "react-joyride";
import { LuArrowUpRight } from "react-icons/lu";

import type { UseOnboardingChecklistResult } from "@/features/onboarding/hooks/useOnboardingChecklist";
import type { OnboardingStepViewModel } from "@/features/onboarding/types/onboarding-checklist";

import s from "./onboarding-joyride.module.css";

export type OnboardingJoyrideRouteKey =
  | "dashboard"
  | "empresa"
  | "pagina_venta"
  | "canales"
  | "cotizacion_nueva";

type OnboardingJoyrideProps = {
  controller: UseOnboardingChecklistResult;
  routeKey: OnboardingJoyrideRouteKey;
};

const PREVIEW_STEP_BY_ROUTE: Record<OnboardingJoyrideRouteKey, OnboardingStepViewModel["key"]> = {
  dashboard: "company_ready",
  empresa: "company_ready",
  pagina_venta: "public_page_live",
  canales: "channel_ready",
  cotizacion_nueva: "first_quote",
};

type TooltipCopyInput = {
  eyebrow: string;
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  openInNewTab?: boolean;
  secondaryCopy?: string;
};

function getShownStorageKey(
  organizationId: string | number | null,
  routeKey: OnboardingJoyrideRouteKey,
  stepKey: string | null
) {
  if (!organizationId || !stepKey) {
    return null;
  }

  return `vidrios-saas:onboarding:joyride:${organizationId}:${routeKey}:${stepKey}`;
}

function TooltipCopy({
  eyebrow,
  title,
  body,
  actionHref,
  actionLabel,
  openInNewTab = false,
  secondaryCopy,
}: TooltipCopyInput) {
  return (
    <div className={s.tooltip}>
      <span className={s.eyebrow}>{eyebrow}</span>
      <strong className={s.title}>{title}</strong>
      <p className={s.body}>{body}</p>
      {actionHref && actionLabel ? (
        <div className={s.actions}>
          {openInNewTab ? (
            <a
              href={actionHref}
              target="_blank"
              rel="noopener noreferrer"
              className={s.primaryLink}
            >
              {actionLabel}
              <LuArrowUpRight aria-hidden />
            </a>
          ) : (
            <Link href={actionHref} className={s.primaryLink}>
              {actionLabel}
              <LuArrowUpRight aria-hidden />
            </Link>
          )}
        </div>
      ) : null}
      {secondaryCopy ? <span className={s.secondaryCopy}>{secondaryCopy}</span> : null}
    </div>
  );
}

function buildStep(routeKey: OnboardingJoyrideRouteKey, step: OnboardingStepViewModel): Step | null {
  if (routeKey === "dashboard") {
    if (step.key === "first_quote") {
      return {
        target: '[data-onboarding-target="dashboard-new-quote"]',
        placement: "bottom",
        skipBeacon: true,
        content: (
          <TooltipCopy
            eyebrow="Onboarding comercial"
            title="Crea tu primera cotizacion"
            body="Ya dejaste lista la captacion. El siguiente hito es guardar una cotizacion real para activar el circuito comercial."
            secondaryCopy="El onboarding deja de aparecer apenas completes este paso."
          />
        ),
      };
    }

    return {
      target: '[data-onboarding-target="dashboard-header"]',
      placement: "bottom-start",
      skipBeacon: true,
      content: (
        <TooltipCopy
          eyebrow="Onboarding comercial"
          title={step.title}
          body={step.helper}
          actionHref={step.href}
          actionLabel={step.ctaLabel}
          openInNewTab={step.openInNewTab}
          secondaryCopy="Se muestra una sola vez por paso para no interrumpir tu operacion."
        />
      ),
    };
  }

  if (routeKey === "empresa" && step.key === "company_ready") {
    return {
      target: '[data-onboarding-target="empresa-config"]',
      placement: "bottom-start",
      skipBeacon: true,
      content: (
        <TooltipCopy
          eyebrow="Paso 1 de activacion"
          title="Completa tu empresa"
          body="Deja listos nombre, telefono, email y slug publico. Sin eso no se activa tu captacion."
          secondaryCopy="Guarda esta pantalla y el paso se marcará solo."
        />
      ),
    };
  }

  if (routeKey === "pagina_venta" && step.key === "public_page_live") {
    return {
      target: '[data-onboarding-target="pagina-venta-publicacion"]',
      placement: "bottom",
      skipBeacon: true,
      content: (
        <TooltipCopy
          eyebrow="Paso 2 de activacion"
          title="Publica tu pagina"
          body="Activa la visibilidad de tu pagina publica para empezar a recibir solicitudes reales."
          secondaryCopy="Cuando la dejes publicada, el onboarding avanza automaticamente."
        />
      ),
    };
  }

  if (routeKey === "canales") {
    if (step.key === "channel_ready") {
      return {
        target: '[data-onboarding-target="canales-share-actions"]',
        placement: "bottom",
        skipBeacon: true,
        content: (
          <TooltipCopy
            eyebrow="Paso 3 de activacion"
            title="Copia tu link o QR"
            body="Comparte tu pagina desde aqui. Copiar, compartir o descargar el QR deja este paso marcado."
          />
        ),
      };
    }

    if (step.key === "first_lead") {
      return {
        target: '[data-onboarding-target="canales-public-card"]',
        placement: "bottom-start",
        skipBeacon: true,
        content: (
          <TooltipCopy
            eyebrow="Paso 4 de activacion"
            title="Haz una solicitud de prueba"
            body="Abre tu pagina publica y envia una solicitud real de prueba para verificar que la captacion entre a Ventora."
            actionHref={step.href}
            actionLabel="Abrir pagina publica"
            openInNewTab={step.openInNewTab}
          />
        ),
      };
    }
  }

  if (routeKey === "cotizacion_nueva" && step.key === "first_quote") {
    return {
      target: '[data-onboarding-target="cotizacion-nueva-root"]',
      placement: "top",
      skipBeacon: true,
      content: (
        <TooltipCopy
          eyebrow="Paso 5 de activacion"
          title="Guarda tu primera cotizacion"
          body="Completa el flujo y guarda una cotizacion real. En cuanto exista, el onboarding deja de aparecer."
        />
      ),
    };
  }

  return null;
}

export function OnboardingJoyride({ controller, routeKey }: OnboardingJoyrideProps) {
  const [run, setRun] = useState(false);
  const updateRun = useEffectEvent((nextValue: boolean) => {
    setRun(nextValue);
  });

  const activeStep = useMemo(() => {
    if (!controller.checklist) {
      return null;
    }

    if (controller.isPreviewMode) {
      return (
        controller.checklist.steps.find(
          (step) => step.key === PREVIEW_STEP_BY_ROUTE[routeKey]
        ) ??
        controller.checklist.steps[0] ??
        null
      );
    }

    return controller.checklist.steps.find((step) => !step.isCompleted) ?? null;
  }, [controller.checklist, controller.isPreviewMode, routeKey]);

  const joyrideStep = useMemo(
    () => (activeStep ? buildStep(routeKey, activeStep) : null),
    [activeStep, routeKey]
  );

  useEffect(() => {
    if (
      !controller.isVisible ||
      (!controller.isPreviewMode && controller.hasCompletedFirstQuote) ||
      !joyrideStep ||
      !activeStep
    ) {
      updateRun(false);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const shownStorageKey = getShownStorageKey(
      controller.organizationId,
      routeKey,
      activeStep.key
    );

    if (controller.isPreviewMode) {
      updateRun(true);
      return;
    }

    try {
      if (shownStorageKey && window.localStorage.getItem(shownStorageKey) === "1") {
        updateRun(false);
        return;
      }

      if (shownStorageKey) {
        window.localStorage.setItem(shownStorageKey, "1");
      }
    } catch {
      return;
    }

    updateRun(true);
  }, [
    controller.hasCompletedFirstQuote,
    controller.isVisible,
    controller.organizationId,
    controller.isPreviewMode,
    activeStep,
    joyrideStep,
    routeKey,
  ]);

  const handleJoyrideCallback = (data: EventData) => {
    if (data.type === "error:target_not_found") {
      setRun(false);
      return;
    }

    if (data.status === STATUS.FINISHED) {
      setRun(false);
      return;
    }

    if (data.status === STATUS.SKIPPED) {
      setRun(false);
      if (!controller.isPreviewMode) {
        controller.dismissChecklist();
      }
    }
  };

  if (!joyrideStep || !controller.isVisible || controller.error) {
    return null;
  }

  return (
    <Joyride
      run={run}
      steps={[joyrideStep]}
      continuous={false}
      onEvent={handleJoyrideCallback}
      options={{
        arrowColor: "#ffffff",
        backgroundColor: "#ffffff",
        blockTargetInteraction: false,
        buttons: ["close", "skip"],
        overlayClickAction: false,
        overlayColor: "rgba(17, 24, 39, 0.28)",
        primaryColor: "#2456b8",
        scrollOffset: 96,
        showProgress: false,
        textColor: "#13294b",
        width: "min(360px, calc(100vw - 32px))",
        zIndex: 2000,
      }}
      locale={{
        back: "Atras",
        close: "Cerrar",
        last: "Listo",
        next: "Siguiente",
        open: "Abrir",
        skip: "Ocultar onboarding",
      }}
    />
  );
}
