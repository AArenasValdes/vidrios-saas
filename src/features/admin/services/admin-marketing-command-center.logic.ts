import { MARKETING_CHANNEL_LABELS } from "@/features/admin/services/admin-marketing.logic";
import type {
  MarketingFunnelStep,
  MarketingGroupPerformance,
  MarketingNextAction,
  MarketingNowAction,
  MarketingProspectSnapshot,
} from "@/features/admin/types/admin-marketing";
import type {
  MarketingAttentionLead,
  MarketingSalesFunnelStage,
  MarketingSprintProgress,
  MarketingWeekContentSource,
  MarketingWeekDay,
  MarketingWeekDayItem,
  MarketingWeekStatus,
} from "@/features/admin/types/admin-marketing-command-center";

const SANTIAGO_TIME_ZONE = "America/Santiago";
const MS_DAY = 24 * 60 * 60 * 1000;
const CHILE_SALES_SPRINT_START = "2026-09-01";
const CLOSED_ESTADOS = new Set(["pagado", "sin_respuesta", "no_calza", "no_contactar"]);
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};
const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const FORMAT_LABELS: Record<string, string> = {
  reel: "Video corto",
  carrusel: "Carrusel",
  story: "Historia",
  demo_largo: "Demo",
  onboarding: "Onboarding",
};
const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  grupos: "Grupos de Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  interno: "Interno",
};

function isLiveProspect(prospect: MarketingProspectSnapshot) {
  return prospect.dataStatus !== "mock" && !prospect.noContactar;
}

function isOpenProspect(prospect: MarketingProspectSnapshot) {
  return isLiveProspect(prospect) && !CLOSED_ESTADOS.has(prospect.estado) && prospect.commercialState !== "perdido";
}

function santiagoDateKey(iso: string, now = new Date(iso)) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SANTIAGO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function santiagoWeekdayIndex(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: SANTIAGO_TIME_ZONE,
    weekday: "short",
  }).format(date);
  return WEEKDAY_INDEX[weekday] ?? 0;
}

function addUtcDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatWeekDayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const day = new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(date);
  return day.replace(".", "");
}

export function mapContentStatusToWeekStatus(item: Pick<MarketingWeekContentSource, "estado" | "hasManualMetrics">): MarketingWeekStatus {
  if (item.estado === "revision") return "guion";
  if (item.estado === "aprobado") return "editado";
  if (item.estado === "programado") return "programado";
  if (item.estado === "publicado" || item.estado === "ganador") {
    return item.hasManualMetrics ? "medir" : "publicado";
  }
  return "idea";
}

function weekStatusLabel(status: MarketingWeekStatus) {
  if (status === "guion") return "Guion";
  if (status === "editado") return "Editado";
  if (status === "programado") return "Programado";
  if (status === "publicado") return "Publicado";
  if (status === "medir") return "Medir";
  return "Idea";
}

function weekAction(status: MarketingWeekStatus): Pick<MarketingWeekDayItem, "actionLabel" | "actionText"> {
  if (status === "publicado" || status === "medir") {
    return { actionLabel: "resultados", actionText: "Ver resultados" };
  }
  if (status === "programado") {
    return { actionLabel: "calendario", actionText: "Ver calendario" };
  }
  return { actionLabel: "preparar", actionText: "Preparar publicación" };
}

function itemDateKey(item: MarketingWeekContentSource) {
  return santiagoDateKey(item.programadoPara ?? item.publicadoEn ?? item.actualizadoEn);
}

function rankWeekItem(item: MarketingWeekContentSource) {
  if (item.estado === "publicado" || item.estado === "ganador") return 3;
  if (item.estado === "programado") return 2;
  return 1;
}

export function buildSalesFunnel(input: {
  groups: MarketingGroupPerformance[];
  acquisitionFunnel: MarketingFunnelStep[];
  prospects: MarketingProspectSnapshot[];
}): MarketingSalesFunnelStage[] {
  const alcance = input.groups.reduce((sum, group) => sum + group.alcance, 0);
  const mensajesDemo = input.groups.reduce((sum, group) => sum + group.mensajesDemo, 0);
  const conversaciones = input.prospects.filter(
    (prospect) => isOpenProspect(prospect) && prospect.commercialState === "contactado"
  ).length;
  const countFor = (id: string) => input.acquisitionFunnel.find((step) => step.id === id)?.count ?? 0;

  return [
    {
      id: "grupo",
      label: "Grupo",
      count: alcance,
      detail: alcance > 0 ? "personas alcanzadas" : "sin alcance registrado",
    },
    {
      id: "demo_msg",
      label: "DEMO",
      count: mensajesDemo,
      detail: "desde publicaciones",
    },
    {
      id: "conversaciones",
      label: "Conversaciones",
      count: conversaciones,
      detail: "en curso",
    },
    {
      id: "demos",
      label: "Demos",
      count: countFor("demo"),
      detail: "agendadas en la lista",
    },
    {
      id: "pilotos",
      label: "Pilotos",
      count: countFor("trial"),
      detail: "activos (15 días)",
    },
    {
      id: "pagos",
      label: "Pagos",
      count: countFor("pagado"),
      detail: "este período",
    },
  ];
}

export function hasSalesFunnelSignal(stages: MarketingSalesFunnelStage[]) {
  return stages.some((stage) => stage.count > 0);
}

