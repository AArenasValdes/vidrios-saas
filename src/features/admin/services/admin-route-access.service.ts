import "server-only";

import { canAccessVentoraAdminPanel } from "@/features/admin/services/admin-access.service";
import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";

export async function resolveVentoraAdminRouteContext() {
  const context = await resolveAuthenticatedRouteContext({
    requireOrganization: false,
  });

  if (
    !canAccessVentoraAdminPanel({
      email: context.user.email,
      rol: context.profile.rol,
    })
  ) {
    throw new AuthRouteAccessError(403, "No tienes acceso a esta seccion.");
  }

  return context;
}
