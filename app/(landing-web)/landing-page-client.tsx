"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, ArrowUpRight, CircleCheck, X } from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { faqs, LOGIN_HREF, pricingPlans, REGISTRO_HREF } from "./landing-shared";
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

function subscribeReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SectionReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
  const revealRef = useRef<HTMLDivElement | null>(null);
  const [hasIntersected, setHasIntersected] = useState(false);
  const isVisible = reduceMotion || hasIntersected;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const node = revealRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [reduceMotion]);

  const revealClassName = [
    className,
    !reduceMotion ? s.sectionReveal : null,
    !reduceMotion && isVisible ? s.sectionRevealVisible : null,
  ]
    .filter(Boolean)
    .join(" ");

  return <div ref={revealRef} className={revealClassName}>{children}</div>;
}

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

  function trackLandingCta(location: string, kind: "internal" | "whatsapp") {
    if (kind === "whatsapp") {
      googleTagService.trackWhatsappClick({
        source: "landing",
        location,
        label: `landing:${location}`,
      });
      return;
    }

    googleTagService.trackEvent("landing_cta_click", {
      event_category: "landing",
      event_label: location,
      source: "landing",
      location,
    });
  }

  return (
    <>
      <ContrastSection />
      <ProblemFlowSection />
      <QuoteFlowSection />
      <DevicesSection />
      <PautaSection />
      <PublicLinkSection />

      <section id="precios" className={s.pricingSection}>
        <div className={s.container}>
          <SectionReveal>
            <div className={s.pricingIntro}>
              <div className={s.pricingHeader}>
                <SectionHeading
                  title="Parte 15 días gratis con Ventora"
                  description="Prueba el cotizador y elige después el plan que mejor calce con tu negocio."
                />
              </div>
              <p className={s.pricingStrip}>
                Una sola cotización perdida puede costar más que todo el año de Ventora.
              </p>
            </div>
          </SectionReveal>

          <div className={s.pricingGrid}>
            {pricingPlans.map((plan) => {
              const isFeatured = plan.tone === "featured";
              const cardToneClass =
                plan.tone === "featured"
                  ? s.pricingCardFeatured
                  : plan.tone === "highlight"
                    ? s.pricingCardHighlight
                    : plan.tone === "anchor"
                      ? s.pricingCardAnchor
                      : s.pricingCardSecondary;

              return (
                <article
                  key={plan.name}
                  className={`${s.pricingCard} ${cardToneClass}`}
                >
                  <div className={s.pricingCardTop}>
                    <div>
                      <h3>{plan.name}</h3>
                      <div className={s.pricingAmount}>
                        <strong>{plan.price}</strong>
                        <span>{plan.period}</span>
                      </div>
                    </div>
                    {plan.badge ? <span className={s.pricingBadge}>{plan.badge}</span> : null}
                  </div>

                  <p className={s.pricingDescription}>{plan.description}</p>
                  {plan.helper ? <p className={s.pricingHelper}>{plan.helper}</p> : null}
                  {plan.savings ? <p className={s.pricingSavings}>{plan.savings}</p> : null}

                  {plan.ctaKind === "whatsapp" ? (
                    <a
                      href={plan.href}
                      className={`${s.pricingCta} ${s.pricingCtaSecondary}`}
                      onClick={() => trackLandingCta(plan.trackingLocation, "whatsapp")}
                    >
                      {plan.ctaLabel}
                      <ArrowUpRight size={17} aria-hidden />
                    </a>
                  ) : (
                    <Link
                      href={plan.href}
                      className={`${s.pricingCta} ${
                        isFeatured ? s.pricingCtaPrimary : s.pricingCtaSecondary
                      }`}
                      prefetch={false}
                      onClick={() => trackLandingCta(plan.trackingLocation, "internal")}
                    >
                      {plan.ctaLabel}
                      <ArrowRight size={17} aria-hidden />
                    </Link>
                  )}

                  {plan.benefits ? (
                    <ul className={s.pricingBenefits}>
                      {plan.benefits.map((benefit) => (
                        <li key={benefit}>
                          <CircleCheck size={15} aria-hidden />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>

          <p className={s.pricingFootnote}>
            Precio fundador disponible para los primeros clientes. Se mantiene mientras la
            suscripción siga activa. Precios de referencia en Chile. Al registrarte eliges
            tu país.
          </p>
        </div>
      </section>

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
                >
                  <span>{item.question}</span>
                  {faqOpen === index ? (
                    <X size={16} aria-hidden />
                  ) : (
                    <ArrowUpRight size={16} aria-hidden />
                  )}
                </button>
                <div
                  className={`${s.faqAnswer} ${
                    faqOpen === index ? s.faqAnswerOpen : ""
                  }`}
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
              profesional. Hecho para talleres de Latinoamérica.
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
                Cotizador comercial para talleres de vidrios y aluminio en
                Latinoamérica. Celular, tablet y computador. PDF profesional por
                WhatsApp.
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
            <span>Hecho para terreno · Latinoamérica</span>
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
