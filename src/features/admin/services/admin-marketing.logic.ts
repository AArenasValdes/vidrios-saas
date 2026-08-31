import { formatRelativeActivity } from "@/features/admin/services/admin-clientes-filters.service";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { AdminPublicChannelSummary } from "@/features/admin/types/admin-public-channel";
import type { PublicSolicitudRow } from "@/features/admin/services/admin-public-channel.logic";
import type {
  MarketingChannelId,
  MarketingChannelRow,
  MarketingCommercialState,
  MarketingFunnelStep,
  MarketingFunnelStepId,
  MarketingKpi,
  MarketingMeasurementGap,
  MarketingPeriodPreset,
  MarketingPeriodSummary,
  MarketingPeriodWindow,
  MarketingProspectSnapshot,
  MarketingPublicCompanyRow,
  MarketingPublicPrimaryAction,
  MarketingPublicRecommendedStatus,
  MarketingQuoteUsage,
  MarketingRecentSolicitudEvent,
} from "@/features/admin/types/admin-marketing";
import type { QuoteCreationSurface } from "@/features/cotizaciones/types/quote-creation-surface";

const MS_DAY = 24 * 60 * 60 * 1000;

export const MARKETING_CHANNEL_LABELS: Record<MarketingChannelId, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  referidos: "Referidos",
  pagina_ventora: "Página Ventora",
  grupos: "Grupos",
  otro: "Otro",
  sin_origen: "Sin origen",
};

export const MARKETING_COMMERCIAL_STATE_LABELS: Record<MarketingCommercialState, string> = {
  prospecto: "Prospecto",
  contactado: "Contactado",
  demo_agendada: "Demo agendada",
  trial_iniciado: "Trial iniciado",
  cliente_pagado: "Cliente pagado",
  perdido: "Perdido",
};

export const MARKETING_PUBLIC_STATUS_LABELS: Record<MarketingPublicRecommendedStatus, string> = {
  buen_movimiento: "Buen movimiento",
  falta_cotizar: "Recibió solicitudes, falta cotizar",
  sin_actividad: "Página publicada sin actividad",
  falta_whatsapp: "Falta configurar WhatsApp",
  falta_publicar: "Falta publicar página",
  pendientes_revision: "Solicitudes pendientes de revisar",
};

const FUNNEL_ORDER: MarketingFunnelStepId[] = [
  "prospectos",
  "contactados",
  "demo",
  "trial",
  "pagado",
];

const FUNNEL_LABELS: Record<MarketingFunnelStepId, string> = {
  prospectos: "Prospectos",
  contactados: "Contactados",
  demo: "Demo",
  trial: "Trial",
  pagado: "Pagado",
};

const ALL_CHANNELS: MarketingChannelId[] = [
  "instagram",
  "facebook",
  "whatsapp",
  "referidos",
  "pagina_ventora",
  "grupos",
  "otro",
];

export type MarketingQuoteUsageRow = {
  pricingMode: string | null;
  creationSurface: QuoteCreationSurface | null;
  pdfDownloadedAt: string | null;
  creadoEn?: string | null;
};

export function buildMarketingQuoteUsage(rows: MarketingQuoteUsageRow[]): MarketingQuoteUsage {
  const itemQuotes = rows.filter((row) => row.pricingMode === "por_item");
  const constructorItemQuotes = itemQuotes.filter((row) =>
    row.creationSurface === "mobile_constructor" || row.creationSurface === "desktop_constructor"
  );
  const mobileConstructorQuotes = itemQuotes.filter(
    (row) => row.creationSurface === "mobile_constructor"
  );
  const desktopConstructorQuotes = itemQuotes.filter(
    (row) => row.creationSurface === "desktop_constructor"
  );
  const guidedItemQuotes = itemQuotes.filter(
    (row) => row.creationSurface === "mobile_guiada" || row.creationSurface === "desktop_guiada"
  );
  const classifiedItemQuotes = itemQuotes.filter((row) => row.creationSurface !== null);

  return {
    totalQuotes: rows.length,
    itemQuotes: itemQuotes.length,
    totalGlobalQuotes: rows.filter((row) => row.pricingMode === "total_global").length,
    constructorItemQuotes: constructorItemQuotes.length,
    mobileConstructorQuotes: mobileConstructorQuotes.length,
    desktopConstructorQuotes: desktopConstructorQuotes.length,
    guidedItemQuotes: guidedItemQuotes.length,
    constructorItemPdfs: constructorItemQuotes.filter((row) => row.pdfDownloadedAt !== null).length,
    classifiedItemQuotes: classifiedItemQuotes.length,
    historicalUnclassifiedItemQuotes: itemQuotes.length - classifiedItemQuotes.length,
  };
}

