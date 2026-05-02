"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  FaArrowRight,
  FaBars,
  FaPlus,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";

import s from "./landing.module.css";

const WHATSAPP_LANDING_HREF =
  "https://wa.me/56987654321?text=Hola%20Ventora%2C%20quiero%20ver%20c%C3%B3mo%20funciona.";

/** Pon `true` y coloca el archivo en `public/` para usar el mockup real en el hero (misma composición: inclinación, sombra, etiquetas flotantes). */
const LANDING_HERO_USE_REAL_MOCKUP = false;
const LANDING_HERO_MOCKUP_SRC = "/brand/ventora-hero-mockup.webp";
const LANDING_HERO_MOCKUP_WIDTH = 900;
const LANDING_HERO_MOCKUP_HEIGHT = 1100;

const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#funciones", label: "Funciones" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#planes", label: "Planes" },
  { href: "#faq", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
] as const;

const faqs = [
  {
    question: "Sirve si hoy trabajo con precio de proveedor?",
    answer:
      "Si. El flujo esta hecho para ingresar costo proveedor, aplicar margen y salir con un presupuesto comercial claro.",
  },
  {
    question: "Lo puedo usar desde el celular en la obra?",
    answer:
      "Si. La experiencia prioriza contraste, botones grandes y lectura rapida para terreno y uso movil.",
  },
  {
    question: "En que navegador funciona mejor?",
    answer:
      "Chrome o Edge en desktop son la mejor opcion. En iPhone, agrega el acceso desde Safari. Brave no es el navegador recomendado para push.",
  },
  {
    question: "El cliente recibe algo presentable?",
    answer:
      "Si. El sistema genera un PDF profesional con branding y luego lo compartes por WhatsApp o correo.",
  },
  {
    question: "Tengo que aprender algo tecnico?",
    answer:
      "No. Esta pensado para vender mejor y mas rapido, no para obligarte a operar como si fuera software de ingenieria.",
  },
  {
    question: "Puedo enviar por WhatsApp y saber si el cliente respondió?",
    answer:
      "Sí. Envías el PDF o link por WhatsApp y luego ves el estado (enviada, aprobada o rechazada) para no perder el cierre.",
  },
];

function PhoneFrame({
  label,
  children,
  tilt = "right",
}: {
  label: string;
  children: React.ReactNode;
  tilt?: "right" | "none";
}) {
  return (
    <div className={`${s.phoneWrap} ${tilt === "right" ? s.phoneTilt : ""}`}>
      <div className={s.phoneGlow} aria-hidden />
      <div className={s.phoneDevice} aria-label={label}>
        <div className={s.phoneNotch} aria-hidden />
        <div className={s.phoneScreen}>{children}</div>
      </div>
    </div>
  );
}

function ScreenQuote() {
  return (
    <div className={s.screenQuote}>
      <div className={s.screenHeader}>
        <div>
          <span className={s.miniKicker}>Nueva cotización</span>
          <strong className={s.screenTitle}>Constructora Los Andes</strong>
          <p className={s.screenSub}>Las Condes · Edificio Vista Apoquindo</p>
        </div>
        <span className={s.statusPill}>en proceso</span>
      </div>

      <div className={s.screenGrid3}>
        <div className={s.screenChip}>
          <span>Cliente</span>
          <strong>Pedro Araya</strong>
        </div>
        <div className={s.screenChip}>
          <span>Obra</span>
          <strong>Vista Apoquindo</strong>
        </div>
        <div className={s.screenChip}>
          <span>Validez</span>
          <strong>15 días</strong>
        </div>
      </div>

      <div className={s.screenList}>
        <div className={s.screenRow}>
          <div className={s.screenThumb} aria-hidden />
          <div className={s.screenRowBody}>
            <div className={s.screenRowTop}>
              <span className={s.codeTag}>V1</span>
              <strong>Ventana aluminio</strong>
            </div>
            <p>Serie 25 · 1200 × 1500 mm</p>
          </div>
          <div className={s.screenPrice}>
            <span>precio</span>
            <strong>$579.500</strong>
          </div>
        </div>
        <div className={s.screenRow}>
          <div className={`${s.screenThumb} ${s.screenThumbAlt}`} aria-hidden />
          <div className={s.screenRowBody}>
            <div className={s.screenRowTop}>
              <span className={s.codeTag}>S1</span>
              <strong>Shower door</strong>
            </div>
            <p>Templado 8 mm · 800 × 1900 mm</p>
          </div>
          <div className={s.screenPrice}>
            <span>precio</span>
            <strong>$421.800</strong>
          </div>
        </div>
      </div>

      <div className={s.screenTotals}>
        <div>
          <span>Subtotal</span>
          <strong>$1.001.300</strong>
        </div>
        <div>
          <span>IVA</span>
          <strong>$190.247</strong>
        </div>
        <div className={s.totalStrong}>
          <span>Total</span>
          <strong>$1.191.547</strong>
        </div>
      </div>

      <div className={s.screenActions}>
        <span className={s.whatsPill}>
          <FaWhatsapp aria-hidden />
          Enviar por WhatsApp
        </span>
        <span className={s.lightPill}>PDF listo</span>
      </div>
    </div>
  );
}

