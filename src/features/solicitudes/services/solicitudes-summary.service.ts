import type { SolicitudContacto } from "@/features/solicitudes/types/solicitud-contacto";
import type { EstadoSolicitudContacto } from "@/features/solicitudes/types/solicitud-contacto";

export type SolicitudesResumenGlobal = {
  total: number;
  hoy: number;
  counts: Record<EstadoSolicitudContacto, number>;
};

export type SolicitudesResumenPage = {
  solicitudes: SolicitudContacto[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
  summary: SolicitudesResumenGlobal;
};

type GetSolicitudesResumenParams = {
  page?: number;
  pageSize?: number;
  estado?: string | null;
  search?: string | null;
};

export async function getSolicitudesResumen(
  params: GetSolicitudesResumenParams = {}
): Promise<SolicitudesResumenPage> {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("pageSize", String(params.pageSize ?? 25));

  if (params.estado && params.estado !== "all") {
    searchParams.set("estado", params.estado);
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const response = await fetch(`/api/solicitudes/resumen?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | (SolicitudesResumenPage & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error ?? "No pudimos cargar las solicitudes por ahora."
    );
  }

  return {
    solicitudes: payload?.solicitudes ?? [],
    totalCount: payload?.totalCount ?? 0,
    hasMore: payload?.hasMore ?? false,
    page: payload?.page ?? params.page ?? 1,
    pageSize: payload?.pageSize ?? params.pageSize ?? 25,
    summary: payload?.summary ?? {
      total: payload?.totalCount ?? 0,
      hoy: 0,
      counts: {
        nueva: 0,
        contactada: 0,
        cerrada: 0,
        descartada: 0,
      },
    },
  };
}
