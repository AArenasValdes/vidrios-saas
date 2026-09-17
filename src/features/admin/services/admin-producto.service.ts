import "server-only";

import { listAdminClients } from "@/features/admin/services/admin-clients.service";
import {
  buildProductoAccountRows,
  buildProductoBottlenecks,
  buildProductoClientAdoption,
  buildProductoFunnel,
  buildProductoHomeSnapshot,
  buildProductoKpis,
  buildProductoQuoteUsage,
  countIncompleteSetupAccounts,
  countSolicitudesForPeriod,
  type ProductoOnboardingRow,
  type ProductoQuoteRow,
} from "@/features/admin/services/admin-producto.logic";
import {
  fetchPublicChannelSummaries,
  fetchPublicSolicitudesForOrganizations,
} from "@/features/admin/services/admin-public-channel.service";
import { resolveMarketingPeriodWindow } from "@/features/admin/services/admin-marketing.logic";
import type { MarketingPeriodPreset } from "@/features/admin/types/admin-marketing";
import type {
  ProductoClientAdoption,
  ProductoHomeSnapshot,
  ProductoWorkspace,
} from "@/features/admin/types/admin-producto";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { OnboardingStepKey } from "@/features/onboarding/types/onboarding-checklist";
import type { QuoteCreationSurface } from "@/features/cotizaciones/types/quote-creation-surface";
import { createAdminClient } from "@/lib/supabase/admin";

const ONBOARDING_STEP_KEYS: OnboardingStepKey[] = [
  "company_ready",
  "public_page_live",
  "channel_ready",
  "first_lead",
  "first_quote",
  "first_share",
  "activation_complete",
];

type QuoteRow = {
  organization_id: number;
  pricing_mode: string | null;
  creation_surface: string | null;
  pdf_descargado_en: string | null;
  solicitud_id: string | null;
  creado_en: string;
};

type OnboardingRow = {
  organization_id: number;
  step_key: OnboardingStepKey;
  estado: ProductoOnboardingRow["estado"];
};

type LineTemplateRow = {
  organization_id: number;
};

function mapQuoteRow(row: QuoteRow): ProductoQuoteRow {
  return {
    organizationId: Number(row.organization_id),
    pricingMode: row.pricing_mode,
    creationSurface: (row.creation_surface as QuoteCreationSurface | null) ?? null,
    pdfDownloadedAt: row.pdf_descargado_en,
    solicitudId: row.solicitud_id,
    creadoEn: row.creado_en,
  };
}

function groupQuotesByOrg(rows: ProductoQuoteRow[]) {
  const map = new Map<number, ProductoQuoteRow[]>();
  for (const row of rows) {
    const current = map.get(row.organizationId) ?? [];
    current.push(row);
    map.set(row.organizationId, current);
  }
  return map;
}

