"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { APP_VERSION } from "@/utils/app-version";
import { isCanonicalPwaHost } from "@/utils/pwa-host";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const LOCAL_VERSION_KEY = "ventora:app-version";

function getStoredVersion() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCAL_VERSION_KEY);
  } catch {
    return null;
  }
}

function setStoredVersion(version: string) {
  try {
    window.localStorage.setItem(LOCAL_VERSION_KEY, version);
  } catch {
    return;
  }
}

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
    return;
  }
}

export function UpdateChecker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isCanonicalPwaHost(window.location.hostname)) return;

    const checkVersion = async () => {
      try {
        const response = await fetch("/api/app-version", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { version?: string };
        const remoteVersion = data?.version;
        if (!remoteVersion) return;

        const storedVersion = getStoredVersion();

        if (!storedVersion) {
          setStoredVersion(remoteVersion);
          return;
        }

        if (storedVersion !== remoteVersion && storedVersion !== APP_VERSION) {
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

        setStoredVersion(remoteVersion);
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

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
