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

export function getBillingPlanLabel(
  planCode: string | null | undefined,
  billingPeriod: string | null | undefined
): string {
  if (!planCode) return "Sin plan";

  const variant =
    planCode === "quote_only" && billingPeriod === "monthly"
      ? "quote_only_monthly"
      : planCode === "quote_only" && billingPeriod === "yearly"
        ? "quote_only_annual"
        : planCode === "founder_full" && billingPeriod === "monthly"
          ? "founder_monthly"
          : planCode === "founder_full" && billingPeriod === "yearly"
            ? "founder_full_annual"
            : planCode;

  return PLAN_LABELS[variant] ?? getPlanLabel(planCode);
}

export type SubscriptionPaymentReceipt = {
  providerPaymentId: string | null;
  providerOrderId: string | null;
  externalReference: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
};

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
  externalReference: string | null;
  latestPayment: SubscriptionPaymentReceipt | null;
};
