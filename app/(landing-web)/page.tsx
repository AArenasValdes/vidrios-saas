"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  Clock3,
  FileText,
  FolderOpen,
  Menu,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";

import { BenefitsQuickSection } from "@/components/landing/benefits-quick-section";
import { HeroPhoneMockup } from "@/components/landing/hero-phone-mockup";
import { ProblemFlowSection } from "@/components/landing/problem-flow-section";
import { PublicLinkSection } from "@/components/landing/public-link-section";
import { QuoteFlowSection } from "@/components/landing/quote-flow-section";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { BILLING_PLANS } from "@/features/billing/types/plans";
import s from "./landing.module.css";

const WHATSAPP_LANDING_HREF =
  "https://wa.me/56977338906?text=Hola%20Ventora%2C%20quiero%20mi%20demo.";

const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#solucion", label: "Flujo" },
  { href: "#captacion", label: "Link público" },
  { href: "#precios", label: "Precios" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
] as const;

const heroTrustItems = [
  "PDF profesional",
  "Envío por WhatsApp",
  "Clientes ordenados",
  "Link público opcional",
] as const;

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

const PRICING_IMPLEMENTATION_HREF = `https://wa.me/56977338906?text=${encodeURIComponent(
  "Hola Ventora, quiero solicitar implementación acompañada para mi empresa.",
)}`;

const founderPlanBenefits = [
  "Todo lo del cotizador",
  "Página pública para recibir solicitudes",
  "Bandeja de solicitudes centralizada",
  "Links por canal y QR",
  "Seguimiento comercial completo",
  "PDF con imagen comercial",
  "Link público para revisión del presupuesto",
  "Aprobación o rechazo del cliente",
  "Configuración inicial incluida",
  "Soporte de arranque por WhatsApp",
] as const;

const monthlyPlanBenefits = [
  "Incluye cotizador y página pública completa",
  "Pago mensual flexible",
  "7 días gratis",
  "Puedes pasar al anual cuando quieras",
] as const;

const quoteOnlyPlanBenefits = [
  "Cotizador desde el celular",
  "PDF profesional",
  "Envío por WhatsApp",
  "Clientes y cotizaciones ordenadas",
  "Ideal si no necesitas página pública todavía",
] as const;

const accompaniedPlanBenefits = [
  "Todo lo del Plan Fundador",
  "Configuración asistida completa",
  "Revisión de tu página pública",
  "Capacitación inicial",
  "Soporte prioritario de arranque",
] as const;

type PricingPlanTone = "secondary" | "featured" | "highlight" | "anchor";
type PricingPlanCtaKind = "internal" | "whatsapp";

type PricingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  ctaLabel: string;
  href: string;
  ctaKind: PricingPlanCtaKind;
  tone: PricingPlanTone;
  trackingLocation: string;
  badge?: string;
  helper?: string;
  savings?: string;
  benefits?: readonly string[];
};

function CLP(value: number) {
  return `$${value.toLocaleString("es-CL")}`;
}

const monthlyPrice = BILLING_PLANS.founder_monthly.amountClp;
const yearlyPrice = BILLING_PLANS.founder_full_annual.amountClp;
const quoteOnlyPrice = BILLING_PLANS.quote_only_annual.amountClp;
const yearlyEquivalentMonthlyPrice = Math.round(yearlyPrice / 12);
const annualSavingsVsMonthly = monthlyPrice * 12 - yearlyPrice;

