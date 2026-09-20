import type { SolicitudContacto } from "@/features/solicitudes/types/solicitud-contacto";
import type { EstadoSolicitudContacto } from "@/features/solicitudes/types/solicitud-contacto";

export type SolicitudesResumenGlobal = {
  total: number;
  hoy: number;
  counts: Record<EstadoSolicitudContacto, number>;
};

const EMPTY_SOLICITUDES_COUNTS: Record<EstadoSolicitudContacto, number> = {
  nueva: 0,
  contactada: 0,
  cerrada: 0,
  descartada: 0,
};

export function createEmptySolicitudesResumenGlobal(): SolicitudesResumenGlobal {
  return {
    total: 0,
    hoy: 0,
    counts: { ...EMPTY_SOLICITUDES_COUNTS },
  };
}

export function aggregateSolicitudesResumenGlobal(
  rows: Array<{ estado?: string | null; creado_en?: string | null }>,
  now = new Date()
): SolicitudesResumenGlobal {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const summary = createEmptySolicitudesResumenGlobal();

  for (const row of rows) {
    const estado = row.estado;
    if (estado === "nueva" || estado === "contactada" || estado === "cerrada" || estado === "descartada") {
      summary.counts[estado] += 1;
    }

    summary.total += 1;

    if (row.creado_en) {
      const createdAt = new Date(row.creado_en).getTime();
      if (Number.isFinite(createdAt) && createdAt >= startOfToday) {
        summary.hoy += 1;
      }
    }
  }

  return summary;
}

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
