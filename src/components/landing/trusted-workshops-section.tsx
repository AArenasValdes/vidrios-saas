import Image from "next/image";
import { BadgeCheck, Star } from "lucide-react";
import s from "./trusted-workshops-section.module.css";

type LogoBadgeVariant = "dark" | "circle" | "light" | "silver";

type TrustedWorkshop = {
  name: string;
  quote: string;
  logoSrc: string;
  width: number;
  height: number;
  badgeVariant: LogoBadgeVariant;
};

const trustedWorkshops: readonly TrustedWorkshop[] = [
  {
    name: "Vidriería FyH",
    quote: "“Cumple perfecto con lo que buscaba para hacer cotizaciones.”",
    logoSrc: "/brand/clientes/vidrieria-fyh.webp",
    width: 368,
    height: 160,
    badgeVariant: "dark",
  },
  {
    name: "Dimasoli Ventanas",
    quote: "“Me facilitó mucho el trabajo, súper práctica y rápida.”",
    logoSrc: "/brand/clientes/dimasoli.webp",
    width: 194,
    height: 192,
    badgeVariant: "circle",
  },
  {
    name: "San Marco Aluminios y PVC",
    quote:
      "“Me encantó, era lo que buscaba y además en el teléfono. Muy buen programa.”",
    logoSrc: "/brand/clientes/san-marco.webp",
    width: 247,
    height: 220,
    badgeVariant: "silver",
  },
  {
    name: "KR Metal Limitada",
    quote:
      "“Nos encantó el programa, súper práctico y fácil hacer presupuestos.”",
    logoSrc: "/brand/clientes/krmetal.webp",
    width: 360,
    height: 153,
    badgeVariant: "light",
  },
] as const;

const STAR_INDICES = [0, 1, 2, 3, 4] as const;

function FiveStars() {
  return (
    <span className={s.starsRow} aria-label="Calificación de 5 de 5 estrellas">
      {STAR_INDICES.map((i) => (
        <Star
          key={i}
          size={14}
          fill="#fbbf24"
          stroke="#fbbf24"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function getBadgeVariantClass(variant: LogoBadgeVariant) {
  switch (variant) {
    case "dark":
      return s.logoBadgeDark;
    case "circle":
      return s.logoBadgeCircle;
    case "light":
      return s.logoBadgeLight;
    case "silver":
      return s.logoBadgeSilver;
  }
}

export function TrustedWorkshopsSection() {
  return (
    <section className={s.section} aria-labelledby="trusted-workshops-title">
      <div className={s.container}>
        <div className={s.header}>
          <div className={s.titleGroup}>
            <h2 id="trusted-workshops-title" className={s.title}>
              Empresas y talleres que cotizan con Ventora
            </h2>
            <p className={s.subtitle}>
              Vidrierías y talleres de aluminio y PVC que ya entregan presupuestos desde el celular.
            </p>
          </div>

          <div className={s.overallRating} aria-label="Valoración promedio 5.0 de 5 estrellas">
            <span className={s.overallStars} aria-hidden="true">
              {STAR_INDICES.map((i) => (
                <Star
                  key={i}
                  size={14}
                  fill="#fbbf24"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                />
              ))}
            </span>
            <span className={s.overallScore}>5.0</span>
            <span className={s.overallLabel}>Talleres activos</span>
          </div>
        </div>

        <ul className={s.logoGrid} role="list">
          {trustedWorkshops.map((workshop) => (
            <li key={workshop.name}>
              <article className={s.card}>
                <div className={s.cardTop}>
                  <div
                    className={`${s.logoBadge} ${getBadgeVariantClass(
                      workshop.badgeVariant
                    )}`}
                  >
                    <Image
                      src={workshop.logoSrc}
                      alt={`Logo de ${workshop.name}`}
                      width={workshop.width}
                      height={workshop.height}
                      className={
                        workshop.badgeVariant === "circle"
                          ? s.logoImageCircle
                          : s.logoImage
                      }
                      sizes="140px"
                      unoptimized
                    />
                  </div>
                  <FiveStars />
                </div>

                <blockquote className={s.quote}>{workshop.quote}</blockquote>

                <footer className={s.cardFooter}>
                  <span className={s.companyName}>{workshop.name}</span>
                  <span className={s.verifiedTag}>
                    <BadgeCheck size={14} aria-hidden="true" />
                    Verificado
                  </span>
                </footer>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
