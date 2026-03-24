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
    .select("organization_id, rol")
    .eq("correo", user.email ?? "")
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
      authUserId: user.id,
      userEmail: user.email ?? null,
      userAgent: null as string | null,
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
      subscription?: PushSubscriptionJSON;
    };

    if (!body.subscription) {
      return NextResponse.json(
        { error: "Falta la suscripcion push del dispositivo." },
        { status: 400 }
      );
    }

    const saved = await webPushNotificationsService.registerSubscription(
      body.subscription,
      {
        ...authState.context,
        userAgent: request.headers.get("user-agent"),
      }
    );

    return NextResponse.json({
      subscription: {
        endpoint: saved.endpoint,
        isActive: saved.isActive,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos activar las notificaciones push.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authState = await resolveAuthContext();

  if (authState.error || !authState.context) {
    return authState.error;
  }

  try {
    const body = (await request.json()) as {
      endpoint?: string;
    };

    if (!body.endpoint?.trim()) {
      return NextResponse.json(
        { error: "Falta el endpoint de la suscripcion." },
        { status: 400 }
      );
    }

    await webPushNotificationsService.unregisterSubscription(
      body.endpoint,
      authState.context.organizationId
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos desactivar las notificaciones push.",
      },
      { status: 500 }
    );
  }
}
