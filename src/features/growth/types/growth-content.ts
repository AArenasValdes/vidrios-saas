export const GROWTH_CONTENT_PILLARS = [
  "dolor_transformacion",
  "demo_producto",
  "onboarding",
  "objecion",
  "oferta",
] as const;

export const GROWTH_CONTENT_FORMATS = [
  "reel",
  "carrusel",
  "story",
  "demo_largo",
  "onboarding",
] as const;

export const GROWTH_CONTENT_CHANNELS = [
  "instagram",
  "facebook",
  "grupos",
  "tiktok",
  "youtube",
  "whatsapp",
  "interno",
] as const;

export const GROWTH_CONTENT_OBJECTIVES = [
  "generar_demos",
  "activar_prueba",
  "primera_cotizacion",
  "primer_pdf",
  "configurar_lineas",
  "aclarar_objecion",
] as const;

export const GROWTH_CONTENT_STATUSES = [
  "borrador",
  "revision",
  "aprobado",
  "programado",
  "publicado",
  "pausado",
  "ganador",
  "archivado",
] as const;

export const GROWTH_CLAIM_REVIEW_STATUSES = ["pendiente", "aprobado", "bloqueado"] as const;

export type GrowthContentPillar = (typeof GROWTH_CONTENT_PILLARS)[number];
export type GrowthContentFormat = (typeof GROWTH_CONTENT_FORMATS)[number];
export type GrowthContentChannel = (typeof GROWTH_CONTENT_CHANNELS)[number];
export type GrowthContentObjective = (typeof GROWTH_CONTENT_OBJECTIVES)[number];
export type GrowthContentStatus = (typeof GROWTH_CONTENT_STATUSES)[number];
export type GrowthClaimReviewStatus = (typeof GROWTH_CLAIM_REVIEW_STATUSES)[number];

export type GrowthContentManualMetrics = {
  alcance: number | null;
  interacciones: number | null;
  comentarios: number | null;
  mensajesDemo: number | null;
  demos: number | null;
  pagos: number | null;
};

export type GrowthContentMetadata = {
  grupoNombre: string | null;
  grupoSegmento: string | null;
  grupoRegion: string | null;
  publicacionUrl: string | null;
  piezaBaseId: string | null;
  metricas: GrowthContentManualMetrics;
};

export type GrowthContentItem = {
  id: string;
  workspaceId: string;
  contentId: string;
  titulo: string;
  pilar: GrowthContentPillar;
  formato: GrowthContentFormat;
  canal: GrowthContentChannel;
  objetivo: GrowthContentObjective;
  hook: string | null;
  cta: string;
  guion: string | null;
  caption: string | null;
  campaignKey: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  estado: GrowthContentStatus;
  claimReviewStatus: GrowthClaimReviewStatus;
  claimReviewNotes: string | null;
  metadata: GrowthContentMetadata;
  programadoPara: string | null;
  publicadoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
};

export type CreateGrowthContentItemInput = {
  contentId: string;
  titulo: string;
  pilar: GrowthContentPillar;
  formato: GrowthContentFormat;
  canal: GrowthContentChannel;
  objetivo?: GrowthContentObjective;
  hook?: string | null;
  cta?: string;
  guion?: string | null;
  caption?: string | null;
  campaignKey?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  estado?: GrowthContentStatus;
  claimReviewStatus?: GrowthClaimReviewStatus;
  claimReviewNotes?: string | null;
  metadata?: Partial<GrowthContentMetadata> | null;
  programadoPara?: string | null;
};

export type UpdateGrowthContentItemInput = Partial<CreateGrowthContentItemInput> & {
  id: string;
  eliminado?: boolean;
};
