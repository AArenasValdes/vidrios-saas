import { NextResponse } from "next/server";

import { getAdminTareasWorkspace } from "@/features/admin/services/admin-tareas.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";

export async function GET() {
  try {
    await resolveVentoraAdminRouteContext();
    const workspace = await getAdminTareasWorkspace();
    return NextResponse.json({ workspace });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos cargar las tareas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
