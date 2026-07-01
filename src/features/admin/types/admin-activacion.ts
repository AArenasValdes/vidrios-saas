import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { ClientesKpiTone } from "@/features/admin/services/admin-clientes-filters.service";
import type { SubscriptionStatus } from "@/features/subscriptions/types/subscription";

export type ActivacionStage =
  | "account_created"
  | "no_first_quote"
  | "first_quote"
  | "pdf_generated"
  | "activation_complete";

export type ActivacionPrimaryAction =
  | "activate_account"
  | "guide_send"
  | "remind"
  | "recover"
  | "contact";

export type ActivacionAttentionSegment = "activation" | "post_activation";

export type ActivacionAttentionRow = {
  id: string;
  organizationId: number;
  empresaNombre: string;
  correo: string | null;
  accountStatus: SubscriptionStatus;
  stage: ActivacionStage;
  stageLabel: string;
  segment: ActivacionAttentionSegment;
  usageLabel: string;
  lastActivityLabel: string;
  expiryLabel: string;
  bloqueo: string;
  proximaAccion: string;
  primaryAction: ActivacionPrimaryAction;
  whatsappUrl: string | null;
  publicPageUrl: string | null;
  cotizacionesCount: number;
  pdfsGeneradosCount: number;
  isTestAccount: boolean;
};

export type ActivacionKpi = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  subtitle: string;
  insight: string;
  tone: ClientesKpiTone;
  badge?: string;
};

export type ActivacionFunnelStepId =
  | "account_access"
  | "first_quote"
  | "pdf_generated"
  | "activation_complete";

export type ActivacionFunnelStep = {
  id: ActivacionFunnelStepId;
  label: string;
  count: number;
  pct: number;
  conversionFromPrevious: number | null;
  hasRealSignal: boolean;
  fallbackNote?: string;
};

export type ActivacionTimelineEvent = {
  id: string;
  organizationId: number;
  empresaNombre: string;
  type:
    | "first_quote"
    | "first_pdf"
    | "activation_complete"
    | "account_reactivated";
  label: string;
  fecha: string;
};

export type ActivacionWorkspace = {
  syncedAt: string;
  accounts: AdminClientListItem[];
  attentionRows: ActivacionAttentionRow[];
  kpis: ActivacionKpi[];
  funnel: ActivacionFunnelStep[];
  funnelDropStageId: string | null;
  recentEvents: ActivacionTimelineEvent[];
  timelineLimited: boolean;
};
