import "server-only";

import type { MercadoPagoPreapprovalPlan } from "./mercadopago.types";
import { normalizeMercadoPagoTransactionAmount } from "./mercadopago-amount";

export function buildPendingAutoRecurringFromPlan(plan: MercadoPagoPreapprovalPlan) {
  const recurring = plan.auto_recurring;
  const frequency = recurring?.frequency;
  const frequencyType = recurring?.frequency_type?.trim();
  const amount = normalizeMercadoPagoTransactionAmount(
    recurring?.transaction_amount
  );
  const currency = recurring?.currency_id?.trim().toUpperCase();

  if (!frequency || !frequencyType || amount === null || !currency) {
    throw new Error("El plan de Mercado Pago no tiene configuracion recurrente valida.");
  }

  return {
    frequency,
    frequency_type: frequencyType,
    transaction_amount: amount,
    currency_id: currency,
  };
}
