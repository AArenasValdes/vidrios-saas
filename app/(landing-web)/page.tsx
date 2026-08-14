import nextDynamic from "next/dynamic";
import type { Metadata } from "next";

import { LandingHeroServer } from "./landing-hero-server";
import { LandingNavClient } from "./landing-nav-client";
import s from "./landing.module.css";

const landingTitle =
  "Ventora | Cotizador, cubicación y pauta de corte para vidrio y aluminio";
const landingDescription =
  "Cotiza trabajos de vidrio y aluminio desde el celular o computador. Genera PDFs por WhatsApp y prepara cubicaciones y pautas de corte revisables.";
const landingOgImage =
  "https://www.ventorap.cl/ventora-landing-page/dashboard-cotizaciones.webp";

export const metadata: Metadata = {
  title: { absolute: landingTitle },
  description: landingDescription,
  alternates: {
    canonical: "https://www.ventorap.cl/",
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "https://www.ventorap.cl/",
    siteName: "Ventora",
    title: landingTitle,
    description: landingDescription,
    images: [
      {
        url: landingOgImage,
        width: 1920,
        height: 1080,
        alt: "Ventora funcionando en celular con panel de cotizaciones y trabajos de demostración",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: landingTitle,
    description: landingDescription,
    images: [landingOgImage],
  },
};

// bundle-dynamic-imports: todo bajo el fold fuera del chunk crítico del hero RSC.
const LandingBelowFold = nextDynamic(
  () =>
    import("./landing-page-client").then((mod) => ({
      default: mod.LandingBelowFold,
    })),
  { ssr: true }
);

/** Landing cacheable: hero RSC + islas client. */
export const dynamic = "force-static";

export default function LandingPage() {
  return (
    <main className={s.page}>
      <LandingNavClient />
      <LandingHeroServer />
      <LandingBelowFold />
    </main>
  );
}
