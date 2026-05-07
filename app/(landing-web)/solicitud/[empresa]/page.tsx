import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lato, Syne } from "next/font/google";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuClipboardCheck,
  LuClock3,
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

type StepItem = {
  title: string;
  copy: string;
};

const STEPS: StepItem[] = [
  { title: "Elige", copy: "tu trabajo" },
  { title: "Envia", copy: "tus datos" },
  { title: "Te contactan", copy: "por WhatsApp" },
] as const;

const PREVIEW_GALLERY = [
  "/brand/screen2.png",
  "/brand/screen.png",
  "/brand/landing-pdf.png",
  "/brand/logosanmarco.jpg",
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

  const availabilityLabel = isAvailable ? "Activo" : "Fuera de horario";
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
    ? "Te respondemos por WhatsApp y tu solicitud queda registrada."
    : "Tu solicitud queda registrada y te responderemos con una propuesta clara.";
  const heroImage = PREVIEW_GALLERY[0] ?? null;
  const galleryImages = PREVIEW_GALLERY.slice(heroImage ? 1 : 0, 6);

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
          <article className={s.heroPanel}>
            {heroImage ? (
              <div className={s.heroBackgroundMedia} aria-hidden>
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  className={s.heroBackgroundImage}
                  unoptimized
                />
              </div>
            ) : (
              <div className={s.heroFallback} aria-hidden />
            )}

            <div className={s.heroOverlay} />

            <div className={s.heroContent}>
              <div className={s.heroTopRow}>
                <div className={s.heroIdentityBlock}>
                  {config.empresaLogoUrl ? (
                    <Image
                      className={s.logo}
                      src={config.empresaLogoUrl}
                      alt={config.empresaNombre}
                      width={64}
                      height={64}
                      unoptimized
                    />
                  ) : (
                    <div className={s.logoFallback} aria-hidden>
                      {getInitials(config.empresaNombre)}
                    </div>
                  )}

                  <div className={s.heroIdentityCopy}>
                    <strong>{config.empresaNombre}</strong>
                    <span>
                      Santiago RM - Vidrios y aluminio
                      {locationLabel ? ` - ${locationLabel}` : ""}
                    </span>
                  </div>
                </div>

                <div className={s.heroStatusBadge} data-active={isAvailable}>
                  <span className={s.availabilityDot} aria-hidden />
                  {availabilityLabel}
                </div>
              </div>

              <div className={s.heroMainCopy}>
                <h1 className={s.heroTitle}>
                  Cotiza vidrios y aluminio en menos de 1 minuto
                </h1>
                <p className={s.heroLead}>{heroLead}</p>
                <p className={s.heroSupportNote}>{descriptionShort}</p>
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
                    Cotizar por WhatsApp
                  </a>
                ) : null}

                <a className={s.secondaryHeroCta} href="#solicitud-rapida">
                  Dejar solicitud rapida
                </a>
              </div>

              <div className={s.heroTrustRow}>
                <div className={s.heroTrustPill}>
                  <LuClipboardCheck aria-hidden />
                  <span>Tu solicitud queda registrada</span>
                </div>
                <div className={s.heroTrustMeta}>
                  <LuShieldCheck aria-hidden />
                  <span>Sin compromiso</span>
                  <span className={s.heroTrustSeparator}>-</span>
                  <span>{responseCopy}</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        {galleryImages.length ? (
          <section className={s.gallerySection} aria-label="Trabajos recientes">
            <div className={s.galleryHeader}>
              <span className={s.sectionEyebrow}>Trabajos recientes</span>
            </div>

            <div className={s.galleryRail}>
              {galleryImages.map((image, index) => (
                <article key={image} className={s.galleryCard}>
                  <div className={s.galleryImageWrap}>
                    <Image
                      src={image}
                      alt={`Trabajo reciente ${index + 1}`}
                      fill
                      className={s.galleryImage}
                      unoptimized
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={s.mainGrid}>
          <section className={s.sectionCard}>
            <span className={s.sectionEyebrow}>Como funciona</span>
            <div className={s.stepsInline}>
              {STEPS.map((step, index) => (
                <article key={step.title} className={s.stepMiniCard}>
                  <div className={s.stepNumber}>{index + 1}</div>
                  <div className={s.stepMiniCopy}>
                    <strong>{step.title}</strong>
                    <span>{step.copy}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className={s.stepsSupportRow}>
              <div className={s.stepsSupportItem}>
                <LuClock3 aria-hidden />
                <span>{horarioLabel}</span>
              </div>
              {locationLabel ? (
                <div className={s.stepsSupportItem}>
                  <LuMapPin aria-hidden />
                  <span>{locationLabel}</span>
                </div>
              ) : null}
              <div className={s.stepsSupportItem}>
                <LuLock aria-hidden />
                <span>{trustMessage}</span>
              </div>
            </div>
          </section>

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
