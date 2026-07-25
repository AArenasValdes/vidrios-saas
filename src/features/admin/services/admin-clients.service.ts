import "server-only";

import {
  getAdminOrganizationSnapshot,
  listAdminOrganizationsSnapshot,
  type AdminOrganizationsSnapshot,
  type AdminOrganizationPaymentRow,
  type AdminOrganizationProfileRow,
  type AdminOrganizationRow,
  type AdminOrganizationUserRow,
} from "@/features/admin/repositories/admin-clients.repository";
import type {
  AdminClientDetail,
  AdminClientListItem,
  AdminClientPayment,
  AdminClientSource,
  AdminClientSubscription,
  AdminClientUser,
} from "@/features/admin/types/admin-client";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import { resolveOrganizationSubscriptionState } from "@/features/subscriptions/services/subscription-status.service";
import { mapAdminProfileSubscription } from "@/features/admin/services/admin-subscription-mapper";
import {
  fetchAdminClientUsage,
  fetchAdminClientsUsageMap,
} from "@/features/admin/services/admin-clients-enrichment.service";
import {
  buildPublicChannelListLabel,
  fetchPublicChannelDetail,
  fetchPublicChannelSummaries,
} from "@/features/admin/services/admin-public-channel.service";
import { buildPublicLeadWhatsappUrl } from "@/utils/whatsapp";

function pickPrimaryUser(rows: AdminOrganizationUserRow[]) {
  return [...rows].sort((left, right) => {
    const leftRank = left.rol === "admin" ? 0 : 1;
    const rightRank = right.rol === "admin" ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return new Date(left.creado_en ?? 0).getTime() - new Date(right.creado_en ?? 0).getTime();
  })[0] ?? null;
}

function mapUser(row: AdminOrganizationUserRow): AdminClientUser {
  return {
    id: Number(row.id),
    correo: row.correo ?? "sin-correo",
    rol: row.rol ?? "sin-rol",
    authUserId: row.auth_user_id ?? null,
    createdAt: row.creado_en ?? null,
  };
}

function mapPayment(row: AdminOrganizationPaymentRow): AdminClientPayment {
  return {
    id: Number(row.id),
    organizationId: Number(row.organization_id),
    planCode: row.plan_code,
    billingPeriod: row.billing_period,
    amountClp: Number(row.amount_clp ?? 0),
    currency: row.currency,
    paymentProvider: row.payment_provider,
    providerStatus: row.provider_status ?? null,
    status: row.status,
    paidAt: row.paid_at ?? null,
    periodStartsAt: row.period_starts_at ?? null,
    periodEndsAt: row.period_ends_at ?? null,
    createdAt: row.creado_en,
    buyOrder: row.buy_order ?? null,
  };
}

function resolvePaymentSource(payment: AdminClientPayment | null): AdminClientSource {
  if (!payment) {
    return "sistema";
  }

  return payment.paymentProvider === "manual_transfer" ? "manual" : "sistema";
}

function buildSubscription(profile: AdminOrganizationProfileRow | null): AdminClientSubscription {
  const resolved = resolveOrganizationSubscriptionState(
    mapAdminProfileSubscription(profile)
  );

  return {
    subscriptionStatus: resolved.subscriptionStatus,
    effectiveStatus: resolved.effectiveStatus,
    planCode: resolved.planCode,
    planType: resolved.planType,
    billingPeriod: resolved.billingPeriod,
    paymentMethod: resolved.paymentMethod,
    trialStartedAt: resolved.trialStartedAt,
    trialEndsAt: resolved.trialEndsAt,
    subscriptionStartedAt: resolved.subscriptionStartedAt,
    subscriptionEndsAt: resolved.subscriptionEndsAt,
    lastPaymentAt: resolved.lastPaymentAt,
    founderPriceLocked: resolved.founderPriceLocked,
    daysRemaining: resolved.daysRemaining,
    isActive: resolved.isActive,
    isTrial: resolved.isTrial,
    isExpiringSoon: resolved.isExpiringSoon,
    isExpired: resolved.isExpired,
  };
}

function buildEmpresaNombre(
  organization: AdminOrganizationRow,
  profile: AdminOrganizationProfileRow | null
) {
  return (
    profile?.empresa_nombre ??
    profile?.public_name ??
    organization.nombre ??
    `Empresa ${Number(organization.id)}`
  );
}

function buildQuickLinks(
  organizationPhone: string | null,
  profile: AdminOrganizationProfileRow | null
) {
  const phone = profile?.empresa_telefono ?? organizationPhone ?? null;

  return {
    publicPageUrl: profile?.solicitud_publica_slug
      ? `/solicitud/${profile.solicitud_publica_slug}`
      : null,
    whatsappUrl: phone
      ? buildPublicLeadWhatsappUrl(phone, {
          mensaje: "Hola, vengo desde Centro de Operaciones Ventora.",
        })
      : null,
    dashboardReadOnlyUrl: null,
  };
}

