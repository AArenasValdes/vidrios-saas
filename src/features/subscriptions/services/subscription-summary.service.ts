import "server-only";

import { isMercadoPagoChileBillingReady } from "@/features/subscriptions/config/mercadopago-cl.config";
import {
  getOrganizationBillingState,
  resolveCanonicalSubscriptionSnapshot,
} from "@/features/subscriptions/services/subscription-billing-state.service";
import { resolveOrganizationSubscriptionState } from "@/features/subscriptions/services/subscription-status.service";
import {
  getBillingPlanLabel,
  type SubscriptionPaymentReceipt,
} from "@/features/subscriptions/types/subscription-summary";
import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readProviderResponseObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function mapPaymentReceipt(
  payment: Awaited<ReturnType<typeof getOrganizationBillingState>>["latestApprovedPayment"]
): SubscriptionPaymentReceipt | null {
  if (!payment) return null;

  const response = readProviderResponseObject(payment.provider_response);
  const transactionDetails = readProviderResponseObject(response.transaction_details);

  return {
    providerPaymentId: payment.provider_payment_id,
    providerOrderId: payment.provider_order_id,
    externalReference: readOptionalString(response.external_reference),
    receiptUrl: readHttpsUrl(
      response.receipt_url ?? transactionDetails.external_resource_url
    ),
    paidAt: payment.paid_at,
  };
}

export async function getSubscriptionSummary(
  organizationId: number
): Promise<SubscriptionSummary | null> {
  const billingState = await getOrganizationBillingState(organizationId);
  if (!billingState.profile) return null;

  const snapshot = resolveCanonicalSubscriptionSnapshot(billingState);
  if (!snapshot) return null;

  const planCode = snapshot.planCode;
  const paymentMethod = snapshot.paymentMethod;
  const subscriptionEndsAt = snapshot.subscriptionEndsAt;
  const resolvedSubscription = resolveOrganizationSubscriptionState({
    ...snapshot,
  });
  const subscriptionStatus =
    resolvedSubscription.effectiveStatus ??
    snapshot.subscriptionStatus ??
    null;
  const recurringSubscription = billingState.recurringSubscription;
  const latestApprovedPayment = billingState.latestApprovedPayment;
  const amountClp =
    recurringSubscription && recurringSubscription.status !== "pending"
      ? recurringSubscription.amount
      : latestApprovedPayment?.amount_clp ?? recurringSubscription?.amount ?? null;

  return {
    planCode,
    planLabel: getBillingPlanLabel(planCode, snapshot.billingPeriod),
    amountClp,
    billingPeriod: snapshot.billingPeriod,
    paymentMethod,
    subscriptionStatus,
    subscriptionEndsAt,
    recurringProvider: recurringSubscription?.provider ?? null,
    recurringStatus: recurringSubscription?.status ?? null,
    currentPeriodStartsAt: recurringSubscription?.current_period_starts_at ?? null,
    currentPeriodEndsAt: recurringSubscription?.current_period_ends_at ?? null,
    nextPaymentAt: recurringSubscription?.next_payment_at ?? null,
    cancelAtPeriodEnd: recurringSubscription?.cancel_at_period_end ?? false,
    cancelledAt: recurringSubscription?.cancelled_at ?? null,
    canCancelRecurringSubscription:
      recurringSubscription?.provider === "mercadopago" &&
      Boolean(recurringSubscription.provider_subscription_id) &&
      (recurringSubscription.status === "active" ||
        recurringSubscription.status === "pending") &&
      isMercadoPagoChileBillingReady(),
    founderPriceLocked: snapshot.founderPriceLocked,
    externalReference: recurringSubscription?.external_reference ?? null,
    latestPayment: mapPaymentReceipt(latestApprovedPayment),
  };
}
