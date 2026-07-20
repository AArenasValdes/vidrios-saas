"use client";

import dynamic from "next/dynamic";
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

export function DynamicPwaComponents() {
  const pathname = usePathname();
  const marketing = isMarketingPublicPath(pathname);

  return (
    <>
      {/* SW en todas las rutas; prompt de instalación solo en app privada. */}
      <RegisterServiceWorker />
      {marketing ? null : <InstallAppPrompt />}
    </>
  );
}
