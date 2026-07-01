import type {
  GrowthMarketingTask,
  GrowthProspect,
  GrowthProspectStatus,
  GrowthTodayItem,
  GrowthWorkspace,
} from "@/features/growth/types/growth-dashboard";

export type ProspectosQueueFilter =
  | "all"
  | "alta"
  | "nuevos"
  | "followups"
  | "demos"
  | "trials"
  | "pagos";

export type ProspectosKpiFilter = ProspectosQueueFilter | "activos";

export type ProspectosPipelineStage =
  | "nuevo"
  | "contactado"
  | "demo"
  | "trial"
  | "cliente_pagado"
  | "perdido";

export type ProspectosQueueItem = {
  id: string;
  prospectId: string;
  priority: "alta" | "media" | "baja";
  empresa: string;
  contacto: string;
  estado: GrowthProspectStatus;
  estadoLabel: string;
  motivo: string;
  ultimaInteraccion: string;
  proximaAccion: string;
  actionLabel: string;
  filterTags: ProspectosQueueFilter[];
  pipelineStage: ProspectosPipelineStage;
};

export type ProspectosPipelineColumn = {
  id: ProspectosPipelineStage;
  label: string;
  count: number;
  prospectIds: string[];
  conversionPct: number | null;
};

export type ProspectosRecentMove = {
  id: string;
  label: string;
  at: string;
  prospectId: string | null;
};

const TERMINAL: GrowthProspectStatus[] = [
  "pagado",
  "perdido",
  "sin_respuesta",
  "no_calza",
  "no_contactar",
];

const STATUS_LABELS: Record<GrowthProspectStatus, string> = {
  nuevo: "Nuevo",
  investigado: "Investigado",
  listo_para_contactar: "Listo para contactar",
  contactado: "Contactado",
  respondio: "Respondió",
  calificado: "Calificado",
  demo_agendada: "Demo agendada",
  piloto_activo: "Piloto activo",
  activado: "Activado",
  pagado: "Pagado",
  sin_respuesta: "Sin respuesta",
  no_calza: "No calza",
  no_contactar: "No contactar",
  demo_enviada: "Demo enviada",
  esperando_pago: "Esperando pago",
  perdido: "Perdido",
};

const MS_DAY = 24 * 60 * 60 * 1000;

function isActiveProspect(prospect: GrowthProspect) {
  return !prospect.noContactar && !TERMINAL.includes(prospect.estado);
}

function formatRelative(iso: string | null | undefined) {
  if (!iso) {
    return "Sin registro";
  }

  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / MS_DAY);
  if (diffDays <= 0) {
    return "Hoy";
  }
  if (diffDays === 1) {
    return "Ayer";
  }
  return `Hace ${diffDays} días`;
}

function isFollowupOverdue(prospect: GrowthProspect) {
  if (!isActiveProspect(prospect)) {
    return false;
  }

  const due = new Date(`${prospect.fechaProximoSeguimiento}T23:59:59`).getTime();
  return due < Date.now();
}

function resolvePipelineStage(status: GrowthProspectStatus): ProspectosPipelineStage {
  if (["nuevo", "investigado", "listo_para_contactar"].includes(status)) {
    return "nuevo";
  }

  if (
    ["contactado", "respondio", "calificado", "demo_enviada"].includes(status)
  ) {
    return "contactado";
  }

  if (status === "demo_agendada") {
    return "demo";
  }

  if (["piloto_activo", "activado", "esperando_pago"].includes(status)) {
    return "trial";
  }

  if (status === "pagado") {
    return "cliente_pagado";
  }

  return "perdido";
}

