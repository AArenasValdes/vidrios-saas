import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lato, Syne } from "next/font/google";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuCircleCheck,
  LuClipboardCheck,
  LuClock3,
  LuMapPin,
  LuMessageCircleMore,
  LuShieldCheck,
  LuStar,
} from "react-icons/lu";
import { FaFacebookF, FaGlobe, FaInstagram, FaTiktok } from "react-icons/fa6";

import {
  formatDiasAtencionLabel,
  formatHorarioPorDiaLabel,
  hexToRgbChannels,
  isLightHexColor,
  isOrganizationOpenAtDate,
} from "@/features/organization-profile/services/organization-profile.service";
import {
  getCachedApprovedPublicTestimonialsByOrganizationId,
  getCachedPublicGalleryByOrganizationId,
  getCachedPublicRequestConfig,
} from "@/features/solicitudes/services/solicitudes-public-cache.server";
import {
  formatChileMobilePhone,
  normalizeChileMobilePhone,
} from "@/utils/chile-mobile-phone";
import { buildPublicLeadWhatsappUrl } from "@/utils/whatsapp";

import { SolicitudEmpresaForm } from "./solicitud-empresa-form";
import { SolicitudEmpresaTestimonialForm } from "./solicitud-empresa-testimonial-form";
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

const PREVIEW_GALLERY = [
  {
    src: "/brand/screen2.png",
    label: "Ventanas",
    workTitle: "Ventana corredera",
    workType: "Ventanas de aluminio",
    workZone: "Trabajo a medida",
    workBadge: "Instalado",
  },
  {
    src: "/brand/screen.png",
    label: "Shower",
    workTitle: "Shower door templado",
    workType: "Puertas de vidrio",
    workZone: "",
    workBadge: "Vidrio templado",
  },
  {
    src: "/brand/landing-pdf.png",
    label: "Terraza",
    workTitle: "Cierre de terraza",
    workType: "Cierres de terraza",
    workZone: "",
    workBadge: "A medida",
  },
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

function resolveServiceItems(config: {
  publicServices: string[];
  publicBusinessType: string;
}) {
  if (config.publicServices.length > 0) {
    return config.publicServices;
  }

  const fallback = config.publicBusinessType
    .split(/[·,|/]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(fallback));
}

function formatPublicPhone(phone: string) {
  const normalized = normalizeChileMobilePhone(phone);

  if (!normalized) {
    return phone.trim();
  }

  return `+56 9 ${formatChileMobilePhone(normalized)}`;
}

function buildSocialLinks(config: {
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
}) {
  return [
    config.instagramUrl
      ? {
          href: config.instagramUrl,
          label: "Instagram",
          icon: FaInstagram,
        }
      : null,
    config.facebookUrl
      ? {
          href: config.facebookUrl,
          label: "Facebook",
          icon: FaFacebookF,
        }
      : null,
    config.tiktokUrl
      ? {
          href: config.tiktokUrl,
          label: "TikTok",
          icon: FaTiktok,
        }
      : null,
    config.websiteUrl
      ? {
          href: config.websiteUrl,
          label: "Sitio web",
          icon: FaGlobe,
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: IconType;
  }>;
}

export default async function SolicitudEmpresaPage({ params }: PageProps) {
  const { empresa } = await params;
  const config = await getCachedPublicRequestConfig(empresa);

  if (!config) {
    notFound();
  }

  const accentColor = isLightHexColor(config.brandColor)
    ? "#335ea9"
    : config.brandColor;

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

  const displayName =
    config.isPublished && config.publicName ? config.publicName : config.empresaNombre;

  const heroTitle =
    config.isPublished && config.heroTitle
      ? config.heroTitle
      : "Cotiza vidrios y aluminio en menos de 1 minuto";

  const heroSubtitle =
    config.isPublished && config.heroSubtitle ? config.heroSubtitle : null;

  const heroMode = config.isPublished ? config.heroMode : "gradient";
  const heroImageUrl =
    config.isPublished && heroMode === "image" && config.heroImageUrl
      ? config.heroImageUrl
      : null;

  const formTitle =
    config.isPublished && config.formTitle ? config.formTitle : "Deja tu solicitud";

  const formSubtitle =
    config.isPublished && config.formSubtitle ? config.formSubtitle : null;

  const showGallery = config.isPublished ? config.showGallery : true;
  const showSchedule = config.isPublished ? config.showSchedule : true;
  const showRating = config.isPublished ? config.showRating : false;
  const serviceItems = resolveServiceItems(config);
  const socialLinks = buildSocialLinks(config);
  const formattedPhone = formatPublicPhone(config.empresaTelefono);

  const [galleryImages, approvedTestimonials] = await Promise.all([
    showGallery
      ? getCachedPublicGalleryByOrganizationId(config.organizationId)
      : Promise.resolve([]),
    showRating
      ? getCachedApprovedPublicTestimonialsByOrganizationId(config.organizationId)
      : Promise.resolve([]),
  ]);

  const resolvedGallery =
    galleryImages.length > 0
      ? galleryImages
      : showGallery
        ? PREVIEW_GALLERY.map((item, index) => ({
            id: `preview-${index}`,
            organizationId: config.organizationId,
            imageUrl: item.src,
            label: item.label,
            workTitle: item.workTitle,
            workType: item.workType,
            workZone: item.workZone,
            workBadge: item.workBadge,
            sortOrder: index,
            isVisible: true,
            creadoEn: null,
          }))
        : [];

  const approvedTestimonialsCount = approvedTestimonials.length;
  const averageRating = approvedTestimonialsCount
    ? (
        approvedTestimonials.reduce((sum, item) => sum + item.estrellas, 0) /
        approvedTestimonialsCount
      ).toFixed(1)
    : null;

  const trustItems = [
    {
      icon: LuClipboardCheck,
      title: "Solicitud registrada",
      copy: "Aunque estemos ocupados, tu consulta no se pierde.",
    },
    {
      icon: LuShieldCheck,
      title: "Respuesta comercial",
      copy: config.solicitudPublicaValor,
    },
    {
      icon: LuBadgeCheck,
      title: "Atencion local",
      copy: config.publicZone || locationLabel || "Atendemos segun tu zona.",
    },
  ];

  return (
    <main
      className={`${s.root} ${landingBodyFont.variable} ${landingDisplayFont.variable}`}
      style={{
        ["--brand" as string]: accentColor,
        ["--brand-rgb" as string]: hexToRgbChannels(accentColor),
        ["--wa" as string]: config.secondaryColor,
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
                      <span className={s.heroSubtitleText}>
                        {config.publicSubtitle}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className={s.heroStatusBadge} data-active={isAvailable}>
                  <span className={s.availabilityDot} aria-hidden />
                  {availabilityLabel}
                </div>
              </div>

              <div className={s.heroMainCopy}>
                <h1 className={s.heroTitle}>{heroTitle}</h1>
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
                {showRating && config.ratingLabel ? (
                  <span className={s.heroTrustMini}>
                    <LuStar aria-hidden />
                    {config.ratingLabel}
                  </span>
                ) : null}
                {showRating && config.jobsCountLabel ? (
                  <span className={s.heroTrustMini}>
                    <LuCircleCheck aria-hidden />
                    {config.jobsCountLabel}
                  </span>
                ) : null}
                <span className={s.heroTrustMini}>
                  <LuShieldCheck aria-hidden />
                  Sin compromiso
                </span>
              </div>
            </div>
          </article>
        </section>

        <section className={s.quickTrustSection} aria-label="Senales rapidas de confianza">
          <div className={s.quickTrustRail}>
            {trustItems.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className={s.quickTrustCard}>
                  <div className={s.quickTrustIcon}>
                    <Icon aria-hidden />
                  </div>
                  <div className={s.quickTrustCopy}>
                    <strong>{item.title}</strong>
                    <span>{item.copy}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {serviceItems.length > 0 ? (
          <section className={s.sectionCard}>
            <div className={s.sectionHeader}>
              <span className={s.sectionEyebrow}>Servicios que realizamos</span>
              <p className={s.sectionLead}>
                Tipos de trabajo que mas nos piden nuestros clientes.
              </p>
            </div>

            <div className={s.serviceRail}>
              {serviceItems.map((service) => (
                <span key={service} className={s.serviceChip}>
                  {service}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {resolvedGallery.length > 0 ? (
          <section className={s.gallerySection} aria-label="Trabajos recientes">
            <div className={s.sectionHeader}>
              <span className={s.sectionEyebrow}>Trabajos recientes</span>
              <p className={s.sectionLead}>
                Algunas referencias reales de trabajos hechos a medida.
              </p>
            </div>

            <div className={s.galleryRail}>
              {resolvedGallery.map((image, index) => (
                <article key={`${image.imageUrl}-${index}`} className={s.portfolioCard}>
                  <div className={s.galleryImageWrap}>
                    <Image
                      src={image.imageUrl}
                      alt={image.workTitle || image.label || `Trabajo ${index + 1}`}
                      fill
                      className={s.galleryImage}
                      unoptimized
                    />
                    {image.workBadge ? (
                      <span className={s.galleryTag}>{image.workBadge}</span>
                    ) : null}
                  </div>
                  <div className={s.portfolioBody}>
                    <strong>{image.workTitle || image.label || "Trabajo reciente"}</strong>
                    <span>
                      {[image.workType, image.workZone].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {config.publicZone || showSchedule ? (
          <section className={s.sectionCard}>
            <div className={s.sectionHeader}>
              <span className={s.sectionEyebrow}>Atendemos en</span>
            </div>

            <div className={s.coverageCard}>
              {config.publicZone ? (
                <p className={s.coverageTitle}>{config.publicZone}</p>
              ) : null}
              {showSchedule ? (
                <p className={s.coverageMeta}>
                  <LuClock3 aria-hidden />
                  <span>{horarioLabel}</span>
                </p>
              ) : null}
              {config.businessHoursNote ? (
                <p className={s.coverageText}>{config.businessHoursNote}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className={s.mainGrid}>
          <section className={s.sectionCard}>
            <span className={s.sectionEyebrow}>Como funciona</span>
            <div className={s.stepsInline}>
              {[
                { title: "Envias", copy: "tu necesidad" },
                { title: "Ordenamos", copy: "la solicitud" },
                { title: "Respondemos", copy: "por WhatsApp" },
              ].map((step, index) => (
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
                <span>{config.solicitudPublicaMensajeConfianza}</span>
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

        {showRating && approvedTestimonialsCount > 0 ? (
          <section className={s.sectionCard}>
            <div className={s.sectionHeader}>
              <span className={s.sectionEyebrow}>Clientes que confiaron en nosotros</span>
              <div className={s.testimonialSummaryPublic}>
                <strong>{`★★★★★ ${averageRating}`}</strong>
                <span>{`${approvedTestimonialsCount} valoraciones`}</span>
              </div>
            </div>

            <div className={s.testimonialPublicRail}>
              {approvedTestimonials.slice(0, 3).map((item) => (
                <article key={String(item.id)} className={s.testimonialPublicCard}>
                  <div className={s.testimonialPublicTop}>
                    <strong>{item.nombreCorto || "Cliente"}</strong>
                    <span>{`${"★".repeat(item.estrellas)}${"☆".repeat(
                      5 - item.estrellas
                    )}`}</span>
                  </div>
                  <p>{item.comentario}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={s.finalCtaSection}>
          <div className={s.finalCtaCard}>
            <div className={s.finalCtaCopy}>
              <span className={s.sectionEyebrow}>Solicitud directa</span>
              <h2>{config.finalCtaTitle}</h2>
              <p>{config.finalCtaSubtitle}</p>
            </div>
            <a className={s.finalCtaButton} href="#solicitud-rapida">
              {config.finalCtaLabel}
            </a>
          </div>
        </section>

        <footer className={s.companyFooter} aria-label="Datos de la empresa">
          <div className={s.companyFooterAccent} aria-hidden />
          <div className={s.companyFooterMain}>
            <div className={s.companyFooterIdentity}>
              {config.empresaLogoUrl ? (
                <Image
                  className={s.footerLogo}
                  src={config.empresaLogoUrl}
                  alt={displayName}
                  width={56}
                  height={56}
                  unoptimized
                />
              ) : (
                <div className={s.footerLogoFallback} aria-hidden>
                  {getInitials(displayName)}
                </div>
              )}

              <div className={s.companyFooterCopy}>
                <strong>{displayName}</strong>
                <span>{config.publicSubtitle || config.publicBusinessType}</span>
                {formattedPhone ? <span>{formattedPhone}</span> : null}
                {config.publicZone ? <span>{config.publicZone}</span> : null}
                {showSchedule ? <span>{horarioLabel}</span> : null}
              </div>
            </div>

            <div className={s.footerActions}>
              {socialLinks.length > 0 ? (
                <div className={s.socialRail}>
                  {socialLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <a
                        key={item.label}
                        className={s.socialLink}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.label}
                      >
                        <Icon aria-hidden />
                      </a>
                    );
                  })}
                </div>
              ) : null}

              {whatsappUrl ? (
                <a
                  className={s.footerWhatsappButton}
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LuMessageCircleMore aria-hidden />
                  Escribir por WhatsApp
                </a>
              ) : (
                <a className={s.footerWhatsappButton} href="#solicitud-rapida">
                  Solicitar cotizacion
                </a>
              )}
            </div>
          </div>

          {showRating ? (
            <SolicitudEmpresaTestimonialForm slug={config.solicitudPublicaSlug} />
          ) : null}

          <p className={s.brandFooterText}>Solicitudes gestionadas con Ventora</p>
        </footer>
      </div>

      <div className={s.stickyBarWrap}>
        <div className={s.stickyBar}>
          <a className={s.stickySecondary} href="#solicitud-rapida">
            <LuBadgeCheck aria-hidden />
            <span>Solicitar cotizacion</span>
          </a>
          {whatsappUrl ? (
            <a
              className={s.stickyPrimary}
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LuMessageCircleMore aria-hidden />
              <span>WhatsApp</span>
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}
