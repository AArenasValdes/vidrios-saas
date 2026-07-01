import { formatRelativeActivity } from "@/features/admin/services/admin-clientes-filters.service";
import {
  buildActivacionAttentionRows,
  primaryActionLabel as activacionPrimaryLabel,
} from "@/features/admin/services/admin-activacion-filters.service";
import { buildClientesAttentionRows } from "@/features/admin/services/admin-clientes-filters.service";
import type { AdminPaymentActionRow } from "@/features/admin/types/admin-payments";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { AdminPublicChannelSummary } from "@/features/admin/types/admin-public-channel";
import type { PublicSolicitudRow } from "@/features/admin/services/admin-public-channel.logic";
import {
  formatPublicSolicitudRevisionDueLabel,
  hasIncompletePublicPageNeedingSetup,
  hasMultiplePublicRequestsWithoutFollowUp,
  hasTrialWithPublicRequestsNoQuotes,
  hasUnrevisedPublicSolicitudes,
} from "@/features/admin/services/admin-public-channel.logic";
import type {
  AdminTask,
  AdminTaskActionType,
  AdminTaskCompletedEvent,
  AdminTaskOrigin,
  AdminTaskPriority,
  AdminTaskStatus,
  AdminTaskUpcomingGroup,
} from "@/features/admin/types/admin-tareas";
import type { GrowthProspectRow, GrowthTaskRow } from "@/features/growth/types/growth-supabase";
import { buildPublicLeadWhatsappUrl } from "@/utils/whatsapp";
import { ORIGIN_LABELS } from "@/features/admin/services/admin-tareas-labels";

const MS_DAY = 24 * 60 * 60 * 1000;
const UPCOMING_DAYS = 7;
const COMPLETED_DAYS = 7;

const ORIGIN_RANK: Record<AdminTaskOrigin, number> = {
  pagos: 6,
  activacion: 5,
  solicitud_publica: 4,
  clientes: 3,
  prospectos: 2,
  manual: 1,
};

const PRIORITY_RANK: Record<AdminTaskPriority, number> = {
  alta: 3,
  media: 2,
  baja: 1,
};

type SolicitudRow = {
  id: string;
  nombre: string | null;
  creado_en: string;
  organization_id: number | null;
  contexto?: string;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isWithinDays(iso: string | null, days: number) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= days * MS_DAY;
}

function resolveDueStatus(dueAt: string | null, completedAt: string | null): AdminTaskStatus {
  if (completedAt) return "completada";

  const now = new Date();
  if (!dueAt) return "pendiente";

  const due = new Date(dueAt);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (due.getTime() < todayStart.getTime()) return "vencida";
  if (due.getTime() <= todayEnd.getTime()) return "hoy";
  if (due.getTime() <= todayStart.getTime() + UPCOMING_DAYS * MS_DAY) return "proxima";
  return "pendiente";
}

function formatDueLabel(dueAt: string | null, status: AdminTaskStatus) {
  if (!dueAt) return "Sin fecha";
  if (status === "vencida") {
    const days = Math.max(
      1,
      Math.floor((Date.now() - new Date(dueAt).getTime()) / MS_DAY)
    );
    return `Venció hace ${days} día${days === 1 ? "" : "s"}`;
  }
  if (status === "hoy") return "Hoy";

  const days = Math.ceil((new Date(dueAt).getTime() - Date.now()) / MS_DAY);
  if (days === 1) return "Mañana";
  if (days > 0) return `Vence en ${days} días`;
  return formatRelativeActivity(dueAt);
}

function buildWhatsappUrl(phone: string | null, message: string) {
  if (!phone) return null;
  return buildPublicLeadWhatsappUrl(phone, { mensaje: message });
}

function baseTask(
  partial: Omit<
    AdminTask,
    | "status"
    | "dueLabel"
    | "kind"
    | "completedAt"
  > & {
    status?: AdminTaskStatus;
    dueLabel?: string;
    kind?: AdminTask["kind"];
    completedAt?: string | null;
  }
): AdminTask {
  const status = partial.status ?? resolveDueStatus(partial.dueAt, partial.completedAt ?? null);
  return {
    ...partial,
    kind: partial.kind ?? "automatic",
    completedAt: partial.completedAt ?? null,
    status,
    dueLabel: partial.dueLabel ?? formatDueLabel(partial.dueAt, status),
    publicPageUrl: partial.publicPageUrl ?? null,
  };
}

