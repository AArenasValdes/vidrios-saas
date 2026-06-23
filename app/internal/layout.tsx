import type { ReactNode } from "react";

export default function InternalLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
