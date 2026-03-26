import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "Ventora",
    template: "%s | Ventora",
  },
  description:
    "Ventora ayuda a talleres de vidrio y aluminio a cotizar rapido desde el celular y gestionar su operacion comercial.",
  applicationName: "Ventora",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Ventora",
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
        <InstallAppPrompt />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
