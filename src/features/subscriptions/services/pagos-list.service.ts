import "server-only";

import { createPagoSuscripcionRepository } from "@/features/subscriptions/repositories/pago-suscripcion.repository";
import { getBillingPlanLabel } from "@/features/subscriptions/types/subscription-summary";

export type PagoHistoryEntry = {
  id: number;
  planCode: string;
  billingPeriod: string;
  planLabel: string;
  amountClp: number;
  status: string;
  buyOrder: string | null;
  paidAt: string | null;
  createdAt: string;
  providerStatus: string | null;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  externalReference: string | null;
  receiptUrl: string | null;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
};

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

export async function getPagosHistory(
  organizationId: number
): Promise<PagoHistoryEntry[]> {
  const repo = createPagoSuscripcionRepository();
  const rows = await repo.listByOrganizationId(organizationId);

  return rows.map((row) => {
    const response = readProviderResponseObject(row.provider_response);
    const transactionDetails = readProviderResponseObject(response.transaction_details);

    return {
    id: row.id,
    planCode: row.plan_code,
    billingPeriod: row.billing_period,
    planLabel: getBillingPlanLabel(row.plan_code, row.billing_period),
    amountClp: row.amount_clp,
    status: row.status,
    buyOrder: row.buy_order,
    paidAt: row.paid_at,
    createdAt: row.creado_en,
    providerStatus: row.provider_status,
    providerPaymentId: row.provider_payment_id,
    providerOrderId: row.provider_order_id,
    externalReference:
      typeof response.external_reference === "string"
        ? response.external_reference
        : null,
    receiptUrl: readHttpsUrl(
      response.receipt_url ?? transactionDetails.external_resource_url
    ),
    periodStartsAt: row.period_starts_at,
    periodEndsAt: row.period_ends_at,
    };
  });
}