function mapPaymentPrimaryAction(row: AdminPaymentActionRow): {
  actionType: AdminTaskActionType;
  label: string;
} {
  if (row.primaryAction === "confirm") {
    return { actionType: "confirmar_pago", label: "Confirmar pago" };
  }
  if (row.primaryAction === "activate") {
    return { actionType: "activar_plan", label: "Activar plan" };
  }
  if (row.primaryAction === "remind") {
    return { actionType: "recordar", label: "Recordar" };
  }
  if (row.primaryAction === "recover") {
    return { actionType: "recuperar", label: "Recuperar" };
  }
  if (row.primaryAction === "contact") {
    return { actionType: "contactar", label: "Contactar" };
  }
  return { actionType: "seguimiento", label: "Revisar pago" };
}

export function derivePaymentTasks(rows: AdminPaymentActionRow[]): AdminTask[] {
  return rows.map((row) => {
    const mapped = mapPaymentPrimaryAction(row);
    const priority: AdminTaskPriority =
      row.primaryAction === "confirm" || row.primaryAction === "activate"
        ? "alta"
        : row.primaryAction === "recover"
          ? "alta"
          : "media";

    return baseTask({
      id: `pagos:${row.id}`,
      origin: "pagos",
      actionType: mapped.actionType,
      priority,
      title: row.proximaAccion,
      empresaNombre: row.empresaNombre,
      contactoLabel: null,
      contexto: row.situation,
      dueAt: row.fecha,
      primaryActionLabel: mapped.label,
      whatsappUrl: row.whatsappUrl,
      organizationId: row.organizationId,
      prospectId: null,
      paymentId: row.paymentId,
      solicitudId: null,
      manualTaskId: null,
      href: `/admin/pagos-y-planes?org=${row.organizationId}`,
      publicPageUrl: row.publicPageUrl,
    });
  });
}

function mapClientesAction(row: ReturnType<typeof buildClientesAttentionRows>[number]): {
  actionType: AdminTaskActionType;
  label: string;
} {
  if (row.actionType === "whatsapp") {
    return { actionType: "whatsapp", label: row.actionLabel };
  }
  if (row.actionType === "extend") {
    return { actionType: "extender_trial", label: row.actionLabel };
  }
  if (row.actionType === "payment") {
    return { actionType: "confirmar_pago", label: row.actionLabel };
  }
  if (row.proximaAccion.toLowerCase().includes("renovación")) {
    return { actionType: "renovacion", label: row.actionLabel };
  }
  return { actionType: "seguimiento", label: row.actionLabel };
}

export function deriveClientesTasks(
  rows: ReturnType<typeof buildClientesAttentionRows>,
  clients: AdminClientListItem[]
): AdminTask[] {
  const clientById = new Map(clients.map((client) => [client.organizationId, client]));

  return rows.map((row) => {
    const mapped = mapClientesAction(row);
    const client = clientById.get(row.organizationId);
    const priority: AdminTaskPriority =
      row.estadoEfectivo === "trial_expired" ||
      row.estadoEfectivo === "past_due" ||
      row.estadoEfectivo === "cancelled"
        ? "alta"
        : "media";

    const dueAt = client?.trialEndsAt ?? client?.subscriptionEndsAt ?? null;

    return baseTask({
      id: `clientes:${row.organizationId}`,
      origin: "clientes",
      actionType: mapped.actionType,
      priority,
      title: row.proximaAccion,
      empresaNombre: row.empresa,
      contactoLabel: null,
      contexto: `${row.planLabel} · ${row.usoLabel}`,
      dueAt,
      primaryActionLabel: mapped.label,
      whatsappUrl: row.whatsappUrl,
        organizationId: row.organizationId,
        prospectId: null,
        paymentId: null,
        solicitudId: null,
        manualTaskId: null,
      href: `/admin/clientes/${row.organizationId}`,
      publicPageUrl: client?.publicPageUrl ?? null,
      });
    });
}

