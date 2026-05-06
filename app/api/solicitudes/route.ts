import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  canAccessAllSolicitudes,
  canAccessSolicitudes,
} from "@/features/solicitudes/services/solicitudes-contacto-access";
import {
  SolicitudContactoValidationError,
  solicitudesContactoService,
} from "@/features/solicitudes/services/solicitudes-contacto.service";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const recentRequestsByIp = new Map<string, number[]>();

function resolveIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

function isRateLimited(ip: string | null) {
  const key = ip || "unknown";
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentRequests = (recentRequestsByIp.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    recentRequestsByIp.set(key, recentRequests);
    return true;
  }

  recentRequests.push(now);
  recentRequestsByIp.set(key, recentRequests);
  return false;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("users")
    .select("rol, organization_id")
    .ilike("correo", user.email ?? "")
    .is("eliminado_en", null)
    .maybeSingle();

  if (perfilError) {
    return NextResponse.json(
      { error: "No pudimos validar tus permisos." },
      { status: 500 }
    );
  }

  if (!perfil || !canAccessSolicitudes({ email: user.email, rol: perfil.rol })) {
    return NextResponse.json(
      { error: "No tienes permisos para revisar las solicitudes." },
      { status: 403 }
    );
  }

  try {
    const canReviewAll = canAccessAllSolicitudes(user.email);
    if (!canReviewAll && !perfil.organization_id) {
      return NextResponse.json(
        { error: "No pudimos identificar la organización activa." },
        { status: 403 }
      );
    }
    const solicitudes = await solicitudesContactoService.listSolicitudesByOrganizationId(
          perfil.organization_id
        );

    return NextResponse.json({ solicitudes });
  } catch {
    return NextResponse.json(
      { error: "No pudimos cargar las solicitudes." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("users")
    .select("rol, organization_id")
    .ilike("correo", user.email ?? "")
    .is("eliminado_en", null)
    .maybeSingle();

  if (perfilError) {
    return NextResponse.json(
      { error: "No pudimos validar tus permisos." },
      { status: 500 }
    );
  }

  if (!perfil || !canAccessSolicitudes({ email: user.email, rol: perfil.rol })) {
    return NextResponse.json(
      { error: "No tienes permisos para actualizar solicitudes." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      estado?: "nueva" | "contactada" | "cerrada" | "descartada";
    };

    const canReviewAll = canAccessAllSolicitudes(user.email);

    if (!canReviewAll && !perfil.organization_id) {
      return NextResponse.json(
        { error: "No pudimos identificar la organización activa." },
        { status: 403 }
      );
    }

    const solicitud = await solicitudesContactoService.updateSolicitudStatus({
      id: body.id ?? "",
      estado: body.estado ?? "nueva",
      organizationId: canReviewAll ? undefined : perfil.organization_id,
    });

    return NextResponse.json({ solicitud });
  } catch (error) {
    if (error instanceof SolicitudContactoValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "No pudimos actualizar la solicitud." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ip = resolveIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Recibimos demasiadas solicitudes. Intenta nuevamente en unos minutos." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      nombre?: string;
      empresa?: string;
      correo?: string;
      telefono?: string;
      ayuda?: "demo" | "cotizacion" | "ventas";
    };

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

    return NextResponse.json(
      { error: "No pudimos registrar tu solicitud. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
