"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  Clock3,
  FileText,
  FolderOpen,
  TrendingUp,
  X,
} from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { faqs, pricingPlans } from "./landing-shared";
import s from "./landing.module.css";

const BenefitsQuickSection = dynamic(
  () =>
    import("@/components/landing/benefits-quick-section").then((mod) => ({
      default: mod.BenefitsQuickSection,
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

const resultMetrics = [
  {
    icon: Clock3,
    value: 90,
    suffix: " min",
    title: "Tiempo ahorrado",
    description: "Menos tiempo armando presupuestos a mano o buscando datos en WhatsApp.",
    detail: "60-90 min al día",
    tooltip:
      "Ventora acorta el camino entre medir, cotizar, generar PDF y enviar al cliente.",
  },
  {
    icon: FileText,
    value: 100,
    suffix: "%",
    title: "PDF profesional",
    description: "Cada presupuesto sale con imagen comercial, listo para enviar.",
    detail: "Sin armar Word a mano",
    tooltip:
      "Generas un PDF claro y consistente desde el celular, sin plantillas rotas.",
  },
  {
    icon: FolderOpen,
    value: 1,
    suffix: " panel",
    title: "Todo ordenado",
    description: "Clientes, cotizaciones y estados en un solo lugar.",
    detail: "Sin perder presupuestos",
    tooltip:
      "Sabes qué quedó pendiente, enviado, aprobado o rechazado sin revisar chats.",
  },
  {
    icon: TrendingUp,
    value: 30,
    suffix: "%",
    title: "Más cierres",
    description: "Responder antes con un presupuesto claro ayuda a cerrar más trabajos.",
    detail: "15-30% más oportunidades",
    tooltip:
      "Al cotizar rápido y hacer seguimiento, se enfría menos trabajo.",
  },
] as const;

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
  label,
  title,
  description,
}: {
  label?: string;
  title: string;
  description: string;
}) {
  return (
    <div className={s.sectionHeading}>
      {label ? <p className={s.sectionLabel}>{label}</p> : null}
      <h2 className={s.sectionTitle}>{title}</h2>
      <p className={s.sectionDescription}>{description}</p>
    </div>
  );
}

function CountUpNumber({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const counterRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = counterRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let frameId = 0;
    const startedAt = performance.now();
    const durationMs = 1200;

    const tick = (currentTime: number) => {
      const progress = Math.min((currentTime - startedAt) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isActive, value]);

  return (
    <span ref={counterRef}>
      {displayValue}
      {suffix}
    </span>
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
<BenefitsQuickSection />

      <ProblemFlowSection />

      <QuoteFlowSection />

      <PublicLinkSection />

      <section id="resultados" className={s.resultsSection}>
        <div className={s.container}>
          <SectionReveal>
            <SectionHeading
              label="RESULTADOS QUE IMPORTAN"
              title="Haz presupuestos profesionales sin perder tiempo"
              description="Valores basados en pruebas piloto y uso real para mostrar el impacto de cotizar mejor desde el celular."
            />
          </SectionReveal>

          <div className={s.resultsLayoutSingle}>
            <div className={s.metricsGrid}>
              {resultMetrics.map((item) => {
                const Icon = item.icon;

                return (
                  <SectionReveal key={item.title}>
                    <article
                      className={s.metricCard}
                      tabIndex={0}
                      aria-label={`${item.title}: ${item.tooltip}`}
                    >
                      <div className={s.metricTop}>
                        <span className={s.metricIcon} title={item.tooltip}>
                          <Icon size={20} strokeWidth={2.1} aria-hidden />
                        </span>
                        <span className={s.metricDetail}>{item.detail}</span>
                      </div>

                      <strong className={s.metricValue} title={item.tooltip}>
                        <CountUpNumber value={item.value} suffix={item.suffix} />
                      </strong>

                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <span className={s.metricTooltip}>{item.tooltip}</span>
                    </article>
                  </SectionReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className={s.pricingSection}>
        <div className={s.container}>
          <SectionReveal>
            <div className={s.pricingIntro}>
              <div className={s.pricingHeader}>
                <SectionHeading
                  title="Parte 7 días gratis con Ventora"
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
                <SectionReveal
                  key={plan.name}
                  className={`${s.pricingReveal} ${
                    plan.tone === "anchor" ? s.pricingRevealAnchor : ""
                  }`}
                >
                  <article className={`${s.pricingCard} ${cardToneClass}`}>
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
                </SectionReveal>
              );
            })}
          </div>

          <SectionReveal>
            <p className={s.pricingFootnote}>
              Precio fundador disponible para los primeros clientes. Se mantiene mientras la
              suscripción siga activa.
            </p>
          </SectionReveal>
        </div>
      </section>

      <section id="preguntas" className={s.faqSection}>
        <div className={s.container}>
          <SectionReveal>
            <SectionHeading
              title="Preguntas frecuentes"
              description="Respuestas cortas para entender rápido dónde encaja Ventora en tu forma de trabajar."
            />
          </SectionReveal>

          <div className={s.faqList}>
            {faqs.map((item, index) => (
              <SectionReveal key={item.question}>
                <article className={s.faqItem}>
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
              </SectionReveal>
            ))}
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
                Cotizador comercial para empresas de vidrios y aluminio. Crea
                presupuestos profesionales, envía por WhatsApp y mantén clientes
                ordenados desde el celular.
              </p>
            </div>

            <div className={s.footerLinks}>
              <a href="#top">Inicio</a>
              <a href="#solucion">Flujo</a>
              <a href="#captacion">Link público</a>
              <a href="#preguntas">Preguntas</a>
              <a href="#contacto">Contacto</a>
            </div>
          </div>

          <div className={s.footerBottom}>
            <span>Hecho para terreno - Chile</span>
            <span>Cotiza rápido · PDF profesional · WhatsApp</span>
            <span>ventora.cl@gmail.com</span>
            <Link href="/privacy">Privacidad</Link>
            <Link href="/terms">Términos</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
