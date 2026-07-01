import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  buildFreshTrialRepairSnapshot,
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
  plan_code,
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
  plan_code?: string | null;
  billing_period?: string | null;
  payment_method?: string | null;
  last_payment_at?: string | null;
  founder_price_locked?: boolean | null;
};

type OrganizationCreatedAtRow = {
  creado_en?: string | null;
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
    planCode: (row.plan_code ?? null) as OrganizationSubscriptionSnapshot["planCode"],
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

async function repairFreshTrialSnapshotIfNeeded(input: {
  supabase: SupabaseClient;
  organizationId: string | number;
  snapshot: OrganizationSubscriptionSnapshot | null;
}) {
  const initialState = resolveOrganizationSubscriptionState(input.snapshot);

  if (!initialState.isWriteBlocked) {
    return input.snapshot;
  }

  const { data, error } = await input.supabase
    .from("organizations")
    .select("creado_en")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (error) {
    return input.snapshot;
  }

  const repairedSnapshot = buildFreshTrialRepairSnapshot({
    snapshot: input.snapshot,
    organizationCreatedAt: (data as OrganizationCreatedAtRow | null)?.creado_en,
  });

  if (!repairedSnapshot) {
    return input.snapshot;
  }

  const { error: repairError } = await input.supabase
    .from("organization_profile")
    .upsert(
      {
        organization_id: input.organizationId,
        subscription_status: repairedSnapshot.subscriptionStatus,
        trial_started_at: repairedSnapshot.trialStartedAt,
        trial_ends_at: repairedSnapshot.trialEndsAt,
        plan_type: repairedSnapshot.planType,
        plan_code: repairedSnapshot.planCode,
        billing_period: repairedSnapshot.billingPeriod,
        payment_method: repairedSnapshot.paymentMethod,
        founder_price_locked: repairedSnapshot.founderPriceLocked,
      },
      { onConflict: "organization_id" }
    );

  if (repairError) {
    console.warn("[subscription] No se pudo persistir reparacion de trial", {
      organizationId: input.organizationId,
      message: repairError.message,
    });
  }

  return repairedSnapshot;
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
  const repairedSnapshot = await repairFreshTrialSnapshotIfNeeded({
    supabase,
    organizationId: context.profile.organizationId,
    snapshot,
  });

  return {
    ...context,
    subscription: resolveOrganizationSubscriptionState(repairedSnapshot),
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
  repairFreshTrialSnapshotIfNeeded,
};
