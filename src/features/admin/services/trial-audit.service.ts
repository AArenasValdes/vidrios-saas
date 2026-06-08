import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type MisconfiguredTrialRow = {
  organizationId: number;
  empresaNombre: string | null;
  subscriptionStatus: string | null;
  planCode: string | null;
  trialEndsAt: string | null;
};

type TrialProfileRow = {
  organization_id: number | string;
  empresa_nombre: string | null;
  subscription_status: string | null;
  plan_code: string | null;
  trial_ends_at: string | null;
};

type TrialProfileFixRow = {
  organization_id: number | string;
};

type TrialProfileFixUpdate = {
  plan_code: "trial";
  plan_type: "trial";
  billing_period: "none";
  payment_method: "none";
  actualizado_en: string;
};

type TrialProfileFixTable = {
  update(values: TrialProfileFixUpdate): {
    eq(column: "plan_code", value: "quote_only"): {
      in(
        column: "subscription_status",
        values: readonly string[]
      ): {
        select(columns: "organization_id"): Promise<{
          data: TrialProfileFixRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
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

  const rows = (data ?? []) as TrialProfileRow[];

  return rows.map((row) => ({
    organizationId: Number(row.organization_id),
    empresaNombre: row.empresa_nombre ?? null,
    subscriptionStatus: row.subscription_status ?? null,
    planCode: row.plan_code ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
  }));
}

export async function fixMisconfiguredTrialOrganizations() {
  const admin = createAdminClient();
  const trialProfileTable = admin.from(
    "organization_profile"
  ) as unknown as TrialProfileFixTable;

  const { data, error } = await trialProfileTable
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