const pricingPlans: readonly PricingPlan[] = [
  {
    name: "Plan Fundador Anual",
    price: CLP(yearlyPrice),
    period: "/ año",
    description: `Equivale a ${CLP(yearlyEquivalentMonthlyPrice)} al mes`,
    ctaLabel: "Empezar 7 días gratis",
    href: "/planes",
    ctaKind: "internal",
    tone: "featured",
    trackingLocation: "precios-fundador",
    badge: "Recomendado",
    helper: "Cotizador completo más página pública y solicitudes.",
    savings: `Ahorras ${CLP(annualSavingsVsMonthly)} al año frente al pago mensual`,
    benefits: founderPlanBenefits,
  },
  {
    name: "Solo Cotización Anual",
    price: CLP(quoteOnlyPrice),
    period: "/ año",
    description: "Entrada simple para cotizar y enviar presupuestos profesionales.",
    ctaLabel: "Probar cotizador gratis",
    href: "/planes",
    ctaKind: "internal",
    tone: "highlight",
    trackingLocation: "precios-solo-cotizacion",
    helper: "Ideal para quien no necesita página pública todavía.",
    benefits: quoteOnlyPlanBenefits,
  },
  {
    name: "Plan Mensual",
    price: CLP(monthlyPrice),
    period: "/ mes",
    description: "Opción flexible mes a mes con Ventora completo, sin compromiso anual.",
    ctaLabel: "Probar 7 días gratis",
    href: "/planes",
    ctaKind: "internal",
    tone: "secondary",
    trackingLocation: "precios-mensual",
    benefits: monthlyPlanBenefits,
  },
  {
    name: "Plan Empresa Acompañado",
    price: "Desde $250.000",
    period: "/ año",
    description:
      "Para empresas que necesitan configuración asistida, capacitación y soporte de arranque.",
    ctaLabel: "Solicitar implementación",
    href: PRICING_IMPLEMENTATION_HREF,
    ctaKind: "whatsapp",
    tone: "anchor",
    trackingLocation: "precios-implementacion",
    benefits: accompaniedPlanBenefits,
  },
] as const;

const faqs = [
  {
    question: "¿Ventora reemplaza mi WhatsApp?",
    answer:
      "No. Ventora te ayuda a cotizar, generar PDF y enviar presupuestos por WhatsApp. También puedes recibir solicitudes con tu link público si lo activas.",
  },
  {
    question: "¿Sirve si trabajo solo?",
    answer:
      "Sí. Cotiza desde el celular, envía presupuestos profesionales y mantén clientes ordenados aunque trabajes solo en terreno o taller.",
  },
  {
    question: "¿Ventora calcula precios automáticamente?",
    answer:
      "No es motor técnico de perfilería. Te ayuda a armar cotizaciones comerciales con medidas, valores, PDF profesional y seguimiento.",
  },
  {
    question: "¿Necesito la página pública para usar Ventora?",
    answer:
      "No. Puedes empezar solo con el cotizador. La página pública es un complemento para captar solicitudes cuando no puedes responder.",
  },
  {
    question: "¿El cliente necesita instalar algo?",
    answer:
      "No. Recibe el PDF por WhatsApp o revisa el presupuesto desde un link público.",
  },
] as const;

function SectionReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
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

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactFeedback, setContactFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const hasStartedContactFormRef = useRef(false);

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

  function trackLandingFormStart() {
    if (hasStartedContactFormRef.current) {
      return;
    }

    hasStartedContactFormRef.current = true;
    googleTagService.trackFormStart({
      formName: "landing-demo",
      source: "landing",
    });
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingContact) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmittingContact(true);
    setContactFeedback(null);

    try {
      const nombre = String(formData.get("nombre") ?? "").trim();
      const negocio = String(formData.get("empresa") ?? "").trim();
      const whatsapp = String(formData.get("telefono") ?? "").trim();
      const ayuda = String(formData.get("ayuda") ?? "demo").trim();
      const mensaje = [
        "Hola, quiero un piloto de Ventora para mi empresa.",
        nombre ? `Nombre: ${nombre}` : "",
        negocio ? `Tipo de negocio: ${negocio}` : "",
        whatsapp ? `WhatsApp: ${whatsapp}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const href = `https://wa.me/56977338906?text=${encodeURIComponent(mensaje)}`;

      const response = await fetch("/api/solicitudes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          empresa: negocio,
          correo: "",
          telefono: whatsapp,
          ayuda: ayuda === "cotizacion" || ayuda === "ventas" ? ayuda : "demo",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos guardar tus datos.");
      }

      googleTagService.trackFormSubmitIntent({
        formName: "landing-demo",
        source: "landing",
      });
      trackLandingCta("formulario-demo", "whatsapp");
      setContactFeedback({
        kind: "success",
        message: "Datos guardados. Abrimos WhatsApp para coordinar tu piloto.",
      });
      window.location.href = href;
    } catch (error) {
      setContactFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos enviar tu solicitud. Intenta nuevamente.",
      });
    } finally {
      setIsSubmittingContact(false);
    }
  }

  return (
    <main className={s.page}>
      <nav className={s.navbar} aria-label="Principal">
        <div className={s.container}>
          <div className={s.navbarInner}>
            <a href="#top" className={s.navLogo} aria-label="Ventora inicio">
              <img
                src="/brand/ventora-logo-premium-dark.svg"
                alt="Ventora"
                width={184}
                height={42}
                className={s.wordmark}
              />
            </a>

            <ul className={s.navLinks}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>

            <div className={s.navActions}>
              <a
                href={WHATSAPP_LANDING_HREF}
                className={s.navGhost}
                onClick={() => trackLandingCta("nav-whatsapp", "whatsapp")}
              >
                Hablar por WhatsApp
              </a>
              <Link
                href="/planes"
                className={s.navPrimary}
                prefetch={false}
                onClick={() => trackLandingCta("nav-probar-demo", "internal")}
              >
                Probar cotizador
              </Link>
            </div>

            <div className={s.navMobile}>
              <Link
                href="/planes"
                className={s.navPrimaryMobile}
                prefetch={false}
                onClick={() => trackLandingCta("mobile-probar-demo", "internal")}
              >
                Demo
              </Link>
              <button
                type="button"
                className={s.menuButton}
                onClick={() => setMenuOpen((current) => !current)}
                aria-expanded={menuOpen}
                aria-controls="landing-mobile-menu"
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id="landing-mobile-menu"
          className={s.mobileMenu}
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
        >
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <a
            href={WHATSAPP_LANDING_HREF}
            onClick={() => {
              trackLandingCta("mobile-menu-whatsapp", "whatsapp");
              setMenuOpen(false);
            }}
          >
            Hablar por WhatsApp
          </a>
        </div>
      ) : null}

      <section id="top" className={s.heroSection}>
        <div className={s.heroHalo} aria-hidden />
        <div className={s.container}>
          <div className={s.heroLayout}>
            <div className={s.heroContent}>
              <SectionReveal>
                <p className={s.heroKicker}>Ventora para vidrio y aluminio</p>
              </SectionReveal>

              <SectionReveal>
                <h1 className={s.heroTitle}>
                  Cotiza vidrios y aluminio
                  <span className={s.heroTitleAccent}>desde el celular</span>
                </h1>
              </SectionReveal>

              <SectionReveal>
                <p className={s.heroDescription}>
                  Crea presupuestos profesionales, envía PDF por WhatsApp y mantén tus
                  clientes ordenados en un solo lugar.
                </p>
              </SectionReveal>

              <SectionReveal>
                <div className={s.heroActions}>
                  <Link
                    href="/planes"
                    className={s.primaryButton}
                    prefetch={false}
                    onClick={() => trackLandingCta("hero-probar-demo", "internal")}
                  >
                    Probar cotizador gratis
                    <ArrowRight size={18} aria-hidden />
                  </Link>
                  <a
                    href={WHATSAPP_LANDING_HREF}
                    className={s.secondaryButton}
                    onClick={() => trackLandingCta("hero-whatsapp", "whatsapp")}
                  >
                    Ver demo por WhatsApp
                  </a>
                </div>
              </SectionReveal>

              <SectionReveal>
                <div className={s.heroTrust}>
                  {heroTrustItems.map((item) => (
                    <span key={item} className={s.heroTrustItem}>
                      {item}
                    </span>
                  ))}
                </div>
              </SectionReveal>
            </div>

            <SectionReveal className={s.heroVisual}>
              <div className={s.heroVisualShell}>
                <HeroPhoneMockup />
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

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
            <div className={s.pricingHeader}>
              <SectionHeading
                title="Planes simples para cotizar mejor y no perder clientes"
                description="Prueba Ventora 7 días gratis. Empieza solo con el cotizador o suma página pública cuando la necesites."
              />
              <p className={s.pricingValueLine}>
                Si pierdes una sola cotización por responder tarde, probablemente ya perdiste más
                que el valor anual de Ventora.
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

      <section id="contacto" className={s.contactSection}>
        <div className={s.container}>
          <div className={s.contactLayout}>
            <SectionReveal className={s.contactIntro}>
              <SectionHeading
                title="Empieza a cotizar con presupuestos más profesionales."
                description="Ventora te ayuda a crear PDF, enviar por WhatsApp y mantener clientes ordenados sin depender del caos del chat."
              />

              <div className={s.contactActions}>
                <Link
                  href="/planes"
                  className={s.primaryButton}
                  prefetch={false}
                  onClick={() => trackLandingCta("contacto-probar-demo", "internal")}
                >
                  Probar cotizador gratis
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <a
                  href={WHATSAPP_LANDING_HREF}
                  className={s.secondaryButton}
                  onClick={() => trackLandingCta("contacto-whatsapp-secundario", "whatsapp")}
                >
                  Ver demo por WhatsApp
                </a>
              </div>

              <div className={s.contactProof}>
                <div className={s.proofItem}>
                  <CircleCheck size={18} aria-hidden />
                  <span>Cotiza desde el celular y envía PDF profesional al tiro.</span>
                </div>
                <div className={s.proofItem}>
                  <ShieldCheck size={18} aria-hidden />
                  <span>Clientes, presupuestos y estados quedan ordenados.</span>
                </div>
                <div className={s.proofItem}>
                  <FileText size={18} aria-hidden />
                  <span>Tu página pública queda como complemento para captar solicitudes.</span>
                </div>
              </div>
            </SectionReveal>

            <SectionReveal className={s.contactCard}>
              <div className={s.contactCardHeader}>
                <h3>Quiero que me contacten</h3>
                <p>Te mostramos el flujo real y cómo quedaría en tu negocio.</p>
              </div>

              <form className={s.contactForm} onSubmit={handleContactSubmit}>
                <input type="hidden" name="ayuda" value="demo" />

                <label className={s.field}>
                  <span>Nombre</span>
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Juan Perez"
                    autoComplete="name"
                    onFocus={trackLandingFormStart}
                    required
                  />
                </label>

                <label className={s.field}>
                  <span>WhatsApp</span>
                  <input
                    type="tel"
                    name="telefono"
                    placeholder="+56 9 0000 0000"
                    autoComplete="tel"
                    inputMode="tel"
                    onFocus={trackLandingFormStart}
                    required
                  />
                </label>

                <label className={s.field}>
                  <span>Tipo de negocio</span>
                  <select name="empresa" defaultValue="" onFocus={trackLandingFormStart} required>
                    <option value="" disabled>
                      Selecciona una opción
                    </option>
                    <option value="maestro">Maestro independiente</option>
                    <option value="vidrieria">Vidriería</option>
                    <option value="taller">Taller / empresa</option>
                    <option value="otro">Otro</option>
                  </select>
                </label>

                <button
                  type="submit"
                  className={s.contactSubmit}
                  disabled={isSubmittingContact}
                  aria-busy={isSubmittingContact}
                >
                  {isSubmittingContact ? "Enviando..." : "Quiero mi demo"}
                  <ArrowRight size={18} aria-hidden />
                </button>
              </form>

              {contactFeedback ? (
                <p
                  className={`${s.contactFeedback} ${
                    contactFeedback.kind === "error" ? s.contactFeedbackError : ""
                  }`}
                  role="status"
                >
                  {contactFeedback.message}
                </p>
              ) : null}

              <a
                className={s.contactWhatsapp}
                href={WHATSAPP_LANDING_HREF}
                onClick={() => trackLandingCta("contacto-whatsapp", "whatsapp")}
              >
                Hablar por WhatsApp
              </a>
            </SectionReveal>
          </div>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerLayout}>
            <div className={s.footerBrand}>
              <img
                src="/brand/ventora-logo-premium-dark.svg"
                alt="Ventora"
                width={344}
                height={80}
                className={s.footerBrandLogo}
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
          </div>
        </div>
      </footer>
    </main>
  );
}
