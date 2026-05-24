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
  BarChart3,
  CircleCheck,
  ClipboardList,
  Clock3,
  FileText,
  FolderKanban,
  FolderOpen,
  Menu,
  MessageSquareText,
  ShieldCheck,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";
import s from "./landing.module.css";

const WHATSAPP_LANDING_HREF =
  "https://wa.me/56977338906?text=Hola%20Ventora%2C%20quiero%20mi%20demo.";

const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#solucion", label: "Solucion" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#resultados", label: "Resultados" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
] as const;

const quickCards = [
  {
    icon: ClipboardList,
    title: "Captura oportunidades 24/7",
    description:
      "Tu vitrina comercial sigue recibiendo consultas mientras estas en obra, instalando o fuera de horario.",
  },
  {
    icon: FolderKanban,
    title: "Ordena cada oportunidad",
    description:
      "Cada solicitud entra con contexto, contacto y siguiente paso dentro de un solo panel.",
  },
  {
    icon: FileText,
    title: "Responde y cotiza mejor",
    description:
      "Cuando el cliente esta listo, pasas a cotizacion profesional sin rehacer informacion.",
  },
] as const;

const heroTrustItems = [
  "Hecho para maestros y talleres",
  "Recibe por WhatsApp",
  "Responde mas rapido",
] as const;

const problemCards = [
  {
    icon: MessageSquareText,
    title: "Mensajes sin estructura",
    description:
      "Medidas, fotos y datos del cliente quedan repartidos entre chats, llamadas y notas sueltas.",
    meta: "Audios, fotos y medidas dispersas",
  },
  {
    icon: UserRound,
    title: "Seguimiento inconsistente",
    description:
      "No siempre queda claro quien espera respuesta, quien ya esta tibio o quien necesita cotizacion.",
    meta: "Sin estado claro ni prioridad",
  },
  {
    icon: Clock3,
    title: "Proyectos que se enfrian",
    description:
      "Cuando respondes tarde, el cliente ya comparo, avanzo o cerro con otra empresa.",
    meta: "Tiempo lento, cierre perdido",
  },
] as const;

const solutionSteps = [
  {
    step: "01",
    title: "Publica tu vitrina comercial",
    description:
      "Pon tu link en WhatsApp Business, Instagram, QR, catalogos o tarjetas y deja una presencia mas seria.",
    image: "/ventora-landing-page/minilanding1-crop.png",
    alt: "Link comercial publico para pedir presupuesto desde el celular",
    mediaLabel: "Presencia",
  },
  {
    step: "02",
    title: "El cliente deja el proyecto claro",
    description:
      "Recibes nombre, contacto, tipo de trabajo, medidas y descripcion desde una experiencia simple en celular.",
    image: "/ventora-landing-page/minilanding2-crop.png",
    alt: "Formulario donde cliente deja nombre, WhatsApp y tipo de trabajo",
    mediaLabel: "Solicitud",
  },
  {
    step: "03",
    title: "Tu equipo responde con contexto",
    description:
      "La consulta queda priorizada con estado y datos claros. Desde ahi haces seguimiento por WhatsApp o la conviertes en cotizacion.",
    image: "/ventora-landing-page/hero-mitad_processed-crop.png",
    alt: "Solicitud lista para contactar por WhatsApp y crear cotizacion",
    mediaLabel: "Seguimiento",
  },
] as const;

const resultMetrics = [
  {
    icon: Clock3,
    value: 90,
    suffix: " min",
    title: "Tiempo ahorrado",
    description: "Menos tiempo perdido entre WhatsApp, seguimientos y presupuestos.",
    detail: "60-90 min al dia",
    tooltip:
      "Ventora ordena consultas, respuestas y seguimientos para que avances mas rapido.",
  },
  {
    icon: TrendingUp,
    value: 30,
    suffix: "%",
    title: "Mas cierres",
    description: "Un embudo mas claro ayuda a cerrar mas trabajos.",
    detail: "15-30% mas oportunidades",
    tooltip:
      "Al responder antes y hacer mejor seguimiento, se enfria menos trabajo.",
  },
  {
    icon: FolderOpen,
    value: 1,
    suffix: " panel",
    title: "Todo ordenado",
    description: "Solicitudes, clientes y cotizaciones en un solo lugar.",
    detail: "mas seriedad al responder",
    tooltip:
      "Tu cliente recibe informacion mas clara y tu equipo trabaja con menos desorden.",
  },
  {
    icon: BarChart3,
    value: 4,
    suffix: " canales",
    title: "Canales medidos",
    description: "Descubres por donde te llegan mas clientes para invertir mejor.",
    detail: "WhatsApp, Instagram, Facebook y QR",
    tooltip:
      "Ventora te muestra desde que canal llega cada consulta para que no gastes a ciegas.",
  },
] as const;