export function deriveActivacionTasks(
  rows: ReturnType<typeof buildActivacionAttentionRows>
): AdminTask[] {
  return rows
    .filter((row) => row.segment === "activation")
    .map((row) => {
      const label = activacionPrimaryLabel(row.primaryAction);
      let actionType: AdminTaskActionType = "activar_cuenta";
      if (row.primaryAction === "guide_send") actionType = "whatsapp";
      if (row.primaryAction === "remind") actionType = "whatsapp";
      if (row.primaryAction === "recover") actionType = "recuperar";
      if (row.primaryAction === "contact") actionType = "seguimiento";

      const priority: AdminTaskPriority =
        row.accountStatus === "trial_expired" || row.primaryAction === "remind"
          ? "alta"
          : row.primaryAction === "guide_send"
            ? "media"
            : "media";

      return baseTask({
        id: `activacion:${row.organizationId}`,
        origin: "activacion",
        actionType,
        priority,
        title: row.proximaAccion,
        empresaNombre: row.empresaNombre,
      contactoLabel: null,
        contexto: `${row.stageLabel} · ${row.bloqueo}`,
        dueAt: null,
        primaryActionLabel: label,
        whatsappUrl: row.whatsappUrl,
        organizationId: row.organizationId,
        prospectId: null,
        paymentId: null,
        solicitudId: null,
        manualTaskId: null,
      href: `/admin/clientes/${row.organizationId}`,
      publicPageUrl: row.publicPageUrl ?? null,
      });
    });
}

function deriveProspectTask(prospect: GrowthProspectRow): AdminTask | null {
  if (prospect.no_contactar || prospect.eliminado_en) return null;

  const terminal = new Set([
    "pagado",
    "no_calza",
    "no_contactar",
    "sin_respuesta",
  ]);
  if (terminal.has(prospect.estado)) return null;

  let title = "Seguimiento comercial";
  let contexto = "Seguimiento programado";
  let priority: AdminTaskPriority = "baja";
  let actionType: AdminTaskActionType = "seguimiento";
  let primaryActionLabel = "Ver prospecto";
  const dueAt = prospect.proxima_accion_en;

  if (["nuevo", "investigado", "listo_para_contactar"].includes(prospect.estado)) {
    title = "Contactar prospecto nuevo";
    contexto = "Sin primer contacto registrado";
    priority = "media";
    actionType = "contactar";
    primaryActionLabel = "Contactar";
  }

  if (
    dueAt &&
    new Date(dueAt).getTime() < Date.now() &&
    !["nuevo", "investigado", "listo_para_contactar"].includes(prospect.estado)
  ) {
    title = "Follow-up vencido";
    contexto = "Retomar conversación pendiente";
    priority = "alta";
    actionType = "contactar";
    primaryActionLabel = "Contactar";
  }

  if (prospect.estado === "demo_agendada") {
    title = "Agendar o confirmar demo";
    contexto = "Demo agendada en pipeline";
    priority = "media";
    actionType = "agendar_demo";
    primaryActionLabel = "Agendar demo";
  }

  if (prospect.estado === "esperando_pago") {
    title = "Confirmar pago del prospecto";
    contexto = "Prospecto esperando cierre comercial";
    priority = "alta";
    actionType = "confirmar_pago";
    primaryActionLabel = "Confirmar pago";
  }

  return baseTask({
    id: `prospectos:${prospect.id}`,
    origin: "prospectos",
    actionType,
    priority,
    title,
    empresaNombre: prospect.empresa,
    contactoLabel: prospect.contacto_nombre,
    contexto,
    dueAt,
    primaryActionLabel,
    whatsappUrl: buildWhatsappUrl(
      prospect.telefono,
      `Hola, te escribo desde Ventora sobre ${prospect.empresa}.`
    ),
    organizationId: prospect.converted_organization_id,
    prospectId: prospect.id,
    paymentId: null,
    solicitudId: null,
    manualTaskId: null,
    href: `/admin/prospectos?prospect=${prospect.id}`,
    publicPageUrl: null,
  });
}

export function deriveProspectTasks(prospects: GrowthProspectRow[]): AdminTask[] {
  return prospects
    .map(deriveProspectTask)
    .filter((task): task is AdminTask => task !== null);
}

