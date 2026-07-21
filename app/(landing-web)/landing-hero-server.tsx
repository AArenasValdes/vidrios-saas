import nextDynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TrackedExternalLink } from "@/features/analytics/components/tracked-external-link";

import { heroTrustItems, WHATSAPP_LANDING_HREF } from "./landing-shared";
import s from "./landing.module.css";

// bundle-dynamic-imports: mockup animado fuera del chunk crítico del texto LCP.
const HeroPhoneMockup = nextDynamic(
  () =>
    import("@/components/landing/hero-phone-mockup").then((mod) => ({
      default: mod.HeroPhoneMockup,
    })),
  { ssr: true }
);

/**
 * Hero RSC: el HTML del LCP/FCP sale sin esperar el bundle client de toda la landing.
 * CTAs usan links reales; tracking WhatsApp vía isla TrackedExternalLink.
 */
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
            <p className={s.heroKicker}>Ventora para vidrio y aluminio</p>

            <h1 className={s.heroTitle}>
              Cotiza vidrios y aluminio
              <span className={s.heroTitleAccent}>desde el celular</span>
            </h1>

            <p className={s.heroDescription}>
              Crea presupuestos profesionales, envía PDF por WhatsApp y mantén tus
              clientes ordenados en un solo lugar.
            </p>

            <div className={s.heroActions}>
              <Link href="/planes" className={s.primaryButton} prefetch={false}>
                Probar cotizador gratis
                <ArrowRight size={18} aria-hidden />
              </Link>
              <TrackedExternalLink
                href={WHATSAPP_LANDING_HREF}
                className={s.secondaryButton}
                trackingSource="landing"
                trackingLocation="hero-whatsapp"
                trackingLabel="landing:hero-whatsapp"
              >
                Ver demo por WhatsApp
              </TrackedExternalLink>
            </div>

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
