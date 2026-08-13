import Link from "next/link";
import { ArrowRight } from "lucide-react";

import s from "./pauta-section.module.css";

const points = [
  "Cotizas precio sin receta. La cubicación es opcional.",
  "Si quieres, agregas tus líneas para cubicación y despiece.",
  "Plantillas iniciales sugeridas de líneas de aluminio habituales (L5000, L20, L25). Las validas en tu taller.",
] as const;

export function PautaSection() {
  return (
    <section className={s.section} aria-labelledby="pauta-title">
      <div className={s.container}>
        <h2 id="pauta-title" className={s.title}>
          Líneas, cubicación y despiece, si las necesitas.
        </h2>
        <p className={s.text}>
          Ventora no es un motor de fábrica. Es una pauta interna revisable para
          cuando tu taller quiere ir más allá del presupuesto comercial.
        </p>
        <ul className={s.list}>
          {points.map((point) => (
            <li key={point}>{point}</li>
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
