import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import { registerProspectContact } from "@/features/growth/services/growth-prospects.service";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const routeContext = await resolveGrowthRouteContext();
    const { id } = await context.params;
    const body = (await request.json()) as { canal?: string; contenido?: string };
    const prospect = await registerProspectContact(routeContext, id, body);
    return NextResponse.json({ prospect });
  } catch (error) {
    return growthApiError(error, "No pudimos registrar el contacto.");
  }
}
