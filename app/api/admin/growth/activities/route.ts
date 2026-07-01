import { NextResponse } from "next/server";

import { listActivitiesByProspect, insertActivity } from "@/features/growth/repositories/growth-activities.repository";
import { growthApiError } from "@/features/growth/services/growth-api-response";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";

export async function GET(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const { searchParams } = new URL(request.url);
    const prospectId = searchParams.get("prospectId");

    if (!prospectId) {
      return NextResponse.json(
        { error: "prospectId es requerido." },
        { status: 400 }
      );
    }

    const activities = await listActivitiesByProspect(
      context.supabase,
      context.workspaceId,
      prospectId
    );
    return NextResponse.json({ activities });
  } catch (error) {
    return growthApiError(error, "No pudimos cargar las actividades.");
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const body = (await request.json()) as Record<string, unknown>;
    const activity = await insertActivity(context.supabase, {
      workspace_id: context.workspaceId,
      creado_por_auth_user_id: context.user.id,
      ...body,
    });
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    return growthApiError(error, "No pudimos registrar la actividad.");
  }
}
