import "server-only";

import { insertActivity } from "@/features/growth/repositories/growth-activities.repository";
import { upsertProspectByLegacyId } from "@/features/growth/repositories/growth-prospects.repository";
import { insertTask } from "@/features/growth/repositories/growth-tasks.repository";
import { updateWorkspaceJson } from "@/features/growth/repositories/growth-workspace.repository";
import { mapLegacyV3ProspectToInsert } from "@/features/growth/services/growth-prospect-mapper";
import type { GrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import type { GrowthImportResult } from "@/features/growth/types/growth-supabase";
import type { GrowthWorkspace } from "@/features/growth/types/growth-dashboard";

export async function importLocalWorkspace(
  context: GrowthRouteContext,
  payload: GrowthWorkspace
): Promise<GrowthImportResult> {
  const result: GrowthImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  await updateWorkspaceJson(context.supabase, context.workspaceId, {
    configuracion_json: payload.settings as unknown as Record<string, unknown>,
    metricas_manuales_json: payload.manualMetrics as unknown as Record<
      string,
      unknown
    >,
    experimentos_json: payload.experimentos ?? [],
  });

  for (const prospect of payload.prospects) {
    if (prospect.dataStatus === "mock") {
      result.skipped += 1;
      continue;
    }

    try {
      const row = mapLegacyV3ProspectToInsert(
        context.workspaceId,
        prospect,
        context.user.id
      );
      const { inserted, row: saved } = await upsertProspectByLegacyId(
        context.supabase,
        row as unknown as Record<string, unknown>
      );

      if (inserted) {
        result.imported += 1;
      } else {
        result.updated += 1;
      }

      await insertActivity(context.supabase, {
        workspace_id: context.workspaceId,
        prospect_id: saved.id,
        tipo: "nota",
        contenido: "Importado desde localStorage v3",
        creado_por_auth_user_id: context.user.id,
        metadata_json: {
          source: "local-import",
          originalDataStatus: prospect.dataStatus,
          legacySourceId: prospect.id,
        },
      });
    } catch (error) {
      result.errors.push(
        `Prospecto ${prospect.empresa}: ${error instanceof Error ? error.message : "error"}`
      );
    }
  }

  for (const task of payload.marketingTasks) {
    if (task.dataStatus === "mock") {
      result.skipped += 1;
      continue;
    }

    try {
      await insertTask(context.supabase, {
        workspace_id: context.workspaceId,
        prospect_id: task.prospectId ?? null,
        titulo: task.campanaCanal,
        tipo: "otro",
        prioridad: "media",
        vence_en: task.fecha ? `${task.fecha}T12:00:00.000Z` : null,
        completada_en:
          task.estado === "cerrado" || task.estado === "publicado"
            ? new Date().toISOString()
            : null,
        metadata_json: {
          mensajeUsado: task.mensajeUsado,
          contenidoPendiente: task.contenidoPendiente,
          resultado: task.resultado,
          notas: task.notas,
          importedFrom: "local-marketing-task",
        },
        creado_por_auth_user_id: context.user.id,
      });
      result.imported += 1;
    } catch (error) {
      result.errors.push(
        `Tarea ${task.campanaCanal}: ${error instanceof Error ? error.message : "error"}`
      );
    }
  }

  return result;
}
