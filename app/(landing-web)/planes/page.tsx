import Link from "next/link";
import { FaArrowRight, FaCheckCircle, FaClock, FaComments, FaPhoneAlt } from "react-icons/fa";

import { TrackedExternalLink } from "@/features/analytics/components/tracked-external-link";
import s from "./page.module.css";

const DEMO_WHATSAPP_HREF = `https://wa.me/56977338906?text=${encodeURIComponent(
  "Hola, quiero un piloto de Ventora para mi empresa."
)}`;

const OPTIONS = [
  {
    name: "Demo guiada",
    description:
      "Para ver el cotizador, PDF y envío por WhatsApp antes de entrar con tu equipo.",
    bullets: [
      "Recorrido del cotizador en 20 minutos",
      "Ejemplos reales de vidrios y aluminio en Chile",
      "Revisión de tu flujo actual de presupuestos",
    ],
    cta: {
      href: DEMO_WHATSAPP_HREF,
      label: "Agendar demo",
      external: true,
    },
    tone: "primary",
  },
  {
    name: "Acceso piloto",
    description:
      "Para maestros y talleres que quieran empezar a cotizar con Ventora desde el celular.",
    bullets: [
      "Cotizador, PDF y WhatsApp incluidos",
      "Acompañamiento de implementación",
      "Feedback directo para ajustes del producto",
    ],
    cta: {
      href: "/registro",
      label: "Solicitar cuenta",
      external: false,
    },
    tone: "secondary",
  },
];

const signals = [
  {
    icon: FaClock,
    title: "Cotiza rápido",
    text: "Arma presupuestos desde el celular en pocos minutos, sin plantillas rotas ni Word a mano.",
  },
  {
    icon: FaComments,
    title: "PDF + WhatsApp",
    text: "Genera un presupuesto profesional y envíalo directo al cliente por WhatsApp.",
  },
  {
    icon: FaPhoneAlt,
    title: "Siguiente paso claro",
    text: "Agenda demo o entra a tu cuenta. Sin formularios eternos ni páginas de pricing vacías.",
  },
];

export default function PlanesPage() {
  return (
    <main className={s.page}>
      <section className={s.hero}>
        <div className={s.container}>
          <div className={s.topbar}>
            <Link href="/" className={s.brand} aria-label="Ventora">
              <img
                src="/brand/ventora-logo-premium-dark.svg"
                alt="Ventora"
                width={212}
                height={48}
                className={s.brandLogo}
              />
            </Link>

            <div className={s.topbarActions}>
              <Link href="/" className={s.linkButton}>
                Volver al inicio
              </Link>
              <Link href="/login" className={s.ghostButton}>
                Ingresar
              </Link>
            </div>
          </div>

          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <p className={s.kicker}>Cotizador para vidrios y aluminio</p>
              <h1 className={s.title}>Empieza a cotizar desde el celular.</h1>
              <p className={s.subtitle}>
                Si quieres ver el cotizador, PDF y WhatsApp en acción, agenda una demo.
                Si ya estás dentro del piloto, entra a tu cuenta y sigue cotizando.
              </p>

              <div className={s.heroActions}>
                <TrackedExternalLink
                  className={s.primaryButton}
                  href={DEMO_WHATSAPP_HREF}
                  trackingSource="planes"
                  trackingLocation="hero-demo"
                  trackingLabel="planes:hero-demo"
                  trackingEventName="demo_click"
                >
                  Ver demo por WhatsApp
                  <FaArrowRight aria-hidden />
                </TrackedExternalLink>
                <Link className={s.secondaryButton} href="/login">
                  Entrar a mi cuenta
                </Link>
              </div>
            </div>

            <div className={s.heroPanel}>
              {signals.map((signal) => {
                const Icon = signal.icon;

                return (
                  <article key={signal.title} className={s.signalCard}>
                    <div className={s.signalIcon}>
                      <Icon aria-hidden />
                    </div>
                    <div>
                      <h2>{signal.title}</h2>
                      <p>{signal.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.cards}>
            {OPTIONS.map((option) => (
              <article
                key={option.name}
                className={`${s.card} ${option.tone === "primary" ? s.cardPrimary : s.cardSecondary}`}
              >
                <p className={s.cardEyebrow}>Ventora</p>
                <h2 className={s.cardTitle}>{option.name}</h2>
                <p className={s.cardDescription}>{option.description}</p>

                <ul className={s.list}>
                  {option.bullets.map((bullet) => (
                    <li key={bullet} className={s.listItem}>
                      <FaCheckCircle aria-hidden />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {option.cta.external ? (
                  <TrackedExternalLink
                    className={s.cardButton}
                    href={option.cta.href}
                    trackingSource="planes"
                    trackingLocation={`card-${option.name.toLowerCase().replace(/\s+/g, "-")}`}
                    trackingLabel={`planes:${option.name}`}
                    trackingEventName="demo_click"
                  >
                    {option.cta.label}
                  </TrackedExternalLink>
                ) : (
                  <Link className={s.cardButton} href={option.cta.href}>
                    {option.cta.label}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
