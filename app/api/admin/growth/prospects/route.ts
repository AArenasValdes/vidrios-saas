import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import {
  createGrowthProspect,
  listGrowthProspects,
} from "@/features/growth/services/growth-prospects.service";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import type { CreateGrowthProspectInput } from "@/features/growth/types/growth-dashboard";

export async function GET(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const { searchParams } = new URL(request.url);
    const prospects = await listGrowthProspects(context, {
      estado: searchParams.get("estado") ?? undefined,
      fuente: searchParams.get("fuente") ?? undefined,
      segmento: searchParams.get("segmento") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ prospects });
  } catch (error) {
    return growthApiError(error, "No pudimos cargar los prospectos.");
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const body = (await request.json()) as CreateGrowthProspectInput;
    const prospect = await createGrowthProspect(context, body);
    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    return growthApiError(error, "No pudimos crear el prospecto.");
  }
}
