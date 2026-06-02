import type {
  BillingPeriod,
  PlanCode,
  PlanType,
} from "@/features/subscriptions/types/subscription";

export type BillingPlanCode =
  | "founder_full_annual"
  | "quote_only_annual"
  | "founder_monthly";

export type BillingPlan = {
  code: BillingPlanCode;
  subscriptionPlanCode: Exclude<PlanCode, "trial">;
  planType: Exclude<PlanType, "trial">;
  billingPeriod: Exclude<BillingPeriod, "none">;
  amountClp: number;
  durationMonths: number;
  label: string;
  checkoutEnabled: boolean;
};

export const BILLING_PLANS: Record<BillingPlanCode, BillingPlan> = {
  founder_full_annual: {
    code: "founder_full_annual",
    subscriptionPlanCode: "founder_full",
    planType: "founder",
    billingPeriod: "yearly",
    amountClp: 79_990,
    durationMonths: 12,
    label: "Founder Full Anual",
    checkoutEnabled: true,
  },
  quote_only_annual: {
    code: "quote_only_annual",
    subscriptionPlanCode: "quote_only",
    planType: "yearly",
    billingPeriod: "yearly",
    amountClp: 59_990,
    durationMonths: 12,
    label: "Solo Cotizacion Anual",
    checkoutEnabled: true,
  },
  founder_monthly: {
    code: "founder_monthly",
    subscriptionPlanCode: "founder_full",
    planType: "monthly",
    billingPeriod: "monthly",
    amountClp: 8_990,
    durationMonths: 1,
    label: "Founder Mensual",
    checkoutEnabled: false,
  },
};

export function isBillingPlanCode(value: string): value is BillingPlanCode {
  return Object.prototype.hasOwnProperty.call(BILLING_PLANS, value);
}

export function getBillingPlan(code: BillingPlanCode): BillingPlan {
  return BILLING_PLANS[code];
}
