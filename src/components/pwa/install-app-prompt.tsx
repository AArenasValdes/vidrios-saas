"use client";

import { useEffect, useState } from "react";

import s from "./install-app-prompt.module.css";

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

const DISMISS_KEY = "ventora:pwa-install-dismissed";

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}

function isIosSafari() {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);

  return isIos && isSafari;
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    const standalone = isStandaloneMode();

    return !wasDismissed && !standalone && isIosSafari();
  });
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    const standalone = isStandaloneMode();

    return wasDismissed || standalone;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
      setShowIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const closePrompt = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setShowIosHint(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      window.localStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    }

    setDeferredPrompt(null);
  };

  if (dismissed || isStandaloneMode()) {
    return null;
  }

  if (!deferredPrompt && !showIosHint) {
    return null;
  }

  return (
    <div className={s.root}>
      <div className={s.card}>
        <div className={s.header}>
          <div>
            <p className={s.title}>Instala Ventora en tu celular</p>
            {deferredPrompt ? (
              <p className={s.text}>
                Abre Ventora como app y entra mas rapido desde la pantalla de
                inicio.
              </p>
            ) : (
              <p className={s.text}>
                En iPhone, usa Safari y agrega Ventora a tu pantalla de inicio.
              </p>
            )}
          </div>

          <button type="button" className={s.close} onClick={closePrompt}>
            X
          </button>
        </div>

        {deferredPrompt ? (
          <div className={s.actions}>
            <button type="button" className={s.primary} onClick={handleInstall}>
              Instalar app
            </button>
            <button type="button" className={s.ghost} onClick={closePrompt}>
              Ahora no
            </button>
          </div>
        ) : (
          <ol className={s.steps}>
            <li>Toca Compartir en Safari.</li>
            <li>Selecciona Agregar a pantalla de inicio.</li>
          </ol>
        )}
      </div>
    </div>
  );
}
