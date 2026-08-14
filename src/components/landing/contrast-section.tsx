import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";

import s from "./contrast-section.module.css";

export function ContrastSection() {
  const benefits = [
    "Cotización comercial rápida",
    "PDF profesional por WhatsApp",
    "Cubicación opcional con las reglas del taller",
    "Pauta de corte revisable antes de fabricar",
  ] as const;

  return (
    <section className={s.section} aria-labelledby="contrast-title">
      <div className={s.container}>
        <h2 id="contrast-title" className={s.title}>
          Empieza cotizando. Configura la fabricación cuando la necesites.
        </h2>
        <p className={s.lead}>
          Crea presupuestos y PDFs desde el primer día. Cuando quieras, agrega tus
          líneas, reglas y largos comerciales para obtener cubicación, despiece y
          pautas de corte revisables.
        </p>

        <ul className={s.benefits}>
          {benefits.map((benefit) => (
            <li key={benefit}>
              <CircleCheck size={18} aria-hidden />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <Link href="/registro" className={s.cta} prefetch={false}>
          Empezar 15 días gratis
          <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
