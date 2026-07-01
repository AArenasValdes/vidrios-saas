import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import { importLocalWorkspace } from "@/features/growth/services/growth-import.service";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import { loadGrowthWorkspace } from "@/features/growth/services/growth-workspace.service";
import type { GrowthWorkspace } from "@/features/growth/types/growth-dashboard";

export async function POST(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const body = (await request.json()) as { workspace: GrowthWorkspace };
    const result = await importLocalWorkspace(context, body.workspace);
    const workspace = await loadGrowthWorkspace(context);
    return NextResponse.json({ result, workspace });
  } catch (error) {
    return growthApiError(error, "No pudimos importar el workspace local.");
  }
}
