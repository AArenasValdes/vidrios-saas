import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import {
  assertSubscriptionAllowsRequestManagement,
  resolveAuthenticatedSubscriptionRouteContext,
} from "@/features/subscriptions/services/subscription-route-access.service";

export default async function PaginaVentaLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    const context = await resolveAuthenticatedSubscriptionRouteContext({
      requireOrganization: true,
    });

    assertSubscriptionAllowsRequestManagement({
      subscription: context.subscription,
    });
  } catch (error) {
    if (error instanceof AuthRouteAccessError && error.status === 401) {
      redirect("/login?next=%2Fconfiguracion%2Fpagina-venta");
    }

    if (error instanceof AuthRouteAccessError && error.status === 403) {
      redirect("/cuenta/suscripcion?feature=pagina-venta");
    }

    throw error;
  }

  return children;
}
