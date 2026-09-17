import { formatRelativeActivity } from "@/features/admin/services/admin-clientes-filters.service";
import { formatStatusLabel } from "@/features/admin/services/admin-clientes-workspace.service";
import {
  PUBLIC_CHANNEL_LOOKBACK_DAYS,
  type PublicSolicitudRow,
} from "@/features/admin/services/admin-public-channel.logic";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { AdminPublicChannelSummary } from "@/features/admin/types/admin-public-channel";
import type {
  ProductoAccountRow,
  ProductoBottleneck,
  ProductoClientAdoption,
  ProductoDominantSurface,
  ProductoFunnelStep,
  ProductoFunnelStepId,
  ProductoHomeSnapshot,
  ProductoQuoteUsage,
  ProductoSetupStep,
  ProductoSetupStepKey,
} from "@/features/admin/types/admin-producto";
import type { MarketingKpi, MarketingPeriodWindow } from "@/features/admin/types/admin-marketing";
import type { OnboardingStepKey, OnboardingStepState } from "@/features/onboarding/types/onboarding-checklist";
import type { QuoteCreationSurface } from "@/features/cotizaciones/types/quote-creation-surface";

const MS_DAY = 24 * 60 * 60 * 1000;

export type ProductoQuoteRow = {
  organizationId: number;
  pricingMode: string | null;
  creationSurface: QuoteCreationSurface | null;
  pdfDownloadedAt: string | null;
  solicitudId: string | null;
  creadoEn: string;
};

export type ProductoOnboardingRow = {
  organizationId: number;
  stepKey: OnboardingStepKey;
  estado: OnboardingStepState;
};

const SETUP_STEP_LABELS: Record<ProductoSetupStepKey, string> = {
  company: "Empresa",
  pdf: "PDF",
  page: "Página",
  channels: "Canales",
  first_lead: "Solicitud",
  lines: "Líneas",
};

function formatPct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function isCompletedOnboardingState(state: OnboardingStepState | undefined) {
  return state === "completado" || state === "omitido";
}

function onboardingStateFor(
  rows: ProductoOnboardingRow[],
  organizationId: number,
  stepKey: OnboardingStepKey
): OnboardingStepState | undefined {
  return rows.find(
    (row) => row.organizationId === organizationId && row.stepKey === stepKey
  )?.estado;
}

export function buildProductoQuoteUsage(rows: ProductoQuoteRow[]): ProductoQuoteUsage {
  const mobileQuotes = rows.filter((row) => row.creationSurface?.startsWith("mobile_")).length;
  const desktopQuotes = rows.filter((row) => row.creationSurface?.startsWith("desktop_")).length;
  const guidedQuotes = rows.filter(
    (row) =>
      row.creationSurface === "mobile_guiada" || row.creationSurface === "desktop_guiada"
  ).length;
  const constructorQuotes = rows.filter(
    (row) =>
      row.creationSurface === "mobile_constructor" || row.creationSurface === "desktop_constructor"
  ).length;
  const totalGlobalQuotes = rows.filter((row) => row.pricingMode === "total_global").length;
  const classifiedQuotes = rows.filter((row) => row.creationSurface !== null).length;

  return {
    totalQuotes: rows.length,
    mobileQuotes,
    desktopQuotes,
    guidedQuotes,
    constructorQuotes,
    totalGlobalQuotes,
    mobileGuidedQuotes: rows.filter((row) => row.creationSurface === "mobile_guiada").length,
    mobileConstructorQuotes: rows.filter((row) => row.creationSurface === "mobile_constructor")
      .length,
    desktopGuidedQuotes: rows.filter((row) => row.creationSurface === "desktop_guiada").length,
    desktopConstructorQuotes: rows.filter((row) => row.creationSurface === "desktop_constructor")
      .length,
    quotesFromRequests: rows.filter((row) => row.solicitudId !== null).length,
    classifiedQuotes,
    historicalUnclassifiedQuotes: rows.length - classifiedQuotes,
  };
}

