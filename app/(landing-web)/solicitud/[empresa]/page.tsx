import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lato, Syne } from "next/font/google";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuClipboardCheck,
  LuClock3,
  LuHammer,
  LuLock,
  LuMapPin,
  LuMessageCircleMore,
  LuShieldCheck,
} from "react-icons/lu";

import {
  DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA,
  DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
  DEFAULT_SOLICITUD_PUBLICA_VALOR,
  formatDiasAtencionLabel,
  hexToRgbChannels,
  isOrganizationOpenAtDate,
} from "@/features/organization-profile/services/organization-profile.service";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";
import { buildPublicLeadWhatsappUrl } from "@/utils/whatsapp";

import { SolicitudEmpresaForm } from "./solicitud-empresa-form";
import s from "./page.module.css";

const landingBodyFont = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-landing-body",
});

const landingDisplayFont = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-landing-display",
});

type PageProps = {
  params: Promise<{
    empresa: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type BenefitItem = {
  title: string;
  copy: string;
  icon: IconType;
  tone: "brand" | "emerald" | "slate";
};

type StepItem = {
  title: string;
  copy: string;
};

const SPECIALTIES = [
  "Ventanas termopanel",
  "Shower doors",
  "Cierres de terraza",
  "Mamparas de bano",
  "Puertas de vidrio",
  "Reparaciones",
] as const;

const STEPS: StepItem[] = [
  {
    title: "Cuentanos que necesitas",
    copy: "Tipo de trabajo, comuna, medidas o foto.",
  },
  {
    title: "Te contactamos por WhatsApp",
    copy: "Confirmamos detalles y revisamos mejor opcion.",
  },
  {
    title: "Recibes tu cotizacion",
    copy: "Propuesta comercial clara y sin compromiso.",
  },
] as const;

const PREVIEW_GALLERY = [
  {
    src: "/brand/logosanmarco.jpg",
    alt: "Referencia visual 1",
  },
  {
    src: "/brand/landing-pdf.png",
    alt: "Referencia visual 2",
  },
  {
    src: "/brand/screen2.png",
    alt: "Referencia visual 3",
  },
] as const;

export const dynamic = "force-dynamic";

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function readString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function resolveLocationLabel(address: string) {
  const clean = address.trim();

  if (!clean) {
    return null;
  }

  const chunks = clean
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.at(-1) ?? clean;
}

export default async function SolicitudEmpresaPage({
  params,
  searchParams,
}: PageProps) {
  const { empresa } = await params;
  const sp = await searchParams;
  const config = await solicitudesContactoService.getPublicRequestConfig(empresa);

  if (!config) {
    notFound();
  }

  const isAvailable = isOrganizationOpenAtDate({
    days: config.solicitudPublicaDiasAtencion,
    from: config.solicitudPublicaHorarioDesde,
    to: config.solicitudPublicaHorarioHasta,
  });

  const availabilityLabel = isAvailable ? "Disponible ahora" : "Fuera de horario";
  const locationLabel = resolveLocationLabel(config.empresaDireccion);
  const descriptionShort =
    config.solicitudPublicaDescripcionCorta ||
    DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA;
  const trustMessage =
    config.solicitudPublicaMensajeConfianza ||
    DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA;
  const whatsappUrl = buildPublicLeadWhatsappUrl(config.empresaTelefono);
  const horarioLabel = `${formatDiasAtencionLabel(
    config.solicitudPublicaDiasAtencion
  )} - ${config.solicitudPublicaHorarioDesde} - ${config.solicitudPublicaHorarioHasta}`;
  const responseCopy =
    config.solicitudPublicaValor || DEFAULT_SOLICITUD_PUBLICA_VALOR;
  const heroLead = whatsappUrl
    ? "Recibe una respuesta por WhatsApp y deja tu solicitud registrada."
    : "Deja tu solicitud y recibe una respuesta comercial clara.";

  const benefits: BenefitItem[] = [
    {
      title: "Te respondemos rapido",
      copy: responseCopy,
      icon: LuMessageCircleMore,
      tone: "brand",
    },
    {
      title: "Horario claro",
      copy: horarioLabel,
      icon: LuClock3,
      tone: "emerald",
    },
    {
      title: "Visita e instalacion",
      copy: "Medicion, propuesta y montaje segun el trabajo.",
      icon: LuHammer,
      tone: "slate",
    },
  ];

  return (
    <main
      className={`${s.root} ${landingBodyFont.variable} ${landingDisplayFont.variable}`}
      style={{
        ["--brand" as string]: config.brandColor,
        ["--brand-rgb" as string]: hexToRgbChannels(config.brandColor),
      }}
    >
      <div className={s.shell}>
        <header className={s.topBar}>
          <Link href="/" className={s.backButton} aria-label="Volver al inicio">
            <LuArrowLeft aria-hidden />
          </Link>

          <div className={s.topCenter}>
            <span className={s.topSlug}>
              {`VENTORAP.CL/${config.solicitudPublicaSlug.toUpperCase()}`}
            </span>
          </div>

          <div className={s.topStatus} data-active={isAvailable}>
            <span className={s.topStatusDot} aria-hidden />
            {isAvailable ? "ON" : "OFF"}
          </div>
        </header>

        <section className={s.heroSection}>
          <div className={s.heroCard}>
            <div className={s.heroIdentity}>
              {config.empresaLogoUrl ? (
                <Image
                  className={s.logo}
                  src={config.empresaLogoUrl}
                  alt={config.empresaNombre}
                  width={84}
                  height={84}
                  unoptimized
                />
              ) : (
                <div className={s.logoFallback} aria-hidden>
                  {getInitials(config.empresaNombre)}
                </div>
              )}
            </div>

            <div className={s.heroCopy}>
              <h1 className={s.title}>{config.empresaNombre}</h1>
              <p className={s.heroMeta}>
                Vidrios y aluminio
                {locationLabel ? (
                  <>
                    <span className={s.heroMetaDot}>-</span>
                    <span>{locationLabel}</span>
                  </>
                ) : null}
              </p>

              <div className={s.availabilityPill} data-active={isAvailable}>
                <span className={s.availabilityDot} aria-hidden />
                {availabilityLabel}
              </div>
            </div>

            <p className={s.heroLead}>{heroLead}</p>
            <p className={s.heroDescription}>{descriptionShort}</p>

            <div className={s.heroGuarantee}>
              <LuClipboardCheck aria-hidden />
              <div>
                <strong>Tu solicitud queda registrada</strong>
                <span>Aunque estemos ocupados, no se pierde.</span>
              </div>
            </div>

            <div className={s.heroActions}>
              {whatsappUrl ? (
                <a
                  className={s.primaryWhatsappCta}
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LuMessageCircleMore aria-hidden />
                  Hablar por WhatsApp
                </a>
              ) : null}

              <a className={s.secondaryFormCta} href="#solicitud-rapida">
                O deja tu solicitud en 1 minuto
              </a>
            </div>

            <div className={s.microTrust}>
              <div className={s.microTrustItem}>
                <LuShieldCheck aria-hidden />
                <span>Sin compromiso</span>
              </div>
              <div className={s.microTrustItem}>
                <LuBadgeCheck aria-hidden />
                <span>Respuesta por WhatsApp</span>
              </div>
              <div className={s.microTrustItem}>
                <LuLock aria-hidden />
                <span>Datos solo para esta solicitud</span>
              </div>
            </div>
          </div>

          <aside className={s.heroSideCard}>
            <span className={s.sideEyebrow}>Como atendemos</span>

            <div className={s.sideRow}>
              <LuClock3 aria-hidden />
              <div>
                <strong>Horario</strong>
                <span>{horarioLabel}</span>
              </div>
            </div>

            {locationLabel ? (
              <div className={s.sideRow}>
                <LuMapPin aria-hidden />
                <div>
                  <strong>Zona</strong>
                  <span>{locationLabel}</span>
                </div>
              </div>
            ) : null}

            <div className={s.sideTrustBox}>
              <strong>Atencion directa</strong>
              <p>{trustMessage}</p>
            </div>
          </aside>
        </section>

        {PREVIEW_GALLERY.length ? (
          <section className={s.gallerySection} aria-label="Referencias visuales">
            <div className={s.galleryHeader}>
              <span className={s.sectionEyebrow}>Referencias visuales</span>
              <p className={s.galleryIntro}>
                Asi se ve una seccion con imagenes cargadas. Luego se puede conectar
                a trabajos reales del maestro.
              </p>
            </div>

            <div className={s.galleryRail}>
              {PREVIEW_GALLERY.map((image, index) => (
                <article key={image.src} className={s.galleryCard}>
                  <div className={s.galleryImageWrap}>
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className={s.galleryImage}
                      unoptimized
                    />
                  </div>
                  <div className={s.galleryCaption}>
                    <strong>Referencia {index + 1}</strong>
                    <span>Vista de ejemplo para la mini landing publica.</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={s.benefitsSection} aria-label="Beneficios de contacto">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article key={benefit.title} className={s.benefitCard}>
                <div className={s.benefitIconWrap} data-tone={benefit.tone}>
                  <Icon className={s.benefitIcon} aria-hidden />
                </div>
                <div className={s.benefitCopy}>
                  <strong>{benefit.title}</strong>
                  <p>{benefit.copy}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className={s.mainGrid}>
          <div className={s.contentStack}>
            <section className={s.sectionCard}>
              <span className={s.sectionEyebrow}>Como funciona</span>
              <div className={s.stepsList}>
                {STEPS.map((step, index) => (
                  <article key={step.title} className={s.stepCard}>
                    <div className={s.stepNumber}>{index + 1}</div>
                    <div className={s.stepCopy}>
                      <strong>{step.title}</strong>
                      <p>{step.copy}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={s.sectionCard}>
              <span className={s.sectionEyebrow}>Especialidades</span>
              <div className={s.specialtiesList}>
                {SPECIALTIES.map((item) => (
                  <span key={item} className={s.specialtyChip}>
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <section className={s.formSection} aria-label="Formulario de solicitud">
            <SolicitudEmpresaForm
              slug={config.solicitudPublicaSlug}
              empresaTelefono={config.empresaTelefono}
              empresaEmail={config.empresaEmail}
              privacidad={config.solicitudPublicaPrivacidad}
              isAvailable={isAvailable}
              utmSource={readString(sp.utm_source)}
              utmMedium={readString(sp.utm_medium)}
              utmCampaign={readString(sp.utm_campaign)}
              sourceUrl={readString(sp.source_url)}
              origin={readString(sp.origen)}
            />
          </section>
        </section>
      </div>

      <div className={s.stickyBarWrap}>
        <div className={s.stickyBar}>
          <a className={s.stickySecondary} href="#solicitud-rapida">
            <LuBadgeCheck aria-hidden />
            <span>Enviar solicitud</span>
          </a>
          {whatsappUrl ? (
            <a
              className={s.stickyPrimary}
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LuMessageCircleMore aria-hidden />
              <span>Escribir por WhatsApp</span>
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}
