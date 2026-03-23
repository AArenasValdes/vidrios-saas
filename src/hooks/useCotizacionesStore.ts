"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { cotizacionesAppService } from "@/services/cotizaciones.service";
import type { Cliente } from "@/types/cliente";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowRecord,
  EstadoCotizacionWorkflow,
} from "@/types/cotizacion-workflow";

function sortCotizaciones(records: CotizacionWorkflowRecord[]) {
  return [...records].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

type CotizacionesCacheEntry = {
  organizationId: string;
  cotizaciones: CotizacionWorkflowRecord[];
  clientes: Cliente[];
};

const cotizacionesCache = new Map<string, CotizacionesCacheEntry>();
const cotizacionesPromiseByOrganization = new Map<
  string,
  Promise<CotizacionWorkflowRecord[]>
>();
const clientesPromiseByOrganization = new Map<string, Promise<Cliente[]>>();
const COTIZACIONES_STORAGE_PREFIX = "vidrios-saas:cotizaciones:";

export function __resetCotizacionesStoreTestState() {
  cotizacionesCache.clear();
  cotizacionesPromiseByOrganization.clear();
  clientesPromiseByOrganization.clear();
}

function getCotizacionesStorageKey(organizationKey: string) {
  return `${COTIZACIONES_STORAGE_PREFIX}${organizationKey}`;
}

function readCotizacionesCacheFromStorage(organizationKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      getCotizacionesStorageKey(organizationKey)
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CotizacionesCacheEntry;
  } catch {
    return null;
  }
}

function persistCotizacionesCache(entry: CotizacionesCacheEntry) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getCotizacionesStorageKey(entry.organizationId),
      JSON.stringify(entry)
    );
  } catch {
    return;
  }
}

function isConnectivityError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("internet_disconnected") ||
    message.includes("fetch")
  );
}

type SaveWorkflowInput = {
  draft: CotizacionWorkflowDraft;
  estado: EstadoCotizacionWorkflow;
  existingId?: string | number | null;
  existingCode?: string | null;
  existingClientId?: string | number | null;
  existingProjectId?: string | number | null;
};

type ManualResponseStatus = "pendiente" | "aprobada" | "rechazada" | "terminada";

type RefreshCotizacionesOptions = {
  includeClientes?: boolean;
};