export function deriveGrowthFollowupTasks(tasks: GrowthTaskRow[]): AdminTask[] {
  return tasks
    .filter((task) => !task.completada_en && !task.eliminado_en)
    .map((task) => {
      const priority: AdminTaskPriority =
        task.prioridad === "alta" ? "alta" : task.prioridad === "baja" ? "baja" : "media";
      let actionType: AdminTaskActionType = "seguimiento";
      if (task.tipo === "followup") actionType = "contactar";
      if (task.tipo === "demo") actionType = "agendar_demo";
      if (task.tipo === "recuperar_pago") actionType = "confirmar_pago";

      return baseTask({
        id: `growth-task:${task.id}`,
        kind: task.tipo === "otro" ? "manual" : "automatic",
        origin: "prospectos",
        actionType,
        priority,
        title: task.titulo,
        empresaNombre: task.titulo,
        contactoLabel: null,
        contexto: "Tarea del pipeline comercial",
        dueAt: task.vence_en,
        primaryActionLabel: task.tipo === "demo" ? "Agendar demo" : "Contactar",
        whatsappUrl: null,
        organizationId: null,
        prospectId: task.prospect_id,
    paymentId: null,
    solicitudId: null,
    manualTaskId: task.tipo === "otro" ? task.id : null,
        href: task.prospect_id
          ? `/admin/prospectos?prospect=${task.prospect_id}`
          : "/admin/prospectos",
        publicPageUrl: null,
      });
    });
}

export function deriveManualTasks(tasks: GrowthTaskRow[]): AdminTask[] {
  return tasks
    .filter((task) => task.tipo === "otro" && !task.completada_en && !task.eliminado_en)
    .map((task) =>
      baseTask({
        id: `manual:${task.id}`,
        kind: "manual",
        origin: "manual",
        actionType: "seguimiento",
        priority:
          task.prioridad === "alta" ? "alta" : task.prioridad === "baja" ? "baja" : "media",
        title: task.titulo,
        empresaNombre: task.titulo,
        contactoLabel: null,
        contexto: "Tarea manual del fundador",
        dueAt: task.vence_en,
        primaryActionLabel: "Ver tarea",
        whatsappUrl: null,
        organizationId: null,
        prospectId: task.prospect_id,
        paymentId: null,
        manualTaskId: task.id,
        solicitudId: null,
        href: "/admin/tareas",
        publicPageUrl: null,
      })
    );
}

