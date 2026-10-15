import { NextResponse } from "next/server";

import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import {
  linkExistingMercadoPagoSubscription,
  MercadoPagoSubscriptionLinkError,
} from "@/features/subscriptions/services/mercadopago-external-subscription-link.service";
import {
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

type LinkMercadoPagoBody = {
  organizationId?: number;
  providerSubscriptionId?: string;
};

export async function POST(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const body = await parseJsonObjectBody<LinkMercadoPagoBody & Record<string, unknown>>(request);
    const result = await linkExistingMercadoPagoSubscription({
      organizationId: Number(body?.organizationId),
      providerSubscriptionId: body?.providerSubscriptionId ?? "",
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 });
    }

    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof MercadoPagoSubscriptionLinkError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Fallo la vinculacion de una suscripcion Mercado Pago.", error);
    return NextResponse.json({ error: "No pudimos vincular la suscripcion." }, { status: 500 });
  }
}
