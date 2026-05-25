"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getSolicitudesResumen,
  type SolicitudesResumenPage,
  type SolicitudesResumenGlobal,
} from "@/features/solicitudes/services/solicitudes-summary.service";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { assertSubscriptionAllowsWrite } from "@/features/subscriptions/services/subscription-status.service";
import type {
  EstadoSolicitudContacto,
  SolicitudContacto,
} from "@/features/solicitudes/types/solicitud-contacto";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "No pudimos cargar las solicitudes por ahora.";
}

const STORAGE_KEY_PREFIX = "vidrios-saas:solicitudes";

type SolicitudesCachePayload = SolicitudesResumenPage;

type SolicitudesCacheEntry = {
  cacheKey: string;
  page: SolicitudesResumenPage;
};

type UseSolicitudesContactoOptions = {
  pageSize?: number;
  estado?: EstadoSolicitudContacto | "all";
  search?: string;
};

const solicitudesCache = new Map<string, SolicitudesCacheEntry>();
const solicitudesPromiseByKey = new Map<string, Promise<SolicitudesResumenPage>>();

function buildSolicitudesStorageKey(cacheKey: string) {
  return `${STORAGE_KEY_PREFIX}:${cacheKey}`;
}

function buildQueryKey(cacheKey: string, options: UseSolicitudesContactoOptions) {
  return [
    cacheKey,
    options.pageSize ?? 25,
    options.estado ?? "all",
    options.search?.trim().toLowerCase() ?? "",
  ].join(":");
}

function readSolicitudesCache(queryKey: string) {
  const warmCache = solicitudesCache.get(queryKey);

  if (warmCache) {
    return warmCache.page;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(buildSolicitudesStorageKey(queryKey));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SolicitudesCachePayload | null;

    if (!parsed || !Array.isArray(parsed.solicitudes)) {
      return null;
    }

    solicitudesCache.set(queryKey, {
      cacheKey: queryKey,
      page: parsed,
    });

    return parsed;
  } catch {
    return null;
  }
}

function persistSolicitudesCache(queryKey: string, page: SolicitudesResumenPage) {
  solicitudesCache.set(queryKey, {
    cacheKey: queryKey,
    page,
  });

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      buildSolicitudesStorageKey(queryKey),
      JSON.stringify(page satisfies SolicitudesCachePayload)
    );
  } catch {
    return;
  }
}

function clearSolicitudesCache(queryKey: string) {
  solicitudesCache.delete(queryKey);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(buildSolicitudesStorageKey(queryKey));
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

  const timer = globalThis.setTimeout(callback, 900);
  return () => globalThis.clearTimeout(timer);
}

