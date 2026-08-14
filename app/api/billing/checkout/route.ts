import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return NextResponse.json(
    {
      error:
        "Este endpoint de checkout fue retirado. Usa Mercado Pago en /api/subscriptions/mercadopago/create.",
    },
    { status: 410 }
  );
}
