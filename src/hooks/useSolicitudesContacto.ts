"use client";

import { useEffect, useState } from "react";

import type { SolicitudContacto } from "@/types/solicitud-contacto";

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

  async function loadSolicitudes() {
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
  }

  useEffect(() => {
    if (!enabled) {
      setSolicitudes([]);
      setIsRefreshing(false);
      setIsReady(true);
      setError(null);
      return;
    }

    void loadSolicitudes();
  }, [enabled]);

  return {
    solicitudes,
    isReady,
    isRefreshing,
    error,
    refreshSolicitudes: loadSolicitudes,
  };
}
