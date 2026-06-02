import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingPlan } from "@/features/billing/types/plans";
import type { PagoSuscripcionRow } from "@/features/subscriptions/types/pago-suscripcion";

export const BILLING_SUCCESS_REDIRECT = "/dashboard?pago_exitoso=1";
export const BILLING_PENDING_REDIRECT = "/cuenta-vencida?pago_pendiente=1";
export const BILLING_FAILURE_REDIRECT = "/cuenta-vencida?pago_fallido=1";

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function buildBillingPeriod(input: {
  plan: BillingPlan;
  paidAt?: Date;
}): { periodStartsAt: string; periodEndsAt: string; paidAt: string } {
  const paidAt = input.paidAt ?? new Date();
  const periodStartsAt = paidAt.toISOString();
  const periodEndsAt = addMonths(paidAt, input.plan.durationMonths).toISOString();

  return {
    paidAt: paidAt.toISOString(),
    periodStartsAt,
    periodEndsAt,
  };
}

function getPlanTypeForPayment(payment: PagoSuscripcionRow) {
  if (payment.billing_period === "monthly") {
    return "monthly";
  }

  return payment.plan_code === "founder_full" ? "founder" : "yearly";
}

export async function assertOrganizationCanStartCheckout(
  organizationId: number
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: activeProfile, error } = (await admin
    .from("organization_profile")
    .select("subscription_status, subscription_ends_at")
    .eq("organization_id", organizationId)
    .single()) as {
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(`Error al validar suscripcion activa: ${error.message}`);
  }

  const subscriptionStatus = activeProfile?.subscription_status as
    | string
    | undefined;
  const subscriptionEndsAt = activeProfile?.subscription_ends_at as
    | string
    | undefined;

  if (
    subscriptionStatus === "active" &&
    subscriptionEndsAt &&
    new Date(subscriptionEndsAt).getTime() > Date.now()
  ) {
    throw new Error("La cuenta ya tiene una suscripcion activa.");
  }
}

export async function activateOrganizationSubscriptionFromPayment(
  payment: PagoSuscripcionRow
): Promise<void> {
  if (!payment.paid_at || !payment.period_ends_at) {
    throw new Error(
      "El pago aprobado no tiene fechas suficientes para activar la suscripcion."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { error } = await admin
    .from("organization_profile")
    .update({
      subscription_status: "active",
      plan_code: payment.plan_code,
      plan_type: getPlanTypeForPayment(payment),
      billing_period: payment.billing_period,
      payment_method: payment.payment_provider,
      founder_price_locked: payment.plan_code === "founder_full",
      subscription_started_at: payment.period_starts_at ?? payment.paid_at,
      subscription_ends_at: payment.period_ends_at,
      last_payment_at: payment.paid_at,
    })
    .eq("organization_id", payment.organization_id);

  if (error) {
    throw new Error(`Error al activar suscripcion: ${error.message}`);
  }
}
