import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { getPagosHistory } from "@/features/subscriptions/services/pagos-list.service";

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

    const pagos = await getPagosHistory(organizationId);

    return NextResponse.json({ pagos });
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
        : "Error interno al obtener historial de pagos.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
