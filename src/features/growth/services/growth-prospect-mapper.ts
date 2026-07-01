import type {
  CreateGrowthProspectInput,
  GrowthProspect,
  GrowthProspectStatus,
  GrowthSettings,
  GrowthManualMetrics,
  GrowthWorkspace,
} from "@/features/growth/types/growth-dashboard";
import type {
  GrowthDbProspectStatus,
  GrowthProspectRow,
  GrowthTaskRow,
  GrowthWorkspaceRow,
} from "@/features/growth/types/growth-supabase";

const UI_TO_DB_STATUS: Record<GrowthProspectStatus, GrowthDbProspectStatus> = {
  nuevo: "nuevo",
  investigado: "investigado",
  listo_para_contactar: "listo_para_contactar",
  contactado: "contactado",
  respondio: "respondio",
  calificado: "calificado",
  demo_agendada: "demo_agendada",
  piloto_activo: "piloto_activo",
  activado: "activado",
  esperando_pago: "esperando_pago",
  pagado: "pagado",
  sin_respuesta: "sin_respuesta",
  no_calza: "no_calza",
  no_contactar: "no_contactar",
  // compat legacy v3 local
  demo_enviada: "respondio",
  perdido: "sin_respuesta",
};

const DB_TO_UI_STATUS: Record<GrowthDbProspectStatus, GrowthProspectStatus> = {
  nuevo: "nuevo",
  investigado: "investigado",
  listo_para_contactar: "listo_para_contactar",
  contactado: "contactado",
  respondio: "respondio",
  calificado: "calificado",
  demo_agendada: "demo_agendada",
  piloto_activo: "piloto_activo",
  activado: "activado",
  esperando_pago: "esperando_pago",
  pagado: "pagado",
  sin_respuesta: "sin_respuesta",
  no_calza: "no_calza",
  no_contactar: "no_contactar",
};

const LEGACY_V3_TO_DB: Record<string, GrowthDbProspectStatus> = {
  nuevo: "nuevo",
  contactado: "contactado",
  demo_enviada: "respondio",
  demo_agendada: "demo_agendada",
  piloto_activo: "piloto_activo",
  esperando_pago: "activado",
  pagado: "pagado",
  perdido: "sin_respuesta",
};

export function mapUiStatusToDb(
  status: GrowthProspectStatus | string
): GrowthDbProspectStatus {
  if (status in UI_TO_DB_STATUS) {
    return UI_TO_DB_STATUS[status as GrowthProspectStatus];
  }
  if (status in LEGACY_V3_TO_DB) {
    return LEGACY_V3_TO_DB[status];
  }
  return "nuevo";
}

export function mapDbStatusToUi(status: GrowthDbProspectStatus): GrowthProspectStatus {
  return DB_TO_UI_STATUS[status] ?? "nuevo";
}

