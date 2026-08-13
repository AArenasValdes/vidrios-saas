import nextDynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { heroTrustItems, LOGIN_HREF, REGISTRO_HREF } from "./landing-shared";
import s from "./landing.module.css";

const HeroPhoneMockup = nextDynamic(
  () =>
    import("@/components/landing/hero-phone-mockup").then((mod) => ({
      default: mod.HeroPhoneMockup,
    })),
  { ssr: true }
);

export function LandingHeroServer() {
  return (
    <section id="top" className={s.heroSection}>
      <div className={s.heroBackgroundMedia} aria-hidden>
        <Image
          src="/brand/landing-cotizar-bg.webp"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="(max-width: 900px) 100vw, 1400px"
          quality={70}
          className={s.heroBackgroundImage}
        />
      </div>
      <div className={s.heroHalo} aria-hidden />
      <div className={s.container}>
        <div className={s.heroLayout}>
          <div className={s.heroContent}>
            <h1 className={s.heroTitle}>
              Cotiza vidrios y aluminio
              <span className={s.heroTitleAccent}>desde el celular</span>
            </h1>

            <p className={s.heroDescription}>
              15 días gratis en celular, tablet y computador. Hecho para talleres
              de Latinoamérica. Envía un PDF profesional por WhatsApp y deja de
              llegar a casa a hacer presupuestos.
            </p>

            <div className={s.heroActions}>
              <Link href={REGISTRO_HREF} className={s.primaryButton} prefetch={false}>
                Empezar 15 días gratis
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href={LOGIN_HREF} className={s.secondaryButton} prefetch={false}>
                Ya tengo cuenta
              </Link>
            </div>

            <p className={s.heroNote}>
              Sin tarjeta · varios dispositivos, la misma cuenta
            </p>

            <div className={s.heroTrust}>
              {heroTrustItems.map((item) => (
                <span key={item} className={s.heroTrustItem}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className={s.heroVisual}>
            <div className={s.heroVisualShell}>
              <HeroPhoneMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
