import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "Vidrios SaaS",
    template: "%s | Vidrios SaaS",
  },
  description:
    "Plataforma para talleres de vidrio y aluminio. Cotiza rapido desde el celular y gestiona tu operacion.",
  applicationName: "Vidrios SaaS",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/ventora-icon.svg",
    apple: "/brand/ventora-icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Vidrios SaaS",
    statusBarStyle: "black-translucent",
  },
  keywords: ["cotizaciones", "vidrios", "aluminio", "taller", "pwa"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0f18",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
