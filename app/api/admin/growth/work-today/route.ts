import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import { buildWorkToday } from "@/features/growth/services/growth-work-today.service";

export async function GET() {
  try {
    const context = await resolveGrowthRouteContext();
    const workToday = await buildWorkToday(context);
    return NextResponse.json({ workToday });
  } catch (error) {
    return growthApiError(error, "No pudimos cargar el trabajo de hoy.");
  }
}
