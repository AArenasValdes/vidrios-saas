"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { ensureStructuralDraftsClient } from "@/features/cotizaciones/line-templates/services/seed-structural-draft-client";
import { getFabricationRecipesClientService } from "@/features/fabricacion/services/fabrication-recipes.client";
import { formatFabricationRecipesLoadError } from "@/features/fabricacion/repositories/fabrication-recipes.repository";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  CreateFabricationRecipeInput,
  CreateFabricationRecipeTestInput,
  FabricationRecipeRecord,
  FabricationRecipeStatus,
  FabricationRecipeTestRecord,
  UpdateFabricationRecipeInput,
} from "@/features/fabricacion/types/fabricacion-persistence";

type UseFabricationRecipesOptions = {
  enabled?: boolean;
  lineTemplateId?: number;
  /**
   * Cotización / despiece: listar recetas sin esperar seed estructural.
   * El seed sigue lanzándose en background para no retrasar el botón.
   */
  skipStructuralSeed?: boolean;
};

const recipeListInflight = new Map<string, Promise<FabricationRecipeRecord[]>>();
const RECIPE_LIST_CACHE_TTL_MS = 30_000;
const recipeListCache = new Map<
  string,
  { at: number; data: FabricationRecipeRecord[] }
>();

function buildRecipeListCacheKey(organizationId: number, lineTemplateId?: number) {
  return `${organizationId}:${lineTemplateId ?? "all"}`;
}

function listRecipesCached(input: {
  organizationId: number;
  lineTemplateId?: number;
}): Promise<FabricationRecipeRecord[]> {
  const key = buildRecipeListCacheKey(input.organizationId, input.lineTemplateId);
  const cached = recipeListCache.get(key);
  if (cached && Date.now() - cached.at < RECIPE_LIST_CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  const inflight = recipeListInflight.get(key);
  if (inflight) return inflight;

  const request = getFabricationRecipesClientService()
    .listRecipes({
      organizationId: input.organizationId,
      lineTemplateId: input.lineTemplateId,
    })
    .then((data) => {
      recipeListCache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      recipeListInflight.delete(key);
    });

  recipeListInflight.set(key, request);
  return request;
}

/** Invalida caché de listado tras mutaciones locales. */
export function invalidateFabricationRecipesListCache(organizationId?: number | null) {
  if (organizationId == null) {
    recipeListCache.clear();
    recipeListInflight.clear();
    return;
  }
  const prefix = `${organizationId}:`;
  for (const key of recipeListCache.keys()) {
    if (key.startsWith(prefix)) recipeListCache.delete(key);
  }
  for (const key of recipeListInflight.keys()) {
    if (key.startsWith(prefix)) recipeListInflight.delete(key);
  }
}

function getMutationErrorMessage(error: unknown) {
  const formatted = formatFabricationRecipesLoadError(error);
  if (/row-level security policy/i.test(formatted)) {
    return "No pudimos confirmar el acceso de esta sesión al taller. Recarga la página e inténtalo nuevamente.";
  }
  if (formatted !== "No se pudieron cargar las recetas de fabricación.") {
    return formatted;
  }
  if (error instanceof Error && error.message) {
    if (/row-level security policy/i.test(error.message)) {
      return "No pudimos confirmar el acceso de esta sesión al taller. Recarga la página e inténtalo nuevamente.";
    }
    return error.message;
  }
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      if (/row-level security policy/i.test(candidate.message)) {
        return "No pudimos confirmar el acceso de esta sesión al taller. Recarga la página e inténtalo nuevamente.";
      }
      return candidate.message;
    }
  }
  return "No se pudo completar la accion.";
}

