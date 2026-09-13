import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import type { OrganizationSubscriptionRow } from "@/features/subscriptions/types/organization-subscription";
import type { PagoSuscripcionRow } from "@/features/subscriptions/types/pago-suscripcion";
import type {
  OrganizationSubscriptionSnapshot,
  SubscriptionStatus,
} from "@/features/subscriptions/types/subscription";

type ProfileBillingRow = Partial<{
  subscription_status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  plan_type: string | null;
  plan_code: string | null;
  billing_period: string | null;
  payment_method: string | null;
  last_payment_at: string | null;
  founder_price_locked: boolean | null;
}>;

export type OrganizationBillingState = {
  profile: ProfileBillingRow | null;
  recurringSubscription: OrganizationSubscriptionRow | null;
  latestApprovedPayment: PagoSuscripcionRow | null;
};

function mapCancelledStatus(
  subscription: OrganizationSubscriptionRow,
  now = new Date()
): SubscriptionStatus {
  if (
    subscription.current_period_ends_at &&
    new Date(subscription.current_period_ends_at).getTime() > now.getTime()
  ) {
    return "active";
  }

  return "cancelled";
}

function mapProviderStatus(
  subscription: OrganizationSubscriptionRow
): SubscriptionStatus {
  switch (subscription.status) {
    case "active":
      return "active";
    case "past_due":
    case "paused":
      return "past_due";
    case "cancelled":
      return mapCancelledStatus(subscription);
    default:
      return "trial_active";
  }
}

function mapRecurringSnapshot(
  subscription: OrganizationSubscriptionRow,
  latestApprovedPayment: PagoSuscripcionRow | null
): OrganizationSubscriptionSnapshot {
  return {
    subscriptionStatus: mapProviderStatus(subscription),
    trialStartedAt: null,
    trialEndsAt: null,
    subscriptionStartedAt: subscription.current_period_starts_at,
    subscriptionEndsAt: subscription.current_period_ends_at,
    planType:
      subscription.plan_code === "founder_full"
        ? "founder"
        : subscription.billing_period === "yearly"
          ? "yearly"
          : "monthly",
    planCode: subscription.plan_code,
    billingPeriod: subscription.billing_period,
    paymentMethod:
      subscription.provider === "manual"
        ? "manual_other"
        : subscription.provider,
    lastPaymentAt:
      latestApprovedPayment?.paid_at ?? subscription.current_period_starts_at,
    founderPriceLocked: subscription.plan_code === "founder_full",
  };
}

export function mapProfileBillingSnapshot(
  profile: ProfileBillingRow | null
): OrganizationSubscriptionSnapshot | null {
  if (!profile) return null;

  return {
    subscriptionStatus: (profile.subscription_status ?? null) as OrganizationSubscriptionSnapshot["subscriptionStatus"],
    trialStartedAt: profile.trial_started_at ?? null,
    trialEndsAt: profile.trial_ends_at ?? null,
    subscriptionStartedAt: profile.subscription_started_at ?? null,
    subscriptionEndsAt: profile.subscription_ends_at ?? null,
    planType: (profile.plan_type ?? null) as OrganizationSubscriptionSnapshot["planType"],
    planCode: (profile.plan_code ?? null) as OrganizationSubscriptionSnapshot["planCode"],
    billingPeriod: (profile.billing_period ?? null) as OrganizationSubscriptionSnapshot["billingPeriod"],
    paymentMethod: (profile.payment_method ?? null) as OrganizationSubscriptionSnapshot["paymentMethod"],
    lastPaymentAt: profile.last_payment_at ?? null,
    founderPriceLocked: profile.founder_price_locked ?? false,
  };
}

export function resolveCanonicalSubscriptionSnapshot(
  state: OrganizationBillingState
): OrganizationSubscriptionSnapshot | null {
  if (state.recurringSubscription && state.recurringSubscription.status !== "pending") {
    // Cancelar un checkout sin pago aprobado no transforma el trial en un plan
    // pagado cancelado. El snapshot recurrente queda como auditoria, pero la
    // cuenta debe volver a mostrar el trial que sigue vigente en el perfil.
    if (
      state.recurringSubscription.status === "cancelled" &&
      state.latestApprovedPayment?.subscription_id !== state.recurringSubscription.id
    ) {
      return mapProfileBillingSnapshot(state.profile);
    }

    return mapRecurringSnapshot(
      state.recurringSubscription,
      state.latestApprovedPayment
    );
  }

  if (
    state.recurringSubscription &&
    state.latestApprovedPayment?.subscription_id === state.recurringSubscription.id
  ) {
    const payment = state.latestApprovedPayment;
    return mapRecurringSnapshot(
      {
        ...state.recurringSubscription,
        status: "active",
        current_period_starts_at:
          state.recurringSubscription.current_period_starts_at ??
          payment.period_starts_at ??
          payment.paid_at,
        current_period_ends_at:
          state.recurringSubscription.current_period_ends_at ??
          payment.period_ends_at,
      },
      payment
    );
  }

  return mapProfileBillingSnapshot(state.profile);
}

export async function getOrganizationBillingState(
  organizationId: number
): Promise<OrganizationBillingState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const [profileResult, paymentResult, recurringSubscription] = await Promise.all([
    admin
      .from("organization_profile")
      .select(
        "subscription_status, trial_started_at, trial_ends_at, subscription_started_at, subscription_ends_at, plan_type, plan_code, billing_period, payment_method, last_payment_at, founder_price_locked"
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("pagos_suscripcion")
      .select(
        "id, organization_id, plan_code, billing_period, amount_clp, amount, currency, currency_code, subscription_id, provider_payment_id, payment_provider, provider_token, provider_order_id, provider_status, provider_response, checkout_url, buy_order, status, paid_at, period_starts_at, period_ends_at, creado_en, actualizado_en, eliminado_en"
      )
      .eq("organization_id", organizationId)
      .eq("status", "aprobado")
      .is("eliminado_en", null)
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (async () => {
      const repository = createOrganizationSubscriptionRepository();
      return (
        (await repository.getOpenMercadoPagoByOrganizationId(organizationId)) ??
        (await repository.getLatestByOrganizationId(organizationId))
      );
    })(),
  ]);

  if (profileResult.error) {
    throw new Error(`Error al leer estado de suscripcion: ${profileResult.error.message}`);
  }

  if (paymentResult.error) {
    throw new Error(`Error al leer pagos aprobados: ${paymentResult.error.message}`);
  }

  return {
    profile: (profileResult.data as ProfileBillingRow | null) ?? null,
    recurringSubscription,
    latestApprovedPayment: (paymentResult.data as PagoSuscripcionRow | null) ?? null,
  };
}
