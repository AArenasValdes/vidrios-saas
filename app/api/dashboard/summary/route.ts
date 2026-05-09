import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { getDashboardSummaryByOrganizationId } from "@/features/dashboard/services/dashboard-summary-server.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();
  let authReadyAt = startedAt;
  let organizationId: string | number | null = null;

  try {
    const context = await resolveAuthenticatedRouteContext();
    authReadyAt = performance.now();
    organizationId = context.profile.organizationId;
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "No pudimos validar la organizacion activa." },
      { status: 500 }
    );
  }

  try {
    const profileReadyAt = performance.now();
    const summary = await getDashboardSummaryByOrganizationId(
      organizationId as string | number
    );
    const dataReadyAt = performance.now();
    const totalMs = Math.round(dataReadyAt - startedAt);
    const authMs = Math.round(authReadyAt - startedAt);
    const profileMs = Math.round(profileReadyAt - authReadyAt);
    const dataMs = Math.round(dataReadyAt - profileReadyAt);

    return NextResponse.json(
      { summary },
      {
        headers: {
          "Server-Timing": `dashboard-summary;dur=${totalMs}, auth;dur=${authMs}, profile;dur=${profileMs}, data;dur=${dataMs}`,
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos cargar el resumen del dashboard." },
      { status: 500 }
    );
  }
}
