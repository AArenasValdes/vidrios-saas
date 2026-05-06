import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getDashboardSummaryByOrganizationId } from "@/features/dashboard/services/dashboard-summary-server.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authReadyAt = performance.now();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("users")
    .select("organization_id")
    .ilike("correo", user.email ?? "")
    .is("eliminado_en", null)
    .maybeSingle();

  if (perfilError) {
    return NextResponse.json(
      { error: "No pudimos validar la organizacion activa." },
      { status: 500 }
    );
  }

  if (!perfil?.organization_id) {
    return NextResponse.json(
      { error: "No pudimos identificar la organizacion activa." },
      { status: 403 }
    );
  }

  try {
    const profileReadyAt = performance.now();
    const summary = await getDashboardSummaryByOrganizationId(perfil.organization_id);
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
