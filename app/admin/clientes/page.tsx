import { redirect } from "next/navigation";

import { canAccessVentoraAdminPanel } from "@/features/admin/services/admin-access.service";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { AdminClientesPageClient } from "./page-client";

export default async function AdminClientesPage() {
  const context = await resolveAuthenticatedRouteContext({
    requireOrganization: false,
  });

  if (
    !canAccessVentoraAdminPanel({
      email: context.user.email,
      rol: context.profile.rol,
    })
  ) {
    redirect("/dashboard");
  }

  return <AdminClientesPageClient />;
}
