import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { canAccessSolicitudes } from "@/services/solicitudes-contacto-access";
import {
  SolicitudContactoValidationError,
  solicitudesContactoService,
} from "@/services/solicitudes-contacto.service";

export const dynamic = "force-dynamic";

function resolveIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
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
    .select("rol")
    .eq("correo", user.email ?? "")
    .is("eliminado_en", null)
    .maybeSingle();

  if (perfilError) {
    return NextResponse.json(
      { error: "No pudimos validar tus permisos." },
      { status: 500 }
    );
  }

  if (
    !perfil ||
    !canAccessSolicitudes({
      email: user.email,
      rol: perfil.rol,
    })
  ) {
    return NextResponse.json(
      { error: "No tienes permisos para revisar las solicitudes." },
      { status: 403 }
    );
  }

  try {
    const solicitudes = await solicitudesContactoService.listSolicitudes();

    return NextResponse.json({ solicitudes });
  } catch {
    return NextResponse.json(
      { error: "No pudimos cargar las solicitudes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
      ip: resolveIp(request),
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