const channelInsights = [
  {
    name: "WhatsApp",
    value: 46,
    color: "#1E88FF",
    note: "Canal mas directo para consultas listas para responder.",
  },
  {
    name: "Instagram",
    value: 28,
    color: "#58A6FF",
    note: "Atrae clientes que llegan por fotos, trabajos y vitrina visual.",
  },
  {
    name: "Facebook",
    value: 17,
    color: "#8BC2FF",
    note: "Sigue empujando consultas en comunas y grupos locales.",
  },
  {
    name: "QR y otros",
    value: 9,
    color: "#D9E8FF",
    note: "Buen apoyo para ferias, tarjetas y visitas a terreno.",
  },
] as const;

const faqs = [
  {
    question: "Ventora reemplaza mi WhatsApp?",
    answer:
      "No. Ventora complementa WhatsApp: captura solicitudes ordenadas y despues puedes responder o enviar cotizacion por WhatsApp.",
  },
  {
    question: "Puedo poner link en Instagram o WhatsApp Business?",
    answer:
      "Si. Puedes usarlo en perfil, biografia, campanas, QR o mensajes automaticos.",
  },
  {
    question: "Sirve si trabajo solo?",
    answer:
      "Si. Justamente ayuda a no perder clientes cuando estas en terreno o ocupado en instalacion.",
  },
  {
    question: "Ventora calcula precios automaticamente?",
    answer:
      "No es motor tecnico de precios. Te ayuda a capturar solicitudes, ordenarlas y convertirlas en cotizaciones profesionales.",
  },
  {
    question: "Cliente necesita instalar algo?",
    answer:
      "No. Cliente entra desde un link, deja solicitud y tu sigues trabajo desde panel.",
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
  const [selectedChannel, setSelectedChannel] = useState<
    (typeof channelInsights)[number]["name"]
  >(channelInsights[0].name);
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

  const activeChannel =
    channelInsights.find((channel) => channel.name === selectedChannel) ??
    channelInsights[0];

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
      const mensaje = [
        "Hola Ventora, quiero mi demo.",
        nombre ? `Nombre: ${nombre}` : "",
        negocio ? `Negocio: ${negocio}` : "",
        whatsapp ? `WhatsApp: ${whatsapp}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const href = `https://wa.me/56977338906?text=${encodeURIComponent(mensaje)}`;

      googleTagService.trackFormSubmitIntent({
        formName: "landing-demo",
        source: "landing",
      });
      trackLandingCta("formulario-demo", "whatsapp");
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
                Probar demo
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
                aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
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
          aria-label="Menu"
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
                  Captura solicitudes
                  <span className={s.heroTitleAccent}>sin perder clientes</span>
                </h1>
              </SectionReveal>

              <SectionReveal>
                <p className={s.heroDescription}>
                  Recibe consultas, ordenalas y cotiza profesionalmente desde un solo lugar.
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
                    Probar demo
                    <ArrowRight size={18} aria-hidden />
                  </Link>
                  <a
                    href={WHATSAPP_LANDING_HREF}
                    className={s.secondaryButton}
                    onClick={() => trackLandingCta("hero-whatsapp", "whatsapp")}
                  >
                    Hablar por WhatsApp
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
                <div className={s.heroMockupPrimary}>
                  <div className={s.heroMockupViewport}>
                    <Image
                      src="/ventora-landing-page/hero-mitad_processed-crop.png"
                      alt="Pantalla de solicitudes con Hernan Gomez, estado nueva, boton de WhatsApp y crear cotizacion"
                      width={837}
                      height={1409}
                      unoptimized
                      priority
                      sizes="(max-width: 640px) 286px, (max-width: 1080px) 404px, 468px"
                    />
                  </div>
                </div>
              </div>
            </SectionReveal>
          </div>

          <SectionReveal>
            <div className={s.quickGrid}>
              {quickCards.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.title} className={s.quickCard}>
                    <span className={s.quickIcon}>
                      <Icon size={18} aria-hidden />
                    </span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </article>
                );
              })}
            </div>
          </SectionReveal>
        </div>
      </section>

      <section id="problema" className={s.problemSection}>
          <div className={s.container}>
            <div className={s.problemBackdrop} aria-hidden="true">
              <div className={s.problemBackdropGrid} />
              <div className={s.problemBackdropGlow} />
            </div>

            <SectionReveal>
              <div className={s.problemIntro}>
                <SectionHeading
                  label="EL PROBLEMA NO ES SOLO COTIZAR"
                  title="El desorden comercial te hace ver menos serio de lo que realmente eres."
                  description="Cuando las consultas llegan por WhatsApp, llamadas y redes sociales, todo compite contra tu tiempo. Si no capturas bien al cliente desde el principio, el seguimiento se enfria antes de la cotizacion."
                />
              </div>
            </SectionReveal>

            <div className={s.problemSplit}>
              <SectionReveal className={s.problemVisualWrap}>
                <article className={s.problemVisualCard}>
                  <div className={s.problemVisualMedia}>
                    <Image
                      src="/brand/landing-problema-scene.png"
                      alt="Encargado comercial revisando solicitudes y planos en un entorno premium de vidrio y aluminio"
                      width={1680}
                      height={945}
                      sizes="(max-width: 900px) 100vw, 44vw"
                    />
                  </div>

                  <div className={s.problemVisualBody}>
                    <span className={s.problemVisualEyebrow}>Lo que hoy te frena</span>
                    <strong>
                      La oportunidad no se pierde por falta de trabajo. Se pierde por
                      falta de estructura al momento de captarla.
                    </strong>
                    <p>
                      Ventora entra antes de la cotizacion: ordena la entrada,
                      clarifica el seguimiento y le da mas peso a tu marca.
                    </p>
                  </div>
                </article>
              </SectionReveal>

              <div className={s.problemGrid}>
                {problemCards.map((item) => (
                  <SectionReveal key={item.title}>
                    <article className={s.problemCard}>
                      <div className={s.iconChip}>
                        <item.icon size={20} strokeWidth={2.1} />
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <span className={s.problemMeta}>{item.meta}</span>
                    </article>
                  </SectionReveal>
                ))}
              </div>
            </div>
          </div>
      </section>

      <section id="solucion" className={s.solutionSection}>
        <div className={s.container}>
          <SectionReveal className={s.solutionHeadingWrap}>
            <div className={s.solutionHeading}>
              <SectionHeading
                title="Un flujo comercial claro desde el primer contacto."
                description="Tu cliente ve una presencia premium, deja el proyecto ordenado y tu equipo responde con contexto desde una sola experiencia."
              />
            </div>
          </SectionReveal>

          <div className={s.solutionFlowGrid}>
            {solutionSteps.map((item) => (
              <SectionReveal key={item.step}>
                <article className={s.solutionFlowCard}>
                  <div className={s.solutionFlowTop}>
                    <span className={s.solutionFlowBadge}>{item.step}</span>
                    <span className={s.solutionFlowTag}>{item.mediaLabel}</span>
                  </div>

                  <div
                    className={`${s.solutionFlowMedia} ${
                      item.step === "03" ? s.solutionFlowMediaPanel : ""
                    }`}
                  >
                    <Image
                      src={item.image}
                      alt={item.alt}
                      width={item.step === "03" ? 837 : 1000}
                      height={item.step === "03" ? 1409 : 750}
                      unoptimized
                      sizes="(max-width: 900px) 100vw, 31vw"
                    />
                  </div>

                  <div className={s.solutionFlowBody}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="resultados" className={s.resultsSection}>
        <div className={s.container}>
          <SectionReveal>
            <SectionHeading
              label="RESULTADOS QUE IMPORTAN"
              title="Resultados que puedes medir"
              description="Valores basados en pruebas piloto y uso real para mostrar el impacto de Ventora en el dia a dia."
            />
          </SectionReveal>

          <div className={s.resultsLayout}>
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

            <SectionReveal className={s.channelsCard}>
              <div className={s.channelsHeader}>
                <div>
                  <p className={s.channelsEyebrow}>Visibilidad de canales</p>
                  <h3>De que red social te cotizan mas</h3>
                </div>
                <strong className={s.channelsLeadValue}>{activeChannel.value}%</strong>
              </div>

              <p className={s.channelsDescription}>
                Mira de donde vienen mas clientes y enfoca mejor tu esfuerzo.
              </p>

              <div className={s.channelBars} role="list" aria-label="Clientes por canal">
                {channelInsights.map((channel) => {
                  const isActive = channel.name === activeChannel.name;

                  return (
                    <button
                      key={channel.name}
                      type="button"
                      className={`${s.channelBarButton} ${isActive ? s.channelBarButtonActive : ""}`}
                      onClick={() => setSelectedChannel(channel.name)}
                      onMouseEnter={() => setSelectedChannel(channel.name)}
                      title={channel.note}
                    >
                      <span className={s.channelBarLabelRow}>
                        <span>{channel.name}</span>
                        <span>{channel.value}%</span>
                      </span>
                      <span className={s.channelBarTrack}>
                        <span
                          className={s.channelBarFill}
                          style={{
                            width: `${channel.value}%`,
                            background: `linear-gradient(90deg, ${channel.color} 0%, rgba(30, 136, 255, 0.96) 100%)`,
                          }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={s.channelsInsight}>
                <span
                  className={s.channelsInsightDot}
                  style={{ backgroundColor: activeChannel.color }}
                />
                <p>{activeChannel.note}</p>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      <section id="preguntas" className={s.faqSection}>
        <div className={s.container}>
          <SectionReveal>
            <SectionHeading
              title="Preguntas frecuentes"
              description="Respuestas cortas para entender rapido donde encaja Ventora en tu forma de trabajar."
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
                title="Empieza a cotizar con una imagen comercial mucho mas fuerte."
                description="Ventora te ayuda a captar mejor, responder con orden y cerrar mas trabajos sin depender del caos de WhatsApp."
              />

              <div className={s.contactActions}>
                <Link
                  href="/planes"
                  className={s.primaryButton}
                  prefetch={false}
                  onClick={() => trackLandingCta("contacto-probar-demo", "internal")}
                >
                  Probar demo
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <a
                  href={WHATSAPP_LANDING_HREF}
                  className={s.secondaryButton}
                  onClick={() => trackLandingCta("contacto-whatsapp-secundario", "whatsapp")}
                >
                  Hablar por WhatsApp
                </a>
              </div>

              <div className={s.contactProof}>
                <div className={s.proofItem}>
                  <CircleCheck size={18} aria-hidden />
                  <span>Captura solicitudes aunque no puedas contestar al tiro.</span>
                </div>
                <div className={s.proofItem}>
                  <ShieldCheck size={18} aria-hidden />
                  <span>Ordena clientes, presupuestos pendientes y proximos pasos.</span>
                </div>
                <div className={s.proofItem}>
                  <FileText size={18} aria-hidden />
                  <span>Convierte solicitud en cotizacion profesional cuando toque.</span>
                </div>
              </div>
            </SectionReveal>

            <SectionReveal className={s.contactCard}>
              <div className={s.contactCardHeader}>
                <h3>Quiero que me contacten</h3>
                <p>Te mostramos el flujo real y como quedaria en tu negocio.</p>
              </div>

              <form className={s.contactForm} onSubmit={handleContactSubmit}>
                <input type="hidden" name="ayuda" value="demo-comercial" />

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
                      Selecciona una opcion
                    </option>
                    <option value="maestro">Maestro independiente</option>
                    <option value="vidrieria">Vidrieria</option>
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
                Software comercial premium para empresas de vidrios y aluminio que
                ayuda a captar mejor, ordenar el seguimiento y cerrar con mas
                autoridad.
              </p>
            </div>

            <div className={s.footerLinks}>
              <a href="#top">Inicio</a>
              <a href="#solucion">Solucion</a>
              <a href="#resultados">Resultados</a>
              <a href="#preguntas">Preguntas</a>
              <a href="#contacto">Contacto</a>
            </div>
          </div>

          <div className={s.footerBottom}>
            <span>Hecho para terreno - Chile</span>
            <span>Solicitudes claras - seguimiento simple</span>
            <span>ventora.cl@gmail.com</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
