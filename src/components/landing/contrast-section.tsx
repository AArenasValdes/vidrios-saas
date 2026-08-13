import Link from "next/link";
import { ArrowRight } from "lucide-react";

import s from "./contrast-section.module.css";

export function ContrastSection() {
  return (
    <section className={s.section} aria-labelledby="contrast-title">
      <div className={s.container}>
        <h2 id="contrast-title" className={s.title}>
          Tu cotizador técnico te ayuda a fabricar. Ventora te ayuda a cotizar y enviar.
        </h2>
        <p className={s.lead}>
          Cotizador comercial completo — en cualquier dispositivo — al precio de un
          taller, no de un sistema de fábrica.
        </p>

        <div className={s.split}>
          <div>
            <p className={s.colLabel}>Cotizador técnico</p>
            <p className={s.colText}>Perfiles, cortes y fabricación.</p>
          </div>
          <div>
            <p className={s.colLabel}>Ventora</p>
            <p className={s.colText}>
              Presupuesto, PDF, WhatsApp y, si quieres, pauta interna.
            </p>
          </div>
        </div>

        <Link href="/registro" className={s.cta} prefetch={false}>
          Empezar 15 días gratis
          <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
