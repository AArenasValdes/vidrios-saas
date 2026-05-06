import type { ClienteResumen } from "@/features/clientes/types/cliente";

export async function getClientesResumenByOrganizationId(
  organizationId: string | number
): Promise<ClienteResumen[]> {
  void organizationId;

  const response = await fetch("/api/clientes/resumen", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { clientes?: ClienteResumen[]; error?: string }
    | null;

  if (!response.ok || !payload?.clientes) {
    throw new Error(payload?.error ?? "No se pudieron cargar los clientes");
  }

  return payload.clientes;
}
