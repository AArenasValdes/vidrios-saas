"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { normalizeQuoteProviderKey, quoteProviderVisibilityService } from "@/features/cotizaciones/line-templates/services/quote-provider-visibility.service";

export function useQuoteProviderVisibility(options?: { enabled?: boolean }) {
  const { organizacionId } = useAuth();
  const enabled = options?.enabled !== false;
  const [hiddenProviderKeys, setHiddenProviderKeys] = useState<Set<string>>(() => new Set());
  const [savingProviderKeys, setSavingProviderKeys] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(enabled && Boolean(organizacionId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !organizacionId) {
      setHiddenProviderKeys(new Set());
      setIsLoading(false);
      return;
    }

    let current = true;
    setHiddenProviderKeys(new Set());
    setIsLoading(true);
    setError(null);

    void quoteProviderVisibilityService.listHiddenProviderKeys(organizacionId)
      .then((providerKeys) => {
        if (current) setHiddenProviderKeys(new Set(providerKeys));
      })
      .catch((loadError: unknown) => {
        if (current) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los proveedores ocultos.");
        }
      })
      .finally(() => {
        if (current) setIsLoading(false);
      });

    return () => {
      current = false;
    };
  }, [enabled, organizacionId]);

  const setProviderHidden = useCallback(async (provider: string, hidden: boolean) => {
    if (!organizacionId) throw new Error("No hay una empresa activa.");
    const providerKey = normalizeQuoteProviderKey(provider);
    if (!providerKey) throw new Error("Este grupo no tiene un proveedor para configurar.");

    setError(null);
    setSavingProviderKeys((current) => new Set(current).add(providerKey));
    setHiddenProviderKeys((current) => {
      const next = new Set(current);
      if (hidden) next.add(providerKey);
      else next.delete(providerKey);
      return next;
    });

    try {
      await quoteProviderVisibilityService.setProviderHidden(organizacionId, providerKey, hidden);
    } catch (saveError) {
      setHiddenProviderKeys((current) => {
        const next = new Set(current);
        if (hidden) next.delete(providerKey);
        else next.add(providerKey);
        return next;
      });
      const message = saveError instanceof Error ? saveError.message : "No se pudo guardar la visibilidad del proveedor.";
      setError(message);
      throw saveError;
    } finally {
      setSavingProviderKeys((current) => {
        const next = new Set(current);
        next.delete(providerKey);
        return next;
      });
    }
  }, [organizacionId]);

  return { hiddenProviderKeys, savingProviderKeys, isLoading, error, setProviderHidden };
}