export function buildProductoKpis(input: {
  usage: ProductoQuoteUsage;
  period: MarketingPeriodWindow;
  incompleteSetupAccounts: number;
  solicitudesInPeriod: number;
}): MarketingKpi[] {
  const mobileShare = formatPct(input.usage.mobileQuotes, input.usage.totalQuotes);
  const desktopShare = formatPct(input.usage.desktopQuotes, input.usage.totalQuotes);
  const guidedShare = formatPct(input.usage.guidedQuotes, input.usage.totalQuotes);
  const constructorShare = formatPct(input.usage.constructorQuotes, input.usage.totalQuotes);

  return [
    {
      id: "mobile_usage",
      label: "Cotizaciones móvil",
      value: input.usage.mobileQuotes,
      displayValue: String(input.usage.mobileQuotes),
      subtitle: mobileShare === null ? "Sin cotizaciones" : `${mobileShare}% del período`,
      insight: `PC: ${input.usage.desktopQuotes}`,
      tone: "blue",
      changePct: null,
    },
    {
      id: "desktop_usage",
      label: "Cotizaciones PC",
      value: input.usage.desktopQuotes,
      displayValue: String(input.usage.desktopQuotes),
      subtitle: desktopShare === null ? "Sin cotizaciones" : `${desktopShare}% del período`,
      insight: `Móvil: ${input.usage.mobileQuotes}`,
      tone: "cyan",
      changePct: null,
    },
    {
      id: "guided_usage",
      label: "Guiada por ítems",
      value: input.usage.guidedQuotes,
      displayValue: String(input.usage.guidedQuotes),
      subtitle: guidedShare === null ? "Sin datos" : `${guidedShare}% del uso clasificado`,
      insight: `Móvil ${input.usage.mobileGuidedQuotes} · PC ${input.usage.desktopGuidedQuotes}`,
      tone: "violet",
      changePct: null,
    },
    {
      id: "constructor_usage",
      label: "Constructor de piezas",
      value: input.usage.constructorQuotes,
      displayValue: String(input.usage.constructorQuotes),
      subtitle:
        constructorShare === null ? "Sin datos" : `${constructorShare}% del uso clasificado`,
      insight: `Móvil ${input.usage.mobileConstructorQuotes} · PC ${input.usage.desktopConstructorQuotes}`,
      tone: "violet",
      changePct: null,
    },
    {
      id: "total_global_usage",
      label: "Total global",
      value: input.usage.totalGlobalQuotes,
      displayValue: String(input.usage.totalGlobalQuotes),
      subtitle: "Cuadernillo / modo global",
      insight: `${input.usage.totalQuotes} cotizaciones en ${input.period.label.toLowerCase()}`,
      tone: "amber",
      changePct: null,
    },
    {
      id: "public_requests",
      label: "Solicitudes públicas",
      value: input.solicitudesInPeriod,
      displayValue: String(input.solicitudesInPeriod),
      subtitle: input.period.label,
      insight:
        input.usage.quotesFromRequests > 0
          ? `${input.usage.quotesFromRequests} cotizaciones vinculadas a solicitud`
          : "Sin cotizaciones vinculadas aún",
      tone: "green",
      changePct: null,
    },
    {
      id: "setup_incomplete",
      label: "Setup incompleto",
      value: input.incompleteSetupAccounts,
      displayValue: String(input.incompleteSetupAccounts),
      subtitle: "cuentas reales",
      insight:
        input.incompleteSetupAccounts > 0
          ? "Revisar empresa, página, canales o líneas"
          : "Todas con setup base completo",
      tone: "amber",
      changePct: null,
    },
  ];
}

function resolveDominantSurface(rows: ProductoQuoteRow[]): ProductoDominantSurface {
  if (rows.length === 0) return "sin_datos";

  const totalGlobal = rows.filter((row) => row.pricingMode === "total_global").length;
  if (totalGlobal >= rows.length / 2) return "total_global";

  const mobile = rows.filter((row) => row.creationSurface?.startsWith("mobile_")).length;
  const desktop = rows.filter((row) => row.creationSurface?.startsWith("desktop_")).length;

  if (mobile > desktop) return "mobile";
  if (desktop > mobile) return "desktop";
  if (mobile === desktop && mobile > 0) return "mixed";
  return "sin_datos";
}

export function resolveDominantSurfaceLabel(surface: ProductoDominantSurface) {
  switch (surface) {
    case "mobile":
      return "Móvil";
    case "desktop":
      return "PC";
    case "mixed":
      return "Móvil y PC";
    case "total_global":
      return "Total global";
    default:
      return "Sin datos";
  }
}

