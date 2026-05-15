"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCotizacionesResumenPage,
  type GetCotizacionesResumenParams,
} from "@/features/cotizaciones/services/cotizaciones-summary.service";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudieron cargar las cotizaciones.";
}

type UseCotizacionesResumenPageOptions = GetCotizacionesResumenParams;

export function useCotizacionesResumenPage(
  options: UseCotizacionesResumenPageOptions
) {
  const [cotizaciones, setCotizaciones] = useState<CotizacionWorkflowRecord[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const normalizedOptions = useMemo(
    () => ({
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 25,
      estado: options.estado ?? null,
      cliente: options.cliente ?? null,
      period: options.period ?? "all",
      order: options.order ?? "updated_desc",
      search: options.search ?? null,
    }),
    [
      options.cliente,
      options.estado,
      options.order,
      options.page,
      options.pageSize,
      options.period,
      options.search,
    ]
  );

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const page = await getCotizacionesResumenPage(normalizedOptions);
      setCotizaciones(page.cotizaciones);
      setTotalCount(page.totalCount);
      setHasMore(page.hasMore);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsRefreshing(false);
      setIsReady(true);
    }
  }, [normalizedOptions]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    cotizaciones,
    isReady,
    isRefreshing,
    error,
    totalCount,
    hasMore,
    refreshCotizacionesResumen: refresh,
  };
}
