import type { ClientesKpiTone } from "@/features/admin/services/admin-clientes-filters.service";

export type AdminTaskOrigin =
  | "prospectos"
  | "clientes"
  | "pagos"
  | "activacion"
  | "manual"
  | "solicitud_publica";

export type AdminTaskKind = "automatic" | "manual";

export type AdminTaskPriority = "alta" | "media" | "baja";

export type AdminTaskStatus =
  | "pendiente"
  | "vencida"
  | "hoy"
  | "proxima"
  | "completada"
  | "pospuesta";

export type AdminTaskActionType =
  | "whatsapp"
  | "llamar"
  | "confirmar_pago"
  | "activar_plan"
  | "extender_trial"
  | "agendar_demo"
  | "seguimiento"
  | "configuracion_inicial"
  | "renovacion"
  | "ver_prospecto"
  | "ver_solicitud"
  | "contactar"
  | "activar_cuenta"
  | "recuperar"
  | "recordar";

export type AdminTask = {
  id: string;
  kind: AdminTaskKind;
  origin: AdminTaskOrigin;
  actionType: AdminTaskActionType;
  priority: AdminTaskPriority;
  status: AdminTaskStatus;
  title: string;
  empresaNombre: string;
  contactoLabel: string | null;
  contexto: string;
  dueLabel: string;
  dueAt: string | null;
  primaryActionLabel: string;
  whatsappUrl: string | null;
  organizationId: number | null;
  prospectId: string | null;
  paymentId: number | null;
  solicitudId: string | null;
  manualTaskId: string | null;
  publicPageUrl: string | null;
  href: string;
  completedAt: string | null;
};

export type AdminTaskKpi = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  subtitle: string;
  tone: ClientesKpiTone;
};

export type AdminTaskUpcomingGroup = {
  id: string;
  label: string;
  tasks: AdminTask[];
};

export type AdminTaskCompletedEvent = {
  id: string;
  empresaNombre: string;
  label: string;
  relativeAt: string;
  href: string;
};

export type AdminTaskOriginSummary = {
  origin: AdminTaskOrigin;
  label: string;
  count: number;
  pct: number;
};

export type AdminTareasWorkspace = {
  syncedAt: string;
  tasks: AdminTask[];
  priorityTodayIds: string[];
  kpis: AdminTaskKpi[];
  upcomingGroups: AdminTaskUpcomingGroup[];
  completedEvents: AdminTaskCompletedEvent[];
  originSummary: AdminTaskOriginSummary[];
};
