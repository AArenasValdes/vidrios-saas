import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { OrganizacionId } from "@/features/auth/types/auth";
import { TRIAL_DURATION_DAYS } from "@/features/subscriptions/services/subscription-status.service";

export class AuthOAuthCompletionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "invalid_input"
      | "identity_conflict"
      | "email_taken"
      | "unauthenticated"
      | "provision_failed" = "provision_failed"
  ) {
    super(message);
    this.name = "AuthOAuthCompletionError";
  }
}

export type OAuthIdentityResolution =
  | {
      status: "linked";
      organizationId: OrganizacionId;
      userId: number;
      syncedAuthUserId: boolean;
    }
  | {
      status: "needs_signup";
    }
  | {
      status: "identity_conflict";
    };

export type ProvisionOAuthOrganizationResult = {
  organizationId: number;
  userId: number;
  email: string;
  empresaNombre: string;
  trialEndsAt: string | null;
  alreadyProvisioned: boolean;
};

type PublicUserRow = {
  id: number;
  correo: string | null;
  auth_user_id: string | null;
  organization_id: OrganizacionId | null;
  eliminado_en: string | null;
};

type OAuthTrialProfileRow = {
  plan_code?: string | null;
  trial_ends_at?: string | null;
};

const PUBLIC_USER_SELECT =
  "id, correo, auth_user_id, organization_id, eliminado_en";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeEmpresaNombre(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildOAuthTrialProfilePatch(now = new Date()) {
  const trialStartedAt = now.toISOString();
  const trialEndsAt = addDays(now, TRIAL_DURATION_DAYS).toISOString();

  return {
    subscription_status: "trial_active",
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt,
    plan_type: "trial",
    plan_code: "trial",
    billing_period: "none",
    payment_method: "none",
    founder_price_locked: false,
  };
}

async function ensureOAuthTrialProfile(input: {
  admin: SupabaseClient;
  organizationId: number;
}) {
  const { admin, organizationId } = input;
  const trialPatch = buildOAuthTrialProfilePatch();
  const { data, error } = await admin
    .from("organization_profile")
    .upsert(
      {
        organization_id: organizationId,
        ...trialPatch,
      },
      { onConflict: "organization_id" }
    )
    .select("plan_code, trial_ends_at")
    .single();

  if (error) {
    throw new AuthOAuthCompletionError(
      `No pudimos activar la prueba gratuita: ${error.message}`
    );
  }

  const profile = data as OAuthTrialProfileRow | null;

  if (profile?.plan_code !== "trial" || !profile.trial_ends_at) {
    throw new AuthOAuthCompletionError(
      "La organizacion no quedo con una prueba gratuita valida."
    );
  }

  return profile;
}

async function getPublicUserByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string
): Promise<PublicUserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select(PUBLIC_USER_SELECT)
    .eq("auth_user_id", authUserId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw new AuthOAuthCompletionError(
      `No pudimos validar tu acceso: ${error.message}`
    );
  }

  return (data as PublicUserRow | null) ?? null;
}

async function getPublicUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<PublicUserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select(PUBLIC_USER_SELECT)
    .ilike("correo", email)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw new AuthOAuthCompletionError(
      `No pudimos validar tu correo: ${error.message}`
    );
  }

  return (data as PublicUserRow | null) ?? null;
}

export async function resolveOAuthIdentity(
  input: {
    authUserId: string;
    email: string;
  },
  deps: { admin?: SupabaseClient } = {}
): Promise<OAuthIdentityResolution> {
  const authUserId = input.authUserId.trim();
  const email = normalizeEmail(input.email);

  if (!authUserId || !email) {
    throw new AuthOAuthCompletionError(
      "No pudimos validar tu sesion de Google.",
      "unauthenticated"
    );
  }

  const admin = deps.admin ?? createAdminClient();

  const linkedByAuthUserId = await getPublicUserByAuthUserId(admin, authUserId);

  if (linkedByAuthUserId?.organization_id != null) {
    return {
      status: "linked",
      organizationId: linkedByAuthUserId.organization_id,
      userId: Number(linkedByAuthUserId.id),
      syncedAuthUserId: false,
    };
  }

  const linkedByEmail = await getPublicUserByEmail(admin, email);

  if (!linkedByEmail) {
    return { status: "needs_signup" };
  }

  if (
    linkedByEmail.auth_user_id &&
    linkedByEmail.auth_user_id !== authUserId
  ) {
    return { status: "identity_conflict" };
  }

  if (!linkedByEmail.auth_user_id) {
    const { error: syncError } = await admin
      .from("users")
      .update({ auth_user_id: authUserId })
      .eq("id", linkedByEmail.id)
      .is("auth_user_id", null);

    if (syncError) {
      throw new AuthOAuthCompletionError(
        `No pudimos vincular tu acceso: ${syncError.message}`
      );
    }

    if (linkedByEmail.organization_id == null) {
      return { status: "needs_signup" };
    }

    return {
      status: "linked",
      organizationId: linkedByEmail.organization_id,
      userId: Number(linkedByEmail.id),
      syncedAuthUserId: true,
    };
  }

  if (linkedByEmail.organization_id == null) {
    return { status: "needs_signup" };
  }

  return {
    status: "linked",
    organizationId: linkedByEmail.organization_id,
    userId: Number(linkedByEmail.id),
    syncedAuthUserId: false,
  };
}

