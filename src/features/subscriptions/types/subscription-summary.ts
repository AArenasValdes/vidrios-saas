export const PLAN_LABELS: Record<string, string> = {
  founder_full: "Founder Full Anual",
  quote_only: "Solo Cotizaci\u00f3n Anual",
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
  founderPriceLocked: boolean;
};
