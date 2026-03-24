"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

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
                src="/brand/ventora-logo-light.svg"
                alt="Ventora"
                width={197}
                height={44}
                className={s.brandWordmark}
              />

              <p className={s.brandText}>
                Presupuestario comercial para vidrios y aluminio. Hecho para
                talleres, instaladores y vendedores que necesitan cotizar claro
                y cerrar mas rapido desde terreno.
              </p>

              <div className={s.metaRow}>
                <span className={s.metaPill}>Hecho en Chile</span>
                <span className={s.metaPill}>PDF + WhatsApp</span>
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
                  <a href="mailto:hola@ventora.cl" className={s.contactItem}>
                    <Mail size={16} aria-hidden />
                    hola@ventora.cl
                  </a>
                  <a href="tel:+56987654321" className={s.contactItem}>
                    <Phone size={16} aria-hidden />
                    +56 9 8765 4321
                  </a>
                  <span className={s.contactItem}>
                    <MapPin size={16} aria-hidden />
                    Santiago, Chile
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
            <span>Soporte en espanol</span>
            <span>Disenado para obra</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