export function derivePublicChannelActionTasks(
  clients: AdminClientListItem[],
  summaries: Map<number, AdminPublicChannelSummary>,
  solicitudesByOrg: Map<number, PublicSolicitudRow[]>
): AdminTask[] {
  const tasks: AdminTask[] = [];

  for (const client of clients) {
    if (client.isTestAccount) continue;

    const summary = summaries.get(client.organizationId);
    if (!summary) continue;

    const pendingSolicitudes =
      solicitudesByOrg.get(client.organizationId)?.filter((item) => item.estado === "nueva") ??
      [];
    const latestPending = pendingSolicitudes[0] ?? null;
    const solicitante = latestPending?.nombre?.trim() ?? summary.lastSolicitanteNombre;

    if (hasUnrevisedPublicSolicitudes(summary) && latestPending) {
      tasks.push(
        baseTask({
          id: `solicitud-publica:revision:${client.organizationId}`,
          origin: "solicitud_publica",
          actionType: "ver_solicitud",
          priority: "media",
          title: "Solicitud pública recibida",
          empresaNombre: client.empresaNombre,
          contactoLabel: solicitante,
          contexto: `${solicitante ?? "Un solicitante"} solicitó cotización desde la página pública de ${client.empresaNombre}. La solicitud sigue sin revisar en Ventora Admin.`,
          dueAt: summary.oldestPendingAt,
          dueLabel: formatPublicSolicitudRevisionDueLabel(summary.oldestPendingAt),
          primaryActionLabel: "Ver solicitud",
          whatsappUrl: null,
          organizationId: client.organizationId,
          prospectId: null,
          paymentId: null,
          solicitudId: latestPending.id,
          manualTaskId: null,
          publicPageUrl: summary.publicPageUrl,
          href: `/admin/clientes/${client.organizationId}?solicitud=${latestPending.id}`,
        })
      );
      continue;
    }

    if (hasTrialWithPublicRequestsNoQuotes(client, summary)) {
      tasks.push(
        baseTask({
          id: `solicitud-publica:trial-sin-cotizacion:${client.organizationId}`,
          origin: "solicitud_publica",
          actionType: "seguimiento",
          priority: "media",
          title: "Trial con solicitudes sin cotización",
          empresaNombre: client.empresaNombre,
          contactoLabel: solicitante,
          contexto: `${client.empresaNombre} recibió ${summary.solicitudesLast30Days} solicitud${summary.solicitudesLast30Days === 1 ? "" : "es"} públicas y aún no crea cotizaciones.`,
          dueAt: summary.lastSolicitudAt,
          primaryActionLabel: "Ver cuenta",
          whatsappUrl: null,
          organizationId: client.organizationId,
          prospectId: null,
          paymentId: null,
          solicitudId: latestPending?.id ?? null,
          manualTaskId: null,
          publicPageUrl: summary.publicPageUrl,
          href: `/admin/clientes/${client.organizationId}`,
        })
      );
      continue;
    }

    if (hasIncompletePublicPageNeedingSetup(client, summary)) {
      tasks.push(
        baseTask({
          id: `solicitud-publica:configurar:${client.organizationId}`,
          origin: "solicitud_publica",
          actionType: "configuracion_inicial",
          priority: "baja",
          title: "Configurar página pública",
          empresaNombre: client.empresaNombre,
          contactoLabel: null,
          contexto: `${client.empresaNombre} aún no tiene una página pública publicada para captar solicitudes.`,
          dueAt: null,
          primaryActionLabel: "Ver cuenta",
          whatsappUrl: null,
          organizationId: client.organizationId,
          prospectId: null,
          paymentId: null,
          solicitudId: null,
          manualTaskId: null,
          publicPageUrl: summary.publicPageUrl,
          href: `/admin/clientes/${client.organizationId}`,
        })
      );
      continue;
    }

    if (hasMultiplePublicRequestsWithoutFollowUp(client, summary)) {
      tasks.push(
        baseTask({
          id: `solicitud-publica:seguimiento:${client.organizationId}`,
          origin: "solicitud_publica",
          actionType: "seguimiento",
          priority: "media",
          title: "Seguimiento de solicitudes públicas",
          empresaNombre: client.empresaNombre,
          contactoLabel: solicitante,
          contexto: `${client.empresaNombre} acumula ${summary.solicitudesLast30Days} solicitudes públicas sin actividad posterior clara.`,
          dueAt: summary.lastSolicitudAt,
          primaryActionLabel: "Ver cuenta",
          whatsappUrl: null,
          organizationId: client.organizationId,
          prospectId: null,
          paymentId: null,
          solicitudId: latestPending?.id ?? null,
          manualTaskId: null,
          publicPageUrl: summary.publicPageUrl,
          href: `/admin/clientes/${client.organizationId}`,
        })
      );
    }
  }

  return tasks;
}

export function buildPublicChannelActivityEvents(input: {
  solicitudes: PublicSolicitudRow[];
  clientsByOrg: Map<number, AdminClientListItem>;
}) {
  return input.solicitudes
    .filter((item) => item.contexto === "empresa-publica")
    .slice(0, 12)
    .map((item) => {
      const client = input.clientsByOrg.get(Number(item.organization_id));
      return {
        id: `solicitud-publica-${item.id}`,
        empresaNombre: client?.empresaNombre ?? `Org ${item.organization_id}`,
        solicitanteNombre: item.nombre,
        label: `Solicitud pública recibida para ${client?.empresaNombre ?? "cliente"}`,
        relativeAt: formatRelativeActivity(item.creado_en),
        href: `/admin/clientes/${item.organization_id}`,
        solicitudId: item.id,
      };
    });
}

