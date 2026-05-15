import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lato, Syne } from "next/font/google";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuClipboardCheck,
  LuClock3,
  LuMapPin,
  LuMessageCircleMore,
  LuShieldCheck,
  LuStar,
} from "react-icons/lu";

import {
  formatDiasAtencionLabel,
  formatHorarioPorDiaLabel,
  hexToRgbChannels,
  isOrganizationOpenAtDate,
} from "@/features/organization-profile/services/organization-profile.service";
import {
  getCachedPublicGalleryByOrganizationId,
  getCachedPublicRequestConfig,
} from "@/features/solicitudes/services/solicitudes-public-cache.server";
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
  { src: "/brand/screen2.png", label: "Ventanas" },
  { src: "/brand/screen.png", label: "Shower" },
  { src: "/brand/landing-pdf.png", label: "Terraza" },
  { src: "/brand/logosanmarco.jpg", label: "Mampara" },
] as const;

export const revalidate = 300;

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
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
}: PageProps) {
  const { empresa } = await params;
  const config = await getCachedPublicRequestConfig(empresa);

  if (!config) {
    notFound();
  }

  const isAvailable = isOrganizationOpenAtDate({
    schedule: config.solicitudPublicaHorarioPorDia,
    days: config.solicitudPublicaDiasAtencion,
    from: config.solicitudPublicaHorarioDesde,
    to: config.solicitudPublicaHorarioHasta,
  });

  const availabilityLabel = isAvailable ? "Activo" : "Fuera de horario";
  const locationLabel = resolveLocationLabel(config.empresaDireccion);
  const whatsappUrl = buildPublicLeadWhatsappUrl(config.empresaTelefono);
  const horarioLabel = config.solicitudPublicaHorarioPorDia.length
    ? formatHorarioPorDiaLabel(config.solicitudPublicaHorarioPorDia)
    : `${formatDiasAtencionLabel(
        config.solicitudPublicaDiasAtencion
      )} ${config.solicitudPublicaHorarioDesde}-${config.solicitudPublicaHorarioHasta}`;

  const displayName = config.isPublished && config.publicName
    ? config.publicName
    : config.empresaNombre;

  const heroTitle = config.isPublished && config.heroTitle
    ? config.heroTitle
    : "Cotiza vidrios y aluminio en menos de 1 minuto";

  const heroSubtitle = config.isPublished && config.heroSubtitle
    ? config.heroSubtitle
    : null;

  const heroMode = config.isPublished ? config.heroMode : "gradient";
  const heroImageUrl = config.isPublished && heroMode === "image" && config.heroImageUrl
    ? config.heroImageUrl
    : null;

  const secondaryColor = config.isPublished && config.secondaryColor
    ? config.secondaryColor
    : "#25d366";

  const formTitle = config.isPublished && config.formTitle
    ? config.formTitle
    : "Deja tu solicitud";

  const formSubtitle = config.isPublished && config.formSubtitle
    ? config.formSubtitle
    : null;

  const showGallery = config.isPublished ? config.showGallery : true;
  const showSchedule = config.isPublished ? config.showSchedule : true;
  const showRating = config.isPublished ? config.showRating : false;

  let galleryImages: { src: string; label: string }[] = [];

  if (showGallery && config.isPublished) {
    const realGallery = await getCachedPublicGalleryByOrganizationId(
      config.organizationId as number
    );

    if (realGallery.length > 0) {
      galleryImages = realGallery.map((item) => ({
        src: item.imageUrl,
        label: item.label || "",
      }));
    } else {
      galleryImages = PREVIEW_GALLERY.map((img) => ({
        src: img.src,
        label: img.label,
      }));
    }
  } else if (showGallery) {
    galleryImages = PREVIEW_GALLERY.map((img) => ({
      src: img.src,
      label: img.label,
    }));
  }

  return (
    <main
      className={`${s.root} ${landingBodyFont.variable} ${landingDisplayFont.variable}`}
      style={{
        ["--brand" as string]: config.brandColor,
        ["--brand-rgb" as string]: hexToRgbChannels(config.brandColor),
        ["--wa" as string]: secondaryColor,
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
            {heroImageUrl ? (
              <div className={s.heroBackgroundMedia} aria-hidden>
                <Image
                  src={heroImageUrl}
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
                      alt={displayName}
                      width={64}
                      height={64}
                      unoptimized
                    />
                  ) : (
                    <div className={s.logoFallback} aria-hidden>
                      {getInitials(displayName)}
                    </div>
                  )}

                  <div className={s.heroIdentityCopy}>
                    <strong>{displayName}</strong>
                    {config.isPublished && config.publicSubtitle ? (
                      <span className={s.heroSubtitleText}>{config.publicSubtitle}</span>
                    ) : null}
                  </div>
                </div>

                <div className={s.heroStatusBadge} data-active={isAvailable}>
                  <span className={s.availabilityDot} aria-hidden />
                  {availabilityLabel}
                </div>
              </div>

              <div className={s.heroMainCopy}>
                <h1 className={s.heroTitle}>
                  {heroTitle}
                </h1>
                {heroSubtitle ? (
                  <p className={s.heroSubtitleMain}>{heroSubtitle}</p>
                ) : null}
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
                  {formTitle}
                </a>
              </div>

              <div className={s.heroTrustRow}>
                <span className={s.heroTrustMini}>
                  <LuClipboardCheck aria-hidden />
                  Solicitud registrada
                </span>
                <span className={s.heroTrustDivider} aria-hidden>
                  ·
                </span>
                <span className={s.heroTrustMini}>
                  <LuShieldCheck aria-hidden />
                  Sin compromiso
                </span>
              </div>
            </div>
          </article>
        </section>

        {showRating && config.isPublished && (config.ratingLabel || config.jobsCountLabel) ? (
          <section className={s.ratingSection}>
            {config.ratingLabel ? (
              <div className={s.ratingBadge}>
                <LuStar aria-hidden />
                <strong>{config.ratingLabel}</strong>
              </div>
            ) : null}
            {config.jobsCountLabel ? (
              <div className={s.ratingBadge}>
                <strong>{config.jobsCountLabel}</strong>
              </div>
            ) : null}
          </section>
        ) : null}

        {galleryImages.length ? (
          <section className={s.gallerySection} aria-label="Trabajos recientes">
            <div className={s.galleryHeader}>
              <span className={s.sectionEyebrow}>Trabajos recientes</span>
            </div>

            <div className={s.galleryRail}>
              {galleryImages.map((image, index) => (
                <article key={`${image.src}-${index}`} className={s.galleryCard}>
                  <div className={s.galleryImageWrap}>
                    <Image
                      src={image.src}
                      alt={image.label || `Trabajo reciente ${index + 1}`}
                      fill
                      className={s.galleryImage}
                      unoptimized
                    />
                    {image.label ? (
                      <span className={s.galleryTag}>{image.label}</span>
                    ) : null}
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
              {showSchedule ? (
                <div className={s.stepsSupportItem}>
                  <LuClock3 aria-hidden />
                  <span>{horarioLabel}</span>
                </div>
              ) : null}
              {locationLabel ? (
                <div className={s.stepsSupportItem}>
                  <LuMapPin aria-hidden />
                  <span>{locationLabel}</span>
                </div>
              ) : null}
              <div className={s.stepsSupportItem}>
                <LuClipboardCheck aria-hidden />
                <span>Solicitud registrada</span>
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
              formTitle={formTitle}
              formSubtitle={formSubtitle ?? undefined}
            />
          </section>
        </section>

        <footer className={s.brandFooter} aria-label="Ventora">
          <div className={s.brandFooterLine} aria-hidden />
          <div className={s.brandFooterSeal}>
            <div className={s.brandFooterLogoWrap} aria-hidden>
              <Image
                src="/brand/ventora-logo-black.svg"
                alt=""
                width={148}
                height={33}
                className={s.brandFooterLogo}
                unoptimized
              />
            </div>
            <p className={s.brandFooterText}>
              Esta empresa gestiona sus solicitudes con Ventora
            </p>
          </div>
        </footer>
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
