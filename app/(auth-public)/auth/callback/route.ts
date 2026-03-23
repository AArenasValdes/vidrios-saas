import { authServerService } from "@/services/auth-server.service";
import { NextResponse } from "next/server";

// Este archivo maneja el redirect de OAuth (Google, Apple)
// cuando el usuario vuelve desde el proveedor externo
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    try {
      await authServerService.exchangeCodeForSession(code);
      return NextResponse.redirect(`${origin}/dashboard`);
    } catch {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }
  }

  // Si algo falla, volver al login con error
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}


