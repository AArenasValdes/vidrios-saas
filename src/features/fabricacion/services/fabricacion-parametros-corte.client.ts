import type { FabricacionParametrosCorteConfirmados } from "@/features/fabricacion/services/fabricacion-parametros-corte.service";

type SettingsResponse = {
  settings?: {
    organizationId: number;
    perdidaCorteMm: number;
    despunteInicialMm: number;
    procedimiento: "por_pieza";
    confirmedBy: string;
    confirmedAt: string;
  } | null;
  error?: string;
};

export async function fetchFabricacionParametrosCorteDelTaller(): Promise<FabricacionParametrosCorteConfirmados | null> {
  const response = await fetch("/api/configuracion/fabricacion/parametros-corte", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => null) as SettingsResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "No pudimos consultar los parámetros del taller.");
  }
  const settings = payload?.settings;
  if (!settings) return null;
  return {
    perdidaCorteMm: settings.perdidaCorteMm,
    despunteInicialMm: settings.despunteInicialMm,
    procedimiento: settings.procedimiento,
    fuente: "Parámetros de corte confirmados por el taller.",
    largosComercialesConfirmados: false,
    confirmedBy: settings.confirmedBy,
    confirmedAt: settings.confirmedAt,
    organizationId: settings.organizationId,
  };
}
