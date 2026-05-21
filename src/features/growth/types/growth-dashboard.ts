export type GrowthDataStatus = "real" | "manual" | "mock";

export type GrowthPanelTab = "resumen" | "manuales" | "experimentos";

export type GrowthFocusFilter =
  | "todos"
  | "followups"
  | "contactar"
  | "demos"
  | "pilotos";

export type GrowthChannel =
  | "Facebook"
  | "Instagram"
  | "Google Maps"
  | "WhatsApp"
  | "TikTok"
  | "Referidos";

export type GrowthProspectStatus =
  | "Nuevo"
  | "Contactado"
  | "Respondio"
  | "Demo agendada"
  | "Demo realizada"
  | "Piloto"
  | "Pagado"
  | "Perdido"
  | "Pausado";

export type GrowthPriority = "A1" | "A2" | "B1" | "B2";

export type GrowthSettings = {
  periodStartDate: string;
  periodEndDate: string;
  monthlyMrrGoalClp: number;
  monthlyPaidGoal: number;
  monthlyPilotGoal: number;
  dailyContactGoal: number;
  monthlyPriceClp: number;
  annualPriceClp: number;
  activeChannels: GrowthChannel[];
  priorityRegions: string[];
};

export type GrowthManualMetrics = {
  mrrActualClp: number;
  clientesPagadosActuales: number;
  pilotosActivosActuales: number;
  notas: string;
  dataStatus: GrowthDataStatus;
};

export type GrowthProspect = {
  id: string;
  empresa: string;
  rubro: string;
  canal: GrowthChannel;
  contactoPublico: string;
  regionComuna: string;
  score: string;
  estado: GrowthProspectStatus;
  prioridad: GrowthPriority;
  porQueCalza: string;
  anguloPrimerMensaje: string;
  fuenteUrl?: string;
  proximoPaso: string;
  fechaProximoContacto: string;
  dataStatus: GrowthDataStatus;
  createdAt: string;
  updatedAt: string;
};

export type GrowthExperiment = {
  id: string;
  nombre: string;
  objetivo: string;
  estado: "idea" | "activo" | "medicion" | "cerrado";
  owner: string;
  kpi: string;
  dataStatus: GrowthDataStatus;
};

export type GrowthWorkspace = {
  settings: GrowthSettings;
  manualMetrics: GrowthManualMetrics;
  prospects: GrowthProspect[];
  experiments: GrowthExperiment[];
  updatedAt: string;
};

export type GrowthKpi = {
  id:
    | "encontrados"
    | "contactados"
    | "respondieron"
    | "demos"
    | "pilotos"
    | "pagos"
    | "mrr";
  label: string;
  value: string;
  source: GrowthDataStatus;
};

export type GrowthFunnelMetrics = {
  encontrados: number;
  contactados: number;
  respondieron: number;
  demos: number;
  pilotos: number;
  pagos: number;
};

export type GrowthTodayItem = {
  id: Exclude<GrowthFocusFilter, "todos">;
  title: string;
  count: number;
  names: string[];
  priorityLabel: string;
  nextStep: string;
  actionLabel: string;
};

export type GrowthChannelPerformance = {
  channel: GrowthChannel;
  total: number;
  avanzados: number;
  effectivenessPct: number;
};

export type GrowthProjection = {
  months: 6 | 12;
  paidClients: number;
  mrrClp: number;
};

export type GrowthDashboardViewModel = {
  title: string;
  periodLabel: string;
  metaMensualLabel: string;
  mrrActualLabel: string;
  updatedAtLabel: string;
  currentTab: GrowthPanelTab;
  focusFilter: GrowthFocusFilter;
  kpis: GrowthKpi[];
  funnel: GrowthFunnelMetrics;
  workToday: GrowthTodayItem[];
  visibleProspects: GrowthProspect[];
  allProspects: GrowthProspect[];
  channels: GrowthChannelPerformance[];
  topChannel: GrowthChannelPerformance | null;
  manualMetrics: GrowthManualMetrics;
  projections: GrowthProjection[];
  settings: GrowthSettings;
  experiments: GrowthExperiment[];
  tabs: Array<{ id: GrowthPanelTab; label: string }>;
};

export type CreateGrowthProspectInput = Omit<
  GrowthProspect,
  "id" | "createdAt" | "updatedAt" | "dataStatus"
>;

export type UpdateGrowthSettingsInput = Partial<GrowthSettings>;

export type UpdateGrowthManualMetricsInput = Partial<GrowthManualMetrics>;

export type UpdateGrowthProspectInput = Partial<
  Omit<GrowthProspect, "id" | "createdAt">
>;
