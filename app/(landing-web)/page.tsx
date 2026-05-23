"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  ClipboardList,
  Clock3,
  FileText,
  FolderKanban,
  Menu,
  MessageSquareText,
  ShieldCheck,
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
  { href: "#pantallas", label: "Pantallas" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
] as const;

const quickCards = [
  {
    icon: ClipboardList,
    title: "Recibe solicitudes 24/7",
    description:
      "Tu link recibe consultas aunque estes instalando, manejando o descansando.",
  },
  {
    icon: FolderKanban,
    title: "Ordena cada consulta",
    description:
      "Guarda nombre, contacto, tipo de trabajo y estado en un solo panel.",
  },
  {
    icon: FileText,
    title: "Pasa a cotizacion",
    description:
      "Convierte una solicitud real en una cotizacion profesional sin perder el contexto.",
  },
] as const;

const heroTrustItems = [
  "Hecho para el rubro",
  "Listo en minutos",
  "Sin tarjeta",
] as const;

const problemCards = [
  {
    icon: MessageSquareText,
    title: "Mensajes enterrados",
    description:
      "Medidas, fotos y datos del cliente quedan repartidos entre chats, llamadas y notas sueltas.",
    meta: "Audios sin escuchar · fotos sueltas",
  },
  {
    icon: UserRound,
    title: "Clientes sin seguimiento",
    description:
      "No sabes quien esta pendiente, quien ya recibio respuesta o quien necesita cotizacion.",
    meta: "Sin estado · sin recordatorio",
  },
  {
    icon: Clock3,
    title: "Trabajos que se enfrian",
    description:
      "Si te demoras en responder, cliente avanza con otra empresa antes de que lo tomes.",
    meta: "Respuesta tardia · venta perdida",
  },
] as const;

const problemFloats = [
  "Hola, cuanto sale una ventana?",
  "Audio · 0:47",
  "foto_medida_puerta.jpg",
  "Me pasas precio de la mampara con vidrio templado?",
  "1.20 x 0.80 · corredera",
  "0.90 x 2.00 · puerta",
  "Hacen instalacion tambien?",
  "consulta perdida · 11:42",
] as const;

const solutionSteps = [
  {
    step: "01",
    title: "Comparte tu link",
    description:
      "Dejalo en WhatsApp Business, Instagram, Facebook, QR o tarjetas.",
    image: "/ventora-landing-page/minilanding1-crop.png",
    alt: "Link comercial publico para pedir presupuesto desde el celular",
    mediaLabel: "Link comercial",
  },
  {
    step: "02",
    title: "El cliente deja su solicitud",
    description:
      "Nombre, contacto, tipo de trabajo, medidas o descripcion.",
    image: "/ventora-landing-page/minilanding2-crop.png",
    alt: "Formulario donde cliente deja nombre, WhatsApp y tipo de trabajo",
    mediaLabel: "Solicitud",
  },
  {
    step: "03",
    title: "Ventora la ordena y tu respondes",
    description:
      "La consulta queda guardada con estado y datos claros. Desde ahi contactas por WhatsApp o la conviertes en cotizacion.",
    image: "/ventora-landing-page/hero-mitad_processed-crop.png",
    alt: "Solicitud lista para contactar por WhatsApp y crear cotizacion",
    mediaLabel: "Panel de solicitudes",
  },
] as const;

