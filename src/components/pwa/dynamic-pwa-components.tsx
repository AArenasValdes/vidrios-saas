"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const RegisterServiceWorker = dynamic(
  () =>
    import("@/components/pwa/register-service-worker").then((m) => ({
      default: m.RegisterServiceWorker,
    })),
  { ssr: false },
);

const InstallAppPrompt = dynamic(
  () =>
    import("@/components/pwa/install-app-prompt").then((m) => ({
      default: m.InstallAppPrompt,
    })),
  { ssr: false },
);

function isMarketingPublicPath(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return (
    pathname.startsWith("/planes") ||
    pathname.startsWith("/solicitud/") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro")
  );
}

/**
 * bundle-defer-third-party / bundle-conditional:
 * en marketing no montamos SW ni install prompt hasta idle (no compiten con FCP).
 * en app privada el SW entra al hidratar (PWA real).
 */
export function DynamicPwaComponents() {
  const pathname = usePathname();
  const marketing = isMarketingPublicPath(pathname);
  const [allowPwa, setAllowPwa] = useState(!marketing);

  useEffect(() => {
    if (!marketing) {
      setAllowPwa(true);
      return;
    }

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const enable = () => {
      if (!cancelled) setAllowPwa(true);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(enable, { timeout: 4000 });
    } else {
      timeoutId = setTimeout(enable, 3000);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
    };
  }, [marketing]);

  if (!allowPwa) {
    return null;
  }

  return (
    <>
      <RegisterServiceWorker />
      {marketing ? null : <InstallAppPrompt />}
    </>
  );
}
