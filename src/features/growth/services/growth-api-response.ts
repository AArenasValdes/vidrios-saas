import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import { NextResponse } from "next/server";

export function growthApiError(error: unknown, fallback: string) {
  if (error instanceof AuthRouteAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
