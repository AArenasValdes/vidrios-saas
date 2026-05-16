"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCotizacionesResumenPage,
  type CotizacionesResumenGlobal,
  type CotizacionesResumenPage,
  type GetCotizacionesResumenParams,
} from "@/features/cotizaciones/services/cotizaciones-summary.service";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudieron cargar las cotizaciones.";
}

const STORAGE_KEY_PREFIX = "vidrios-saas:cotizaciones:resumen:v2";

type CotizacionesCachePayload = CotizacionesResumenPage;

type CotizacionesCacheEntry = {
  cacheKey: string;
  page: CotizacionesResumenPage;
};

const cotizacionesCache = new Map<string, CotizacionesCacheEntry>();
const cotizacionesPromiseByKey = new Map<string, Promise<CotizacionesResumenPage>>();

function buildStorageKey(cacheKey: string) {
  return `${STORAGE_KEY_PREFIX}:${cacheKey}`;
}

function buildQueryKey(options: GetCotizacionesResumenParams) {
  return [
    options.page ?? 1,
    options.pageSize ?? 25,
    options.estado ?? "Todos",
    options.cliente ?? "Todos",
    options.period ?? "all",
    options.order ?? "updated_desc",
    options.search?.trim().toLowerCase() ?? "",
  ].join(":");
}

function readCotizacionesCache(queryKey: string) {
  const warmCache = cotizacionesCache.get(queryKey);

  if (warmCache) {
    return warmCache.page;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(buildStorageKey(queryKey));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CotizacionesCachePayload | null;

    if (!parsed || !Array.isArray(parsed.cotizaciones)) {
      return null;
    }

    cotizacionesCache.set(queryKey, {
      cacheKey: queryKey,
      page: parsed,
    });

    return parsed;
  } catch {
    return null;
  }
}

function persistCotizacionesCache(queryKey: string, page: CotizacionesResumenPage) {
  cotizacionesCache.set(queryKey, {
    cacheKey: queryKey,
    page,
  });

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(buildStorageKey(queryKey), JSON.stringify(page));
  } catch {
    return;
  }
}

function scheduleIdleRefresh(callback: () => void) {
  if (typeof window === "undefined") {
    callback();
    return () => undefined;
  }

  const browserWindow = globalThis as Window &
    typeof globalThis & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

  if (typeof browserWindow.requestIdleCallback === "function") {
    const handle = browserWindow.requestIdleCallback(callback, { timeout: 1500 });
    return () => browserWindow.cancelIdleCallback?.(handle);
  }

  const timer = globalThis.setTimeout(callback, 700);
  return () => globalThis.clearTimeout(timer);
}

type UseCotizacionesResumenPageOptions = GetCotizacionesResumenParams;

export function useCotizacionesResumenPage(
  options: UseCotizacionesResumenPageOptions
) {
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
  const queryKey = useMemo(() => buildQueryKey(normalizedOptions), [normalizedOptions]);
  const cachedPage = useMemo(() => readCotizacionesCache(queryKey), [queryKey]);
  const [cotizaciones, setCotizaciones] = useState<CotizacionWorkflowRecord[]>(
    () => cachedPage?.cotizaciones ?? []
  );
  const [isReady, setIsReady] = useState(() => Boolean(cachedPage));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(() => cachedPage?.totalCount ?? 0);
  const [hasMore, setHasMore] = useState(() => cachedPage?.hasMore ?? false);
  const [summary, setSummary] = useState<CotizacionesResumenGlobal>(() =>
    cachedPage?.summary ?? {
      totalCount: cachedPage?.totalCount ?? 0,
      totalAmount: 0,
      approvedAmount: 0,
      counts: {
        borrador: 0,
        creada: 0,
        enviada: 0,
        aprobada: 0,
        rechazada: 0,
        terminada: 0,
      },
    }
  );

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const inFlightPromise = cotizacionesPromiseByKey.get(queryKey);
      const pagePromise =
        inFlightPromise ??
        getCotizacionesResumenPage(normalizedOptions).finally(() => {
          cotizacionesPromiseByKey.delete(queryKey);
        });

      if (!inFlightPromise) {
        cotizacionesPromiseByKey.set(queryKey, pagePromise);
      }

      const page = await pagePromise;
      setCotizaciones(page.cotizaciones);
      setTotalCount(page.totalCount);
      setHasMore(page.hasMore);
      setSummary(page.summary);
      persistCotizacionesCache(queryKey, page);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsRefreshing(false);
      setIsReady(true);
    }
  }, [normalizedOptions, queryKey]);

  useEffect(() => {
    const currentCachedPage = readCotizacionesCache(queryKey);

    if (currentCachedPage) {
      setCotizaciones(currentCachedPage.cotizaciones);
      setTotalCount(currentCachedPage.totalCount);
      setHasMore(currentCachedPage.hasMore);
      setSummary(
        currentCachedPage.summary ?? {
          totalCount: currentCachedPage.totalCount,
          totalAmount: 0,
          approvedAmount: 0,
          counts: {
            borrador: 0,
            creada: 0,
            enviada: 0,
            aprobada: 0,
            rechazada: 0,
            terminada: 0,
          },
        }
      );
      setIsReady(true);

      const cleanup = scheduleIdleRefresh(() => {
        void refresh();
      });

      return cleanup;
    }

    setCotizaciones([]);
    setTotalCount(0);
    setHasMore(false);
    setSummary({
      totalCount: 0,
      totalAmount: 0,
      approvedAmount: 0,
      counts: {
        borrador: 0,
        creada: 0,
        enviada: 0,
        aprobada: 0,
        rechazada: 0,
        terminada: 0,
      },
    });
    setIsReady(false);
    void refresh();
  }, [queryKey, refresh]);

  return {
    cotizaciones,
    isReady,
    isRefreshing,
    error,
    totalCount,
    hasMore,
    summary,
    refreshCotizacionesResumen: refresh,
  };
}
