"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ActivationFlowStatus } from "@/features/onboarding/services/onboarding-activation-flow.service";

type UseActivationGateResult = {
  isChecking: boolean;
  shouldRedirect: boolean;
  markActivationComplete: () => Promise<void>;
  markActivationSkipped: () => Promise<void>;
};

async function fetchActivationStatus(): Promise<ActivationFlowStatus> {
  const response = await fetch("/api/onboarding/activation/status", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No pudimos revisar la activacion inicial.");
  }

  return (await response.json()) as ActivationFlowStatus;
}

async function postActivationAction(action: "complete" | "skip") {
  const response = await fetch("/api/onboarding/activation/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error("No pudimos guardar la activacion inicial.");
  }
}

export function useActivationGate(options?: {
  redirectWhenNeeded?: boolean;
  isReplayMode?: boolean;
}) {
  const router = useRouter();
  const { rol, cargando, organizacionId } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const isReplayMode = options?.isReplayMode ?? false;

  const refreshStatus = useCallback(async () => {
    if (isReplayMode) {
      setShouldRedirect(false);
      setIsChecking(false);
      return;
    }

    if (cargando || !organizacionId || rol !== "admin") {
      setShouldRedirect(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    try {
      const status = await fetchActivationStatus();
      setShouldRedirect(status.shouldRedirect);

      if (options?.redirectWhenNeeded && status.shouldRedirect) {
        router.replace("/activacion");
      }
    } catch {
      setShouldRedirect(false);
    } finally {
      setIsChecking(false);
    }
  }, [cargando, isReplayMode, options?.redirectWhenNeeded, organizacionId, rol, router]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const markActivationComplete = useCallback(async () => {
    if (!isReplayMode) {
      await postActivationAction("complete");
    }

    setShouldRedirect(false);
  }, [isReplayMode]);

  const markActivationSkipped = useCallback(async () => {
    if (!isReplayMode) {
      await postActivationAction("skip");
    }

    setShouldRedirect(false);
  }, [isReplayMode]);

  return {
    isChecking,
    shouldRedirect,
    markActivationComplete,
    markActivationSkipped,
    refreshStatus,
  } satisfies UseActivationGateResult & { refreshStatus: () => Promise<void> };
}
