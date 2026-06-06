import type { ReactNode } from "react";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleTagProvider } from "@/features/analytics/components/google-tag-provider";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { UpdateChecker } from "@/components/pwa/update-checker";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const shouldRenderVercelInsights = process.env.VERCEL === "1";
const gtmContainerId = googleTagService.getGtmContainerId();

export const metadata: Metadata = {
  title: {
    default: "Ventora",
    template: "%s | Ventora",
  },
  description:
    "Ventora ayuda a empresas de vidrio y aluminio a captar leads, ordenarlos y cerrarlos desde un solo lugar.",
  applicationName: "Ventora",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32.png",
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Ventora",
    statusBarStyle: "black-translucent",
  },
  keywords: ["leads", "cotizaciones", "vidrios", "aluminio", "crm comercial", "pwa"],
};

/* viewport-fit=cover requerido para que env(safe-area-inset-*) sea correcto en iPhone con notch / Dynamic Island. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0F17",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        {gtmContainerId ? (
          <Suspense fallback={null}>
            <GoogleTagProvider />
          </Suspense>
        ) : null}
        {gtmContainerId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmContainerId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        <RegisterServiceWorker />
        <UpdateChecker />
        <InstallAppPrompt />
        <Toaster position="top-center" richColors />
        {children}
        {shouldRenderVercelInsights ? <Analytics /> : null}
        {shouldRenderVercelInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
