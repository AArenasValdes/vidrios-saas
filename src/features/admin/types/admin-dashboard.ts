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
  revenue: {
    label: string;
    previousLabel: string;
    collectedClp: number;
    previousMonthCollectedClp: number;
    changePct: number | null;
    newSalesClp: number;
    renewalsClp: number;
    newCustomers: number;
    renewalPayments: number;
  };
  focusToday: AdminDashboardFocusItem[];
  kpis: {
    clientesActivos: number;
    trialsActivos: number;
    cuentasPorResolver: number;
    trialsSinCotizacion: number;
  };
  productUsage: {
    quotesCreated: number;
    pdfsGenerated: number;
    organizationsWithQuotes: number;
  };
  outboundProspecting: {
    activeProspects: number;
    contactedProspects: number;
  };
  actionItems: AdminDashboardActionItem[];
  weeklyRevenue: AdminDashboardWeeklyRevenue[];
  accountHealth: AdminDashboardHealthBucket[];
  recentActivity: AdminDashboardActivityItem[];
};
