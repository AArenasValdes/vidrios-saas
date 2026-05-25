import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createClientesRepository } from "@/features/clientes/repositories/clientes-repository";
import { createCotizacionesRepository } from "@/features/cotizaciones/repositories/cotizaciones-repository";
import { createProjectsRepository } from "@/features/projects/repositories/projects.repository";
import { createClientesService } from "@/features/clientes/services/clientes.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();
  const supabase = await createServerSupabaseClient();
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

    console.error("[API] /api/clientes/resumen auth", error);
    return NextResponse.json(
      { error: "No pudimos validar la organizacion activa." },
      { status: 500 }
    );
  }

  try {
    const profileReadyAt = performance.now();
    const clientesService = createClientesService({
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
    const clientes = await clientesService.listResumenByOrganizationId(
      organizationId as string | number
    );
    const dataReadyAt = performance.now();
    const totalMs = Math.round(dataReadyAt - startedAt);
    const authMs = Math.round(authReadyAt - startedAt);
    const profileMs = Math.round(profileReadyAt - authReadyAt);
    const dataMs = Math.round(dataReadyAt - profileReadyAt);

    return NextResponse.json(
      { clientes },
      {
        headers: {
          "Server-Timing": `clientes-resumen;dur=${totalMs}, auth;dur=${authMs}, profile;dur=${profileMs}, data;dur=${dataMs}`,
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("[API] /api/clientes/resumen data", error);
    return NextResponse.json(
      { error: "No pudimos cargar los clientes." },
      { status: 500 }
    );
  }
}
