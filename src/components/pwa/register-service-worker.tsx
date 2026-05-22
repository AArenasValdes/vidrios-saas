"use client";

import { useEffect } from "react";
import { isCanonicalPwaHost } from "@/utils/pwa-host";
import { PWA_SERVICE_WORKER_VERSION } from "@/utils/pwa-sw-version";

declare global {
  interface Window {
    __VIDRIOS_SAAS_SW_ENV__?: string;
  }
}

async function unregisterAllServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    return;
  }
}

async function clearAppCaches() {
  if (!("caches" in window)) {
    return;
  }

  try {
    const keys = await window.caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("vidrios-saas"))
        .map((key) => window.caches.delete(key))
    );
  } catch {
    return;
  }
}

export function RegisterServiceWorker() {
  useEffect(() => {
    const serviceWorker = navigator.serviceWorker;
    if (!serviceWorker) {
      return;
    }

    const runtimeEnv = window.__VIDRIOS_SAAS_SW_ENV__ ?? process.env.NODE_ENV;
    const shouldUseCanonicalHost = isCanonicalPwaHost(window.location.hostname);

    if (runtimeEnv !== "production" || !shouldUseCanonicalHost) {
      void unregisterAllServiceWorkers();
      void clearAppCaches();
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await serviceWorker.register(
          `/sw.js?version=${PWA_SERVICE_WORKER_VERSION}`,
          {
          scope: "/",
            updateViaCache: "none",
          }
        );

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;

          if (!installing) {
            return;
          }

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && serviceWorker.controller) {
              installing.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        void registration.update();
      } catch {
        return;
      }
    };

    let hasReloadedForNewServiceWorker = false;
    const handleControllerChange = () => {
      if (hasReloadedForNewServiceWorker) {
        return;
      }

      hasReloadedForNewServiceWorker = true;
      window.location.reload();
    };

    serviceWorker.addEventListener("controllerchange", handleControllerChange);
    void registerServiceWorker();

    return () => {
      serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  return null;
}
