"use client";

import dynamic from "next/dynamic";

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

export function DynamicPwaComponents() {
  return (
    <>
      <RegisterServiceWorker />
      <InstallAppPrompt />
    </>
  );
}
