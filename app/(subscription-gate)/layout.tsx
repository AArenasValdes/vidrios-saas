import type { ReactNode } from "react";

import { jetbrainsMono, lato, syne } from "@/lib/fonts";

/**
 * Layout liviano para gates de suscripción (sin AppShell).
 * Evita framer-motion, nav, alerts y feeds en el critical path de FCP.
 */
export default function SubscriptionGateLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className={`${syne.variable} ${lato.variable} ${jetbrainsMono.variable}`}>
      {children}
    </div>
  );
}
