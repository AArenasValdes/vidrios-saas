import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lato, Syne } from "next/font/google";
import { Suspense } from "react";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuCircleCheck,
  LuClock3,
  LuClipboardCheck,
  LuMapPin,
  LuMessageCircleMore,
  LuPhone,
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
import { TrackedExternalLink } from "@/features/analytics/components/tracked-external-link";
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
  searchParams?: Promise<{
    preview?: string | string[];
  }>;
};

const SERVICE_ICONS: Record<string, string> = {
  Ventanas: "window",
  Ventana: "window",
  Shower: "shower",
  Terraza: "terrace",
  Terrazas: "terrace",
  Puerta: "door",
  Puertas: "door",
  Mampara: "partition",
  Mamparas: "partition",
  Termopanel: "thermal",
  Termopanels: "thermal",
};

export const revalidate = 300;

function isPreviewEnabled(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized) {
    return false;
  }

  return ["1", "true", "preview"].includes(normalized.trim().toLowerCase());
}

function getServiceIcon(name: string) {
  for (const key of Object.keys(SERVICE_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return SERVICE_ICONS[key];
    }
  }
  return "default";
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function mixHexColor(base: string, target: string, amount: number) {
  const weight = Math.min(1, Math.max(0, amount));
  const from = base.replace("#", "");
  const to = target.replace("#", "");

  if (from.length !== 6 || to.length !== 6) {
    return base;
  }

  const channels = [0, 2, 4].map((offset) => {
    const baseChannel = Number.parseInt(from.slice(offset, offset + 2), 16);
    const targetChannel = Number.parseInt(to.slice(offset, offset + 2), 16);
    const mixed = Math.round(baseChannel + (targetChannel - baseChannel) * weight);

    return mixed.toString(16).padStart(2, "0");
  });

  return `#${channels.join("")}`;
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

export default async function SolicitudEmpresaPage({
  params,
  searchParams,
}: PageProps) {
  const [{ empresa }, resolvedSearchParams] = await Promise.all([
    params,
    (searchParams ??
      Promise.resolve({
        preview: undefined,
      })) as Promise<{
      preview?: string | string[];
    }>,
  ]);
  const config = await getCachedPublicRequestConfig(empresa);

  if (!config || !config.isPublished) {
    notFound();
  }

  const accentColor = isLightHexColor(config.brandColor)
    ? "#335ea9"
    : config.brandColor;
  const brandStrong = mixHexColor(accentColor, "#0f172a", 0.28);
  const footerBase = mixHexColor(accentColor, "#020617", 0.62);
  const footerPanel = mixHexColor(accentColor, "#0f172a", 0.48);
  const footerHighlight = mixHexColor(accentColor, "#ffffff", 0.18);

  const isAvailable = isOrganizationOpenAtDate({
    schedule: config.solicitudPublicaHorarioPorDia,
    days: config.solicitudPublicaDiasAtencion,
    from: config.solicitudPublicaHorarioDesde,
    to: config.solicitudPublicaHorarioHasta,
  });

  const availabilityLabel = isAvailable ? "Abierto" : "Cerrado";
  const whatsappUrl = buildPublicLeadWhatsappUrl(config.empresaTelefono);
  const horarioLabel = config.solicitudPublicaHorarioPorDia.length
    ? formatHorarioPorDiaLabel(config.solicitudPublicaHorarioPorDia)
    : `${formatDiasAtencionLabel(
        config.solicitudPublicaDiasAtencion,
      )} ${config.solicitudPublicaHorarioDesde}-${config.solicitudPublicaHorarioHasta}`;
  const displayName = config.publicName;
  const heroTitle = config.heroTitle;
  const heroSubtitle = config.heroSubtitle;
  const heroMode = config.heroMode;
  const heroImageUrl =
    heroMode === "image" && config.heroImageUrl ? config.heroImageUrl : null;
  const formTitle = config.formTitle;
  const formSubtitle = config.formSubtitle;
  const showGallery = config.showGallery;
  const showSchedule = config.showSchedule;
  const showRating = config.showRating;
  const serviceItems = resolveServiceItems(config);
  const socialLinks = buildSocialLinks(config);
  const formattedPhone = formatPublicPhone(config.empresaTelefono);
  const isPreview = isPreviewEnabled(resolvedSearchParams.preview);

  const [galleryImages, approvedTestimonials] = await Promise.all([
    showGallery
      ? getCachedPublicGalleryByOrganizationId(config.organizationId)
      : Promise.resolve([]),
    showRating
      ? getCachedApprovedPublicTestimonialsByOrganizationId(config.organizationId)
      : Promise.resolve([]),
  ]);

  const resolvedGallery = galleryImages;

  const approvedTestimonialsCount = approvedTestimonials.length;
  const averageRating = approvedTestimonialsCount
    ? (
        approvedTestimonials.reduce((sum, item) => sum + item.estrellas, 0) /
        approvedTestimonialsCount
      ).toFixed(1)
    : null;

  const featuredServices = serviceItems.slice(0, 3);
  const chipServices = serviceItems.slice(3);

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
      title: "Sin compromiso",
      copy: "Solicita y cotiza sin costo.",
    },
  ];

  return (
    <main
      className={`${s.root} ${landingBodyFont.variable} ${landingDisplayFont.variable}`}
      style={{
        ["--brand" as string]: accentColor,
        ["--brand-rgb" as string]: hexToRgbChannels(accentColor),
        ["--brand-strong" as string]: brandStrong,
        ["--footer-base" as string]: footerBase,
        ["--footer-panel" as string]: footerPanel,
        ["--footer-highlight-rgb" as string]: hexToRgbChannels(footerHighlight),
      }}
    >
      <section className={s.heroSection}>
        <article className={s.heroPanel}>
          {heroImageUrl ? (
            <div className={s.heroBackgroundMedia} aria-hidden>
              <Image
                src={heroImageUrl}
                alt=""
                fill
                className={s.heroBackgroundImage}
                priority
                fetchPriority="high"
                sizes="(max-width: 900px) 100vw, 1200px"
                quality={65}
              />
            </div>
          ) : (
            <div className={s.heroFallback} aria-hidden />
          )}

          <div className={s.heroOverlay} />

          <div className={s.heroContent}>
            <div className={s.heroInner}>
              <div
                className={`${s.heroTopBar}${isPreview ? ` ${s.heroTopBarWithBack}` : ""}`}
              >
                {isPreview ? (
                  <Link
                    href="/dashboard"
                    className={s.heroBackButton}
                    aria-label="Volver a Ventora"
                  >
                    <LuArrowLeft aria-hidden />
                  </Link>
                ) : null}

                <div className={s.heroStatus} data-active={isAvailable}>
                  <span className={s.heroStatusDot} aria-hidden />
                  {availabilityLabel}
                </div>
              </div>

              <div className={s.heroIdentityBlock}>
                {config.empresaLogoUrl ? (
                  <Image
                    className={s.logo}
                    src={config.empresaLogoUrl}
                    alt={displayName}
                    width={64}
                    height={64}
                    sizes="64px"
                  />
                ) : (
                  <div className={s.logoFallback} aria-hidden>
                    {getInitials(displayName)}
                  </div>
                )}

                <div className={s.heroIdentityCopy}>
                  <strong>{displayName}</strong>
                  {config.publicSubtitle ? (
                    <span className={s.heroSubtitleText}>
                      {config.publicSubtitle}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className={s.heroMainCopy}>
                <h1 className={s.heroTitle}>{heroTitle}</h1>
                <p className={s.heroSubtitleMain}>{heroSubtitle}</p>
              </div>

              <div className={s.heroActions}>
                {whatsappUrl ? (
                  <TrackedExternalLink
                    className={s.primaryWhatsappCta}
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    trackingSource="solicitud-publica"
                    trackingLocation="hero-whatsapp"
                    trackingLabel={`solicitud-publica:${config.solicitudPublicaSlug}`}
                    empresaSlug={config.solicitudPublicaSlug}
                  >
                    <LuMessageCircleMore aria-hidden />
                    Cotizar por WhatsApp
                  </TrackedExternalLink>
                ) : null}

                <a className={s.secondaryHeroCta} href="#solicitud-rapida">
                  Dejar solicitud en linea
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
          </div>
        </article>
      </section>

      <div className={s.shell}>
        {/* Quick Trust */}
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

        {/* Gallery */}
        {resolvedGallery.length > 0 ? (
          <section className={s.gallerySection} aria-label="Trabajos recientes">
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>Trabajos Recientes</h2>
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
                      sizes="(max-width: 768px) 80vw, 280px"
                      quality={65}
                      loading="lazy"
                    />
                    {image.workBadge ? (
                      <span className={s.galleryTag}>{image.workBadge}</span>
                    ) : null}
                  </div>
                  <div className={s.galleryCardOverlay}>
                    <strong>{image.workTitle || image.label || "Trabajo reciente"}</strong>
                    <span>{[image.workType, image.workZone].filter(Boolean).join(" · ")}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* How it works */}
        <section className={s.sectionCard}>
          <h2 className={s.sectionTitle}>El proceso es simple</h2>
          <div className={s.stepsVertical}>
            {[
              {
                title: "Envias los detalles",
                copy: "Cuentanos que necesitas y adjunta medidas o fotos de referencia.",
              },
              {
                title: "Revisamos tecnicamente",
                copy: "Un especialista evalua la viabilidad y los materiales optimos.",
              },
              {
                title: "Recibes tu cotizacion",
                copy: "Te entregamos un presupuesto detallado con opciones y tiempos.",
              },
            ].map((step, index) => (
              <article key={step.title} className={s.stepVerticalCard}>
                <div className={s.stepVerticalNumber}>{index + 1}</div>
                <div className={s.stepVerticalCopy}>
                  <strong>{step.title}</strong>
                  <span>{step.copy}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Featured Services */}
        {serviceItems.length > 0 ? (
          <section className={s.sectionCard}>
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>Servicios Destacados</h2>
            </div>

            <div className={s.featuredServiceList}>
              {featuredServices.map((service) => (
                <div key={service} className={s.featuredServiceCard}>
                  <div className={s.featuredServiceIconWrap}>
                    <div className={s.featuredServiceIcon}>
                      {getServiceIcon(service) === "window" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M12 3v18" />
                          <path d="M3 12h18" />
                        </svg>
                      )}
                      {getServiceIcon(service) === "shower" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20h16" />
                          <path d="M8 20v-8a4 4 0 018 0v8" />
                          <path d="M12 4v4" />
                          <path d="M8 8h8" />
                        </svg>
                      )}
                      {getServiceIcon(service) === "terrace" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18" />
                          <path d="M5 21V7l8-4 8 4v14" />
                          <path d="M9 21v-6h6v6" />
                        </svg>
                      )}
                      {getServiceIcon(service) === "door" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v18" />
                          <rect x="3" y="3" width="9" height="18" rx="1" />
                        </svg>
                      )}
                      {getServiceIcon(service) === "partition" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M12 3v18" />
                        </svg>
                      )}
                      {getServiceIcon(service) === "thermal" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M8 3v18" />
                          <path d="M16 3v18" />
                        </svg>
                      )}
                      {getServiceIcon(service) === "default" && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className={s.featuredServiceInfo}>
                    <strong>{service}</strong>
                    <span>Aislamiento termico y acustico...</span>
                  </div>
                </div>
              ))}
            </div>

            {chipServices.length > 0 ? (
              <div className={s.serviceRail}>
                {chipServices.map((service) => (
                  <span key={service} className={s.serviceChip}>
                    {service}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Form */}
        <section className={s.formSection} aria-label="Formulario de solicitud">
          <Suspense fallback={null}>
            <SolicitudEmpresaForm
              slug={config.solicitudPublicaSlug}
              empresaTelefono={config.empresaTelefono}
              empresaEmail={config.empresaEmail}
              privacidad={config.solicitudPublicaPrivacidad}
              isAvailable={isAvailable}
              formTitle={formTitle}
              formSubtitle={formSubtitle ?? undefined}
            />
          </Suspense>
        </section>

        {/* Testimonials */}
        {showRating && approvedTestimonialsCount > 0 ? (
          <section className={s.sectionCard}>
            <div className={s.sectionHeader}>
              <span className={s.sectionEyebrow}>Clientes que confiaron en nosotros</span>
              <div className={s.testimonialSummaryPublic}>
                <strong>{`\u2605\u2605\u2605\u2605\u2605 ${averageRating}`}</strong>
                <span>{`${approvedTestimonialsCount} valoraciones`}</span>
              </div>
            </div>

            <div className={s.testimonialPublicRail}>
              {approvedTestimonials.slice(0, 3).map((item) => (
                <article key={String(item.id)} className={s.testimonialPublicCard}>
                  <div className={s.testimonialPublicTop}>
                    <strong>{item.nombreCorto || "Cliente"}</strong>
                    <span>{`${"\u2605".repeat(item.estrellas)}${"\u2606".repeat(
                      5 - item.estrellas,
                    )}`}</span>
                  </div>
                  <p>{item.comentario}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {showRating ? (
          <section className={s.testimonialSection}>
            <SolicitudEmpresaTestimonialForm slug={config.solicitudPublicaSlug} />
          </section>
        ) : null}

        {/* Footer */}
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
                  sizes="56px"
                />
              ) : (
                <div className={s.footerLogoFallback} aria-hidden>
                  {getInitials(displayName)}
                </div>
              )}

              <div className={s.companyFooterCopy}>
                <strong>{displayName}</strong>
                <span>{config.publicSubtitle || config.publicBusinessType}</span>
              </div>
            </div>

            <div className={s.footerInfoGrid}>
              {config.empresaDireccion ? (
                <div className={s.footerInfoItem}>
                  <LuMapPin aria-hidden />
                  <span>{config.empresaDireccion}</span>
                </div>
              ) : null}
              {showSchedule ? (
                <div className={s.footerInfoItem}>
                  <LuClock3 aria-hidden />
                  <span>{horarioLabel}</span>
                </div>
              ) : null}
              {formattedPhone ? (
                <div className={s.footerInfoItem}>
                  <LuPhone aria-hidden />
                  <span>{formattedPhone}</span>
                </div>
              ) : null}
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
            </div>
          </div>

          <p className={s.brandFooterText}>Solicitudes gestionadas con Ventora</p>
        </footer>
      </div>

    </main>
  );
}
