import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { isMercadoPagoChilePlanCode } from "@/features/subscriptions/config/mercadopago-cl.config";
import {
  createMercadoPagoChileCheckout,
  MercadoPagoCheckoutError,
} from "@/features/subscriptions/services/mercadopago-checkout.service";

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
    const payerEmail = context.user.email;

    if (!organizationId || !payerEmail) {
      return NextResponse.json(
        { error: "No pudimos identificar tu empresa o correo." },
        { status: 400 }
      );
    }

    let body: { planCode?: unknown };

    try {
      body = (await request.json()) as { planCode?: unknown };
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud invalido." },
        { status: 400 }
      );
    }

    if (
      typeof body.planCode !== "string" ||
      !isMercadoPagoChilePlanCode(body.planCode)
    ) {
      return NextResponse.json(
        { error: "Plan no valido para Mercado Pago Chile." },
        { status: 400 }
      );
    }

    const result = await createMercadoPagoChileCheckout({
      organizationId,
      payerEmail,
      planCode: body.planCode,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof MercadoPagoCheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (
      error instanceof Error &&
      error.message === "La cuenta ya tiene una suscripcion activa."
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("[mercadopago:create]", error);
    return NextResponse.json(
      { error: "No pudimos iniciar la suscripcion con Mercado Pago." },
      { status: 500 }
    );
  }
}
