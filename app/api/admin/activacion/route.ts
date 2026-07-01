import { NextResponse } from "next/server";

import { getAdminActivacionWorkspace } from "@/features/admin/services/admin-activacion.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

export async function GET() {
  try {
    await resolveVentoraAdminRouteContext();
    const workspace = await getAdminActivacionWorkspace();
    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Fallo la carga admin activacion.", error);
    return NextResponse.json({ error: "No pudimos cargar activación." }, { status: 500 });
  }
}
