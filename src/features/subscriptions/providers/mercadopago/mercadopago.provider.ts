import "server-only";

import { createMercadoPagoClient } from "./mercadopago.client";
import type {
  RecurringSubscriptionResult,
  SubscriptionProvider,
} from "../subscription-provider";
import type { OrganizationRecurringStatus } from "@/features/subscriptions/types/organization-subscription";

function normalizeTransactionAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }

  return null;
}

function mapStatus(status: string): OrganizationRecurringStatus {
  switch (status) {
    case "authorized":
      return "active";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function result(resource: {
  id: string;
  status: string;
  init_point?: string | null;
}): RecurringSubscriptionResult {
  return {
    providerSubscriptionId: resource.id,
    providerStatus: resource.status,
    status: mapStatus(resource.status),
    checkoutUrl: resource.init_point ?? null,
    rawResponse: resource,
  };
}

export function createMercadoPagoSubscriptionProvider(input: {
  accessToken: string;
  expectedAmount: number;
  expectedCurrency: "CLP";
  reason: string;
}): SubscriptionProvider {
  const client = createMercadoPagoClient(input.accessToken);

  return {
    code: "mercadopago",
    async createSubscription(createInput) {
      const plan = await client.getPreapprovalPlan(createInput.providerPlanId);
      const amount = normalizeTransactionAmount(
        plan.auto_recurring?.transaction_amount
      );
      const currency = plan.auto_recurring?.currency_id?.trim().toUpperCase();

      if (
        plan.id !== createInput.providerPlanId ||
        plan.status !== "active" ||
        amount !== input.expectedAmount ||
        currency !== input.expectedCurrency
      ) {
        throw new Error(
          `El plan configurado en Mercado Pago no coincide con Ventora (esperado: ${input.expectedAmount} ${input.expectedCurrency}; recibido: ${amount ?? "sin monto"} ${currency ?? "sin moneda"}).`
        );
      }

      const created = await client.createPreapproval({
        providerPlanId: createInput.providerPlanId,
        payerEmail: createInput.payerEmail,
        externalReference: createInput.externalReference,
        returnUrl: createInput.returnUrl,
        notificationUrl: createInput.notificationUrl,
        reason: input.reason,
        idempotencyKey: createInput.externalReference,
      });

      return result(created);
    },
    async getSubscription(providerSubscriptionId) {
      return result(await client.getPreapproval(providerSubscriptionId));
    },
    async cancelSubscription(providerSubscriptionId) {
      return result(
        await client.updatePreapproval(providerSubscriptionId, "cancelled")
      );
    },
    async reactivateSubscription(providerSubscriptionId) {
      return result(
        await client.updatePreapproval(providerSubscriptionId, "authorized")
      );
    },
  };
}
