import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type MisconfiguredTrialRow = {
  organizationId: number;
  empresaNombre: string | null;
  subscriptionStatus: string | null;
  planCode: string | null;
  trialEndsAt: string | null;
};

export async function listMisconfiguredTrialOrganizations(): Promise<
  MisconfiguredTrialRow[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_profile")
    .select(
      "organization_id, subscription_status, plan_code, trial_ends_at, empresa_nombre"
    )
    .eq("plan_code", "quote_only")
    .in("subscription_status", [
      "trial_active",
      "trial_expiring",
      "trial_expired",
    ]);

  if (error) {
    throw new Error(`No pudimos auditar trials: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    organizationId: Number(row.organization_id),
    empresaNombre: (row.empresa_nombre as string | null) ?? null,
    subscriptionStatus: (row.subscription_status as string | null) ?? null,
    planCode: (row.plan_code as string | null) ?? null,
    trialEndsAt: (row.trial_ends_at as string | null) ?? null,
  }));
}

export async function fixMisconfiguredTrialOrganizations() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_profile")
    .update({
      plan_code: "trial",
      plan_type: "trial",
      billing_period: "none",
      payment_method: "none",
      actualizado_en: new Date().toISOString(),
    })
    .eq("plan_code", "quote_only")
    .in("subscription_status", [
      "trial_active",
      "trial_expiring",
      "trial_expired",
    ])
    .select("organization_id");

  if (error) {
    throw new Error(`No pudimos corregir trials: ${error.message}`);
  }

  return {
    fixedCount: data?.length ?? 0,
    organizationIds: (data ?? []).map((row) => Number(row.organization_id)),
  };
}
