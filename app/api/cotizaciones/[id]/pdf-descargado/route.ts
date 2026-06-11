import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { createClientesRepository } from "@/features/clientes/repositories/clientes-repository";
import { createCotizacionesRepository } from "@/features/cotizaciones/repositories/cotizaciones-repository";
import { createCotizacionesAppService } from "@/features/cotizaciones/services/cotizaciones.service";
import { createProjectsRepository } from "@/features/projects/repositories/projects.repository";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  let organizationId: string | number | null = null;

  try {
    const authContext = await resolveAuthenticatedRouteContext();
    organizationId = authContext.profile.organizationId;
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[API] /api/cotizaciones/[id]/pdf-descargado auth", error);
    return NextResponse.json(
      { error: "No pudimos validar la organizacion activa." },
      { status: 500 }
    );
  }

  try {
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
    const record = await cotizacionesService.markWorkflowPdfDownloaded({
      id,
      organizationId: organizationId as string | number,
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error("[API] /api/cotizaciones/[id]/pdf-descargado data", error);
    return NextResponse.json(
      { error: "No pudimos registrar la descarga del PDF." },
      { status: 500 }
    );
  }
}
