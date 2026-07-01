import type { PaymentProvider, PaymentStatus } from "@/features/subscriptions/types/pago-suscripcion";
import type { SubscriptionStatus } from "@/features/subscriptions/types/subscription";
import type { ClientesKpiTone } from "@/features/admin/services/admin-clientes-filters.service";

export type AdminPaymentPrimaryAction =
  | "confirm"
  | "activate"
  | "remind"
  | "recover"
  | "contact"
  | "review";

export type AdminPaymentActionRow = {
  id: string;
  organizationId: number;
  paymentId: number | null;
  empresaNombre: string;
  paymentStatus: PaymentStatus | null;
  accountStatus: SubscriptionStatus;
  planLabel: string;
  amountClp: number | null;
  paymentProvider: PaymentProvider | null;
  reference: string | null;
  situation: string;
  proximaAccion: string;
  fecha: string | null;
  whatsappUrl: string | null;
  publicPageUrl: string | null;
  primaryAction: AdminPaymentPrimaryAction;
  planCode: string | null;
  isTestAccount: boolean;
};

export type AdminPaymentsKpi = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  subtitle: string;
  insight: string;
  tone: ClientesKpiTone;
  badge?: string;
};

export type AdminPlanDistributionItem = {
  id: string;
  label: string;
  count: number;
  pct: number;
};

export type AdminRevenuePeriodItem = {
  id: string;
  label: string;
  weekStartLabel: string;
  weekEndLabel: string;
  amountClp: number;
  paymentCount: number;
};

export type AdminRenewalRow = {
  id: string;
  organizationId: number;
  empresaNombre: string;
  planLabel: string;
  venceLabel: string;
  accountStatus: SubscriptionStatus;
  whatsappUrl: string | null;
};

export type AdminRecentPaymentRow = {
  id: number;
  organizationId: number;
  empresaNombre: string;
  amountClp: number;
  paymentProvider: PaymentProvider;
  status: PaymentStatus;
  fecha: string;
  planLabel: string;
};

export type AdminPaymentMovement = {
  id: number;
  organizationId: number;
  empresaNombre: string;
  correo: string | null;
  paymentStatus: PaymentStatus;
  accountStatus: SubscriptionStatus;
  planLabel: string;
  planCode: string | null;
  amountClp: number;
  paymentProvider: PaymentProvider;
  reference: string | null;
  fecha: string;
  isTestAccount: boolean;
};

export type AdminPaymentsWorkspace = {
  syncedAt: string;
  periodDays: number;
  kpis: AdminPaymentsKpi[];
  actionRows: AdminPaymentActionRow[];
  planDistribution: AdminPlanDistributionItem[];
  revenueByPeriod: AdminRevenuePeriodItem[];
  revenueSummary: {
    totalClp: number;
    confirmedCount: number;
  };
  upcomingRenewals: AdminRenewalRow[];
  recentPayments: AdminRecentPaymentRow[];
  movements: AdminPaymentMovement[];
};
