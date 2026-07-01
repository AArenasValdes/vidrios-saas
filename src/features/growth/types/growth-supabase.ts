export type GrowthDbProspectStatus =
  | "nuevo"
  | "investigado"
  | "listo_para_contactar"
  | "contactado"
  | "respondio"
  | "calificado"
  | "demo_agendada"
  | "piloto_activo"
  | "activado"
  | "esperando_pago"
  | "pagado"
  | "sin_respuesta"
  | "no_calza"
  | "no_contactar";

export type GrowthDbDataStatus = "real" | "manual" | "mock";

export type GrowthDbActivityType =
  | "nota"
  | "mensaje_enviado"
  | "respuesta"
  | "followup"
  | "demo"
  | "trial"
  | "activacion"
  | "pago"
  | "perdida"
  | "cambio_estado";

export type GrowthDbTaskType =
  | "contactar"
  | "followup"
  | "demo"
  | "activar_trial"
  | "recuperar_pago"
  | "revisar"
  | "otro";

export type GrowthDbTaskPriority = "alta" | "media" | "baja";

export type GrowthWorkspaceRow = {
  id: string;
  slug: string;
  nombre: string;
  configuracion_json: Record<string, unknown>;
  metricas_manuales_json: Record<string, unknown>;
  experimentos_json: unknown[];
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
};

export type GrowthWorkspaceMemberRow = {
  workspace_id: string;
  auth_user_id: string;
  rol: "admin" | "member";
  activo: boolean;
};

export type GrowthProspectRow = {
  id: string;
  workspace_id: string;
  legacy_source_id: string | null;
  empresa: string;
  contacto_nombre: string | null;
  telefono: string | null;
  correo: string | null;
  instagram_url: string | null;
  sitio_web: string | null;
  ciudad: string | null;
  region: string | null;
  rubro: string | null;
  fuente: string;
  segmento: string | null;
  senal_dolor: string | null;
  resumen_personalizacion: string | null;
  puntaje_prioridad: number;
  estado: GrowthDbProspectStatus;
  ultimo_contacto_en: string | null;
  proxima_accion_en: string | null;
  proxima_accion_tipo: string | null;
  converted_organization_id: number | null;
  motivo_perdida: string | null;
  no_contactar: boolean;
  data_status: GrowthDbDataStatus;
  creado_por_auth_user_id: string | null;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
};

export type GrowthActivityRow = {
  id: string;
  workspace_id: string;
  prospect_id: string;
  tipo: GrowthDbActivityType;
  canal: string | null;
  contenido: string | null;
  metadata_json: Record<string, unknown>;
  creado_por_auth_user_id: string | null;
  creado_en: string;
  eliminado_en: string | null;
};

export type GrowthTaskRow = {
  id: string;
  workspace_id: string;
  prospect_id: string | null;
  titulo: string;
  tipo: GrowthDbTaskType;
  prioridad: GrowthDbTaskPriority;
  vence_en: string | null;
  completada_en: string | null;
  metadata_json: Record<string, unknown>;
  creado_por_auth_user_id: string | null;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
};

export type GrowthImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export type GrowthProspectFilters = {
  estado?: string;
  fuente?: string;
  segmento?: string;
  proximaAccion?: string;
  q?: string;
};
