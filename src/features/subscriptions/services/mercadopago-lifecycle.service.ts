import "server-only";

import {
  getMercadoPagoChileConfig,
  isMercadoPagoChileBillingReady,
} from "@/features/subscriptions/config/mercadopago-cl.config";
import { createMercadoPagoSubscriptionProvider } from "@/features/subscriptions/providers/mercadopago/mercadopago.provider";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";

export class MercadoPagoLifecycleError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MercadoPagoLifecycleError";
    this.status = status;
  }
}

export async function cancelMercadoPagoChileSubscription(input: {
  organizationId: number;
}): Promise<{ subscriptionId: number; currentPeriodEndsAt: string | null }> {
  if (!isMercadoPagoChileBillingReady()) {
    throw new MercadoPagoLifecycleError(
      503,
      "Mercado Pago aun no esta disponible para administrar suscripciones."
    );
  }

  const repository = createOrganizationSubscriptionRepository();
  const subscription = await repository.getOpenMercadoPagoByOrganizationId(
    input.organizationId
  );

  if (!subscription || subscription.status !== "active") {
    throw new MercadoPagoLifecycleError(
      409,
      "No encontramos una suscripcion activa de Mercado Pago para cancelar."
    );
  }

  if (!subscription.provider_subscription_id || !subscription.provider_plan_id) {
    throw new MercadoPagoLifecycleError(
      409,
      "La suscripcion aun no esta lista para ser cancelada."
    );
  }

  const { accessToken } = getMercadoPagoChileConfig();
  const provider = createMercadoPagoSubscriptionProvider({
    accessToken,
    expectedAmount: subscription.amount,
    expectedCurrency: "CLP",
    reason: "Ventora - cancelacion de renovacion",
  });
  const cancelled = await provider.cancelSubscription(
    subscription.provider_subscription_id
  );

  if (cancelled.status !== "cancelled") {
    throw new MercadoPagoLifecycleError(
      502,
      "Mercado Pago no confirmo la cancelacion de la suscripcion."
    );
  }

  await repository.reconcileMercadoPagoSubscription({
    subscriptionId: subscription.id,
    providerSubscriptionId: cancelled.providerSubscriptionId,
    providerPlanId: subscription.provider_plan_id,
    providerStatus: cancelled.providerStatus,
    status: "cancelled",
    periodStartsAt: subscription.current_period_starts_at,
    periodEndsAt: subscription.current_period_ends_at,
    nextPaymentAt: null,
    cancelledAt: new Date().toISOString(),
  });
  await repository.markMercadoPagoCancellationRequested(subscription.id);

  return {
    subscriptionId: subscription.id,
    currentPeriodEndsAt: subscription.current_period_ends_at,
  };
}
