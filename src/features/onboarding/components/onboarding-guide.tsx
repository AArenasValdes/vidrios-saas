"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { readPwaInstallPromptVisible, PWA_INSTALL_PROMPT_VISIBILITY_EVENT } from "@/components/pwa/install-app-prompt-events";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { buildPublicRequestShareClipboardText } from "@/features/solicitudes/services/public-request-share.service";
import { resolvePublicAppUrl } from "@/utils/public-app-url";

import type { UseOnboardingChecklistResult } from "../hooks/useOnboardingChecklist";
import type { OnboardingStepKey } from "../types/onboarding-checklist";
import { OnboardingInlineHint } from "./onboarding-inline-hint";
import { OnboardingMobileGuide } from "./onboarding-mobile-guide";

export type OnboardingGuideRouteKey =
  | "dashboard"
  | "empresa"
  | "pagina_venta"
  | "solicitudes"
  | "canales"
  | "cotizacion_nueva";

const STEP_ORDER: OnboardingStepKey[] = [
  "company_ready",
  "public_page_live",
  "channel_ready",
  "first_lead",
  "first_quote",
];

const PREVIEW_STEP_BY_ROUTE: Record<OnboardingGuideRouteKey, OnboardingStepKey> = {
  dashboard: "company_ready",
  empresa: "company_ready",
  pagina_venta: "public_page_live",
  solicitudes: "first_lead",
  canales: "channel_ready",
  cotizacion_nueva: "first_quote",
};

const ROUTE_STEP_SUPPORT: Record<OnboardingGuideRouteKey, OnboardingStepKey[]> = {
  dashboard: STEP_ORDER,
  empresa: ["company_ready"],
  pagina_venta: ["public_page_live"],
  solicitudes: ["first_lead"],
  canales: ["channel_ready"],
  cotizacion_nueva: ["first_quote"],
};

function getShownStorageKey(
  organizationId: string | number | null,
  routeKey: OnboardingGuideRouteKey,
  stepKey: OnboardingStepKey | null
) {
  if (!organizationId || !stepKey) {
    return null;
  }

  return `vidrios-saas:onboarding:guide:${organizationId}:${routeKey}:${stepKey}`;
}

function getPublicShareUrl(slug: string | null | undefined) {
  if (!slug?.trim()) {
    return null;
  }

  return `${resolvePublicAppUrl()}/solicitud/${slug.trim()}`;
}

function getPublicPreviewUrl(slug: string | null | undefined) {
  const shareUrl = getPublicShareUrl(slug);

  if (!shareUrl) {
    return null;
  }

  return `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}preview=1`;
}

function useIsMobileGuideViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsMobile(media.matches);
    sync();

    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function usePwaInstallPromptVisible() {
  const [isVisible, setIsVisible] = useState(() =>
    typeof window !== "undefined" ? readPwaInstallPromptVisible() : false
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      setIsVisible(customEvent.detail?.visible === true);
    };

    window.addEventListener(
      PWA_INSTALL_PROMPT_VISIBILITY_EVENT,
      handleVisibility as EventListener
    );

    return () => {
      window.removeEventListener(
        PWA_INSTALL_PROMPT_VISIBILITY_EVENT,
        handleVisibility as EventListener
      );
    };
  }, []);

  return isVisible;
}

function resolveGuideCopy(stepKey: OnboardingStepKey) {
  if (stepKey === "company_ready") {
    return {
      title: "Configura tu empresa",
      text: "Estos datos aparecen en tu cotizacion y pagina publica.",
      ctaLabel: "Completar datos",
    };
  }

  if (stepKey === "public_page_live") {
    return {
      title: "Revisa tu pagina publica",
      text: "Esta pagina recibe solicitudes aunque estes trabajando.",
      ctaLabel: "Ver pagina",
    };
  }

  if (stepKey === "channel_ready") {
    return {
      title: "Comparte tu link o QR",
      text: "Usalo en WhatsApp, Instagram, Facebook o tarjetas.",
      ctaLabel: "Copiar texto + link",
    };
  }

  if (stepKey === "first_lead") {
    return {
      title: "Revisa tus solicitudes",
      text: "Aqui llegan los clientes que piden presupuesto.",
      ctaLabel: "Ver solicitudes",
    };
  }

  return {
    title: "Crea tu primera cotizacion",
    text: "Guarda una cotizacion real y compartela por WhatsApp.",
    ctaLabel: "Crear cotizacion",
  };
}

