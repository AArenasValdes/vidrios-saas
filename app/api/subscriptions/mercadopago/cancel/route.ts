import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  cancelMercadoPagoChileSubscription,
  MercadoPagoLifecycleError,
} from "@/features/subscriptions/services/mercadopago-lifecycle.service";

export const dynamic = "force-dynamic";

export async function POST() {
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

    const result = await cancelMercadoPagoChileSubscription({ organizationId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof MercadoPagoLifecycleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[mercadopago:cancel]", error);
    return NextResponse.json(
      { error: "No pudimos cancelar la renovacion con Mercado Pago." },
      { status: 500 }
    );
  }
}
