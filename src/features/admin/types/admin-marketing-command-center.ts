import type { MarketingCommercialState } from "@/features/admin/types/admin-marketing";

export type MarketingSalesFunnelStageId =
  | "grupo"
  | "demo_msg"
  | "conversaciones"
  | "demos"
  | "pilotos"
  | "pagos";

export type MarketingSalesFunnelStage = {
  id: MarketingSalesFunnelStageId;
  label: string;
  count: number;
  detail: string;
};

export type MarketingAttentionLead = {
  id: string;
  name: string;
  company: string;
  originLabel: string;
  nextAction: string;
  nextActionTone: "default" | "overdue";
  ctaLabel: string;
  href: string;
  commercialState: MarketingCommercialState;
};

export type MarketingWeekStatus = "idea" | "guion" | "editado" | "programado" | "publicado" | "medir";

export type MarketingWeekDayItem = {
  id: string;
  title: string;
  channelLabel: string;
  formatLabel: string;
  status: MarketingWeekStatus;
  statusLabel: string;
  actionLabel: "preparar" | "agregar" | "resultados" | "calendario";
  actionText: string;
};

export type MarketingWeekDay = {
  dateKey: string;
  label: string;
  weekdayLabel: string;
  item: MarketingWeekDayItem | null;
};

export type MarketingSprintProgress = {
  title: string;
  detail: string;
  completed: number;
  total: number;
  percent: number;
  nextMilestone: string;
};

export type MarketingWeekContentSource = {
  id: string;
  title: string;
  formato: string;
  canal: string;
  estado: string;
  grupoNombre: string | null;
  programadoPara: string | null;
  publicadoEn: string | null;
  actualizadoEn: string;
  hasManualMetrics: boolean;
};
