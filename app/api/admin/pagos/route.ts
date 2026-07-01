import { NextResponse } from "next/server";

import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { getAdminPaymentsWorkspace } from "@/features/admin/services/admin-payments.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

export async function GET(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const url = new URL(request.url);
    const periodDays = Number(url.searchParams.get("periodDays") ?? "30");

    const workspace = await getAdminPaymentsWorkspace(
      Number.isInteger(periodDays) && periodDays > 0 ? periodDays : 30
    );

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Fallo la carga admin pagos.", error);
    return NextResponse.json({ error: "No pudimos cargar pagos y planes." }, { status: 500 });
  }
}
