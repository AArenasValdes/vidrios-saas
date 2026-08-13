import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import s from "./devices-section.module.css";

export function DevicesSection() {
  return (
    <section className={s.section} aria-labelledby="devices-title">
      <div className={s.container}>
        <div className={s.copy}>
          <h2 id="devices-title" className={s.title}>
            Celular, tablet y computador. La misma cuenta.
          </h2>
          <p className={s.text}>
            Cotiza en terreno desde el celular, revisa en el taller y sigue desde
            otro dispositivo. Ventora no es una app de un solo teléfono.
          </p>
          <Link href="/registro" className={s.cta} prefetch={false}>
            Probar en cualquier dispositivo
            <ArrowRight size={17} aria-hidden />
          </Link>
        </div>

        <div className={s.stage} aria-hidden>
          <Image
            src="/ventora-landing-page/dashboard-cotizaciones.webp"
            alt=""
            width={1920}
            height={1080}
            className={s.desktop}
            sizes="(max-width: 900px) 92vw, 560px"
          />
          <Image
            src="/ventora-landing-page/capturalanding-pdf-800.webp"
            alt=""
            width={800}
            height={1600}
            className={s.phone}
            sizes="(max-width: 900px) 42vw, 220px"
          />
        </div>
      </div>
    </section>
  );
}
