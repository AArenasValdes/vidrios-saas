import type {
  AdminTask,
  AdminTaskActionType,
  AdminTaskOrigin,
  AdminTaskPriority,
  AdminTaskStatus,
} from "@/features/admin/types/admin-tareas";
import { isRenewalTask } from "@/features/admin/services/admin-tareas-derivation.service";

export type TareasStatusFilter = AdminTaskStatus;
export type TareasPriorityFilter = AdminTaskPriority;
export type TareasOriginFilter = AdminTaskOrigin;
export type TareasActionFilter = AdminTaskActionType;

export type TareasFiltersState = {
  statuses: TareasStatusFilter[];
  priorities: TareasPriorityFilter[];
  origins: TareasOriginFilter[];
  actions: TareasActionFilter[];
  search: string;
  showCompleted: boolean;
};

export type TareasFilterChip = {
  id: string;
  group: "status" | "priority" | "origin" | "action";
  value: string;
  label: string;
};

export const EMPTY_TAREAS_FILTERS: TareasFiltersState = {
  statuses: [],
  priorities: [],
  origins: [],
  actions: [],
  search: "",
  showCompleted: false,
};

export const TAREAS_FILTER_LABELS = {
  status: {
    pendiente: "Pendientes",
    vencida: "Vencidas",
    hoy: "Hoy",
    proxima: "Próximas",
    completada: "Completadas",
    pospuesta: "Pospuestas",
  },
  priority: {
    alta: "Alta",
    media: "Media",
    baja: "Baja",
  },
  origin: {
    prospectos: "Prospecto Ventora",
    clientes: "Clientes",
    pagos: "Pagos y planes",
    activacion: "Activación",
    manual: "Manual",
    solicitud_publica: "Solicitud pública",
  },
  action: {
    whatsapp: "WhatsApp",
    llamar: "Llamar",
    confirmar_pago: "Confirmar pago",
    activar_plan: "Activar plan",
    extender_trial: "Extender trial",
    agendar_demo: "Agendar demo",
    seguimiento: "Seguimiento",
    configuracion_inicial: "Configuración inicial",
    renovacion: "Renovación",
    ver_prospecto: "Ver prospecto",
    ver_solicitud: "Ver solicitud",
    contactar: "Contactar",
    activar_cuenta: "Activar cuenta",
    recuperar: "Recuperar",
    recordar: "Recordar",
  },
} as const;

export const TAREAS_QUICK_VIEWS: Array<{
  id: string;
  label: string;
  apply: Partial<TareasFiltersState>;
}> = [
  { id: "hoy", label: "Hoy", apply: { statuses: ["hoy"] } },
  { id: "vencidas", label: "Vencidas", apply: { statuses: ["vencida"] } },
  { id: "alta", label: "Alta prioridad", apply: { priorities: ["alta"] } },
  { id: "pagos", label: "Pagos", apply: { origins: ["pagos"] } },
  { id: "activacion", label: "Activación", apply: { origins: ["activacion"] } },
  {
    id: "renovaciones",
    label: "Renovaciones",
    apply: { actions: ["renovacion", "recordar"] },
  },
  {
    id: "completadas",
    label: "Completadas",
    apply: { statuses: ["completada"], showCompleted: true },
  },
];

function matchesSearch(task: AdminTask, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [
    task.empresaNombre,
    task.contactoLabel,
    task.title,
    task.contexto,
    task.id,
    task.paymentId ? String(task.paymentId) : null,
    task.organizationId ? String(task.organizationId) : null,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

export function matchesTareasFilters(task: AdminTask, filters: TareasFiltersState) {
  if (!filters.showCompleted && task.status === "completada") {
    return false;
  }

  if (filters.showCompleted && task.status !== "completada") {
    return false;
  }

  if (!matchesSearch(task, filters.search)) {
    return false;
  }

  if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
    return false;
  }

  if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
    return false;
  }

  if (filters.origins.length > 0 && !filters.origins.includes(task.origin)) {
    return false;
  }

  if (filters.actions.length > 0) {
    const matchAction = filters.actions.some((action) => {
      if (action === "renovacion") return isRenewalTask(task);
      return task.actionType === action;
    });
    if (!matchAction) return false;
  }

  return true;
}

export function filterTareas(tasks: AdminTask[], filters: TareasFiltersState) {
  return tasks.filter((task) => matchesTareasFilters(task, filters));
}

export function hasTareasActiveFilters(filters: TareasFiltersState) {
  return (
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.origins.length > 0 ||
    filters.actions.length > 0
  );
}

