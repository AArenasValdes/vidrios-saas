import "server-only";

import {
  getWorkspaceById,
  updateWorkspaceJson,
} from "@/features/growth/repositories/growth-workspace.repository";
import { listProspects } from "@/features/growth/repositories/growth-prospects.repository";
import { listTasks } from "@/features/growth/repositories/growth-tasks.repository";
import { buildWorkspaceFromRows } from "@/features/growth/services/growth-prospect-mapper";
import type { GrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import type {
  GrowthManualMetrics,
  GrowthSettings,
  GrowthWorkspace,
} from "@/features/growth/types/growth-dashboard";

export async function loadGrowthWorkspace(
  context: GrowthRouteContext
): Promise<GrowthWorkspace> {
  const [workspace, prospects, tasks] = await Promise.all([
    getWorkspaceById(context.supabase, context.workspaceId),
    listProspects(context.supabase, context.workspaceId),
    listTasks(context.supabase, context.workspaceId),
  ]);

  if (!workspace) {
    throw new Error("Workspace de growth no encontrado.");
  }

  return buildWorkspaceFromRows({ workspace, prospects, tasks });
}

export async function patchGrowthSettings(
  context: GrowthRouteContext,
  patch: Partial<GrowthSettings>
) {
  const current = await loadGrowthWorkspace(context);

  return updateWorkspaceJson(context.supabase, context.workspaceId, {
    configuracion_json: {
      ...current.settings,
      ...patch,
    } as unknown as Record<string, unknown>,
  });
}

export async function patchGrowthManualMetrics(
  context: GrowthRouteContext,
  patch: Partial<GrowthManualMetrics>
) {
  const current = await loadGrowthWorkspace(context);

  return updateWorkspaceJson(context.supabase, context.workspaceId, {
    metricas_manuales_json: {
      ...current.manualMetrics,
      ...patch,
      dataStatus: patch.dataStatus ?? "manual",
    } as unknown as Record<string, unknown>,
  });
}