export function buildMarketingQuoteUsageKpis(input: {
  usage: MarketingQuoteUsage;
  period: MarketingPeriodWindow;
}): MarketingKpi[] {
  const itemShare = formatPct(input.usage.itemQuotes, input.usage.totalQuotes);
  const constructorPdfShare = formatPct(
    input.usage.constructorItemPdfs,
    input.usage.constructorItemQuotes
  );

  return [
    {
      id: "real_quotes",
      label: "Cotizaciones reales",
      value: input.usage.totalQuotes,
      displayValue: String(input.usage.totalQuotes),
      subtitle: input.period.label,
      insight: "Cuentas demo excluidas",
      tone: "blue",
      changePct: null,
    },
    {
      id: "items_quotes",
      label: "Por ítems",
      value: input.usage.itemQuotes,
      displayValue: String(input.usage.itemQuotes),
      subtitle: itemShare === null ? "Sin cotizaciones" : `${itemShare}% del uso real`,
      insight: `${input.usage.totalGlobalQuotes} por total global`,
      tone: "cyan",
      changePct: null,
    },
    {
      id: "constructor_items",
      label: "Constructor de piezas",
      value: input.usage.constructorItemQuotes,
      displayValue: String(input.usage.constructorItemQuotes),
      subtitle: "Dentro de por ítems",
      insight:
        input.usage.classifiedItemQuotes === 0
          ? "Aún sin datos nuevos"
          : `Móvil ${input.usage.mobileConstructorQuotes} · PC ${input.usage.desktopConstructorQuotes}`,
      tone: "violet",
      changePct: null,
    },
    {
      id: "guided_items",
      label: "Guiada por ítems",
      value: input.usage.guidedItemQuotes,
      displayValue: String(input.usage.guidedItemQuotes),
      subtitle: "Dentro de por ítems",
      insight:
        input.usage.classifiedItemQuotes === 0
          ? "Aún sin datos nuevos"
          : `${input.usage.classifiedItemQuotes} cotizaciones por ítems clasificadas`,
      tone: "cyan",
      changePct: null,
    },
    {
      id: "constructor_pdf",
      label: "PDF tras Constructor",
      value: constructorPdfShare ?? 0,
      displayValue: constructorPdfShare === null ? "—" : `${constructorPdfShare}%`,
      subtitle: "Constructor → PDF",
      insight:
        input.usage.constructorItemQuotes === 0
          ? "Esperando primeras cotizaciones"
          : `${input.usage.constructorItemPdfs} de ${input.usage.constructorItemQuotes} con PDF`,
      tone: "green",
      changePct: null,
    },
  ];
}

/** Estados reales en solicitudes_contacto.estado */
export const SOLICITUD_REVISION_STATES = [
  "nueva",
  "contactada",
  "cerrada",
  "descartada",
] as const;

export const SOLICITUD_REVISION_STATE_AVAILABLE = true;
export const QUOTES_FROM_REQUESTS_AVAILABLE = true;

export const CONFIGURED_ACQUISITION_SOURCES = [
  "Instagram",
  "WhatsApp",
  "Referidos",
  "Página Ventora",
  "Grupos",
  "Otro",
] as const;

const PRIMARY_ACTION_LABELS: Record<MarketingPublicPrimaryAction, string> = {
  ver_solicitudes: "Ver solicitudes",
  abrir_pagina: "Abrir página",
  configurar_pagina: "Configurar página",
  configurar_contacto: "Configurar contacto",
};

export function normalizeMarketingChannel(fuente: string | null | undefined): MarketingChannelId {
  const raw = (fuente ?? "").trim().toLowerCase();
  if (!raw || raw === "manual" || raw === "csv") return "sin_origen";
  if (raw.includes("instagram") || raw === "ig") return "instagram";
  if (raw.includes("facebook") || raw === "fb") return "facebook";
  if (raw.includes("whatsapp") || raw === "wa") return "whatsapp";
  if (raw.includes("referid") || raw.includes("referral")) return "referidos";
  if (
    raw.includes("ventora") ||
    raw.includes("landing") ||
    raw.includes("pagina ventora") ||
    raw.includes("página ventora")
  ) {
    return "pagina_ventora";
  }
  if (raw.includes("grupo") || raw.includes("group")) return "grupos";
  return "otro";
}

export function resolveCommercialState(estado: string): MarketingCommercialState {
  switch (estado) {
    case "contactado":
    case "respondio":
    case "calificado":
      return "contactado";
    case "demo_agendada":
      return "demo_agendada";
    case "piloto_activo":
    case "activado":
      return "trial_iniciado";
    case "pagado":
      return "cliente_pagado";
    case "sin_respuesta":
    case "no_calza":
    case "no_contactar":
      return "perdido";
    default:
      return "prospecto";
  }
}

