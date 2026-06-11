"use client";

import { FileText, FolderCheck, Inbox, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import s from "./benefits-quick-section.module.css";

type BenefitCard = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const cards: readonly BenefitCard[] = [
  {
    icon: FileText,
    title: "PDF profesional",
    text: "Presupuesto limpio en minutos.",
  },
  {
    icon: Send,
    title: "Enviar por WhatsApp",
    text: "Mándalo al cliente al tiro.",
  },
  {
    icon: FolderCheck,
    title: "Todo guardado",
    text: "Clientes y cotizaciones en orden.",
  },
  {
    icon: Inbox,
    title: "Recibe solicitudes",
    text: "Aunque estés trabajando.",
  },
] as const;

export function BenefitsQuickSection() {
  return (
    <section id="beneficios" className={s.section} aria-labelledby="benefits-quick-title">
      <div className={s.backdrop} aria-hidden="true">
        <div className={s.grid} />
      </div>

      <div className={s.container}>
        <header className={s.header}>
          <h2 id="benefits-quick-title" className={s.title}>
            Lo que haces más rápido con Ventora
          </h2>
          <p className={s.subtitle}>Cotiza, envía y ordena desde el celular.</p>
        </header>

        <ul className={s.cardGrid}>
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <li key={card.title}>
                <article className={s.card}>
                  <span className={s.iconBox} aria-hidden="true">
                    <Icon size={17} strokeWidth={2.1} />
                  </span>
                  <div className={s.cardBody}>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