function buildQueueItem(prospect: GrowthProspect): ProspectosQueueItem | null {
  if (prospect.noContactar) {
    return null;
  }

  const filterTags: ProspectosQueueFilter[] = ["all"];
  let priority: ProspectosQueueItem["priority"] = "baja";
  let motivo = "Seguimiento programado";
  let actionLabel = "Ver ficha";

  if (TERMINAL.includes(prospect.estado)) {
    return null;
  }

  if (["nuevo", "investigado", "listo_para_contactar"].includes(prospect.estado)) {
    filterTags.push("nuevos");
    motivo = "Nuevo sin contacto";
    priority = "media";
    actionLabel = "Contactar";
  }

  if (isFollowupOverdue(prospect)) {
    filterTags.push("followups", "alta");
    motivo = "Follow-up vencido";
    priority = "alta";
    actionLabel = "Retomar";
  }

  if (prospect.estado === "demo_agendada") {
    filterTags.push("demos");
    motivo = "Demo agendada";
    priority = "media";
    actionLabel = "Ver demo";
  }

  if (["piloto_activo", "activado"].includes(prospect.estado)) {
    filterTags.push("trials");
    motivo = prospect.convertedOrganizationId
      ? "Trial en curso"
      : "Trial sin activación";
    priority = prospect.convertedOrganizationId ? "media" : "alta";
    actionLabel = "Activar";
  }

  if (prospect.estado === "esperando_pago") {
    filterTags.push("pagos", "trials");
    motivo = "Pago pendiente";
    priority = "alta";
    actionLabel = "Cobrar";
  }

  if (priority === "alta" && !filterTags.includes("alta")) {
    filterTags.push("alta");
  }

  if (filterTags.length === 1) {
    if (prospect.estado === "sin_respuesta") {
      motivo = "Prospecto frío";
    }
  }

  return {
    id: `queue-${prospect.id}`,
    prospectId: prospect.id,
    priority,
    empresa: prospect.empresa,
    contacto: prospect.nombre,
    estado: prospect.estado,
    estadoLabel: STATUS_LABELS[prospect.estado] ?? prospect.estado,
    motivo,
    ultimaInteraccion: formatRelative(prospect.updatedAt),
    proximaAccion: prospect.proximoPaso || "Actualizar seguimiento",
    actionLabel,
    filterTags,
    pipelineStage: resolvePipelineStage(prospect.estado),
  };
}

export function buildProspectListRow(prospect: GrowthProspect): ProspectosQueueItem | null {
  if (prospect.noContactar) {
    return null;
  }

  const fromQueue = buildQueueItem(prospect);
  if (fromQueue) {
    return fromQueue;
  }

  return {
    id: `list-${prospect.id}`,
    prospectId: prospect.id,
    priority: "baja",
    empresa: prospect.empresa,
    contacto: prospect.nombre,
    estado: prospect.estado,
    estadoLabel: STATUS_LABELS[prospect.estado] ?? prospect.estado,
    motivo: STATUS_LABELS[prospect.estado] ?? prospect.estado,
    ultimaInteraccion: formatRelative(prospect.updatedAt),
    proximaAccion: prospect.proximoPaso || "—",
    actionLabel: "Ver ficha",
    filterTags: ["all"],
    pipelineStage: resolvePipelineStage(prospect.estado),
  };
}

export function filterProspectsByPipelineStage(
  prospects: GrowthProspect[],
  stage: ProspectosPipelineStage
) {
  return prospects.filter(
    (prospect) =>
      !prospect.noContactar && resolvePipelineStage(prospect.estado) === stage
  );
}

export function countActiveProspects(prospects: GrowthProspect[]) {
  return prospects.filter(isActiveProspect).length;
}

export function buildProspectosKpis(
  workspace: GrowthWorkspace,
  workToday: GrowthTodayItem[] | null
) {
  const prospects = workspace.prospects;
  const workMap = new Map(
    (workToday ?? []).map((item) => [item.id, item.count] as const)
  );

  return [
    {
      id: "activos" as const,
      label: "Prospectos activos",
      value: countActiveProspects(prospects),
      filter: "activos" as ProspectosKpiFilter,
    },
    {
      id: "followups" as const,
      label: "Follow-ups vencidos",
      value:
        workMap.get("seguimientos_atrasados") ??
        prospects.filter(isFollowupOverdue).length,
      filter: "followups" as ProspectosKpiFilter,
    },
    {
      id: "demos" as const,
      label: "Demos próximas",
      value:
        workMap.get("demos_por_hacer") ??
        prospects.filter((p) => p.estado === "demo_agendada").length,
      filter: "demos" as ProspectosKpiFilter,
    },
    {
      id: "trials" as const,
      label: "Trials sin activación",
      value: workMap.get("clientes_por_cobrar") ?? 0,
      filter: "trials" as ProspectosKpiFilter,
    },
    {
      id: "pagos" as const,
      label: "Pagos / trials por vencer",
      value: workMap.get("cuentas_por_configurar") ?? 0,
      filter: "pagos" as ProspectosKpiFilter,
    },
  ];
}

