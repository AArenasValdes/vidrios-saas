import type { ReactNode } from "react";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { GoogleTagProvider } from "@/features/analytics/components/google-tag-provider";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const shouldRenderVercelInsights = process.env.VERCEL === "1";
const gaMeasurementId = googleTagService.getGaMeasurementId();
const googleAdsId = googleTagService.getGoogleAdsId();
const googleTagId = gaMeasurementId || googleAdsId;

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
  keywords: ["leads", "cotizaciones", "vidrios", "aluminio", "crm comercial", "pwa"],
};

/* viewport-fit=cover requerido para que env(safe-area-inset-*) sea correcto en iPhone con notch / Dynamic Island. */
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
        {googleTagId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
              strategy="afterInteractive"
            />
            <Script id="ventora-google-tag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
              `}
            </Script>
            <Suspense fallback={null}>
              <GoogleTagProvider />
            </Suspense>
          </>
        ) : null}
        <RegisterServiceWorker />
        <InstallAppPrompt />
        {children}
        {shouldRenderVercelInsights ? <Analytics /> : null}
        {shouldRenderVercelInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
