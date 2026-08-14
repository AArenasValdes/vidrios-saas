import "server-only";

import { getMercadoPagoChileConfig } from "@/features/subscriptions/config/mercadopago-cl.config";
import { createMercadoPagoClient } from "@/features/subscriptions/providers/mercadopago/mercadopago.client";
import { normalizeMercadoPagoTransactionAmount } from "@/features/subscriptions/providers/mercadopago/mercadopago-amount";
import type {
  MercadoPagoAuthorizedPayment,
  MercadoPagoPayment,
  MercadoPagoPreapproval,
  MercadoPagoWebhookTopic,
} from "@/features/subscriptions/providers/mercadopago/mercadopago.types";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import {
  mapMercadoPagoPaymentStatus,
  mapMercadoPagoSubscriptionStatus,
} from "@/features/subscriptions/services/subscription-lifecycle.service";
import type { OrganizationSubscriptionRow } from "@/features/subscriptions/types/organization-subscription";

const SUPPORTED_TOPICS = new Set<MercadoPagoWebhookTopic>([
  "subscription_preapproval",
  "subscription_authorized_payment",
  "payment",
]);

function addMonths(isoDate: string, months: number) {
  const date = new Date(isoDate);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

function getPeriod(input: {
  subscription: OrganizationSubscriptionRow;
  paidAt: string;
  nextPaymentAt?: string | null;
}) {
  const nextPaymentAt = input.nextPaymentAt
    ? new Date(input.nextPaymentAt)
    : null;
  const paidAt = new Date(input.paidAt);
  const periodEndsAt =
    nextPaymentAt && nextPaymentAt.getTime() > paidAt.getTime()
      ? nextPaymentAt.toISOString()
      : addMonths(
          paidAt.toISOString(),
          input.subscription.billing_period === "yearly" ? 12 : 1
        );

  return {
    periodStartsAt: paidAt.toISOString(),
    periodEndsAt,
  };
}

function assertSubscriptionIdentity(input: {
  local: OrganizationSubscriptionRow;
  resource: MercadoPagoPreapproval;
}) {
  const amount = normalizeMercadoPagoTransactionAmount(
    input.resource.auto_recurring?.transaction_amount
  );
  const currency = input.resource.auto_recurring?.currency_id?.trim().toUpperCase();

  if (input.resource.external_reference !== input.local.external_reference) {
    throw new Error("La suscripcion consultada no coincide con Ventora.");
  }

  if (
    input.resource.preapproval_plan_id &&
    input.resource.preapproval_plan_id !== input.local.provider_plan_id
  ) {
    throw new Error("La suscripcion consultada no coincide con Ventora.");
  }

  if (amount !== input.local.amount || currency !== input.local.currency_code) {
    throw new Error("La suscripcion consultada no coincide con Ventora.");
  }
}

async function findLocalSubscription(
  resource: MercadoPagoPreapproval
): Promise<OrganizationSubscriptionRow | null> {
  const repository = createOrganizationSubscriptionRepository();
  const byProvider = await repository.getByProviderSubscriptionId(resource.id);

  if (byProvider) {
    return byProvider;
  }

  if (!resource.external_reference) {
    return null;
  }

  return repository.getByExternalReference(resource.external_reference);
}

async function reconcilePreapproval(resource: MercadoPagoPreapproval) {
  const repository = createOrganizationSubscriptionRepository();
  const local = await findLocalSubscription(resource);

  if (!local || !local.provider_plan_id) {
    return false;
  }

  assertSubscriptionIdentity({ local, resource });
  const status = mapMercadoPagoSubscriptionStatus(resource.status);
  const startsAt = resource.start_date ?? resource.date_created ?? null;
  const fallbackStart = startsAt ?? new Date().toISOString();
  const period =
    status === "active"
      ? getPeriod({
          subscription: local,
          paidAt: fallbackStart,
          nextPaymentAt: resource.next_payment_date,
        })
      : null;

  await repository.reconcileMercadoPagoSubscription({
    subscriptionId: local.id,
    providerSubscriptionId: resource.id,
    providerPlanId: local.provider_plan_id,
    providerStatus: resource.status,
    status,
    periodStartsAt: period?.periodStartsAt ?? null,
    periodEndsAt: period?.periodEndsAt ?? null,
    nextPaymentAt: resource.next_payment_date ?? null,
    cancelledAt: status === "cancelled" ? resource.last_modified ?? null : null,
  });

  return true;
}

function authorizedPaymentStatus(resource: MercadoPagoAuthorizedPayment) {
  return resource.payment?.status ?? resource.status ?? resource.summarized ?? "pending";
}

async function reconcilePayment(input: {
  paymentId: string;
  providerOrderId: string | null;
  providerStatus: string;
  amount: number | null | undefined;
  currency: string | null | undefined;
  paidAt: string | null | undefined;
  providerResponse: unknown;
  preapproval: MercadoPagoPreapproval;
}) {
  const repository = createOrganizationSubscriptionRepository();
  const local = await findLocalSubscription(input.preapproval);

  if (!local || !local.provider_plan_id) {
    return false;
  }

  assertSubscriptionIdentity({ local, resource: input.preapproval });

  const paymentAmount = normalizeMercadoPagoTransactionAmount(input.amount);
  const paymentCurrency = input.currency?.trim().toUpperCase() ?? null;

  if (paymentAmount !== local.amount || paymentCurrency !== local.currency_code) {
    throw new Error("El pago consultado no coincide con el contrato de Ventora.");
  }

  const paymentStatus = mapMercadoPagoPaymentStatus(input.providerStatus);
  const paidAt = input.paidAt ?? new Date().toISOString();
  const period = getPeriod({
    subscription: local,
    paidAt,
    nextPaymentAt: input.preapproval.next_payment_date,
  });
  const recurringStatus =
    paymentStatus === "aprobado"
      ? "active"
      : paymentStatus === "fallido" || paymentStatus === "cancelado"
        ? "past_due"
        : mapMercadoPagoSubscriptionStatus(input.preapproval.status);
  const currentPeriodStartsAt = local.current_period_starts_at
    ? new Date(local.current_period_starts_at).getTime()
    : null;
  const eventTime = new Date(paidAt).getTime();
  const shouldProjectSubscription =
    currentPeriodStartsAt === null || eventTime >= currentPeriodStartsAt;

  if (shouldProjectSubscription) {
    await repository.reconcileMercadoPagoSubscription({
      subscriptionId: local.id,
      providerSubscriptionId: input.preapproval.id,
      providerPlanId: local.provider_plan_id,
      providerStatus: input.preapproval.status,
      status: recurringStatus,
      periodStartsAt: paymentStatus === "aprobado" ? period.periodStartsAt : null,
      periodEndsAt: paymentStatus === "aprobado" ? period.periodEndsAt : null,
      nextPaymentAt: input.preapproval.next_payment_date ?? null,
    });
  }

  await repository.reconcileMercadoPagoPayment({
    subscriptionId: local.id,
    providerPaymentId: input.paymentId,
    providerOrderId: input.providerOrderId,
    providerStatus: input.providerStatus,
    status: paymentStatus,
    amount: input.amount,
    currencyCode: input.currency,
    paidAt: paymentStatus === "aprobado" ? paidAt : null,
    periodStartsAt: paymentStatus === "aprobado" ? period.periodStartsAt : null,
    periodEndsAt: paymentStatus === "aprobado" ? period.periodEndsAt : null,
    providerResponse: input.providerResponse,
  });

  return true;
}

export function isMercadoPagoWebhookTopic(
  value: string
): value is MercadoPagoWebhookTopic {
  return SUPPORTED_TOPICS.has(value as MercadoPagoWebhookTopic);
}

export async function processMercadoPagoWebhook(input: {
  topic: MercadoPagoWebhookTopic;
  resourceId: string;
}): Promise<boolean> {
  const { accessToken } = getMercadoPagoChileConfig();

  if (!accessToken) {
    throw new Error("Mercado Pago no tiene credenciales de servidor configuradas.");
  }

  const client = createMercadoPagoClient(accessToken);

  if (input.topic === "subscription_preapproval") {
    const resource = await client.getPreapproval(input.resourceId);
    return reconcilePreapproval(resource);
  }

  if (input.topic === "subscription_authorized_payment") {
    const resource = await client.getAuthorizedPayment(input.resourceId);

    if (!resource.preapproval_id) {
      throw new Error("El pago autorizado no informa la suscripcion asociada.");
    }

    const preapproval = await client.getPreapproval(resource.preapproval_id);
    const providerStatus = authorizedPaymentStatus(resource);
    const providerPaymentId = String(
      resource.payment?.id ?? `authorized:${resource.id}`
    );

    return reconcilePayment({
      paymentId: providerPaymentId,
      providerOrderId: String(resource.id),
      providerStatus,
      amount: resource.transaction_amount,
      currency: resource.currency_id,
      paidAt: resource.debit_date,
      providerResponse: {
        authorized_payment_id: String(resource.id),
        payment_id: resource.payment?.id ?? null,
        status: providerStatus,
        status_detail: resource.payment?.status_detail ?? null,
      },
      preapproval,
    });
  }

  const resource: MercadoPagoPayment = await client.getPayment(input.resourceId);

  if (!resource.external_reference) {
    return false;
  }

  const repository = createOrganizationSubscriptionRepository();
  const local = await repository.getByExternalReference(resource.external_reference);

  if (!local?.provider_subscription_id) {
    return false;
  }

  const preapproval = await client.getPreapproval(local.provider_subscription_id);

  return reconcilePayment({
    paymentId: String(resource.id),
    providerOrderId: null,
    providerStatus: resource.status ?? "pending",
    amount: resource.transaction_amount,
    currency: resource.currency_id,
    paidAt: resource.date_approved ?? resource.date_created,
    providerResponse: {
      payment_id: String(resource.id),
      status: resource.status ?? null,
      status_detail: resource.status_detail ?? null,
    },
    preapproval,
  });
}
