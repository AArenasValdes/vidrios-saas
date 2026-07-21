"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";

import { navLinks, WHATSAPP_LANDING_HREF } from "./landing-shared";
import s from "./landing.module.css";

function trackLandingCta(location: string, kind: "internal" | "whatsapp") {
  if (kind === "whatsapp") {
    googleTagService.trackWhatsappClick({
      source: "landing",
      location,
      label: `landing:${location}`,
    });
    return;
  }

  googleTagService.trackEvent("landing_cta_click", {
    event_category: "landing",
    event_label: location,
    source: "landing",
    location,
  });
}

/** Isla client mínima: menú móvil + tracking de CTAs del nav. */
export function LandingNavClient() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className={s.navbar} aria-label="Principal">
        <div className={s.container}>
          <div className={s.navbarInner}>
            <a href="#top" className={s.navLogo} aria-label="Ventora inicio">
              <Image
                src="/brand/ventora-logo-premium-dark.svg"
                alt="Ventora"
                width={184}
                height={42}
                className={s.wordmark}
                priority
                unoptimized
              />
            </a>

            <ul className={s.navLinks}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>

            <div className={s.navActions}>
              <a
                href={WHATSAPP_LANDING_HREF}
                className={s.navGhost}
                onClick={() => trackLandingCta("nav-whatsapp", "whatsapp")}
              >
                Hablar por WhatsApp
              </a>
              <Link
                href="/planes"
                className={s.navPrimary}
                prefetch={false}
                onClick={() => trackLandingCta("nav-probar-demo", "internal")}
              >
                Probar cotizador
              </Link>
            </div>

            <div className={s.navMobile}>
              <Link
                href="/planes"
                className={s.navPrimaryMobile}
                prefetch={false}
                onClick={() => trackLandingCta("mobile-probar-demo", "internal")}
              >
                Demo
              </Link>
              <button
                type="button"
                className={s.menuButton}
                onClick={() => setMenuOpen((current) => !current)}
                aria-expanded={menuOpen}
                aria-controls="landing-mobile-menu"
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id="landing-mobile-menu"
          className={s.mobileMenu}
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
        >
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <a
            href={WHATSAPP_LANDING_HREF}
            onClick={() => {
              trackLandingCta("mobile-menu-whatsapp", "whatsapp");
              setMenuOpen(false);
            }}
          >
            Hablar por WhatsApp
          </a>
        </div>
      ) : null}
    </>
  );
}
