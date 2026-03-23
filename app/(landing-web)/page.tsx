"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import type { IconType } from "react-icons";
import {
  FaArrowRight,
  FaCalculator,
  FaCheckCircle,
  FaFilePdf,
  FaHammer,
  FaPlus,
  FaRulerCombined,
  FaWhatsapp,
} from "react-icons/fa";

import s from "./landing.module.css";
import { ProblemSection } from "@/components/landing/problem-section";

const CURRENT_YEAR = new Date().getFullYear();

const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#producto", label: "Producto" },
  { href: "#faq", label: "FAQ" },
];

const heroQuoteItems = [
  {
    code: "V1",
    title: "Ventana aluminio",
    detail: "Serie 25 · negro mate · 1200 x 1500 mm",
    price: "$579.500",
    tone: "window",
  },
  {
    code: "S1",
    title: "Shower door",
    detail: "Templado 8 mm · herrajes cromo · 800 x 1900 mm",
    price: "$421.800",
    tone: "shower",
  },
];

const steps: Array<{ icon: IconType; step: string; title: string; description: string; tag: string }> = [
  {
    icon: FaRulerCombined,
    step: "01",
    title: "Tomas datos de la obra",
    description: "Cliente, medidas y componentes quedan listos en un flujo corto pensado para celular.",
    tag: "Input",
  },
  {
    icon: FaCalculator,
    step: "02",
    title: "El sistema arma el valor",
    description: "Ingresas costo proveedor, margen e IVA. El presupuesto queda ordenado y sin formulas manuales.",
    tag: "Proceso",
  },
  {
    icon: FaFilePdf,
    step: "03",
    title: "Envias y haces seguimiento",
    description: "Generas PDF profesional, compartes por WhatsApp y sigues la respuesta del cliente.",
    tag: "Resultado",
  },
];

const processVisuals = [
  {
    src: "/brand/landing-paso1.png",
    alt: "Paso 1 real del flujo de cotizacion con cliente y obra",
    width: 1325,
    height: 753,
    maskClassName: "captureMaskPaso1TopRight",
  },
  {
    src: "/brand/landing-paso2.png",
    alt: "Paso 2 real del flujo de cotizacion con componentes y resumen",
    width: 1284,
    height: 918,
    maskClassName: "captureMaskPaso2TopRight",
  },
  {
    src: "/brand/landing-paso3.png",
    alt: "Paso 3 real del flujo con total final y acciones de cierre",
    width: 1272,
    height: 912,
    maskClassName: "captureMaskPaso3TopRight",
  },
];

const productSignals = [
  "Componentes por obra con codigo, medidas y tipo.",
  "Margen visible por item para no vender a ciegas.",
  "Estados comerciales: borrador, enviada, aprobada.",
];

const showcaseCards = [
  {
    title: "Ventana aluminio",
    code: "V1",
    detail: "Linea 5000 · living principal",
    price: "$579.500",
    status: "enviada",
  },
  {
    title: "Shower door",
    code: "S1",
    detail: "Templado 8 mm · bano principal",
    price: "$421.800",
    status: "aprobada",
  },
];

const stats = [
  { value: "+50", label: "cotizaciones creadas" },
  { value: "3 pasos", label: "desde la obra al PDF" },
  { value: "Chile", label: "hecho para instaladores del rubro" },
];

const advantagePoints = [
  "No necesitas Excel para presentar algo serio.",
  "No necesitas saber formulas para calcular bien.",
  "No necesitas explicar tu trabajo con una interfaz generica.",
];

const faqs = [
  {
    question: "Sirve si hoy trabajo con precio de proveedor?",
    answer:
      "Si. El flujo esta hecho para ingresar costo proveedor, aplicar margen y salir con un presupuesto comercial claro.",
  },
  {
    question: "Lo puedo usar desde el celular en la obra?",
    answer:
      "Si. La experiencia prioriza contraste, botones grandes y lectura rapida para terreno y uso movil.",
  },
  {
    question: "El cliente recibe algo presentable?",
    answer:
      "Si. El sistema genera un PDF profesional con branding y luego lo compartes por WhatsApp o correo.",
  },
  {
    question: "Tengo que aprender algo tecnico?",
    answer:
      "No. Esta pensado para vender mejor y mas rapido, no para obligarte a operar como si fuera software de ingenieria.",
  },
];

