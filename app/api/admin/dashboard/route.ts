import { NextResponse } from "next/server";

import { getAdminDashboard } from "@/features/admin/services/admin-dashboard.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

export async function GET(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();

    void request;
    const dashboard = await getAdminDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Fallo el dashboard admin.", error);
    return NextResponse.json(
      { error: "No pudimos cargar el resumen admin." },
      { status: 500 }
    );
  }
}
