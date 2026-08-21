import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { listAdminClients } from "@/features/admin/services/admin-clients.service";
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
import type { MarketingPeriodPreset, MarketingWorkspace } from "@/features/admin/types/admin-marketing";
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
};

type LinkedQuoteRow = {
  organization_id: number;
  solicitud_id: string | null;
};

type QuoteUsageRow = {
  pricing_mode: string | null;
  creation_surface: MarketingQuoteUsageRow["creationSurface"];
  pdf_descargado_en: string | null;
};

async function fetchQuoteUsage(
  organizationIds: number[],
  period: { start: string; end: string }
): Promise<MarketingQuoteUsageRow[]> {
  if (organizationIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cotizaciones")
    .select("pricing_mode, creation_surface, pdf_descargado_en")
    .in("organization_id", organizationIds)
    .is("eliminado_en", null)
    .gte("creado_en", period.start)
    .lte("creado_en", period.end);

  if (error) throw error;

  return ((data ?? []) as QuoteUsageRow[]).map((row) => ({
    pricingMode: row.pricing_mode,
    creationSurface: row.creation_surface ?? null,
    pdfDownloadedAt: row.pdf_descargado_en,
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
        "id, empresa, contacto_nombre, fuente, estado, converted_organization_id, no_contactar, data_status, creado_en, actualizado_en"
      )
      .is("eliminado_en", null)
      .order("actualizado_en", { ascending: false }),
  ]);

  const organizationIds = clients
    .filter((client) => !client.isTestAccount)
    .map((client) => client.organizationId);

  const [summaries, solicitudesByOrg, linkedQuotes, quoteUsageRows] = await Promise.all([
    fetchPublicChannelSummaries(organizationIds),
    fetchPublicSolicitudesForOrganizations(organizationIds),
    fetchLinkedQuotes(organizationIds),
    fetchQuoteUsage(organizationIds, period),
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
    prospects,
  };
}
