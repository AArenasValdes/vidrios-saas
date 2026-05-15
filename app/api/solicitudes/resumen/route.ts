import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  canAccessAllSolicitudes,
  canAccessSolicitudes,
} from "@/features/solicitudes/services/solicitudes-contacto-access";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";

export const dynamic = "force-dynamic";

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
  const estadoParam = url.searchParams.get("estado");
  const search = url.searchParams.get("search")?.trim() ?? "";
  const estado =
    estadoParam && estadoParam !== "all"
      ? estadoParam
      : null;
  let authReadyAt = startedAt;
  let userEmail: string | null | undefined = null;
  let organizationId: string | number | null = null;
  let rol: string | null = null;

  try {
    const context = await resolveAuthenticatedRouteContext({
      requireOrganization: false,
      messages: {
        profileError: "No pudimos validar tus permisos.",
      },
    });
    authReadyAt = performance.now();
    userEmail = context.user.email;
    organizationId = context.profile.organizationId;
    rol = context.profile.rol;
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "No pudimos validar tus permisos." },
      { status: 500 }
    );
  }

  if (!canAccessSolicitudes({ email: userEmail, rol })) {
    return NextResponse.json(
      { error: "No tienes permisos para revisar las solicitudes." },
      { status: 403 }
    );
  }

  try {
    const profileReadyAt = performance.now();
    const canReviewAll = canAccessAllSolicitudes(userEmail);

    if (!canReviewAll && !organizationId) {
      return NextResponse.json(
        { error: "No pudimos identificar la organizacion activa." },
        { status: 403 }
      );
    }

    const summaryOptions = {
      page,
      pageSize,
      estado: estado as
        | "nueva"
        | "contactada"
        | "cerrada"
        | "descartada"
        | null,
      search: search || null,
    };
    const [payload, summary] = await Promise.all([
      canReviewAll
        ? solicitudesContactoService.listSolicitudesResumenPage(summaryOptions)
        : solicitudesContactoService.listSolicitudesResumenPageByOrganizationId(
            organizationId as string | number,
            summaryOptions
          ),
      canReviewAll
        ? solicitudesContactoService.getSolicitudesResumenGlobal()
        : solicitudesContactoService.getSolicitudesResumenGlobalByOrganizationId(
            organizationId as string | number
          ),
    ]);
    const dataReadyAt = performance.now();
    const totalMs = Math.round(dataReadyAt - startedAt);
    const authMs = Math.round(authReadyAt - startedAt);
    const profileMs = Math.round(profileReadyAt - authReadyAt);
    const dataMs = Math.round(dataReadyAt - profileReadyAt);

    return NextResponse.json(
      {
        ...payload,
        summary,
      },
      {
        headers: {
          "Server-Timing": `solicitudes-resumen;dur=${totalMs}, auth;dur=${authMs}, profile;dur=${profileMs}, data;dur=${dataMs}`,
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos cargar las solicitudes." },
      { status: 500 }
    );
  }
}
