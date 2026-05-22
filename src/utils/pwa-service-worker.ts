import { PWA_SERVICE_WORKER_VERSION } from "@/utils/pwa-sw-version";

const DEFAULT_READY_TIMEOUT_MS = 6000;

function createReadyTimeout(timeoutMs: number) {
  return new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(
        new Error(
          "No pudimos preparar las notificaciones en este dispositivo. Recarga la pagina e intenta nuevamente."
        )
      );
    }, timeoutMs);
  });
}

function getVersionedServiceWorkerUrl() {
  return `/sw.js?version=${PWA_SERVICE_WORKER_VERSION}`;
}

export async function resolvePushServiceWorkerRegistration(
  timeoutMs = DEFAULT_READY_TIMEOUT_MS
) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Este dispositivo no soporta service workers.");
  }

  let registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration()) ??
    null;

  if (!registration) {
    registration = await navigator.serviceWorker.register(getVersionedServiceWorkerUrl(), {
      scope: "/",
      updateViaCache: "none",
    });
  }

  if (registration.active || registration.waiting) {
    return registration;
  }

  return Promise.race([
    navigator.serviceWorker.ready,
    createReadyTimeout(timeoutMs),
  ]);
}
