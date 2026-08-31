import { resolveCommercialState, type MarketingQuoteUsageRow } from "@/features/admin/services/admin-marketing.logic";
import type { PublicSolicitudRow } from "@/features/admin/services/admin-public-channel.logic";
import type {
  MarketingContentHighlight,
  MarketingContentSnapshot,
  MarketingNextAction,
  MarketingNowAction,
  MarketingOnboardingVideoSnapshot,
  MarketingPeriodWindow,
  MarketingProspectSnapshot,
  MarketingPublicCompanyRow,
  MarketingPublicUtmRow,
  MarketingQuoteUsage,
  MarketingQuoteUsageInsight,
  MarketingTrendPoint,
} from "@/features/admin/types/admin-marketing";

const MS_DAY = 24 * 60 * 60 * 1000;
const HIGHLIGHT_STATES = new Set(["publicado", "ganador", "programado"]);
const CLOSED_STATES = new Set(["pagado", "sin_respuesta", "no_calza", "no_contactar"]);
const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  carrusel: "Carrusel",
  story: "Story",
  demo_largo: "Demo",
  onboarding: "Onboarding",
};
const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  interno: "Interno",
};

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function eachUtcDay(startIso: string, endIso: string): string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const days: string[] = [];

  while (cursor.getTime() <= last.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function formatDayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function isLiveProspect(prospect: MarketingProspectSnapshot) {
  return prospect.dataStatus !== "mock" && !prospect.noContactar;
}

function hasReached(estado: string, stage: "trial" | "pagado") {
  const commercial = resolveCommercialState(estado);
  if (commercial === "perdido") return false;
  if (stage === "pagado") return commercial === "cliente_pagado";
  return commercial === "trial_iniciado" || commercial === "cliente_pagado";
}

export function isContentUtmComplete(item: Pick<
  MarketingContentSnapshot,
  "utmSource" | "utmMedium" | "utmCampaign" | "utmContent"
>) {
  return Boolean(item.utmSource && item.utmMedium && item.utmCampaign && item.utmContent);
}

export function countReadyOnboardingVideos(videos: MarketingOnboardingVideoSnapshot[]) {
  const ready = new Set<string>();
  for (const video of videos) {
    if (
      video.esPredeterminado &&
      video.estado === "listo" &&
      video.hasUrl &&
      (video.dispositivo === "movil" || video.dispositivo === "escritorio")
    ) {
      ready.add(video.dispositivo);
    }
  }
  return ready.size;
}

export function buildTrendSeries(input: {
  prospects: MarketingProspectSnapshot[];
  quotes: MarketingQuoteUsageRow[];
  period: MarketingPeriodWindow;
}): MarketingTrendPoint[] {
  const days = eachUtcDay(input.period.start, input.period.end);
  const live = input.prospects.filter(isLiveProspect);

  return days.map((date) => {
    const prospects = live.filter((item) => dayKey(item.creadoEn) === date).length;
    const quotes = input.quotes.filter((item) => item.creadoEn && dayKey(item.creadoEn) === date).length;
    const trials = live.filter(
      (item) => hasReached(item.estado, "trial") && dayKey(item.actualizadoEn) === date
    ).length;
    const paid = live.filter(
      (item) => hasReached(item.estado, "pagado") && dayKey(item.actualizadoEn) === date
    ).length;

    return {
      date,
      label: formatDayLabel(date),
      prospects,
      quotes,
      trials,
      paid,
    };
  });
}

export function buildPublicUtmRows(input: {
  solicitudes: PublicSolicitudRow[];
  period: MarketingPeriodWindow;
  limit?: number;
}): MarketingPublicUtmRow[] {
  const start = new Date(input.period.start).getTime();
  const end = new Date(input.period.end).getTime();
  const counts = new Map<string, number>();

  for (const solicitud of input.solicitudes) {
    if (solicitud.contexto !== "empresa-publica") continue;
    const created = new Date(solicitud.creado_en).getTime();
    if (created < start || created > end) continue;

    const source = solicitud.utm_source?.trim().toLowerCase() || "sin utm";
    const medium = solicitud.utm_medium?.trim().toLowerCase();
    const label = source === "sin utm" || !medium ? source : `${source} / ${medium}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .map(([label, count]) => ({ id: label, label, count }))
    .sort((left, right) => right.count - left.count);

  const limit = input.limit ?? 5;
  if (ranked.length <= limit) return ranked;

  const visible = ranked.slice(0, limit);
  const rest = ranked.slice(limit).reduce((total, row) => total + row.count, 0);
  return [...visible, { id: "otros", label: "otros", count: rest }];
}

export function buildContentHighlights(
  items: MarketingContentSnapshot[],
  limit = 5
): MarketingContentHighlight[] {
  return items
    .filter((item) => HIGHLIGHT_STATES.has(item.estado))
    .sort((left, right) => {
      const leftDate = left.publicadoEn ?? left.programadoPara ?? left.actualizadoEn;
      const rightDate = right.publicadoEn ?? right.programadoPara ?? right.actualizadoEn;
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, limit)
    .map((item) => {
      const date = item.publicadoEn ?? item.programadoPara ?? item.actualizadoEn;
      return {
        id: item.id,
        title: item.title,
        formatLabel: FORMAT_LABELS[item.formato] ?? item.formato,
        channelLabel: CHANNEL_LABELS[item.canal] ?? item.canal,
        publishedLabel: new Date(date).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "short",
        }),
        utmComplete: isContentUtmComplete(item),
        estado: item.estado,
      };
    });
}

export function buildNowActions(input: {
  videos: MarketingOnboardingVideoSnapshot[];
  content: MarketingContentSnapshot[];
}): MarketingNowAction[] {
  const readyVideos = countReadyOnboardingVideos(input.videos);
  const missingUtm = input.content.filter(
    (item) => HIGHLIGHT_STATES.has(item.estado) && !isContentUtmComplete(item)
  ).length;
  const hasMobileDemo = input.content.some(
    (item) =>
      (item.estado === "publicado" || item.estado === "ganador") &&
      (item.formato === "reel" || item.canal === "instagram")
  );

  return [
    {
      id: "onboarding",
      title: "Graba los 2 videos de onboarding",
      detail:
        readyVideos >= 2
          ? "Celular y computador ya tienen guía lista."
          : `${readyVideos} de 2 videos base listos.`,
      ctaLabel: "Preparar onboarding",
      href: "/admin/marketing/onboarding",
      done: readyVideos >= 2,
    },
    {
      id: "demo_celular",
      title: "Publica demo desde celular",
      detail: hasMobileDemo
        ? "Ya hay una pieza de demostración publicada."
        : "Un dolor, una demostración y un CTA.",
      ctaLabel: "Crear publicación",
      href: "#contenido",
      done: hasMobileDemo,
    },
    {
      id: "utm",
      title: missingUtm > 0 ? `Completa UTM de ${missingUtm} pieza${missingUtm === 1 ? "" : "s"}` : "UTM de piezas al día",
      detail:
        missingUtm > 0
          ? "Sin source, medium, campaign y content no hay atribución."
          : "Las piezas programadas o publicadas tienen UTM completa.",
      ctaLabel: "Completar UTM",
      href: "#contenido",
      done: missingUtm === 0,
    },
  ];
}

export function buildNextActions(input: {
  videos: MarketingOnboardingVideoSnapshot[];
  content: MarketingContentSnapshot[];
  prospects: MarketingProspectSnapshot[];
  now?: Date;
}): MarketingNextAction[] {
  const now = input.now ?? new Date();
  const weekStart = new Date(now.getTime() - 7 * MS_DAY).toISOString();
  const readyVideos = countReadyOnboardingVideos(input.videos);
  const publishedThisWeek = input.content.filter((item) => {
    if (item.estado !== "publicado" && item.estado !== "ganador") return false;
    const at = item.publicadoEn ?? item.actualizadoEn;
    return at >= weekStart;
  }).length;
  const overdue = input.prospects.filter((prospect) => {
    if (!isLiveProspect(prospect) || !prospect.proximaAccionEn) return false;
    if (CLOSED_STATES.has(prospect.estado)) return false;
    return new Date(prospect.proximaAccionEn).getTime() < now.getTime();
  }).length;

  return [
    {
      id: "videos",
      title: "Graba videos de onboarding",
      detail: `${readyVideos} de 2`,
      current: readyVideos,
      target: 2,
      href: "/admin/marketing/onboarding",
    },
    {
      id: "publicaciones",
      title: "Publicaciones esta semana",
      detail: `${publishedThisWeek} de 3`,
      current: publishedThisWeek,
      target: 3,
      href: "#contenido",
    },
    {
      id: "seguimientos",
      title: "Seguimientos vencidos",
      detail:
        overdue === 0
          ? "Sin seguimientos vencidos"
          : `${overdue} contacto${overdue === 1 ? "" : "s"} sin respuesta a tiempo`,
      current: overdue,
      target: null,
      href: "/admin/prospectos",
    },
  ];
}

export function buildQuoteUsageInsight(usage: MarketingQuoteUsage): MarketingQuoteUsageInsight {
  if (usage.totalQuotes === 0) {
    return {
      text: "Aún no hay cotizaciones reales en el período. Excluye cuentas de prueba.",
      ctaLabel: null,
      ctaHref: null,
    };
  }

  const itemShare = Math.round((usage.itemQuotes / usage.totalQuotes) * 100);
  if (itemShare >= 50) {
    return {
      text: `El ${itemShare}% de las cotizaciones reales va por ítems. Prioriza demos de ese flujo en el contenido.`,
      ctaLabel: "Crear pieza sobre Por ítems",
      ctaHref: "#contenido",
    };
  }

  return {
    text: `Por ítems representa el ${itemShare}% del uso real. Revisa si el contenido está mostrando el flujo que sí usan.`,
    ctaLabel: "Crear publicación",
    ctaHref: "#contenido",
  };
}

export function countPendingPublicSolicitudes(companies: MarketingPublicCompanyRow[]) {
  return companies.reduce((total, row) => total + row.solicitudesPending, 0);
}
