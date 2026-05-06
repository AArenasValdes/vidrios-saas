import { NextResponse } from "next/server";

import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createClientesRepository } from "@/features/clientes/repositories/clientes-repository";
import { createCotizacionesRepository } from "@/features/cotizaciones/repositories/cotizaciones-repository";
import { createCotizacionesAppService } from "@/features/cotizaciones/services/cotizaciones.service";
import { createProjectsRepository } from "@/features/projects/repositories/projects.repository";

export const dynamic = "force-dynamic";

function buildTiming(totalMs: number, authMs: number, profileMs: number, dataMs: number) {
  return [
    `cotizaciones-resumen;dur=${totalMs}`,
    `auth;dur=${authMs}`,
    `profile;dur=${profileMs}`,
    `data;dur=${dataMs}`,
  ].join(", ");
}

export async function GET() {
  const startedAt = performance.now();
  const supabase = await createServerSupabaseClient();
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
    const cotizacionesService = createCotizacionesAppService({
      clientesRepository: createClientesRepository({
        clientFactory: supabase as never,
      }),
      projectsRepository: createProjectsRepository({
        clientFactory: supabase as never,
      }),
      cotizacionesRepository: createCotizacionesRepository({
        clientFactory: supabase as never,
      }),
    });
    const cotizaciones = await cotizacionesService.listWorkflowSummaryByOrganizationId(
      perfil.organization_id
    );
    const dataReadyAt = performance.now();
    const totalMs = Math.round(dataReadyAt - startedAt);
    const authMs = Math.round(authReadyAt - startedAt);
    const profileMs = Math.round(profileReadyAt - authReadyAt);
    const dataMs = Math.round(dataReadyAt - profileReadyAt);

    return NextResponse.json(
      { cotizaciones },
      {
        headers: {
          "Server-Timing": buildTiming(totalMs, authMs, profileMs, dataMs),
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos cargar las cotizaciones." },
      { status: 500 }
    );
  }
}
