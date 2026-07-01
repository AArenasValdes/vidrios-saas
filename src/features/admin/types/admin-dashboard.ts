export type AdminDashboardFocusItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  actionLabel: string;
  tone: "danger" | "info" | "success";
};

export type AdminDashboardActionItem = {
  id: string;
  priority: "alta" | "media" | "baja";
  empresa: string;
  situacion: string;
  ultimaActividad: string;
  proximaAccion: string;
  href: string;
  actionLabel: string;
};

export type AdminDashboardWeeklyRevenue = {
  label: string;
  amountClp: number;
  goalClp: number;
};

export type AdminDashboardFunnelStage = {
  stage: string;
  count: number;
  conversionPct: number | null;
};

export type AdminDashboardHealthBucket = {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: "success" | "warning" | "danger" | "neutral";
};

export type AdminDashboardActivityItem = {
  id: string;
  type: string;
  label: string;
  subtitle?: string | null;
  at: string;
  href: string | null;
  secondaryHref?: string | null;
  secondaryLabel?: string | null;
};

export type AdminDashboard = {
  syncedAt: string;
  periodDays: number;
  revenue: {
    collectedClp: number;
    previousPeriodClp: number;
    changePct: number | null;
    goalClp: number;
    remainingClp: number;
    progressPct: number;
  };
  focusToday: AdminDashboardFocusItem[];
  kpis: {
    clientesActivos: number;
    trialsActivos: number;
    conversionTrialToPaidPct: number | null;
    prospectosNuevos: number;
  };
  actionItems: AdminDashboardActionItem[];
  weeklyRevenue: AdminDashboardWeeklyRevenue[];
  funnel: AdminDashboardFunnelStage[];
  accountHealth: AdminDashboardHealthBucket[];
  recentActivity: AdminDashboardActivityItem[];
};
