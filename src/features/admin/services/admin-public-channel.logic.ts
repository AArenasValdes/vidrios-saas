import { formatRelativeActivity } from "@/features/admin/services/admin-clientes-filters.service";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type {
  AdminPublicChannelDetail,
  AdminPublicChannelSummary,
  PublicPageStatus,
} from "@/features/admin/types/admin-public-channel";

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_HOUR = 60 * 60 * 1000;

export const PUBLIC_CHANNEL_LOOKBACK_DAYS = 30;
export const PUBLIC_SOLICITUD_UNREVISED_HOURS = 48;

export type PublicSolicitudRow = {
  id: string;
  nombre: string;
  organization_id: number;
  contexto: string;
  estado: string;
  creado_en: string;
  ayuda: string | null;
  contactada_at: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
};

export type AdminPublicChannelProfile = {
  slug: string | null;
  isPublished: boolean;
  empresaTelefono: string | null;
  empresaEmail: string | null;
  empresaNombre: string | null;
  horarioDesde: string | null;
  horarioHasta: string | null;
  diasAtencion: string | null;
};

function isWithinDays(iso: string | null, days: number) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= days * MS_DAY;
}

function mapEstadoLabel(estado: string) {
  if (estado === "contactada") return "Contactada";
  if (estado === "cerrada") return "Cerrada";
  if (estado === "descartada") return "Descartada";
  return "Nueva";
}

export function resolvePublicPageStatus(profile: AdminPublicChannelProfile): PublicPageStatus {
  if (!profile.slug?.trim()) return "no_configurada";
  if (!profile.isPublished) return "borrador";
  return "publicada";
}

export function resolvePublicPageStatusLabel(status: PublicPageStatus) {
  if (status === "publicada") return "Publicada";
  if (status === "borrador") return "Borrador";
  return "No configurada";
}

export function resolvePublicChannelRecommendedStatus(input: {
  pageStatus: PublicPageStatus;
  solicitudesPending: number;
  solicitudesLast30Days: number;
}) {
  if (input.solicitudesPending > 0) return "Requiere revisar solicitudes";
  if (input.pageStatus === "publicada" && input.solicitudesLast30Days > 0) {
    return "Tiene solicitudes recientes";
  }
  if (input.pageStatus === "publicada") return "Página pública lista";
  if (input.pageStatus === "borrador") return "Falta publicar página";
  return "Falta configurar página";
}

export function buildPublicChannelSummary(
  profile: AdminPublicChannelProfile,
  solicitudes: PublicSolicitudRow[]
): AdminPublicChannelSummary {
  const pageStatus = resolvePublicPageStatus(profile);
  const orgSolicitudes = solicitudes.filter((item) => item.contexto === "empresa-publica");
  const solicitudesLast30Days = orgSolicitudes.filter((item) =>
    isWithinDays(item.creado_en, PUBLIC_CHANNEL_LOOKBACK_DAYS)
  );
  const pending = orgSolicitudes.filter((item) => item.estado === "nueva");
  const last = orgSolicitudes[0] ?? null;
  const oldestPending = pending.reduce<string | null>((oldest, item) => {
    if (!oldest || item.creado_en < oldest) return item.creado_en;
    return oldest;
  }, null);

  const whatsappConfigured = Boolean(profile.empresaTelefono?.trim());
  const companyDataComplete = Boolean(
    profile.empresaNombre?.trim() &&
      (profile.empresaTelefono?.trim() || profile.empresaEmail?.trim())
  );
  const scheduleConfigured = Boolean(
    profile.horarioDesde?.trim() ||
      profile.horarioHasta?.trim() ||
      profile.diasAtencion?.trim()
  );

  const summary: AdminPublicChannelSummary = {
    pageStatus,
    pageStatusLabel: resolvePublicPageStatusLabel(pageStatus),
    slug: profile.slug,
    publicPageUrl: profile.slug ? `/solicitud/${profile.slug}` : null,
    solicitudesTotal: orgSolicitudes.length,
    solicitudesLast30Days: solicitudesLast30Days.length,
    solicitudesPending: pending.length,
    lastSolicitudAt: last?.creado_en ?? null,
    lastSolicitanteNombre: last?.nombre?.trim() ?? null,
    oldestPendingAt: oldestPending,
    whatsappConfigured,
    formActive: pageStatus === "publicada",
    companyDataComplete,
    scheduleConfigured,
    recommendedStatus: "",
    quotesFromRequestsAvailable: false,
  };

  summary.recommendedStatus = resolvePublicChannelRecommendedStatus(summary);
  return summary;
}

