import "server-only";

import { createMercadoPagoClient } from "./mercadopago.client";
import { buildPendingAutoRecurringFromPlan } from "./mercadopago-plan";
import type {
  RecurringSubscriptionResult,
  SubscriptionProvider,
} from "../subscription-provider";
import type { OrganizationRecurringStatus } from "@/features/subscriptions/types/organization-subscription";

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
      const autoRecurring = buildPendingAutoRecurringFromPlan(plan);

      if (
        plan.id !== createInput.providerPlanId ||
        plan.status !== "active" ||
        autoRecurring.transaction_amount !== input.expectedAmount ||
        autoRecurring.currency_id !== input.expectedCurrency
      ) {
        throw new Error(
          `El plan configurado en Mercado Pago no coincide con Ventora (esperado: ${input.expectedAmount} ${input.expectedCurrency}; recibido: ${autoRecurring.transaction_amount} ${autoRecurring.currency_id}).`
        );
      }

      // Chile exige card_token_id si se envia preapproval_plan_id. Validamos el
      // plan comercial via GET y creamos una suscripcion pending sin plan asociado
      // para obtener init_point y cobrar en el checkout hosted de Mercado Pago.
      const created = await client.createPreapproval({
        payerEmail: createInput.payerEmail,
        externalReference: createInput.externalReference,
        returnUrl: createInput.returnUrl,
        notificationUrl: createInput.notificationUrl,
        reason: input.reason,
        idempotencyKey: createInput.externalReference,
        autoRecurring,
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
