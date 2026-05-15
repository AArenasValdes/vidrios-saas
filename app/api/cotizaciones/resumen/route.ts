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

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max = 50
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), 25);
  const estado = url.searchParams.get("estado");
  const clienteNombre = url.searchParams.get("cliente");
  const period = url.searchParams.get("period");
  const order = url.searchParams.get("order");
  const search = url.searchParams.get("search");
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
    const payload = await cotizacionesService.listWorkflowSummaryPageByOrganizationId(
      organizationId as string | number,
      {
        page,
        pageSize,
        estado: estado && estado !== "Todos" ? estado.toLowerCase() : null,
        clienteNombre: clienteNombre && clienteNombre !== "Todos" ? clienteNombre : null,
        period:
          period === "this_month" ||
          period === "last_month" ||
          period === "last_90_days"
            ? period
            : "all",
        order:
          order === "total_desc" || order === "codigo_desc" || order === "estado"
            ? order
            : "updated_desc",
        search: search?.trim() ?? null,
      }
    );
    const dataReadyAt = performance.now();
    const totalMs = Math.round(dataReadyAt - startedAt);
    const authMs = Math.round(authReadyAt - startedAt);
    const profileMs = Math.round(profileReadyAt - authReadyAt);
    const dataMs = Math.round(dataReadyAt - profileReadyAt);

    return NextResponse.json(
      payload,
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
