import { NextResponse } from "next/server";

import {
  AuthRouteAccessError
} from "@/features/auth/services/auth-route-access.service";
import {
  canAccessAllSolicitudes,
  canAccessSolicitudes,
} from "@/features/solicitudes/services/solicitudes-contacto-access";
import {
  SolicitudContactoValidationError,
  solicitudesContactoService,
} from "@/features/solicitudes/services/solicitudes-contacto.service";
import {
  createSlidingWindowRateLimiter,
  parseJsonObjectBody,
  resolveRequestIp,
} from "@/features/solicitudes/services/solicitudes-public-http.service";
import {
  assertAuthenticatedRouteAllowsWrite,
  resolveAuthenticatedSubscriptionRouteContext,
} from "@/features/subscriptions/services/subscription-route-access.service";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const leadRequestRateLimiter = createSlidingWindowRateLimiter({
  namespace: "api:solicitudes:landing-request",
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: RATE_LIMIT_MAX_REQUESTS,
});

async function resolveSolicitudesAccess() {
  const context = await resolveAuthenticatedSubscriptionRouteContext({
    requireOrganization: false,
  });

  if (!canAccessSolicitudes({ email: context.user.email, rol: context.profile.rol })) {
    throw new AuthRouteAccessError(
      403,
      "No tienes permisos para revisar las solicitudes."
    );
  }

  return {
    userEmail: context.user.email,
    organizationId: context.profile.organizationId,
    subscription: context.subscription,
    canReviewAll:
      canAccessAllSolicitudes(context.user.email) &&
      (context.profile.organizationId === null ||
        context.profile.organizationId === undefined),
  };
}

async function parsePatchBody(request: Request) {
  return parseJsonObjectBody<{
    id?: string;
    estado?: "nueva" | "contactada" | "cerrada" | "descartada";
  }>(request);
}

async function parseDeleteBody(request: Request) {
  return parseJsonObjectBody<{
    ids?: string[];
  }>(request);
}

async function parseLeadRequestBody(request: Request) {
  return parseJsonObjectBody<{
    nombre?: string;
    empresa?: string;
    correo?: string;
    telefono?: string;
    ayuda?: "demo" | "cotizacion" | "ventas";
  }>(request);
}

export async function GET() {
  try {
    const access = await resolveSolicitudesAccess();

    if (!access.canReviewAll && !access.organizationId) {
      return NextResponse.json(
        { error: "No pudimos identificar la organizacion activa." },
        { status: 403 }
      );
    }

    const solicitudes = access.canReviewAll
      ? await solicitudesContactoService.listSolicitudes()
      : await solicitudesContactoService.listSolicitudesByOrganizationId(
          access.organizationId as string | number
        );

    return NextResponse.json({ solicitudes });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[API] /api/solicitudes GET", error);
    return NextResponse.json(
      { error: "No pudimos cargar las solicitudes." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await resolveSolicitudesAccess();
    const body = await parsePatchBody(request);

    if (!body) {
      return NextResponse.json(
        { error: "La solicitud no tiene un formato valido." },
        { status: 400 }
      );
    }

    if (!access.organizationId) {
      return NextResponse.json(
        { error: "No pudimos identificar la organizacion activa." },
        { status: 403 }
      );
    }

    assertAuthenticatedRouteAllowsWrite({
      subscription: access.subscription,
    });
    const solicitud = await solicitudesContactoService.updateSolicitudStatus({
      id: body.id ?? "",
      estado: body.estado ?? "nueva",
      organizationId: access.organizationId,
    });

    return NextResponse.json({ solicitud });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      const message =
        error.message === "No tienes permisos para revisar las solicitudes."
          ? "No tienes permisos para actualizar solicitudes."
          : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    if (error instanceof SolicitudContactoValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[API] /api/solicitudes PATCH", error);
    return NextResponse.json(
      { error: "No pudimos actualizar la solicitud." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await resolveSolicitudesAccess();
    const body = await parseDeleteBody(request);

    if (!body) {
      return NextResponse.json(
        { error: "La solicitud no tiene un formato valido." },
        { status: 400 }
      );
    }

    if (!access.organizationId) {
      return NextResponse.json(
        { error: "No pudimos identificar la organizacion activa." },
        { status: 403 }
      );
    }

    assertAuthenticatedRouteAllowsWrite({
      subscription: access.subscription,
    });
    const deletedCount = await solicitudesContactoService.deleteSolicitudes({
      ids: Array.isArray(body.ids) ? body.ids : [],
      organizationId: access.organizationId,
    });

    return NextResponse.json({ deletedCount });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      const message =
        error.message === "No tienes permisos para revisar las solicitudes."
          ? "No tienes permisos para eliminar solicitudes."
          : error.message;

      return NextResponse.json({ error: message }, { status: error.status });
    }

    if (error instanceof SolicitudContactoValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[API] /api/solicitudes DELETE", error);
    return NextResponse.json(
      { error: "No pudimos eliminar las solicitudes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ip = resolveRequestIp(request);

  if (await leadRequestRateLimiter.isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Recibimos demasiadas solicitudes. Intenta nuevamente en unos minutos." },
      { status: 429 }
    );
  }

  try {
    const body = await parseLeadRequestBody(request);

    if (!body) {
      return NextResponse.json(
        { error: "La solicitud no tiene un formato valido." },
        { status: 400 }
      );
    }

    const solicitud = await solicitudesContactoService.createSolicitud({
      nombre: body.nombre ?? "",
      empresa: body.empresa ?? "",
      correo: body.correo ?? "",
      telefono: body.telefono ?? "",
      ayuda: body.ayuda ?? "demo",
      origen: "landing",
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ solicitud }, { status: 201 });
  } catch (error) {
    if (error instanceof SolicitudContactoValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[API] /api/solicitudes POST", error);
    return NextResponse.json(
      { error: "No pudimos registrar tu solicitud. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
