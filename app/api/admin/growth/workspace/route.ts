import { NextResponse } from "next/server";

import { growthApiError } from "@/features/growth/services/growth-api-response";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import {
  loadGrowthWorkspace,
  patchGrowthManualMetrics,
  patchGrowthSettings,
} from "@/features/growth/services/growth-workspace.service";

export async function GET() {
  try {
    const context = await resolveGrowthRouteContext();
    const workspace = await loadGrowthWorkspace(context);
    return NextResponse.json({ workspace });
  } catch (error) {
    return growthApiError(error, "No pudimos cargar el workspace de growth.");
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await resolveGrowthRouteContext();
    const body = (await request.json()) as {
      settings?: Record<string, unknown>;
      manualMetrics?: Record<string, unknown>;
    };

    if (body.settings) {
      await patchGrowthSettings(context, body.settings);
    }

    if (body.manualMetrics) {
      await patchGrowthManualMetrics(context, body.manualMetrics);
    }

    const workspace = await loadGrowthWorkspace(context);
    return NextResponse.json({ workspace });
  } catch (error) {
    return growthApiError(error, "No pudimos actualizar el workspace.");
  }
}