export function buildPublicChannelDetail(
  profile: AdminPublicChannelProfile,
  solicitudes: PublicSolicitudRow[]
): AdminPublicChannelDetail {
  const summary = buildPublicChannelSummary(profile, solicitudes);

  return {
    ...summary,
    recentSolicitudes: solicitudes.slice(0, 8).map((item) => ({
      id: item.id,
      solicitanteNombre: item.nombre,
      estado: item.estado,
      estadoLabel: mapEstadoLabel(item.estado),
      creadoEn: item.creado_en,
      relativeAt: formatRelativeActivity(item.creado_en),
    })),
  };
}

export function buildPublicChannelListLabel(summary: AdminPublicChannelSummary) {
  if (summary.pageStatus === "no_configurada") {
    return {
      statusLine: "No configurada",
      detailLine: summary.solicitudesLast30Days
        ? `${summary.solicitudesLast30Days} solicitudes · última ${formatRelativeActivity(summary.lastSolicitudAt)}`
        : "Sin solicitudes recientes",
    };
  }

  const detailParts: string[] = [];
  if (summary.solicitudesLast30Days > 0) {
    detailParts.push(
      `${summary.solicitudesLast30Days} solicitud${summary.solicitudesLast30Days === 1 ? "" : "es"}`
    );
  } else {
    detailParts.push("0 solicitudes");
  }

  if (summary.lastSolicitudAt) {
    detailParts.push(`última ${formatRelativeActivity(summary.lastSolicitudAt)}`);
  }

  return {
    statusLine: summary.pageStatusLabel,
    detailLine: detailParts.join(" · "),
  };
}

export function isTrialLikeClient(client: AdminClientListItem) {
  return (
    client.estadoEfectivo === "trial_active" ||
    client.estadoEfectivo === "trial_expiring" ||
    client.estadoEfectivo === "trial_expired"
  );
}

export function hasUnrevisedPublicSolicitudes(summary: AdminPublicChannelSummary) {
  if (!summary.oldestPendingAt || summary.solicitudesPending === 0) return false;
  const ageMs = Date.now() - new Date(summary.oldestPendingAt).getTime();
  return ageMs >= PUBLIC_SOLICITUD_UNREVISED_HOURS * MS_HOUR;
}

/** Etiqueta de antigüedad para tareas de solicitud pública sin revisar (no es vencimiento de plan). */
export function formatPublicSolicitudRevisionDueLabel(receivedAt: string | null) {
  if (!receivedAt) return "Sin fecha";
  const days = Math.max(
    1,
    Math.floor((Date.now() - new Date(receivedAt).getTime()) / MS_DAY)
  );
  return `Sin revisar · hace ${days} día${days === 1 ? "" : "s"}`;
}

export function hasTrialWithPublicRequestsNoQuotes(
  client: AdminClientListItem,
  summary: AdminPublicChannelSummary
) {
  return (
    isTrialLikeClient(client) &&
    summary.solicitudesLast30Days > 0 &&
    client.cotizacionesCount === 0
  );
}

export function hasIncompletePublicPageNeedingSetup(
  client: AdminClientListItem,
  summary: AdminPublicChannelSummary
) {
  return isTrialLikeClient(client) && summary.pageStatus !== "publicada";
}

export function hasMultiplePublicRequestsWithoutFollowUp(
  client: AdminClientListItem,
  summary: AdminPublicChannelSummary
) {
  if (summary.solicitudesLast30Days < 3 || !summary.lastSolicitudAt) return false;
  const lastSolicitudMs = new Date(summary.lastSolicitudAt).getTime();
  const lastActivityMs = client.lastActivityAt
    ? new Date(client.lastActivityAt).getTime()
    : 0;
  const weekAgo = Date.now() - 7 * MS_DAY;
  return lastSolicitudMs <= weekAgo && lastActivityMs < lastSolicitudMs;
}
