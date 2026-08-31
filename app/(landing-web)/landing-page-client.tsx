"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";

import { faqs, LOGIN_HREF, REGISTRO_HREF } from "./landing-shared";
import { PricingPlans } from "@/features/billing/components/pricing-plans";
import s from "./landing.module.css";

const ContrastSection = dynamic(
  () =>
    import("@/components/landing/contrast-section").then((mod) => ({
      default: mod.ContrastSection,
    })),
  { ssr: true }
);
const ProblemFlowSection = dynamic(
  () =>
    import("@/components/landing/problem-flow-section").then((mod) => ({
      default: mod.ProblemFlowSection,
    })),
  { ssr: true }
);
const QuoteFlowSection = dynamic(
  () =>
    import("@/components/landing/quote-flow-section").then((mod) => ({
      default: mod.QuoteFlowSection,
    })),
  { ssr: true }
);
const DevicesSection = dynamic(
  () =>
    import("@/components/landing/devices-section").then((mod) => ({
      default: mod.DevicesSection,
    })),
  { ssr: true }
);
const PautaSection = dynamic(
  () =>
    import("@/components/landing/pauta-section").then((mod) => ({
      default: mod.PautaSection,
    })),
  { ssr: true }
);
const PublicLinkSection = dynamic(
  () =>
    import("@/components/landing/public-link-section").then((mod) => ({
      default: mod.PublicLinkSection,
    })),
  { ssr: true }
);
const LandingContactSection = dynamic(
  () =>
    import("@/components/landing/landing-contact-section").then((mod) => ({
      default: mod.LandingContactSection,
    })),
  { ssr: true }
);

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className={s.sectionHeading}>
      <h2 className={s.sectionTitle}>{title}</h2>
      <p className={s.sectionDescription}>{description}</p>
    </div>
  );
}

export function LandingBelowFold() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <>
      <ContrastSection />

      <ProblemFlowSection />

      <QuoteFlowSection />

      <DevicesSection />

      <PautaSection />

      <PublicLinkSection />

      <div className={s.container}>
        <PricingPlans context="public" />
      </div>

      <section id="preguntas" className={s.faqSection}>
        <div className={s.container}>
          <SectionHeading
            title="Preguntas frecuentes"
            description="Respuestas cortas para entender rápido dónde encaja Ventora en tu forma de trabajar."
          />

          <div className={s.faqList}>
            {faqs.map((item, index) => (
              <article key={item.question} className={s.faqItem}>
                <button
                  type="button"
                  className={s.faqQuestion}
                  onClick={() => setFaqOpen((current) => (current === index ? null : index))}
                  aria-expanded={faqOpen === index}
                  aria-controls={`faq-answer-${index}`}
                  id={`faq-question-${index}`}
                  aria-label={`${faqOpen === index ? "Cerrar" : "Abrir"} respuesta: ${item.question}`}
                >
                  <span>{item.question}</span>
                  {faqOpen === index ? (
                    <X size={16} aria-hidden />
                  ) : (
                    <ArrowUpRight size={16} aria-hidden />
                  )}
                </button>
                <div
                  id={`faq-answer-${index}`}
                  className={`${s.faqAnswer} ${
                    faqOpen === index ? s.faqAnswerOpen : ""
                  }`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  hidden={faqOpen !== index}
                >
                  <p>{item.answer}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={s.finalCta} aria-labelledby="final-cta-title">
        <div className={s.container}>
          <div className={s.finalCtaInner}>
            <h2 id="final-cta-title" className={s.finalCtaTitle}>
              Empieza 15 días gratis
            </h2>
            <p className={s.finalCtaText}>
              Cotiza desde el celular, sigue en el computador y envía un PDF
              profesional. Pensado para talleres de Latinoamérica; pagos disponibles
              inicialmente en Chile.
            </p>
            <div className={s.finalCtaActions}>
              <Link href={REGISTRO_HREF} className={s.primaryButton} prefetch={false}>
                Crear cuenta
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href={LOGIN_HREF} className={s.secondaryButton} prefetch={false}>
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingContactSection />

      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerLayout}>
            <div className={s.footerBrand}>
              <Image
                src="/brand/ventora-logo-premium-dark.svg"
                alt="Ventora"
                width={344}
                height={80}
                className={s.footerBrandLogo}
                unoptimized
              />
              <p>
                Software comercial para talleres de vidrios y aluminio. Cotización,
                PDF por WhatsApp y fabricación configurable cuando la necesites.
              </p>
            </div>

            <div className={s.footerLinks}>
              <a href="#top">Inicio</a>
              <a href="#solucion">Cómo</a>
              <a href="#precios">Precios</a>
              <a href="#preguntas">Preguntas</a>
              <Link href={REGISTRO_HREF}>15 días gratis</Link>
              <Link href={LOGIN_HREF}>Ingresar</Link>
            </div>
          </div>

          <div className={s.footerBottom}>
            <span>Pensado para Latinoamérica · pagos en Chile</span>
            <span>Cualquier dispositivo · 15 días gratis</span>
            <span>ventora.cl@gmail.com</span>
            <Link href="/privacy">Privacidad</Link>
            <Link href="/terms">Términos</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
