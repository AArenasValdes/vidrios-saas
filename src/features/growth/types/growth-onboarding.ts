export const GROWTH_ONBOARDING_STEPS = [
  "bienvenida",
  "primera_cotizacion",
  "pdf_whatsapp",
  "lineas_precios",
  "solicitudes_clientes",
  "items_constructor",
  "pauta_interna",
] as const;

export const GROWTH_ONBOARDING_DEVICES = ["movil", "escritorio", "ambos"] as const;
export const GROWTH_ONBOARDING_VIDEO_STATUSES = ["borrador", "listo", "archivado"] as const;
export const GROWTH_ONBOARDING_ASSIGNMENT_STATUSES = [
  "pendiente",
  "visto",
  "completado",
  "pausado",
] as const;

export type GrowthOnboardingStep = (typeof GROWTH_ONBOARDING_STEPS)[number];
export type GrowthOnboardingDevice = (typeof GROWTH_ONBOARDING_DEVICES)[number];
export type GrowthOnboardingVideoStatus = (typeof GROWTH_ONBOARDING_VIDEO_STATUSES)[number];
export type GrowthOnboardingAssignmentStatus =
  (typeof GROWTH_ONBOARDING_ASSIGNMENT_STATUSES)[number];

export type GrowthOnboardingVideo = {
  id: string;
  workspaceId: string;
  slug: string;
  titulo: string;
  resumen: string | null;
  paso: GrowthOnboardingStep;
  dispositivo: GrowthOnboardingDevice;
  duracionSegundos: number | null;
  videoUrl: string | null;
  estado: GrowthOnboardingVideoStatus;
  orden: number;
  creadoEn: string;
  actualizadoEn: string;
};

export type GrowthOnboardingAssignment = {
  id: string;
  workspaceId: string;
  organizationId: number;
  videoId: string;
  estado: GrowthOnboardingAssignmentStatus;
  asignadoEn: string;
  vistoEn: string | null;
  completadoEn: string | null;
  notas: string | null;
  actualizadoEn: string;
};

export type GrowthOnboardingEvent = {
  id: string;
  organizationId: number;
  assignmentId: string | null;
  videoId: string | null;
  cotizacionId: string | null;
  tipo: "video_abierto" | "video_completado" | "primera_cotizacion_creada" | "primer_pdf_descargado";
  fuente: "sistema" | "cliente" | "admin";
  ocurridoEn: string;
};

export type GrowthOnboardingOrganization = {
  organizationId: number;
  empresaNombre: string;
};

export type GrowthOnboardingWorkspace = {
  videos: GrowthOnboardingVideo[];
  assignments: GrowthOnboardingAssignment[];
  events: GrowthOnboardingEvent[];
  organizations: GrowthOnboardingOrganization[];
};

export type CreateGrowthOnboardingVideoInput = {
  slug: string;
  titulo: string;
  resumen?: string | null;
  paso: GrowthOnboardingStep;
  dispositivo: GrowthOnboardingDevice;
  duracionSegundos?: number | null;
  videoUrl?: string | null;
  estado?: GrowthOnboardingVideoStatus;
  orden?: number;
};

export type CreateGrowthOnboardingAssignmentInput = {
  organizationId: number;
  videoId: string;
  notas?: string | null;
};

export type UpdateGrowthOnboardingVideoInput = {
  id: string;
  estado?: GrowthOnboardingVideoStatus;
  videoUrl?: string | null;
  titulo?: string;
  resumen?: string | null;
  orden?: number;
};

export type UpdateGrowthOnboardingAssignmentInput = {
  id: string;
  estado: GrowthOnboardingAssignmentStatus;
};