export function buildProductoSetupSteps(input: {
  client: AdminClientListItem;
  summary: AdminPublicChannelSummary | undefined;
  onboardingRows: ProductoOnboardingRow[];
  lineTemplatesCount: number;
  solicitudesTotal: number;
}): ProductoSetupStep[] {
  const { client, summary, onboardingRows, lineTemplatesCount, solicitudesTotal } = input;
  const orgId = client.organizationId;

  const companyFromOnboarding = onboardingStateFor(onboardingRows, orgId, "company_ready");
  const companyCompleted =
    isCompletedOnboardingState(companyFromOnboarding) ||
    Boolean(client.empresaNombre?.trim() && client.telefonoPrincipal?.trim());

  const pdfFromOnboarding = onboardingStateFor(onboardingRows, orgId, "first_share");
  const pdfCompleted =
    isCompletedOnboardingState(pdfFromOnboarding) || client.pdfsGeneradosCount > 0;

  const pageFromOnboarding = onboardingStateFor(onboardingRows, orgId, "public_page_live");
  const pageCompleted =
    isCompletedOnboardingState(pageFromOnboarding) || summary?.pageStatus === "publicada";

  const channelsFromOnboarding = onboardingStateFor(onboardingRows, orgId, "channel_ready");
  const channelsCompleted = isCompletedOnboardingState(channelsFromOnboarding);

  const leadFromOnboarding = onboardingStateFor(onboardingRows, orgId, "first_lead");
  const leadCompleted =
    isCompletedOnboardingState(leadFromOnboarding) || solicitudesTotal > 0;

  const steps: ProductoSetupStep[] = [
    { key: "company", label: SETUP_STEP_LABELS.company, completed: companyCompleted },
    { key: "pdf", label: SETUP_STEP_LABELS.pdf, completed: pdfCompleted },
    { key: "page", label: SETUP_STEP_LABELS.page, completed: pageCompleted },
    { key: "channels", label: SETUP_STEP_LABELS.channels, completed: channelsCompleted },
    { key: "first_lead", label: SETUP_STEP_LABELS.first_lead, completed: leadCompleted },
    { key: "lines", label: SETUP_STEP_LABELS.lines, completed: lineTemplatesCount > 0 },
  ];

  return steps;
}

function countIncompleteSetup(steps: ProductoSetupStep[]) {
  return steps.filter((step) => !step.completed).length;
}

function isWithinPeriod(iso: string, period: MarketingPeriodWindow) {
  const value = new Date(iso).getTime();
  return value >= new Date(period.start).getTime() && value <= new Date(period.end).getTime();
}

function countSolicitudesInPeriod(solicitudes: PublicSolicitudRow[], period: MarketingPeriodWindow) {
  return solicitudes.filter(
    (item) =>
      item.contexto === "empresa-publica" && isWithinPeriod(item.creado_en, period)
  ).length;
}

export function buildProductoFunnel(input: {
  clients: AdminClientListItem[];
  summaries: Map<number, AdminPublicChannelSummary>;
  solicitudesByOrg: Map<number, PublicSolicitudRow[]>;
  quotesByOrg: Map<number, ProductoQuoteRow[]>;
  orgsWithQuoteFromRequest: Set<number>;
}): { steps: ProductoFunnelStep[]; dropStageId: ProductoFunnelStepId | null; insight: string } {
  const realClients = input.clients.filter((client) => !client.isTestAccount);
  const total = realClients.length || 1;

  const accountAccess = realClients.length;
  const firstQuote = realClients.filter((client) => client.cotizacionesCount > 0).length;
  const pdfGenerated = realClients.filter((client) => client.pdfsGeneradosCount > 0).length;
  const activationComplete = realClients.filter((client) => client.pdfsGeneradosCount > 0).length;
  const publicPageLive = realClients.filter((client) => {
    const summary = input.summaries.get(client.organizationId);
    return summary?.pageStatus === "publicada";
  }).length;
  const firstLead = realClients.filter((client) => {
    const solicitudes = input.solicitudesByOrg.get(client.organizationId) ?? [];
    return solicitudes.some((item) => item.contexto === "empresa-publica");
  }).length;
  const quoteFromRequest = realClients.filter((client) =>
    input.orgsWithQuoteFromRequest.has(client.organizationId)
  ).length;

  const rawSteps: Array<{ id: ProductoFunnelStepId; label: string; count: number }> = [
    { id: "account_access", label: "Cuentas reales", count: accountAccess },
    { id: "first_quote", label: "Primera cotización", count: firstQuote },
    { id: "pdf_generated", label: "Primer PDF", count: pdfGenerated },
    { id: "activation_complete", label: "Activación completa", count: activationComplete },
    { id: "public_page_live", label: "Página pública publicada", count: publicPageLive },
    { id: "first_lead", label: "Primera solicitud recibida", count: firstLead },
    { id: "quote_from_request", label: "Cotización desde solicitud", count: quoteFromRequest },
  ];

  let maxDrop = 0;
  let dropStageId: ProductoFunnelStepId | null = null;

  const steps: ProductoFunnelStep[] = rawSteps.map((item, index) => {
    const previous = index === 0 ? item.count : rawSteps[index - 1]?.count ?? item.count;
    const conversionFromPrevious =
      index === 0 || previous === 0 ? null : Math.round((item.count / previous) * 100);

    if (index > 0 && previous > 0) {
      const drop = previous - item.count;
      if (drop > maxDrop) {
        maxDrop = drop;
        dropStageId = item.id;
      }
    }

    return {
      id: item.id,
      label: item.label,
      count: item.count,
      pct: Math.round((item.count / total) * 100),
      conversionFromPrevious,
      hasRealSignal: true,
    };
  });

  const insight =
    maxDrop > 0 && dropStageId
      ? `Mayor caída: ${steps.find((step) => step.id === dropStageId)?.label ?? "—"} (${maxDrop} cuenta${maxDrop === 1 ? "" : "s"})`
      : "Sin caídas relevantes entre etapas del embudo.";

  return { steps, dropStageId: maxDrop > 0 ? dropStageId : null, insight };
}