const showcaseCards = [
  {
    title: "Link comercial listo para compartir",
    description:
      "Muestra trabajos, confianza y acceso directo para dejar solicitud sin llamar.",
    image: "/ventora-landing-page/mini-langin-page.png",
    size: "large",
  },
  {
    title: "Solicitudes y estado comercial",
    description:
      "Panel con clientes interesados, avisos y proximos movimientos por hacer.",
    image: "/ventora-landing-page/dashboard.jpeg",
    size: "medium",
  },
  {
    title: "Clientes y seguimiento",
    description:
      "Todo ordenado por cliente, contacto y trabajos activos desde el celular.",
    image: "/ventora-landing-page/clientes.png",
    size: "medium",
  },
  {
    title: "Cotizaciones visibles en contexto",
    description:
      "Cuando corresponde, pasas de solicitud a cotizacion sin partir de cero.",
    image: "/ventora-landing-page/dashboard-cotizaciones.png",
    size: "medium",
  },
  {
    title: "Detalle listo para enviar",
    description:
      "Presupuesto claro, profesional y conectado al estado del cliente.",
    image: "/ventora-landing-page/cotizaciones-detalle.png",
    size: "small",
  },
  {
    title: "PDF compartible",
    description:
      "Envia por WhatsApp o comparte archivo listo sin rehacer informacion.",
    image: "/ventora-landing-page/pdf-listo.png",
    size: "small",
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
      const ayuda = String(formData.get("correo") ?? "").trim();
      const mensaje = [
        "Hola Ventora, quiero mi demo.",
        nombre ? `Nombre: ${nombre}` : "",
        negocio ? `Negocio: ${negocio}` : "",
        whatsapp ? `WhatsApp: ${whatsapp}` : "",
        ayuda ? `Necesito ordenar: ${ayuda}` : "",
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
                src="/brand/landingpageblack.svg"
                alt="Ventora"
                width={160}
                height={36}
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
                <p className={s.heroKicker}>Sistema comercial movil para vidrierias y aluminio</p>
              </SectionReveal>

              <SectionReveal>
                <h1 className={s.heroTitle}>
                  Recibe solicitudes
                  <span className={s.heroTitleAccent}>aunque estes ocupado</span>
                </h1>
              </SectionReveal>

              <SectionReveal>
                <p className={s.heroDescription}>
                  Ventora ayuda a empresas de vidrios y aluminio a recibir solicitudes
                  desde un link comercial, ordenarlas en un panel y convertirlas en
                  cotizaciones profesionales sin depender del desorden de WhatsApp.
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
                  <Link
                    href="#contacto"
                    className={s.secondaryButton}
                    onClick={() => trackLandingCta("hero-crear-link", "internal")}
                  >
                    Crear mi link comercial
                  </Link>
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
              <div className={s.problemBackdropTrace} />
              {problemFloats.map((item, index) => (
                <span
                  key={item}
                  className={`${s.problemFloat} ${s[`problemFloat${index + 1}`]}`}
                >
                  {item}
                </span>
              ))}
            </div>

            <SectionReveal>
              <div className={s.problemIntro}>
                <SectionHeading
                  label="EL PROBLEMA NO ES SOLO COTIZAR"
                  title="Estas perdiendo clientes antes de alcanzar a responder."
                  description="Cuando las consultas llegan por WhatsApp, llamadas o redes sociales, es facil que se pierdan entre audios, fotos y mensajes. Y si respondes tarde, el cliente ya pidio precio en otro lado."
                />
              </div>
            </SectionReveal>

            <div className={s.problemGrid}>
              {problemCards.map((item) => (
                <SectionReveal key={item.title}>
                  <article className={s.problemCard}>
                    <div className={s.iconChip}>
                      <item.icon size={20} strokeWidth={1.9} />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <span className={s.problemMeta}>{item.meta}</span>
                  </article>
                </SectionReveal>
              ))}
            </div>
          </div>
      </section>

      <section id="solucion" className={s.solutionSection}>
        <div className={s.container}>
          <SectionReveal className={s.solutionHeadingWrap}>
            <div className={s.solutionHeading}>
              <SectionHeading
                title="Convierte consultas sueltas en solicitudes listas para responder."
                description="Comparte tu link, recibe la informacion ordenada y responde desde un solo panel."
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

      <section id="pantallas" className={s.showcaseSection}>
        <div className={s.container}>
          <SectionReveal>
            <SectionHeading
              title="Todo el flujo comercial en pantallas reales."
              description="Desde solicitud inicial hasta cliente, cotizacion y PDF final. Todo conectado y entendible desde celular."
            />
          </SectionReveal>

          <div className={s.showcaseGrid}>
            {showcaseCards.map((item) => (
              <SectionReveal key={item.title}>
                <article
                  className={`${s.showcaseCard} ${
                    item.size === "large"
                      ? s.showcaseLarge
                      : item.size === "medium"
                        ? s.showcaseMedium
                        : s.showcaseSmall
                  }`}
                >
                  <div className={s.showcaseImage}>
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={1365}
                      height={768}
                      unoptimized
                      sizes="(max-width: 960px) 100vw, 40vw"
                    />
                  </div>
                  <div className={s.showcaseCopy}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              </SectionReveal>
            ))}
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
                title="Empieza a recibir solicitudes sin perder clientes."
                description="Usa Ventora para ordenar consultas, responder mejor y cerrar mas trabajos sin vivir atrapado en WhatsApp."
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
                <Link
                  href="#contacto"
                  className={s.secondaryButton}
                  onClick={() => trackLandingCta("contacto-configurar-link", "internal")}
                >
                  Configurar mi link comercial
                </Link>
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
                <p>Te mostramos flujo real y como quedaria en tu negocio.</p>
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

                <label className={s.field}>
                  <span>Que necesitas ordenar primero?</span>
                  <input
                    type="text"
                    name="correo"
                    placeholder="Ej: solicitudes por WhatsApp, seguimiento o cotizaciones"
                    onFocus={trackLandingFormStart}
                  />
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
                src="/brand/landingpageblack.svg"
                alt="Ventora"
                width={152}
                height={34}
              />
              <p>
                Software comercial para empresas de vidrios y aluminio que ayuda a
                recibir solicitudes, ordenarlas y cerrar mas trabajos.
              </p>
            </div>

            <div className={s.footerLinks}>
              <a href="#top">Inicio</a>
              <a href="#solucion">Solucion</a>
              <a href="#pantallas">Pantallas</a>
              <a href="#preguntas">Preguntas</a>
              <a href="#contacto">Contacto</a>
            </div>
          </div>

          <div className={s.footerBottom}>
            <span>Hecho para terreno · Chile</span>
            <span>Solicitudes claras · seguimiento simple</span>
            <span>contacto@ventorap.cl</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
