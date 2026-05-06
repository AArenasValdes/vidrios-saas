import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

export async function getCotizacionesResumenByOrganizationId(
  organizationId: string | number
): Promise<CotizacionWorkflowRecord[]> {
  void organizationId;

  const response = await fetch("/api/cotizaciones/resumen", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { cotizaciones?: CotizacionWorkflowRecord[]; error?: string }
    | null;

  if (!response.ok || !payload?.cotizaciones) {
    throw new Error(payload?.error ?? "No se pudieron cargar las cotizaciones");
  }

  return payload.cotizaciones;
}
