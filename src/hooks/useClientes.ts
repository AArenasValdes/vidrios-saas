"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { clientesService } from "@/services/clientes.service";
import type {
  ActualizarClienteInput,
  ClienteDetalle,
  ClienteResumen,
  CrearClienteInput,
} from "@/types/cliente";

type ClientesCacheEntry = {
  organizationId: string;
  clientes: ClienteResumen[];
};

const clientesCache = new Map<string, ClientesCacheEntry>();
const clientesResumenPromiseByOrganization = new Map<string, Promise<ClienteResumen[]>>();
const CLIENTES_STORAGE_PREFIX = "vidrios-saas:clientes:";

export function __resetClientesHookTestState() {
  clientesCache.clear();
  clientesResumenPromiseByOrganization.clear();
}

function getClientesStorageKey(organizationKey: string) {
  return `${CLIENTES_STORAGE_PREFIX}${organizationKey}`;
}

function readClientesFromStorage(organizationKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getClientesStorageKey(organizationKey));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as ClienteResumen[];
  } catch {
    return null;
  }
}

function persistClientes(organizationKey: string, clientes: ClienteResumen[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getClientesStorageKey(organizationKey),
      JSON.stringify(clientes)
    );
  } catch {
    return;
  }
}

export function useClientes() {
  const { organizacionId, cargando } = useAuth();
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [detalleById, setDetalleById] = useState<Record<string, ClienteDetalle>>({});
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const activeRefreshIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastOrganizationIdRef = useRef<string | null>(null);
  const bootRetryCountRef = useRef(0);
  const bootRetryTimeoutRef = useRef<number | null>(null);

  const refreshClientes = useCallback(async () => {
    const refreshId = ++activeRefreshIdRef.current;

    if (!organizacionId) {
      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return;
      }

      setClientes([]);
      setDetalleById({});
      setError(null);
      setIsReady(true);
      return;
    }

    try {
      if (isMountedRef.current && refreshId === activeRefreshIdRef.current) {
        setIsRefreshing(true);
      }

      const organizationKey = String(organizacionId);
      const inFlightPromise = clientesResumenPromiseByOrganization.get(organizationKey);
      const dataPromise =
        inFlightPromise ??
        clientesService
          .listResumenByOrganizationId(organizacionId)
          .finally(() => clientesResumenPromiseByOrganization.delete(organizationKey));

      if (!inFlightPromise) {
        clientesResumenPromiseByOrganization.set(organizationKey, dataPromise);
      }

      const data = await dataPromise;
      const hasWarmCache =
        data.length > 0 ||
        (clientesCache.get(organizationKey)?.clientes.length ?? 0) > 0;

      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return;
      }

      setClientes(data);
      setError(null);
      clientesCache.set(organizationKey, {
        organizationId: organizationKey,
        clientes: data,
      });
      persistClientes(organizationKey, data);
      setIsReady(true);

      if (
        !hasWarmCache &&
        data.length === 0 &&
        bootRetryCountRef.current < 1 &&
        typeof window !== "undefined"
      ) {
        bootRetryCountRef.current += 1;
        bootRetryTimeoutRef.current = window.setTimeout(() => {
          bootRetryTimeoutRef.current = null;
          void refreshClientes();
        }, 500);
      }
    } catch (error) {
      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return;
      }

      setError(
        error instanceof Error ? error.message : "No se pudieron cargar los clientes"
      );
      setIsReady(true);
    } finally {
      if (isMountedRef.current && refreshId === activeRefreshIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [organizacionId]);

  useEffect(() => {
    const organizationKey = organizacionId ? String(organizacionId) : null;

    if (lastOrganizationIdRef.current !== organizationKey) {
      lastOrganizationIdRef.current = organizationKey;
      bootRetryCountRef.current = 0;
      if (bootRetryTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(bootRetryTimeoutRef.current);
        bootRetryTimeoutRef.current = null;
      }
      setClientes([]);
      setDetalleById({});
      setError(null);
      setIsReady(false);
    }

    if (cargando) {
      return;
    }

    if (!organizacionId) {
      setClientes([]);
      setError(null);
      setIsReady(true);
      setIsRefreshing(false);
      return;
    }

    const cached = clientesCache.get(String(organizacionId));

    if (cached) {
      setClientes(cached.clientes);
      setIsReady(true);
    } else {
      const persisted = readClientesFromStorage(String(organizacionId));

      if (persisted) {
        setClientes(persisted);
        clientesCache.set(String(organizacionId), {
          organizationId: String(organizacionId),
          clientes: persisted,
        });
        setIsReady(true);
      } else {
        setClientes([]);
        setIsReady(false);
      }
    }

    void refreshClientes();
  }, [cargando, organizacionId, refreshClientes]);

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

  const createCliente = async (input: Omit<CrearClienteInput, "organizationId">) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsSaving(true);

    try {
      const cliente = await clientesService.createClient({
        ...input,
        organizationId: organizacionId,
      });

      await refreshClientes();

      return cliente;
    } finally {
      setIsSaving(false);
    }
  };

  const getClienteDetalleById = (id: string) => {
    return detalleById[id] ?? null;
  };

  const loadClienteDetalleById = async (id: string) => {
    if (!organizacionId) {
      return null;
    }

    const detalle = await clientesService.getDetalleById(id, organizacionId);

    if (detalle) {
      setDetalleById((current) => ({
        ...current,
        [String(detalle.cliente.id)]: detalle,
      }));
    }

    return detalle;
  };

  const updateCliente = async (id: string, input: ActualizarClienteInput) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsSaving(true);

    try {
      const cliente = await clientesService.updateClient(id, organizacionId, input);
      const detalle = await clientesService.getDetalleById(id, organizacionId);

      await refreshClientes();

      if (detalle) {
        setDetalleById((current) => ({
          ...current,
          [String(detalle.cliente.id)]: detalle,
        }));
      }

      return cliente;
    } finally {
      setIsSaving(false);
    }
  };

  const updateProjectStatus = async (projectId: string, estado: string | null) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsSaving(true);

    try {
      const project = await clientesService.updateProjectStatus(
        projectId,
        organizacionId,
        estado
      );

      await refreshClientes();

      setDetalleById((current) => {
        const nextEntries = Object.entries(current).map(([key, detalle]) => {
          const proyectos = detalle.proyectos.map((item) =>
            String(item.id) === String(projectId)
              ? { ...item, estado: project.estado }
              : item
          );
          const hasProject = proyectos.some((item) => String(item.id) === String(projectId));

          if (!hasProject) {
            return [key, detalle] as const;
          }

          return [
            key,
            {
              ...detalle,
              proyectos,
            },
          ] as const;
        });

        return Object.fromEntries(nextEntries);
      });

      return project;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCliente = async (id: string) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsSaving(true);

    try {
      const result = await clientesService.deleteClient(id, organizacionId);

      await refreshClientes();
      setDetalleById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });

      return result;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    clientes,
    error,
    isReady,
    isRefreshing,
    isSaving,
    refreshClientes,
    createCliente,
    getClienteDetalleById,
    loadClienteDetalleById,
    updateCliente,
    updateProjectStatus,
    deleteCliente,
  };
}