export async function provisionOrganizationFromOAuthUser(
  input: {
    authUserId: string;
    email: string;
    empresaNombre: string;
  },
  deps: { admin?: SupabaseClient } = {}
): Promise<ProvisionOAuthOrganizationResult> {
  const authUserId = input.authUserId.trim();
  const email = normalizeEmail(input.email);
  const empresaNombre = normalizeEmpresaNombre(input.empresaNombre ?? "");

  if (!authUserId || !email) {
    throw new AuthOAuthCompletionError(
      "No pudimos validar tu sesion.",
      "unauthenticated"
    );
  }

  if (empresaNombre.length < 2) {
    throw new AuthOAuthCompletionError(
      "Ingresa el nombre de la empresa.",
      "invalid_input"
    );
  }

  const admin = deps.admin ?? createAdminClient();

  const existingByAuthUserId = await getPublicUserByAuthUserId(admin, authUserId);

  if (existingByAuthUserId?.organization_id != null) {
    const { data: profile } = await admin
      .from("organization_profile")
      .select("trial_ends_at")
      .eq("organization_id", existingByAuthUserId.organization_id)
      .maybeSingle();

    return {
      organizationId: Number(existingByAuthUserId.organization_id),
      userId: Number(existingByAuthUserId.id),
      email,
      empresaNombre,
      trialEndsAt: profile?.trial_ends_at ?? null,
      alreadyProvisioned: true,
    };
  }

  const existingByEmail = await getPublicUserByEmail(admin, email);

  if (existingByEmail) {
    if (
      existingByEmail.auth_user_id &&
      existingByEmail.auth_user_id !== authUserId
    ) {
      throw new AuthOAuthCompletionError(
        "Este correo ya esta vinculado a otra cuenta de acceso.",
        "identity_conflict"
      );
    }

    throw new AuthOAuthCompletionError(
      "Ya existe una cuenta con ese correo.",
      "email_taken"
    );
  }

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .insert({
      nombre: empresaNombre,
      correo: email,
    })
    .select("id")
    .single();

  if (organizationError || !organization) {
    throw new AuthOAuthCompletionError(
      `No pudimos crear la organizacion: ${organizationError?.message ?? "sin respuesta"}`
    );
  }

  const organizationId = Number(organization.id);

  try {
    const { data: publicUser, error: publicUserError } = await admin
      .from("users")
      .insert({
        correo: email,
        organization_id: organizationId,
        rol: "admin",
        auth_user_id: authUserId,
      })
      .select("id")
      .single();

    if (publicUserError || !publicUser) {
      throw new AuthOAuthCompletionError(
        `No pudimos vincular el usuario interno: ${publicUserError?.message ?? "sin respuesta"}`
      );
    }

    const profile = await ensureOAuthTrialProfile({
      admin,
      organizationId,
    });

    return {
      organizationId,
      userId: Number(publicUser.id),
      email,
      empresaNombre,
      trialEndsAt: profile?.trial_ends_at ?? null,
      alreadyProvisioned: false,
    };
  } catch (error) {
    await admin.from("organizations").delete().eq("id", organizationId);

    if (error instanceof AuthOAuthCompletionError) {
      throw error;
    }

    throw new AuthOAuthCompletionError(
      error instanceof Error ? error.message : "No pudimos crear la cuenta."
    );
  }
}
