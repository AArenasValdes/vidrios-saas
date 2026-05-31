import "server-only";

import { createPagoSuscripcionRepository } from "@/features/subscriptions/repositories/pago-suscripcion.repository";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";

export type PagoHistoryEntry = {
  id: number;
  planCode: string;
  planLabel: string;
  amountClp: number;
  status: string;
  buyOrder: string | null;
  paidAt: string | null;
  createdAt: string;
  providerStatus: string | null;
};

export async function getPagosHistory(
  organizationId: number
): Promise<PagoHistoryEntry[]> {
  const repo = createPagoSuscripcionRepository();
  const rows = await repo.listByOrganizationId(organizationId);

  return rows.map((row) => ({
    id: row.id,
    planCode: row.plan_code,
    planLabel: getPlanLabel(row.plan_code),
    amountClp: row.amount_clp,
    status: row.status,
    buyOrder: row.buy_order,
    paidAt: row.paid_at,
    createdAt: row.creado_en,
    providerStatus: row.provider_status,
  }));
}