function buildAdminClientListItem(input: {
  organization: AdminOrganizationRow;
  profile: AdminOrganizationProfileRow | null;
  users: AdminOrganizationUserRow[];
  payments: AdminOrganizationPaymentRow[];
  usage?: {
    cotizacionesCount: number;
    pdfsGeneradosCount: number;
    clientesRegistradosCount: number;
    firstQuoteAt: string | null;
    firstPdfAt: string | null;
    lastActivityAt: string | null;
    publicPageActive: boolean;
  };
  publicChannel?: AdminClientListItem["publicChannel"];
}): AdminClientListItem {
  const principalUserRow = pickPrimaryUser(input.users);
  const principalUser = principalUserRow ? mapUser(principalUserRow) : null;
  const subscription = buildSubscription(input.profile);
  const payments = input.payments.map(mapPayment);
  const lastApprovedPayment =
    payments.find((payment) => payment.status === "aprobado") ?? null;
  const usage = input.usage ?? {
    cotizacionesCount: 0,
    pdfsGeneradosCount: 0,
    clientesRegistradosCount: 0,
    firstQuoteAt: null,
    firstPdfAt: null,
    lastActivityAt: null,
    publicPageActive: Boolean(input.profile?.solicitud_publica_slug),
  };
  const quickLinks = buildQuickLinks(
    input.organization.telefono ?? null,
    input.profile
  );

  return {
    organizationId: Number(input.organization.id),
    empresaNombre: buildEmpresaNombre(input.organization, input.profile),
    correoPrincipal:
      principalUser?.correo ?? input.profile?.empresa_email ?? input.organization.correo ?? null,
    telefonoPrincipal:
      input.profile?.empresa_telefono ?? input.organization.telefono ?? null,
    planCode: subscription.planCode,
    planLabel: getPlanLabel(subscription.planCode),
    estadoSuscripcion: subscription.subscriptionStatus,
    estadoEfectivo: subscription.effectiveStatus,
    trialEndsAt: subscription.trialEndsAt,
    subscriptionEndsAt: subscription.subscriptionEndsAt,
    ultimoPagoAt: lastApprovedPayment?.paidAt ?? lastApprovedPayment?.createdAt ?? null,
    ultimoPagoMontoClp: lastApprovedPayment?.amountClp ?? null,
    ultimoPagoFuente: resolvePaymentSource(lastApprovedPayment),
    isTestAccount: input.profile?.is_test_account ?? false,
    cotizacionesCount: usage.cotizacionesCount,
    pdfsGeneradosCount: usage.pdfsGeneradosCount,
    clientesRegistradosCount: usage.clientesRegistradosCount,
    firstQuoteAt: usage.firstQuoteAt,
    firstPdfAt: usage.firstPdfAt ?? null,
    lastActivityAt:
      usage.lastActivityAt ??
      lastApprovedPayment?.paidAt ??
      subscription.trialEndsAt ??
      input.organization.creado_en ??
      null,
    publicPageActive: usage.publicPageActive,
    createdAt: input.organization.creado_en ?? null,
    publicPageUrl: quickLinks.publicPageUrl,
    publicChannel: input.publicChannel ?? {
      pageStatusLabel: usage.publicPageActive ? "Publicada" : "No configurada",
      solicitudesLast30Days: 0,
      lastSolicitudLabel: null,
      solicitudesPending: 0,
    },
  };
}

export async function listAdminClientsFromSnapshot(
  snapshot: AdminOrganizationsSnapshot
): Promise<AdminClientListItem[]> {
  const organizationIds = snapshot.organizations.map((row) => Number(row.id));
  const [usageMap, publicSummaries] = await Promise.all([
    fetchAdminClientsUsageMap(organizationIds),
    fetchPublicChannelSummaries(organizationIds),
  ]);
  const profileByOrg = new Map(
    snapshot.profiles.map((row) => [Number(row.organization_id), row])
  );
  const usersByOrg = new Map<number, AdminOrganizationUserRow[]>();
  const paymentsByOrg = new Map<number, AdminOrganizationPaymentRow[]>();

  for (const user of snapshot.users) {
    const organizationId = Number(user.organization_id);
    const current = usersByOrg.get(organizationId) ?? [];
    current.push(user);
    usersByOrg.set(organizationId, current);
  }

  for (const payment of snapshot.payments) {
    const organizationId = Number(payment.organization_id);
    const current = paymentsByOrg.get(organizationId) ?? [];
    current.push(payment);
    paymentsByOrg.set(organizationId, current);
  }

  return snapshot.organizations.map((organization) => {
    const organizationId = Number(organization.id);
    const usageSnapshot = usageMap.get(organizationId);
    const channelSummary = publicSummaries.get(organizationId);
    const channelLabel = channelSummary
      ? buildPublicChannelListLabel(channelSummary)
      : null;

    return buildAdminClientListItem({
      organization,
      profile: profileByOrg.get(organizationId) ?? null,
      users: usersByOrg.get(organizationId) ?? [],
      payments: paymentsByOrg.get(organizationId) ?? [],
      usage: usageSnapshot
        ? {
            cotizacionesCount: usageSnapshot.cotizacionesCount,
            pdfsGeneradosCount: usageSnapshot.pdfsGeneradosCount,
            clientesRegistradosCount: usageSnapshot.clientesRegistradosCount,
            firstQuoteAt: usageSnapshot.firstQuoteAt,
            firstPdfAt: usageSnapshot.firstPdfAt,
            lastActivityAt:
              usageSnapshot.lastQuoteAt ??
              organization.creado_en ??
              null,
            publicPageActive: usageSnapshot.publicPageActive,
          }
        : undefined,
      publicChannel: channelSummary
        ? {
            pageStatusLabel: channelLabel?.statusLine ?? channelSummary.pageStatusLabel,
            solicitudesLast30Days: channelSummary.solicitudesLast30Days,
            lastSolicitudLabel: channelLabel?.detailLine ?? null,
            solicitudesPending: channelSummary.solicitudesPending,
          }
        : undefined,
    });
  });
}

