import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { webPushNotificationsService } from "@/features/notificaciones/services/web-push-notifications.service";

export const dynamic = "force-dynamic";

async function parseJsonObjectBody<T extends Record<string, unknown>>(
  request: Request
): Promise<T | null> {
  try {
    const parsed = await request.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

async function resolveAuthContext() {
  try {
    const context = await resolveAuthenticatedRouteContext({
      messages: {
        profileError: "No pudimos validar tu empresa activa.",
        organizationMissing: "No encontramos tu organizacion activa.",
      },
    });

    return {
      error: null,
      context: {
        organizationId: context.profile.organizationId as string | number,
        authUserId: context.user.id,
        userEmail: context.user.email ?? null,
        userAgent: null as string | null,
      },
    };
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return {
        error: NextResponse.json({ error: error.message }, { status: error.status }),
        context: null,
      };
    }

    return {
      error: NextResponse.json(
        { error: "No pudimos validar tu empresa activa." },
        { status: 500 }
      ),
      context: null,
    };
  }
}

export async function POST(request: Request) {
  const authState = await resolveAuthContext();

  if (authState.error || !authState.context) {
    return authState.error;
  }

  try {
    const body = await parseJsonObjectBody<{
      subscription?: PushSubscriptionJSON;
    }>(request);

    if (!body?.subscription) {
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
    console.error("No pudimos registrar la suscripcion push.", error);

    return NextResponse.json(
      { error: "No pudimos activar las notificaciones push." },
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
    const body = await parseJsonObjectBody<{
      endpoint?: string;
    }>(request);

    if (!body?.endpoint?.trim()) {
      return NextResponse.json(
        { error: "Falta el endpoint de la suscripcion." },
        { status: 400 }
      );
    }

    await webPushNotificationsService.unregisterSubscription(
      body.endpoint,
      {
        organizationId: authState.context.organizationId,
        authUserId: authState.context.authUserId,
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("No pudimos desactivar la suscripcion push.", error);

    return NextResponse.json(
      { error: "No pudimos desactivar las notificaciones push." },
      { status: 500 }
    );
  }
}
