"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { getFabricationRecipesClientService } from "@/features/fabricacion/services/fabrication-recipes.client";
import type {
  CreateFabricationRecipeInput,
  CreateFabricationRecipeTestInput,
  FabricationRecipeRecord,
  FabricationRecipeTestRecord,
  UpdateFabricationRecipeInput,
} from "@/features/fabricacion/types/fabricacion-persistence";

type UseFabricationRecipesOptions = {
  enabled?: boolean;
  lineTemplateId?: number;
};

export function useFabricationRecipes(options: UseFabricationRecipesOptions = {}) {
  const { organizacionId, user } = useAuth();
  const organizationId =
    organizacionId != null && Number.isInteger(Number(organizacionId))
      ? Number(organizacionId)
      : null;
  const [recipes, setRecipes] = useState<FabricationRecipeRecord[]>([]);
  const [tests, setTests] = useState<Record<string, FabricationRecipeTestRecord[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  const loadRecipes = useCallback(async () => {
    if (!organizationId || options.enabled === false) {
      setRecipes([]);
      setIsLoading(false);
      return;
    }

    const loadId = ++loadIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getFabricationRecipesClientService().listRecipes({
        organizationId,
        lineTemplateId: options.lineTemplateId,
      });
      if (loadId === loadIdRef.current) setRecipes(data);
    } catch (loadError) {
      if (loadId === loadIdRef.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar las recetas."
        );
      }
    } finally {
      if (loadId === loadIdRef.current) setIsLoading(false);
    }
  }, [options.enabled, options.lineTemplateId, organizationId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRecipes();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRecipes]);

  const runMutation = useCallback(
    async <T,>(action: () => Promise<T>) => {
      setIsSaving(true);
      setError(null);
      try {
        const result = await action();
        await loadRecipes();
        return result;
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "No se pudo completar la accion."
        );
        throw mutationError;
      } finally {
        setIsSaving(false);
      }
    },
    [loadRecipes]
  );

  const createRecipe = useCallback(
    (input: Omit<CreateFabricationRecipeInput, "organizationId" | "scope">) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      return runMutation(() =>
        getFabricationRecipesClientService().createRecipe({
          ...input,
          organizationId,
          scope: "organization",
        })
      );
    },
    [organizationId, runMutation]
  );

  const updateRecipe = useCallback(
    (id: string, input: UpdateFabricationRecipeInput) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      return runMutation(() =>
        getFabricationRecipesClientService().updateDraftRecipe(
          id,
          organizationId,
          input
        )
      );
    },
    [organizationId, runMutation]
  );

  const duplicateRecipe = useCallback(
    (
      id: string,
      target?: { lineTemplateId?: number | null; providerName?: string; lineName?: string }
    ) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      return runMutation(() =>
        getFabricationRecipesClientService().duplicateRecipe(
          id,
          organizationId,
          target
        )
      );
    },
    [organizationId, runMutation]
  );

  const createRecipeVersion = useCallback(
    (id: string) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      return runMutation(() =>
        getFabricationRecipesClientService().createRecipeVersion(id, {
          organizationId,
        })
      );
    },
    [organizationId, runMutation]
  );

  const archiveRecipe = useCallback(
    (id: string) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      return runMutation(() =>
        getFabricationRecipesClientService().archiveRecipe(id, organizationId)
      );
    },
    [organizationId, runMutation]
  );

  const loadTests = useCallback(async (recipeId: string) => {
    const data =
      await getFabricationRecipesClientService().listRecipeTests(recipeId);
    setTests((current) => ({ ...current, [recipeId]: data }));
    return data;
  }, []);

  const createRecipeTest = useCallback(
    async (input: Omit<CreateFabricationRecipeTestInput, "organizationId">) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      setIsSaving(true);
      setError(null);
      try {
        const created =
          await getFabricationRecipesClientService().createRecipeTest({
            ...input,
            organizationId,
          });
        await loadTests(input.recipeId);
        return created;
      } catch (testError) {
        setError(
          testError instanceof Error ? testError.message : "No se pudo guardar la prueba."
        );
        throw testError;
      } finally {
        setIsSaving(false);
      }
    },
    [loadTests, organizationId]
  );

  const runRecipeTest = useCallback(
    async (recipeId: string, testId: string) => {
      setIsSaving(true);
      try {
        const result =
          await getFabricationRecipesClientService().runRecipeTest(
            testId,
            user?.id ?? null
          );
        await loadTests(recipeId);
        return result;
      } finally {
        setIsSaving(false);
      }
    },
    [loadTests, user?.id]
  );

  const validateRecipe = useCallback(
    (id: string) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      return runMutation(() =>
        getFabricationRecipesClientService().validateRecipe(
          id,
          organizationId,
          user?.id ?? null
        )
      );
    },
    [organizationId, runMutation, user?.id]
  );

  return {
    organizationId,
    recipes,
    tests,
    isLoading,
    isSaving,
    error,
    loadRecipes,
    createRecipe,
    updateRecipe,
    duplicateRecipe,
    createRecipeVersion,
    archiveRecipe,
    loadTests,
    createRecipeTest,
    runRecipeTest,
    validateRecipe,
  };
}
