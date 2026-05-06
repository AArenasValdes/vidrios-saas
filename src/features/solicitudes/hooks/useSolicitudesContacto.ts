"use client";

import { useCallback, useEffect, useState } from "react";

import { getSolicitudesResumen } from "@/features/solicitudes/services/solicitudes-summary.service";
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

type SolicitudesCachePayload = {
  solicitudes: SolicitudContacto[];
};

type SolicitudesCacheEntry = {
  cacheKey: string;
  solicitudes: SolicitudContacto[];
};

const solicitudesCache = new Map<string, SolicitudesCacheEntry>();
const solicitudesPromiseByKey = new Map<string, Promise<SolicitudContacto[]>>();

function buildSolicitudesStorageKey(cacheKey: string) {
  return `${STORAGE_KEY_PREFIX}:${cacheKey}`;
}

function readSolicitudesCache(cacheKey: string) {
  const warmCache = solicitudesCache.get(cacheKey);

  if (warmCache) {
    return warmCache.solicitudes;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(buildSolicitudesStorageKey(cacheKey));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SolicitudesCachePayload | null;

    if (!parsed || !Array.isArray(parsed.solicitudes)) {
      return null;
    }

    solicitudesCache.set(cacheKey, {
      cacheKey,
      solicitudes: parsed.solicitudes,
    });

    return parsed.solicitudes;
  } catch {
    return null;
  }
}

function persistSolicitudesCache(cacheKey: string, solicitudes: SolicitudContacto[]) {
  solicitudesCache.set(cacheKey, {
    cacheKey,
    solicitudes,
  });

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      buildSolicitudesStorageKey(cacheKey),
      JSON.stringify({ solicitudes } satisfies SolicitudesCachePayload)
    );
  } catch {
    return;
  }
}

function clearSolicitudesCache(cacheKey: string) {
  solicitudesCache.delete(cacheKey);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(buildSolicitudesStorageKey(cacheKey));
  } catch {
    return;
  }
}

export function useSolicitudesContacto(enabled = true, cacheKey = "default") {
  const [solicitudes, setSolicitudes] = useState<SolicitudContacto[]>(() => {
    return readSolicitudesCache(cacheKey) ?? [];
  });
  const [isReady, setIsReady] = useState(() => {
    return Boolean(readSolicitudesCache(cacheKey));
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSolicitudes = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const inFlightPromise = solicitudesPromiseByKey.get(cacheKey);
      const dataPromise =
        inFlightPromise ??
        getSolicitudesResumen()
          .finally(() => {
            solicitudesPromiseByKey.delete(cacheKey);
          });

      if (!inFlightPromise) {
        solicitudesPromiseByKey.set(cacheKey, dataPromise);
      }

      const nextSolicitudes = await dataPromise;
      setSolicitudes(nextSolicitudes);
      persistSolicitudesCache(cacheKey, nextSolicitudes);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsRefreshing(false);
      setIsReady(true);
    }
  }, [cacheKey]);

  const updateSolicitudEstado = useCallback(
    async (id: string, estado: EstadoSolicitudContacto) => {
      const previous = solicitudes;

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

        setSolicitudes((current) =>
          current.map((solicitud) =>
            solicitud.id === id ? payload.solicitud! : solicitud
          )
        );
        persistSolicitudesCache(
          cacheKey,
          previous.map((solicitud) =>
            solicitud.id === id ? payload.solicitud! : solicitud
          )
        );
      } catch (nextError) {
        setSolicitudes(previous);
        persistSolicitudesCache(cacheKey, previous);
        setError(getErrorMessage(nextError));
        throw nextError;
      }
    },
    [cacheKey, solicitudes]
  );

  useEffect(() => {
    if (!enabled) {
      setSolicitudes([]);
      setIsRefreshing(false);
      setIsReady(true);
      setError(null);
      clearSolicitudesCache(cacheKey);
      return;
    }

    const cachedSolicitudes = readSolicitudesCache(cacheKey);

    if (cachedSolicitudes) {
      setSolicitudes(cachedSolicitudes);
      setIsReady(true);
    }

    void loadSolicitudes();
  }, [cacheKey, enabled, loadSolicitudes]);

  return {
    solicitudes,
    isReady,
    isRefreshing,
    error,
    refreshSolicitudes: loadSolicitudes,
    updateSolicitudEstado,
  };
}
