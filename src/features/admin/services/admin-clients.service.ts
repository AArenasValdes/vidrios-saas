import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminClientRow = {
  organizationId: number;
  empresaNombre: string;
  adminEmail: string | null;
  subscriptionStatus: string | null;
  planCode: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  paymentMethod: string | null;
};

export async function listAdminClients(): Promise<AdminClientRow[]> {
  const admin = createAdminClient();
  const { data: organizations, error: organizationsError } = await admin
    .from("organizations")
    .select("id, nombre, eliminado_en")
    .is("eliminado_en", null)
    .order("id", { ascending: false });

  if (organizationsError) {
    throw new Error(
      `No pudimos listar organizaciones: ${organizationsError.message}`
    );
  }

  const organizationIds = (organizations ?? []).map((row) => Number(row.id));

  if (organizationIds.length === 0) {
    return [];
  }

  const [profilesResult, usersResult] = await Promise.all([
    admin
      .from("organization_profile")
      .select(
        "organization_id, empresa_nombre, subscription_status, plan_code, trial_ends_at, subscription_ends_at, payment_method"
      )
      .in("organization_id", organizationIds),
    admin
      .from("users")
      .select("organization_id, correo, rol, eliminado_en")
      .in("organization_id", organizationIds)
      .eq("rol", "admin")
      .is("eliminado_en", null),
  ]);

  if (profilesResult.error) {
    throw new Error(
      `No pudimos listar perfiles: ${profilesResult.error.message}`
    );
  }

  if (usersResult.error) {
    throw new Error(`No pudimos listar usuarios: ${usersResult.error.message}`);
  }

  const profileByOrg = new Map(
    (profilesResult.data ?? []).map((row) => [Number(row.organization_id), row])
  );
  const adminEmailByOrg = new Map<number, string>();

  for (const user of usersResult.data ?? []) {
    const organizationId = Number(user.organization_id);
    if (!adminEmailByOrg.has(organizationId)) {
      adminEmailByOrg.set(organizationId, String(user.correo));
    }
  }

  return (organizations ?? []).map((organization) => {
    const organizationId = Number(organization.id);
    const profile = profileByOrg.get(organizationId);

    return {
      organizationId,
      empresaNombre:
        (profile?.empresa_nombre as string | null) ??
        (organization.nombre as string),
      adminEmail: adminEmailByOrg.get(organizationId) ?? null,
      subscriptionStatus:
        (profile?.subscription_status as string | null) ?? null,
      planCode: (profile?.plan_code as string | null) ?? null,
      trialEndsAt: (profile?.trial_ends_at as string | null) ?? null,
      subscriptionEndsAt:
        (profile?.subscription_ends_at as string | null) ?? null,
      paymentMethod: (profile?.payment_method as string | null) ?? null,
    };
  });
}
