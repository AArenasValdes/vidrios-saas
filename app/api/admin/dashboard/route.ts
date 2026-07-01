import { NextResponse } from "next/server";

import { getAdminDashboard } from "@/features/admin/services/admin-dashboard.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

export async function GET(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();

    const url = new URL(request.url);
    const periodDays = Number(url.searchParams.get("days") ?? "30");
    const safePeriodDays =
      Number.isFinite(periodDays) && periodDays > 0 && periodDays <= 365
        ? periodDays
        : 30;

    const dashboard = await getAdminDashboard(safePeriodDays);
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
