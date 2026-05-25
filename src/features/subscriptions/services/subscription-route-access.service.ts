import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  resolveOrganizationSubscriptionState,
} from "@/features/subscriptions/services/subscription-status.service";
import type { OrganizationSubscriptionSnapshot } from "@/features/subscriptions/types/subscription";
import { createClient } from "@/lib/supabase/server";

const ORGANIZATION_SUBSCRIPTION_SELECT = `
  subscription_status,
  trial_started_at,
  trial_ends_at,
  subscription_started_at,
  subscription_ends_at,
  plan_type,
  billing_period,
  payment_method,
  last_payment_at,
  founder_price_locked
`;

type OrganizationSubscriptionRow = {
  subscription_status?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  plan_type?: string | null;
  billing_period?: string | null;
  payment_method?: string | null;
  last_payment_at?: string | null;
  founder_price_locked?: boolean | null;
};

function mapOrganizationSubscriptionRow(
  row: OrganizationSubscriptionRow | null
): OrganizationSubscriptionSnapshot | null {
  if (!row) {
    return null;
  }

  return {
    subscriptionStatus: (row.subscription_status ?? null) as OrganizationSubscriptionSnapshot["subscriptionStatus"],
    trialStartedAt: row.trial_started_at ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    subscriptionStartedAt: row.subscription_started_at ?? null,
    subscriptionEndsAt: row.subscription_ends_at ?? null,
    planType: (row.plan_type ?? null) as OrganizationSubscriptionSnapshot["planType"],
    billingPeriod: (row.billing_period ?? null) as OrganizationSubscriptionSnapshot["billingPeriod"],
    paymentMethod: (row.payment_method ?? null) as OrganizationSubscriptionSnapshot["paymentMethod"],
    lastPaymentAt: row.last_payment_at ?? null,
    founderPriceLocked: row.founder_price_locked ?? false,
  };
}

async function getSubscriptionSnapshotByOrganizationId(
  supabase: SupabaseClient,
  organizationId: string | number
) {
  const { data, error } = await supabase
    .from("organization_profile")
    .select(ORGANIZATION_SUBSCRIPTION_SELECT)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new AuthRouteAccessError(
      500,
      "No pudimos validar el estado de la cuenta."
    );
  }

  return mapOrganizationSubscriptionRow(data as OrganizationSubscriptionRow | null);
}

export async function resolveAuthenticatedSubscriptionRouteContext(options: {
  requireOrganization?: boolean;
} = {}) {
  const context = await resolveAuthenticatedRouteContext(options);

  if (!context.profile.organizationId) {
    return {
      ...context,
      subscription: resolveOrganizationSubscriptionState(null),
    };
  }

  const supabase = await createClient();
  const snapshot = await getSubscriptionSnapshotByOrganizationId(
    supabase,
    context.profile.organizationId
  );

  return {
    ...context,
    subscription: resolveOrganizationSubscriptionState(snapshot),
  };
}

export function assertAuthenticatedRouteAllowsWrite(input: {
  subscription: ReturnType<typeof resolveOrganizationSubscriptionState>;
}) {
  if (input.subscription.isWriteBlocked) {
    throw new AuthRouteAccessError(
      403,
      "Tu prueba gratuita ya vencio. Activa tu cuenta para volver a operar."
    );
  }
}

export {
  ORGANIZATION_SUBSCRIPTION_SELECT,
  getSubscriptionSnapshotByOrganizationId,
  mapOrganizationSubscriptionRow,
};