export function useFabricationRecipes(options: UseFabricationRecipesOptions = {}) {
  const { cargando, user } = useAuth();
  const userId = user?.id ?? null;
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [resolvedOrganizationId, setResolvedOrganizationId] = useState<number | null>(null);
  const organizationId = resolvedUserId === userId ? resolvedOrganizationId : null;
  const isResolvingOrganization = Boolean(
    userId && !cargando && resolvedUserId !== userId
  );
  const [recipes, setRecipes] = useState<FabricationRecipeRecord[]>([]);
  const [tests, setTests] = useState<Record<string, FabricationRecipeTestRecord[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    let isCurrent = true;

    if (cargando || !userId) {
      return () => {
        isCurrent = false;
      };
    }

    void Promise.resolve()
      .then(() => {
        setError(null);
        return getFabricationRecipesClientService().getCurrentOrganizationId();
      })
      .then((resolvedOrganizationId) => {
        if (!isCurrent) return;
        setResolvedOrganizationId(resolvedOrganizationId);
        setResolvedUserId(userId);
        if (!resolvedOrganizationId) {
          setError("No pudimos identificar el taller de esta sesión. Recarga la página e inténtalo nuevamente.");
        }
      })
      .catch(() => {
        if (!isCurrent) return;
        setResolvedOrganizationId(null);
        setResolvedUserId(userId);
        setError("No pudimos confirmar el acceso de esta sesión al taller. Recarga la página e inténtalo nuevamente.");
      });

    return () => {
      isCurrent = false;
    };
  }, [cargando, userId]);

  const loadRecipes = useCallback(async (loadOptions?: { background?: boolean }) => {
    if (!organizationId || options.enabled === false) {
      setRecipes([]);
      setIsLoading(false);
      return;
    }

    const loadId = ++loadIdRef.current;
    const background = loadOptions?.background === true;
    if (!background) setIsLoading(true);
    setError(null);

    try {
      const listRecipes = () =>
        listRecipesCached({
          organizationId,
          lineTemplateId: options.lineTemplateId,
        });

      if (options.skipStructuralSeed) {
        void ensureStructuralDraftsClient(organizationId).catch(() => {});
      } else {
        await ensureStructuralDraftsClient(organizationId);
      }
      const data = await listRecipes();
      if (loadId === loadIdRef.current) setRecipes(data);
    } catch (loadError) {
      if (loadId === loadIdRef.current) {
        setError(formatFabricationRecipesLoadError(loadError));
      }
    } finally {
      if (loadId === loadIdRef.current && !background) setIsLoading(false);
    }
  }, [options.enabled, options.lineTemplateId, options.skipStructuralSeed, organizationId]);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  const runMutation = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options?: {
        quiet?: boolean;
        replaceRecipe?: (result: T) => FabricationRecipeRecord | null;
      }
    ) => {
      const quiet = options?.quiet === true;
      if (!quiet) setIsSaving(true);
      setError(null);
      try {
        const result = await action();
        const patched = options?.replaceRecipe?.(result) ?? null;
        if (patched) {
          invalidateFabricationRecipesListCache(organizationId);
          setRecipes((current) => {
            const index = current.findIndex((recipe) => recipe.id === patched.id);
            if (index < 0) return [patched, ...current];
            const next = current.slice();
            next[index] = patched;
            return next;
          });
        } else {
          invalidateFabricationRecipesListCache(organizationId);
          await loadRecipes({ background: quiet });
        }
        return result;
      } catch (mutationError) {
        setError(getMutationErrorMessage(mutationError));
        throw mutationError;
      } finally {
        if (!quiet) setIsSaving(false);
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
    (
      id: string,
      input: UpdateFabricationRecipeInput,
      options?: { quiet?: boolean }
    ) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      return runMutation(
        () =>
          getFabricationRecipesClientService().updateDraftRecipe(
            id,
            organizationId,
            input
          ),
        {
          quiet: options?.quiet,
          replaceRecipe: (result) => result,
        }
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
    (
      id: string,
      input?: {
        definition?: FabricacionReceta;
        status?: Extract<FabricationRecipeStatus, "draft" | "review_required" | "testing">;
      },
      options?: { quiet?: boolean }
    ) => {
      if (!organizationId) throw new Error("No hay organizacion activa.");
      return runMutation(
        () =>
          getFabricationRecipesClientService().createRecipeVersion(id, {
            organizationId,
            definition: input?.definition,
            status: input?.status,
          }),
        {
          quiet: options?.quiet,
          replaceRecipe: (result) => result,
        }
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
    isResolvingOrganization,
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