export async function listAdminClients(): Promise<AdminClientListItem[]> {
  const snapshot = await listAdminOrganizationsSnapshot();
  return listAdminClientsFromSnapshot(snapshot);
}

export async function getAdminClientDetail(
  organizationId: number
): Promise<AdminClientDetail | null> {
  const snapshot = await getAdminOrganizationSnapshot(organizationId);

  if (!snapshot) {
    return null;
  }

  const principalUserRow = pickPrimaryUser(snapshot.users);
  const users = snapshot.users.map(mapUser);
  const payments = snapshot.payments.map(mapPayment);
  const lastApprovedPayment =
    payments.find((payment) => payment.status === "aprobado") ?? null;
  const baseSubscription = buildSubscription(snapshot.profile);
  const subscription: AdminClientSubscription = {
    ...baseSubscription,
    lastPaymentAt:
      baseSubscription.lastPaymentAt ??
      lastApprovedPayment?.paidAt ??
      lastApprovedPayment?.createdAt ??
      null,
  };
  const quickLinks = buildQuickLinks(
    snapshot.organization.telefono ?? null,
    snapshot.profile
  );
  const [usageSnapshot, publicChannel] = await Promise.all([
    fetchAdminClientUsage(organizationId),
    fetchPublicChannelDetail(organizationId),
  ]);

  return {
    organizationId,
    organizationName: snapshot.organization.nombre ?? `Empresa ${organizationId}`,
    organizationEmail: snapshot.organization.correo ?? null,
    organizationPhone: snapshot.organization.telefono ?? null,
    organizationAddress: snapshot.organization.direccion ?? null,
    legacyPlan: snapshot.organization.plan ?? null,
    createdAt: snapshot.organization.creado_en ?? null,
    updatedAt: snapshot.organization.actualizado_en ?? null,
    profile: {
      empresaNombre: snapshot.profile?.empresa_nombre ?? null,
      empresaEmail: snapshot.profile?.empresa_email ?? null,
      empresaTelefono: snapshot.profile?.empresa_telefono ?? null,
      empresaDireccion: snapshot.profile?.empresa_direccion ?? null,
      publicName: snapshot.profile?.public_name ?? null,
      publicZone: snapshot.profile?.public_zone ?? null,
      brandColor: snapshot.profile?.brand_color ?? null,
      solicitudPublicaSlug: snapshot.profile?.solicitud_publica_slug ?? null,
    },
    principalUser: principalUserRow ? mapUser(principalUserRow) : null,
    users,
    subscription,
    payments,
    lastPayment: lastApprovedPayment,
    isTestAccount: snapshot.profile?.is_test_account ?? false,
    quickLinks: {
      publicPageUrl: quickLinks.publicPageUrl,
      whatsappUrl: quickLinks.whatsappUrl,
      dashboardReadOnlyUrl: quickLinks.dashboardReadOnlyUrl,
    },
    usage: {
      cotizacionesCount: usageSnapshot.cotizacionesCount,
      pdfsGeneradosCount: usageSnapshot.pdfsGeneradosCount,
      clientesRegistradosCount: usageSnapshot.clientesRegistradosCount,
      firstQuoteAt: usageSnapshot.firstQuoteAt,
      lastActivityAt:
        usageSnapshot.lastQuoteAt ??
        lastApprovedPayment?.paidAt ??
        subscription.trialEndsAt ??
        snapshot.organization.creado_en ??
        null,
      publicPageActive: usageSnapshot.publicPageActive,
    },
    publicChannel,
  };
}
