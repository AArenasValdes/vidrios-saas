import "server-only";

import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import type { PagoSuscripcionRow } from "@/features/subscriptions/types/pago-suscripcion";
import type {
  PaymentStatus,
} from "@/features/subscriptions/types/pago-suscripcion";
import type { OrganizationRecurringStatus } from "@/features/subscriptions/types/organization-subscription";

export function mapMercadoPagoSubscriptionStatus(
  providerStatus: string
): OrganizationRecurringStatus {
  switch (providerStatus.toLowerCase()) {
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

export function mapMercadoPagoPaymentStatus(
  providerStatus: string
): PaymentStatus {
  switch (providerStatus.toLowerCase()) {
    case "approved":
    case "processed":
      return "aprobado";
    case "rejected":
      return "fallido";
    case "cancelled":
    case "cancelled_by_collector":
      return "cancelado";
    case "refunded":
    case "charged_back":
      return "reembolsado";
    default:
      return "pendiente";
  }
}

export async function activateSubscriptionFromApprovedPayment(
  payment: PagoSuscripcionRow
): Promise<void> {
  if (payment.status !== "aprobado") {
    throw new Error("El pago debe estar aprobado antes de activar la suscripcion.");
  }

  if (!payment.paid_at || !payment.period_ends_at) {
    throw new Error(
      "El pago aprobado no tiene fechas suficientes para activar la suscripcion."
    );
  }

  await createOrganizationSubscriptionRepository().activateFromApprovedPayment(payment.id);
}
