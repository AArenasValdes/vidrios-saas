import { growthDashboardRepository } from "@/features/growth/repositories/growth-dashboard.repository";
import type {
  CreateGrowthProspectInput,
  GrowthChannel,
  GrowthChannelPerformance,
  GrowthDashboardViewModel,
  GrowthFocusFilter,
  GrowthFunnelMetrics,
  GrowthKpi,
  GrowthPanelTab,
  GrowthPriority,
  GrowthProspect,
  GrowthProspectStatus,
  GrowthProjection,
  GrowthTodayItem,
  GrowthWorkspace,
  UpdateGrowthManualMetricsInput,
  UpdateGrowthProspectInput,
  UpdateGrowthSettingsInput,
} from "@/features/growth/types/growth-dashboard";

const ADVANCED_STATUSES: GrowthProspectStatus[] = [
  "Respondio",
  "Demo agendada",
  "Demo realizada",
  "Piloto",
  "Pagado",
];

const DEMO_STATUSES: GrowthProspectStatus[] = [
  "Demo agendada",
  "Demo realizada",
];

const TERMINAL_STATUSES: GrowthProspectStatus[] = ["Pagado", "Perdido"];

function getTodayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function cloneWorkspace(workspace: GrowthWorkspace) {
  return JSON.parse(JSON.stringify(workspace)) as GrowthWorkspace;
}

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function compareDate(left: string, right: string) {
  return (
    new Date(`${left}T12:00:00`).getTime() -
    new Date(`${right}T12:00:00`).getTime()
  );
}

function isOnOrBeforeToday(value: string) {
  return compareDate(value, getTodayYmd()) <= 0;
}

