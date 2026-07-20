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
      // #region agent log
      fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "d4bf8a",
        },
        body: JSON.stringify({
          sessionId: "d4bf8a",
          runId: "activacion-gate",
          hypothesisId: "H1",
          location: "useActivationGate.ts:replay",
          message: "activation_gate_replay_bypass",
          data: { isReplayMode, rol, organizacionId: Boolean(organizacionId) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setShouldRedirect(false);
      setIsChecking(false);
      return;
    }

    if (cargando || !organizacionId || rol !== "admin") {
      // #region agent log
      fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "d4bf8a",
        },
        body: JSON.stringify({
          sessionId: "d4bf8a",
          runId: "activacion-gate",
          hypothesisId: cargando ? "H2" : !organizacionId ? "H2" : "H3",
          location: "useActivationGate.ts:early_exit",
          message: "activation_gate_early_exit",
          data: {
            cargando,
            hasOrg: Boolean(organizacionId),
            rol,
            willForceShouldRedirectFalse: true,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setShouldRedirect(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    try {
      const status = await fetchActivationStatus();
      setShouldRedirect(status.shouldRedirect);
      // #region agent log
      fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "d4bf8a",
        },
        body: JSON.stringify({
          sessionId: "d4bf8a",
          runId: "activacion-gate",
          hypothesisId: "H1",
          location: "useActivationGate.ts:status",
          message: "activation_gate_status",
          data: {
            shouldRedirect: status.shouldRedirect,
            quoteCount: status.quoteCount,
            activationState: status.activationState,
            rol,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      if (options?.redirectWhenNeeded && status.shouldRedirect) {
        router.replace("/activacion");
      }
    } catch (error) {
      // #region agent log
      fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "d4bf8a",
        },
        body: JSON.stringify({
          sessionId: "d4bf8a",
          runId: "activacion-gate",
          hypothesisId: "H2",
          location: "useActivationGate.ts:error",
          message: "activation_gate_fetch_error",
          data: {
            errorName: error instanceof Error ? error.name : "unknown",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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
