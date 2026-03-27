import { resolvePushServiceWorkerRegistration } from "@/utils/pwa-service-worker";

function sanitizeWebPushKey(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
}

export function base64UrlToUint8Array(value: string) {
  const sanitized = sanitizeWebPushKey(value);

  if (!sanitized) {
    throw new Error("La clave publica de notificaciones esta vacia.");
  }

  const padding = "=".repeat((4 - (sanitized.length % 4)) % 4);
  const normalized = (sanitized + padding).replace(/-/g, "+").replace(/_/g, "/");

  try {
    const decode =
      typeof globalThis.atob === "function"
        ? globalThis.atob.bind(globalThis)
        : (input: string) => Buffer.from(input, "base64").toString("binary");
    const binary = decode(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    throw new Error(
      "La clave publica de notificaciones no tiene un formato valido."
    );
  }
}

function getPushErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "No pudimos activar las alertas push en este navegador.";
  }

  const message = error.message.trim();
  const normalized = message.toLowerCase();

  if (
    normalized.includes("push service error") ||
    normalized.includes("registration failed")
  ) {
    return "El navegador no pudo registrar las alertas push. Recarga la pagina e intenta nuevamente.";
  }

  if (normalized.includes("not correctly encoded")) {
    return "La clave publica de notificaciones no tiene un formato valido.";
  }

  return message || "No pudimos activar las alertas push en este navegador.";
}

function shouldRetrySubscription(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalized = error.message.toLowerCase();

  return (
    normalized.includes("push service error") ||
    normalized.includes("registration failed")
  );
}

async function resetPushRegistration() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Este dispositivo no soporta service workers.");
  }

  const registrations =
    typeof navigator.serviceWorker.getRegistrations === "function"
      ? await navigator.serviceWorker.getRegistrations()
      : [];

  await Promise.all(
    registrations.map(async (registration) => {
      try {
        await registration.unregister();
      } catch {
        // Keep going and let the fresh registration decide the final outcome.
      }
    })
  );

  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return resolvePushServiceWorkerRegistration();
}

export async function subscribeToPushNotifications(vapidPublicKey: string) {
  const applicationServerKey = base64UrlToUint8Array(vapidPublicKey);

  const trySubscribe = async () => {
    const registration = await resolvePushServiceWorkerRegistration();
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
      return existingSubscription;
    }

    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  };

  try {
    return await trySubscribe();
  } catch (error) {
    if (!shouldRetrySubscription(error)) {
      throw new Error(getPushErrorMessage(error));
    }

    try {
      const registration = await resetPushRegistration();

      return await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (retryError) {
      throw new Error(getPushErrorMessage(retryError));
    }
  }
}