function formatPeriodLabel(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(new Date(`${startDate}T12:00:00`))} - ${formatter.format(
    new Date(`${endDate}T12:00:00`)
  )}`;
}

function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function nextActionLabel(status: GrowthProspectStatus) {
  if (status === "Nuevo") return "Marcar contacto";
  if (status === "Contactado") return "Marcar respuesta";
  if (status === "Respondio") return "Agendar demo";
  if (status === "Demo agendada") return "Marcar demo";
  if (status === "Demo realizada") return "Activar piloto";
  if (status === "Piloto") return "Mover a pagado";
  if (status === "Pausado" || status === "Perdido") return "Reactivar";
  return "Actualizado";
}

function nextStatus(status: GrowthProspectStatus): GrowthProspectStatus {
  if (status === "Nuevo") return "Contactado";
  if (status === "Contactado") return "Respondio";
  if (status === "Respondio") return "Demo agendada";
  if (status === "Demo agendada") return "Demo realizada";
  if (status === "Demo realizada") return "Piloto";
  if (status === "Piloto") return "Pagado";
  if (status === "Pausado" || status === "Perdido") return "Contactado";
  return status;
}

function buildFunnel(prospects: GrowthProspect[]): GrowthFunnelMetrics {
  return {
    encontrados: prospects.length,
    contactados: prospects.filter((item) => item.estado !== "Nuevo").length,
    respondieron: prospects.filter((item) =>
      ADVANCED_STATUSES.includes(item.estado)
    ).length,
    demos: prospects.filter((item) => DEMO_STATUSES.includes(item.estado))
      .length,
    pilotos: prospects.filter((item) => item.estado === "Piloto").length,
    pagos: prospects.filter((item) => item.estado === "Pagado").length,
  };
}

function buildKpis(
  workspace: GrowthWorkspace,
  funnel: GrowthFunnelMetrics
): GrowthKpi[] {
  return [
    {
      id: "encontrados",
      label: "Encontrados",
      value: String(funnel.encontrados),
      source: "manual",
    },
    {
      id: "contactados",
      label: "Contactados",
      value: String(funnel.contactados),
      source: "manual",
    },
    {
      id: "respondieron",
      label: "Respondieron",
      value: String(funnel.respondieron),
      source: "manual",
    },
    {
      id: "demos",
      label: "Demos",
      value: String(funnel.demos),
      source: "manual",
    },
    {
      id: "pilotos",
      label: "Pilotos",
      value: String(workspace.manualMetrics.pilotosActivosActuales),
      source: workspace.manualMetrics.dataStatus,
    },
    {
      id: "pagos",
      label: "Pagos",
      value: String(workspace.manualMetrics.clientesPagadosActuales),
      source: workspace.manualMetrics.dataStatus,
    },
    {
      id: "mrr",
      label: "MRR",
      value: formatClp(workspace.manualMetrics.mrrActualClp),
      source: workspace.manualMetrics.dataStatus,
    },
  ];
}

function buildTodayWork(prospects: GrowthProspect[]): GrowthTodayItem[] {
  const followups = prospects.filter(
    (item) =>
      item.estado !== "Nuevo" &&
      !TERMINAL_STATUSES.includes(item.estado) &&
      isOnOrBeforeToday(item.fechaProximoContacto)
  );
  const contactar = prospects.filter(
    (item) =>
      item.estado === "Nuevo" &&
      (item.prioridad === "A1" || item.prioridad === "A2")
  );
  const demos = prospects.filter((item) => item.estado === "Respondio");
  const pilotos = prospects.filter(
    (item) => item.estado === "Demo realizada"
  );

  return [
    {
      id: "followups",
      title: "Follow-ups vencidos",
      count: followups.length,
      names: followups.slice(0, 3).map((item) => item.empresa),
      priorityLabel: "Alta",
      nextStep: "Retomar conversaciones que ya van atrasadas.",
      actionLabel: "Ver follow-ups",
    },
    {
      id: "contactar",
      title: "Prospectos por contactar",
      count: contactar.length,
      names: contactar.slice(0, 3).map((item) => item.empresa),
      priorityLabel: "Alta",
      nextStep: "Enviar el primer contacto a la lista corta del dia.",
      actionLabel: "Ver prospectos",
    },
    {
      id: "demos",
      title: "Demos por agendar",
      count: demos.length,
      names: demos.slice(0, 3).map((item) => item.empresa),
      priorityLabel: "Media",
      nextStep: "Mover respuestas reales a una fecha concreta.",
      actionLabel: "Ver demos",
    },
    {
      id: "pilotos",
      title: "Pilotos por activar",
      count: pilotos.length,
      names: pilotos.slice(0, 3).map((item) => item.empresa),
      priorityLabel: "Media",
      nextStep: "Cerrar activacion y primer valor esta semana.",
      actionLabel: "Ver pilotos",
    },
  ];
}

function buildChannels(
  prospects: GrowthProspect[]
): GrowthChannelPerformance[] {
  const channels: GrowthChannel[] = [
    "Facebook",
    "Instagram",
    "Google Maps",
    "WhatsApp",
    "TikTok",
    "Referidos",
  ];

  return channels.map((channel) => {
    const items = prospects.filter((prospect) => prospect.canal === channel);
    const avanzados = items.filter((prospect) =>
      ADVANCED_STATUSES.includes(prospect.estado)
    ).length;

    return {
      channel,
      total: items.length,
      avanzados,
      effectivenessPct: items.length > 0 ? avanzados / items.length : 0,
    };
  });
}

function buildProjections(workspace: GrowthWorkspace): GrowthProjection[] {
  return [6, 12].map((months) => ({
    months: months as 6 | 12,
    paidClients:
      workspace.manualMetrics.clientesPagadosActuales +
      workspace.settings.monthlyPaidGoal * months,
    mrrClp:
      workspace.manualMetrics.mrrActualClp +
      workspace.settings.monthlyPaidGoal *
        workspace.settings.monthlyPriceClp *
        months,
  }));
}

function applyFocusFilter(
  prospects: GrowthProspect[],
  focusFilter: GrowthFocusFilter
) {
  if (focusFilter === "todos") {
    return prospects;
  }

  if (focusFilter === "followups") {
    return prospects.filter(
      (item) =>
        item.estado !== "Nuevo" &&
        !TERMINAL_STATUSES.includes(item.estado) &&
        isOnOrBeforeToday(item.fechaProximoContacto)
    );
  }

  if (focusFilter === "contactar") {
    return prospects.filter(
      (item) =>
        item.estado === "Nuevo" &&
        (item.prioridad === "A1" || item.prioridad === "A2")
    );
  }

  if (focusFilter === "demos") {
    return prospects.filter(
      (item) =>
        item.estado === "Respondio" || item.estado === "Demo agendada"
    );
  }

  return prospects.filter(
    (item) => item.estado === "Demo realizada" || item.estado === "Piloto"
  );
}

function sortProspects(prospects: GrowthProspect[]) {
  const priorityWeight: Record<GrowthPriority, number> = {
    A1: 0,
    A2: 1,
    B1: 2,
    B2: 3,
  };

  return [...prospects].sort((left, right) => {
    if (priorityWeight[left.prioridad] !== priorityWeight[right.prioridad]) {
      return priorityWeight[left.prioridad] - priorityWeight[right.prioridad];
    }

    return compareDate(left.fechaProximoContacto, right.fechaProximoContacto);
  });
}

export const growthDashboardService = {
  async loadWorkspace() {
    return growthDashboardRepository.getWorkspace();
  },
  async resetWorkspace() {
    return growthDashboardRepository.resetWorkspace();
  },
  async addProspect(workspace: GrowthWorkspace, input: CreateGrowthProspectInput) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.prospects.unshift({
      ...input,
      id:
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `prospecto-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      dataStatus: "manual",
    });
    nextWorkspace.updatedAt = now;

    return growthDashboardRepository.saveWorkspace(nextWorkspace);
  },
  async updateProspect(
    workspace: GrowthWorkspace,
    prospectId: string,
    patch: UpdateGrowthProspectInput
  ) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.prospects = nextWorkspace.prospects.map((prospect) =>
      prospect.id === prospectId
        ? {
            ...prospect,
            ...patch,
            dataStatus: "manual",
            updatedAt: now,
          }
        : prospect
    );
    nextWorkspace.updatedAt = now;

    return growthDashboardRepository.saveWorkspace(nextWorkspace);
  },
  async advanceProspect(workspace: GrowthWorkspace, prospectId: string) {
    const prospect = workspace.prospects.find((item) => item.id === prospectId);

    if (!prospect) {
      return workspace;
    }

    const nextProspectStatus = nextStatus(prospect.estado);
    const nextStep =
      nextProspectStatus === "Contactado"
        ? "Esperar respuesta o enviar follow-up"
        : nextProspectStatus === "Respondio"
          ? "Agendar demo corta"
          : nextProspectStatus === "Demo agendada"
            ? "Confirmar demo"
            : nextProspectStatus === "Demo realizada"
              ? "Activar piloto"
              : nextProspectStatus === "Piloto"
                ? "Mover a pago"
                : nextProspectStatus === "Pagado"
                  ? "Pedir referido o caso"
                  : prospect.proximoPaso;

    return growthDashboardService.updateProspect(workspace, prospectId, {
      estado: nextProspectStatus,
      proximoPaso: nextStep,
      fechaProximoContacto:
        nextProspectStatus === "Pagado"
          ? prospect.fechaProximoContacto
          : getTodayYmd(),
    });
  },
  async updateSettings(
    workspace: GrowthWorkspace,
    patch: UpdateGrowthSettingsInput
  ) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.settings = {
      ...nextWorkspace.settings,
      ...patch,
    };
    nextWorkspace.updatedAt = now;

    return growthDashboardRepository.saveWorkspace(nextWorkspace);
  },
  async updateManualMetrics(
    workspace: GrowthWorkspace,
    patch: UpdateGrowthManualMetricsInput
  ) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.manualMetrics = {
      ...nextWorkspace.manualMetrics,
      ...patch,
      dataStatus: patch.dataStatus ?? "manual",
    };
    nextWorkspace.updatedAt = now;

    return growthDashboardRepository.saveWorkspace(nextWorkspace);
  },
  async updateExperiments(
    workspace: GrowthWorkspace,
    experiments: GrowthWorkspace["experiments"]
  ) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.experiments = experiments;
    nextWorkspace.updatedAt = now;

    return growthDashboardRepository.saveWorkspace(nextWorkspace);
  },
  buildDashboardViewModel(
    workspace: GrowthWorkspace,
    currentTab: GrowthPanelTab,
    focusFilter: GrowthFocusFilter
  ): GrowthDashboardViewModel {
    const orderedProspects = sortProspects(workspace.prospects);
    const funnel = buildFunnel(orderedProspects);
    const workToday = buildTodayWork(orderedProspects);
    const channels = buildChannels(orderedProspects).filter(
      (channel) =>
        workspace.settings.activeChannels.includes(channel.channel) ||
        channel.total > 0
    );
    const topChannel =
      [...channels].sort((left, right) => {
        if (right.effectivenessPct !== left.effectivenessPct) {
          return right.effectivenessPct - left.effectivenessPct;
        }

        return right.total - left.total;
      })[0] ?? null;

    return {
      title: "Crecimiento Ventora",
      periodLabel: formatPeriodLabel(
        workspace.settings.periodStartDate,
        workspace.settings.periodEndDate
      ),
      metaMensualLabel: `${workspace.settings.monthlyPaidGoal} pagos / ${formatClp(
        workspace.settings.monthlyMrrGoalClp
      )}`,
      mrrActualLabel: formatClp(workspace.manualMetrics.mrrActualClp),
      updatedAtLabel: formatDateTimeLabel(workspace.updatedAt),
      currentTab,
      focusFilter,
      kpis: buildKpis(workspace, funnel),
      funnel,
      workToday,
      visibleProspects: applyFocusFilter(orderedProspects, focusFilter),
      allProspects: orderedProspects,
      channels,
      topChannel,
      manualMetrics: workspace.manualMetrics,
      projections: buildProjections(workspace),
      settings: workspace.settings,
      experiments: workspace.experiments,
      tabs: [
        { id: "resumen", label: "Resumen" },
        { id: "manuales", label: "Datos manuales" },
        { id: "experimentos", label: "Experimentos" },
      ],
    };
  },
  getStatusActionLabel(status: GrowthProspectStatus) {
    return nextActionLabel(status);
  },
  getDataStatusLabel(status: "real" | "manual" | "mock") {
    if (status === "real") return "Real";
    if (status === "manual") return "Manual";
    return "Mock";
  },
};
