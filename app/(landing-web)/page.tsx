import nextDynamic from "next/dynamic";
import type { Metadata } from "next";

import { LandingHeroServer } from "./landing-hero-server";
import { LandingNavClient } from "./landing-nav-client";
import { faqs } from "./landing-shared";
import { BILLING_PLANS } from "@/features/billing/types/plans";
import s from "./landing.module.css";

const landingTitle = "Software para vidrierías | Cotizador de aluminio";
const landingDescription =
  "Software para vidrierías y talleres: cotiza vidrio y aluminio, envía PDF por WhatsApp y prueba Ventora gratis por 15 días.";
const landingOgImage =
  "https://www.ventorap.cl/ventora-landing-page/dashboard-cotizaciones.webp";
const quoteOnlyAnnualPlan = BILLING_PLANS.quote_only_annual;

type LandingJsonLd = Record<string, unknown>;

const softwareApplicationJsonLd: LandingJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Ventora",
  description: landingDescription,
  url: "https://www.ventorap.cl/",
  image: landingOgImage,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, mobile browser",
  inLanguage: "es-CL",
  featureList: [
    "Cotización de vidrio y aluminio",
    "PDF profesional y envío por WhatsApp",
    "Clientes y cotizaciones ordenados",
    "Líneas propias y fabricación configurable",
  ],
  offers: {
    "@type": "Offer",
    name: quoteOnlyAnnualPlan.productLabel,
    price: String(quoteOnlyAnnualPlan.amountClp),
    priceCurrency: "CLP",
    url: "https://www.ventorap.cl/registro?plan=quote_only&billing_period=yearly",
    availability: "https://schema.org/OnlineOnly",
  },
};

const faqPageJsonLd: LandingJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageJsonLd),
        }}
      />
      <LandingNavClient />
      <LandingHeroServer />
      <LandingBelowFold />
    </main>
  );
}