export function buildProspectosQueue(prospects: GrowthProspect[]) {
  const priorityRank = { alta: 0, media: 1, baja: 2 };

  return prospects
    .map(buildQueueItem)
    .filter((item): item is ProspectosQueueItem => item !== null)
    .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority]);
}

export function filterProspectosQueue(
  items: ProspectosQueueItem[],
  filter: ProspectosQueueFilter | "activos"
) {
  if (filter === "all" || filter === "activos") {
    return items;
  }

  return items.filter((item) => item.filterTags.includes(filter));
}

export function buildProspectosPipeline(
  prospects: GrowthProspect[]
): ProspectosPipelineColumn[] {
  const columns: ProspectosPipelineColumn[] = [
    { id: "nuevo", label: "Nuevo", count: 0, prospectIds: [], conversionPct: null },
    { id: "contactado", label: "Contactado", count: 0, prospectIds: [], conversionPct: null },
    { id: "demo", label: "Demo agendada", count: 0, prospectIds: [], conversionPct: null },
    { id: "trial", label: "Trial activo", count: 0, prospectIds: [], conversionPct: null },
    {
      id: "cliente_pagado",
      label: "Cliente pagado",
      count: 0,
      prospectIds: [],
      conversionPct: null,
    },
    { id: "perdido", label: "Perdido", count: 0, prospectIds: [], conversionPct: null },
  ];

  const columnMap = new Map(columns.map((column) => [column.id, column]));

  for (const prospect of prospects) {
    if (prospect.noContactar) {
      continue;
    }

    const stage = resolvePipelineStage(prospect.estado);
    const column = columnMap.get(stage);
    if (!column) {
      continue;
    }

    column.count += 1;
    column.prospectIds.push(prospect.id);
  }

  return columns.map((column, index) => {
    if (index === 0) {
      return column;
    }

    const previousCount = columns[index - 1]?.count ?? 0;
    const conversionPct =
      previousCount > 0 ? Math.round((column.count / previousCount) * 100) : null;

    return {
      ...column,
      conversionPct,
    };
  });
}

export function buildProspectosRecentMoves(
  workspace: GrowthWorkspace
): ProspectosRecentMove[] {
  const moves: ProspectosRecentMove[] = [];

  for (const prospect of workspace.prospects) {
    moves.push({
      id: `prospect-${prospect.id}`,
      label: `${prospect.empresa} · ${STATUS_LABELS[prospect.estado] ?? prospect.estado}`,
      at: prospect.updatedAt,
      prospectId: prospect.id,
    });
  }

  for (const task of workspace.marketingTasks) {
    moves.push({
      id: `task-${task.id}`,
      label: `Tarea: ${task.campanaCanal || task.contenidoPendiente || "Marketing"}`,
      at: task.updatedAt,
      prospectId: task.prospectId ?? null,
    });
  }

  return moves
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, 8);
}

export function getProspectStatusLabel(status: GrowthProspectStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function getEmptyQueueMessage(filter: ProspectosQueueFilter) {
  switch (filter) {
    case "followups":
      return "No hay follow-ups vencidos.";
    case "demos":
      return "No hay demos próximas en la cola.";
    case "trials":
      return "Todos los trials activos tienen actividad reciente.";
    case "pagos":
      return "No hay pagos ni trials por vencer ahora.";
    case "nuevos":
      return "No hay prospectos nuevos pendientes de contacto.";
    case "alta":
      return "No hay casos de alta prioridad.";
    default:
      return "No hay casos accionables en la cola de trabajo.";
  }
}

export function exportProspectsCsv(prospects: GrowthProspect[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = [
    "empresa",
    "contacto",
    "whatsapp",
    "ciudad",
    "origen",
    "estado",
    "proximo_paso",
    "fecha_seguimiento",
  ];

  const rows = prospects.map((prospect) =>
    [
      prospect.empresa,
      prospect.nombre,
      prospect.whatsapp,
      prospect.ciudad,
      prospect.origen,
      prospect.estado,
      prospect.proximoPaso,
      prospect.fechaProximoSeguimiento,
    ]
      .map((cell) => escape(String(cell ?? "")))
      .join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

export function buildWhatsappUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
