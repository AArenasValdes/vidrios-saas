"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { cotizacionLineTemplatesService } from "@/features/cotizaciones/line-templates/services/cotizacion-line-templates.service";
import { ensureDefaultLineCatalogClient } from "@/features/cotizaciones/line-templates/services/seed-line-catalog-client";
import { ensureStructuralDraftsClient } from "@/features/cotizaciones/line-templates/services/seed-structural-draft-client";
import { ensureProfileReferencesClient } from "@/features/cotizaciones/line-templates/services/seed-profile-references-client";
import type {
  CotizacionLineTemplate,
  CreateCotizacionLineTemplateInput,
  LineTemplateImportDuplicateMode,
  LineTemplateImportResult,
  UpdateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

type LoadTemplatesOptions = {
  force?: boolean;
};

type TemplateCacheEntry = {
  items?: CotizacionLineTemplate[];
  fetchedAt: number;
  request?: Promise<CotizacionLineTemplate[]>;
};

const TEMPLATE_CACHE_TTL_MS = 30_000;
const templateCache = new Map<string, TemplateCacheEntry>();

function getTemplateCacheKey(organizationId: string | number, activeOnly?: boolean) {
  return `${organizationId}:${activeOnly === true ? "active" : "all"}`;
}

function readFreshTemplateCache(
  organizationId: string | number,
  activeOnly: boolean | undefined
) {
  const entry = templateCache.get(getTemplateCacheKey(organizationId, activeOnly));
  if (!entry?.items || Date.now() - entry.fetchedAt >= TEMPLATE_CACHE_TTL_MS) {
    return null;
  }

  return entry.items;
}

function fetchTemplates(
  organizationId: string | number,
  activeOnly: boolean | undefined,
  force = false
) {
  const key = getTemplateCacheKey(organizationId, activeOnly);
  const current = templateCache.get(key);

  if (!force && current?.request) {
    return current.request;
  }

  if (!force && current?.items && Date.now() - current.fetchedAt < TEMPLATE_CACHE_TTL_MS) {
    return Promise.resolve(current.items);
  }

  const request = cotizacionLineTemplatesService
    .getTemplatesByOrganizationId(organizationId, { activeOnly })
    .then((items) => {
      templateCache.set(key, { items, fetchedAt: Date.now() });
      return items;
    })
    .finally(() => {
      const entry = templateCache.get(key);
      if (entry?.request === request) {
        templateCache.set(key, {
          items: entry.items,
          fetchedAt: entry.fetchedAt,
        });
      }
    });

  templateCache.set(key, {
    items: current?.items,
    fetchedAt: current?.fetchedAt ?? 0,
    request,
  });

  return request;
}

function invalidateTemplateCache(organizationId: string | number) {
  templateCache.delete(getTemplateCacheKey(organizationId, false));
  templateCache.delete(getTemplateCacheKey(organizationId, true));
}

export function useCotizacionLineTemplates(options?: {
  activeOnly?: boolean;
  enabled?: boolean;
}) {
  const { organizacionId } = useAuth();
  const activeOnly = options?.activeOnly;
  const enabled = options?.enabled;
  const [templates, setTemplates] = useState<CotizacionLineTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeLoadIdRef = useRef(0);

  const loadTemplates = useCallback(async (loadOptions: LoadTemplatesOptions = {}) => {
    if (!organizacionId || enabled === false) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    const loadId = ++activeLoadIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const cachedItems = loadOptions.force
        ? null
        : readFreshTemplateCache(organizacionId, activeOnly);
      if (cachedItems) {
        setTemplates(cachedItems);
        setIsLoading(false);
      }
      const items = cachedItems ??
        (await fetchTemplates(organizacionId, activeOnly, loadOptions.force));

      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      setTemplates(items);

      // La lista comercial no debe esperar la preparación técnica del catálogo.
      // Para una organización ya poblada esto libera la primera pintura; si aún
      // no hay líneas, conservamos el loading hasta terminar la sincronización
      // para no mostrar un estado vacío engañoso.
      const hadVisibleTemplates = items.length > 0;
      setIsLoading(!hadVisibleTemplates);

      const seedResults = await Promise.allSettled([
        // Estas tareas no dependen entre sí y sus servicios ya son idempotentes.
        ensureDefaultLineCatalogClient(organizacionId),
        ensureStructuralDraftsClient(organizacionId),
        ensureProfileReferencesClient(organizacionId),
      ]);
      const didSeed = seedResults.some(
        (result) => result.status === "fulfilled" && result.value === true
      );

      if (didSeed && loadId === activeLoadIdRef.current) {
        const refreshedItems = await fetchTemplates(organizacionId, activeOnly, true);
        if (loadId === activeLoadIdRef.current) {
          setTemplates(refreshedItems);
        }
      }

      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      setIsLoading(false);
    } catch (err) {
      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      setError(err instanceof Error ? err.message : "No se pudieron cargar las lineas.");
    } finally {
      if (loadId === activeLoadIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeOnly, enabled, organizacionId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTemplates();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTemplates]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleFocus = () => {
      if (enabled === false) {
        return;
      }

      void loadTemplates();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [enabled, loadTemplates]);

  const createTemplate = useCallback(
    async (input: Omit<CreateCotizacionLineTemplateInput, "organizationId">) => {
      if (!organizacionId) {
        throw new Error("No hay organizacion activa");
      }

      setIsSaving(true);
      setError(null);

      try {
        const created = await cotizacionLineTemplatesService.createTemplate(
          organizacionId,
          input
        );
        invalidateTemplateCache(organizacionId);
        setTemplates((current) =>
          [...current, created].sort((left, right) => left.sortOrder - right.sortOrder)
        );
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la linea.");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [organizacionId]
  );

  const updateTemplate = useCallback(
    async (id: string | number, input: UpdateCotizacionLineTemplateInput) => {
      if (!organizacionId) {
        throw new Error("No hay organizacion activa");
      }

      setIsSaving(true);
      setError(null);

      try {
        const updated = await cotizacionLineTemplatesService.updateTemplate(
          id,
          organizacionId,
          input
        );
        invalidateTemplateCache(organizacionId);
        setTemplates((current) =>
          current
            .map((item) => (item.id === updated.id ? updated : item))
            .sort((left, right) => left.sortOrder - right.sortOrder)
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar la linea.");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [organizacionId]
  );

  const duplicateTemplate = useCallback(
    async (id: string | number) => {
      if (!organizacionId) {
        throw new Error("No hay organizacion activa");
      }

      setIsSaving(true);
      setError(null);

      try {
        const duplicated = await cotizacionLineTemplatesService.duplicateTemplate(
          id,
          organizacionId
        );
        invalidateTemplateCache(organizacionId);
        setTemplates((current) =>
          [...current, duplicated].sort((left, right) => left.sortOrder - right.sortOrder)
        );
        return duplicated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo duplicar la linea.");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [organizacionId]
  );

  const deleteTemplate = useCallback(
    async (id: string | number) => {
      if (!organizacionId) {
        throw new Error("No hay organizacion activa");
      }

      setIsSaving(true);
      setError(null);

      try {
        await cotizacionLineTemplatesService.deleteTemplate(id, organizacionId);
        invalidateTemplateCache(organizacionId);
        setTemplates((current) => current.filter((item) => item.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar la linea.");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [organizacionId]
  );

  const importTemplates = useCallback(
    async (
      rows: Array<Omit<CreateCotizacionLineTemplateInput, "organizationId">>,
      duplicateMode: LineTemplateImportDuplicateMode
    ): Promise<LineTemplateImportResult> => {
      if (!organizacionId) {
        throw new Error("No hay organizacion activa");
      }

      setIsSaving(true);
      setError(null);

      try {
        const result = await cotizacionLineTemplatesService.importTemplates(
          organizacionId,
          rows,
          { duplicateMode }
        );
        await loadTemplates({ force: true });
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo importar el catalogo.");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [loadTemplates, organizacionId]
  );

  return {
    templates,
    activeTemplates: templates.filter((item) => item.isActive),
    isLoading,
    isSaving,
    error,
    loadTemplates,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
    importTemplates,
  };
}
