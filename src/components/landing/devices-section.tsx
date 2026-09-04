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
          <div className={s.laptop}>
            <div className={s.laptopLid}>
              <div className={s.laptopCamera} />
              <div className={s.laptopScreen}>
                <Image
                  src="/ventora-landing-page/dashboard-desktop.png"
                  alt="Dashboard de Ventora con clientes y cotizaciones ordenadas en computador"
                  width={1024}
                  height={492}
                  className={s.desktopShot}
                  sizes="(max-width: 900px) 92vw, 560px"
                />
              </div>
            </div>
            <div className={s.laptopDeck} />
          </div>

          <Image
            src="/ventora-landing-page/capturalanding-pdf-800.webp"
            alt="PDF profesional de una cotización de vidrio y aluminio listo para enviar por WhatsApp"
            width={800}
            height={1600}
            className={s.phoneFront}
            sizes="(max-width: 900px) 38vw, 196px"
          />
        </div>
      </div>
    </section>
  );
}
