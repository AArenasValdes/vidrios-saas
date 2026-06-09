import "server-only";

import {
  listAdminOrganizationsSnapshot,
  type AdminOrganizationProfileRow,
} from "@/features/admin/repositories/admin-clients.repository";
import { listAdminClients } from "@/features/admin/services/admin-clients.service";
import type { AdminClientPayment } from "@/features/admin/types/admin-client";
import type { AdminSummary } from "@/features/admin/types/admin-summary";
import { getBillingPlan } from "@/features/billing/types/plans";
import { resolveOrganizationSubscriptionState } from "@/features/subscriptions/services/subscription-status.service";
import { mapAdminProfileSubscription } from "@/features/admin/services/admin-subscription-mapper";

const WEEK_IN_DAYS = 7;

function mapRecentPayment(input: {
  id: number | string;
  organizationId: number | string;
  planCode: string;
  billingPeriod: string;
  amountClp: number;
  currency: string;
  paymentProvider: "flow" | "manual_transfer" | "webpay_plus";
  providerStatus: string | null;
  status: "pendiente" | "aprobado" | "fallido" | "cancelado" | "reembolsado";
  paidAt: string | null;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  createdAt: string;
  buyOrder: string | null;
}): AdminClientPayment {
  return {
    id: Number(input.id),
    organizationId: Number(input.organizationId),
    planCode: input.planCode,
    billingPeriod: input.billingPeriod,
    amountClp: Number(input.amountClp ?? 0),
    currency: input.currency,
    paymentProvider: input.paymentProvider,
    providerStatus: input.providerStatus ?? null,
    status: input.status,
    paidAt: input.paidAt ?? null,
    periodStartsAt: input.periodStartsAt ?? null,
    periodEndsAt: input.periodEndsAt ?? null,
    createdAt: input.createdAt,
    buyOrder: input.buyOrder ?? null,
  };
}

function isTrialEndingThisWeek(profile: AdminOrganizationProfileRow) {
  const subscription = resolveOrganizationSubscriptionState(
    mapAdminProfileSubscription(profile)
  );

  return (
    (subscription.effectiveStatus === "trial_active" ||
      subscription.effectiveStatus === "trial_expiring") &&
    subscription.daysRemaining !== null &&
    subscription.daysRemaining <= WEEK_IN_DAYS
  );
}

function resolveRecurringRevenue(profile: AdminOrganizationProfileRow) {
  if (profile.is_test_account) {
    return { mrrEstimadoClp: 0, arrEstimadoClp: 0 };
  }

  const subscription = resolveOrganizationSubscriptionState(
    mapAdminProfileSubscription(profile)
  );

  if (subscription.effectiveStatus !== "active" || !subscription.planCode) {
    return { mrrEstimadoClp: 0, arrEstimadoClp: 0 };
  }

  if (
    subscription.planCode === "founder_full" &&
    subscription.billingPeriod === "monthly"
  ) {
    const monthlyPlan = getBillingPlan("founder_monthly");
    return {
      mrrEstimadoClp: monthlyPlan.amountClp,
      arrEstimadoClp: monthlyPlan.amountClp * 12,
    };
  }

  if (
    subscription.planCode === "founder_full" &&
    subscription.billingPeriod === "yearly"
  ) {
    const annualPlan = getBillingPlan("founder_full_annual");
    return {
      mrrEstimadoClp: Math.round(annualPlan.amountClp / 12),
      arrEstimadoClp: annualPlan.amountClp,
    };
  }

  if (
    subscription.planCode === "quote_only" &&
    subscription.billingPeriod === "yearly"
  ) {
    const quoteOnlyPlan = getBillingPlan("quote_only_annual");
    return {
      mrrEstimadoClp: Math.round(quoteOnlyPlan.amountClp / 12),
      arrEstimadoClp: quoteOnlyPlan.amountClp,
    };
  }

  return { mrrEstimadoClp: 0, arrEstimadoClp: 0 };
}

export async function getAdminSummary(): Promise<AdminSummary> {
  const [clients, snapshot] = await Promise.all([
    listAdminClients(),
    listAdminOrganizationsSnapshot(),
  ]);

  let mrrEstimadoClp = 0;
  let arrEstimadoClp = 0;

  for (const profile of snapshot.profiles) {
    const revenue = resolveRecurringRevenue(profile);
    mrrEstimadoClp += revenue.mrrEstimadoClp;
    arrEstimadoClp += revenue.arrEstimadoClp;
  }

  const pagosPendientes = snapshot.payments.filter(
    (payment) => payment.status === "pendiente"
  ).length;

  const pagosRecientes = snapshot.payments
    .filter(
      (payment) =>
        payment.status === "aprobado" || payment.status === "pendiente"
    )
    .slice(0, 6)
    .map((payment) =>
      mapRecentPayment({
        id: payment.id,
        organizationId: payment.organization_id,
        planCode: payment.plan_code,
        billingPeriod: payment.billing_period,
        amountClp: payment.amount_clp,
        currency: payment.currency,
        paymentProvider: payment.payment_provider,
        providerStatus: payment.provider_status,
        status: payment.status,
        paidAt: payment.paid_at,
        periodStartsAt: payment.period_starts_at,
        periodEndsAt: payment.period_ends_at,
        createdAt: payment.creado_en,
        buyOrder: payment.buy_order,
      })
    );

  const trialsUrgentes = clients
    .filter((client) => {
      if (!client.trialEndsAt) {
        return false;
      }

      return (
        (client.estadoEfectivo === "trial_active" ||
          client.estadoEfectivo === "trial_expiring") &&
        new Date(client.trialEndsAt).getTime() >= Date.now()
      );
    })
    .sort((left, right) => {
      return new Date(left.trialEndsAt ?? 0).getTime() - new Date(right.trialEndsAt ?? 0).getTime();
    })
    .slice(0, 6);

  return {
    clientesActivos: clients.filter(
      (client) => client.estadoEfectivo === "active" && !client.isTestAccount
    ).length,
    clientesEnTrial: clients.filter(
      (client) =>
        !client.isTestAccount &&
        (client.estadoEfectivo === "trial_active" ||
          client.estadoEfectivo === "trial_expiring")
    ).length,
    trialsPorVencerEstaSemana: snapshot.profiles.filter(
      (profile) => !profile.is_test_account && isTrialEndingThisWeek(profile)
    ).length,
    pagosPendientes,
    mrrEstimadoClp,
    arrEstimadoClp,
    clientesRecientes: clients.slice(0, 6),
    trialsUrgentes,
    pagosRecientes,
  };
}
