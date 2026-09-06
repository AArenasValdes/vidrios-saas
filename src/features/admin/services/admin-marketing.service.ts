import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { listAdminClients } from "@/features/admin/services/admin-clients.service";
import {
  buildContentHighlights,
  buildGroupPerformance,
  buildNextActions,
  buildNowActions,
  buildPublicUtmRows,
  buildQuoteUsageInsight,
  buildTrendSeries,
  countPendingPublicSolicitudes,
} from "@/features/admin/services/admin-marketing-dashboard.logic";
import {
  buildAcquisitionFunnel,
  buildAcquisitionKpis,
  buildChannelRows,
  buildMarketingPeriodSummary,
  buildMarketingQuoteUsage,
  buildMarketingQuoteUsageKpis,
  buildMeasurementGaps,
  buildPublicCompanyRows,
  buildPublicPageKpis,
  buildRecentPublicSolicitudes,
  countProspectsWithOriginInPeriod,
  hasAcquisitionMeasurementBase,
  mapProspectRow,
  QUOTES_FROM_REQUESTS_AVAILABLE,
  resolveMarketingPeriodWindow,
  SOLICITUD_REVISION_STATE_AVAILABLE,
  type MarketingQuoteUsageRow,
} from "@/features/admin/services/admin-marketing.logic";
import {
  fetchPublicChannelSummaries,
  fetchPublicSolicitudesForOrganizations,
} from "@/features/admin/services/admin-public-channel.service";
import type {
  MarketingContentSnapshot,
  MarketingOnboardingVideoSnapshot,
  MarketingPeriodPreset,
  MarketingWorkspace,
} from "@/features/admin/types/admin-marketing";
import type { PublicSolicitudRow } from "@/features/admin/services/admin-public-channel.logic";

type ProspectRow = {
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
  proxima_accion_en: string | null;
};

type LinkedQuoteRow = {
  organization_id: number;
  solicitud_id: string | null;
};

type QuoteUsageRow = {
  pricing_mode: string | null;
  creation_surface: MarketingQuoteUsageRow["creationSurface"];
  pdf_descargado_en: string | null;
  creado_en: string;
};

type ContentItemRow = {
  id: string;
  titulo: string;
  formato: string;
  canal: string;
  estado: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  metadata_json: {
    grupoNombre?: string | null;
    grupoSegmento?: string | null;
    grupoRegion?: string | null;
    metricas?: Partial<MarketingContentSnapshot["metricas"]>;
  } | null;
  publicado_en: string | null;
  programado_para: string | null;
  actualizado_en: string;
};

type OnboardingVideoRow = {
  dispositivo: string;
  estado: string;
  es_predeterminado: boolean;
  video_url: string | null;
};