export function OnboardingGuide({
  controller,
  routeKey,
}: {
  controller: UseOnboardingChecklistResult;
  routeKey: OnboardingGuideRouteKey;
}) {
  const isMobile = useIsMobileGuideViewport();
  const isPwaPromptVisible = usePwaInstallPromptVisible();
  const { profile } = useOrganizationProfile();
  const [deferredRenderKey, setDeferredRenderKey] = useState<string | null>(null);
  const [isSuppressedByStorage, setIsSuppressedByStorage] = useState(false);
  const isBlockedByPwaPrompt = isMobile && isPwaPromptVisible;
  const updateSuppressedByStorage = useEffectEvent((value: boolean) => {
    setIsSuppressedByStorage(value);
  });

  const activeStep = useMemo(() => {
    if (!controller.checklist) {
      return null;
    }

    if (controller.isPreviewMode) {
      return (
        controller.checklist.steps.find(
          (step) => step.key === PREVIEW_STEP_BY_ROUTE[routeKey]
        ) ?? null
      );
    }

    return controller.checklist.steps.find((step) => !step.isCompleted) ?? null;
  }, [controller.checklist, controller.isPreviewMode, routeKey]);

  const canShowOnCurrentRoute = useMemo(() => {
    if (!activeStep) {
      return false;
    }

    if (controller.isPreviewMode) {
      return true;
    }

    return ROUTE_STEP_SUPPORT[routeKey].includes(activeStep.key);
  }, [activeStep, controller.isPreviewMode, routeKey]);

  const shownStorageKey = useMemo(
    () => getShownStorageKey(controller.organizationId, routeKey, activeStep?.key ?? null),
    [activeStep?.key, controller.organizationId, routeKey]
  );
  const currentRenderKey = `${routeKey}:${activeStep?.key ?? "none"}:${
    controller.isPreviewMode ? "preview" : "live"
  }`;
  const isDeferred = deferredRenderKey === currentRenderKey;

  useEffect(() => {
    if (
      !controller.isVisible ||
      !activeStep ||
      !canShowOnCurrentRoute ||
      isBlockedByPwaPrompt
    ) {
      updateSuppressedByStorage(false);
      return;
    }

    if (controller.isPreviewMode) {
      updateSuppressedByStorage(false);
      return;
    }

    try {
      const wasShown = shownStorageKey
        ? window.localStorage.getItem(shownStorageKey) === "1"
        : false;

      if (!wasShown && shownStorageKey) {
        window.localStorage.setItem(shownStorageKey, "1");
      }

      updateSuppressedByStorage(wasShown);
    } catch {
      updateSuppressedByStorage(true);
    }
  }, [
    activeStep,
    canShowOnCurrentRoute,
    controller.isPreviewMode,
    controller.isVisible,
    isBlockedByPwaPrompt,
    shownStorageKey,
  ]);

  const guideCopy = activeStep ? resolveGuideCopy(activeStep.key) : null;
  const publicShareUrl = getPublicShareUrl(profile?.solicitudPublicaSlug);
  const publicPreviewUrl = getPublicPreviewUrl(profile?.solicitudPublicaSlug);
  const publicShareClipboardText = useMemo(() => {
    if (!publicShareUrl) {
      return null;
    }

    return buildPublicRequestShareClipboardText({
      url: publicShareUrl,
      empresaNombre: profile?.empresaNombre,
      channel: "direct",
    });
  }, [profile?.empresaNombre, publicShareUrl]);

  const primaryAction = useMemo(() => {
    if (!activeStep || !guideCopy) {
      return null;
    }

    if (activeStep.key === "channel_ready") {
      if (!publicShareUrl || !publicShareClipboardText) {
        return {
          kind: "link" as const,
          label: guideCopy.ctaLabel,
          href: "/configuracion/empresa",
        };
      }

      return {
        kind: "button" as const,
        label: guideCopy.ctaLabel,
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(publicShareClipboardText);
            await controller.markChannelReady({
              completionSource: "onboarding_mobile_copy_public_link",
              metadataJson: {
                route: routeKey,
                url: publicShareUrl,
              },
            });
          } catch {
            return;
          }
        },
      };
    }

    if (activeStep.key === "public_page_live") {
      return publicPreviewUrl
        ? {
            kind: "link" as const,
            label: guideCopy.ctaLabel,
            href: publicPreviewUrl,
            openInNewTab: true,
          }
        : {
            kind: "link" as const,
            label: guideCopy.ctaLabel,
            href: "/configuracion/pagina-venta",
        };
    }

    if (activeStep.key === "company_ready" && routeKey === "empresa") {
      return {
        kind: "button" as const,
        label: guideCopy.ctaLabel,
        onClick: async () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      };
    }

    if (activeStep.key === "first_lead") {
      if (routeKey === "solicitudes") {
        return {
          kind: "button" as const,
          label: guideCopy.ctaLabel,
          onClick: async () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          },
        };
      }

      return {
        kind: "link" as const,
        label: guideCopy.ctaLabel,
        href: "/solicitudes",
      };
    }

    if (activeStep.key === "first_quote" && routeKey === "cotizacion_nueva") {
      return {
        kind: "button" as const,
        label: guideCopy.ctaLabel,
        onClick: async () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      };
    }

    return {
      kind: "link" as const,
      label: guideCopy.ctaLabel,
      href: activeStep.href,
      openInNewTab: activeStep.openInNewTab,
    };
  }, [
    activeStep,
    controller,
    guideCopy,
    publicPreviewUrl,
    publicShareClipboardText,
    publicShareUrl,
    routeKey,
  ]);

  if (
    !controller.isVisible ||
    controller.error ||
    !activeStep ||
    !guideCopy ||
    !primaryAction ||
    !canShowOnCurrentRoute ||
    isDeferred ||
    isSuppressedByStorage
  ) {
    return null;
  }

  if (isBlockedByPwaPrompt) {
    return null;
  }

  const currentStep = Math.max(1, STEP_ORDER.indexOf(activeStep.key) + 1);

  if (isMobile) {
    return (
      <OnboardingMobileGuide
        position={routeKey === "cotizacion_nueva" ? "top" : "bottom"}
        title={guideCopy.title}
        text={guideCopy.text}
        currentStep={currentStep}
        totalSteps={STEP_ORDER.length}
        primaryAction={primaryAction}
        onClose={() => {
          if (controller.isPreviewMode) {
            setDeferredRenderKey(currentRenderKey);
            return;
          }

          controller.dismissChecklist();
          setDeferredRenderKey(currentRenderKey);
        }}
        onDefer={() => setDeferredRenderKey(currentRenderKey)}
      />
    );
  }

  return (
    <OnboardingInlineHint
      title={guideCopy.title}
      text={guideCopy.text}
      currentStep={currentStep}
      totalSteps={STEP_ORDER.length}
      primaryAction={primaryAction}
      onClose={() => {
        if (controller.isPreviewMode) {
          setDeferredRenderKey(currentRenderKey);
          return;
        }

        controller.dismissChecklist();
        setDeferredRenderKey(currentRenderKey);
      }}
      onDefer={() => setDeferredRenderKey(currentRenderKey)}
    />
  );
}
