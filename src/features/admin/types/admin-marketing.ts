import type { ClientesKpiTone } from "@/features/admin/services/admin-clientes-filters.service";
import type { PublicPageStatus } from "@/features/admin/types/admin-public-channel";

export type MarketingChannelId =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "referidos"
  | "pagina_ventora"
  | "grupos"
  | "otro"
  | "sin_origen";

export type MarketingCommercialState =
  | "prospecto"
  | "contactado"
  | "demo_agendada"
  | "trial_iniciado"
  | "cliente_pagado"
  | "perdido";

export type MarketingPeriodPreset = "7d" | "30d" | "month" | "custom";

export type MarketingPeriodWindow = {
  preset: MarketingPeriodPreset;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  label: string;
};

export type MarketingProspectSnapshot = {
  id: string;
  empresa: string;
  contactoNombre: string | null;
  fuente: string;
  channelId: MarketingChannelId;
  estado: string;
  commercialState: MarketingCommercialState;
  convertedOrganizationId: number | null;
  noContactar: boolean;
  dataStatus: string;
  creadoEn: string;
  actualizadoEn: string;
  proximaAccionEn: string | null;
};

export type MarketingKpi = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  subtitle: string;
  insight: string;
  tone: ClientesKpiTone | "cyan";
  badge?: string;
  filterKey?: string;
  changePct: number | null;
};

export type MarketingFunnelStepId =
  | "prospectos"
  | "contactados"
  | "demo"
  | "trial"
  | "pagado";

export type MarketingFunnelStep = {
  id: MarketingFunnelStepId;
  label: string;
  count: number;
  pctOfPrevious: number | null;
  pctOfTotal: number;
  hasRealSignal: boolean;
};

export type MarketingChannelRow = {
  id: MarketingChannelId;
  label: string;
  prospects: number;
  trials: number;
  paid: number;
  conversionPct: number | null;
  lastActivityAt: string | null;
  lastActivityLabel: string;
  hasEnoughData: boolean;
};

export type MarketingPublicRecommendedStatus =
  | "buen_movimiento"
  | "falta_cotizar"
  | "sin_actividad"
  | "falta_whatsapp"
  | "falta_publicar"
  | "pendientes_revision";

export type MarketingPublicPrimaryAction =
  | "ver_solicitudes"
  | "abrir_pagina"
  | "configurar_pagina"
  | "configurar_contacto";

export type MarketingPublicCompanyRow = {
  organizationId: number;
  empresaNombre: string;
  pageStatus: PublicPageStatus;
  pageStatusLabel: string;
  solicitudesInPeriod: number;
  solicitudesPending: number;
  lastSolicitudAt: string | null;
  lastSolicitudLabel: string;
  cotizacionesCount: number;
  cotizacionesLinkedLabel: string;
  recommendedStatus: MarketingPublicRecommendedStatus;
  recommendedLabel: string;
  recommendedDetail: string | null;
  publicPageUrl: string | null;
  slug: string | null;
  whatsappConfigured: boolean;
  whatsappUrl: string | null;
  primaryAction: MarketingPublicPrimaryAction;
  primaryActionLabel: string;
};

export type MarketingRecentSolicitudEvent = {
  id: string;
  organizationId: number;
  empresaNombre: string;
  solicitanteNombre: string;
  relativeAt: string;
  creadoEn: string;
  solicitudHref: string;
  cuentaHref: string;
};

export type MarketingPeriodSummary = {
  companiesEvaluated: number;
  publishedPages: number;
  companiesWithRecentSolicitudes: number;
  totalPublicSolicitudes: number;
  label: string;
};

export type MarketingMeasurementGap = {
  id: string;
  title: string;
  label: string;
  count: number | null;
  ctaLabel: string;
  ctaHref: string;
  priority: "alta" | "media" | "baja";
};

export type MarketingQuoteUsage = {
  totalQuotes: number;
  itemQuotes: number;
  totalGlobalQuotes: number;
  constructorItemQuotes: number;
  mobileConstructorQuotes: number;
  desktopConstructorQuotes: number;
  guidedItemQuotes: number;
  constructorItemPdfs: number;
  classifiedItemQuotes: number;
  historicalUnclassifiedItemQuotes: number;
};

export type MarketingTrendPoint = {
  date: string;
  label: string;
  prospects: number;
  quotes: number;
  trials: number;
  paid: number;
};

export type MarketingContentHighlight = {
  id: string;
  title: string;
  formatLabel: string;
  channelLabel: string;
  publishedLabel: string;
  utmComplete: boolean;
  estado: string;
};

export type MarketingPublicUtmRow = {
  id: string;
  label: string;
  count: number;
};

export type MarketingNowAction = {
  id: string;
  title: string;
  detail: string;
  ctaLabel: string;
  href: string;
  done: boolean;
};

export type MarketingNextAction = {
  id: string;
  title: string;
  detail: string;
  current: number;
  target: number | null;
  href: string;
};

export type MarketingQuoteUsageInsight = {
  text: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type MarketingOnboardingVideoSnapshot = {
  dispositivo: string;
  estado: string;
  esPredeterminado: boolean;
  hasUrl: boolean;
};

export type MarketingContentSnapshot = {
  id: string;
  title: string;
  formato: string;
  canal: string;
  estado: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  grupoNombre: string | null;
  grupoSegmento: string | null;
  grupoRegion: string | null;
  metricas: {
    alcance: number | null;
    interacciones: number | null;
    comentarios: number | null;
    mensajesDemo: number | null;
    demos: number | null;
    pagos: number | null;
  };
  publicadoEn: string | null;
  programadoPara: string | null;
  actualizadoEn: string;
};

export type MarketingGroupPerformance = {
  grupoNombre: string;
  grupoSegmento: string | null;
  grupoRegion: string | null;
  publicaciones: number;
  alcance: number;
  interacciones: number;
  comentarios: number;
  mensajesDemo: number;
  demos: number;
  pagos: number;
  metricasRegistradas: boolean;
};

export type MarketingWorkspace = {
  syncedAt: string;
  period: MarketingPeriodWindow;
  periodSummary: MarketingPeriodSummary;
  prospectsWithOriginInPeriod: number;
  hasAcquisitionMeasurementBase: boolean;
  solicitudRevisionStateAvailable: boolean;
  quotesFromRequestsAvailable: boolean;
  acquisitionKpis: MarketingKpi[];
  acquisitionFunnel: MarketingFunnelStep[];
  funnelDropStageId: MarketingFunnelStepId | null;
  funnelInsight: string;
  channelRows: MarketingChannelRow[];
  bestConversionChannelId: MarketingChannelId | null;
  prospectsWithoutOrigin: number;
  publicKpis: MarketingKpi[];
  publicCompanies: MarketingPublicCompanyRow[];
  recentSolicitudes: MarketingRecentSolicitudEvent[];
  measurementGaps: MarketingMeasurementGap[];
  quoteUsage: MarketingQuoteUsage;
  quoteUsageKpis: MarketingKpi[];
  quoteUsageInsight: MarketingQuoteUsageInsight;
  prospects: MarketingProspectSnapshot[];
  trendSeries: MarketingTrendPoint[];
  contentHighlights: MarketingContentHighlight[];
  groupPerformance: MarketingGroupPerformance[];
  publicUtmRows: MarketingPublicUtmRow[];
  nowActions: MarketingNowAction[];
  nextActions: MarketingNextAction[];
  pendingPublicSolicitudes: number;
};