function resolveFunnelStage(estado: string): MarketingFunnelStepId | "perdido" {
  const commercial = resolveCommercialState(estado);
  if (commercial === "perdido") return "perdido";
  if (commercial === "cliente_pagado") return "pagado";
  if (commercial === "trial_iniciado") return "trial";
  if (commercial === "demo_agendada") return "demo";
  if (commercial === "contactado") return "contactados";
  return "prospectos";
}

function hasReachedFunnelStage(estado: string, stage: MarketingFunnelStepId): boolean {
  const current = resolveFunnelStage(estado);
  if (current === "perdido") return false;
  return FUNNEL_ORDER.indexOf(current) >= FUNNEL_ORDER.indexOf(stage);
}

export function isWithinWindow(iso: string, start: Date, end: Date) {
  const value = new Date(iso).getTime();
  return value >= start.getTime() && value <= end.getTime();
}

export function resolveMarketingPeriodWindow(input: {
  preset?: MarketingPeriodPreset;
  customStart?: string | null;
  customEnd?: string | null;
  now?: Date;
}): MarketingPeriodWindow {
  const now = input.now ?? new Date();
  const preset = input.preset ?? "30d";
  let start: Date;
  let end: Date;
  let label: string;

  if (preset === "custom" && input.customStart && input.customEnd) {
    start = new Date(input.customStart);
    end = new Date(input.customEnd);
    end.setHours(23, 59, 59, 999);
    label = "Personalizado";
  } else if (preset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
    label = "Este mes";
  } else if (preset === "7d") {
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
    start = new Date(end.getTime() - 7 * MS_DAY);
    start.setHours(0, 0, 0, 0);
    label = "Últimos 7 días";
  } else {
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
    start = new Date(end.getTime() - 30 * MS_DAY);
    start.setHours(0, 0, 0, 0);
    label = "Últimos 30 días";
  }

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    preset: preset === "custom" && input.customStart ? "custom" : preset,
    start: start.toISOString(),
    end: end.toISOString(),
    previousStart: previousStart.toISOString(),
    previousEnd: previousEnd.toISOString(),
    label,
  };
}

function filterCohortProspects(
  prospects: MarketingProspectSnapshot[],
  start: Date,
  end: Date
) {
  return prospects.filter(
    (prospect) =>
      prospect.dataStatus !== "mock" &&
      !prospect.noContactar &&
      isWithinWindow(prospect.creadoEn, start, end)
  );
}

export function countProspectsWithOriginInPeriod(
  prospects: MarketingProspectSnapshot[],
  period: MarketingPeriodWindow
) {
  const start = new Date(period.start);
  const end = new Date(period.end);
  return filterCohortProspects(prospects, start, end).filter(
    (prospect) =>
      prospect.channelId !== "sin_origen" &&
      resolveCommercialState(prospect.estado) !== "perdido"
  ).length;
}

export function hasAcquisitionMeasurementBase(
  prospects: MarketingProspectSnapshot[],
  period: MarketingPeriodWindow
) {
  return countProspectsWithOriginInPeriod(prospects, period) >= 1;
}

export function buildMarketingPeriodSummary(input: {
  clients: AdminClientListItem[];
  summaries: Map<number, AdminPublicChannelSummary>;
  solicitudesByOrg: Map<number, PublicSolicitudRow[]>;
  period: MarketingPeriodWindow;
}): MarketingPeriodSummary {
  const start = new Date(input.period.start);
  const end = new Date(input.period.end);
  const realClients = input.clients.filter((client) => !client.isTestAccount);

  let publishedPages = 0;
  let companiesWithRecentSolicitudes = 0;
  let totalPublicSolicitudes = 0;

  for (const client of realClients) {
    const summary = input.summaries.get(client.organizationId);
    if (summary?.pageStatus === "publicada") publishedPages += 1;

    const orgSolicitudes = input.solicitudesByOrg.get(client.organizationId) ?? [];
    const periodCount = countSolicitudesInPeriod(orgSolicitudes, start, end);
    totalPublicSolicitudes += periodCount;
    if (periodCount > 0) companiesWithRecentSolicitudes += 1;
  }

  return {
    companiesEvaluated: realClients.length,
    publishedPages,
    companiesWithRecentSolicitudes,
    totalPublicSolicitudes,
    label: `${realClients.length} empresas evaluadas · ${publishedPages} páginas publicadas · ${companiesWithRecentSolicitudes} empresas con solicitudes recientes`,
  };
}

export function resolveMarketingPublicPrimaryAction(input: {
  pageStatus: AdminPublicChannelSummary["pageStatus"];
  solicitudesInPeriod: number;
  whatsappConfigured: boolean;
}): MarketingPublicPrimaryAction {
  if (input.pageStatus === "no_configurada" || input.pageStatus === "borrador") {
    return "configurar_pagina";
  }
  if (input.pageStatus === "publicada" && !input.whatsappConfigured) {
    return "configurar_contacto";
  }
  if (input.pageStatus === "publicada" && input.solicitudesInPeriod > 0) {
    return "ver_solicitudes";
  }
  if (input.pageStatus === "publicada") {
    return "abrir_pagina";
  }
  return "configurar_pagina";
}

