import "server-only";

import { createClient } from "@/lib/supabase/server";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";
import type { OrganizacionId, UserRole } from "@/features/auth/types/auth";

type RouteProfileRow = {
  rol: UserRole | null;
  organization_id: OrganizacionId | null;
};

type ResolveAuthenticatedRouteContextOptions = {
  requireOrganization?: boolean;
  messages?: {
    unauthorized?: string;
    profileError?: string;
    organizationMissing?: string;
  };
};

export class AuthRouteAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthRouteAccessError";
    this.status = status;
  }
}

export async function resolveAuthenticatedRouteContext(
  options: ResolveAuthenticatedRouteContextOptions = {}
) {
  const requireOrganization = options.requireOrganization ?? true;
  const messages = {
    unauthorized: "No autorizado.",
    profileError: "No pudimos validar la organizacion activa.",
    organizationMissing: "No pudimos identificar la organizacion activa.",
    ...options.messages,
  };
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthRouteAccessError(401, messages.unauthorized);
  }

  let profile: RouteProfileRow | null = null;

  try {
    profile = (await findActiveUserProfile(supabase, {
      authUserId: user.id,
      email: user.email,
    })) as RouteProfileRow | null;
  } catch {
    throw new AuthRouteAccessError(500, messages.profileError);
  }

  const normalizedProfile = (profile as RouteProfileRow | null) ?? null;

  if (requireOrganization && !normalizedProfile?.organization_id) {
    throw new AuthRouteAccessError(403, messages.organizationMissing);
  }

  return {
    user,
    profile: {
      rol: normalizedProfile?.rol ?? null,
      organizationId: normalizedProfile?.organization_id ?? null,
    },
  };
}
