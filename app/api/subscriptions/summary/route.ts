import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { getSubscriptionSummary } from "@/features/subscriptions/services/subscription-summary.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await resolveAuthenticatedRouteContext({
      messages: {
        profileError: "No pudimos validar tu empresa activa.",
        organizationMissing: "No encontramos tu organizacion activa.",
      },
    });

    const organizationId = Number(context.profile.organizationId);

    if (!organizationId) {
      return NextResponse.json(
        { error: "No encontramos tu organizacion activa." },
        { status: 400 }
      );
    }

    const summary = await getSubscriptionSummary(organizationId);

    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Error interno al obtener resumen de suscripcion.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
