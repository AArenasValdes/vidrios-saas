import "server-only";

import type { OrganizacionId, UserRole } from "@/features/auth/types/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

type ActiveUserProfileRow = {
  auth_user_id: string | null;
  organization_id: OrganizacionId | null;
  rol: UserRole | null;
};

type ActiveUserIdentity = {
  authUserId?: string | null;
  email?: string | null;
};

const ACTIVE_USER_PROFILE_SELECT = "auth_user_id, organization_id, rol";

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase() ?? "";

  return normalized.length > 0 ? normalized : null;
}

async function getByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string
): Promise<ActiveUserProfileRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select(ACTIVE_USER_PROFILE_SELECT)
    .eq("auth_user_id", authUserId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ActiveUserProfileRow | null) ?? null;
}

async function getByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<ActiveUserProfileRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select(ACTIVE_USER_PROFILE_SELECT)
    .ilike("correo", email)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ActiveUserProfileRow | null) ?? null;
}

export async function findActiveUserProfile(
  supabase: SupabaseClient,
  identity: ActiveUserIdentity
): Promise<ActiveUserProfileRow | null> {
  if (identity.authUserId) {
    return getByAuthUserId(supabase, identity.authUserId);
  }

  const normalizedEmail = normalizeEmail(identity.email);

  if (!normalizedEmail) {
    return null;
  }

  return getByEmail(supabase, normalizedEmail);
}
