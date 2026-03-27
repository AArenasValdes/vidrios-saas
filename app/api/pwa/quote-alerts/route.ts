import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { webPushNotificationsService } from "@/services/web-push-notifications.service";

export const dynamic = "force-dynamic";

async function resolveAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
      context: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("organization_id")
    .ilike("correo", user.email ?? "")
    .is("eliminado_en", null)
    .maybeSingle();

  if (profileError) {
    return {
      error: NextResponse.json(
        { error: "No pudimos validar tu empresa activa." },
        { status: 500 }
      ),
      context: null,
    };
  }

  if (!profile?.organization_id) {
    return {
      error: NextResponse.json(
        { error: "No encontramos tu organizacion activa." },
        { status: 403 }
      ),
      context: null,
    };
  }

  return {
    error: null,
    context: {
      organizationId: profile.organization_id,
    },
  };
}

export async function POST(request: Request) {
  const authState = await resolveAuthContext();

  if (authState.error || !authState.context) {
    return authState.error;
  }

  try {
    const body = (await request.json()) as {
      cotizacionId?: string;
      codigo?: string;
      clienteNombre?: string;
    };

    const cotizacionId = body.cotizacionId?.trim();
    const codigo = body.codigo?.trim();
    const clienteNombre = body.clienteNombre?.trim();

    if (!cotizacionId || !codigo || !clienteNombre) {
      return NextResponse.json(
        { error: "Faltan datos para enviar la alerta de cotizacion." },
        { status: 400 }
      );
    }

    const result = await webPushNotificationsService.sendQuoteSentPush({
      organizationId: authState.context.organizationId,
      cotizacionId,
      codigo,
      clienteNombre,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos enviar la alerta push de cotizacion enviada.",
      },
      { status: 500 }
    );
  }
}
