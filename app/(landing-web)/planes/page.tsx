import Image from "next/image";
import Link from "next/link";
import { FaArrowRight, FaCheckCircle, FaClock, FaComments, FaPhoneAlt } from "react-icons/fa";

import s from "./page.module.css";

const OPTIONS = [
  {
    name: "Demo guiada",
    description:
      "Para ver el flujo real de cotizacion, PDF y WhatsApp antes de entrar con tu equipo.",
    bullets: [
      "Recorrido comercial de 20 minutos",
      "Ejemplos reales del rubro en Chile",
      "Revision de tu flujo actual de ventas",
    ],
    cta: {
      href: "mailto:contacto@vidriossaas.cl?subject=Quiero%20agendar%20una%20demo%20de%20Ventora",
      label: "Agendar demo",
      external: true,
    },
    tone: "primary",
  },
  {
    name: "Acceso piloto",
    description:
      "Para talleres e instaladores que quieran empezar a cotizar con Ventora y darnos feedback de uso real.",
    bullets: [
      "Acceso al flujo completo",
      "Acompanamiento de implementacion",
      "Feedback directo para ajustes del producto",
    ],
    cta: {
      href: "/login",
      label: "Entrar a mi cuenta",
      external: false,
    },
    tone: "secondary",
  },
];

const signals = [
  {
    icon: FaClock,
    title: "Salida rapida",
    text: "Muestra el valor comercial del sistema en pocos minutos, sin explicaciones tecnicas.",
  },
  {
    icon: FaComments,
    title: "Conversacion real",
    text: "Pensado para talleres, instaladores y equipos que venden en obra y por WhatsApp.",
  },
  {
    icon: FaPhoneAlt,
    title: "Siguiente paso claro",
    text: "Agenda demo o entra a tu cuenta. Sin formularios eternos ni paginas de pricing vacias.",
  },
];

export default function PlanesPage() {
  return (
    <main className={s.page}>
      <section className={s.hero}>
        <div className={s.container}>
          <div className={s.topbar}>
            <Link href="/" className={s.brand} aria-label="Ventora">
              <Image src="/brand/ventora-logo-navy.svg" alt="Ventora" width={150} height={36} priority />
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
              <p className={s.kicker}>Ventora para vidrios y aluminio</p>
              <h1 className={s.title}>Elige la forma mas simple de empezar.</h1>
              <p className={s.subtitle}>
                Si quieres evaluar el producto, agenda una demo. Si ya estas dentro del piloto,
                entra a tu cuenta y sigue cotizando.
              </p>

              <div className={s.heroActions}>
                <a
                  className={s.primaryButton}
                  href="mailto:contacto@vidriossaas.cl?subject=Quiero%20agendar%20una%20demo%20de%20Ventora"
                >
                  Probar demo
                  <FaArrowRight aria-hidden />
                </a>
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
                  <a className={s.cardButton} href={option.cta.href}>
                    {option.cta.label}
                  </a>
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
