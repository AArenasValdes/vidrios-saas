"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

import { VENTORA_CONTACT, VENTORA_COPY } from "@/constants/ventora-brand";
import s from "./footer-section.module.css";

type FooterNavLink = {
  href: string;
  label: string;
};

type FooterSectionProps = {
  navLinks: FooterNavLink[];
};

const accessLinks = [
  { href: "/planes", label: "Probar demo" },
  { href: "/login", label: "Ingresar" },
  { href: "#contacto", label: "Solicitar contacto" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacidad" },
  { href: "/terms", label: "Terminos" },
];

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FooterSection({ navLinks }: FooterSectionProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={s.footer}>
      <div className={s.footerGlow} aria-hidden />
      <div className={s.container}>
        <div className={s.shell}>
          <Reveal>
            <div className={s.brandBlock}>
              <Image
                src="/brand/ventora-logo-premium-dark.svg"
                alt="Ventora"
                width={344}
                height={80}
                className={s.brandWordmark}
                unoptimized
              />

              <p className={s.brandText}>
                Sistema comercial premium para vidrios y aluminio. Captura
                solicitudes, ordena el seguimiento y te ayuda a cerrar mejor
                desde terreno, WhatsApp y demo comercial.
              </p>

              <div className={s.metaRow}>
                <span className={s.metaPill}>Arquitectura comercial</span>
                <span className={s.metaPill}>Captura 24/7</span>
                <span className={s.metaPill}>Listo para terreno</span>
              </div>
            </div>
          </Reveal>

          <div className={s.linksGrid}>
            <Reveal delay={0.06}>
              <div className={s.column}>
                <h3 className={s.columnTitle}>Explorar</h3>
                <div className={s.linkList}>
                  {navLinks.map((link) => (
                    <a key={link.href} href={link.href} className={s.link}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className={s.column}>
                <h3 className={s.columnTitle}>Acceso</h3>
                <div className={s.linkList}>
                  {accessLinks.map((link) =>
                    link.href.startsWith("/") ? (
                      <Link key={link.href} href={link.href} className={s.link}>
                        {link.label}
                      </Link>
                    ) : (
                      <a key={link.href} href={link.href} className={s.link}>
                        {link.label}
                      </a>
                    )
                  )}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className={s.column}>
                <h3 className={s.columnTitle}>Legal</h3>
                <div className={s.linkList}>
                  {legalLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={s.link}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className={s.column}>
                <h3 className={s.columnTitle}>Contacto</h3>
                <div className={s.contactCard}>
                  <a href={VENTORA_CONTACT.supportMailto} className={s.contactItem}>
                    <Mail size={16} aria-hidden />
                    {VENTORA_CONTACT.supportEmail}
                  </a>
                  <a href={VENTORA_CONTACT.phoneHref} className={s.contactItem}>
                    <Phone size={16} aria-hidden />
                    {VENTORA_CONTACT.phoneDisplay}
                  </a>
                  <span className={s.contactItem}>
                    <MapPin size={16} aria-hidden />
                    {VENTORA_CONTACT.city}
                  </span>
                  <a href="#contacto" className={s.contactItem}>
                    <ArrowUpRight size={16} aria-hidden />
                    Solicitar una demo
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <div className={s.legalRow}>
          <div className={s.legalCopy}>
            {"\u00A9"} {currentYear} Ventora. Software comercial industrial,
            claro y listo para vender mejor.
          </div>

          <div className={s.legalBadges}>
            <span>Sin tarjeta de credito</span>
            <span>{VENTORA_COPY.supportLanguage}</span>
            <span>{VENTORA_COPY.fieldDesign}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
