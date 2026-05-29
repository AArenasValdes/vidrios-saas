import { NextResponse } from "next/server";

import { webpaySuscripcionService } from "@/features/subscriptions/services/webpay-suscripcion.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenWs = searchParams.get("token_ws");

    if (!tokenWs) {
      return NextResponse.redirect(
        new URL("/cuenta-vencida?pago_fallido=1", request.url)
      );
    }

    const result = await webpaySuscripcionService.confirmarPago(tokenWs);

    return NextResponse.redirect(
      new URL(result.redirect, request.url)
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al confirmar pago Webpay.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