export function buildProductoBottlenecks(input: {
  accounts: ProductoAccountRow[];
}): ProductoBottleneck[] {
  const realAccounts = input.accounts.filter((account) => !account.isTestAccount);

  const candidates: ProductoBottleneck[] = [
    {
      id: "quote_no_pdf",
      label: "Cotizaron pero nunca generaron PDF",
      count: realAccounts.filter(
        (account) => account.cotizacionesCount > 0 && account.pdfsGeneradosCount === 0
      ).length,
      filterKey: "quote_no_pdf",
      priority: "alta",
    },
    {
      id: "no_first_quote",
      label: "Sin primera cotización",
      count: realAccounts.filter((account) => account.cotizacionesCount === 0).length,
      filterKey: "no_first_quote",
      priority: "alta",
    },
    {
      id: "requests_no_quote",
      label: "Recibieron solicitudes públicas sin cotizar",
      count: realAccounts.filter(
        (account) => account.solicitudesLast30Days > 0 && account.cotizacionesCount === 0
      ).length,
      filterKey: "requests_no_quote",
      priority: "alta",
    },
    {
      id: "page_not_published",
      label: "Página pública sin publicar",
      count: realAccounts.filter((account) =>
        account.setupSteps.some((step) => step.key === "page" && !step.completed)
      ).length,
      filterKey: "page_not_published",
      priority: "media",
    },
    {
      id: "setup_incomplete",
      label: "Setup incompleto",
      count: realAccounts.filter((account) => account.setupIncompleteCount > 0).length,
      filterKey: "setup_incomplete",
      priority: "media",
    },
    {
      id: "no_line_templates",
      label: "Sin líneas o precios configurados",
      count: realAccounts.filter((account) => account.lineTemplatesCount === 0).length,
      filterKey: "no_line_templates",
      priority: "baja",
    },
    {
      id: "inactive_14d",
      label: "Sin actividad en 14 días",
      count: realAccounts.filter((account) => account.isInactive14d).length,
      filterKey: "inactive_14d",
      priority: "baja",
    },
  ];

  return candidates
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
}

function resolveRecommendedAction(account: ProductoAccountRow) {
  if (account.cotizacionesCount === 0) return "Ayudar con primera cotización";
  if (account.pdfsGeneradosCount === 0) return "Guiar hasta el primer PDF";
  if (account.solicitudesLast30Days > 0 && !account.hasQuoteFromRequest) {
    return "Cotizar solicitudes recibidas";
  }
  if (account.setupIncompleteCount > 0) return "Completar setup de empresa";
  return "Seguimiento de uso";
}

