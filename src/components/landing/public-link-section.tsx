"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import s from "./public-link-section.module.css";

const PHONE_WIDTH = 617;
const PHONE_HEIGHT = 1153;

const captures = [
  {
    label: "Tu link y QR",
    hint: "Página pública de tu empresa",
    src: "/ventora-landing-page/minilanding1.webp",
    alt: "Página pública de Ventora con link y código QR para compartir",
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
  },
  {
    label: "Formulario del cliente",
    hint: "Pidieron presupuesto desde ahí",
    src: "/ventora-landing-page/minilanding2.webp",
    alt: "Formulario público donde el cliente solicita cotización de vidrios y aluminio",
    width: 561,
    height: PHONE_HEIGHT,
  },
] as const;

export function PublicLinkSection() {
  return (
    <section id="captacion" className={s.section} aria-labelledby="public-link-title">
      <div className={s.container}>
        <header className={s.header}>
          <h2 id="public-link-title" className={s.title}>
            Link público para captar solicitudes
          </h2>
          <p className={s.subtitle}>
            Compártelo. El cliente pide presupuesto y tú lo recibes ordenado.
          </p>
        </header>

        <div className={s.flowStage}>
          <p className={s.flowCaption}>Misma página pública · link → formulario</p>

          <div className={s.flowGrid}>
            <article className={s.stepBlock}>
              <div className={s.labelRow}>
                <span className={s.badge}>1</span>
                <div className={s.copy}>
                  <h3>{captures[0].label}</h3>
                  <p>{captures[0].hint}</p>
                </div>
              </div>
              <Image
                src={captures[0].src}
                alt={captures[0].alt}
                width={captures[0].width}
                height={captures[0].height}
                className={s.phone}
                sizes="(max-width: 720px) 86vw, 320px"
              />
            </article>

            <div className={s.connector} aria-hidden="true">
              <span className={s.connectorLine} />
              <span className={s.connectorIcon}>
                <ArrowRight size={18} strokeWidth={2.4} />
              </span>
            </div>

            <article className={s.stepBlock}>
              <div className={s.labelRow}>
                <span className={s.badge}>2</span>
                <div className={s.copy}>
                  <h3>{captures[1].label}</h3>
                  <p>{captures[1].hint}</p>
                </div>
              </div>
              <Image
                src={captures[1].src}
                alt={captures[1].alt}
                width={captures[1].width}
                height={captures[1].height}
                className={s.phone}
                sizes="(max-width: 720px) 86vw, 320px"
              />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