export function useSolicitudesContacto(
  enabled = true,
  cacheKey = "default",
  options: UseSolicitudesContactoOptions = {}
) {
  const { profile, isReady: isProfileReady } = useOrganizationProfile();
  const pageSizeOption = options.pageSize ?? 25;
  const estadoOption = options.estado;
  const searchOption = options.search;
  const queryKey = useMemo(
    () =>
      buildQueryKey(cacheKey, {
        pageSize: pageSizeOption,
        estado: estadoOption,
        search: searchOption,
      }),
    [cacheKey, estadoOption, pageSizeOption, searchOption]
  );
  const cachedPage = useMemo(() => readSolicitudesCache(queryKey), [queryKey]);
  const [solicitudes, setSolicitudes] = useState<SolicitudContacto[]>(
    () => cachedPage?.solicitudes ?? []
  );
  const [isReady, setIsReady] = useState(() => Boolean(cachedPage));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => cachedPage?.page ?? 1);
  const [pageSize] = useState(pageSizeOption);
  const [totalCount, setTotalCount] = useState(() => cachedPage?.totalCount ?? 0);
  const [hasMore, setHasMore] = useState(() => cachedPage?.hasMore ?? false);
  const [summary, setSummary] = useState<SolicitudesResumenGlobal>(() =>
    cachedPage?.summary ?? {
      total: 0,
      hoy: 0,
      counts: {
        nueva: 0,
        contactada: 0,
        cerrada: 0,
        descartada: 0,
      },
    }
  );
  const solicitudesRef = useRef(solicitudes);
  const summaryRef = useRef(summary);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    solicitudesRef.current = solicitudes;
  }, [solicitudes]);

  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);

  const loadSolicitudes = useCallback(
    async (targetPage = 1, mode: "replace" | "append" = "replace") => {
      const requestVersion = ++requestVersionRef.current;

      try {
        if (mode === "append") {
          setIsLoadingMore(true);
        } else {
          setIsRefreshing(true);
        }
        setError(null);

        const requestKey = `${queryKey}:page:${targetPage}`;
        const inFlightPromise = solicitudesPromiseByKey.get(requestKey);
        const dataPromise =
          inFlightPromise ??
          getSolicitudesResumen({
            page: targetPage,
            pageSize,
            estado: estadoOption,
            search: searchOption,
          }).finally(() => {
            solicitudesPromiseByKey.delete(requestKey);
          });

        if (!inFlightPromise) {
          solicitudesPromiseByKey.set(requestKey, dataPromise);
        }

        const nextPage = await dataPromise;
        if (requestVersion !== requestVersionRef.current) {
          return;
        }
        const nextSolicitudes =
          mode === "append"
            ? [
                ...solicitudesRef.current,
                ...nextPage.solicitudes.filter(
                  (item) =>
                    !solicitudesRef.current.some((current) => current.id === item.id)
                ),
              ]
            : nextPage.solicitudes;

        setSolicitudes(nextSolicitudes);
        setPage(nextPage.page);
        setTotalCount(nextPage.totalCount);
        setHasMore(nextPage.hasMore);
        setSummary(nextPage.summary);
        persistSolicitudesCache(queryKey, {
          ...nextPage,
          solicitudes: nextSolicitudes,
        });
      } catch (nextError) {
        if (requestVersion !== requestVersionRef.current) {
          return;
        }
        setError(getErrorMessage(nextError));
      } finally {
        if (requestVersion !== requestVersionRef.current) {
          return;
        }
        setIsLoadingMore(false);
        setIsRefreshing(false);
        setIsReady(true);
      }
    },
    [estadoOption, pageSize, queryKey, searchOption]
  );

  const updateSolicitudEstado = useCallback(
    async (id: string, estado: EstadoSolicitudContacto) => {
      if (!isProfileReady || !profile) {
        throw new Error("Estamos validando el estado de tu cuenta. Intenta nuevamente.");
      }

      assertSubscriptionAllowsWrite(profile.subscription);
      const previous = solicitudesRef.current;

      try {
        setError(null);
        setSolicitudes((current) =>
          current.map((solicitud) =>
            solicitud.id === id
              ? {
                  ...solicitud,
                  estado,
                  actualizadoEn: new Date().toISOString(),
                }
              : solicitud
          )
        );

        const response = await fetch("/api/solicitudes", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, estado }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { solicitud?: SolicitudContacto; error?: string }
          | null;

        if (!response.ok || !payload?.solicitud) {
          throw new Error(
            payload?.error ?? "No pudimos actualizar la solicitud."
          );
        }

        const nextSolicitudes = previous.map((solicitud) =>
          solicitud.id === id ? payload.solicitud! : solicitud
        );
        const previousState = previous.find((solicitud) => solicitud.id === id)?.estado ?? null;
        const nextSummary =
          previousState && previousState !== estado
            ? {
                ...summaryRef.current,
                counts: {
                  ...summaryRef.current.counts,
                  [previousState]: Math.max(
                    0,
                    summaryRef.current.counts[previousState] - 1
                  ),
                  [estado]: summaryRef.current.counts[estado] + 1,
                },
              }
            : summaryRef.current;

        setSolicitudes(nextSolicitudes);
        setSummary(nextSummary);
        persistSolicitudesCache(queryKey, {
          solicitudes: nextSolicitudes,
          totalCount,
          hasMore,
          page,
          pageSize,
          summary: nextSummary,
        });
      } catch (nextError) {
        setSolicitudes(previous);
        persistSolicitudesCache(queryKey, {
          solicitudes: previous,
          totalCount,
          hasMore,
          page,
          pageSize,
          summary: summaryRef.current,
        });
        setError(getErrorMessage(nextError));
        throw nextError;
      }
    },
    [hasMore, isProfileReady, page, pageSize, profile, queryKey, totalCount]
  );

  useEffect(() => {
    if (!enabled) {
      setSolicitudes([]);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      setIsReady(true);
      setError(null);
      setPage(1);
      setTotalCount(0);
      setHasMore(false);
      clearSolicitudesCache(queryKey);
      return;
    }

    const currentCachedPage = readSolicitudesCache(queryKey);

    if (currentCachedPage) {
      setSolicitudes(currentCachedPage.solicitudes);
      setPage(currentCachedPage.page);
      setTotalCount(currentCachedPage.totalCount);
      setHasMore(currentCachedPage.hasMore);
      setSummary(currentCachedPage.summary);
      setIsReady(true);
      const cleanup = scheduleIdleRefresh(() => {
        void loadSolicitudes(1, "replace");
      });

      return cleanup;
    }

    setSolicitudes([]);
    setPage(1);
    setTotalCount(0);
    setHasMore(false);
    setSummary({
      total: 0,
      hoy: 0,
      counts: {
        nueva: 0,
        contactada: 0,
        cerrada: 0,
        descartada: 0,
      },
    });
    setIsReady(false);
    void loadSolicitudes(1, "replace");
  }, [enabled, loadSolicitudes, queryKey]);

  const loadMoreSolicitudes = useCallback(async () => {
    if (!hasMore || isLoadingMore || isRefreshing) {
      return;
    }

    await loadSolicitudes(page + 1, "append");
  }, [hasMore, isLoadingMore, isRefreshing, loadSolicitudes, page]);

  return {
    solicitudes,
    isReady,
    isRefreshing,
    isLoadingMore,
    error,
    page,
    pageSize,
    totalCount,
    hasMore,
    summary,
    refreshSolicitudes: () => loadSolicitudes(1, "replace"),
    loadMoreSolicitudes,
    updateSolicitudEstado,
  };
}
