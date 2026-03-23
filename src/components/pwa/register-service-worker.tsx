"use client";

import { useEffect } from "react";

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
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void unregisterAllServiceWorkers();
      void clearAppCaches();
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
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
