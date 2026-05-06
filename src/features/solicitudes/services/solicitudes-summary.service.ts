import type { SolicitudContacto } from "@/features/solicitudes/types/solicitud-contacto";

export async function getSolicitudesResumen(): Promise<SolicitudContacto[]> {
  const response = await fetch("/api/solicitudes/resumen", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { solicitudes?: SolicitudContacto[]; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error ?? "No pudimos cargar las solicitudes por ahora."
    );
  }

  return payload?.solicitudes ?? [];
}
