"use client";

import { useCallback, useEffect, useState } from "react";

import { growthContentApiClient } from "@/features/growth/client/growth-content-api.client";
import type {
  CreateGrowthContentItemInput,
  GrowthContentItem,
  UpdateGrowthContentItemInput,
} from "@/features/growth/types/growth-content";

export function useGrowthContent() {
  const [items, setItems] = useState<GrowthContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setItems(await growthContentApiClient.list());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar la cola editorial.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  const create = useCallback(async (input: CreateGrowthContentItemInput) => {
    const item = await growthContentApiClient.create(input);
    setItems((current) => [item, ...current]);
    return item;
  }, []);

  const update = useCallback(async (input: UpdateGrowthContentItemInput) => {
    const item = await growthContentApiClient.update(input);
    setItems((current) =>
      input.eliminado
        ? current.filter((candidate) => candidate.id !== item.id)
        : current.map((candidate) => (candidate.id === item.id ? item : candidate))
    );
    return item;
  }, []);

  return { items, isLoading, error, reload, create, update };
}
