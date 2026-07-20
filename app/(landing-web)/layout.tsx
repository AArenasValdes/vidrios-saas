import type { ReactNode } from "react";

import { spaceGrotesk } from "@/lib/fonts";

export default function LandingWebLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className={spaceGrotesk.variable}>
      {/* Preload del LCP habitual del home (fondo hero). */}
      <link
        rel="preload"
        as="image"
        href="/brand/landing-cotizar-bg.webp"
        type="image/webp"
        fetchPriority="high"
      />
      {children}
    </div>
  );
}
