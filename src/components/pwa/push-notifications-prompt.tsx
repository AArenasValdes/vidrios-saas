"use client";

import { useEffect, useState } from "react";
import { LuBellRing } from "react-icons/lu";

import s from "./push-notifications-prompt.module.css";

const DISMISS_KEY = "ventora:push-notifications-dismissed";

function isAndroidPushCandidate() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function persistSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/pwa/push-subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(
      payload?.error ?? "No pudimos guardar las notificaciones de este dispositivo."
    );
  }
}

export function PushNotificationsPrompt() {
  const [shouldRender, setShouldRender] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);

  useEffect(() => {
    if (!isAndroidPushCandidate()) {
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey) {
      return;
    }

    const dismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(DISMISS_KEY) === "1";

    const permission = Notification.permission;

    if (permission === "granted") {
      setShouldRender(true);
      return;
    }

    if (!dismissed && permission !== "denied") {
      setShouldRender(true);
    }
  }, []);

  useEffect(() => {
    if (!shouldRender || Notification.permission !== "granted") {
      return;
    }

    let cancelled = false;

    const syncExistingSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();

        if (!existing || cancelled) {
          return;
        }

        await persistSubscription(existing);

        if (!cancelled) {
          setIsEnabled(true);
          setStatus("Alertas activas para aprobaciones y rechazos.");
          setStatusIsError(false);
        }
      } catch {
        if (!cancelled) {
          setStatus("No pudimos sincronizar las alertas de este dispositivo.");
          setStatusIsError(true);
        }
      }
    };

    void syncExistingSubscription();

    return () => {
      cancelled = true;
    };
  }, [shouldRender]);

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setShouldRender(false);
  };

  const handleEnable = async () => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey) {
      setStatus("Falta configurar la clave publica de notificaciones push.");
      setStatusIsError(true);
      return;
    }

    try {
      setIsBusy(true);
      setStatus(null);
      setStatusIsError(false);

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("Debes permitir notificaciones para recibir aprobaciones y rechazos.");
        setStatusIsError(true);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
        });
      }

      await persistSubscription(subscription);
      window.localStorage.removeItem(DISMISS_KEY);
      setIsEnabled(true);
      setStatus("Alertas activas. Te avisaremos cuando un cliente apruebe o rechace.");
      setStatusIsError(false);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "No pudimos activar las notificaciones en este telefono."
      );
      setStatusIsError(true);
    } finally {
      setIsBusy(false);
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <section className={s.card} aria-live="polite">
      <div className={s.icon} aria-hidden>
        <LuBellRing size={22} />
      </div>

      <div className={s.body}>
        <span className={s.eyebrow}>Android PWA</span>
        <h2 className={s.title}>Activa alertas reales para respuestas de clientes</h2>
        <p className={s.text}>
          Solo te avisaremos cuando una cotizacion sea aprobada o rechazada. Sin ruido
          extra ni recordatorios innecesarios.
        </p>
        {status ? (
          <p className={`${s.status}${statusIsError ? ` ${s.statusError}` : ""}`}>
            {status}
          </p>
        ) : null}
      </div>

      <div className={s.actions}>
        <button
          className={s.activateBtn}
          onClick={() => void handleEnable()}
          type="button"
          disabled={isBusy || isEnabled}
        >
          {isEnabled ? "Alertas activas" : isBusy ? "Activando..." : "Activar alertas"}
        </button>
        {!isEnabled ? (
          <button className={s.dismissBtn} onClick={handleDismiss} type="button">
            Ahora no
          </button>
        ) : null}
      </div>
    </section>
  );
}
