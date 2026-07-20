import type { ReactNode } from "react";

import { spaceGrotesk } from "@/lib/fonts";

export default function AuthPublicLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <div className={spaceGrotesk.variable}>{children}</div>;
}
