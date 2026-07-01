import "server-only";

import { listProspects } from "@/features/growth/repositories/growth-prospects.repository";
import { listTasks } from "@/features/growth/repositories/growth-tasks.repository";
import {
  getOrganizationTrialSnapshot,
  hasApprovedPayment,
} from "@/features/growth/services/growth-kpi.service";
import type { GrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import type {
  GrowthPanelTab,
  GrowthTodayItem,
  GrowthWorkQueue,
} from "@/features/growth/types/growth-dashboard";

const TERMINAL = new Set(["pagado", "no_calza", "no_contactar"]);

export async function buildWorkToday(
  context: GrowthRouteContext
): Promise<GrowthTodayItem[]> {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const [prospects, tasks] = await Promise.all([
    listProspects(context.supabase, context.workspaceId),
    listTasks(context.supabase, context.workspaceId, { pendingOnly: true }),
  ]);

  const listosContactar = prospects.filter(
    (p) =>
      !p.no_contactar &&
      ["investigado", "listo_para_contactar", "nuevo"].includes(p.estado)
  );

  const followupsVencidos = tasks.filter(
    (t) =>
      t.tipo === "followup" &&
      t.vence_en &&
      new Date(t.vence_en).getTime() <= now.getTime()
  );

  const demosProximas = prospects.filter(
    (p) => p.estado === "demo_agendada" && p.proxima_accion_en
  );

  const linkedOrgIds = prospects
    .filter((p) => p.converted_organization_id)
    .map((p) => p.converted_organization_id as number);

  let trialsSinActivacion = 0;
  let trialsTerminanPronto = 0;
  let pagosPendientes = 0;
  const trialNames: string[] = [];
  const paymentNames: string[] = [];

  for (const orgId of linkedOrgIds) {
    const trial = await getOrganizationTrialSnapshot(orgId);
    const paid = await hasApprovedPayment(orgId);

    if (trial?.trial_started_at && !paid) {
      trialsSinActivacion += 1;
      trialNames.push(String(orgId));
    }

    if (
      trial?.trial_ends_at &&
      new Date(trial.trial_ends_at).getTime() <= new Date(in48h).getTime() &&
      !paid
    ) {
      trialsTerminanPronto += 1;
      paymentNames.push(String(orgId));
    }

    if (!paid && trial?.subscription_status === "vencido") {
      pagosPendientes += 1;
    }
  }

  const queues: Array<Omit<GrowthTodayItem, "count" | "names">> = [
    {
      id: "tareas_pendientes",
      title: "Listos para contactar",
      priorityLabel: "Alta",
      nextStep: "Empresas investigadas o nuevas sin contacto.",
      actionLabel: "Ver prospectos",
      targetTab: "prospectos" as GrowthPanelTab,
    },
    {
      id: "seguimientos_atrasados",
      title: "Follow-ups vencidos",
      priorityLabel: "Alta",
      nextStep: "Retomar conversaciones con fecha vencida.",
      actionLabel: "Ver follow-ups",
      targetTab: "marketing" as GrowthPanelTab,
    },
    {
      id: "demos_por_hacer",
      title: "Demos próximas",
      priorityLabel: "Media",
      nextStep: "Confirmar demos agendadas.",
      actionLabel: "Ver demos",
      targetTab: "prospectos" as GrowthPanelTab,
    },
    {
      id: "clientes_por_cobrar",
      title: "Trials sin activación",
      priorityLabel: "Media",
      nextStep: "Cuentas vinculadas sin cotización creada.",
      actionLabel: "Ver cuentas",
      targetTab: "clientes" as GrowthPanelTab,
    },
    {
      id: "cuentas_por_configurar",
      title: "Pagos / trials por vencer",
      priorityLabel: "Alta",
      nextStep: "Trials que terminan en 48h o pagos pendientes.",
      actionLabel: "Ver pagos",
      targetTab: "clientes" as GrowthPanelTab,
    },
  ];

  const counts: Record<GrowthWorkQueue, { count: number; names: string[] }> = {
    tareas_pendientes: {
      count: listosContactar.length,
      names: listosContactar.slice(0, 3).map((p) => p.empresa),
    },
    seguimientos_atrasados: {
      count: followupsVencidos.length,
      names: followupsVencidos.slice(0, 3).map((t) => t.titulo),
    },
    demos_por_hacer: {
      count: demosProximas.length,
      names: demosProximas.slice(0, 3).map((p) => p.empresa),
    },
    clientes_por_cobrar: {
      count: trialsSinActivacion,
      names: trialNames.slice(0, 3),
    },
    cuentas_por_configurar: {
      count: trialsTerminanPronto + pagosPendientes,
      names: paymentNames.slice(0, 3),
    },
  };

  return queues.map((queue) => ({
    ...queue,
    count: counts[queue.id].count,
    names: counts[queue.id].names,
  }));
}

export function countActiveProspects(
  prospects: Array<{ estado: string; no_contactar: boolean }>
) {
  return prospects.filter(
    (p) => !p.no_contactar && !TERMINAL.has(p.estado)
  ).length;
}
