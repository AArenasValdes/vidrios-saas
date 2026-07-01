import { NextResponse } from "next/server";

import { listActivitiesByProspect } from "@/features/growth/repositories/growth-activities.repository";
import { getProspectById } from "@/features/growth/repositories/growth-prospects.repository";
import { growthApiError } from "@/features/growth/services/growth-api-response";
import { getProspectKpis } from "@/features/growth/services/growth-kpi.service";
import { mapProspectRowToUi } from "@/features/growth/services/growth-prospect-mapper";
import {
  advanceGrowthProspect,
  deleteGrowthProspect,
  patchGrowthProspect,
} from "@/features/growth/services/growth-prospects.service";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import { loadGrowthWorkspace } from "@/features/growth/services/growth-workspace.service";
import type { UpdateGrowthProspectInput } from "@/features/growth/types/growth-dashboard";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const routeContext = await resolveGrowthRouteContext();
    const { id } = await context.params;
    const row = await getProspectById(
      routeContext.supabase,
      routeContext.workspaceId,
      id
    );

    if (!row) {
      return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
    }

    const activities = await listActivitiesByProspect(
      routeContext.supabase,
      routeContext.workspaceId,
      id
    );

    const kpis = row.converted_organization_id
      ? await getProspectKpis(row.converted_organization_id)
      : null;

    return NextResponse.json({
      prospect: mapProspectRowToUi(row),
      activities,
      kpis,
    });
  } catch (error) {
    return growthApiError(error, "No pudimos cargar el prospecto.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const routeContext = await resolveGrowthRouteContext();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateGrowthProspectInput & {
      action?: "advance";
    };

    if (body.action === "advance") {
      const prospect = await advanceGrowthProspect(routeContext, id);
      return NextResponse.json({ prospect });
    }

    const prospect = await patchGrowthProspect(routeContext, id, body);
    return NextResponse.json({ prospect });
  } catch (error) {
    return growthApiError(error, "No pudimos actualizar el prospecto.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const routeContext = await resolveGrowthRouteContext();
    const { id } = await context.params;
    const workspace = await deleteGrowthProspect(routeContext, id);
    return NextResponse.json({ workspace });
  } catch (error) {
    return growthApiError(error, "No pudimos eliminar el prospecto.");
  }
}
