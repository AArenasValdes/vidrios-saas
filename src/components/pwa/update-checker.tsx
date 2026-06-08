"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { CURRENT_APP_VERSION } from "@/utils/app-version";
import { isCanonicalPwaHost } from "@/utils/pwa-host";

const POLL_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_APPLY_TIMEOUT_MS = 10000;
const UPDATE_RELOAD_FALLBACK_MS = 1200;
const APP_UPDATE_TOAST_ID = "ventora-app-update";
const APP_CACHE_PREFIX = "vidrios-saas";

export type ForceAppUpdateResult =
  | "unsupported"
  | "no-registration"
  | "update-activated"
  | "no-update";

type ApplyUpdateWithFeedbackOptions = {
  update?: () => Promise<ForceAppUpdateResult>;
  reload?: () => void;
  reloadDelayMs?: number;
};

export async function fetchRemoteAppVersion(): Promise<string | null> {
  const response = await fetch("/api/app-version", { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { version?: string };
  return data?.version ?? null;
}

function waitForInstalledServiceWorker(worker: ServiceWorker): Promise<ForceAppUpdateResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ForceAppUpdateResult) => {
      if (settled) {
        return;
      }

      settled = true;
      worker.removeEventListener("statechange", handleStateChange);
      window.clearTimeout(timeout);
      resolve(result);
    };
    const handleStateChange = () => {
      if (worker.state === "installed") {
        worker.postMessage({ type: "SKIP_WAITING" });
        finish("update-activated");
      }
    };
    const timeout = window.setTimeout(() => {
      finish("no-update");
    }, UPDATE_APPLY_TIMEOUT_MS);

    worker.addEventListener("statechange", handleStateChange);
    handleStateChange();
  });
}

export async function forceAppUpdate(): Promise<ForceAppUpdateResult> {
  if (!("serviceWorker" in navigator)) return "unsupported";

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return "no-registration";

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return "update-activated";
    }

    if (registration.installing) {
      return await waitForInstalledServiceWorker(registration.installing);
    }

    const updateComplete = new Promise<ForceAppUpdateResult>((resolve) => {
      registration.addEventListener(
        "updatefound",
        () => {
          const installing = registration.installing;
          if (!installing) {
            resolve("no-update");
            return;
          }
          void waitForInstalledServiceWorker(installing).then(resolve);
        },
        { once: true }
      );
    });

    await registration.update();

    return await Promise.race([
      updateComplete,
      new Promise<ForceAppUpdateResult>((resolve) =>
        setTimeout(() => resolve("no-update"), UPDATE_APPLY_TIMEOUT_MS)
      ),
    ]);
  } catch {
    return "no-update";
  }
}

export async function repairAppOnThisDevice() {
  if (typeof window === "undefined") {
    return;
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(APP_CACHE_PREFIX))
        .map((key) => window.caches.delete(key))
    );
  }
}

function scheduleReloadAfterUpdate(
  reload: () => void,
  delayMs = UPDATE_RELOAD_FALLBACK_MS
) {
  window.setTimeout(() => {
    reload();
  }, delayMs);
}

export async function applyUpdateWithFeedback({
  update = forceAppUpdate,
  reload = () => window.location.reload(),
  reloadDelayMs = UPDATE_RELOAD_FALLBACK_MS,
}: ApplyUpdateWithFeedbackOptions = {}) {
  toast.loading("Actualizando Ventora...", {
    description: "La app se reiniciara en breve.",
    id: APP_UPDATE_TOAST_ID,
    duration: Infinity,
  });

  try {
    const result = await update();

    if (result === "no-update") {
      toast("No se encontro una actualizacion pendiente.", {
        description: "Recarga o usa Reparar app si sigues viendo una version antigua.",
        id: APP_UPDATE_TOAST_ID,
        duration: 6000,
      });
      return;
    }

    toast.loading("Aplicando actualizacion...", {
      description: "Si el dispositivo no se reinicia solo, lo haremos automaticamente.",
      id: APP_UPDATE_TOAST_ID,
      duration: Infinity,
    });
    scheduleReloadAfterUpdate(reload, reloadDelayMs);
  } catch {
    toast.error("No pudimos actualizar automaticamente.", {
      description: "Usa Reparar app en este dispositivo o recarga la pagina.",
      id: APP_UPDATE_TOAST_ID,
      duration: 7000,
    });
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
        const remoteVersion = await fetchRemoteAppVersion();
        if (!remoteVersion) return;

        if (remoteVersion !== CURRENT_APP_VERSION) {
          shownRef.current = true;

          window.dispatchEvent(
            new CustomEvent("ventora:app-update-available", {
              detail: { remoteVersion },
            })
          );
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
