"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useSolicitudesContacto(enabled = true) {
  const [solicitudes, setSolicitudes] = useState<SolicitudContacto[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSolicitudes = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const response = await fetch("/api/solicitudes", {
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

      setSolicitudes(payload?.solicitudes ?? []);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsRefreshing(false);
      setIsReady(true);
    }
  }, []);

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
      } catch (nextError) {
        setSolicitudes(previous);
        setError(getErrorMessage(nextError));
        throw nextError;
      }
    },
    [solicitudes]
  );

  useEffect(() => {
    if (!enabled) {
      setSolicitudes([]);
      setIsRefreshing(false);
      setIsReady(true);
      setError(null);
      return;
    }

    void loadSolicitudes();
  }, [enabled, loadSolicitudes]);

  return {
    solicitudes,
    isReady,
    isRefreshing,
    error,
    refreshSolicitudes: loadSolicitudes,
    updateSolicitudEstado,
  };
}
