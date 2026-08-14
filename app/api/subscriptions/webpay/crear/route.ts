import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Webpay no es una pasarela activa en Ventora. Usa Mercado Pago." },
    { status: 410 }
  );
}