export function buildAttentionLeads(
  prospects: MarketingProspectSnapshot[],
  now = new Date(),
  limit = 5
): MarketingAttentionLead[] {
  return prospects
    .filter(isOpenProspect)
    .map((prospect) => {
      const dueAt = prospect.proximaAccionEn ? new Date(prospect.proximaAccionEn).getTime() : null;
      const overdueDays =
        dueAt !== null && dueAt < now.getTime() ? Math.max(1, Math.ceil((now.getTime() - dueAt) / MS_DAY)) : 0;
      const overdue = overdueDays > 0;
      const ctaLabel =
        prospect.commercialState === "demo_agendada" || prospect.commercialState === "trial_iniciado"
          ? "Hacer seguimiento"
          : prospect.commercialState === "contactado"
            ? "Agendar demo"
            : "Responder";
      const nextAction = overdue
        ? overdueDays <= 1
          ? "Responde hoy"
          : `Sin respuesta (${overdueDays} días)`
        : prospect.commercialState === "demo_agendada"
          ? "Confirmar demo"
          : prospect.commercialState === "contactado"
            ? "Agendar demo"
            : "Responder";

      return {
        id: prospect.id,
        name: prospect.contactoNombre?.trim() || prospect.empresa,
        company: prospect.empresa,
        originLabel: MARKETING_CHANNEL_LABELS[prospect.channelId] ?? prospect.fuente,
        nextAction,
        nextActionTone: overdue ? ("overdue" as const) : ("default" as const),
        ctaLabel,
        href: "/admin/prospectos",
        commercialState: prospect.commercialState,
        overdueDays,
      };
    })
    .sort((left, right) => {
      if (right.overdueDays !== left.overdueDays) return right.overdueDays - left.overdueDays;
      if (left.commercialState === "contactado" && right.commercialState !== "contactado") return -1;
      if (right.commercialState === "contactado" && left.commercialState !== "contactado") return 1;
      return left.company.localeCompare(right.company, "es");
    })
    .slice(0, limit)
    .map((lead) => ({
      id: lead.id,
      name: lead.name,
      company: lead.company,
      originLabel: lead.originLabel,
      nextAction: lead.nextAction,
      nextActionTone: lead.nextActionTone,
      ctaLabel: lead.ctaLabel,
      href: lead.href,
      commercialState: lead.commercialState,
    }));
}

export function buildWeekPlan(items: MarketingWeekContentSource[], now = new Date()): MarketingWeekDay[] {
  const todayKey = santiagoDateKey(now.toISOString(), now);
  const mondayKey = addUtcDays(todayKey, -santiagoWeekdayIndex(now));
  const byDay = new Map<string, MarketingWeekContentSource>();

  for (const item of items) {
    if (item.estado === "archivado") continue;
    const key = itemDateKey(item);
    const current = byDay.get(key);
    if (!current || rankWeekItem(item) > rankWeekItem(current)) {
      byDay.set(key, item);
    }
  }

  return WEEKDAY_LABELS.map((weekdayLabel, index) => {
    const dateKey = addUtcDays(mondayKey, index);
    const source = byDay.get(dateKey) ?? null;
    if (!source) {
      return {
        dateKey,
        label: formatWeekDayLabel(dateKey),
        weekdayLabel,
        item: null,
      };
    }

    const status = mapContentStatusToWeekStatus(source);
    const action = weekAction(status);
    return {
      dateKey,
      label: formatWeekDayLabel(dateKey),
      weekdayLabel,
      item: {
        id: source.id,
        title: source.title,
        channelLabel: source.grupoNombre || CHANNEL_LABELS[source.canal] || source.canal,
        formatLabel: FORMAT_LABELS[source.formato] ?? source.formato,
        status,
        statusLabel: weekStatusLabel(status),
        actionLabel: action.actionLabel,
        actionText: action.actionText,
      },
    };
  });
}

export function buildSprintProgress(input: {
  nowActions: MarketingNowAction[];
  nextActions: MarketingNextAction[];
  groupPublications: number;
  now?: Date;
}): MarketingSprintProgress {
  const now = input.now ?? new Date();
  const start = new Date(`${CHILE_SALES_SPRINT_START}T04:00:00.000Z`);
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / MS_DAY));
  const week = Math.min(30, Math.max(1, Math.floor(elapsedDays / 7) + 1));
  const onboardingDone = input.nowActions.find((action) => action.id === "onboarding")?.done ?? false;
  const demoDone = input.nowActions.find((action) => action.id === "demo_celular")?.done ?? false;
  const utmDone = input.nowActions.find((action) => action.id === "utm")?.done ?? false;
  const publications = input.nextActions.find((action) => action.id === "publicaciones");
  const followUps = input.nextActions.find((action) => action.id === "seguimientos");
  const publishedThisWeek = publications?.current ?? 0;
  const publishedTarget = publications?.target ?? 3;
  const overdue = followUps?.current ?? 0;

  const checks = [
    { done: onboardingDone, milestone: "Grabar los 2 videos de onboarding" },
    { done: demoDone, milestone: "Publicar una demo desde el celular" },
    { done: utmDone, milestone: "Completar UTM de las piezas listas" },
    { done: publishedThisWeek >= 1, milestone: "Publicar la primera pieza de la semana" },
    { done: publishedThisWeek >= publishedTarget, milestone: `Publicar ${publishedTarget} piezas esta semana` },
    { done: overdue === 0, milestone: "Responder seguimientos vencidos" },
    { done: input.groupPublications > 0, milestone: "Registrar una pieza en grupos de Facebook" },
  ];
  const completed = checks.filter((check) => check.done).length;
  const next = checks.find((check) => !check.done)?.milestone ?? "Mantener la cadencia de la semana";

  return {
    title: `Semana ${week} de 30 — Chile Sales Sprint`,
    detail: "Publica contenido, agenda DEMOs y activa pilotos. Un paso a la vez.",
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    nextMilestone: next,
  };
}
