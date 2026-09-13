import "server-only";

import type { BillingPeriod } from "@/features/subscriptions/types/subscription";
import type { MercadoPagoPreapprovalPlan } from "./mercadopago.types";
import { normalizeMercadoPagoTransactionAmount } from "./mercadopago-amount";

function normalizeFrequency(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  return null;
}

function normalizeFrequencyType(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function recurringDefaultsForBillingPeriod(billingPeriod: Exclude<BillingPeriod, "none">) {
  if (billingPeriod === "yearly") {
    return { frequency: 12, frequency_type: "months" as const };
  }

  return { frequency: 1, frequency_type: "months" as const };
}

export function doesMercadoPagoPlanMatchBillingPeriod(
  plan: MercadoPagoPreapprovalPlan,
  billingPeriod: Exclude<BillingPeriod, "none">
) {
  const recurring = plan.auto_recurring;
  const frequency = normalizeFrequency(recurring?.frequency);
  const frequencyType = normalizeFrequencyType(recurring?.frequency_type);

  if (!frequency || !frequencyType) return false;

  if (frequencyType === "year" || frequencyType === "years") {
    return billingPeriod === "yearly" && frequency === 1;
  }

  if (frequencyType !== "month" && frequencyType !== "months") {
    return false;
  }

  return billingPeriod === "monthly" ? frequency === 1 : frequency === 12;
}

export function buildPendingAutoRecurringFromPlan(
  plan: MercadoPagoPreapprovalPlan,
  fallback: {
    amount: number;
    currency: "CLP";
    billingPeriod: Exclude<BillingPeriod, "none">;
  }
) {
  const recurring = plan.auto_recurring;
  let frequency = normalizeFrequency(recurring?.frequency);
  let frequencyType = normalizeFrequencyType(recurring?.frequency_type);
  let amount = normalizeMercadoPagoTransactionAmount(recurring?.transaction_amount);
  let currency = recurring?.currency_id?.trim().toUpperCase() ?? null;

  if (frequencyType === "year" || frequencyType === "years") {
    frequency = (frequency ?? 1) * 12;
    frequencyType = "months";
  }

  if (!frequency || !frequencyType) {
    const defaults = recurringDefaultsForBillingPeriod(fallback.billingPeriod);
    frequency = defaults.frequency;
    frequencyType = defaults.frequency_type;
  }

  if (amount === null) {
    amount = fallback.amount;
  }

  if (!currency) {
    currency = fallback.currency;
  }

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

export function readMercadoPagoPlanAmount(plan: MercadoPagoPreapprovalPlan) {
  return normalizeMercadoPagoTransactionAmount(plan.auto_recurring?.transaction_amount);
}
