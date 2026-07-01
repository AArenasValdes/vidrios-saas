import "server-only";

import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { getActiveMembership } from "@/features/growth/repositories/growth-workspace.repository";
import { ensureFounderMembership } from "@/features/growth/services/growth-membership.service";
import { canAccessFounderAdminPanel } from "@/features/admin/services/admin-access.service";
import {
  AuthRouteAccessError,
} from "@/features/auth/services/auth-route-access.service";
import { createClient } from "@/lib/supabase/server";

export type GrowthRouteContext = Awaited<
  ReturnType<typeof resolveVentoraAdminRouteContext>
> & {
  workspaceId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function resolveGrowthRouteContext(): Promise<GrowthRouteContext> {
  const adminContext = await resolveVentoraAdminRouteContext();
  const supabase = await createClient();

  let membership = await getActiveMembership(supabase, adminContext.user.id);

  if (
    !membership &&
    canAccessFounderAdminPanel({
      email: adminContext.user.email,
      rol: adminContext.profile.rol,
    })
  ) {
    membership = await ensureFounderMembership(supabase, adminContext.user.id);
  }

  if (!membership) {
    throw new AuthRouteAccessError(
      403,
      "No tienes acceso al workspace de growth."
    );
  }

  return {
    ...adminContext,
    workspaceId: membership.workspace_id,
    supabase,
  };
}
