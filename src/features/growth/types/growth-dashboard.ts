export type GrowthDataStatus = "real" | "manual" | "mock";

export type GrowthPanelTab =
  | "trabajo"
  | "prospectos"
  | "clientes"
  | "marketing";

export type GrowthWorkQueue =
  | "tareas_pendientes"
  | "seguimientos_atrasados"
  | "demos_por_hacer"
  | "clientes_por_cobrar"
  | "cuentas_por_configurar";

export type GrowthProspectStatus =
  | "nuevo"
  | "investigado"
  | "listo_para_contactar"
  | "contactado"
  | "respondio"
  | "calificado"
  | "demo_agendada"
  | "piloto_activo"
  | "activado"
  | "pagado"
  | "sin_respuesta"
  | "no_calza"
  | "no_contactar"
  // compat lectura legacy local v3
  | "demo_enviada"
  | "esperando_pago"
  | "perdido";

export type GrowthClientPlan =
  | "founder_full"
  | "quote_only"
  | "mensual"
  | "trial";

export type GrowthPaymentStatus = "pendiente" | "pagado" | "vencido";

export type GrowthOnboardingStatus = "pendiente" | "en_proceso" | "completado";

export type GrowthMarketingStatus =
  | "pendiente"
  | "en_proceso"
  | "publicado"
  | "cerrado";

export type GrowthSettings = {
  periodStartDate: string;
  periodEndDate: string;
  monthlyMrrGoalClp: number;
  monthlyPaidGoal: number;
  monthlyPilotGoal: number;
  dailyContactGoal: number;
  monthlyPriceClp: number;
  annualPriceClp: number;
  activeChannels: string[];
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
  nombre: string;
  empresa: string;
  whatsapp: string;
  ciudad: string;
  origen: string;
  estado: GrowthProspectStatus;
  proximoPaso: string;
  fechaProximoSeguimiento: string;
  notas: string;
  dataStatus: GrowthDataStatus;
  convertedOrganizationId?: number | null;
  legacySourceId?: string | null;
  segmento?: string | null;
  rubro?: string | null;
  noContactar?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GrowthClientAccount = {
  id: string;
  empresa: string;
  contacto: string;
  whatsapp: string;
  correoAcceso: string;
  plan: GrowthClientPlan;
  montoPagadoClp: number;
  estadoPago: GrowthPaymentStatus;
  fechaInicio: string;
  fechaVencimiento: string;
  onboarding: GrowthOnboardingStatus;
  pwaInstalada: boolean;
  videosEnviados: boolean;
  primeraCotizacionCreada: boolean;
  notas: string;
  dataStatus: GrowthDataStatus;
  createdAt: string;
  updatedAt: string;
};

export type GrowthMarketingTask = {
  id: string;
  campanaCanal: string;
  mensajeUsado: string;
  contenidoPendiente: string;
  fecha: string;
  estado: GrowthMarketingStatus;
  resultado: string;
  notas: string;
  dataStatus: GrowthDataStatus;
  prospectId?: string | null;
  tipo?: string;
  prioridad?: string;
  createdAt: string;
  updatedAt: string;
};

export type GrowthWorkspace = {
  workspaceId?: string;
  settings: GrowthSettings;
  manualMetrics: GrowthManualMetrics;
  prospects: GrowthProspect[];
  clientAccounts: GrowthClientAccount[];
  marketingTasks: GrowthMarketingTask[];
  experimentos?: unknown[];
  updatedAt: string;
};

export type GrowthTodayItem = {
  id: GrowthWorkQueue;
  title: string;
  count: number;
  names: string[];
  priorityLabel: string;
  nextStep: string;
  actionLabel: string;
  targetTab: GrowthPanelTab;
};

export type GrowthDashboardViewModel = {
  title: string;
  periodLabel: string;
  metaMensualLabel: string;
  mrrActualLabel: string;
  updatedAtLabel: string;
  currentTab: GrowthPanelTab;
  workToday: GrowthTodayItem[];
  prospects: GrowthProspect[];
  clientAccounts: GrowthClientAccount[];
  marketingTasks: GrowthMarketingTask[];
  settings: GrowthSettings;
  manualMetrics: GrowthManualMetrics;
  realMetrics: {
    mrrClp: number;
    arrClp: number;
    activeCustomers: number;
    trialCustomers: number;
  } | null;
  tabs: Array<{ id: GrowthPanelTab; label: string }>;
  counts: {
    prospectosActivos: number;
    clientesActivos: number;
    marketingPendiente: number;
  };
};

export type CreateGrowthProspectInput = Omit<
  GrowthProspect,
  "id" | "createdAt" | "updatedAt" | "dataStatus"
>;

export type UpdateGrowthProspectInput = Partial<
  Omit<GrowthProspect, "id" | "createdAt">
>;

export type CreateGrowthClientInput = Omit<
  GrowthClientAccount,
  "id" | "createdAt" | "updatedAt" | "dataStatus"
>;

export type UpdateGrowthClientInput = Partial<
  Omit<GrowthClientAccount, "id" | "createdAt">
>;

export type CreateGrowthMarketingTaskInput = Omit<
  GrowthMarketingTask,
  "id" | "createdAt" | "updatedAt" | "dataStatus"
>;

export type UpdateGrowthMarketingTaskInput = Partial<
  Omit<GrowthMarketingTask, "id" | "createdAt">
>;

export type UpdateGrowthSettingsInput = Partial<GrowthSettings>;

export type UpdateGrowthManualMetricsInput = Partial<GrowthManualMetrics>;
