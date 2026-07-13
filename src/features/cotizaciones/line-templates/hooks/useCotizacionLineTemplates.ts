"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { cotizacionLineTemplatesService } from "@/features/cotizaciones/line-templates/services/cotizacion-line-templates.service";
import type {
  CotizacionLineTemplate,
  CreateCotizacionLineTemplateInput,
  LineTemplateImportDuplicateMode,
  LineTemplateImportResult,
  UpdateCotizacionLineTemplateInput,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export function useCotizacionLineTemplates(options?: { activeOnly?: boolean }) {
  const { organizacionId } = useAuth();
  const [templates, setTemplates] = useState<CotizacionLineTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeLoadIdRef = useRef(0);

  const loadTemplates = useCallback(async () => {
    if (!organizacionId) {
      setTemplates([]);
      return;
    }

    const loadId = ++activeLoadIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const items = await cotizacionLineTemplatesService.getTemplatesByOrganizationId(
        organizacionId,
        { activeOnly: options?.activeOnly }
      );

      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      setTemplates(items);
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
  }, [organizacionId, options?.activeOnly]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

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
        await loadTemplates();
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