async function fetchQuoteRows(
  organizationIds: number[],
  period: { start: string; end: string }
): Promise<ProductoQuoteRow[]> {
  if (organizationIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cotizaciones")
    .select(
      "organization_id, pricing_mode, creation_surface, pdf_descargado_en, solicitud_id, creado_en"
    )
    .in("organization_id", organizationIds)
    .is("eliminado_en", null)
    .gte("creado_en", period.start)
    .lte("creado_en", period.end);

  if (error) throw error;
  return ((data ?? []) as QuoteRow[]).map(mapQuoteRow);
}

async function fetchAllQuoteRowsForOrganizations(
  organizationIds: number[]
): Promise<ProductoQuoteRow[]> {
  if (organizationIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cotizaciones")
    .select(
      "organization_id, pricing_mode, creation_surface, pdf_descargado_en, solicitud_id, creado_en"
    )
    .in("organization_id", organizationIds)
    .is("eliminado_en", null);

  if (error) throw error;
  return ((data ?? []) as QuoteRow[]).map(mapQuoteRow);
}

async function fetchOnboardingRows(organizationIds: number[]): Promise<ProductoOnboardingRow[]> {
  if (organizationIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_checklists")
    .select("organization_id, step_key, estado")
    .in("organization_id", organizationIds)
    .in("step_key", ONBOARDING_STEP_KEYS)
    .is("eliminado_en", null);

  if (error) throw error;

  return ((data ?? []) as OnboardingRow[]).map((row) => ({
    organizationId: Number(row.organization_id),
    stepKey: row.step_key,
    estado: row.estado,
  }));
}

async function fetchLineTemplateCounts(organizationIds: number[]) {
  const map = new Map<number, number>();
  if (organizationIds.length === 0) return map;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cotizacion_line_templates")
    .select("organization_id")
    .in("organization_id", organizationIds)
    .is("eliminado_en", null);

  if (error) throw error;

  for (const row of (data ?? []) as LineTemplateRow[]) {
    const organizationId = Number(row.organization_id);
    map.set(organizationId, (map.get(organizationId) ?? 0) + 1);
  }

  return map;
}

function buildOrgsWithQuoteFromRequest(allQuotes: ProductoQuoteRow[]) {
  const orgs = new Set<number>();
  for (const quote of allQuotes) {
    if (quote.solicitudId) {
      orgs.add(quote.organizationId);
    }
  }
  return orgs;
}

async function buildProductoContext(input?: {
  period?: MarketingPeriodPreset;
  customStart?: string | null;
  customEnd?: string | null;
}) {
  const period = resolveMarketingPeriodWindow({
    preset: input?.period ?? "30d",
    customStart: input?.customStart,
    customEnd: input?.customEnd,
  });

  const clients = await listAdminClients();
  const organizationIds = clients
    .filter((client) => !client.isTestAccount)
    .map((client) => client.organizationId);

  const [
    periodQuotes,
    allQuotes,
    summaries,
    solicitudesByOrg,
    onboardingRows,
    lineTemplatesByOrg,
  ] = await Promise.all([
    fetchQuoteRows(organizationIds, period),
    fetchAllQuoteRowsForOrganizations(organizationIds),
    fetchPublicChannelSummaries(organizationIds),
    fetchPublicSolicitudesForOrganizations(organizationIds),
    fetchOnboardingRows(organizationIds),
    fetchLineTemplateCounts(organizationIds),
  ]);

  const quotesByOrg = groupQuotesByOrg(allQuotes);
  const orgsWithQuoteFromRequest = buildOrgsWithQuoteFromRequest(allQuotes);

  return {
    period,
    clients,
    periodQuotes,
    quotesByOrg,
    orgsWithQuoteFromRequest,
    summaries,
    solicitudesByOrg,
    onboardingRows,
    lineTemplatesByOrg,
  };
}

export async function getAdminProductoWorkspace(input?: {
  period?: MarketingPeriodPreset;
  customStart?: string | null;
  customEnd?: string | null;
}): Promise<ProductoWorkspace> {
  const context = await buildProductoContext(input);
  const usage = buildProductoQuoteUsage(context.periodQuotes);
  const accounts = buildProductoAccountRows({
    clients: context.clients,
    summaries: context.summaries,
    solicitudesByOrg: context.solicitudesByOrg,
    quotesByOrg: context.quotesByOrg,
    onboardingRows: context.onboardingRows,
    lineTemplatesByOrg: context.lineTemplatesByOrg,
    orgsWithQuoteFromRequest: context.orgsWithQuoteFromRequest,
    period: context.period,
  });
  const incompleteSetupAccounts = countIncompleteSetupAccounts(accounts);
  const solicitudesInPeriod = countSolicitudesForPeriod(
    context.solicitudesByOrg,
    context.period
  );
  const funnel = buildProductoFunnel({
    clients: context.clients,
    summaries: context.summaries,
    solicitudesByOrg: context.solicitudesByOrg,
    quotesByOrg: context.quotesByOrg,
    orgsWithQuoteFromRequest: context.orgsWithQuoteFromRequest,
  });

  return {
    syncedAt: new Date().toISOString(),
    period: context.period,
    quoteUsage: usage,
    kpis: buildProductoKpis({
      usage,
      period: context.period,
      incompleteSetupAccounts,
      solicitudesInPeriod,
    }),
    funnel: funnel.steps,
    funnelDropStageId: funnel.dropStageId,
    funnelInsight: funnel.insight,
    bottlenecks: buildProductoBottlenecks({ accounts }),
    accounts,
  };
}

export async function getAdminProductoHomeSnapshot(): Promise<ProductoHomeSnapshot> {
  const context = await buildProductoContext({ period: "30d" });
  const usage = buildProductoQuoteUsage(context.periodQuotes);
  const accounts = buildProductoAccountRows({
    clients: context.clients,
    summaries: context.summaries,
    solicitudesByOrg: context.solicitudesByOrg,
    quotesByOrg: context.quotesByOrg,
    onboardingRows: context.onboardingRows,
    lineTemplatesByOrg: context.lineTemplatesByOrg,
    orgsWithQuoteFromRequest: context.orgsWithQuoteFromRequest,
    period: context.period,
  });

  let solicitudesLast30Days = 0;
  for (const summary of context.summaries.values()) {
    solicitudesLast30Days += summary.solicitudesLast30Days;
  }

  return buildProductoHomeSnapshot({
    usage,
    incompleteSetupAccounts: countIncompleteSetupAccounts(accounts),
    solicitudesLast30Days,
  });
}

export async function getAdminClientProductAdoption(
  organizationId: number,
  client: AdminClientListItem
): Promise<ProductoClientAdoption> {
  const [allQuotes, summaryMap, solicitudesByOrg, onboardingRows, lineTemplatesByOrg] =
    await Promise.all([
      fetchAllQuoteRowsForOrganizations([organizationId]),
      fetchPublicChannelSummaries([organizationId]),
      fetchPublicSolicitudesForOrganizations([organizationId]),
      fetchOnboardingRows([organizationId]),
      fetchLineTemplateCounts([organizationId]),
    ]);

  const solicitudes = solicitudesByOrg.get(organizationId) ?? [];

  return buildProductoClientAdoption({
    client,
    quotes: allQuotes,
    summary: summaryMap.get(organizationId),
    onboardingRows,
    lineTemplatesCount: lineTemplatesByOrg.get(organizationId) ?? 0,
    solicitudesTotal: solicitudes.filter((item) => item.contexto === "empresa-publica").length,
  });
}
