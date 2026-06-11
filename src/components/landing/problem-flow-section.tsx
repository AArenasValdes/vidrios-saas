"use client";

import {
  Clock3,
  FileText,
  MessageSquareText,
  NotebookPen,
  UserRoundX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import s from "./problem-flow-section.module.css";

type ProblemStep = {
  icon: LucideIcon;
  title: string;
  text: string;
  quote?: string;
  tone: "default" | "danger";
};

const steps: readonly ProblemStep[] = [
  {
    icon: MessageSquareText,
    title: "Te escriben por WhatsApp",
    quote: "¿Cuánto sale cerrar una terraza?",
    text: "",
    tone: "default",
  },
  {
    icon: NotebookPen,
    title: "Anotas como puedes",
    text: "Fotos, audios y medidas sueltas.",
    tone: "default",
  },
  {
    icon: Clock3,
    title: "Cotizas tarde",
    text: "Lo armas en la noche.",
    tone: "default",
  },
  {
    icon: UserRoundX,
    title: "Trabajo perdido",
    quote: "Ya lo hice con otra empresa.",
    text: "",
    tone: "danger",
  },
] as const;

export function ProblemFlowSection() {
  return (
    <section id="problema" className={s.section} aria-labelledby="problem-flow-title">
      <div className={s.backdrop} aria-hidden="true">
        <div className={s.grid} />
        <div className={s.glow} />
        <div className={s.frameCornerTop} />
        <div className={s.frameCornerBottom} />
        <div className={s.windowOutline} />
        <div className={s.pdfGhost} />
      </div>

      <div className={s.container}>
        <header className={s.header}>
          <p className={s.badge}>EL PROBLEMA DE COTIZAR A MANO</p>
          <h2 id="problem-flow-title" className={s.title}>
            Cotizas tarde y el cliente no espera.
          </h2>
          <p className={s.subtitle}>
            Te escriben por WhatsApp. Anotas medidas como puedes. Cuando cotizas tarde, el
            cliente ya está comparando.
          </p>
        </header>

        <ol className={s.rail} aria-label="Flujo del problema al cotizar a mano">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <li key={step.title} className={s.step}>
                <div className={s.railCol}>
                  <span
                    className={`${s.iconBox} ${step.tone === "danger" ? s.iconBoxDanger : ""}`}
                  >
                    <Icon size={22} strokeWidth={2.1} aria-hidden />
                  </span>
                </div>

                <article
                  className={`${s.card} ${step.tone === "danger" ? s.cardDanger : ""}`}
                >
                  <h3>{step.title}</h3>
                  {step.quote ? <p className={s.quote}>&ldquo;{step.quote}&rdquo;</p> : null}
                  {step.text ? <p className={s.text}>{step.text}</p> : null}
                </article>
              </li>
            );
          })}
        </ol>

        <div className={s.closing}>
          <span className={s.closingIcon} aria-hidden="true">
            <FileText size={16} strokeWidth={2.2} />
          </span>
          <p className={s.closingText}>
            Cotiza desde el celular y envía un presupuesto profesional en minutos.
          </p>
        </div>
      </div>
    </section>
  );
}
