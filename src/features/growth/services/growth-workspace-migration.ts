import type {
  GrowthProspect,
  GrowthProspectStatus,
  GrowthWorkspace,
} from "@/features/growth/types/growth-dashboard";

type LegacyProspectV2 = {
  id: string;
  empresa: string;
  rubro?: string;
  canal?: string;
  contactoPublico?: string;
  regionComuna?: string;
  score?: string;
  estado?: string;
  prioridad?: string;
  porQueCalza?: string;
  anguloPrimerMensaje?: string;
  fuenteUrl?: string;
  proximoPaso?: string;
  fechaProximoContacto?: string;
  dataStatus?: GrowthProspect["dataStatus"];
  createdAt?: string;
  updatedAt?: string;
};

type LegacyWorkspaceV2 = {
  settings: GrowthWorkspace["settings"];
  manualMetrics: GrowthWorkspace["manualMetrics"];
  prospects: LegacyProspectV2[];
  experiments?: unknown[];
  updatedAt: string;
};

const LEGACY_STATUS_MAP: Record<string, GrowthProspectStatus> = {
  Nuevo: "nuevo",
  Contactado: "contactado",
  Respondio: "demo_enviada",
  "Demo agendada": "demo_agendada",
  "Demo realizada": "demo_agendada",
  Piloto: "piloto_activo",
  Pagado: "pagado",
  Perdido: "perdido",
  Pausado: "perdido",
};

function extractWhatsapp(value: string | undefined) {
  if (!value?.trim()) {
    return "";
  }

  const match = value.match(/\+?\d[\d\s]{7,}/);
  return match?.[0]?.trim() ?? value.trim();
}

function migrateProspectV2(prospect: LegacyProspectV2): GrowthProspect {
  const now = new Date().toISOString();
  const notas = [
    prospect.porQueCalza,
    prospect.anguloPrimerMensaje,
    prospect.fuenteUrl ? `Fuente: ${prospect.fuenteUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: prospect.id,
    nombre: "",
    empresa: prospect.empresa ?? "",
    whatsapp: extractWhatsapp(prospect.contactoPublico),
    ciudad: prospect.regionComuna ?? "",
    origen: prospect.canal ?? "Manual",
    estado: LEGACY_STATUS_MAP[prospect.estado ?? ""] ?? "nuevo",
    proximoPaso: prospect.proximoPaso ?? "Primer contacto",
    fechaProximoSeguimiento:
      prospect.fechaProximoContacto ?? new Date().toISOString().slice(0, 10),
    notas,
    dataStatus: prospect.dataStatus ?? "manual",
    createdAt: prospect.createdAt ?? now,
    updatedAt: prospect.updatedAt ?? now,
  };
}

export function migrateWorkspaceV2ToV3(raw: LegacyWorkspaceV2): GrowthWorkspace {
  return {
    settings: raw.settings,
    manualMetrics: raw.manualMetrics,
    prospects: (raw.prospects ?? []).map(migrateProspectV2),
    clientAccounts: [],
    marketingTasks: [],
    updatedAt: raw.updatedAt,
  };
}

export function isLegacyWorkspaceV2(value: unknown): value is LegacyWorkspaceV2 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const workspace = value as LegacyWorkspaceV2;
  const firstProspect = workspace.prospects?.[0];

  if (!firstProspect) {
    return Array.isArray(workspace.experiments);
  }

  return (
    "fechaProximoContacto" in firstProspect ||
    "contactoPublico" in firstProspect ||
    "canal" in firstProspect
  );
}

export function isGrowthWorkspaceV3(value: unknown): value is GrowthWorkspace {
  if (!value || typeof value !== "object") {
    return false;
  }

  const workspace = value as GrowthWorkspace;
  return (
    Array.isArray(workspace.prospects) &&
    Array.isArray(workspace.clientAccounts) &&
    Array.isArray(workspace.marketingTasks)
  );
}
