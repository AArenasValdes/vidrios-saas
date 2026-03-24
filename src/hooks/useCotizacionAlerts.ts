"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cotizacionesAppService } from "@/services/cotizaciones.service";
import { buildCotizacionAlerts } from "@/services/cotizacion-alerts.service";
import type { CotizacionAlert } from "@/services/cotizacion-alerts.service";
import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";

const COTIZACIONES_STORAGE_PREFIX = "vidrios-saas:cotizaciones:";

type CotizacionesCacheEntry = {
  organizationId: string;
  cotizaciones: CotizacionWorkflowRecord[];
};

function getCotizacionesStorageKey(organizationKey: string) {
  return `${COTIZACIONES_STORAGE_PREFIX}${organizationKey}`;
}

function readCachedCotizaciones(organizationKey: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(
      getCotizacionesStorageKey(organizationKey)
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CotizacionesCacheEntry;
    return Array.isArray(parsed.cotizaciones) ? parsed.cotizaciones : [];
  } catch {
    return [];
  }
}

type UseCotizacionAlertsOptions = {
  autoRefresh?: boolean;
  refreshOnVisibility?: boolean;
  pollingIntervalMs?: number;
};

export function useCotizacionAlerts(
  organizationId: string | number | null | undefined,
  options: UseCotizacionAlertsOptions = {}
) {
  const [alerts, setAlerts] = useState<CotizacionAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const autoRefresh = options.autoRefresh ?? true;
  const refreshOnVisibility = options.refreshOnVisibility ?? autoRefresh;
  const pollingIntervalMs = options.pollingIntervalMs ?? 45000;

  const refresh = useCallback(async () => {
    if (!organizationId) {
      if (isMountedRef.current) {
        setAlerts([]);
        setError(null);
        setIsLoading(false);
      }
      return;
    }

    try {
      if (isMountedRef.current) {
        setIsLoading(true);
      }

      const records = await cotizacionesAppService.listWorkflowByOrganizationId(
        organizationId
      );

      if (!isMountedRef.current) {
        return;
      }

      setAlerts(buildCotizacionAlerts(records));
      setError(null);
    } catch (loadError) {
      if (!isMountedRef.current) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron actualizar las alertas"
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [organizationId]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!organizationId) {
      setAlerts([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const organizationKey = String(organizationId);
    const cachedRecords = readCachedCotizaciones(organizationKey);
    setAlerts(buildCotizacionAlerts(cachedRecords));
    setError(null);

    if (autoRefresh) {
      void refresh();
    }
  }, [autoRefresh, organizationId, refresh]);

  useEffect(() => {
    if (!organizationId || !refreshOnVisibility) {
      return;
    }

    const handleWindowFocus = () => {
      void refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [organizationId, refresh, refreshOnVisibility]);

  useEffect(() => {
    if (!organizationId || !autoRefresh || pollingIntervalMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void refresh();
    }, pollingIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefresh, organizationId, pollingIntervalMs, refresh]);

  return {
    alerts,
    error,
    isLoading,
    refresh,
  };
}
