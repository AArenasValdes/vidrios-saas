import type {
  AdminPublicChannelDetail,
  AdminPublicChannelListItem,
} from "@/features/admin/types/admin-public-channel";
import type {
  BillingPeriod,
  PaymentMethod,
  PlanCode,
  PlanType,
  SubscriptionStatus,
} from "@/features/subscriptions/types/subscription";
import type {
  PaymentProvider,
  PaymentStatus,
} from "@/features/subscriptions/types/pago-suscripcion";

export type AdminClientSource = "sistema" | "manual" | "local";

export type AdminClientUser = {
  id: number;
  correo: string;
  rol: string;
  authUserId: string | null;
  nombre: string | null;
  whatsapp: string | null;
  ciudadComuna: string | null;
  dataSharingAcceptedAt: string | null;
  createdAt: string | null;
};

export type AdminClientPayment = {
  id: number;
  organizationId: number;
  planCode: string;
  billingPeriod: string;
  amountClp: number;
  currency: string;
  paymentProvider: PaymentProvider;
  providerStatus: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  createdAt: string;
  buyOrder: string | null;
};

export type AdminClientSubscription = {
  subscriptionStatus: SubscriptionStatus | null;
  effectiveStatus: SubscriptionStatus;
  planCode: PlanCode | null;
  planType: PlanType | null;
  billingPeriod: BillingPeriod | null;
  paymentMethod: PaymentMethod | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  lastPaymentAt: string | null;
  founderPriceLocked: boolean;
  daysRemaining: number | null;
  isActive: boolean;
  isTrial: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
};

export type AdminClientListItem = {
  organizationId: number;
  empresaNombre: string;
  nombrePrincipal: string | null;
  correoPrincipal: string | null;
  telefonoPrincipal: string | null;
  whatsappPrincipal: string | null;
  ciudadComuna: string | null;
  planCode: PlanCode | null;
  planLabel: string;
  estadoSuscripcion: SubscriptionStatus | null;
  estadoEfectivo: SubscriptionStatus;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  ultimoPagoAt: string | null;
  ultimoPagoMontoClp: number | null;
  ultimoPagoFuente: AdminClientSource;
  isTestAccount: boolean;
  cotizacionesCount: number;
  pdfsGeneradosCount: number;
  clientesRegistradosCount: number;
  firstQuoteAt: string | null;
  firstPdfAt: string | null;
  lastActivityAt: string | null;
  publicPageActive: boolean;
  createdAt: string | null;
  publicPageUrl: string | null;
  publicChannel: AdminPublicChannelListItem;
};

export type AdminClientDetail = {
  organizationId: number;
  organizationName: string;
  organizationEmail: string | null;
  organizationPhone: string | null;
  organizationAddress: string | null;
  legacyPlan: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  profile: {
    empresaNombre: string | null;
    empresaEmail: string | null;
    empresaTelefono: string | null;
    empresaDireccion: string | null;
    publicName: string | null;
    publicZone: string | null;
    brandColor: string | null;
    solicitudPublicaSlug: string | null;
  };
  principalUser: AdminClientUser | null;
  users: AdminClientUser[];
  subscription: AdminClientSubscription;
  payments: AdminClientPayment[];
  lastPayment: AdminClientPayment | null;
  isTestAccount: boolean;
  quickLinks: {
    publicPageUrl: string | null;
    whatsappUrl: string | null;
    dashboardReadOnlyUrl: string | null;
  };
  usage: {
    cotizacionesCount: number;
    pdfsGeneradosCount: number;
    clientesRegistradosCount: number;
    firstQuoteAt: string | null;
    lastActivityAt: string | null;
    publicPageActive: boolean;
  };
  publicChannel: AdminPublicChannelDetail;
};
