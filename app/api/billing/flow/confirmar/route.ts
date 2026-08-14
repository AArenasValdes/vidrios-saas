import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function retiredResponse() {
  return NextResponse.json(
    { error: "Flow no es una pasarela activa en Ventora." },
    { status: 410 }
  );
}

export async function GET(request: Request) {
  return retiredResponse();
}

export async function POST(request: Request) {
  return retiredResponse();
}
