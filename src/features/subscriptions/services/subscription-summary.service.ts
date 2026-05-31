import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function getSubscriptionSummary(
  organizationId: number
): Promise<SubscriptionSummary | null> {
  const admin = createAdminClient() as AnyClient;

  const { data: profile } = (await admin
    .from("organization_profile")
    .select(
      "plan_code, billing_period, payment_method, subscription_status, subscription_ends_at, founder_price_locked"
    )
    .eq("organization_id", organizationId)
    .single()) as {
    data: Record<string, unknown> | null;
  };

  if (!profile) return null;

  const { data: lastPayment } = (await admin
    .from("pagos_suscripcion")
    .select("amount_clp")
    .eq("organization_id", organizationId)
    .eq("status", "aprobado")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle()) as {
    data: Record<string, unknown> | null;
  };

  const planCode = (profile.plan_code as string) ?? null;

  return {
    planCode,
    planLabel: getPlanLabel(planCode),
    amountClp: (lastPayment?.amount_clp as number) ?? null,
    billingPeriod: (profile.billing_period as string) ?? null,
    paymentMethod: (profile.payment_method as string) ?? null,
    subscriptionStatus: (profile.subscription_status as string) ?? null,
    subscriptionEndsAt: (profile.subscription_ends_at as string) ?? null,
    founderPriceLocked: (profile.founder_price_locked as boolean) ?? false,
  };
}
