import type { BillingPeriod, PlanCode } from "@/features/subscriptions/types/subscription";

export type OrganizationSubscriptionProvider =
  | "mercadopago"
  | "webpay_plus"
  | "flow"
  | "manual";

export type OrganizationRecurringStatus =
  | "pending"
  | "active"
  | "paused"
  | "past_due"
  | "cancelled";

export type OrganizationSubscriptionRow = {
  id: number;
  organization_id: number;
  provider: OrganizationSubscriptionProvider;
  provider_subscription_id: string | null;
  provider_plan_id: string | null;
  plan_code: Exclude<PlanCode, "trial">;
  billing_period: Exclude<BillingPeriod, "none">;
  country_code: string;
  currency_code: string;
  amount: number;
  status: OrganizationRecurringStatus;
  provider_status: string | null;
  current_period_starts_at: string | null;
  current_period_ends_at: string | null;
  next_payment_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  external_reference: string;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
};