async function fetchQuoteUsage(
  organizationIds: number[],
  period: { start: string; end: string }
): Promise<MarketingQuoteUsageRow[]> {
  if (organizationIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cotizaciones")
    .select("pricing_mode, creation_surface, pdf_descargado_en, creado_en")
    .in("organization_id", organizationIds)
    .is("eliminado_en", null)
    .gte("creado_en", period.start)
    .lte("creado_en", period.end);

  if (error) throw error;

  return ((data ?? []) as QuoteUsageRow[]).map((row) => ({
    pricingMode: row.pricing_mode,
    creationSurface: row.creation_surface ?? null,
    pdfDownloadedAt: row.pdf_descargado_en,
    creadoEn: row.creado_en,
  }));
}

async function fetchLinkedQuotes(organizationIds: number[]) {
  if (organizationIds.length === 0) {
    return { available: true, bySolicitud: new Map<string, number>() };
  }

  const admin = createAdminClient();
  const result = await admin
    .from("cotizaciones")
    .select("organization_id, solicitud_id")
    .in("organization_id", organizationIds)
    .is("eliminado_en", null)
    .not("solicitud_id", "is", null);

  if (result.error) {
    return { available: false, bySolicitud: new Map<string, number>() };
  }

  const bySolicitud = new Map<string, number>();
  for (const row of (result.data ?? []) as LinkedQuoteRow[]) {
    if (row.solicitud_id) {
      bySolicitud.set(row.solicitud_id, (bySolicitud.get(row.solicitud_id) ?? 0) + 1);
    }
  }

  return { available: true, bySolicitud };
}

async function fetchMarketingContent(): Promise<MarketingContentSnapshot[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("growth_content_items")
    .select(
      "id, titulo, formato, canal, estado, utm_source, utm_medium, utm_campaign, utm_content, metadata_json, publicado_en, programado_para, actualizado_en"
    )
    .is("eliminado_en", null)
    .order("actualizado_en", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as ContentItemRow[]).map((row) => ({
    id: row.id,
    title: row.titulo,
    formato: row.formato,
    canal: row.canal,
    estado: row.estado,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    grupoNombre: row.metadata_json?.grupoNombre ?? null,
    grupoSegmento: row.metadata_json?.grupoSegmento ?? null,
    grupoRegion: row.metadata_json?.grupoRegion ?? null,
    metricas: {
      alcance: row.metadata_json?.metricas?.alcance ?? null,
      interacciones: row.metadata_json?.metricas?.interacciones ?? null,
      comentarios: row.metadata_json?.metricas?.comentarios ?? null,
      mensajesDemo: row.metadata_json?.metricas?.mensajesDemo ?? null,
      demos: row.metadata_json?.metricas?.demos ?? null,
      pagos: row.metadata_json?.metricas?.pagos ?? null,
    },
    publicadoEn: row.publicado_en,
    programadoPara: row.programado_para,
    actualizadoEn: row.actualizado_en,
  }));
}

async function fetchOnboardingVideos(): Promise<MarketingOnboardingVideoSnapshot[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("growth_onboarding_videos")
    .select("dispositivo, estado, es_predeterminado, video_url")
    .is("eliminado_en", null);

  if (error) throw error;

  return ((data ?? []) as OnboardingVideoRow[]).map((row) => ({
    dispositivo: row.dispositivo,
    estado: row.estado,
    esPredeterminado: row.es_predeterminado,
    hasUrl: Boolean(row.video_url),
  }));
}

export async function getAdminMarketingWorkspace(input?: {
  period?: MarketingPeriodPreset;
  customStart?: string | null;
  customEnd?: string | null;
}): Promise<MarketingWorkspace> {
  const admin = createAdminClient();
  const period = resolveMarketingPeriodWindow({
    preset: input?.period ?? "30d",
    customStart: input?.customStart,
    customEnd: input?.customEnd,
  });

  const [clients, prospectsResult] = await Promise.all([
    listAdminClients(),
    admin
      .from("growth_prospects")
      .select(
        "id, empresa, contacto_nombre, fuente, estado, converted_organization_id, no_contactar, data_status, creado_en, actualizado_en, proxima_accion_en"
      )
      .is("eliminado_en", null)
      .order("actualizado_en", { ascending: false }),
  ]);

  const organizationIds = clients
    .filter((client) => !client.isTestAccount)
    .map((client) => client.organizationId);

  const [summaries, solicitudesByOrg, linkedQuotes, quoteUsageRows, contentItems, onboardingVideos] =
    await Promise.all([
      fetchPublicChannelSummaries(organizationIds),
      fetchPublicSolicitudesForOrganizations(organizationIds),
      fetchLinkedQuotes(organizationIds),
      fetchQuoteUsage(organizationIds, period),
      fetchMarketingContent(),
      fetchOnboardingVideos(),
    ]);

  const prospects = ((prospectsResult.data ?? []) as ProspectRow[]).map(mapProspectRow);
  const clientsByOrg = new Map(clients.map((client) => [client.organizationId, client]));

  const allSolicitudes = Array.from(solicitudesByOrg.values()).flat() as PublicSolicitudRow[];
  const recentSolicitudesSorted = [...allSolicitudes].sort(
    (left, right) => new Date(right.creado_en).getTime() - new Date(left.creado_en).getTime()
  );

  const acquisitionKpis = buildAcquisitionKpis({ prospects, period });
  const funnel = buildAcquisitionFunnel({ prospects, period });
  const channels = buildChannelRows({ prospects, period });
  const publicKpis = buildPublicPageKpis({
    clients,
    summaries,
    solicitudesByOrg,
    period,
  });
  const publicCompanies = buildPublicCompanyRows({
    clients,
    summaries,
    solicitudesByOrg,
    period,
    linkedQuotesBySolicitud: linkedQuotes.bySolicitud,
    quotesFromRequestsAvailable: linkedQuotes.available,
  });
  const recentSolicitudes = buildRecentPublicSolicitudes({
    solicitudes: recentSolicitudesSorted,
    clientsByOrg,
    period,
    limit: 5,
  });
  const measurementGaps = buildMeasurementGaps({
    clients,
    summaries,
  });

  const prospectsWithOriginInPeriod = countProspectsWithOriginInPeriod(prospects, period);
  const periodSummary = buildMarketingPeriodSummary({
    clients,
    summaries,
    solicitudesByOrg,
    period,
  });
  const quoteUsage = buildMarketingQuoteUsage(quoteUsageRows);
  const nowActions = buildNowActions({ videos: onboardingVideos, content: contentItems });
  const nextActions = buildNextActions({
    videos: onboardingVideos,
    content: contentItems,
    prospects,
  });

  return {
    syncedAt: new Date().toISOString(),
    period,
    periodSummary,
    prospectsWithOriginInPeriod,
    hasAcquisitionMeasurementBase: hasAcquisitionMeasurementBase(prospects, period),
    solicitudRevisionStateAvailable: SOLICITUD_REVISION_STATE_AVAILABLE,
    quotesFromRequestsAvailable: linkedQuotes.available && QUOTES_FROM_REQUESTS_AVAILABLE,
    acquisitionKpis,
    acquisitionFunnel: funnel.steps,
    funnelDropStageId: funnel.dropStageId,
    funnelInsight: funnel.insight,
    channelRows: channels.rows,
    bestConversionChannelId: channels.bestConversionChannelId,
    prospectsWithoutOrigin: channels.prospectsWithoutOrigin,
    publicKpis,
    publicCompanies,
    recentSolicitudes,
    measurementGaps,
    quoteUsage,
    quoteUsageKpis: buildMarketingQuoteUsageKpis({ usage: quoteUsage, period }),
    quoteUsageInsight: buildQuoteUsageInsight(quoteUsage),
    prospects,
    trendSeries: buildTrendSeries({ prospects, quotes: quoteUsageRows, period }),
    contentHighlights: buildContentHighlights(contentItems),
    groupPerformance: buildGroupPerformance(contentItems),
    publicUtmRows: buildPublicUtmRows({ solicitudes: allSolicitudes, period }),
    nowActions,
    nextActions,
    pendingPublicSolicitudes: countPendingPublicSolicitudes(publicCompanies),
  };
}
