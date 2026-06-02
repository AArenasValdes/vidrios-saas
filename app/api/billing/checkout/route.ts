import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { createBillingCheckout } from "@/features/billing/services/billing-checkout.service";
import {
  isBillingPlanCode,
  type BillingPlanCode,
} from "@/features/billing/types/plans";
import { isPaymentProviderCode } from "@/features/billing/services/payment-provider-registry";
import type { PaymentProvider } from "@/features/subscriptions/types/pago-suscripcion";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  planCode?: string;
  provider?: string;
};

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

    let body: CheckoutBody;

    try {
      body = (await request.json()) as CheckoutBody;
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud invalido." },
        { status: 400 }
      );
    }

    if (!body.planCode || !isBillingPlanCode(body.planCode)) {
      return NextResponse.json(
        { error: "Plan no valido para billing." },
        { status: 400 }
      );
    }

    if (!body.provider || !isPaymentProviderCode(body.provider)) {
      return NextResponse.json(
        { error: "Proveedor de pago no valido." },
        { status: 400 }
      );
    }

    const email = context.user.email;

    if (!email) {
      return NextResponse.json(
        { error: "Tu usuario no tiene correo para iniciar el pago." },
        { status: 400 }
      );
    }

    const result = await createBillingCheckout({
      organizationId,
      userEmail: email,
      planCode: body.planCode as BillingPlanCode,
      provider: body.provider as PaymentProvider,
    });

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
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (
      error instanceof Error &&
      (error.message === "Este plan se activa por WhatsApp en esta version." ||
        error.message === "Proveedor de pago no disponible para checkout automatico.")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[billing:checkout]", error);

    return NextResponse.json(
      { error: "No pudimos iniciar el pago." },
      { status: 500 }
    );
  }
}