export function buildTareasFilterChips(filters: TareasFiltersState): TareasFilterChip[] {
  const chips: TareasFilterChip[] = [];

  for (const value of filters.statuses) {
    chips.push({
      id: `status-${value}`,
      group: "status",
      value,
      label: TAREAS_FILTER_LABELS.status[value],
    });
  }

  for (const value of filters.priorities) {
    chips.push({
      id: `priority-${value}`,
      group: "priority",
      value,
      label: TAREAS_FILTER_LABELS.priority[value],
    });
  }

  for (const value of filters.origins) {
    chips.push({
      id: `origin-${value}`,
      group: "origin",
      value,
      label: TAREAS_FILTER_LABELS.origin[value],
    });
  }

  for (const value of filters.actions) {
    chips.push({
      id: `action-${value}`,
      group: "action",
      value,
      label: TAREAS_FILTER_LABELS.action[value],
    });
  }

  return chips;
}

export function removeTareasFilterChip(
  filters: TareasFiltersState,
  chip: TareasFilterChip
): TareasFiltersState {
  if (chip.group === "status") {
    return { ...filters, statuses: filters.statuses.filter((item) => item !== chip.value) };
  }
  if (chip.group === "priority") {
    return {
      ...filters,
      priorities: filters.priorities.filter((item) => item !== chip.value),
    };
  }
  if (chip.group === "origin") {
    return { ...filters, origins: filters.origins.filter((item) => item !== chip.value) };
  }
  return { ...filters, actions: filters.actions.filter((item) => item !== chip.value) };
}

export function parseTareasFiltersFromSearchParams(
  params: URLSearchParams
): TareasFiltersState {
  const readList = <T extends string>(key: string): T[] => {
    const raw = params.get(key);
    if (!raw) return [];
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean) as T[];
  };

  return {
    statuses: readList<TareasStatusFilter>("status"),
    priorities: readList<TareasPriorityFilter>("priority"),
    origins: readList<TareasOriginFilter>("origin"),
    actions: readList<TareasActionFilter>("action"),
    search: params.get("q") ?? "",
    showCompleted: params.get("view") === "completed",
  };
}

export function tareasFiltersToSearchParams(filters: TareasFiltersState) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.statuses.length) params.set("status", filters.statuses.join(","));
  if (filters.priorities.length) params.set("priority", filters.priorities.join(","));
  if (filters.origins.length) params.set("origin", filters.origins.join(","));
  if (filters.actions.length) params.set("action", filters.actions.join(","));
  if (filters.showCompleted) params.set("view", "completed");
  return params;
}

export function applyTareasKpiFilter(
  filters: TareasFiltersState,
  kpiId: string
): TareasFiltersState {
  if (kpiId === "today") {
    return { ...EMPTY_TAREAS_FILTERS, statuses: ["hoy", "vencida"] };
  }
  if (kpiId === "overdue") {
    return { ...EMPTY_TAREAS_FILTERS, statuses: ["vencida"] };
  }
  if (kpiId === "high_priority") {
    return { ...EMPTY_TAREAS_FILTERS, priorities: ["alta"] };
  }
  if (kpiId === "completed_week") {
    return { ...EMPTY_TAREAS_FILTERS, showCompleted: true, statuses: ["completada"] };
  }
  return filters;
}

export function applyTareasQuickView(
  filters: TareasFiltersState,
  viewId: string
): TareasFiltersState {
  const view = TAREAS_QUICK_VIEWS.find((item) => item.id === viewId);
  if (!view) return filters;
  return {
    ...EMPTY_TAREAS_FILTERS,
    search: filters.search,
    ...view.apply,
  };
}

export function buildTareasKpis(tasks: AdminTask[]) {
  const open = tasks.filter((task) => task.status !== "completada");
  const today = open.filter((task) => task.status === "hoy" || task.status === "vencida");
  const overdue = open.filter((task) => task.status === "vencida");
  const high = open.filter((task) => task.priority === "alta");
  const completedWeek = tasks.filter((task) => task.status === "completada");

  return [
    {
      id: "today",
      label: "Tareas para hoy",
      value: today.length,
      displayValue: String(today.length),
      subtitle: "requieren ejecución hoy",
      tone: "blue" as const,
    },
    {
      id: "overdue",
      label: "Vencidas",
      value: overdue.length,
      displayValue: String(overdue.length),
      subtitle: "requieren resolución inmediata",
      tone: "red" as const,
    },
    {
      id: "high_priority",
      label: "Alta prioridad",
      value: high.length,
      displayValue: String(high.length),
      subtitle: "impacto comercial alto",
      tone: "amber" as const,
    },
    {
      id: "completed_week",
      label: "Completadas esta semana",
      value: completedWeek.length,
      displayValue: String(completedWeek.length),
      subtitle: "seguimiento cerrado",
      tone: "green" as const,
    },
  ];
}
