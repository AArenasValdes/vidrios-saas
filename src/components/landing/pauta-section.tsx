import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import s from "./pauta-section.module.css";

const desktopPoints = [
  "Cotiza con precio aunque la línea todavía no tenga receta.",
  "Configura tus propias líneas y reglas.",
  "Calcula perfiles, vidrios, accesorios y cantidades.",
  "Convierte metros requeridos en tiras comerciales.",
  "Revisa cortes, barras y sobrantes antes de fabricar.",
] as const;

const mobilePoints = [
  "Cotiza aunque la línea todavía no tenga receta.",
  "Revisa materiales y medidas antes de fabricar.",
  "La pauta es interna, revisable y no aparece en el PDF del cliente.",
] as const;

const catalogScreenshot =
  "/ventora-landing-page/fabricacion/catalogo-privado-demo.webp";
const fabricationScreenshot =
  "/ventora-landing-page/fabricacion/resumen-fabricacion-demo.webp";
const fabricationMobileScreenshot =
  "/ventora-landing-page/fabricacion/resumen-fabricacion-mobile-demo.webp";

export function PautaSection() {
  return (
    <section id="fabricacion" className={s.section} aria-labelledby="pauta-title">
      <div className={s.container}>
        <div className={s.content}>
          <h2 id="pauta-title" className={s.title}>
            <span className={s.desktopCopy}>
              Cubicación, despiece y pauta de corte, si los necesitas.
            </span>
            <span className={s.mobileCopy}>
              Cotiza primero. Revisa la fabricación cuando la necesites.
            </span>
          </h2>
          <p className={s.text}>
            <span className={s.desktopCopy}>
              Cotiza sin configurar fabricación. Cuando tu taller esté listo, agrega
              sus líneas, descuentos, largos comerciales y reglas para preparar
              materiales y cortes de forma revisable.
            </span>
            <span className={s.mobileCopy}>
              Configura tus líneas y obtén un resumen interno con perfiles, vidrio,
              accesorios y cortes para revisar.
            </span>
          </p>
          <ul className={`${s.list} ${s.desktopList}`}>
            {desktopPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <Link
            href="/registro"
            className={`${s.cta} ${s.desktopCta}`}
            prefetch={false}
          >
            Empezar 15 días gratis
            <ArrowRight size={17} aria-hidden />
          </Link>
        </div>

        <div className={s.evidence} aria-label="Fabricación configurable en Ventora">
          <figure className={`${s.figure} ${s.catalogFigure}`}>
            <figcaption className={s.caption}>
              <span className={s.step}>1</span>
              <span>
                <strong>Configura tus líneas en el catálogo privado</strong>
                <small>Precio comercial y receta de fabricación, sin mezclarlos.</small>
              </span>
            </figcaption>
            <div className={s.catalogFrame}>
              <Image
                src={catalogScreenshot}
                alt="Catálogo privado de Ventora con plantillas de líneas, precio por metro cuadrado y estado de fabricación"
                width={1600}
                height={699}
                sizes="(max-width: 900px) calc(100vw - 32px), 58vw"
                className={s.catalogImage}
              />
            </div>
          </figure>

          <figure className={`${s.figure} ${s.resultFigure}`}>
            <figcaption className={`${s.caption} ${s.desktopResultCaption}`}>
              <span className={s.step}>2</span>
              <span>
                <strong>Revisa el resultado antes de fabricar</strong>
                <small>Resumen interno, sin precios y separado del PDF del cliente.</small>
              </span>
            </figcaption>
            <div className={s.resultStage}>
              <div className={s.fabricationFrame}>
                <Image
                  src={fabricationScreenshot}
                  alt="Resumen interno de fabricación de Ventora con perfiles, vidrio, accesorios, cortes y pauta sugerida de tiras"
                  width={1100}
                  height={1022}
                  sizes="(max-width: 640px) 1px, (max-width: 900px) 78vw, 48vw"
                  className={s.fabricationImage}
                />
              </div>
              <div className={s.mobileFrame}>
                <Image
                  src={fabricationMobileScreenshot}
                  alt="Vista móvil del resumen interno de fabricación de Ventora"
                  width={520}
                  height={1124}
                  sizes="(max-width: 640px) 78vw, 190px"
                  className={s.mobileImage}
                />
              </div>
            </div>
            <p className={s.mobileResultLabel}>
              Resumen interno · revisable · sin precios
            </p>
            <ul className={`${s.list} ${s.mobileList}`}>
              {mobilePoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <Link
              href="/registro"
              className={`${s.cta} ${s.mobileCta}`}
              prefetch={false}
            >
              Empezar 15 días gratis
              <ArrowRight size={17} aria-hidden />
            </Link>
          </figure>
        </div>
      </div>
    </section>
  );
}