function ScreenList() {
  return (
    <div className={s.screenSimple}>
      <div className={s.screenSimpleTop}>
        <strong>Clientes</strong>
        <span className={s.badge}>activos</span>
      </div>
      <div className={s.simpleRows}>
        <div className={s.simpleRow}>
          <div>
            <strong>Pedro Araya</strong>
            <p>Las Condes</p>
          </div>
          <span className={s.dot} aria-hidden />
        </div>
        <div className={s.simpleRow}>
          <div>
            <strong>Vidrios San Martín</strong>
            <p>Ñuñoa</p>
          </div>
          <span className={s.dotAlt} aria-hidden />
        </div>
        <div className={s.simpleRow}>
          <div>
            <strong>Constructora Andes</strong>
            <p>Providencia</p>
          </div>
          <span className={s.dot} aria-hidden />
        </div>
      </div>
      <div className={s.simpleFooterHint}>Estado comercial a la vista</div>
    </div>
  );
}

function ScreenApproval() {
  return (
    <div className={s.screenSimple}>
      <div className={s.screenSimpleTop}>
        <strong>Presupuesto</strong>
        <span className={s.badgeOk}>aprobación</span>
      </div>
      <div className={s.approvalCard}>
        <p className={s.approvalLabel}>Total final</p>
        <strong className={s.approvalTotal}>$1.191.547</strong>
        <div className={s.approvalButtons}>
          <span className={s.approveBtn}>Aprobar</span>
          <span className={s.rejectBtn}>Rechazar</span>
        </div>
      </div>
      <div className={s.simpleFooterHint}>El cliente responde desde el link</div>
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
      const response = await fetch("/api/solicitudes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: String(formData.get("nombre") ?? ""),
          empresa: String(formData.get("empresa") ?? ""),
          correo: String(formData.get("correo") ?? ""),
          telefono: String(formData.get("telefono") ?? ""),
          ayuda: String(formData.get("ayuda") ?? ""),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "No pudimos enviar tu solicitud. Intenta nuevamente."
        );
      }

      form.reset();
      setContactFeedback({
        kind: "success",
        message:
          "Solicitud enviada con exito. Te contactaremos a la brevedad.",
      });
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
            <a href="#top" className={s.navLogo} aria-label="Ventora">
              <Image
                src="/brand/ventora-logo-navy.svg"
                alt="Ventora"
                width={197}
                height={44}
                className={s.wordmark}
                priority
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
              <a href={WHATSAPP_LANDING_HREF} className={s.navGhost}>
                Hablar por WhatsApp
              </a>
              <Link href="/planes" className={s.navPrimary} prefetch={false}>
                Probar demo
              </Link>
            </div>

            <div className={s.navMobileCompact}>
              <Link
                href="/planes"
                className={s.navDemoCompact}
                prefetch={false}
                onClick={() => setMenuOpen(false)}
              >
                Probar demo
              </Link>
              <button
                type="button"
                className={s.hamburger}
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="landing-mobile-menu"
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {menuOpen ? <FaTimes aria-hidden /> : <FaBars aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id="landing-mobile-menu"
          className={`${s.mobileMenu} ${s.mobileMenuOpen}`}
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
        >
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <a href={WHATSAPP_LANDING_HREF} className={s.mobileWhatsapp} onClick={() => setMenuOpen(false)}>
            <FaWhatsapp aria-hidden />
            Hablar por WhatsApp
          </a>
        </div>
      ) : null}

      <section id="top" className={s.heroSection}>
        <div className={s.heroBackdrop} aria-hidden />
        <div className={s.container}>
          <div className={s.heroShell}>
            <div className={s.heroCopy}>
              <div className={s.sectionTag}>Software para vidrierías y aluminio en Chile</div>
              <h1 className={s.heroTitle}>
                Cotiza desde el celular y <span>cierra más trabajos</span>
              </h1>
              <p className={s.heroSubtitle}>
                Ventora ayuda a maestros y empresas de vidrio y aluminio a crear cotizaciones profesionales en
                minutos, enviarlas por WhatsApp y ordenar sus clientes sin depender de Excel.
              </p>

              <div className={s.heroActions}>
                <Link href="/planes" className={s.primaryButton} prefetch={false}>
                  Probar demo
                  <FaArrowRight aria-hidden />
                </Link>
                <a className={s.secondaryButton} href={WHATSAPP_LANDING_HREF}>
                  Hablar por WhatsApp
                </a>
              </div>

              <div className={s.quickValue}>
                <div className={s.quickCard}>
                  <strong>Cotizaciones en minutos</strong>
                  <p>Flujo corto, pensado para terreno.</p>
                </div>
                <div className={s.quickCard}>
                  <strong>Menos errores</strong>
                  <p>Totales claros, sin fórmulas rotas.</p>
                </div>
                <div className={s.quickCard}>
                  <strong>WhatsApp directo</strong>
                  <p>Envía PDF o link y sigue el estado.</p>
                </div>
              </div>
            </div>

            <div className={s.heroStage}>
              <div className={s.heroAccent} aria-hidden />
              {LANDING_HERO_USE_REAL_MOCKUP ? (
                <div className={`${s.phoneWrap} ${s.phoneTilt}`}>
                  <div className={s.phoneGlow} aria-hidden />
                  <Image
                    src={LANDING_HERO_MOCKUP_SRC}
                    alt="Ventora en el celular: cotización lista para enviar"
                    width={LANDING_HERO_MOCKUP_WIDTH}
                    height={LANDING_HERO_MOCKUP_HEIGHT}
                    className={s.heroRealMockup}
                    priority
                    sizes="(max-width: 900px) min(92vw, 420px), 420px"
                  />
                </div>
              ) : (
                <PhoneFrame label="Mockup de cotización Ventora">
                  <ScreenQuote />
                </PhoneFrame>
              )}

              <div className={s.floatTags} aria-hidden>
                <span className={s.floatTag}>Cotización lista</span>
                <span className={s.floatTag}>Enviar por WhatsApp</span>
                <span className={s.floatTagStrong}>Total calculado</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="problema" className={s.problemSection}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <p className={s.eyebrow}>El problema no es cotizar</p>
            <h2 className={s.h2}>El problema es cotizar desordenado.</h2>
            <p className={s.lead}>
              Excel, notas sueltas y WhatsApp infinito hacen que se pierdan medidas, cambien costos y el cliente reciba
              algo poco claro.
            </p>
          </div>

          <div className={s.cardGrid3}>
            <article className={s.card}>
              <h3>Excel se rompe o se duplica</h3>
              <p>Archivos distintos, fórmulas rotas y valores que cambian sin control.</p>
            </article>
            <article className={s.card}>
              <h3>Medidas perdidas en WhatsApp</h3>
              <p>La obra queda enterrada entre audios y mensajes. Después nadie encuentra nada.</p>
            </article>
            <article className={s.card}>
              <h3>Presupuestos poco profesionales</h3>
              <p>El cliente no entiende el total, pide aclaraciones y el cierre se enfría.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="funciones" className={s.featuresSection}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <p className={s.eyebrow}>La solución</p>
            <h2 className={s.h2}>Ventora ordena tu proceso comercial desde el celular.</h2>
            <p className={s.lead}>Todo lo necesario para cotizar, enviar y seguir el cierre sin llenar formularios eternos.</p>
          </div>

          <div className={s.featureCards}>
            <article className={s.featureCard}>
              <PhoneFrame label="Crear cotización" tilt="none">
                <ScreenQuote />
              </PhoneFrame>
              <div className={s.featureCopy}>
                <h3>Crear cotización</h3>
                <p>Cliente, obra y componentes en una vista clara.</p>
              </div>
            </article>
            <article className={s.featureCard}>
              <PhoneFrame label="Clientes" tilt="none">
                <ScreenList />
              </PhoneFrame>
              <div className={s.featureCopy}>
                <h3>Clientes y seguimiento</h3>
                <p>Historial simple para no perder oportunidades.</p>
              </div>
            </article>
            <article className={s.featureCard}>
              <PhoneFrame label="Aprobación cliente" tilt="none">
                <ScreenApproval />
              </PhoneFrame>
              <div className={s.featureCopy}>
                <h3>Aprobación por link</h3>
                <p>El cliente revisa y responde desde el celular.</p>
              </div>
            </article>
            <article className={s.featureCard}>
              <div className={s.shareMock}>
                <div className={s.shareTop}>
                  <span className={s.badgeOk}>WhatsApp</span>
                  <strong>Enviar PDF / link</strong>
                </div>
                <div className={s.shareBubble}>
                  <span className={s.shareLabel}>Ventora</span>
                  <p>Te envío la cotización. Total: <strong>$1.191.547</strong></p>
                </div>
                <div className={s.shareFooter}>
                  <span className={s.lightPill}>PDF listo</span>
                  <span className={s.whatsPill}>
                    <FaWhatsapp aria-hidden />
                    Enviar
                  </span>
                </div>
              </div>
              <div className={s.featureCopy}>
                <h3>Salida comercial</h3>
                <p>WhatsApp + PDF profesional, sin pasos extra.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="como-funciona" className={s.processSection}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <p className={s.eyebrow}>Cómo funciona</p>
            <h2 className={s.h2}>De medir a enviar, en pasos simples.</h2>
            <p className={s.lead}>Pensado para maestros: claro, corto y sin navegación pesada.</p>
          </div>

          <div className={s.steps}>
            <article className={s.step}>
              <span className={s.stepNum}>1</span>
              <div>
                <h3>Crea el cliente y la obra</h3>
                <p>Deja el contexto listo sin perder datos.</p>
              </div>
            </article>
            <article className={s.step}>
              <span className={s.stepNum}>2</span>
              <div>
                <h3>Agrega productos y medidas</h3>
                <p>Costos, margen e IVA quedan ordenados.</p>
              </div>
            </article>
            <article className={s.step}>
              <span className={s.stepNum}>3</span>
              <div>
                <h3>Envía por WhatsApp</h3>
                <p>PDF o link público listo para el cliente.</p>
              </div>
            </article>
            <article className={s.step}>
              <span className={s.stepNum}>4</span>
              <div>
                <h3>El cliente aprueba</h3>
                <p>Ves el estado y sigues el cierre.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="planes" className={s.pricingSection}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <p className={s.eyebrow}>Planes</p>
            <h2 className={s.h2}>Empieza con una demo y valida si Ventora te calza.</h2>
            <p className={s.lead}>Sin inventar precios: te mostramos el flujo real y lo conversamos.</p>
          </div>

          <div className={s.pricingGrid}>
            <article className={s.priceCard}>
              <p className={s.priceKicker}>Para maestros</p>
              <h3>Maestro independiente</h3>
              <p className={s.priceText}>Ideal si cotizas en terreno y quieres enviar algo profesional al tiro.</p>
              <ul className={s.bullets}>
                <li>PDF comercial + WhatsApp</li>
                <li>Clientes y seguimiento</li>
                <li>Aprobación por link</li>
              </ul>
              <Link href="/planes" className={s.priceCta} prefetch={false}>
                Probar demo
                <FaArrowRight aria-hidden />
              </Link>
            </article>

            <article className={`${s.priceCard} ${s.priceCardStrong}`}>
              <p className={s.priceKickerStrong}>Recomendado</p>
              <h3>Taller / empresa</h3>
              <p className={s.priceTextStrong}>Para equipos que necesitan orden comercial y control de estados.</p>
              <ul className={s.bulletsStrong}>
                <li>Cotizaciones por pasos, rápido</li>
                <li>Historial y estados por cliente</li>
                <li>PDF con branding + aprobación</li>
              </ul>
              <a
                className={s.priceCtaStrong}
                href="https://wa.me/56987654321?text=Hola%20Ventora%2C%20quiero%20una%20demo%20para%20mi%20taller."
              >
                Solicitar contacto
                <FaWhatsapp aria-hidden />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" className={s.faqSection}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <p className={s.eyebrow}>FAQ</p>
            <h2 className={s.h2}>Todo lo importante, sin ruido.</h2>
            <p className={s.lead}>Respuestas cortas, pensando en terreno.</p>
          </div>

          <div className={s.faqList}>
            {faqs.map((faq, index) => (
              <article key={faq.question} className={s.faqItem}>
                <button
                  type="button"
                  className={s.faqQuestion}
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  aria-expanded={faqOpen === index}
                >
                  <span>{faq.question}</span>
                  <FaPlus className={faqOpen === index ? s.faqIconOpen : s.faqIcon} aria-hidden />
                </button>
                <div className={`${s.faqAnswer} ${faqOpen === index ? s.faqAnswerOpen : ""}`}>
                  <p>{faq.answer}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className={s.ctaSection}>
        <div className={s.container}>
          <div className={s.contactShell}>
            <div className={s.contactCopy}>
              <p className={s.eyebrow}>Contacto</p>
              <h2 className={s.h2}>Te lo mostramos en 10–20 minutos.</h2>
              <p className={s.lead}>Deja tus datos o escríbenos por WhatsApp. Cero spam.</p>

              <div className={s.contactQuick}>
                <a
                  className={s.whatsBig}
                  href="https://wa.me/56987654321?text=Hola%20Ventora%2C%20quiero%20una%20demo."
                >
                  <FaWhatsapp aria-hidden />
                  Hablar por WhatsApp
                </a>
                <Link className={s.secondaryButton} href="/planes" prefetch={false}>
                  Probar demo
                  <FaArrowRight aria-hidden />
                </Link>
              </div>
            </div>

            <div className={s.contactFormShell}>
              <div className={s.contactFormCard}>
                <div className={s.contactFormHeading}>
                  <h3>Quiero que me contacten</h3>
                  <p>Formulario corto, pensado para celular.</p>
                </div>

                <form className={s.contactForm} onSubmit={handleContactSubmit}>
                  <label className={s.contactField}>
                    <span>Nombre</span>
                    <input type="text" name="nombre" placeholder="Juan Pérez" autoComplete="name" required />
                  </label>

                  <label className={s.contactField}>
                    <span>WhatsApp</span>
                    <input
                      type="tel"
                      name="telefono"
                      placeholder="+56 9 0000 0000"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                    />
                  </label>

                  <label className={s.contactField}>
                    <span>Tipo de negocio</span>
                    <select name="empresa" defaultValue="" required>
                      <option value="" disabled>
                        Selecciona una opción
                      </option>
                      <option value="maestro">Maestro independiente</option>
                      <option value="vidrieria">Vidriería</option>
                      <option value="taller">Taller / empresa</option>
                      <option value="otro">Otro</option>
                    </select>
                  </label>

                  <label className={s.contactField}>
                    <span>Mensaje (opcional)</span>
                    <input type="text" name="correo" placeholder="Ej: necesito cotizar shower door y aluminio" />
                  </label>

                  <button type="submit" className={s.contactSubmit} disabled={isSubmittingContact} aria-busy={isSubmittingContact}>
                    {isSubmittingContact ? "Enviando..." : "Enviar"}
                    <FaArrowRight aria-hidden />
                  </button>
                </form>

                {contactFeedback ? (
                  <p
                    className={`${s.contactFeedback} ${contactFeedback.kind === "error" ? s.contactFeedbackError : ""}`}
                    role="status"
                  >
                    {contactFeedback.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerInner}>
            <div className={s.footerBrand}>
              <Image src="/brand/ventora-logo-navy.svg" alt="Ventora" width={170} height={40} />
              <p>
                Software comercial para cotizar trabajos de vidrio y aluminio desde el celular. PDF, WhatsApp y aprobación por link.
              </p>
            </div>

            <div className={s.footerLinks}>
              <a href="#top">Inicio</a>
              <a href="#planes">Demo</a>
              <a href="#contacto">Contacto</a>
              <a href="#faq">FAQ</a>
            </div>
          </div>
          <div className={s.footerBottom}>
            <span>Hecho para terreno · Chile</span>
            <span>Sin tarjeta de crédito</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
