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
      menuLabel: "los tres puntitos",
      menuLocationLabel: "arriba a la derecha",
      installLabel: "Anadir a...",
      fallbackInstallLabel: "Pantalla de inicio",
      menuSymbol: "O",
      steps: [
        'Toca los tres puntitos arriba a la derecha.',
        'Toca "Anadir a...".',
        'Toca "Pantalla de inicio".',
      ],
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
      steps: [
        'Toca el menu del navegador.',
        'Toca "Instalar app".',
        'Abre Ventora desde el icono nuevo.',
      ],
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
      steps: [
        'Toca el menu del navegador.',
        'Toca "Agregar pagina a".',
        'Elige "Pantalla de inicio".',
      ],
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
      steps: [
        'Toca el menu del navegador.',
        'Toca "Instalar app".',
        'Abre Ventora desde el icono nuevo.',
      ],
    };
  }

  return {
    browserLabel: "tu navegador",
    menuLabel: "menu del navegador",
    menuLocationLabel: "arriba o abajo a la derecha",
    installLabel: "Instalar app",
    fallbackInstallLabel: "Agregar a pantalla principal",
    menuSymbol: "⋮",
    steps: [
      'Toca el menu del navegador.',
      'Busca "Instalar app".',
      'Si no aparece, usa "Agregar a pantalla principal".',
    ],
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
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [androidHint, setAndroidHint] = useState<ReturnType<
    typeof getAndroidManualInstallHint
  >>(null);

  useEffect(() => {
    if (!isCanonicalPwaHost(window.location.hostname)) {
      queueMicrotask(() => {
        setShowIosHint(false);
        setShowAndroidHint(false);
        setIsGuideOpen(false);
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
      setIsGuideOpen(false);
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
      setIsGuideOpen(false);
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
    setIsGuideOpen(false);
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

  const openGuide = () => {
    setIsGuideOpen(true);
  };

  const closeGuide = () => {
    setIsGuideOpen(false);
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
      <div className={s.bar}>
        <div className={s.barCopy}>
          <p className={s.barTitle}>Descargar app</p>
          <p className={s.barText}>
            {deferredPrompt
              ? "Guardala en tu inicio."
              : showAndroidHint && androidHint
              ? `Instalala en ${androidHint.browserLabel} en 3 pasos.`
              : "Guardala en tu celular."}
          </p>
        </div>

        <button type="button" className={s.barClose} onClick={closePrompt} aria-label="Cerrar">
          X
        </button>

        <div className={s.barActions}>
          {deferredPrompt ? (
            <button type="button" className={s.primary} onClick={handleInstall}>
              Descargar app
            </button>
          ) : (
            <button type="button" className={s.primary} onClick={openGuide}>
              Descargar app
            </button>
          )}
        </div>
      </div>

      {isGuideOpen ? (
        <div className={s.sheet}>
          <div className={s.card}>
            <div className={s.header}>
              <div>
                <p className={s.title}>
                  {showAndroidHint && androidHint
                    ? `Instalar en ${androidHint.browserLabel}`
                    : "Instalar Ventora"}
                </p>
                <p className={s.text}>
                  {showAndroidHint && androidHint
                    ? "Haz esto una vez."
                    : "Haz esto una vez."}
                </p>
              </div>

              <button type="button" className={s.close} onClick={closeGuide}>
                X
              </button>
            </div>

            {showAndroidHint && androidHint ? (
              <div className={s.manualBlock}>
                <div className={s.miniGuide} aria-hidden>
                  <div className={s.miniBrowser}>
                    <span className={s.miniBrand}>ventorap.cl</span>
                    <span className={s.miniMenuDots}>{androidHint.menuSymbol}</span>
                  </div>
                  <div className={s.miniHint}>
                    Toca aqui
                    <strong>{androidHint.menuLabel}</strong>
                  </div>
                </div>

                <div className={s.stepGrid}>
                  {androidHint.steps.map((step, index) => (
                    <div className={s.stepRow} key={step}>
                      <span className={s.stepBadge}>{index + 1}</span>
                      <p className={s.stepText}>{step}</p>
                    </div>
                  ))}
                </div>
                <div className={s.actions}>
                  <button type="button" className={s.ghost} onClick={closeGuide}>
                    Ya entendi
                  </button>
                </div>
              </div>
            ) : (
              <div className={s.manualBlock}>
                <ol className={s.steps}>
                  <li>Toca Compartir o el menu del navegador.</li>
                  <li>Busca Instalar app o Agregar a pantalla de inicio.</li>
                  <li>Abre Ventora desde el icono nuevo.</li>
                </ol>
                <div className={s.actions}>
                  <button type="button" className={s.ghost} onClick={closeGuide}>
                    Entendido
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
