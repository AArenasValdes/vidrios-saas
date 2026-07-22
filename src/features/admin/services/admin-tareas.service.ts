import "server-only";

import { listProspects } from "@/features/growth/repositories/growth-prospects.repository";
import { listTasks } from "@/features/growth/repositories/growth-tasks.repository";
import { resolveGrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import { buildActivacionAttentionRows } from "@/features/admin/services/admin-activacion-filters.service";
import { buildClientesAttentionRows } from "@/features/admin/services/admin-clientes-filters.service";
import { getAdminPaymentsWorkspace } from "@/features/admin/services/admin-payments.service";
import { listAdminClients } from "@/features/admin/services/admin-clients.service";
import {
  fetchPublicChannelSummaries,
  fetchPublicSolicitudesForOrganizations,
} from "@/features/admin/services/admin-public-channel.service";
import {
  buildCompletedEvents,
  buildOriginSummary,
  buildTodayPriorityTasks,
  buildUpcomingTaskGroups,
  dedupeAdminTasks,
  deriveActivacionTasks,
  deriveClientesTasks,
  deriveGrowthFollowupTasks,
  deriveManualTasks,
  derivePaymentTasks,
  deriveProspectTasks,
  derivePublicChannelActionTasks,
} from "@/features/admin/services/admin-tareas-derivation.service";
import { buildTareasKpis } from "@/features/admin/services/admin-tareas-filters.service";
import type { AdminTareasWorkspace } from "@/features/admin/types/admin-tareas";

export async function getAdminTareasWorkspace(): Promise<AdminTareasWorkspace> {
  const growthContext = await resolveGrowthRouteContext();
  const clients = await listAdminClients();
  const organizationIds = clients.map((client) => client.organizationId);

  const [paymentsWorkspace, prospects, growthTasks, publicSummaries, solicitudesByOrg] =
    await Promise.all([
      getAdminPaymentsWorkspace(),
      listProspects(growthContext.supabase, growthContext.workspaceId),
      listTasks(growthContext.supabase, growthContext.workspaceId),
      fetchPublicChannelSummaries(organizationIds),
      fetchPublicSolicitudesForOrganizations(organizationIds),
    ]);

  const candidates = dedupeAdminTasks([
    ...derivePaymentTasks(paymentsWorkspace.actionRows),
    ...deriveClientesTasks(buildClientesAttentionRows(clients), clients),
    ...deriveActivacionTasks(buildActivacionAttentionRows(clients)),
    ...deriveProspectTasks(prospects),
    ...deriveGrowthFollowupTasks(growthTasks),
    ...deriveManualTasks(growthTasks),
    ...derivePublicChannelActionTasks(clients, publicSummaries, solicitudesByOrg),
  ]);

  const tasks = candidates;
  const priorityToday = buildTodayPriorityTasks(tasks);

  return {
    syncedAt: new Date().toISOString(),
    tasks,
    priorityTodayIds: priorityToday.map((task) => task.id),
    kpis: buildTareasKpis(tasks),
    upcomingGroups: buildUpcomingTaskGroups(tasks),
    completedEvents: buildCompletedEvents(growthTasks),
    originSummary: buildOriginSummary(tasks),
  };
}
