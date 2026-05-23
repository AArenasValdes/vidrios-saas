"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import s from "./install-app-prompt.module.css";
import { setPwaInstallPromptVisible } from "./install-app-prompt-events";
import { isCanonicalPwaHost } from "@/utils/pwa-host";

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
const MANUAL_INSTALL_FALLBACK_DELAY_MS = 1800;

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

export function getAndroidManualInstallHintFromUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);

  if (!isAndroid) {
    return null;
  }

  if (/opera|opr\//.test(ua)) {
    return {
      browserLabel: "Opera",
      menuLabel: "menu O",
      menuLocationLabel: "abajo a la derecha",
      installLabel: "Instalar app",
      fallbackInstallLabel: "Agregar a pantalla principal",
      menuSymbol: "O",
    };
  }

  if (/edg\//.test(ua)) {
    return {
      browserLabel: "Edge",
      menuLabel: "menu del navegador",
      menuLocationLabel: "abajo o arriba a la derecha",
      installLabel: "Instalar app",
      fallbackInstallLabel: "Agregar a pantalla principal",
      menuSymbol: "⋯",
    };
  }

  if (/samsungbrowser/.test(ua)) {
    return {
      browserLabel: "Samsung Internet",
      menuLabel: "menu del navegador",
      menuLocationLabel: "abajo a la derecha",
      installLabel: "Agregar pagina a",
      fallbackInstallLabel: "Pantalla de inicio",
      menuSymbol: "≡",
    };
  }

  if (/chrome|crios|brave/.test(ua)) {
    return {
      browserLabel: "tu navegador",
      menuLabel: "menu del navegador",
      menuLocationLabel: "arriba a la derecha",
      installLabel: "Instalar app",
      fallbackInstallLabel: "Agregar a pantalla principal",
      menuSymbol: "⋮",
    };
  }

  return {
    browserLabel: "tu navegador",
    menuLabel: "menu del navegador",
    menuLocationLabel: "arriba o abajo a la derecha",
    installLabel: "Instalar app",
    fallbackInstallLabel: "Agregar a pantalla principal",
    menuSymbol: "⋮",
  };
}

function getAndroidManualInstallHint() {
  if (typeof window === "undefined") {
    return null;
  }

  return getAndroidManualInstallHintFromUserAgent(window.navigator.userAgent);
}

export function InstallAppPrompt() {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showAndroidHint, setShowAndroidHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [androidHint, setAndroidHint] = useState<ReturnType<
    typeof getAndroidManualInstallHint
  >>(null);

  useEffect(() => {
    if (!isCanonicalPwaHost(window.location.hostname)) {
      queueMicrotask(() => {
        setShowIosHint(false);
        setShowAndroidHint(false);
        setAndroidHint(null);
        setDismissed(true);
        setIsHydrated(true);
      });
      return;
    }

    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    const standalone = isStandaloneMode();
    const manualAndroidHint = getAndroidManualInstallHint();

    queueMicrotask(() => {
      setShowIosHint(!wasDismissed && !standalone && isIosSafari());
      setShowAndroidHint(false);
      setAndroidHint(manualAndroidHint);
      setDismissed(wasDismissed || standalone);
      setIsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isCanonicalPwaHost(window.location.hostname)) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
      setShowIosHint(false);
      setShowAndroidHint(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !isHydrated ||
      dismissed ||
      isStandaloneMode() ||
      deferredPrompt ||
      showIosHint ||
      showAndroidHint ||
      !androidHint
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowAndroidHint(true);
    }, MANUAL_INSTALL_FALLBACK_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    androidHint,
    deferredPrompt,
    dismissed,
    isHydrated,
    showAndroidHint,
    showIosHint,
  ]);

  const closePrompt = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setShowIosHint(false);
    setShowAndroidHint(false);
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

  useEffect(() => {
    const isVisible = Boolean(
      isHydrated &&
        !pathname?.startsWith("/print") &&
        !dismissed &&
        !isStandaloneMode() &&
        (deferredPrompt || showIosHint || showAndroidHint)
    );

    setPwaInstallPromptVisible(isVisible);

    return () => {
      setPwaInstallPromptVisible(false);
    };
  }, [deferredPrompt, dismissed, isHydrated, pathname, showAndroidHint, showIosHint]);

  if (
    !isHydrated ||
    pathname?.startsWith("/print") ||
    dismissed ||
    isStandaloneMode()
  ) {
    return null;
  }

  if (!deferredPrompt && !showIosHint && !showAndroidHint) {
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
            ) : showAndroidHint && androidHint ? (
              <p className={s.text}>
                Si {androidHint.browserLabel} no muestra el boton solo, te
                guiamos para dejar Ventora instalada en menos de un minuto.
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
        ) : showAndroidHint && androidHint ? (
          <div className={s.manualBlock}>
            <div className={s.browserGuide} aria-hidden>
              <div className={s.browserMock}>
                <div className={s.browserTopbar}>
                  <span className={s.browserDot} />
                  <span className={s.browserUrl}>ventorap.cl</span>
                </div>
                <div className={s.browserBody}>
                  <div className={s.browserCard}>
                    <span className={s.browserCardLabel}>Ventora</span>
                    <strong>Instala la app</strong>
                    <span>y entra mas rapido</span>
                  </div>
                </div>
                <div className={s.browserFooter}>
                  <span className={s.browserNavIcon}>◁</span>
                  <span className={s.browserNavIcon}>○</span>
                  <span className={s.browserNavIcon}>□</span>
                  <span className={s.browserMenuHint}>
                    {androidHint.menuSymbol}
                  </span>
                </div>
                <div className={s.browserPulse} />
                <div className={s.browserCallout}>
                  Toca aqui
                  <span>{androidHint.menuLabel}</span>
                </div>
              </div>
            </div>

            <div className={s.stepGrid}>
              <div className={s.stepRow}>
                <span className={s.stepBadge}>1</span>
                <p className={s.stepText}>
                  Toca el {androidHint.menuLabel} {androidHint.menuLocationLabel}.
                </p>
              </div>
              <div className={s.stepRow}>
                <span className={s.stepBadge}>2</span>
                <p className={s.stepText}>
                  Busca <strong>{androidHint.installLabel}</strong>.
                </p>
              </div>
              <div className={s.stepRow}>
                <span className={s.stepBadge}>3</span>
                <p className={s.stepText}>
                  Si no aparece, toca{" "}
                  <strong>{androidHint.fallbackInstallLabel}</strong>.
                </p>
              </div>
              <div className={s.stepRow}>
                <span className={s.stepBadge}>4</span>
                <p className={s.stepText}>
                  Despues abre Ventora desde el icono nuevo en tu inicio.
                </p>
              </div>
            </div>
            <div className={s.actions}>
              <button type="button" className={s.ghost} onClick={closePrompt}>
                Ya entendi
              </button>
            </div>
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
