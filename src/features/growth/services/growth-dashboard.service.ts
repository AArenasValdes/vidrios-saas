import { growthDashboardRepository } from "@/features/growth/repositories/growth-dashboard.repository";
import type {
  CreateGrowthClientInput,
  CreateGrowthMarketingTaskInput,
  CreateGrowthProspectInput,
  GrowthClientAccount,
  GrowthDashboardViewModel,
  GrowthMarketingTask,
  GrowthPanelTab,
  GrowthProspect,
  GrowthProspectStatus,
  GrowthTodayItem,
  GrowthWorkQueue,
  GrowthWorkspace,
  UpdateGrowthClientInput,
  UpdateGrowthManualMetricsInput,
  UpdateGrowthMarketingTaskInput,
  UpdateGrowthProspectInput,
  UpdateGrowthSettingsInput,
} from "@/features/growth/types/growth-dashboard";

const TERMINAL_PROSPECT_STATUSES: GrowthProspectStatus[] = ["pagado", "perdido"];

const DEMO_PENDING_STATUSES: GrowthProspectStatus[] = [
  "contactado",
  "demo_enviada",
];

const STATUS_LABELS: Record<GrowthProspectStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  demo_enviada: "Demo enviada",
  demo_agendada: "Demo agendada",
  piloto_activo: "Piloto activo",
  esperando_pago: "Esperando pago",
  pagado: "Pagado",
  perdido: "Perdido",
};

function getTodayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function cloneWorkspace(workspace: GrowthWorkspace) {
  return JSON.parse(JSON.stringify(workspace)) as GrowthWorkspace;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}`;
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

function nextProspectStatus(status: GrowthProspectStatus): GrowthProspectStatus {
  if (status === "nuevo") return "contactado";
  if (status === "contactado") return "demo_enviada";
  if (status === "demo_enviada") return "demo_agendada";
  if (status === "demo_agendada") return "piloto_activo";
  if (status === "piloto_activo") return "esperando_pago";
  if (status === "esperando_pago") return "pagado";
  if (status === "perdido") return "contactado";
  return status;
}

function nextProspectStep(status: GrowthProspectStatus) {
  if (status === "contactado") return "Esperar respuesta o enviar follow-up";
  if (status === "demo_enviada") return "Confirmar si vieron la demo";
  if (status === "demo_agendada") return "Hacer demo y activar piloto";
  if (status === "piloto_activo") return "Acompañar onboarding y primer valor";
  if (status === "esperando_pago") return "Cerrar pago o plan";
  if (status === "pagado") return "Pedir referido o caso de exito";
  return "Actualizar seguimiento";
}

function sortProspects(prospects: GrowthProspect[]) {
  const statusWeight: Record<GrowthProspectStatus, number> = {
    nuevo: 0,
    contactado: 1,
    demo_enviada: 2,
    demo_agendada: 3,
    piloto_activo: 4,
    esperando_pago: 5,
    pagado: 6,
    perdido: 7,
  };

  return [...prospects].sort((left, right) => {
    if (statusWeight[left.estado] !== statusWeight[right.estado]) {
      return statusWeight[left.estado] - statusWeight[right.estado];
    }

    return compareDate(
      left.fechaProximoSeguimiento,
      right.fechaProximoSeguimiento
    );
  });
}

function sortClients(clients: GrowthClientAccount[]) {
  return [...clients].sort((left, right) => {
    if (left.estadoPago !== right.estadoPago) {
      const weight = { vencido: 0, pendiente: 1, pagado: 2 };
      return weight[left.estadoPago] - weight[right.estadoPago];
    }

    return compareDate(left.fechaVencimiento, right.fechaVencimiento);
  });
}

function sortMarketingTasks(tasks: GrowthMarketingTask[]) {
  return [...tasks].sort((left, right) =>
    compareDate(left.fecha, right.fecha)
  );
}

function buildTodayWork(workspace: GrowthWorkspace): GrowthTodayItem[] {
  const prospects = workspace.prospects;
  const clients = workspace.clientAccounts;
  const marketing = workspace.marketingTasks;

  const tareasPendientes = marketing.filter(
    (item) => item.estado === "pendiente" || item.estado === "en_proceso"
  );
  const seguimientosAtrasados = prospects.filter(
    (item) =>
      !TERMINAL_PROSPECT_STATUSES.includes(item.estado) &&
      isOnOrBeforeToday(item.fechaProximoSeguimiento)
  );
  const demosPorHacer = prospects.filter((item) =>
    DEMO_PENDING_STATUSES.includes(item.estado)
  );
  const clientesPorCobrar = clients.filter(
    (item) => item.estadoPago === "pendiente" || item.estadoPago === "vencido"
  );
  const cuentasPorConfigurar = clients.filter(
    (item) =>
      item.onboarding !== "completado" ||
      !item.pwaInstalada ||
      !item.videosEnviados ||
      !item.primeraCotizacionCreada
  );

  const queues: Array<Omit<GrowthTodayItem, "count" | "names">> = [
    {
      id: "tareas_pendientes",
      title: "Tareas pendientes",
      priorityLabel: "Media",
      nextStep: "Cerrar contenido o acciones comerciales abiertas.",
      actionLabel: "Ver marketing",
      targetTab: "marketing",
    },
    {
      id: "seguimientos_atrasados",
      title: "Seguimientos atrasados",
      priorityLabel: "Alta",
      nextStep: "Retomar conversaciones con fecha vencida.",
      actionLabel: "Ver prospectos",
      targetTab: "prospectos",
    },
    {
      id: "demos_por_hacer",
      title: "Demos por hacer",
      priorityLabel: "Alta",
      nextStep: "Mover contactos calientes a demo concreta.",
      actionLabel: "Ver demos",
      targetTab: "prospectos",
    },
    {
      id: "clientes_por_cobrar",
      title: "Clientes por cobrar",
      priorityLabel: "Alta",
      nextStep: "Cobrar o reactivar cuentas con pago pendiente.",
      actionLabel: "Ver pagos",
      targetTab: "clientes",
    },
    {
      id: "cuentas_por_configurar",
      title: "Cuentas por configurar",
      priorityLabel: "Media",
      nextStep: "Terminar onboarding, PWA, videos o primera cotizacion.",
      actionLabel: "Ver clientes",
      targetTab: "clientes",
    },
  ];

  const counts: Record<GrowthWorkQueue, { count: number; names: string[] }> = {
    tareas_pendientes: {
      count: tareasPendientes.length,
      names: tareasPendientes.slice(0, 3).map((item) => item.campanaCanal),
    },
    seguimientos_atrasados: {
      count: seguimientosAtrasados.length,
      names: seguimientosAtrasados.slice(0, 3).map((item) => item.empresa),
    },
    demos_por_hacer: {
      count: demosPorHacer.length,
      names: demosPorHacer.slice(0, 3).map((item) => item.empresa),
    },
    clientes_por_cobrar: {
      count: clientesPorCobrar.length,
      names: clientesPorCobrar.slice(0, 3).map((item) => item.empresa),
    },
    cuentas_por_configurar: {
      count: cuentasPorConfigurar.length,
      names: cuentasPorConfigurar.slice(0, 3).map((item) => item.empresa),
    },
  };

  return queues.map((queue) => ({
    ...queue,
    count: counts[queue.id].count,
    names: counts[queue.id].names,
  }));
}

async function persistWorkspace(nextWorkspace: GrowthWorkspace) {
  return growthDashboardRepository.saveWorkspace(nextWorkspace);
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
      id: createId("prospecto"),
      createdAt: now,
      updatedAt: now,
      dataStatus: "manual",
    });
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
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
            dataStatus: patch.dataStatus ?? "manual",
            updatedAt: now,
          }
        : prospect
    );
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
  },
  async advanceProspect(workspace: GrowthWorkspace, prospectId: string) {
    const prospect = workspace.prospects.find((item) => item.id === prospectId);

    if (!prospect) {
      return workspace;
    }

    const nextStatus = nextProspectStatus(prospect.estado);

    return growthDashboardService.updateProspect(workspace, prospectId, {
      estado: nextStatus,
      proximoPaso: nextProspectStep(nextStatus),
      fechaProximoSeguimiento:
        nextStatus === "pagado"
          ? prospect.fechaProximoSeguimiento
          : getTodayYmd(),
    });
  },
  async deleteProspect(workspace: GrowthWorkspace, prospectId: string) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.prospects = nextWorkspace.prospects.filter(
      (item) => item.id !== prospectId
    );
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
  },
  async addClient(workspace: GrowthWorkspace, input: CreateGrowthClientInput) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.clientAccounts.unshift({
      ...input,
      id: createId("cliente"),
      createdAt: now,
      updatedAt: now,
      dataStatus: "manual",
    });
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
  },
  async updateClient(
    workspace: GrowthWorkspace,
    clientId: string,
    patch: UpdateGrowthClientInput
  ) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.clientAccounts = nextWorkspace.clientAccounts.map((client) =>
      client.id === clientId
        ? {
            ...client,
            ...patch,
            dataStatus: patch.dataStatus ?? "manual",
            updatedAt: now,
          }
        : client
    );
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
  },
  async deleteClient(workspace: GrowthWorkspace, clientId: string) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.clientAccounts = nextWorkspace.clientAccounts.filter(
      (item) => item.id !== clientId
    );
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
  },
  async addMarketingTask(
    workspace: GrowthWorkspace,
    input: CreateGrowthMarketingTaskInput
  ) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.marketingTasks.unshift({
      ...input,
      id: createId("marketing"),
      createdAt: now,
      updatedAt: now,
      dataStatus: "manual",
    });
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
  },
  async updateMarketingTask(
    workspace: GrowthWorkspace,
    taskId: string,
    patch: UpdateGrowthMarketingTaskInput
  ) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.marketingTasks = nextWorkspace.marketingTasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            ...patch,
            dataStatus: patch.dataStatus ?? "manual",
            updatedAt: now,
          }
        : task
    );
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
  },
  async deleteMarketingTask(workspace: GrowthWorkspace, taskId: string) {
    const now = new Date().toISOString();
    const nextWorkspace = cloneWorkspace(workspace);
    nextWorkspace.marketingTasks = nextWorkspace.marketingTasks.filter(
      (item) => item.id !== taskId
    );
    nextWorkspace.updatedAt = now;

    return persistWorkspace(nextWorkspace);
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

    return persistWorkspace(nextWorkspace);
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

    return persistWorkspace(nextWorkspace);
  },
  buildDashboardViewModel(
    workspace: GrowthWorkspace,
    currentTab: GrowthPanelTab
  ): GrowthDashboardViewModel {
    const prospects = sortProspects(workspace.prospects);
    const clientAccounts = sortClients(workspace.clientAccounts);
    const marketingTasks = sortMarketingTasks(workspace.marketingTasks);

    return {
      title: "Panel fundador Ventora",
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
      workToday: buildTodayWork(workspace),
      prospects,
      clientAccounts,
      marketingTasks,
      settings: workspace.settings,
      manualMetrics: workspace.manualMetrics,
      tabs: [
        { id: "trabajo", label: "Trabajo de hoy" },
        { id: "prospectos", label: "Prospectos" },
        { id: "clientes", label: "Clientes y pagos" },
        { id: "marketing", label: "Marketing y tareas" },
      ],
      counts: {
        prospectosActivos: prospects.filter(
          (item) => !TERMINAL_PROSPECT_STATUSES.includes(item.estado)
        ).length,
        clientesActivos: clientAccounts.length,
        marketingPendiente: marketingTasks.filter(
          (item) => item.estado === "pendiente" || item.estado === "en_proceso"
        ).length,
      },
    };
  },
  getProspectStatusLabel(status: GrowthProspectStatus) {
    return STATUS_LABELS[status];
  },
  getStatusActionLabel(status: GrowthProspectStatus) {
    if (status === "nuevo") return "Marcar contactado";
    if (status === "contactado") return "Demo enviada";
    if (status === "demo_enviada") return "Demo agendada";
    if (status === "demo_agendada") return "Activar piloto";
    if (status === "piloto_activo") return "Esperando pago";
    if (status === "esperando_pago") return "Marcar pagado";
    if (status === "perdido") return "Reactivar";
    return "Actualizado";
  },
  getDataStatusLabel(status: "real" | "manual" | "mock") {
    if (status === "real") return "Real";
    if (status === "manual") return "Manual";
    return "Mock";
  },
  getProspectStatuses(): GrowthProspectStatus[] {
    return Object.keys(STATUS_LABELS) as GrowthProspectStatus[];
  },
};
