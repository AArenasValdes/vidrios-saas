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

type OrganizationRow = {
  id: number | string;
  nombre: string | null;
};

type OrganizationProfileRow = {
  organization_id: number | string;
  empresa_nombre: string | null;
  subscription_status: string | null;
  plan_code: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  payment_method: string | null;
};

type OrganizationAdminUserRow = {
  organization_id: number | string;
  correo: string | null;
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

  const organizationRows = (organizations ?? []) as OrganizationRow[];
  const organizationIds = organizationRows.map((row) => Number(row.id));

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

  const profileRows = (profilesResult.data ?? []) as OrganizationProfileRow[];
  const adminUserRows = (usersResult.data ?? []) as OrganizationAdminUserRow[];

  const profileByOrg = new Map(
    profileRows.map((row) => [Number(row.organization_id), row])
  );
  const adminEmailByOrg = new Map<number, string>();

  for (const user of adminUserRows) {
    const organizationId = Number(user.organization_id);
    if (!adminEmailByOrg.has(organizationId) && user.correo) {
      adminEmailByOrg.set(organizationId, user.correo);
    }
  }

  return organizationRows.map((organization) => {
    const organizationId = Number(organization.id);
    const profile = profileByOrg.get(organizationId);

    return {
      organizationId,
      empresaNombre:
        profile?.empresa_nombre ??
        organization.nombre ??
        `Empresa ${organizationId}`,
      adminEmail: adminEmailByOrg.get(organizationId) ?? null,
      subscriptionStatus:
        profile?.subscription_status ?? null,
      planCode: profile?.plan_code ?? null,
      trialEndsAt: profile?.trial_ends_at ?? null,
      subscriptionEndsAt: profile?.subscription_ends_at ?? null,
      paymentMethod: profile?.payment_method ?? null,
    };
  });
}
