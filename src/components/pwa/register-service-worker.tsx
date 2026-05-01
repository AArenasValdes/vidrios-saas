"use client";

import { useEffect } from "react";

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

    if (runtimeEnv !== "production") {
      void unregisterAllServiceWorkers();
      void clearAppCaches();
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await serviceWorker.register("/sw.js", {
          scope: "/",
        });
        void registration.update();
      } catch {
        return;
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