export function dedupeAdminTasks(tasks: AdminTask[]): AdminTask[] {
  const byOrg = new Map<number, AdminTask>();
  const byProspect = new Map<string, AdminTask>();
  const standalone: AdminTask[] = [];

  function shouldReplace(current: AdminTask, candidate: AdminTask) {
    const originDiff = ORIGIN_RANK[candidate.origin] - ORIGIN_RANK[current.origin];
    if (originDiff !== 0) return originDiff > 0;
    return PRIORITY_RANK[candidate.priority] > PRIORITY_RANK[current.priority];
  }

  for (const task of tasks) {
    if (task.kind === "manual") {
      standalone.push(task);
      continue;
    }

    if (task.prospectId && task.origin === "prospectos" && !task.organizationId) {
      const existing = byProspect.get(task.prospectId);
      if (!existing || shouldReplace(existing, task)) {
        byProspect.set(task.prospectId, task);
      }
      continue;
    }

    if (task.organizationId) {
      const existing = byOrg.get(task.organizationId);
      if (!existing || shouldReplace(existing, task)) {
        byOrg.set(task.organizationId, task);
      }
      continue;
    }

    standalone.push(task);
  }

  return [...byOrg.values(), ...byProspect.values(), ...standalone].sort((left, right) => {
    const leftRank = PRIORITY_RANK[left.priority];
    const rightRank = PRIORITY_RANK[right.priority];
    if (leftRank !== rightRank) return rightRank - leftRank;
    const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue;
  });
}

export function buildTodayPriorityTasks(tasks: AdminTask[]) {
  return tasks.filter((task) => {
    if (task.status === "completada") return false;

    if (task.origin === "solicitud_publica") {
      return task.status === "vencida" || task.priority === "alta";
    }

    return (
      task.status === "vencida" ||
      task.status === "hoy" ||
      task.priority === "alta" ||
      task.status === "pendiente"
    );
  });
}

export function buildUpcomingTaskGroups(tasks: AdminTask[]): AdminTaskUpcomingGroup[] {
  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowEnd = endOfDay(tomorrow);
  const weekEnd = new Date(tomorrowEnd.getTime() + (UPCOMING_DAYS - 1) * MS_DAY);

  const tomorrowTasks = tasks.filter((task) => {
    if (task.status === "completada" || !task.dueAt) return false;
    const due = new Date(task.dueAt).getTime();
    return due >= tomorrow.getTime() && due <= tomorrowEnd.getTime();
  });

  const weekTasks = tasks.filter((task) => {
    if (task.status === "completada" || !task.dueAt) return false;
    const due = new Date(task.dueAt).getTime();
    return due > tomorrowEnd.getTime() && due <= weekEnd.getTime();
  });

  const groups: AdminTaskUpcomingGroup[] = [];
  if (tomorrowTasks.length) {
    groups.push({ id: "tomorrow", label: "Mañana", tasks: tomorrowTasks.slice(0, 6) });
  }
  if (weekTasks.length) {
    groups.push({ id: "week", label: "Esta semana", tasks: weekTasks.slice(0, 6) });
  }
  return groups;
}

export function buildCompletedEvents(tasks: GrowthTaskRow[]): AdminTaskCompletedEvent[] {
  return tasks
    .filter(
      (task) =>
        task.completada_en && isWithinDays(task.completada_en, COMPLETED_DAYS)
    )
    .sort(
      (left, right) =>
        new Date(right.completada_en ?? 0).getTime() -
        new Date(left.completada_en ?? 0).getTime()
    )
    .slice(0, 5)
    .map((task) => ({
      id: `completed:${task.id}`,
      empresaNombre: task.titulo,
      label: "Tarea completada",
      relativeAt: formatRelativeActivity(task.completada_en),
      href: task.prospect_id
        ? `/admin/prospectos?prospect=${task.prospect_id}`
        : "/admin/tareas",
    }));
}

export function buildOriginSummary(tasks: AdminTask[]) {
  const pending = tasks.filter((task) => task.status !== "completada");
  const total = pending.length || 1;

  return (Object.keys(ORIGIN_LABELS) as AdminTaskOrigin[]).map((origin) => {
    const count = pending.filter((task) => task.origin === origin).length;
    return {
      origin,
      label: ORIGIN_LABELS[origin],
      count,
      pct: Math.round((count / total) * 100),
    };
  });
}

export function isRenewalTask(task: AdminTask) {
  return task.actionType === "renovacion";
}

