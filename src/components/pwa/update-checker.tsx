"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { CURRENT_APP_VERSION } from "@/utils/app-version";
import { isCanonicalPwaHost } from "@/utils/pwa-host";

const POLL_INTERVAL_MS = 30 * 60 * 1000;

export async function forceAppUpdate(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return;

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    if (registration.installing) {
      await new Promise<void>((resolve) => {
        const installing = registration.installing;
        if (!installing) {
          resolve();
          return;
        }
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") {
            installing.postMessage({ type: "SKIP_WAITING" });
            resolve();
          }
        });
        if (installing.state === "installed") {
          installing.postMessage({ type: "SKIP_WAITING" });
          resolve();
        }
      });
      return;
    }

    const updateComplete = new Promise<void>((resolve) => {
      registration.addEventListener(
        "updatefound",
        () => {
          const installing = registration.installing;
          if (!installing) {
            resolve();
            return;
          }
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              installing.postMessage({ type: "SKIP_WAITING" });
              resolve();
            }
          });
          if (installing.state === "installed") {
            installing.postMessage({ type: "SKIP_WAITING" });
            resolve();
          }
        },
        { once: true }
      );
    });

    await registration.update();

    await Promise.race([
      updateComplete,
      new Promise<void>((r) => setTimeout(r, 10000)),
    ]);
  } catch {
    return;
  }
}

async function applyUpdateWithFeedback() {
  toast.loading("Actualizando Ventora...", {
    description: "La app se reiniciara en breve.",
  });

  try {
    await forceAppUpdate();
  } catch {
    return;
  }
}

export function UpdateChecker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shownRef = useRef(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!isCanonicalPwaHost(window.location.hostname)) return;

    const checkVersion = async () => {
      if (shownRef.current) return;
      if (checkingRef.current) return;

      checkingRef.current = true;

      try {
        const response = await fetch("/api/app-version", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { version?: string };
        const remoteVersion = data?.version;
        if (!remoteVersion) return;

        if (remoteVersion !== CURRENT_APP_VERSION) {
          shownRef.current = true;

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
      } finally {
        checkingRef.current = false;
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
