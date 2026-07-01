export type PublicPageStatus = "no_configurada" | "borrador" | "publicada";

export type AdminPublicChannelSummary = {
  pageStatus: PublicPageStatus;
  pageStatusLabel: string;
  slug: string | null;
  publicPageUrl: string | null;
  solicitudesTotal: number;
  solicitudesLast30Days: number;
  solicitudesPending: number;
  lastSolicitudAt: string | null;
  lastSolicitanteNombre: string | null;
  oldestPendingAt: string | null;
  whatsappConfigured: boolean;
  formActive: boolean;
  companyDataComplete: boolean;
  scheduleConfigured: boolean;
  recommendedStatus: string;
  quotesFromRequestsAvailable: false;
};

export type AdminPublicChannelDetail = AdminPublicChannelSummary & {
  recentSolicitudes: Array<{
    id: string;
    solicitanteNombre: string;
    estado: string;
    estadoLabel: string;
    creadoEn: string;
    relativeAt: string;
  }>;
};

export type AdminPublicChannelListItem = {
  pageStatusLabel: string;
  solicitudesLast30Days: number;
  lastSolicitudLabel: string | null;
  solicitudesPending: number;
};
