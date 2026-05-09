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

export async function GET() {
  const startedAt = performance.now();
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

    const solicitudes = canReviewAll
      ? await solicitudesContactoService.listSolicitudesResumen()
      : await solicitudesContactoService.listSolicitudesResumenByOrganizationId(
          organizationId as string | number
        );
    const dataReadyAt = performance.now();
    const totalMs = Math.round(dataReadyAt - startedAt);
    const authMs = Math.round(authReadyAt - startedAt);
    const profileMs = Math.round(profileReadyAt - authReadyAt);
    const dataMs = Math.round(dataReadyAt - profileReadyAt);

    return NextResponse.json(
      { solicitudes },
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