function toYmd(iso: string | null | undefined) {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

function ymdToTimestamptz(ymd: string) {
  return `${ymd}T12:00:00.000Z`;
}

export function mapProspectRowToUi(row: GrowthProspectRow): GrowthProspect {
  return {
    id: row.id,
    nombre: row.contacto_nombre ?? "",
    empresa: row.empresa,
    whatsapp: row.telefono ?? "",
    ciudad: [row.ciudad, row.region].filter(Boolean).join(" / "),
    origen: row.fuente,
    estado: mapDbStatusToUi(row.estado),
    proximoPaso: row.proxima_accion_tipo ?? "Actualizar seguimiento",
    fechaProximoSeguimiento: toYmd(row.proxima_accion_en),
    notas: [row.senal_dolor, row.resumen_personalizacion].filter(Boolean).join("\n\n"),
    dataStatus: row.data_status,
    convertedOrganizationId: row.converted_organization_id,
    legacySourceId: row.legacy_source_id,
    segmento: row.segmento,
    rubro: row.rubro,
    noContactar: row.no_contactar,
    createdAt: row.creado_en,
    updatedAt: row.actualizado_en,
  };
}

export function mapUiProspectToInsert(
  workspaceId: string,
  input: CreateGrowthProspectInput,
  authUserId: string | null
): Omit<GrowthProspectRow, "id" | "creado_en" | "actualizado_en" | "eliminado_en"> {
  return {
    workspace_id: workspaceId,
    legacy_source_id: null,
    empresa: input.empresa,
    contacto_nombre: input.nombre || null,
    telefono: input.whatsapp || null,
    correo: null,
    instagram_url: null,
    sitio_web: null,
    ciudad: input.ciudad || null,
    region: null,
    rubro: input.rubro ?? null,
    fuente: input.origen || "manual",
    segmento: input.segmento ?? null,
    senal_dolor: null,
    resumen_personalizacion: input.notas || null,
    puntaje_prioridad: 0,
    estado: mapUiStatusToDb(input.estado),
    ultimo_contacto_en: null,
    proxima_accion_en: ymdToTimestamptz(input.fechaProximoSeguimiento),
    proxima_accion_tipo: input.proximoPaso || null,
    converted_organization_id: input.convertedOrganizationId ?? null,
    motivo_perdida: null,
    no_contactar: input.noContactar ?? false,
    data_status: "manual",
    creado_por_auth_user_id: authUserId,
  };
}

export function mapLegacyV3ProspectToInsert(
  workspaceId: string,
  prospect: GrowthProspect,
  authUserId: string | null
): Omit<GrowthProspectRow, "id" | "creado_en" | "actualizado_en" | "eliminado_en"> {
  return {
    workspace_id: workspaceId,
    legacy_source_id: prospect.id,
    empresa: prospect.empresa,
    contacto_nombre: prospect.nombre || null,
    telefono: prospect.whatsapp || null,
    correo: null,
    instagram_url: null,
    sitio_web: null,
    ciudad: prospect.ciudad || null,
    region: null,
    rubro: prospect.rubro ?? null,
    fuente: prospect.origen || "manual",
    segmento: prospect.segmento ?? null,
    senal_dolor: null,
    resumen_personalizacion: prospect.notas || null,
    puntaje_prioridad: 0,
    estado: mapUiStatusToDb(prospect.estado),
    ultimo_contacto_en: null,
    proxima_accion_en: ymdToTimestamptz(prospect.fechaProximoSeguimiento),
    proxima_accion_tipo: prospect.proximoPaso || null,
    converted_organization_id: prospect.convertedOrganizationId ?? null,
    motivo_perdida: null,
    no_contactar: prospect.noContactar ?? false,
    data_status: prospect.dataStatus,
    creado_por_auth_user_id: authUserId,
  };
}

const DEFAULT_SETTINGS: GrowthSettings = {
  periodStartDate: "2026-05-21",
  periodEndDate: "2026-06-30",
  monthlyMrrGoalClp: 120000,
  monthlyPaidGoal: 12,
  monthlyPilotGoal: 8,
  dailyContactGoal: 6,
  monthlyPriceClp: 10000,
  annualPriceClp: 100000,
  activeChannels: ["Facebook", "Instagram", "Google Maps", "WhatsApp", "TikTok", "Referidos"],
  priorityRegions: ["Coquimbo", "Biobio", "Araucania", "RM", "Valparaiso"],
};

const DEFAULT_MANUAL_METRICS: GrowthManualMetrics = {
  mrrActualClp: 0,
  clientesPagadosActuales: 0,
  pilotosActivosActuales: 0,
  notas: "",
  dataStatus: "manual",
};

export function buildWorkspaceFromRows(input: {
  workspace: GrowthWorkspaceRow;
  prospects: GrowthProspectRow[];
  tasks: GrowthTaskRow[];
}): GrowthWorkspace {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(input.workspace.configuracion_json as Partial<GrowthSettings>),
  };
  const manualMetrics = {
    ...DEFAULT_MANUAL_METRICS,
    ...(input.workspace.metricas_manuales_json as Partial<GrowthManualMetrics>),
  };

  return {
    settings,
    manualMetrics,
    prospects: input.prospects.map(mapProspectRowToUi),
    clientAccounts: [],
    marketingTasks: input.tasks
      .filter((task) => task.eliminado_en === null)
      .map((task) => ({
        id: task.id,
        campanaCanal: task.titulo,
        mensajeUsado: String(task.metadata_json.mensajeUsado ?? ""),
        contenidoPendiente: String(task.metadata_json.contenidoPendiente ?? ""),
        fecha: toYmd(task.vence_en),
        estado:
          task.completada_en !== null
            ? ("cerrado" as const)
            : ("pendiente" as const),
        resultado: String(task.metadata_json.resultado ?? ""),
        notas: String(task.metadata_json.notas ?? ""),
        dataStatus: "real" as const,
        createdAt: task.creado_en,
        updatedAt: task.actualizado_en,
        prospectId: task.prospect_id,
        tipo: task.tipo,
        prioridad: task.prioridad,
      })),
    updatedAt: input.workspace.actualizado_en,
    workspaceId: input.workspace.id,
    experimentos: input.workspace.experimentos_json,
  };
}
