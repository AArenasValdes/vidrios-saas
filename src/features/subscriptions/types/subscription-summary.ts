export const PLAN_LABELS: Record<string, string> = {
  founder_full_annual: "Ventora Comercial Anual",
  quote_only_monthly: "Ventora Cotización Mensual",
  quote_only_annual: "Ventora Cotización Anual",
  founder_monthly: "Ventora Comercial Mensual",
  founder_full: "Ventora Comercial",
  quote_only: "Ventora Cotización",
  trial: "Prueba gratis",
};

export function getPlanLabel(planCode: string | null | undefined): string {
  if (!planCode) return "Sin plan";
  return PLAN_LABELS[planCode] ?? planCode;
}

export type SubscriptionSummary = {
  planCode: string | null;
  planLabel: string;
  amountClp: number | null;
  billingPeriod: string | null;
  paymentMethod: string | null;
  subscriptionStatus: string | null;
  subscriptionEndsAt: string | null;
  recurringProvider: string | null;
  recurringStatus: string | null;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  nextPaymentAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  canCancelRecurringSubscription: boolean;
  founderPriceLocked: boolean;
};
