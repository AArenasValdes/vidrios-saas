import { z } from "zod";

import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { fabricacionRecetaSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import { validarRecetaFabricacion } from "@/features/fabricacion/services/fabricacion-validacion.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipesRepository } from "@/features/fabricacion/repositories/fabrication-recipes.repository";
import type { FabricationRecipeTestsRepository } from "@/features/fabricacion/repositories/fabrication-recipe-tests.repository";
import {
  FabricationRecipeServiceError,
  type CreateFabricationRecipeInput,
  type CreateFabricationRecipeTestInput,
  type FabricationRecipeRecord,
  type FabricationRecipeStatus,
  type FabricationRecipeTestRecord,
  type ListFabricationRecipesFilters,
  type UpdateFabricationRecipeTestInput,
  type UpdateFabricationRecipeInput,
} from "@/features/fabricacion/types/fabricacion-persistence";

type FabricationRecipesServiceDeps = {
  recipesRepository: FabricationRecipesRepository;
  testsRepository: FabricationRecipeTestsRepository;
  now?: () => Date;
  createRecipeIdentityId?: () => string;
};

type CreateRecipeVersionInput = {
  organizationId: number;
  status?: Extract<FabricationRecipeStatus, "draft" | "review_required" | "testing">;
  definition?: FabricacionReceta;
  sourceReference?: string | null;
};

type DuplicateRecipeOptions = {
  lineTemplateId?: number | null;
  providerName?: string;
  lineName?: string;
};

function statusToDomainEstado(status: FabricationRecipeStatus) {
  switch (status) {
    case "draft":
      return "borrador";
    case "testing":
      return "lista_para_validar";
    case "validated":
      return "validada";
    case "review_required":
    case "archived":
      return "requiere_revision";
  }
}

function normalizeDefinition(
  definition: FabricacionReceta,
  version: number,
  status: FabricationRecipeStatus
) {
  return fabricacionRecetaSchema.parse({
    ...definition,
    version,
    estado: statusToDomainEstado(status),
  });
}

function asRecipeDefinitionError(error: unknown): FabricationRecipeServiceError {
  if (error instanceof z.ZodError) {
    return new FabricationRecipeServiceError(
      "RECETA_DEFINICION_INVALIDA",
      "La definicion de la receta no cumple el schema tecnico de fabricacion.",
      error.issues
    );
  }

  return new FabricationRecipeServiceError(
    "RECETA_DEFINICION_INVALIDA",
    "La definicion de la receta no pudo validarse.",
    error
  );
}

function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForComparison);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForComparison((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function areJsonEqual(left: unknown, right: unknown) {
  return (
    JSON.stringify(normalizeForComparison(left)) ===
    JSON.stringify(normalizeForComparison(right))
  );
}

function normalizeRecipeTestOutput(
  output: ReturnType<typeof calcularCubicacionYPauta>
) {
  return {
    ...output,
    // El estado cambia de borrador a testing sin alterar la geometria esperada.
    estadoReceta: "borrador" as const,
    advertencias: output.advertencias.filter(
      (warning) => warning.codigo !== "RECETA_NO_VALIDADA"
    ),
  };
}

function assertOrganizationAccess(
  recipe: FabricationRecipeRecord,
  organizationId: number | null | undefined
) {
  if (
    recipe.scope === "organization" &&
    organizationId !== undefined &&
    recipe.organizationId !== organizationId
  ) {
    throw new FabricationRecipeServiceError(
      "ACCESO_ORGANIZACION_INVALIDO",
      "La receta pertenece a otra organizacion."
    );
  }
}

function assertEditable(recipe: FabricationRecipeRecord) {
  if (recipe.status === "validated") {
    throw new FabricationRecipeServiceError(
      "RECETA_VALIDADA_BLOQUEADA",
      "Una receta validada no se edita directamente; crea una nueva version."
    );
  }

  if (recipe.status === "archived" || recipe.eliminadoEn != null) {
    throw new FabricationRecipeServiceError(
      "RECETA_ARCHIVADA",
      "Una receta archivada no se puede modificar."
    );
  }
}

export function createFabricationRecipesService(
  deps: FabricationRecipesServiceDeps
) {
  const now = deps.now ?? (() => new Date());
  const createRecipeIdentityId =
    deps.createRecipeIdentityId ?? (() => crypto.randomUUID());

  async function getCurrentOrganizationId() {
    return deps.recipesRepository.getCurrentOrganizationId();
  }

  async function createRecipe(input: CreateFabricationRecipeInput) {
    try {
      const status = input.status ?? "draft";
      return await deps.recipesRepository.create({
        ...input,
        version: input.version ?? 1,
        status,
        definition: normalizeDefinition(input.definition, input.version ?? 1, status),
      });
    } catch (error) {
      if (error instanceof z.ZodError) throw asRecipeDefinitionError(error);
      throw error;
    }
  }

  async function getRecipeById(
    id: string,
    options: { organizationId?: number | null; includeArchived?: boolean } = {}
  ) {
    const recipe = await deps.recipesRepository.getById(id, options);
    if (!recipe) return null;
    assertOrganizationAccess(recipe, options.organizationId);
    return recipe;
  }

  async function listRecipes(filters: ListFabricationRecipesFilters = {}) {
    return deps.recipesRepository.list(filters);
  }

  async function updateDraftRecipe(
    id: string,
    organizationId: number,
    input: UpdateFabricationRecipeInput
  ) {
    const recipe = await deps.recipesRepository.getById(id, { organizationId });
    if (!recipe) {
      throw new FabricationRecipeServiceError(
        "RECETA_NO_ENCONTRADA",
        "No se encontro la receta de fabricacion."
      );
    }

    assertOrganizationAccess(recipe, organizationId);
    assertEditable(recipe);

    try {
      const nextStatus = input.status ?? recipe.status;
      const nextDefinition =
        input.definition == null
          ? recipe.definition
          : normalizeDefinition(input.definition, recipe.version, nextStatus);

      return await deps.recipesRepository.update(id, {
        ...input,
        status: nextStatus,
        definition: normalizeDefinition(nextDefinition, recipe.version, nextStatus),
      });
    } catch (error) {
      if (error instanceof z.ZodError) throw asRecipeDefinitionError(error);
      throw error;
    }
  }

  async function duplicateRecipe(
    id: string,
    organizationId: number,
    options: DuplicateRecipeOptions = {}
  ) {
    const recipe = await deps.recipesRepository.getById(id, { organizationId });
    if (!recipe) {
      throw new FabricationRecipeServiceError(
        "RECETA_NO_ENCONTRADA",
        "No se encontro la receta de fabricacion para duplicar."
      );
    }

    const copyDefinition = normalizeDefinition(
      {
        ...recipe.definition,
        identidad: {
          ...recipe.definition.identidad,
          recetaId: createRecipeIdentityId(),
          nombre: `${recipe.definition.identidad.nombre} copia`,
        },
      },
      1,
      "draft"
    );

    return deps.recipesRepository.create({
      organizationId,
      lineTemplateId: options.lineTemplateId ?? recipe.lineTemplateId,
      scope: "organization",
      providerName: options.providerName ?? recipe.providerName,
      lineName: options.lineName ?? recipe.lineName,
      typology: recipe.typology,
      leavesCount: recipe.leavesCount,
      variant: recipe.variant,
      version: 1,
      status: "draft",
      definition: copyDefinition,
      sourceType: "copied",
      sourceReference: recipe.id,
      parentRecipeId: null,
    });
  }

  async function createRecipeVersion(id: string, input: CreateRecipeVersionInput) {
    const recipe = await deps.recipesRepository.getById(id, {
      organizationId: input.organizationId,
      includeArchived: false,
    });
    if (!recipe) {
      throw new FabricationRecipeServiceError(
        "RECETA_NO_ENCONTRADA",
        "No se encontro la receta base para versionar."
      );
    }

    assertOrganizationAccess(recipe, input.organizationId);

    const nextStatus = input.status ?? "review_required";
    const nextVersion = recipe.version + 1;
    const nextDefinition = normalizeDefinition(
      input.definition ?? recipe.definition,
      nextVersion,
      nextStatus
    );

    return deps.recipesRepository.create({
      organizationId: input.organizationId,
      lineTemplateId: recipe.lineTemplateId,
      scope: "organization",
      providerName: recipe.providerName,
      lineName: recipe.lineName,
      typology: recipe.typology,
      leavesCount: recipe.leavesCount,
      variant: recipe.variant,
      version: nextVersion,
      status: nextStatus,
      definition: nextDefinition,
      sourceType: "copied",
      sourceReference: input.sourceReference ?? recipe.id,
      parentRecipeId: recipe.id,
    });
  }

  async function archiveRecipe(id: string, organizationId: number) {
    const recipe = await deps.recipesRepository.getById(id, { organizationId });
    if (!recipe) {
      throw new FabricationRecipeServiceError(
        "RECETA_NO_ENCONTRADA",
        "No se encontro la receta de fabricacion para archivar."
      );
    }

    assertOrganizationAccess(recipe, organizationId);
    return deps.recipesRepository.softDelete(id);
  }

  async function createRecipeTest(input: CreateFabricationRecipeTestInput) {
    const recipe = await deps.recipesRepository.getById(input.recipeId, {
      organizationId: input.organizationId,
    });
    if (!recipe) {
      throw new FabricationRecipeServiceError(
        "RECETA_NO_ENCONTRADA",
        "No se encontro la receta de fabricacion para agregar el caso de prueba."
      );
    }

    assertOrganizationAccess(recipe, input.organizationId);
    return deps.testsRepository.create({
      ...input,
      organizationId: recipe.organizationId,
    });
  }

  async function updateRecipeTest(
    id: string,
    input: UpdateFabricationRecipeTestInput
  ) {
    const test = await deps.testsRepository.getById(id);
    if (!test) {
      throw new FabricationRecipeServiceError(
        "CASO_PRUEBA_NO_ENCONTRADO",
        "No se encontro el caso de prueba de fabricacion."
      );
    }

    return deps.testsRepository.update(id, input);
  }

  async function listRecipeTests(recipeId: string) {
    return deps.testsRepository.listByRecipeId(recipeId);
  }

  async function runRecipeTest(testId: string, validatedBy?: string | null) {
    const test = await deps.testsRepository.getById(testId);
    if (!test) {
      throw new FabricationRecipeServiceError(
        "CASO_PRUEBA_NO_ENCONTRADO",
        "No se encontro el caso de prueba de fabricacion."
      );
    }

    const recipe = await deps.recipesRepository.getById(test.recipeId, {
      organizationId: test.organizationId,
    });
    if (!recipe) {
      throw new FabricationRecipeServiceError(
        "RECETA_NO_ENCONTRADA",
        "No se encontro la receta asociada al caso de prueba."
      );
    }

    const actualOutput = calcularCubicacionYPauta(recipe.definition, test.input);
    const passed = areJsonEqual(
      normalizeRecipeTestOutput(actualOutput),
      normalizeRecipeTestOutput(test.expectedOutput)
    );

    return deps.testsRepository.update(test.id, {
      actualOutput,
      passed,
      validatedBy: validatedBy ?? null,
    });
  }

  async function runAllRecipeTests(recipeId: string, validatedBy?: string | null) {
    const tests = await deps.testsRepository.listByRecipeId(recipeId);
    const results: FabricationRecipeTestRecord[] = [];

    for (const test of tests) {
      results.push(await runRecipeTest(test.id, validatedBy));
    }

    return results;
  }

  async function validateRecipe(
    id: string,
    organizationId: number,
    validatedBy?: string | null
  ) {
    const recipe = await deps.recipesRepository.getById(id, { organizationId });
    if (!recipe) {
      throw new FabricationRecipeServiceError(
        "RECETA_NO_ENCONTRADA",
        "No se encontro la receta de fabricacion para validar."
      );
    }

    assertOrganizationAccess(recipe, organizationId);
    assertEditable(recipe);

    const validationDefinition = normalizeDefinition(
      recipe.definition,
      recipe.version,
      "validated"
    );
    const definitionValidation = validarRecetaFabricacion(validationDefinition);
    const criticalWarnings = definitionValidation.advertencias.filter(
      (warning) => warning.nivel === "error"
    );
    if (criticalWarnings.length > 0) {
      throw new FabricationRecipeServiceError(
        "VALIDACION_COMPONENTES_INCOMPLETOS",
        "La receta tiene componentes criticos incompletos.",
        {
          warnings: criticalWarnings,
        }
      );
    }

    const results = await runAllRecipeTests(id, validatedBy);
    const requiredResults = results.filter((test) => test.isRequired !== false);
    if (requiredResults.length === 0) {
      throw new FabricationRecipeServiceError(
        "VALIDACION_SIN_CASOS",
        "La receta necesita al menos un caso de prueba obligatorio antes de validarse."
      );
    }

    const failed = requiredResults.filter((test) => !test.passed);
    if (failed.length > 0) {
      throw new FabricationRecipeServiceError(
        "VALIDACION_CON_FALLOS",
        "La receta no se puede validar porque hay casos de prueba fallidos.",
        { failedTestIds: failed.map((test) => test.id) }
      );
    }

    return deps.recipesRepository.update(id, {
      status: "validated",
      validatedAt: now().toISOString(),
      validatedBy: validatedBy ?? null,
      definition: validationDefinition,
    });
  }

  return {
    getCurrentOrganizationId,
    createRecipe,
    getRecipeById,
    listRecipes,
    updateDraftRecipe,
    duplicateRecipe,
    createRecipeVersion,
    archiveRecipe,
    createRecipeTest,
    listRecipeTests,
    updateRecipeTest,
    runRecipeTest,
    runAllRecipeTests,
    validateRecipe,
  };
}

export type FabricationRecipesService = ReturnType<
  typeof createFabricationRecipesService
>;
