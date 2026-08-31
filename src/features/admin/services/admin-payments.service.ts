import "server-only";

import {
  listAdminOrganizationsSnapshot,
  type AdminOrganizationPaymentRow,
  type AdminOrganizationProfileRow,
} from "@/features/admin/repositories/admin-clients.repository";
import { listAdminClients } from "@/features/admin/services/admin-clients.service";
import { buildWeeklyConfirmedRevenue } from "@/features/admin/services/admin-payments-revenue.service";
import {
  formatOperationalExpiry,
  parseAdminIsoDate,
} from "@/features/admin/services/admin-clientes-filters.service";
import type {
  AdminPaymentActionRow,
  AdminPaymentMovement,
  AdminPaymentsKpi,
  AdminPaymentsWorkspace,
  AdminPlanDistributionItem,
  AdminRecentPaymentRow,
  AdminRenewalRow,
} from "@/features/admin/types/admin-payments";
import { BILLING_PLANS } from "@/features/billing/types/plans";
import { buildPublicLeadWhatsappUrl } from "@/utils/whatsapp";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import type { AdminPaymentPrimaryAction } from "@/features/admin/types/admin-payments";

const MS_DAY = 24 * 60 * 60 * 1000;

function buildWhatsappUrl(phone: string | null) {
  if (!phone) {
    return null;
  }

  return buildPublicLeadWhatsappUrl(phone, {
    mensaje: "Hola, te escribo desde Ventora sobre tu plan y pago.",
  });
}

