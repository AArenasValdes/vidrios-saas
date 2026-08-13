"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import s from "./quote-flow-section.module.css";

const FLOW_BASE = "/ventora-landing-page/flow";

const flowSteps = [
  {
    step: "1",
    label: "Componente",
    hint: "Ventana, puerta, shower",
    image: `${FLOW_BASE}/paso2-componentes-trim.webp`,
    width: 422,
    height: 846,
    alt: "Paso 1: elegir tipo de componente en el celular",
  },
  {
    step: "2",
    label: "Medidas",
    hint: "Sistema, medidas y valor",
    image: `${FLOW_BASE}/paso2-datos-trim.webp`,
    width: 422,
    height: 846,
    alt: "Paso 2: cargar medidas, cristal y precio",
  },
  {
    step: "3",
    label: "Resumen",
    hint: "Total listo al tiro",
    image: `${FLOW_BASE}/paso3-resumen-trim.webp`,
    width: 415,
    height: 853,
    alt: "Paso 3: resumen con total de la cotización",
  },
  {
    step: "4",
    label: "PDF listo",
    hint: "Enviar por WhatsApp",
    image: `${FLOW_BASE}/pdf-listo-trim.webp`,
    width: 420,
    height: 846,
    alt: "Paso 4: PDF generado listo para compartir",
  },
] as const;

export function QuoteFlowSection() {
  return (
    <section id="solucion" className={s.section} aria-labelledby="quote-flow-title">
      <div className={s.container}>
        <header className={s.header}>
          <h2 id="quote-flow-title" className={s.title}>
            De componente a PDF en 4 pasos
          </h2>
          <p className={s.subtitle}>Cotiza desde el celular sin perder tiempo.</p>
        </header>

        <ol className={s.rail} aria-label="Pasos para cotizar con Ventora">
          {flowSteps.map((item) => (
            <li key={item.step} className={s.step}>
              <article className={s.stepBlock}>
                <div className={s.labelRow}>
                  <span className={s.badge}>{item.step}</span>
                  <div className={s.copy}>
                    <h3>{item.label}</h3>
                    <p>{item.hint}</p>
                  </div>
                </div>

                <div className={s.device}>
                  <Image
                    src={item.image}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                    className={s.shot}
                    sizes="(max-width: 640px) 72vw, 240px"
                  />
                </div>
              </article>
            </li>
          ))}
        </ol>

        <div className={s.ctaRow}>
          <Link href="/registro" className={s.cta} prefetch={false}>
            Empezar 15 días gratis
            <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