function formatDeltaInsight(current: number, previous: number, unit: string) {
  if (current === 0 && previous === 0) return `Sin ${unit} en el período`;
  const delta = current - previous;
  if (delta === 0) return "Sin cambio vs. período anterior";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} vs. período anterior`;
}

function formatPct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function periodChangePct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildAcquisitionKpis(input: {
  prospects: MarketingProspectSnapshot[];
  period: MarketingPeriodWindow;
}): MarketingKpi[] {
  const start = new Date(input.period.start);
  const end = new Date(input.period.end);
  const prevStart = new Date(input.period.previousStart);
  const prevEnd = new Date(input.period.previousEnd);

  const cohort = filterCohortProspects(input.prospects, start, end);
  const prevCohort = filterCohortProspects(input.prospects, prevStart, prevEnd);

  const newProspects = cohort.filter((item) => resolveCommercialState(item.estado) !== "perdido");
  const prevNewProspects = prevCohort.filter(
    (item) => resolveCommercialState(item.estado) !== "perdido"
  );

  const demos = cohort.filter((item) => hasReachedFunnelStage(item.estado, "demo"));
  const prevDemos = prevCohort.filter((item) => hasReachedFunnelStage(item.estado, "demo"));

  const trials = cohort.filter((item) => hasReachedFunnelStage(item.estado, "trial"));
  const prevTrials = prevCohort.filter((item) => hasReachedFunnelStage(item.estado, "trial"));

  const paid = cohort.filter((item) => hasReachedFunnelStage(item.estado, "pagado"));
  const prevPaid = prevCohort.filter((item) => hasReachedFunnelStage(item.estado, "pagado"));

  const withoutOrigin = cohort.filter((item) => item.channelId === "sin_origen").length;
  const trialToPaidPct = formatPct(paid.length, trials.length);
  const prevTrialToPaidPct = formatPct(prevPaid.length, prevTrials.length);

  return [
    {
      id: "new_prospects",
      label: "Prospectos agregados",
      value: newProspects.length,
      displayValue: String(newProspects.length),
      subtitle: input.period.label,
      insight: formatDeltaInsight(newProspects.length, prevNewProspects.length, "altas"),
      tone: "blue",
      badge: withoutOrigin > 0 ? `${withoutOrigin} sin origen` : undefined,
      filterKey: "prospecto",
      changePct: periodChangePct(newProspects.length, prevNewProspects.length),
    },
    {
      id: "demos",
      label: "Demos agendadas",
      value: demos.length,
      displayValue: String(demos.length),
      subtitle: "en el embudo del período",
      insight:
        demos.length === 0
          ? "Sin demos registradas en el período"
          : formatDeltaInsight(demos.length, prevDemos.length, "demos"),
      tone: "violet",
      filterKey: "demo_agendada",
      changePct: periodChangePct(demos.length, prevDemos.length),
    },
    {
      id: "trials",
      label: "Trials iniciados",
      value: trials.length,
      displayValue: String(trials.length),
      subtitle: "desde prospectos del período",
      insight: formatDeltaInsight(trials.length, prevTrials.length, "trials"),
      tone: "cyan",
      filterKey: "trial_iniciado",
      changePct: periodChangePct(trials.length, prevTrials.length),
    },
    {
      id: "paid",
      label: "Clientes pagados",
      value: paid.length,
      displayValue: String(paid.length),
      subtitle: "atribuidos al cohort del período",
      insight: formatDeltaInsight(paid.length, prevPaid.length, "pagos"),
      tone: "green",
      filterKey: "cliente_pagado",
      changePct: periodChangePct(paid.length, prevPaid.length),
    },
    {
      id: "trial_to_paid",
      label: "Trial → pago",
      value: trialToPaidPct ?? 0,
      displayValue: trialToPaidPct === null ? "—" : `${trialToPaidPct}%`,
      subtitle: "cohort del período",
      insight:
        trialToPaidPct === null
          ? "Datos insuficientes para calcular avance"
          : `${paid.length} de ${trials.length} trials`,
      tone: "amber",
      changePct:
        trialToPaidPct === null || prevTrialToPaidPct === null
          ? null
          : periodChangePct(trialToPaidPct, prevTrialToPaidPct),
    },
  ];
}

export function buildAcquisitionFunnel(input: {
  prospects: MarketingProspectSnapshot[];
  period: MarketingPeriodWindow;
}): {
  steps: MarketingFunnelStep[];
  dropStageId: MarketingFunnelStepId | null;
  insight: string;
} {
  const start = new Date(input.period.start);
  const end = new Date(input.period.end);
  const cohort = filterCohortProspects(input.prospects, start, end).filter(
    (item) => resolveCommercialState(item.estado) !== "perdido"
  );

  const total = cohort.length;
  const counts = FUNNEL_ORDER.map((stage) => ({
    id: stage,
    label: FUNNEL_LABELS[stage],
    count: cohort.filter((item) => hasReachedFunnelStage(item.estado, stage)).length,
  }));

  const steps: MarketingFunnelStep[] = counts.map((step, index) => {
    const previous = index === 0 ? step.count : counts[index - 1]?.count ?? 0;
    return {
      id: step.id,
      label: step.label,
      count: step.count,
      pctOfPrevious: index === 0 ? null : formatPct(step.count, previous),
      pctOfTotal: total > 0 ? formatPct(step.count, total) ?? 0 : 0,
      hasRealSignal: total > 0,
    };
  });

  if (total === 0) {
    return {
      steps,
      dropStageId: null,
      insight: "Aún no hay prospectos en el período seleccionado.",
    };
  }

  let maxDrop = 0;
  let dropStageId: MarketingFunnelStepId | null = null;

  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1]?.count ?? 0;
    const current = steps[index]?.count ?? 0;
    if (previous <= 0) continue;
    const dropPct = ((previous - current) / previous) * 100;
    if (dropPct > maxDrop) {
      maxDrop = dropPct;
      dropStageId = steps[index]?.id ?? null;
    }
  }

  if (!dropStageId || maxDrop < 5) {
    return {
      steps,
      dropStageId: null,
      insight: "Sin caída crítica detectada en el embudo del período.",
    };
  }

  const previousLabel = FUNNEL_LABELS[FUNNEL_ORDER[FUNNEL_ORDER.indexOf(dropStageId) - 1] ?? "prospectos"];
  const currentLabel = FUNNEL_LABELS[dropStageId];
  return {
    steps,
    dropStageId,
    insight: `Principal caída: ${previousLabel} → ${currentLabel}.`,
  };
}

export function buildChannelRows(input: {
  prospects: MarketingProspectSnapshot[];
  period: MarketingPeriodWindow;
}): {
  rows: MarketingChannelRow[];
  bestConversionChannelId: MarketingChannelId | null;
  prospectsWithoutOrigin: number;
} {
  const start = new Date(input.period.start);
  const end = new Date(input.period.end);
  const cohort = filterCohortProspects(input.prospects, start, end).filter(
    (item) => resolveCommercialState(item.estado) !== "perdido"
  );

  const prospectsWithoutOrigin = cohort.filter((item) => item.channelId === "sin_origen").length;

  const rows: MarketingChannelRow[] = ALL_CHANNELS.map((channelId) => {
    const channelProspects = cohort.filter((item) => item.channelId === channelId);
    const trials = channelProspects.filter((item) => hasReachedFunnelStage(item.estado, "trial"));
    const paid = channelProspects.filter((item) => hasReachedFunnelStage(item.estado, "pagado"));
    const lastActivityAt = channelProspects.reduce<string | null>((latest, item) => {
      const candidate = item.actualizadoEn || item.creadoEn;
      if (!latest || candidate > latest) return candidate;
      return latest;
    }, null);

    const hasEnoughData = channelProspects.length >= 3;

    return {
      id: channelId,
      label: MARKETING_CHANNEL_LABELS[channelId],
      prospects: channelProspects.length,
      trials: trials.length,
      paid: paid.length,
      conversionPct: formatPct(paid.length, channelProspects.length),
      lastActivityAt,
      lastActivityLabel: lastActivityAt ? formatRelativeActivity(lastActivityAt) : "—",
      hasEnoughData,
    };
  }).filter((row) => row.prospects > 0);

  const eligible = rows.filter(
    (row) => row.hasEnoughData && row.conversionPct !== null && row.prospects >= 3
  );
  const bestConversionChannelId =
    eligible.sort((left, right) => (right.conversionPct ?? 0) - (left.conversionPct ?? 0))[0]?.id ??
    null;

  return { rows, bestConversionChannelId, prospectsWithoutOrigin };
}

function countSolicitudesInPeriod(
  solicitudes: PublicSolicitudRow[],
  start: Date,
  end: Date
) {
  return solicitudes.filter(
    (item) =>
      item.contexto === "empresa-publica" && isWithinWindow(item.creado_en, start, end)
  ).length;
}

export function resolvePublicRecommendedStatus(input: {
  client: AdminClientListItem;
  summary: AdminPublicChannelSummary;
  solicitudesInPeriod: number;
  linkedQuotesInPeriod?: number;
  quotesFromRequestsAvailable?: boolean;
}): {
  status: MarketingPublicRecommendedStatus;
  label: string;
  detail: string | null;
} {
  if (
    SOLICITUD_REVISION_STATE_AVAILABLE &&
    input.summary.solicitudesPending > 0
  ) {
    return {
      status: "pendientes_revision",
      label: MARKETING_PUBLIC_STATUS_LABELS.pendientes_revision,
      detail: `${input.summary.solicitudesPending} solicitud${input.summary.solicitudesPending === 1 ? "" : "es"} en estado nueva`,
    };
  }

  if (input.summary.pageStatus === "no_configurada" || input.summary.pageStatus === "borrador") {
    return {
      status: "falta_publicar",
      label: MARKETING_PUBLIC_STATUS_LABELS.falta_publicar,
      detail: null,
    };
  }

  if (input.summary.pageStatus === "publicada" && !input.summary.whatsappConfigured) {
    return {
      status: "falta_whatsapp",
      label: MARKETING_PUBLIC_STATUS_LABELS.falta_whatsapp,
      detail: null,
    };
  }

  if (input.solicitudesInPeriod > 0) {
    const quotesAvailable = input.quotesFromRequestsAvailable ?? QUOTES_FROM_REQUESTS_AVAILABLE;
    if (quotesAvailable && (input.linkedQuotesInPeriod ?? 0) === 0) {
      return {
        status: "falta_cotizar",
        label: MARKETING_PUBLIC_STATUS_LABELS.falta_cotizar,
        detail: null,
      };
    }

    return {
      status: "buen_movimiento",
      label: MARKETING_PUBLIC_STATUS_LABELS.buen_movimiento,
      detail: quotesAvailable
        ? null
        : "Relación solicitud → cotización aún no disponible",
    };
  }

  if (input.summary.pageStatus === "publicada") {
    return {
      status: "sin_actividad",
      label: MARKETING_PUBLIC_STATUS_LABELS.sin_actividad,
      detail: null,
    };
  }

  return {
    status: "sin_actividad",
    label: MARKETING_PUBLIC_STATUS_LABELS.sin_actividad,
    detail: null,
  };
}

export function buildPublicPageKpis(input: {
  clients: AdminClientListItem[];
  summaries: Map<number, AdminPublicChannelSummary>;
  solicitudesByOrg: Map<number, PublicSolicitudRow[]>;
  period: MarketingPeriodWindow;
}): MarketingKpi[] {
  const start = new Date(input.period.start);
  const end = new Date(input.period.end);
  const realClients = input.clients.filter((client) => !client.isTestAccount);

  let published = 0;
  let notConfigured = 0;
  let solicitudesInPeriod = 0;
  let clientsWithSolicitudes = 0;
  let pendingReview = 0;

  for (const client of realClients) {
    const summary = input.summaries.get(client.organizationId);
    if (!summary) {
      notConfigured += 1;
      continue;
    }
    if (summary.pageStatus === "publicada") published += 1;
    else notConfigured += 1;

    const orgSolicitudes = input.solicitudesByOrg.get(client.organizationId) ?? [];
    const periodCount = countSolicitudesInPeriod(orgSolicitudes, start, end);
    solicitudesInPeriod += periodCount;
    if (periodCount > 0) clientsWithSolicitudes += 1;
    pendingReview += summary.solicitudesPending;
  }

  return [
    {
      id: "published_pages",
      label: "Páginas publicadas",
      value: published,
      displayValue: String(published),
      subtitle: "clientes con página activa",
      insight: published > 0 ? "Captación pública habilitada" : "Sin páginas publicadas aún",
      tone: "cyan",
      filterKey: "publicada",
      changePct: null,
    },
    {
      id: "not_configured",
      label: "Sin página configurada",
      value: notConfigured,
      displayValue: String(notConfigured),
      subtitle: "requieren setup",
      insight: notConfigured > 0 ? "Oportunidad de activación" : "Todas con página o borrador",
      tone: "amber",
      filterKey: "no_configurada",
      changePct: null,
    },
    {
      id: "public_requests",
      label: "Solicitudes públicas recibidas",
      value: solicitudesInPeriod,
      displayValue: String(solicitudesInPeriod),
      subtitle: input.period.label,
      insight:
        solicitudesInPeriod > 0
          ? `${clientsWithSolicitudes} empresa${clientsWithSolicitudes === 1 ? "" : "s"} con solicitudes`
          : "Sin solicitudes en el período",
      tone: "violet",
      filterKey: "con_solicitudes",
      changePct: null,
    },
    {
      id: "clients_with_requests",
      label: "Clientes con solicitudes recientes",
      value: clientsWithSolicitudes,
      displayValue: String(clientsWithSolicitudes),
      subtitle: "en el período",
      insight:
        clientsWithSolicitudes > 0 ? "Movimiento real en canal público" : "Sin movimiento reciente",
      tone: "blue",
      changePct: null,
    },
    {
      id: "pending_review",
      label: SOLICITUD_REVISION_STATE_AVAILABLE
        ? "Solicitudes pendientes de revisar"
        : "Solicitudes recibidas",
      value: SOLICITUD_REVISION_STATE_AVAILABLE ? pendingReview : solicitudesInPeriod,
      displayValue: String(
        SOLICITUD_REVISION_STATE_AVAILABLE ? pendingReview : solicitudesInPeriod
      ),
      subtitle: SOLICITUD_REVISION_STATE_AVAILABLE ? "estado nueva" : input.period.label,
      insight: SOLICITUD_REVISION_STATE_AVAILABLE
        ? pendingReview > 0
          ? "Requieren seguimiento operativo"
          : "Sin pendientes sin revisar"
        : "Estado de revisión aún no disponible",
      tone: SOLICITUD_REVISION_STATE_AVAILABLE && pendingReview > 0 ? "amber" : "green",
      filterKey: SOLICITUD_REVISION_STATE_AVAILABLE ? "pendientes" : "con_solicitudes",
      changePct: null,
    },
  ];
}

export function buildPublicCompanyRows(input: {
  clients: AdminClientListItem[];
  summaries: Map<number, AdminPublicChannelSummary>;
  solicitudesByOrg: Map<number, PublicSolicitudRow[]>;
  period: MarketingPeriodWindow;
  linkedQuotesBySolicitud?: Map<string, number>;
  quotesFromRequestsAvailable?: boolean;
}): MarketingPublicCompanyRow[] {
  const start = new Date(input.period.start);
  const end = new Date(input.period.end);

  return input.clients
    .filter((client) => !client.isTestAccount)
    .map((client) => {
      const summary = input.summaries.get(client.organizationId);
      const orgSolicitudes = input.solicitudesByOrg.get(client.organizationId) ?? [];
      const solicitudesInPeriod = countSolicitudesInPeriod(orgSolicitudes, start, end);
      const linkedQuotesInPeriod = orgSolicitudes
        .filter((solicitud) => isWithinWindow(solicitud.creado_en, start, end))
        .reduce(
          (total, solicitud) =>
            total + (input.linkedQuotesBySolicitud?.get(solicitud.id) ?? 0),
          0
        );
      const pageStatus = summary?.pageStatus ?? "no_configurada";
      const pageStatusLabel = summary?.pageStatusLabel ?? "No configurada";
      const whatsappConfigured = summary?.whatsappConfigured ?? false;
      const recommended = resolvePublicRecommendedStatus({
        client,
        summary: summary ?? {
          pageStatus: "no_configurada",
          pageStatusLabel: "No configurada",
          slug: null,
          publicPageUrl: null,
          solicitudesTotal: 0,
          solicitudesLast30Days: 0,
          solicitudesPending: 0,
          lastSolicitudAt: null,
          lastSolicitanteNombre: null,
          oldestPendingAt: null,
          whatsappConfigured: false,
          formActive: false,
          companyDataComplete: false,
          scheduleConfigured: false,
          recommendedStatus: "",
          quotesFromRequestsAvailable: false,
        },
        solicitudesInPeriod,
        linkedQuotesInPeriod,
        quotesFromRequestsAvailable: input.quotesFromRequestsAvailable,
      });
      const primaryAction = resolveMarketingPublicPrimaryAction({
        pageStatus,
        solicitudesInPeriod,
        whatsappConfigured,
      });

      return {
        organizationId: client.organizationId,
        empresaNombre: client.empresaNombre,
        pageStatus,
        pageStatusLabel,
        solicitudesInPeriod,
        solicitudesPending: summary?.solicitudesPending ?? 0,
        lastSolicitudAt: summary?.lastSolicitudAt ?? null,
        lastSolicitudLabel: summary?.lastSolicitudAt
          ? formatRelativeActivity(summary.lastSolicitudAt)
          : "—",
        cotizacionesCount: client.cotizacionesCount,
        cotizacionesLinkedLabel: input.quotesFromRequestsAvailable
          ? String(linkedQuotesInPeriod)
          : solicitudesInPeriod > 0
            ? "Relación solicitud → cotización aún no disponible"
            : "—",
        recommendedStatus: recommended.status,
        recommendedLabel: recommended.label,
        recommendedDetail: recommended.detail,
        publicPageUrl: summary?.publicPageUrl ?? null,
        slug: summary?.slug ?? null,
        whatsappConfigured,
        whatsappUrl: client.telefonoPrincipal
          ? `https://wa.me/${client.telefonoPrincipal.replace(/\D/g, "")}`
          : null,
        primaryAction,
        primaryActionLabel: PRIMARY_ACTION_LABELS[primaryAction],
      };
    })
    .filter(
      (row) =>
        row.pageStatus === "publicada" ||
        row.solicitudesInPeriod > 0 ||
        row.solicitudesPending > 0 ||
        row.pageStatus === "borrador"
    )
    .sort((left, right) => {
      if (right.solicitudesInPeriod !== left.solicitudesInPeriod) {
        return right.solicitudesInPeriod - left.solicitudesInPeriod;
      }
      const leftAt = left.lastSolicitudAt ? new Date(left.lastSolicitudAt).getTime() : 0;
      const rightAt = right.lastSolicitudAt ? new Date(right.lastSolicitudAt).getTime() : 0;
      return rightAt - leftAt;
    });
}