const easeOut = [0.22, 1, 0.36, 1] as const;

const revealUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut },
  },
};

const staggerList = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (value) => {
    setIsScrolled(value > 18);
  });

  return (
    <main className={s.page}>
      <nav className={`${s.navbar} ${isScrolled ? s.navbarScrolled : ""}`}>
        <div className={s.container}>
          <div className={s.navbarInner}>
            <a href="#top" className={s.navLogo} aria-label="Ventora">
              <Image
                src="/brand/ventora-logo-navy.svg"
                alt="Ventora"
                width={197}
                height={44}
                className={s.wordmark}
                priority
              />
              <Image
                src="/brand/ventora-icon.svg"
                alt="Ventora"
                width={40}
                height={40}
                className={s.iconmark}
              />
            </a>

            <ul className={s.navLinks}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>

            <div className={s.navActions}>
              <Link href="/login" className={s.navGhost}>
                Ingresar
              </Link>
              <Link href="/planes" className={s.navPrimary}>
                Probar demo
              </Link>
            </div>

            <button
              type="button"
              className={s.hamburger}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label="Abrir menu"
            >
              {menuOpen ? "X" : "+"}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className={`${s.mobileMenu} ${s.mobileMenuOpen}`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: easeOut }}
          >
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <Link href="/planes" onClick={() => setMenuOpen(false)} className={s.mobilePrimary}>
              Probar demo
            </Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className={s.mobileSecondary}>
              Ingresar
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section id="top" className={s.heroSection}>
        <div className={s.heroBackdrop} />
        <div className={s.container}>
          <div className={s.heroShell}>
            <motion.div
              className={s.heroCopy}
              initial="hidden"
              animate="show"
              variants={staggerList}
            >
              <motion.div className={s.sectionTag} variants={revealUp}>
                Software para vidrierias y aluminio en Chile
              </motion.div>
              <motion.h1 className={s.heroTitle} variants={revealUp}>
                Cotiza en terreno. <span>Cierra ventas mas rapido.</span>
              </motion.h1>
              <motion.p className={s.heroSubtitle} variants={revealUp}>
                Crea presupuestos en minutos desde tu celular, sin Excel ni errores. Disenado para la industria del
                vidrio y aluminio en Chile.
              </motion.p>

              <motion.div className={s.heroActions} variants={revealUp}>
                <Link href="/planes" className={s.primaryButton}>
                  Probar demo
                  <FaArrowRight aria-hidden />
                </Link>
                <a href="#como-funciona" className={s.secondaryButton}>
                  Ver como funciona
                </a>
              </motion.div>

              <motion.div className={s.heroProofRow} variants={revealUp}>
                <div className={s.heroProofDots} aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <p>Herramienta comercial pensada para terreno, taller y cierre de ventas.</p>
              </motion.div>
            </motion.div>

            <motion.div
              className={s.heroStage}
              initial={{ opacity: 0, x: 32, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: easeOut, delay: 0.12 }}
            >
              <div className={s.heroWorkspace}>
                <div className={s.heroShotChrome}>
                  <div className={s.captureDots} aria-hidden>
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>Cotizacion lista para enviar</p>
                </div>

                <div className={s.heroShotFrame}>
                  <div className={s.heroQuoteCard}>
                    <div className={s.heroQuoteHeader}>
                      <div>
                        <span className={s.itemCode}>Nueva cotizacion</span>
                        <h3>Constructora Los Andes</h3>
                        <p>Las Condes · Edificio Vista Apoquindo</p>
                      </div>
                      <span className={s.heroStatePill}>en proceso</span>
                    </div>

                    <div className={s.heroQuoteMetaRow}>
                      <div className={s.heroMetaChip}>
                        <span>Cliente</span>
                        <strong>Pedro Araya</strong>
                      </div>
                      <div className={s.heroMetaChip}>
                        <span>Ubicacion</span>
                        <strong>Las Condes</strong>
                      </div>
                      <div className={s.heroMetaChip}>
                        <span>Validez</span>
                        <strong>15 dias</strong>
                      </div>
                    </div>

                    <div className={s.heroQuoteItems}>
                      {heroQuoteItems.map((item) => (
                        <motion.div
                          key={item.code}
                          className={s.heroQuoteItem}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, ease: easeOut }}
                        >
                          <div className={`${s.heroItemThumb} ${item.tone === "shower" ? s.heroItemThumbShower : ""}`} aria-hidden>
                            <span />
                            <span />
                          </div>
                          <div className={s.heroItemBody}>
                            <div className={s.heroItemTop}>
                              <span className={s.itemCode}>{item.code}</span>
                              <strong>{item.title}</strong>
                            </div>
                            <p>{item.detail}</p>
                          </div>
                          <div className={s.heroItemPrice}>
                            <span>precio</span>
                            <strong>{item.price}</strong>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className={s.heroQuoteSummary}>
                      <div>
                        <span>Subtotal</span>
                        <strong>$1.001.300</strong>
                      </div>
                      <div>
                        <span>IVA 19%</span>
                        <strong>$190.247</strong>
                      </div>
                      <div className={s.heroQuoteTotal}>
                        <span>Total final</span>
                        <strong>$1.191.547</strong>
                      </div>
                    </div>

                    <div className={s.heroQuoteActions}>
                      <span className={s.heroWhatsappButton}>
                        <FaWhatsapp aria-hidden />
                        Enviar por WhatsApp
                      </span>
                      <span className={s.heroPdfReady}>PDF comercial listo</span>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                className={s.heroFloatingApproved}
                animate={{ y: [0, -8, 0], scale: [1, 1.01, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className={s.heroFloatingApprovedIcon}>
                  <FaCheckCircle aria-hidden />
                </div>
                <div>
                  <span>Aprobado por cliente</span>
                  <strong>Listo para cierre</strong>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <ProblemSection />

      <section id="como-funciona" className={s.processSection}>
        <div className={s.container}>
          <div className={s.sectionHeadingLight}>
            <div className={s.sectionTag}>Como funciona</div>
            <h2 className={s.sectionTitleLight}>Tres pasos claros. Sin navegacion pesada. Sin vueltas.</h2>
            <p className={s.sectionTextLight}>
              La experiencia esta organizada como una herramienta de trabajo: entrar, calcular, enviar.
            </p>
          </div>

          <div className={s.processRail} aria-hidden />

          <motion.div
            className={s.processFlow}
            variants={staggerList}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.18 }}
          >
            {steps.map((item, index) => {
              const Icon = item.icon;
              const visual = processVisuals[index];
              const alignRight = index % 2 === 1;

              return (
                <motion.article
                  key={item.step}
                  className={`${s.processRow} ${alignRight ? s.processRowRight : ""}`}
                  variants={revealUp}
                >
                  <div className={s.processStepCard}>
                    <div className={s.stepTop}>
                      <span className={s.stepNumber}>{item.step}</span>
                      <span className={s.stepPill}>{item.tag}</span>
                    </div>
                    <div className={s.stepIcon}>
                      <Icon aria-hidden />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>

                  <div className={s.processShotWrap}>
                    <div className={s.processShotFrame}>
                      <div className={s.captureToolbar}>
                        <div className={s.captureDots} aria-hidden>
                          <span />
                          <span />
                          <span />
                        </div>
                        <p>{item.title}</p>
                      </div>
                      <div className={s.captureImageWrap}>
                        <Image
                          src={visual.src}
                          alt={visual.alt}
                          width={visual.width}
                          height={visual.height}
                          className={s.processShotImage}
                        />
                        <div className={`${s.captureMask} ${s[visual.maskClassName]}`} aria-hidden />
                      </div>
                    </div>

                    {index === 2 ? (
                      <motion.div
                        className={s.processSuccessBadge}
                        animate={{ y: [0, -8, 0], opacity: [0.92, 1, 0.92] }}
                        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <div className={s.processSuccessIcon}>
                          <FaCheckCircle aria-hidden />
                        </div>
                        <div>
                          <span>Cotizacion enviada con exito</span>
                          <strong>PDF + WhatsApp listos</strong>
                        </div>
                      </motion.div>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="producto" className={s.productSection}>
        <div className={s.container}>
          <div className={s.productLayout}>
            <div className={s.productCopy}>
              <div className={s.sectionTagLight}>Producto real</div>
              <h2 className={s.sectionTitleDark}>No parece una demo. Parece un sistema que ya esta trabajando.</h2>
              <p className={s.sectionTextDark}>
                Componentes reales, codigos, precios, margen, estados y salida comercial. Todo habla el lenguaje de la
                obra y del taller.
              </p>

              <ul className={s.signalList}>
                {productSignals.map((signal) => (
                  <li key={signal}>
                    <FaCheckCircle aria-hidden />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={s.productVisual}>
              <div className={s.productBoard}>
                <div className={s.productBoardHeader}>
                  <div>
                    <span className={s.smallTagDark}>Capturas reales del producto</span>
                    <h3>Se ve como una herramienta real porque ya muestra trabajo real.</h3>
                  </div>
                  <span className={s.captureCount}>4 vistas clave</span>
                </div>

                <div className={s.productMock}>
                  <div className={s.visualPanel}>
                    <div className={s.windowVisual} aria-hidden>
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className={s.panelMeta}>
                      <span className={s.itemCode}>V1</span>
                      <strong>Ventana aluminio</strong>
                      <p>Linea 5000 · living principal</p>
                    </div>
                  </div>

                  <div className={s.visualPanelDark}>
                    <div className={s.showerVisual} aria-hidden>
                      <span />
                      <span />
                    </div>
                    <div className={s.panelMetaDark}>
                      <span className={s.itemCodeLight}>S1</span>
                      <strong>Shower door</strong>
                      <p>Templado 8 mm · bano principal</p>
                    </div>
                  </div>
                </div>

                <div className={s.captureShowcase}>
                  <article className={`${s.captureFrame} ${s.captureFrameWide}`}>
                    <div className={s.captureToolbar}>
                      <div className={s.captureDots} aria-hidden>
                        <span />
                        <span />
                        <span />
                      </div>
                        <p>01 · Carga de componentes</p>
                    </div>

                    <div className={s.captureImageWrap}>
                      <Image
                        src="/brand/landing-paso2.png"
                        alt="Paso 2 real del flujo de cotizacion con componentes y resumen"
                        width={1284}
                        height={918}
                        className={s.captureImage}
                      />
                      <div className={`${s.captureMask} ${s.captureMaskPaso2TopRight}`} aria-hidden />
                    </div>
                  </article>

                  <div className={s.captureColumn}>
                    <article className={s.captureFrame}>
                      <div className={s.captureToolbar}>
                        <div className={s.captureDots} aria-hidden>
                          <span />
                          <span />
                          <span />
                        </div>
                        <p>02 · Resumen y cierre</p>
                      </div>

                      <div className={s.captureImageWrap}>
                        <Image
                          src="/brand/landing-paso3.png"
                          alt="Paso 3 real del flujo con total final y acciones de cierre"
                          width={1272}
                          height={912}
                          className={s.captureImage}
                        />
                        <div className={`${s.captureMask} ${s.captureMaskPaso3TopRight}`} aria-hidden />
                      </div>
                    </article>

                    <article className={`${s.captureFrame} ${s.captureFrameDark}`}>
                      <div className={s.captureToolbar}>
                        <div className={s.captureDots} aria-hidden>
                          <span />
                          <span />
                          <span />
                        </div>
                        <p>03 · Salida comercial</p>
                      </div>

                      <div className={s.commerceGrid}>
                        <div className={s.captureImageWrap}>
                          <Image
                            src="/brand/landing-pdf.png"
                            alt="Vista previa real del PDF comercial"
                            width={728}
                            height={912}
                            className={s.captureImage}
                          />
                          <div className={`${s.captureMask} ${s.captureMaskPdfLink}`} aria-hidden />
                        </div>
                        <div className={s.captureImageWrap}>
                          <Image
                            src="/brand/landing-share.png"
                            alt="Compartir real del PDF por WhatsApp"
                            width={526}
                            height={506}
                            className={s.captureImage}
                          />
                          <div className={`${s.captureMask} ${s.captureMaskShareTop}`} aria-hidden />
                          <div className={`${s.captureMask} ${s.captureMaskShareFile}`} aria-hidden />
                          <div className={`${s.captureMask} ${s.captureMaskSharePeople}`} aria-hidden />
                        </div>
                      </div>
                    </article>

                    <article className={s.captureFrame}>
                      <div className={s.captureToolbar}>
                        <div className={s.captureDots} aria-hidden>
                          <span />
                          <span />
                          <span />
                        </div>
                        <p>04 · Clientes y seguimiento</p>
                      </div>

                      <div className={s.captureImageWrap}>
                        <Image
                          src="/brand/landing-clientes.png"
                          alt="Vista real de clientes con estado y seguimiento comercial"
                          width={1355}
                          height={904}
                          className={s.captureImage}
                        />
                        <div className={`${s.captureMask} ${s.captureMaskClientesTopRight}`} aria-hidden />
                      </div>
                    </article>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={s.advantageSection}>
        <div className={s.container}>
          <div className={s.advantageShell}>
            <div className={s.advantageCopy}>
              <div className={s.sectionTag}>Hecho para el rubro</div>
              <h2 className={s.sectionTitleLight}>No es software para programadores. Es una herramienta para vender mejor.</h2>
              <p className={s.sectionTextLight}>
                El tono, la interfaz y la salida comercial estan pensados para talleres, instaladores y vendedores
                tecnicos que necesitan avanzar desde la obra.
              </p>

              <motion.div
                className={s.advantageList}
                variants={staggerList}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
              >
                {advantagePoints.map((point) => (
                  <motion.div key={point} className={s.advantageItem} variants={revealUp}>
                    <FaHammer aria-hidden />
                    <span>{point}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div className={s.proofPanel}>
              <motion.div
                className={s.statsGrid}
                variants={staggerList}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
              >
                {stats.map((stat) => (
                  <motion.div key={stat.label} className={s.statCard} variants={revealUp}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </motion.div>
                ))}
              </motion.div>

              <blockquote className={s.testimonial}>
                <p>
                  "Se ve mas serio que cualquier PDF que sacabamos antes. Ahora el cliente entiende y responde mas
                  rapido."
                </p>
                <footer>Instalador de aluminio · Santiago</footer>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className={s.faqSection}>
        <div className={s.container}>
          <div className={s.sectionHeadingDark}>
            <div className={s.sectionTagLight}>FAQ</div>
            <h2 className={s.sectionTitleDark}>Todo lo importante, sin ruido.</h2>
            <p className={s.sectionTextDark}>
              Respuestas claras para entender si Ventora encaja con la forma real en que hoy cotizas.
            </p>
          </div>

          <div className={s.faqList}>
            {faqs.map((faq, index) => (
              <article key={faq.question} className={s.faqItem}>
                <button
                  type="button"
                  className={s.faqQuestion}
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  aria-expanded={faqOpen === index}
                >
                  <span>{faq.question}</span>
                  <FaPlus className={faqOpen === index ? s.faqIconOpen : s.faqIcon} aria-hidden />
                </button>
                <div className={`${s.faqAnswer} ${faqOpen === index ? s.faqAnswerOpen : ""}`}>
                  <p>{faq.answer}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className={s.ctaSection}>
        <div className={s.container}>
          <div className={s.ctaShell}>
            <div className={s.ctaCopy}>
              <div className={s.sectionTag}>Cierre comercial</div>
              <h2 className={s.sectionTitleLight}>Si tu competencia se ve improvisada, la presentacion tambien vende.</h2>
              <p className={s.sectionTextLight}>
                Ventora esta pensado para que la primera impresion ya se sienta mas profesional, mas clara y mas lista
                para cerrar.
              </p>
            </div>

            <div className={s.ctaActions}>
              <Link href="/planes" className={s.primaryButton}>
                Probar demo
                <FaArrowRight aria-hidden />
              </Link>
              <a href="mailto:contacto@vidriossaas.cl" className={s.secondaryButtonDark}>
                Hablar con ventas
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerInner}>
            <div className={s.footerBrand}>
              <Image src="/brand/ventora-logo-navy.svg" alt="Ventora" width={150} height={36} />
              <p>Software comercial para vidrios y aluminio hecho para vender mejor en Chile.</p>
            </div>

            <div className={s.footerLinks}>
              {navLinks.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
              <Link href="/login">Ingresar</Link>
            </div>

            <div className={s.footerCopy}>© {CURRENT_YEAR} Ventora · Industrial, claro y listo para terreno</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
