"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { CURRENT_APP_VERSION } from "@/utils/app-version";
import { isCanonicalPwaHost } from "@/utils/pwa-host";

const POLL_INTERVAL_MS = 30 * 60 * 1000;

export async function forceAppUpdate() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration?.waiting) {
      await registration?.update();
    }

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  } catch {
    return;
  }
}

async function applyUpdateWithFeedback() {
  const loadingToastId = toast.loading("Actualizando Ventora...", {
    description: "La app se reiniciara en breve.",
  });

  try {
    await forceAppUpdate();
  } catch {
    toast.dismiss(loadingToastId);
  }
}

export function UpdateChecker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isCanonicalPwaHost(window.location.hostname)) return;

    let hasShownUpdateToast = false;

    const checkVersion = async () => {
      if (hasShownUpdateToast) return;

      try {
        const response = await fetch("/api/app-version", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { version?: string };
        const remoteVersion = data?.version;
        if (!remoteVersion) return;

        if (remoteVersion !== CURRENT_APP_VERSION) {
          hasShownUpdateToast = true;

          toast("Hay una nueva version de Ventora disponible.", {
            description: "Actualiza para ver los ultimos cambios sin reinstalar la app.",
            duration: Infinity,
            action: {
              label: "Actualizar ahora",
              onClick: () => {
                void applyUpdateWithFeedback();
              },
            },
            cancel: {
              label: "Despues",
              onClick: () => {
                return;
              },
            },
          });
        }
      } catch {
        return;
      }
    };

    void checkVersion();

    intervalRef.current = setInterval(() => {
      void checkVersion();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkVersion();
      }
    };

    const handleFocus = () => {
      void checkVersion();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return null;
}
