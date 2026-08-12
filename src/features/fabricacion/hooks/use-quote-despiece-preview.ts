"use client";

import { useCallback, useMemo } from "react";

import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import {
  buildQuoteDespiecePreviewEligibility,
  findFirstQuoteItemWithDespiecePreview,
} from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";

type Options = {
  items: CotizacionWorkflowItem[];
  enabled?: boolean;
  /** Precarga recetas antes de agregar la primera pieza (wizard abierto). */
  preload?: boolean;
};

export function useQuoteDespiecePreview({
  items,
  enabled = true,
  preload = false,
}: Options) {
  const shouldLoad = enabled && (items.length > 0 || preload);
  const {
    recipes,
    organizationId,
    isLoading,
    error: recipesError,
  } = useFabricationRecipes({
    enabled: shouldLoad,
  });

  const isReady = !isLoading && organizationId != null;

  const eligibilityByItemId = useMemo(
    () =>
      buildQuoteDespiecePreviewEligibility({
        items,
        recipes,
        organizationId,
      }),
    [items, recipes, organizationId]
  );

  const hasDespiecePreviewAvailable = useMemo(
    () => isReady && eligibilityByItemId.size > 0,
    [isReady, eligibilityByItemId]
  );

  const canOpenDespieceForItem = useCallback(
    (itemId: string) => eligibilityByItemId.get(itemId) === true,
    [eligibilityByItemId]
  );

  const resolveDefaultDespieceItemId = useCallback(
    (preferredItemId?: string | null) => {
      if (preferredItemId && eligibilityByItemId.get(preferredItemId)) {
        return preferredItemId;
      }
      return (
        findFirstQuoteItemWithDespiecePreview({
          items,
          recipes,
          organizationId,
          eligibilityByItemId,
        })?.id ??
        items[0]?.id ??
        null
      );
    },
    [eligibilityByItemId, items, organizationId, recipes]
  );

  return {
    recipes,
    organizationId,
    isLoading,
    isReady,
    recipesError,
    eligibilityByItemId,
    hasDespiecePreviewAvailable,
    canOpenDespieceForItem,
    resolveDefaultDespieceItemId,
  };
}