export function buildRecentPublicSolicitudes(input: {
  solicitudes: PublicSolicitudRow[];
  clientsByOrg: Map<number, AdminClientListItem>;
  period: MarketingPeriodWindow;
  limit?: number;
}): MarketingRecentSolicitudEvent[] {
  const start = new Date(input.period.start);
  const end = new Date(input.period.end);
  const limit = input.limit ?? 5;

  return input.solicitudes
    .filter(
      (item) =>
        item.contexto === "empresa-publica" && isWithinWindow(item.creado_en, start, end)
    )
    .slice(0, limit)
    .map((item) => {
      const orgId = Number(item.organization_id);
      const client = input.clientsByOrg.get(orgId);
      return {
        id: item.id,
        organizationId: orgId,
        empresaNombre: client?.empresaNombre ?? `Org ${orgId}`,
        solicitanteNombre: item.nombre?.trim() || "Solicitante",
        relativeAt: formatRelativeActivity(item.creado_en),
        creadoEn: item.creado_en,
        solicitudHref: `/admin/clientes/${orgId}?solicitud=${item.id}`,
        cuentaHref: `/admin/clientes/${orgId}`,
      };
    });
}

export function buildMeasurementGaps(input: {
  clients: AdminClientListItem[];
  summaries: Map<number, AdminPublicChannelSummary>;
}): MarketingMeasurementGap[] {
  const realClients = input.clients.filter((client) => !client.isTestAccount);
  let notConfigured = 0;
  let publishedWithoutWhatsapp = 0;

  for (const client of realClients) {
    const summary = input.summaries.get(client.organizationId);
    if (!summary || summary.pageStatus !== "publicada") {
      notConfigured += 1;
      continue;
    }
    if (!summary.whatsappConfigured) publishedWithoutWhatsapp += 1;
  }

  const gaps: MarketingMeasurementGap[] = [
    {
      id: "quotes_link",
      title: "Vincular solicitudes a cotizaciones",
      label:
        "Hoy puedes medir solicitudes recibidas, pero aún no qué solicitudes terminan en cotización.",
      count: null,
      ctaLabel: "Revisar relación",
      ctaHref: "/admin/clientes",
      priority: "alta",
    },
  ];

  if (notConfigured > 0) {
    gaps.push({
      id: "without_page",
      title: "Páginas públicas sin publicar",
      label: `${notConfigured} cliente${notConfigured === 1 ? "" : "s"} sin página pública publicada`,
      count: notConfigured,
      ctaLabel: "Configurar páginas",
      ctaHref: "/admin/clientes",
      priority: "media",
    });
  }

  if (publishedWithoutWhatsapp > 0) {
    gaps.push({
      id: "without_whatsapp",
      title: "Contacto incompleto",
      label: `${publishedWithoutWhatsapp} página${publishedWithoutWhatsapp === 1 ? "" : "s"} sin WhatsApp configurado`,
      count: publishedWithoutWhatsapp,
      ctaLabel: "Configurar contacto",
      ctaHref: "/admin/clientes",
      priority: "media",
    });
  }

  gaps.push({
    id: "visits",
    title: "Tráfico y visitas",
    label: "Visitas y tráfico aún no disponibles. Conecta GA4 o registra eventos para medir tráfico.",
    count: null,
    ctaLabel: "Configurar analítica",
    ctaHref: "/admin/marketing?config=analytics",
    priority: "baja",
  });

  return gaps;
}

export function mapProspectRow(row: {
  id: string;
  empresa: string;
  contacto_nombre: string | null;
  fuente: string;
  estado: string;
  converted_organization_id: number | null;
  no_contactar: boolean;
  data_status: string;
  creado_en: string;
  actualizado_en: string;
  proxima_accion_en?: string | null;
}): MarketingProspectSnapshot {
  return {
    id: row.id,
    empresa: row.empresa,
    contactoNombre: row.contacto_nombre,
    fuente: row.fuente,
    channelId: normalizeMarketingChannel(row.fuente),
    estado: row.estado,
    commercialState: resolveCommercialState(row.estado),
    convertedOrganizationId: row.converted_organization_id
      ? Number(row.converted_organization_id)
      : null,
    noContactar: row.no_contactar,
    dataStatus: row.data_status,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    proximaAccionEn: row.proxima_accion_en ?? null,
  };
}
