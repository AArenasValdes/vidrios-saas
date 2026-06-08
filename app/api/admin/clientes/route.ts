import { NextResponse } from "next/server";

import { listAdminClients } from "@/features/admin/services/admin-clients.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

export async function GET() {
  try {
    await resolveVentoraAdminRouteContext();
    const clients = await listAdminClients();
    return NextResponse.json({ clients });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Fallo el listado admin de clientes.", error);
    return NextResponse.json(
      { error: "No pudimos cargar los clientes." },
      { status: 500 }
    );
  }
}
