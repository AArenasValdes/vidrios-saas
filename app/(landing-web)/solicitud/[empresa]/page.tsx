import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";

import { DEFAULT_SOLICITUD_PUBLICA_VALOR } from "@/features/organization-profile/services/organization-profile.service";
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

function buildHeroCopy(value: string) {
  if (value === DEFAULT_SOLICITUD_PUBLICA_VALOR) {
    return "Cotiza ventanas, shower door, cierres de terraza y trabajos en vidrio o aluminio. Respuesta rápida por WhatsApp.";
  }

  return value;
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

function resolveAvailability() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayMap[weekday] ?? 1;
  const inBusinessDay = day >= 1 && day <= 6;
  const inBusinessHours = hour >= 9 && hour < 19;

  return inBusinessDay && inBusinessHours;
}

export default async function SolicitudEmpresaPage({ params, searchParams }: PageProps) {
  const { empresa } = await params;
  const sp = await searchParams;
  const config = await solicitudesContactoService.getPublicRequestConfig(empresa);

  if (!config) {
    notFound();
  }

  const heroCopy = buildHeroCopy(config.solicitudPublicaValor);
  const isAvailable = resolveAvailability();
  const brandSlug = `ventora.app/${config.solicitudPublicaSlug}`.toUpperCase();

  return (
    <main
      className={s.root}
      style={{ ["--brand" as string]: config.brandColor }}
    >
      <div className={s.shell}>
        <header className={s.topBar}>
          <Link href="/" className={s.backButton} aria-label="Volver">
            <LuArrowLeft aria-hidden />
          </Link>
          <div className={s.topSlug}>{brandSlug}</div>
          <div className={s.topStatus} data-active={isAvailable}>
            {isAvailable ? "ON" : "OFF"}
          </div>
        </header>

        <section className={s.hero}>
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
            <div className={s.logoFallback}>{getInitials(config.empresaNombre)}</div>
          )}
          <div className={s.heroTag}>Cotización rápida</div>
          <h1 className={s.title}>{config.empresaNombre}</h1>
          <div className={s.availabilityPill} data-active={isAvailable}>
            <span className={s.availabilityDot} aria-hidden />
            {isAvailable ? "Disponible para responder" : "Fuera de horario"}
          </div>
          <p className={s.subtitle}>
            {isAvailable
              ? heroCopy
              : "Deja tu solicitud y te responderemos apenas estemos disponibles."}
          </p>
        </section>

        <SolicitudEmpresaForm
          slug={config.solicitudPublicaSlug}
          empresaNombre={config.empresaNombre}
          empresaTelefono={config.empresaTelefono}
          empresaEmail={config.empresaEmail}
          privacidad={config.solicitudPublicaPrivacidad}
          isAvailable={isAvailable}
          utmSource={typeof sp.utm_source === "string" ? sp.utm_source : undefined}
          utmMedium={typeof sp.utm_medium === "string" ? sp.utm_medium : undefined}
          utmCampaign={typeof sp.utm_campaign === "string" ? sp.utm_campaign : undefined}
          sourceUrl={typeof sp.source_url === "string" ? sp.source_url : undefined}
        />
      </div>
    </main>
  );
}
