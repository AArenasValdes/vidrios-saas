import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function retiredResponse() {
  return NextResponse.json(
    { error: "Webpay no es una pasarela activa en Ventora." },
    { status: 410 }
  );
}

export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}
