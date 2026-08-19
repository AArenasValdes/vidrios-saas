import type { ReactNode } from "react";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleTagProvider } from "@/features/analytics/components/google-tag-provider";
import { OAuthReturnTracker } from "@/features/auth/components/oauth-return-tracker";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { DynamicPwaComponents } from "@/components/pwa/dynamic-pwa-components";
import { geistSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "./globals.css";

const shouldRenderVercelInsights = process.env.VERCEL === "1";
const gtmContainerId = googleTagService.getGtmContainerId();

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ventorap.cl"),
  title: {
    default: "Ventora",
    template: "%s | Ventora",
  },
  description:
    "Ventora ayuda a talleres de vidrio y aluminio a cotizar, enviar PDFs por WhatsApp y preparar cubicaciones y pautas de corte revisables.",
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
  keywords: [
    "cotizador de vidrios",
    "cotizaciones de aluminio",
    "cubicación",
    "despiece",
    "pauta de corte",
    "PDF por WhatsApp",
  ],
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
    <html lang="es" className={cn("font-sans", geistSans.variable)}>
      <body className="antialiased">
        {gtmContainerId ? (
          <script
            id="ventora-google-tag-bootstrap"
            dangerouslySetInnerHTML={{
              __html:
                "window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});",
            }}
          />
        ) : null}
        {gtmContainerId ? (
          <Suspense fallback={null}>
            <GoogleTagProvider />
            <OAuthReturnTracker />
          </Suspense>
        ) : (
          <Suspense fallback={null}>
            <OAuthReturnTracker />
          </Suspense>
        )}
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
        <DynamicPwaComponents />
        {children}
        {shouldRenderVercelInsights ? <Analytics /> : null}
        {shouldRenderVercelInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
