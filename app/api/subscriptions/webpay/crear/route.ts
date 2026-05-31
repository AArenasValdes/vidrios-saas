import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  isWebpayBillingPeriod,
  isWebpayPlanCode,
  webpaySuscripcionService,
} from "@/features/subscriptions/services/webpay-suscripcion.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

    let body: { plan_code?: string; billing_period?: string };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud invalido." },
        { status: 400 }
      );
    }

    const { plan_code, billing_period } = body;

    if (!plan_code || !isWebpayPlanCode(plan_code)) {
      return NextResponse.json(
        { error: "Plan no valido. Usa founder_full o quote_only." },
        { status: 400 }
      );
    }

    if (!billing_period || !isWebpayBillingPeriod(billing_period)) {
      return NextResponse.json(
        {
          error:
            "Periodo de facturacion no valido. Solo se soporta yearly.",
        },
        { status: 400 }
      );
    }

    const result = await webpaySuscripcionService.createTransaccion(
      organizationId,
      plan_code,
      billing_period
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (
      error instanceof Error &&
      error.message === "La cuenta ya tiene una suscripcion activa."
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error("[webpay:crear]", error);

    return NextResponse.json(
      { error: "No pudimos iniciar el pago en Webpay." },
      { status: 500 }
    );
  }
}
