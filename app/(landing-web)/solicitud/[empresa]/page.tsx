import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuClock3,
  LuMessageCircleMore,
  LuShieldCheck,
} from "react-icons/lu";

import {
  DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
  DEFAULT_SOLICITUD_PUBLICA_VALOR,
  formatDiasAtencionLabel,
  isOrganizationOpenAtDate,
} from "@/features/organization-profile/services/organization-profile.service";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";

import { SolicitudEmpresaForm } from "./solicitud-empresa-form";
import s from "./page.module.css";

type PageProps = {
  params: Promise<{
    empresa: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const availabilityLabel = isAvailable
    ? "Disponible para responder"
    : "Fuera de horario";
  const horarioLabel = `${formatDiasAtencionLabel(
    config.solicitudPublicaDiasAtencion
  )} · ${config.solicitudPublicaHorarioDesde} a ${
    config.solicitudPublicaHorarioHasta
  }`;
  const heroValue =
    config.solicitudPublicaValor || DEFAULT_SOLICITUD_PUBLICA_VALOR;
  const trustMessage =
    config.solicitudPublicaMensajeConfianza ||
    DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA;

  return (
    <main className={s.root} style={{ ["--brand" as string]: config.brandColor }}>
      <div className={s.shell}>
        <header className={s.topBar}>
          <Link href="/" className={s.backButton} aria-label="Volver">
            <LuArrowLeft aria-hidden />
          </Link>
          <div className={s.topSlug}>/solicitud/{config.solicitudPublicaSlug}</div>
          <div className={s.topStatus} data-active={isAvailable}>
            {isAvailable ? "ON" : "OFF"}
          </div>
        </header>

        <section className={s.hero}>
          <div className={s.heroIdentity}>
            {config.empresaLogoUrl ? (
              <Image
                className={s.logo}
                src={config.empresaLogoUrl}
                alt={config.empresaNombre}
                width={80}
                height={80}
                unoptimized
              />
            ) : (
              <div className={s.logoFallback}>{getInitials(config.empresaNombre)}</div>
            )}

            <div className={s.heroCopy}>
              <span className={s.heroTag}>Solicitud comercial</span>
              <h1 className={s.title}>{config.empresaNombre}</h1>
              <div className={s.availabilityPill} data-active={isAvailable}>
                <span className={s.availabilityDot} aria-hidden />
                {availabilityLabel}
              </div>
            </div>
          </div>

          <p className={s.subtitle}>{config.solicitudPublicaDescripcionCorta}</p>

          <div className={s.signalGrid}>
            <div className={s.signalCard}>
              <LuMessageCircleMore aria-hidden />
              <div>
                <strong>Respuesta comercial</strong>
                <span>{heroValue}</span>
              </div>
            </div>

            <div className={s.signalCard}>
              <LuClock3 aria-hidden />
              <div>
                <strong>Horario de atención</strong>
                <span>{horarioLabel}</span>
              </div>
            </div>
          </div>

          <div className={s.trustStrip}>
            <LuBadgeCheck aria-hidden />
            <p>{trustMessage}</p>
          </div>
        </section>

        <SolicitudEmpresaForm
          slug={config.solicitudPublicaSlug}
          empresaNombre={config.empresaNombre}
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

        <section className={s.footerInfo}>
          <div className={s.footerRow}>
            <LuShieldCheck aria-hidden />
            <p>{config.solicitudPublicaPrivacidad}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
