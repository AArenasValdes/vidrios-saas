"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { onboardingChecklistService } from "@/features/onboarding/services/onboarding-checklist.service";
import type {
  OnboardingChecklistViewModel,
  OnboardingStepKey,
} from "@/features/onboarding/types/onboarding-checklist";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";

export type UseOnboardingChecklistResult = {
  checklist: OnboardingChecklistViewModel | null;
  organizationId: string | number | null;
  isLoading: boolean;
  isVisible: boolean;
  isPreviewMode: boolean;
  error: string | null;
  isDismissed: boolean;
  hasCompletedFirstQuote: boolean;
  refreshChecklist: () => Promise<void>;
  dismissChecklist: () => void;
  markChannelReady: (input: {
    completionSource: string;
    metadataJson?: Record<string, unknown>;
  }) => Promise<void>;
  markFirstShare: (input: {
    completionSource: string;
    metadataJson?: Record<string, unknown>;
  }) => Promise<void>;
  shouldHighlightStep: (
    stepKey: OnboardingStepKey,
    options?: { onlyIfPending?: boolean }
  ) => boolean;
};

function getDismissStorageKey(organizationId: string | number | null) {
  return organizationId ? `vidrios-saas:onboarding:dismissed:${organizationId}` : null;
}

export function useOnboardingChecklist(): UseOnboardingChecklistResult {
  const { user, organizacionId, rol, cargando } = useAuth();
  const { profile, isReady: isProfileReady } = useOrganizationProfile();
  const [checklist, setChecklist] = useState<OnboardingChecklistViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const activeLoadIdRef = useRef(0);
  const dismissStorageKey = getDismissStorageKey(organizacionId);

  const isEnabled = !cargando && rol === "admin" && Boolean(organizacionId) && isProfileReady;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const previewValue =
      new URLSearchParams(window.location.search).get("onboarding_preview") ?? "";
    const normalizedPreviewValue = previewValue.trim().toLowerCase();

    setIsPreviewMode(
      normalizedPreviewValue === "1" ||
        normalizedPreviewValue === "true" ||
        normalizedPreviewValue === "si"
    );
  }, []);

  useEffect(() => {
    if (!dismissStorageKey || typeof window === "undefined") {
      setIsDismissed(false);
      return;
    }

    try {
      setIsDismissed(window.localStorage.getItem(dismissStorageKey) === "1");
    } catch {
      setIsDismissed(false);
    }
  }, [dismissStorageKey]);

  const refreshChecklist = useCallback(async () => {
    if (!isEnabled || !organizacionId) {
      setChecklist(null);
      setError(null);
      return;
    }

    const loadId = ++activeLoadIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await onboardingChecklistService.getChecklistByOrganizationId({
        organizationId: organizacionId,
        authUserId: user?.id ?? null,
        profile,
      });

      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      setChecklist(result.checklist);
    } catch (err) {
      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "No pudimos cargar el onboarding comercial."
      );
    } finally {
      if (loadId === activeLoadIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [isEnabled, organizacionId, profile, user?.id]);

  useEffect(() => {
    void refreshChecklist();
  }, [refreshChecklist]);

  const dismissChecklist = useCallback(() => {
    setIsDismissed(true);

    if (!dismissStorageKey || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(dismissStorageKey, "1");
    } catch {
      return;
    }
  }, [dismissStorageKey]);

  const markChannelReady = useCallback(
    async (input: {
      completionSource: string;
      metadataJson?: Record<string, unknown>;
    }) => {
      if (!organizacionId || rol !== "admin") {
        return;
      }

      await onboardingChecklistService.markChannelReady({
        organizationId: organizacionId,
        authUserId: user?.id ?? null,
        completionSource: input.completionSource,
        metadataJson: input.metadataJson,
      });
      await refreshChecklist();
    },
    [organizacionId, refreshChecklist, rol, user?.id]
  );

  const markFirstShare = useCallback(
    async (input: {
      completionSource: string;
      metadataJson?: Record<string, unknown>;
    }) => {
      if (!organizacionId || rol !== "admin") {
        return;
      }

      await onboardingChecklistService.markFirstShare({
        organizationId: organizacionId,
        authUserId: user?.id ?? null,
        completionSource: input.completionSource,
        metadataJson: input.metadataJson,
      });
      await refreshChecklist();
    },
    [organizacionId, refreshChecklist, rol, user?.id]
  );

  const shouldHighlightStep = useCallback(
    (stepKey: OnboardingStepKey, options?: { onlyIfPending?: boolean }) => {
      const step = checklist?.steps.find((item) => item.key === stepKey);
      if (!step) {
        return false;
      }

      if (options?.onlyIfPending) {
        return !step.isCompleted;
      }

      return step.isCurrent;
    },
    [checklist]
  );

  const hasCompletedFirstQuote =
    checklist?.steps.find((step) => step.key === "first_quote")?.isCompleted ?? false;

  return useMemo(
    () => ({
      checklist,
      organizationId: organizacionId ?? null,
      isLoading,
      isPreviewMode,
      isVisible: Boolean(
        isEnabled &&
          checklist &&
          (isPreviewMode || (!hasCompletedFirstQuote && !isDismissed))
      ),
      error,
      isDismissed,
      hasCompletedFirstQuote,
      refreshChecklist,
      dismissChecklist,
      markChannelReady,
      markFirstShare,
      shouldHighlightStep,
    }),
    [
      checklist,
      dismissChecklist,
      error,
      hasCompletedFirstQuote,
      isEnabled,
      isDismissed,
      isLoading,
      isPreviewMode,
      markChannelReady,
      markFirstShare,
      organizacionId,
      refreshChecklist,
      shouldHighlightStep,
    ]
  );
}
