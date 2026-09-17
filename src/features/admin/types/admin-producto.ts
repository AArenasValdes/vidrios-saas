import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { ClientesKpiTone } from "@/features/admin/services/admin-clientes-filters.service";
import type { MarketingKpi, MarketingPeriodWindow } from "@/features/admin/types/admin-marketing";
import type { QuoteCreationSurface } from "@/features/cotizaciones/types/quote-creation-surface";
import type { SubscriptionStatus } from "@/features/subscriptions/types/subscription";

export type ProductoSetupStepKey =
  | "company"
  | "pdf"
  | "page"
  | "channels"
  | "first_lead"
  | "lines";

export type ProductoSetupStep = {
  key: ProductoSetupStepKey;
  label: string;
  completed: boolean;
};

export type ProductoFunnelStepId =
  | "account_access"
  | "first_quote"
  | "pdf_generated"
  | "activation_complete"
  | "public_page_live"
  | "first_lead"
  | "quote_from_request";

export type ProductoFunnelStep = {
  id: ProductoFunnelStepId;
  label: string;
  count: number;
  pct: number;
  conversionFromPrevious: number | null;
  hasRealSignal: boolean;
};

export type ProductoBottleneck = {
  id: string;
  label: string;
  count: number;
  filterKey: ProductoTableFilter;
  priority: "alta" | "media" | "baja";
};

export type ProductoDominantSurface =
  | "mobile"
  | "desktop"
  | "mixed"
  | "total_global"
  | "sin_datos";

export type ProductoAccountRow = {
  id: string;
  organizationId: number;
  empresaNombre: string;
  accountStatus: SubscriptionStatus;
  accountStatusLabel: string;
  lastActivityLabel: string;
  dominantSurface: ProductoDominantSurface;
  dominantSurfaceLabel: string;
  cotizacionesCount: number;
  pdfsGeneradosCount: number;
  solicitudesLast30Days: number;
  solicitudesPending: number;
  setupSteps: ProductoSetupStep[];
  setupIncompleteCount: number;
  hasQuoteFromRequest: boolean;
  lineTemplatesCount: number;
  recommendedAction: string;
  href: string;
  isTestAccount: boolean;
  isInactive14d: boolean;
};

export type ProductoQuoteUsage = {
  totalQuotes: number;
  mobileQuotes: number;
  desktopQuotes: number;
  guidedQuotes: number;
  constructorQuotes: number;
  totalGlobalQuotes: number;
  mobileGuidedQuotes: number;
  mobileConstructorQuotes: number;
  desktopGuidedQuotes: number;
  desktopConstructorQuotes: number;
  quotesFromRequests: number;
  classifiedQuotes: number;
  historicalUnclassifiedQuotes: number;
};

export type ProductoWorkspace = {
  syncedAt: string;
  period: MarketingPeriodWindow;
  kpis: MarketingKpi[];
  quoteUsage: ProductoQuoteUsage;
  funnel: ProductoFunnelStep[];
  funnelDropStageId: ProductoFunnelStepId | null;
  funnelInsight: string;
  bottlenecks: ProductoBottleneck[];
  accounts: ProductoAccountRow[];
};

export type ProductoHomeSnapshot = {
  mobileQuotes: number;
  desktopQuotes: number;
  guidedQuotes: number;
  constructorQuotes: number;
  incompleteSetupAccounts: number;
  solicitudesLast30Days: number;
};

export type ProductoClientAdoption = {
  quoteBreakdown: Array<{
    surface: QuoteCreationSurface | "total_global" | "sin_clasificar";
    count: number;
  }>;
  setupSteps: ProductoSetupStep[];
  setupIncompleteCount: number;
  dominantSurface: ProductoDominantSurface;
  dominantSurfaceLabel: string;
  quotesFromRequests: number;
  lineTemplatesCount: number;
};

export type ProductoTableFilter =
  | "no_first_quote"
  | "quote_no_pdf"
  | "page_not_published"
  | "requests_no_quote"
  | "setup_incomplete"
  | "inactive_14d"
  | "no_line_templates";

export type ProductoFiltersState = {
  period: "7d" | "30d" | "month";
  tableFilters: ProductoTableFilter[];
  funnelStage: ProductoFunnelStepId | null;
  search: string;
};

export type ProductoFilterChip = {
  id: string;
  label: string;
};

export type ProductoAccountsContext = {
  clients: AdminClientListItem[];
};