export function useCotizacionesStore() {
  const { organizacionId, cargando } = useAuth();
  const [cotizaciones, setCotizaciones] = useState<CotizacionWorkflowRecord[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const activeRefreshIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastOrganizationIdRef = useRef<string | null>(null);
  const cotizacionesRef = useRef<CotizacionWorkflowRecord[]>([]);
  const clientesRef = useRef<Cliente[]>([]);
  const bootRetryCountRef = useRef(0);
  const bootRetryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    cotizacionesRef.current = cotizaciones;
  }, [cotizaciones]);

  useEffect(() => {
    clientesRef.current = clientes;
  }, [clientes]);

  const loadClientes = useCallback(async (organizationId: string | number) => {
    return cotizacionesAppService.listClientsByOrganizationId(organizationId);
  }, []);

  const ensureClientesLoaded = useCallback(async (options?: { force?: boolean }) => {
    if (!organizacionId) {
      return [];
    }

    const organizationKey = String(organizacionId);
    const force = options?.force ?? false;

    if (!force && clientesRef.current.length > 0) {
      return clientesRef.current;
    }

    const inFlightPromise = clientesPromiseByOrganization.get(organizationKey);

    if (inFlightPromise) {
      return inFlightPromise;
    }

    const clientRecordsPromise = loadClientes(organizacionId)
      .then((clientRecords) => {
        if (!isMountedRef.current) {
          return clientRecords;
        }

        setClientes(clientRecords);
        const nextCacheEntry = {
          organizationId: organizationKey,
          cotizaciones: cotizacionesRef.current,
          clientes: clientRecords,
        };
        cotizacionesCache.set(organizationKey, nextCacheEntry);
        persistCotizacionesCache(nextCacheEntry);

        return clientRecords;
      })
      .catch((loadError) => {
        if (isMountedRef.current && !isConnectivityError(loadError)) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los clientes"
          );
        }

        return clientesRef.current;
      })
      .finally(() => {
        clientesPromiseByOrganization.delete(organizationKey);
      });

    clientesPromiseByOrganization.set(organizationKey, clientRecordsPromise);

    return clientRecordsPromise;
  }, [loadClientes, organizacionId]);

  const refreshCotizaciones = useCallback(async (options: RefreshCotizacionesOptions = {}) => {
    const refreshId = ++activeRefreshIdRef.current;
    const includeClientes = options.includeClientes ?? true;

    if (!organizacionId) {
      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return;
      }

      setCotizaciones([]);
      setClientes([]);
      setError(null);
      setIsReady(true);
      return;
    }

    try {
      if (isMountedRef.current && refreshId === activeRefreshIdRef.current) {
        setIsRefreshing(true);
      }

      const organizationKey = String(organizacionId);
      const inFlightPromise = cotizacionesPromiseByOrganization.get(organizationKey);
      const recordsPromise =
        inFlightPromise ??
        cotizacionesAppService
          .listWorkflowByOrganizationId(organizacionId)
          .finally(() => cotizacionesPromiseByOrganization.delete(organizationKey));

      if (!inFlightPromise) {
        cotizacionesPromiseByOrganization.set(organizationKey, recordsPromise);
      }

      const records = await recordsPromise;
      const nextCotizaciones = sortCotizaciones(records);
      const hasWarmCache =
        nextCotizaciones.length > 0 ||
        (cotizacionesCache.get(organizationKey)?.cotizaciones.length ?? 0) > 0;

      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return;
      }

      cotizacionesRef.current = nextCotizaciones;
      setCotizaciones(nextCotizaciones);
      setError(null);
      const currentClientes =
        cotizacionesCache.get(organizationKey)?.clientes ?? clientesRef.current;
      const nextCacheEntry = {
        organizationId: organizationKey,
        cotizaciones: nextCotizaciones,
        clientes: currentClientes,
      };
      cotizacionesCache.set(organizationKey, nextCacheEntry);
      persistCotizacionesCache(nextCacheEntry);
      setIsReady(true);

      if (
        !hasWarmCache &&
        nextCotizaciones.length === 0 &&
        bootRetryCountRef.current < 1 &&
        typeof window !== "undefined"
      ) {
        bootRetryCountRef.current += 1;
        bootRetryTimeoutRef.current = window.setTimeout(() => {
          bootRetryTimeoutRef.current = null;
          void refreshCotizaciones(options);
        }, 500);
      }

      if (!includeClientes) {
        return;
      }

      const clientRecords = await ensureClientesLoaded({ force: true });

      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return;
      }

      const nextCacheWithClients = {
        ...nextCacheEntry,
        clientes: clientRecords,
      };
      cotizacionesCache.set(organizationKey, nextCacheWithClients);
      persistCotizacionesCache(nextCacheWithClients);
    } catch (error) {
      if (isConnectivityError(error)) {
        if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
          return;
        }

        setError(null);
        setIsReady(cotizacionesRef.current.length > 0);
        return;
      }

      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return;
      }

      setError(
        error instanceof Error ? error.message : "No se pudieron cargar las cotizaciones"
      );
      setIsReady(true);
    } finally {
      if (isMountedRef.current && refreshId === activeRefreshIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [ensureClientesLoaded, organizacionId]);

  useEffect(() => {
    const organizationKey = organizacionId ? String(organizacionId) : null;

    if (lastOrganizationIdRef.current !== organizationKey) {
      lastOrganizationIdRef.current = organizationKey;
      bootRetryCountRef.current = 0;
      if (bootRetryTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(bootRetryTimeoutRef.current);
        bootRetryTimeoutRef.current = null;
      }
      cotizacionesRef.current = [];
      clientesRef.current = [];
      setCotizaciones([]);
      setClientes([]);
      setError(null);
      setIsReady(false);
    }

    if (cargando) {
      return;
    }

    if (!organizacionId) {
      cotizacionesRef.current = [];
      clientesRef.current = [];
      setCotizaciones([]);
      setClientes([]);
      setError(null);
      setIsReady(true);
      setIsRefreshing(false);
      return;
    }

    const cached = cotizacionesCache.get(String(organizacionId));

    if (cached) {
      setCotizaciones(cached.cotizaciones);
      setClientes(cached.clientes);
      setIsReady(true);
    } else {
      const persisted = readCotizacionesCacheFromStorage(String(organizacionId));

      if (persisted) {
        setCotizaciones(persisted.cotizaciones);
        setClientes(persisted.clientes);
        cotizacionesCache.set(String(organizacionId), persisted);
        setIsReady(true);
      } else {
        setCotizaciones([]);
        setClientes([]);
        setIsReady(false);
      }
    }

    void refreshCotizaciones({ includeClientes: false });
  }, [cargando, organizacionId, refreshCotizaciones]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      activeRefreshIdRef.current += 1;
      if (bootRetryTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(bootRetryTimeoutRef.current);
        bootRetryTimeoutRef.current = null;
      }
    };
  }, []);

  const saveWorkflow = async (input: SaveWorkflowInput) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsSaving(true);

    try {
      const record = await cotizacionesAppService.saveWorkflow({
        organizationId: organizacionId,
        draft: input.draft,
        estado: input.estado,
        existingId: input.existingId,
        existingCode: input.existingCode,
        existingClientId: input.existingClientId,
        existingProjectId: input.existingProjectId,
      });

      const currentCotizaciones = cotizacionesRef.current;
      const nextCotizaciones = sortCotizaciones(
        currentCotizaciones.some((item) => item.id === record.id)
          ? currentCotizaciones.map((item) => (item.id === record.id ? record : item))
          : [record, ...currentCotizaciones]
      );
      let nextClientes = clientesRef.current;

      try {
        nextClientes = await loadClientes(organizacionId);
      } catch (error) {
        if (!isConnectivityError(error)) {
          throw error;
        }
      }

      cotizacionesRef.current = nextCotizaciones;
      clientesRef.current = nextClientes;
      setCotizaciones(nextCotizaciones);
      setClientes(nextClientes);
      const nextCacheEntry = {
        organizationId: String(organizacionId),
        cotizaciones: nextCotizaciones,
        clientes: nextClientes,
      };
      cotizacionesCache.set(String(organizacionId), nextCacheEntry);
      persistCotizacionesCache(nextCacheEntry);

      return record;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsSaving(true);

    try {
      await cotizacionesAppService.deleteWorkflow(id, organizacionId);

      const nextCotizaciones = cotizacionesRef.current.filter((item) => item.id !== id);

      cotizacionesRef.current = nextCotizaciones;
      setCotizaciones(nextCotizaciones);
      const nextCacheEntry = {
        organizationId: String(organizacionId),
        cotizaciones: nextCotizaciones,
        clientes: clientesRef.current,
      };
      cotizacionesCache.set(String(organizacionId), nextCacheEntry);
      persistCotizacionesCache(nextCacheEntry);
    } finally {
      setIsSaving(false);
    }
  };

  const updateManualResponseStatus = async (
    id: string,
    estado: ManualResponseStatus
  ) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsSaving(true);

    try {
      const record = await cotizacionesAppService.updateManualResponseStatus({
        id,
        organizationId: organizacionId,
        estado,
      });

      const currentCotizaciones = cotizacionesRef.current;
      const nextCotizaciones = sortCotizaciones(
        currentCotizaciones.some((item) => item.id === record.id)
          ? currentCotizaciones.map((item) => (item.id === record.id ? record : item))
          : [record, ...currentCotizaciones]
      );

      cotizacionesRef.current = nextCotizaciones;
      setCotizaciones(nextCotizaciones);
      const nextCacheEntry = {
        organizationId: String(organizacionId),
        cotizaciones: nextCotizaciones,
        clientes: clientesRef.current,
      };
      cotizacionesCache.set(String(organizacionId), nextCacheEntry);
      persistCotizacionesCache(nextCacheEntry);

      return record;
    } finally {
      setIsSaving(false);
    }
  };

  const getCotizacionById = (id: string) => {
    return cotizaciones.find((record) => record.id === id) ?? null;
  };

  const loadCotizacionById = async (id: string) => {
    if (!organizacionId) {
      return null;
    }

    const record = await cotizacionesAppService.getWorkflowById(id, organizacionId);

    if (record) {
      const currentCotizaciones = cotizacionesRef.current;
      const nextCotizaciones = sortCotizaciones(
        currentCotizaciones.some((item) => item.id === record.id)
          ? currentCotizaciones.map((item) => (item.id === record.id ? record : item))
          : [record, ...currentCotizaciones]
      );

      cotizacionesRef.current = nextCotizaciones;
      setCotizaciones(nextCotizaciones);
      const nextCacheEntry = {
        organizationId: String(organizacionId),
        cotizaciones: nextCotizaciones,
        clientes: clientesRef.current,
      };
      cotizacionesCache.set(String(organizacionId), nextCacheEntry);
      persistCotizacionesCache(nextCacheEntry);
    }

    return record;
  };

  return {
    cotizaciones,
    clientes,
    error,
    isReady,
    isRefreshing,
    isSaving,
    saveWorkflow,
    deleteWorkflow,
    updateManualResponseStatus,
    getCotizacionById,
    loadCotizacionById,
    refreshCotizaciones,
    ensureClientesLoaded,
  };
}