export function buildProductoAccountRows(input: {
  clients: AdminClientListItem[];
  summaries: Map<number, AdminPublicChannelSummary>;
  solicitudesByOrg: Map<number, PublicSolicitudRow[]>;
  quotesByOrg: Map<number, ProductoQuoteRow[]>;
  onboardingRows: ProductoOnboardingRow[];
  lineTemplatesByOrg: Map<number, number>;
  orgsWithQuoteFromRequest: Set<number>;
  period: MarketingPeriodWindow;
}): ProductoAccountRow[] {
  return input.clients
    .filter((client) => !client.isTestAccount)
    .map((client) => {
      const summary = input.summaries.get(client.organizationId);
      const solicitudes = input.solicitudesByOrg.get(client.organizationId) ?? [];
      const orgQuotes = input.quotesByOrg.get(client.organizationId) ?? [];
      const setupSteps = buildProductoSetupSteps({
        client,
        summary,
        onboardingRows: input.onboardingRows,
        lineTemplatesCount: input.lineTemplatesByOrg.get(client.organizationId) ?? 0,
        solicitudesTotal: solicitudes.filter((item) => item.contexto === "empresa-publica").length,
      });
      const dominantSurface = resolveDominantSurface(orgQuotes);

      const isInactive14d =
        client.lastActivityAt !== null &&
        Date.now() - new Date(client.lastActivityAt).getTime() > 14 * MS_DAY;

      return {
        id: `producto-${client.organizationId}`,
        organizationId: client.organizationId,
        empresaNombre: client.empresaNombre,
        accountStatus: client.estadoEfectivo,
        accountStatusLabel: formatStatusLabel(client.estadoEfectivo),
        lastActivityLabel: formatRelativeActivity(client.lastActivityAt),
        dominantSurface,
        dominantSurfaceLabel: resolveDominantSurfaceLabel(dominantSurface),
        cotizacionesCount: client.cotizacionesCount,
        pdfsGeneradosCount: client.pdfsGeneradosCount,
        solicitudesLast30Days: solicitudes.filter((item) =>
          isWithinDays(item.creado_en, PUBLIC_CHANNEL_LOOKBACK_DAYS)
        ).length,
        solicitudesPending: summary?.solicitudesPending ?? 0,
        setupSteps,
        setupIncompleteCount: countIncompleteSetup(setupSteps),
        hasQuoteFromRequest: input.orgsWithQuoteFromRequest.has(client.organizationId),
        lineTemplatesCount: input.lineTemplatesByOrg.get(client.organizationId) ?? 0,
        recommendedAction: "",
        href: `/admin/clientes/${client.organizationId}`,
        isTestAccount: client.isTestAccount,
        isInactive14d,
      };
    })
    .map((row) => ({
      ...row,
      recommendedAction: resolveRecommendedAction(row),
    }))
    .sort((left, right) => left.empresaNombre.localeCompare(right.empresaNombre, "es"));
}

function isWithinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * MS_DAY;
}

export function countIncompleteSetupAccounts(accounts: ProductoAccountRow[]) {
  return accounts.filter((account) => account.setupIncompleteCount > 0).length;
}

export function buildProductoHomeSnapshot(input: {
  usage: ProductoQuoteUsage;
  incompleteSetupAccounts: number;
  solicitudesLast30Days: number;
}): ProductoHomeSnapshot {
  return {
    mobileQuotes: input.usage.mobileQuotes,
    desktopQuotes: input.usage.desktopQuotes,
    guidedQuotes: input.usage.guidedQuotes,
    constructorQuotes: input.usage.constructorQuotes,
    incompleteSetupAccounts: input.incompleteSetupAccounts,
    solicitudesLast30Days: input.solicitudesLast30Days,
  };
}

export function buildProductoClientAdoption(input: {
  client: AdminClientListItem;
  quotes: ProductoQuoteRow[];
  summary: AdminPublicChannelSummary | undefined;
  onboardingRows: ProductoOnboardingRow[];
  lineTemplatesCount: number;
  solicitudesTotal: number;
}): ProductoClientAdoption {
  const breakdownMap = new Map<string, number>();

  for (const quote of input.quotes) {
    const key =
      quote.pricingMode === "total_global"
        ? "total_global"
        : quote.creationSurface ?? "sin_clasificar";
    breakdownMap.set(key, (breakdownMap.get(key) ?? 0) + 1);
  }

  const quoteBreakdown = Array.from(breakdownMap.entries())
    .map(([surface, count]) => ({
      surface: surface as ProductoClientAdoption["quoteBreakdown"][number]["surface"],
      count,
    }))
    .sort((left, right) => right.count - left.count);

  const setupSteps = buildProductoSetupSteps({
    client: input.client,
    summary: input.summary,
    onboardingRows: input.onboardingRows,
    lineTemplatesCount: input.lineTemplatesCount,
    solicitudesTotal: input.solicitudesTotal,
  });
  const dominantSurface = resolveDominantSurface(input.quotes);

  return {
    quoteBreakdown,
    setupSteps,
    setupIncompleteCount: countIncompleteSetup(setupSteps),
    dominantSurface,
    dominantSurfaceLabel: resolveDominantSurfaceLabel(dominantSurface),
    quotesFromRequests: input.quotes.filter((quote) => quote.solicitudId !== null).length,
    lineTemplatesCount: input.lineTemplatesCount,
  };
}

export function countSolicitudesForPeriod(
  solicitudesByOrg: Map<number, PublicSolicitudRow[]>,
  period: MarketingPeriodWindow
) {
  let total = 0;
  for (const solicitudes of solicitudesByOrg.values()) {
    total += countSolicitudesInPeriod(solicitudes, period);
  }
  return total;
}
