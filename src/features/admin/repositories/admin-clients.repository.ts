import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_ORGANIZATION_PROFILE_SELECT =
  "organization_id, empresa_nombre, empresa_direccion, empresa_telefono, empresa_email, public_name, public_zone, brand_color, solicitud_publica_slug, subscription_status, trial_started_at, trial_ends_at, subscription_started_at, subscription_ends_at, plan_type, plan_code, billing_period, payment_method, last_payment_at, founder_price_locked, is_test_account";

export type AdminOrganizationRow = {
  id: number | string;
  nombre: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  plan: string | null;
  creado_en: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

export type AdminOrganizationProfileRow = {
  organization_id: number | string;
  empresa_nombre: string | null;
  empresa_direccion: string | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  public_name: string | null;
  public_zone: string | null;
  brand_color: string | null;
  solicitud_publica_slug: string | null;
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
  is_test_account: boolean | null;
};

export type AdminOrganizationUserRow = {
  id: number | string;
  organization_id: number | string;
  correo: string | null;
  rol: string | null;
  auth_user_id: string | null;
  creado_en: string | null;
  eliminado_en: string | null;
};

export type AdminOrganizationPaymentRow = {
  id: number | string;
  organization_id: number | string;
  plan_code: string;
  billing_period: string;
  amount_clp: number;
  currency: string;
  payment_provider: "flow" | "manual_transfer" | "webpay_plus";
  provider_status: string | null;
  status: "pendiente" | "aprobado" | "fallido" | "cancelado" | "reembolsado";
  paid_at: string | null;
  period_starts_at: string | null;
  period_ends_at: string | null;
  creado_en: string;
  buy_order: string | null;
  eliminado_en: string | null;
};

export type AdminOrganizationsSnapshot = {
  organizations: AdminOrganizationRow[];
  profiles: AdminOrganizationProfileRow[];
  users: AdminOrganizationUserRow[];
  payments: AdminOrganizationPaymentRow[];
};

export type AdminOrganizationSnapshot = {
  organization: AdminOrganizationRow;
  profile: AdminOrganizationProfileRow | null;
  users: AdminOrganizationUserRow[];
  payments: AdminOrganizationPaymentRow[];
};

export async function listAdminOrganizationsSnapshot(): Promise<AdminOrganizationsSnapshot> {
  const admin = createAdminClient();
  const { data: organizations, error: organizationsError } = await admin
    .from("organizations")
    .select(
      "id, nombre, correo, telefono, direccion, plan, creado_en, actualizado_en, eliminado_en"
    )
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false });

  if (organizationsError) {
    throw new Error(
      `No pudimos listar organizaciones: ${organizationsError.message}`
    );
  }

  const organizationRows = (organizations ?? []) as AdminOrganizationRow[];
  const organizationIds = organizationRows.map((row) => Number(row.id));

  if (organizationIds.length === 0) {
    return {
      organizations: [],
      profiles: [],
      users: [],
      payments: [],
    };
  }

  const [profilesResult, usersResult, paymentsResult] = await Promise.all([
    admin
      .from("organization_profile")
      .select(ADMIN_ORGANIZATION_PROFILE_SELECT)
      .in("organization_id", organizationIds),
    admin
      .from("users")
      .select(
        "id, organization_id, correo, rol, auth_user_id, creado_en, eliminado_en"
      )
      .in("organization_id", organizationIds)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: true }),
    admin
      .from("pagos_suscripcion")
      .select(
        "id, organization_id, plan_code, billing_period, amount_clp, currency, payment_provider, provider_status, status, paid_at, period_starts_at, period_ends_at, creado_en, buy_order, eliminado_en"
      )
      .in("organization_id", organizationIds)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: false }),
  ]);

  if (profilesResult.error) {
    throw new Error(
      `No pudimos listar perfiles de organizaciones: ${profilesResult.error.message}`
    );
  }

  if (usersResult.error) {
    throw new Error(
      `No pudimos listar usuarios de organizaciones: ${usersResult.error.message}`
    );
  }

  if (paymentsResult.error) {
    throw new Error(
      `No pudimos listar pagos de suscripcion: ${paymentsResult.error.message}`
    );
  }

  return {
    organizations: organizationRows,
    profiles: (profilesResult.data ?? []) as AdminOrganizationProfileRow[],
    users: (usersResult.data ?? []) as AdminOrganizationUserRow[],
    payments: (paymentsResult.data ?? []) as AdminOrganizationPaymentRow[],
  };
}

export async function getAdminOrganizationSnapshot(
  organizationId: number
): Promise<AdminOrganizationSnapshot | null> {
  const admin = createAdminClient();
  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select(
      "id, nombre, correo, telefono, direccion, plan, creado_en, actualizado_en, eliminado_en"
    )
    .eq("id", organizationId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (organizationError) {
    throw new Error(
      `No pudimos leer organizacion ${organizationId}: ${organizationError.message}`
    );
  }

  if (!organization) {
    return null;
  }

  const [profileResult, usersResult, paymentsResult] = await Promise.all([
    admin
      .from("organization_profile")
      .select(ADMIN_ORGANIZATION_PROFILE_SELECT)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("users")
      .select(
        "id, organization_id, correo, rol, auth_user_id, creado_en, eliminado_en"
      )
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: true }),
    admin
      .from("pagos_suscripcion")
      .select(
        "id, organization_id, plan_code, billing_period, amount_clp, currency, payment_provider, provider_status, status, paid_at, period_starts_at, period_ends_at, creado_en, buy_order, eliminado_en"
      )
      .eq("organization_id", organizationId)
      .is("eliminado_en", null)
      .order("creado_en", { ascending: false }),
  ]);

  if (profileResult.error) {
    throw new Error(
      `No pudimos leer perfil de organizacion ${organizationId}: ${profileResult.error.message}`
    );
  }

  if (usersResult.error) {
    throw new Error(
      `No pudimos leer usuarios de organizacion ${organizationId}: ${usersResult.error.message}`
    );
  }

  if (paymentsResult.error) {
    throw new Error(
      `No pudimos leer pagos de organizacion ${organizationId}: ${paymentsResult.error.message}`
    );
  }

  return {
    organization: organization as AdminOrganizationRow,
    profile: (profileResult.data as AdminOrganizationProfileRow | null) ?? null,
    users: (usersResult.data ?? []) as AdminOrganizationUserRow[],
    payments: (paymentsResult.data ?? []) as AdminOrganizationPaymentRow[],
  };
}
