import { redirect } from "next/navigation";

import {
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { canAccessGrowthPanel } from "@/features/growth/services/growth-access.service";
import { GrowthPageClient } from "./page-client";

export default async function GrowthDashboardPage() {
  const context = await resolveAuthenticatedRouteContext();

  if (
    !canAccessGrowthPanel({
      email: context.user.email,
      rol: context.profile.rol,
    })
  ) {
    redirect("/dashboard");
  }

  return <GrowthPageClient />;
}
