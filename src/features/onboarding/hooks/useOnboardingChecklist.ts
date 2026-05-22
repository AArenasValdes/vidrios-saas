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
  isLoading: boolean;
  isVisible: boolean;
  error: string | null;
  refreshChecklist: () => Promise<void>;
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

export function useOnboardingChecklist(): UseOnboardingChecklistResult {
  const { user, organizacionId, rol, cargando } = useAuth();
  const { profile, isReady: isProfileReady } = useOrganizationProfile();
  const [checklist, setChecklist] = useState<OnboardingChecklistViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeLoadIdRef = useRef(0);

  const isEnabled = !cargando && rol === "admin" && Boolean(organizacionId) && isProfileReady;

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

  return useMemo(
    () => ({
      checklist,
      isLoading,
      isVisible: Boolean(isEnabled && checklist && !checklist.isComplete),
      error,
      refreshChecklist,
      markChannelReady,
      markFirstShare,
      shouldHighlightStep,
    }),
    [
      checklist,
      error,
      isEnabled,
      isLoading,
      markChannelReady,
      markFirstShare,
      refreshChecklist,
      shouldHighlightStep,
    ]
  );
}