function isWithinRange(iso: string | null, start: Date, end: Date) {
  if (!iso) {
    return false;
  }

  const time = new Date(iso).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function resolvePeriodWindow(periodDays: number) {
  const end = new Date();
  const start = new Date(end.getTime() - periodDays * MS_DAY);
  return { start, end };
}

function formatClp(value: number) {
  return `$${value.toLocaleString("es-CL")}`;
}

function resolvePlanDistributionLabel(profile: AdminOrganizationProfileRow | null) {
  if (!profile) {
    return "Sin plan";
  }

  if (profile.is_test_account) {
    return "Prueba gratis";
  }

  if (profile.plan_code === "trial" || profile.plan_type === "trial") {
    return "Prueba gratis";
  }

  if (profile.plan_code === "founder_full" && profile.billing_period === "monthly") {
    return BILLING_PLANS.founder_monthly.label;
  }

  if (profile.plan_code === "founder_full" && profile.billing_period === "yearly") {
    return BILLING_PLANS.founder_full_annual.label;
  }

  if (profile.plan_code === "quote_only" && profile.billing_period === "monthly") {
    return BILLING_PLANS.quote_only_monthly.label;
  }

  if (profile.plan_code === "quote_only") {
    return BILLING_PLANS.quote_only_annual.label;
  }

  return getPlanLabel(profile.plan_code);
}

function resolvePaymentPlanLabel(planCode: string, billingPeriod: string) {
  if (planCode === "founder_full" && billingPeriod === "monthly") {
    return BILLING_PLANS.founder_monthly.label;
  }
  if (planCode === "founder_full" && billingPeriod === "yearly") {
    return BILLING_PLANS.founder_full_annual.label;
  }
  if (planCode === "quote_only" && billingPeriod === "monthly") {
    return BILLING_PLANS.quote_only_monthly.label;
  }
  if (planCode === "quote_only" && billingPeriod === "yearly") {
    return BILLING_PLANS.quote_only_annual.label;
  }
  return getPlanLabel(planCode);
}

function needsActivation(
  payment: AdminOrganizationPaymentRow,
  accountStatus: AdminPaymentActionRow["accountStatus"]
) {
  return payment.status === "aprobado" && accountStatus !== "active";
}

function buildActionRowFromPayment(input: {
  payment: AdminOrganizationPaymentRow;
  empresaNombre: string;
  accountStatus: AdminPaymentActionRow["accountStatus"];
  phone: string | null;
  publicPageUrl: string | null;
  isTestAccount: boolean;
}): AdminPaymentActionRow | null {
  const { payment } = input;
  const whatsappUrl = buildWhatsappUrl(input.phone);
  let situation = "Revisar movimiento";
  let proximaAccion = "Revisar pago";
  let primaryAction: AdminPaymentPrimaryAction = "review";

  if (payment.status === "pendiente") {
    situation = "Pago informado, falta confirmar";
    proximaAccion = "Confirmar pago recibido";
    primaryAction = "confirm";
  } else if (needsActivation(payment, input.accountStatus)) {
    situation = "Pagó, falta activar plan";
    proximaAccion = "Activar acceso comercial";
    primaryAction = "activate";
  } else if (payment.status === "fallido") {
    situation = "Pago rechazado por el proveedor";
    proximaAccion = "Contactar para reintentar";
    primaryAction = "contact";
  } else if (!payment.buy_order && payment.status === "aprobado") {
    situation = "Referencia incompleta o ausente";
    proximaAccion = "Validar referencia del pago";
    primaryAction = "review";
  } else {
    return null;
  }

  return {
    id: `payment-${payment.id}`,
    organizationId: Number(payment.organization_id),
    paymentId: Number(payment.id),
    empresaNombre: input.empresaNombre,
    paymentStatus: payment.status,
    accountStatus: input.accountStatus,
    planLabel: resolvePaymentPlanLabel(payment.plan_code, payment.billing_period),
    amountClp: Number(payment.amount_clp),
    paymentProvider: payment.payment_provider,
    reference: payment.buy_order,
    situation,
    proximaAccion,
    fecha: payment.paid_at ?? payment.creado_en,
    whatsappUrl,
    publicPageUrl: input.publicPageUrl,
    primaryAction,
    planCode: payment.plan_code,
    isTestAccount: input.isTestAccount,
  };
}

function buildActionRowFromAccount(input: {
  organizationId: number;
  empresaNombre: string;
  accountStatus: AdminPaymentActionRow["accountStatus"];
  planLabel: string;
  phone: string | null;
  publicPageUrl: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  isTestAccount: boolean;
}): AdminPaymentActionRow | null {
  if (input.isTestAccount) {
    return null;
  }

  const whatsappUrl = buildWhatsappUrl(input.phone);
  const expiry = parseAdminIsoDate(input.trialEndsAt ?? input.subscriptionEndsAt);
  const daysUntil = expiry
    ? Math.ceil((expiry.getTime() - Date.now()) / MS_DAY)
    : null;

  if (
    input.accountStatus === "trial_expiring" ||
    (daysUntil !== null && daysUntil >= 0 && daysUntil <= 7)
  ) {
    return {
      id: `renewal-${input.organizationId}`,
      organizationId: input.organizationId,
      paymentId: null,
      empresaNombre: input.empresaNombre,
      paymentStatus: null,
      accountStatus: input.accountStatus,
      planLabel: input.planLabel,
      amountClp: null,
      paymentProvider: null,
      reference: null,
      situation:
        daysUntil !== null && daysUntil >= 0
          ? `Vence en ${daysUntil} días`
          : "Renovación próxima",
      proximaAccion: "Enviar recordatorio de renovación",
      fecha: input.trialEndsAt ?? input.subscriptionEndsAt,
      whatsappUrl,
      publicPageUrl: input.publicPageUrl,
      primaryAction: "remind",
      planCode: null,
      isTestAccount: false,
    };
  }

  if (
    input.accountStatus === "trial_expired" ||
    input.accountStatus === "past_due" ||
    input.accountStatus === "cancelled"
  ) {
    return {
      id: `recover-${input.organizationId}`,
      organizationId: input.organizationId,
      paymentId: null,
      empresaNombre: input.empresaNombre,
      paymentStatus: null,
      accountStatus: input.accountStatus,
      planLabel: input.planLabel,
      amountClp: null,
      paymentProvider: null,
      reference: null,
      situation:
        input.accountStatus === "trial_expired"
          ? "Trial vencido sin continuidad"
          : "Suscripción vencida",
      proximaAccion: "Recuperar cuenta comercial",
      fecha: input.trialEndsAt ?? input.subscriptionEndsAt,
      whatsappUrl,
      publicPageUrl: input.publicPageUrl,
      primaryAction: "recover",
      planCode: null,
      isTestAccount: false,
    };
  }

  return null;
}

export async function getAdminPaymentsWorkspace(
  periodDays = 30
): Promise<AdminPaymentsWorkspace> {
  const [snapshot, clients] = await Promise.all([
    listAdminOrganizationsSnapshot(),
    listAdminClients(),
  ]);

  const profileByOrg = new Map(
    snapshot.profiles.map((row) => [Number(row.organization_id), row])
  );
  const orgById = new Map(snapshot.organizations.map((row) => [Number(row.id), row]));
  const testOrgIds = new Set(
    snapshot.profiles
      .filter((profile) => profile.is_test_account)
      .map((profile) => Number(profile.organization_id))
  );
  const clientByOrg = new Map(clients.map((client) => [client.organizationId, client]));
  const { start, end } = resolvePeriodWindow(periodDays);

  const movements: AdminPaymentMovement[] = snapshot.payments
    .filter((payment) => !payment.eliminado_en)
    .map((payment) => {
      const orgId = Number(payment.organization_id);
      const client = clientByOrg.get(orgId);
      const profile = profileByOrg.get(orgId);
      const org = orgById.get(orgId);

      return {
        id: Number(payment.id),
        organizationId: orgId,
        empresaNombre:
          client?.empresaNombre ??
          profile?.empresa_nombre ??
          org?.nombre ??
          `Empresa ${orgId}`,
        correo: client?.correoPrincipal ?? profile?.empresa_email ?? org?.correo ?? null,
        paymentStatus: payment.status,
        accountStatus: client?.estadoEfectivo ?? "trial_active",
        planLabel: resolvePaymentPlanLabel(payment.plan_code, payment.billing_period),
        planCode: payment.plan_code,
        amountClp: Number(payment.amount_clp),
        paymentProvider: payment.payment_provider,
        reference: payment.buy_order,
        fecha: payment.paid_at ?? payment.creado_en,
        isTestAccount: client?.isTestAccount ?? Boolean(profile?.is_test_account),
      };
    });

  const actionRowsMap = new Map<string, AdminPaymentActionRow>();

  for (const payment of snapshot.payments) {
    if (payment.eliminado_en || testOrgIds.has(Number(payment.organization_id))) {
      continue;
    }

    const orgId = Number(payment.organization_id);
    const client = clientByOrg.get(orgId);
    const profile = profileByOrg.get(orgId);
    const org = orgById.get(orgId);
    const row = buildActionRowFromPayment({
      payment,
      empresaNombre:
        client?.empresaNombre ??
        profile?.empresa_nombre ??
        org?.nombre ??
        `Empresa ${orgId}`,
      accountStatus: client?.estadoEfectivo ?? "trial_active",
      phone: client?.telefonoPrincipal ?? profile?.empresa_telefono ?? org?.telefono ?? null,
      publicPageUrl: client?.publicPageUrl ?? null,
      isTestAccount: client?.isTestAccount ?? false,
    });

    if (row) {
      actionRowsMap.set(row.id, row);
    }
  }

  for (const client of clients) {
    if (client.isTestAccount) {
      continue;
    }

    const row = buildActionRowFromAccount({
      organizationId: client.organizationId,
      empresaNombre: client.empresaNombre,
      accountStatus: client.estadoEfectivo,
      planLabel: client.planLabel,
      phone: client.telefonoPrincipal,
      publicPageUrl: client.publicPageUrl,
      trialEndsAt: client.trialEndsAt,
      subscriptionEndsAt: client.subscriptionEndsAt,
      isTestAccount: client.isTestAccount,
    });

    if (row && !actionRowsMap.has(row.id)) {
      actionRowsMap.set(row.id, row);
    }
  }

  const actionRows = [...actionRowsMap.values()].sort((left, right) => {
    const leftTime = new Date(left.fecha ?? 0).getTime();
    const rightTime = new Date(right.fecha ?? 0).getTime();
    return rightTime - leftTime;
  });

  const ingresosCobrados = snapshot.payments.reduce((total, payment) => {
    if (payment.status !== "aprobado" || testOrgIds.has(Number(payment.organization_id))) {
      return total;
    }

    const paidAt = payment.paid_at ?? payment.creado_en;
    if (!isWithinRange(paidAt, start, end)) {
      return total;
    }

    return total + Number(payment.amount_clp ?? 0);
  }, 0);

  const pagosPendientes = snapshot.payments.filter(
    (payment) => payment.status === "pendiente" && !testOrgIds.has(Number(payment.organization_id))
  ).length;

  const renovacionesPorVencer = clients.filter((client) => {
    if (client.isTestAccount) {
      return false;
    }

    const expiry = parseAdminIsoDate(client.trialEndsAt ?? client.subscriptionEndsAt);
    if (!expiry) {
      return false;
    }

    const days = Math.ceil((expiry.getTime() - Date.now()) / MS_DAY);
    return days >= 0 && days <= 7;
  }).length;

  const suscripcionesVencidas = clients.filter(
    (client) =>
      !client.isTestAccount &&
      (client.estadoEfectivo === "trial_expired" ||
        client.estadoEfectivo === "past_due" ||
        client.estadoEfectivo === "cancelled")
  ).length;

  const activationOrganizationIds = new Set(
    snapshot.payments
      .filter((payment) => {
        if (testOrgIds.has(Number(payment.organization_id)) || payment.status !== "aprobado") {
          return false;
        }

        const client = clientByOrg.get(Number(payment.organization_id));
        return client ? client.estadoEfectivo !== "active" : true;
      })
      .map((payment) => Number(payment.organization_id))
  );
  const activacionesPendientes = activationOrganizationIds.size;

  const kpis: AdminPaymentsKpi[] = [
    {
      id: "revenue",
      label: "Ingresos cobrados",
      value: ingresosCobrados,
      displayValue: formatClp(ingresosCobrados),
      subtitle: "En el período seleccionado",
      insight: ingresosCobrados > 0 ? "Cobros confirmados" : "Sin cobros en el período",
      tone: "green",
      badge: ingresosCobrados > 0 ? "Caja" : undefined,
    },
    {
      id: "pending",
      label: "Pagos pendientes",
      value: pagosPendientes,
      displayValue: String(pagosPendientes),
      subtitle: "Esperando confirmación",
      insight: pagosPendientes > 0 ? "Acción requerida" : "Sin pagos informados",
      tone: "amber",
      badge: pagosPendientes > 0 ? "Atención" : undefined,
    },
    {
      id: "renewals",
      label: "Renovaciones por vencer",
      value: renovacionesPorVencer,
      displayValue: String(renovacionesPorVencer),
      subtitle: "Dentro de 7 días",
      insight: renovacionesPorVencer > 0 ? "Recordatorios sugeridos" : "Sin ventana crítica",
      tone: "amber",
      badge: renovacionesPorVencer > 0 ? "Pronto" : undefined,
    },
    {
      id: "expired",
      label: "Suscripciones vencidas",
      value: suscripcionesVencidas,
      displayValue: String(suscripcionesVencidas),
      subtitle: "Requieren recuperación",
      insight:
        suscripcionesVencidas > 0
          ? `${suscripcionesVencidas} cuentas por recuperar`
          : "Cartera al día",
      tone: "red",
      badge: suscripcionesVencidas > 0 ? "Riesgo" : undefined,
    },
    {
      id: "activation",
      label: "Activaciones pendientes",
      value: activacionesPendientes,
      displayValue: String(activacionesPendientes),
      subtitle: "Pagaron, falta activar",
      insight: activacionesPendientes > 0 ? "Cierre operativo pendiente" : "Sin activaciones en cola",
      tone: "violet",
      badge: activacionesPendientes > 0 ? "Activar" : undefined,
    },
  ];

  const planCounts = new Map<string, number>();
  for (const profile of snapshot.profiles) {
    if (profile.is_test_account) {
      continue;
    }

    const label = resolvePlanDistributionLabel(profile);
    planCounts.set(label, (planCounts.get(label) ?? 0) + 1);
  }

  const totalPlans = [...planCounts.values()].reduce((sum, count) => sum + count, 0);
  const planDistribution: AdminPlanDistributionItem[] = [...planCounts.entries()]
    .map(([label, count]) => ({
      id: label,
      label,
      count,
      pct: totalPlans > 0 ? Math.round((count / totalPlans) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count);

  const upcomingRenewals: AdminRenewalRow[] = clients
    .filter((client) => {
      if (client.isTestAccount) {
        return false;
      }

      const expiry = parseAdminIsoDate(client.trialEndsAt ?? client.subscriptionEndsAt);
      if (!expiry) {
        return false;
      }

      const days = Math.ceil((expiry.getTime() - Date.now()) / MS_DAY);
      return days >= -14 && days <= 30;
    })
    .sort(
      (left, right) =>
        new Date(left.trialEndsAt ?? left.subscriptionEndsAt ?? 0).getTime() -
        new Date(right.trialEndsAt ?? right.subscriptionEndsAt ?? 0).getTime()
    )
    .slice(0, 8)
    .map((client) => ({
      id: `renewal-${client.organizationId}`,
      organizationId: client.organizationId,
      empresaNombre: client.empresaNombre,
      planLabel: client.planLabel,
      venceLabel: formatOperationalExpiry(client),
      accountStatus: client.estadoEfectivo,
      whatsappUrl: buildWhatsappUrl(client.telefonoPrincipal),
    }));

  const recentPayments: AdminRecentPaymentRow[] = snapshot.payments
    .filter(
      (payment) =>
        !payment.eliminado_en &&
        !testOrgIds.has(Number(payment.organization_id)) &&
        payment.status === "aprobado"
    )
    .slice(0, 8)
    .map((payment) => {
      const orgId = Number(payment.organization_id);
      const client = clientByOrg.get(orgId);
      const profile = profileByOrg.get(orgId);
      const org = orgById.get(orgId);

      return {
        id: Number(payment.id),
        organizationId: orgId,
        empresaNombre:
          client?.empresaNombre ??
          profile?.empresa_nombre ??
          org?.nombre ??
          `Empresa ${orgId}`,
        amountClp: Number(payment.amount_clp),
        paymentProvider: payment.payment_provider,
        status: payment.status,
        fecha: payment.paid_at ?? payment.creado_en,
        planLabel: getPlanLabel(payment.plan_code),
      };
    });

  const weeklyRevenue = buildWeeklyConfirmedRevenue(snapshot.payments, testOrgIds, periodDays);

  return {
    syncedAt: new Date().toISOString(),
    periodDays,
    kpis,
    actionRows,
    planDistribution,
    revenueByPeriod: weeklyRevenue.buckets,
    revenueSummary: weeklyRevenue.summary,
    upcomingRenewals,
    recentPayments,
    movements,
  };
}

