import type { ReactNode } from "react";

import AppShell from "@/components/layout/app-shell";
import { jetbrainsMono, lato, syne } from "@/lib/fonts";

export default function PwaAppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className={`${syne.variable} ${lato.variable} ${jetbrainsMono.variable}`}>
      <AppShell>{children}</AppShell>
    </div>
  );
}
