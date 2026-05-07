import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuCheck,
  LuClipboardCheck,
  LuClock3,
  LuMessageCircleMore,
  LuShieldCheck,
  LuStar,
} from "react-icons/lu";

import {
  DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA,
  DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
  DEFAULT_SOLICITUD_PUBLICA_VALOR,
  hexToRgbChannels,
  isOrganizationOpenAtDate,
} from "@/features/organization-profile/services/organization-profile.service";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";
import { buildPublicLeadWhatsappUrl } from "@/utils/whatsapp";

import { SolicitudEmpresaForm } from "./solicitud-empresa-form";
import s from "./page.module.css";

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
  tone: "blue" | "green" | "indigo";
};

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
  if (!clean) return null;
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
  const config =
    await solicitudesContactoService.getPublicRequestConfig(empresa);

  if (!config) {
    notFound();
  }

  const isAvailable = isOrganizationOpenAtDate({
    days: config.solicitudPublicaDiasAtencion,
    from: config.solicitudPublicaHorarioDesde,
    to: config.solicitudPublicaHorarioHasta,
  });

  const availabilityLabel = isAvailable
    ? "Disponible para responder"
    : "Fuera de horario";
  const locationLabel = resolveLocationLabel(config.empresaDireccion);
  const heroValue =
    config.solicitudPublicaValor || DEFAULT_SOLICITUD_PUBLICA_VALOR;
  const trustMessage =
    config.solicitudPublicaMensajeConfianza ||
    DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA;
  const descriptionShort =
    config.solicitudPublicaDescripcionCorta ||
    DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA;
  const whatsappUrl = buildPublicLeadWhatsappUrl(config.empresaTelefono);
  const coverageLabel = locationLabel ?? "Cobertura";

  const benefits: BenefitItem[] = [
    {
      title: "Respuesta comercial rápida",
      copy: heroValue,
      icon: LuMessageCircleMore,
      tone: "blue",
    },
    {
      title: "Horario de atención",
      copy: `Lun–Sáb · ${config.solicitudPublicaHorarioDesde} a ${config.solicitudPublicaHorarioHasta} hrs`,
      icon: LuClock3,
      tone: "green",
    },
    {
      title: "Tu solicitud queda registrada",
      copy: "No se pierde aunque el equipo esté ocupado.",
      icon: LuClipboardCheck,
      tone: "indigo",
    },
  ];

  return (
    <main
      className={s.root}
      style={{
        ["--brand" as string]: config.brandColor,
        ["--brand-rgb" as string]: hexToRgbChannels(config.brandColor),
      }}
    >
      <div className={s.shell}>
        <div className={s.statusBar} aria-hidden>
          <span className={s.statusTime}>9:41</span>
          <div className={s.statusIcons}>
            <span className={s.signalIcon} />
            <span className={s.wifiIcon} />
            <span className={s.batteryIcon} />
          </div>
        </div>

        <header className={s.topBar}>
          <Link href="/" className={s.backButton} aria-label="Volver al inicio">
            <LuArrowLeft aria-hidden />
          </Link>
          <div className={s.topSlug}>
            {`/SOLICITUD/${config.solicitudPublicaSlug.toUpperCase()}`}
          </div>
          <div className={s.topStatus} data-active={isAvailable}>
            <span className={s.topStatusDot} aria-hidden />
            {isAvailable ? "ON" : "OFF"}
          </div>
        </header>

        <div className={s.scrollArea}>
          <section
            className={s.heroCard}
            aria-label="Información de la empresa"
          >
            <div className={s.heroEyebrow}>Solicitud Comercial</div>

            <div className={s.heroIdentity}>
              {config.empresaLogoUrl ? (
                <Image
                  className={s.logo}
                  src={config.empresaLogoUrl}
                  alt={config.empresaNombre}
                  width={72}
                  height={72}
                  unoptimized
                />
              ) : (
                <div className={s.logoFallback} aria-hidden>
                  {getInitials(config.empresaNombre)}
                </div>
              )}

              <div className={s.heroCopy}>
                <h1 className={s.title}>{config.empresaNombre}</h1>
                <div className={s.availabilityPill} data-active={isAvailable}>
                  <span className={s.availabilityDot} aria-hidden />
                  {availabilityLabel}
                </div>
              </div>
            </div>

            <p className={s.heroDescription}>{descriptionShort}</p>

            <div className={s.trustChips}>
              <span className={s.trustChip}>
                <LuStar aria-hidden />
                Sin compromiso
              </span>
              <span className={s.trustChip}>
                <LuMessageCircleMore aria-hidden />
                Respuesta por WhatsApp
              </span>
              <span className={s.trustChip}>
                <LuCheck aria-hidden />
                Solicitud registrada
              </span>
            </div>

            <div className={s.benefitsList} aria-label="Beneficios de contacto">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article
                    key={benefit.title}
                    className={s.benefitCard}
                    data-tone={benefit.tone}
                  >
                    <div className={s.benefitIconWrap}>
                      <Icon className={s.benefitIcon} aria-hidden />
                    </div>
                    <div className={s.benefitCopy}>
                      <strong>{benefit.title}</strong>
                      <p>{benefit.copy}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            className={s.proofStrip}
            aria-label="Estadísticas de la empresa"
          >
            <div className={s.proofStat}>
              <span className={s.proofNum}>+12</span>
              <span className={s.proofLbl}>Años exp.</span>
            </div>
            <span className={s.proofSep} aria-hidden />
            <div className={s.proofStat}>
              <span className={s.proofNum}>+800</span>
              <span className={s.proofLbl}>Trabajos</span>
            </div>
            <span className={s.proofSep} aria-hidden />
            <div className={s.proofStat}>
              <span className={s.proofNum}>4.9 ★</span>
              <span className={s.proofLbl}>Rating</span>
            </div>
            <span className={s.proofSep} aria-hidden />
            <div className={s.proofStat}>
              <span className={s.proofNum}>
                {coverageLabel.slice(0, 2).toUpperCase()}
              </span>
              <span className={s.proofLbl}>Cobertura</span>
            </div>
          </section>

          <section
            className={s.formSection}
            aria-label="Formulario de solicitud"
          >
            {whatsappUrl ? (
              <>
                <a
                  className={s.primaryWhatsappCta}
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LuMessageCircleMore aria-hidden />
                  Hablar por WhatsApp
                </a>
                <p className={s.whatsappTrust}>
                  <LuShieldCheck aria-hidden />
                  Gratis · Sin compromiso · Respuesta el mismo día
                </p>
                <div className={s.separatorOr}>
                  <span>o completa el formulario</span>
                </div>
              </>
            ) : null}

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

            <p className={s.heroTrustNote}>{trustMessage}</p>
          </section>

          <div className={s.bottomSpacer} aria-hidden />
        </div>
      </div>

      <div className={s.stickyBarWrap}>
        <div className={s.stickyBar}>
          <a className={s.stickySecondary} href="#solicitud-rapida">
            <LuBadgeCheck aria-hidden />
            <span>Solicitud</span>
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

      <div className={s.bottomSafeSpacer} aria-hidden />
    </main>
  );
}
