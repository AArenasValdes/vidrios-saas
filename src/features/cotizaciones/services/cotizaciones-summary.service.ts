import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

export type CotizacionesResumenPage = {
  cotizaciones: CotizacionWorkflowRecord[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
};

export type GetCotizacionesResumenParams = {
  page?: number;
  pageSize?: number;
  estado?: string | null;
  cliente?: string | null;
  period?: "all" | "this_month" | "last_month" | "last_90_days";
  order?: "updated_desc" | "total_desc" | "codigo_desc" | "estado";
  search?: string | null;
};

export async function getCotizacionesResumenPage(
  params: GetCotizacionesResumenParams = {}
): Promise<CotizacionesResumenPage> {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("pageSize", String(params.pageSize ?? 25));

  if (params.estado && params.estado !== "Todos") {
    searchParams.set("estado", params.estado);
  }

  if (params.cliente && params.cliente !== "Todos") {
    searchParams.set("cliente", params.cliente);
  }

  if (params.period && params.period !== "all") {
    searchParams.set("period", params.period);
  }

  if (params.order && params.order !== "updated_desc") {
    searchParams.set("order", params.order);
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const response = await fetch(`/api/cotizaciones/resumen?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | (CotizacionesResumenPage & { error?: string })
    | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error ?? "No se pudieron cargar las cotizaciones");
  }

  return {
    cotizaciones: payload.cotizaciones ?? [],
    totalCount: payload.totalCount ?? 0,
    hasMore: payload.hasMore ?? false,
    page: payload.page ?? params.page ?? 1,
    pageSize: payload.pageSize ?? params.pageSize ?? 25,
  };
}

export async function getCotizacionesResumenByOrganizationId(
  organizationId: string | number
): Promise<CotizacionWorkflowRecord[]> {
  void organizationId;
  const page = await getCotizacionesResumenPage({ page: 1, pageSize: 50 });
  return page.cotizaciones;
}
