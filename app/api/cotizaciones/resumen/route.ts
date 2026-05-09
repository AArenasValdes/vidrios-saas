import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
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
      organizationId as string | number
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
