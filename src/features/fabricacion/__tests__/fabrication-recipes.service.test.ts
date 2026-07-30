import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { createFabricationRecipesService } from "@/features/fabricacion/services/fabrication-recipes.service";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";
import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  CreateFabricationRecipeInput,
  CreateFabricationRecipeTestInput,
  FabricationRecipeRecord,
  FabricationRecipeServiceError,
  FabricationRecipeTestRecord,
  ListFabricationRecipesFilters,
  UpdateFabricationRecipeInput,
  UpdateFabricationRecipeTestInput,
} from "@/features/fabricacion/types/fabricacion-persistence";

const NOW = "2026-07-29T12:00:00.000Z";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function baseInput(overrides: Partial<FabricacionEntradaCalculo> = {}) {
  return {
    anchoTotalMm: 1200,
    altoTotalMm: 1000,
    cantidad: 1,
    hojas: 2,
    modulos: 2,
    variante: "estandar",
    ...overrides,
  };
}

function createMemoryRepositories(initialRecipes: FabricationRecipeRecord[] = []) {
  const recipes = initialRecipes.map(clone);
  const tests: FabricationRecipeTestRecord[] = [];
  let recipeSeq = recipes.length + 1;
  let testSeq = 1;

  const recipesRepository = {
    async create(input: CreateFabricationRecipeInput) {
      const record: FabricationRecipeRecord = {
        id: `receta-${recipeSeq++}`,
        organizationId: input.organizationId,
        lineTemplateId: input.lineTemplateId ?? null,
        scope: input.scope,
        providerName: input.providerName,
        lineName: input.lineName,
        typology: input.typology,
        leavesCount: input.leavesCount ?? null,
        variant: input.variant ?? null,
        version: input.version ?? 1,
        status: input.status ?? "draft",
        definition: clone(input.definition),
        sourceType: input.sourceType ?? "manual",
        sourceReference: input.sourceReference ?? null,
        parentRecipeId: input.parentRecipeId ?? null,
        validatedAt: input.validatedAt ?? null,
        validatedBy: input.validatedBy ?? null,
        createdAt: NOW,
        updatedAt: NOW,
        eliminadoEn: null,
      };
      recipes.push(record);
      return clone(record);
    },
    async getById(
      id: string,
      options: { organizationId?: number | null; includeArchived?: boolean } = {}
    ) {
      const record = recipes.find((recipe) => recipe.id === id);
      if (!record) return null;
      if (!options.includeArchived && record.eliminadoEn != null) return null;
      if (
        record.scope === "organization" &&
        options.organizationId !== undefined &&
        record.organizationId !== options.organizationId
      ) {
        return null;
      }
      return clone(record);
    },
    async list(filters: ListFabricationRecipesFilters = {}) {
      return recipes
        .filter((recipe) => filters.includeArchived || recipe.eliminadoEn == null)
        .filter((recipe) =>
          filters.organizationId == null
            ? recipe.scope === "ventora"
            : recipe.scope === "ventora" || recipe.organizationId === filters.organizationId
        )
        .filter((recipe) =>
          filters.status == null ? true : recipe.status === filters.status
        )
        .map(clone);
    },
    async update(id: string, input: UpdateFabricationRecipeInput) {
      const index = recipes.findIndex(
        (recipe) => recipe.id === id && recipe.eliminadoEn == null
      );
      if (index < 0) throw new Error("receta no encontrada");
      recipes[index] = {
        ...recipes[index],
        lineTemplateId:
          input.lineTemplateId === undefined
            ? recipes[index].lineTemplateId
            : input.lineTemplateId,
        providerName: input.providerName ?? recipes[index].providerName,
        lineName: input.lineName ?? recipes[index].lineName,
        typology: input.typology ?? recipes[index].typology,
        leavesCount:
          input.leavesCount === undefined ? recipes[index].leavesCount : input.leavesCount,
        variant: input.variant === undefined ? recipes[index].variant : input.variant,
        status: input.status ?? recipes[index].status,
        definition: input.definition ? clone(input.definition) : recipes[index].definition,
        sourceReference:
          input.sourceReference === undefined
            ? recipes[index].sourceReference
            : input.sourceReference,
        validatedAt:
          input.validatedAt === undefined ? recipes[index].validatedAt : input.validatedAt,
        validatedBy:
          input.validatedBy === undefined ? recipes[index].validatedBy : input.validatedBy,
        updatedAt: NOW,
      };
      return clone(recipes[index]);
    },
    async softDelete(id: string) {
      const index = recipes.findIndex((recipe) => recipe.id === id);
      if (index < 0) throw new Error("receta no encontrada");
      recipes[index] = {
        ...recipes[index],
        status: "archived",
        eliminadoEn: NOW,
        updatedAt: NOW,
      };
      return clone(recipes[index]);
    },
  };

  const testsRepository = {
    async create(input: CreateFabricationRecipeTestInput) {
      const record: FabricationRecipeTestRecord = {
        id: `test-${testSeq++}`,
        recipeId: input.recipeId,
        organizationId: input.organizationId ?? null,
        name: input.name,
        input: clone(input.input),
        expectedOutput: clone(input.expectedOutput),
        actualOutput: input.actualOutput ? clone(input.actualOutput) : null,
        passed: input.passed ?? false,
        isRequired: input.isRequired ?? true,
        validatedBy: input.validatedBy ?? null,
        createdAt: NOW,
        updatedAt: NOW,
        eliminadoEn: null,
      };
      tests.push(record);
      return clone(record);
    },
    async getById(id: string) {
      const record = tests.find((test) => test.id === id && test.eliminadoEn == null);
      return record ? clone(record) : null;
    },
    async listByRecipeId(recipeId: string) {
      return tests
        .filter((test) => test.recipeId === recipeId && test.eliminadoEn == null)
        .map(clone);
    },
    async update(id: string, input: UpdateFabricationRecipeTestInput) {
      const index = tests.findIndex((test) => test.id === id && test.eliminadoEn == null);
      if (index < 0) throw new Error("test no encontrado");
      tests[index] = {
        ...tests[index],
        name: input.name ?? tests[index].name,
        input: input.input ? clone(input.input) : tests[index].input,
        expectedOutput: input.expectedOutput
          ? clone(input.expectedOutput)
          : tests[index].expectedOutput,
        actualOutput:
          input.actualOutput === undefined
            ? tests[index].actualOutput
            : input.actualOutput == null
              ? null
              : clone(input.actualOutput),
        passed: input.passed ?? tests[index].passed,
        isRequired:
          input.isRequired === undefined ? tests[index].isRequired : input.isRequired,
        validatedBy:
          input.validatedBy === undefined ? tests[index].validatedBy : input.validatedBy,
        updatedAt: NOW,
      };
      return clone(tests[index]);
    },
    async softDelete(id: string) {
      const index = tests.findIndex((test) => test.id === id);
      if (index < 0) throw new Error("test no encontrado");
      tests[index] = { ...tests[index], eliminadoEn: NOW, updatedAt: NOW };
      return clone(tests[index]);
    },
  };

  return { recipesRepository, testsRepository, recipes, tests };
}

function recipeRecord(
  overrides: Partial<FabricationRecipeRecord> = {}
): FabricationRecipeRecord {
  const definition = clone(RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO);
  return {
    id: "receta-base",
    organizationId: 10,
    lineTemplateId: 50,
    scope: "organization",
    providerName: "Proveedor ejemplo",
    lineName: "L5000",
    typology: "corredera",
    leavesCount: 2,
    variant: "estandar",
    version: 1,
    status: "draft",
    definition,
    sourceType: "manual",
    sourceReference: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    eliminadoEn: null,
    ...overrides,
  };
}

function createService(initialRecipes: FabricationRecipeRecord[] = []) {
  const repos = createMemoryRepositories(initialRecipes);
  return {
    ...repos,
    service: createFabricationRecipesService({
      recipesRepository: repos.recipesRepository,
      testsRepository: repos.testsRepository,
      now: () => new Date(NOW),
      createRecipeIdentityId: () => "receta-copia-estable",
    }),
  };
}

describe("fabrication-recipes.service", () => {
  it("rechaza definition invalida antes de guardar", async () => {
    const { service } = createService();
    const invalidDefinition = {
      ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
      perfiles: [{ id: "" }],
    } as unknown as FabricacionReceta;

    await expect(
      service.createRecipe({
        organizationId: 10,
        scope: "organization",
        providerName: "Proveedor",
        lineName: "L5000",
        typology: "corredera",
        definition: invalidDefinition,
      })
    ).rejects.toMatchObject({
      code: "RECETA_DEFINICION_INVALIDA",
    } satisfies Partial<FabricationRecipeServiceError>);
  });

  it("una organizacion no puede leer ni editar recetas privadas de otra", async () => {
    const { service } = createService([recipeRecord({ organizationId: 10 })]);

    await expect(service.getRecipeById("receta-base", { organizationId: 20 })).resolves.toBeNull();
    await expect(
      service.updateDraftRecipe("receta-base", 20, { lineName: "L20" })
    ).rejects.toMatchObject({ code: "RECETA_NO_ENCONTRADA" });
  });

  it("todas las organizaciones pueden leer recetas Ventora", async () => {
    const ventoraRecipe = recipeRecord({
      id: "receta-ventora",
      organizationId: null,
      scope: "ventora",
    });
    const { service } = createService([ventoraRecipe]);

    const result = await service.getRecipeById("receta-ventora", {
      organizationId: 33,
    });

    expect(result?.scope).toBe("ventora");
    await expect(service.listRecipes({ organizationId: 33 })).resolves.toHaveLength(1);
  });

  it("una receta validada no se edita directamente", async () => {
    const { service } = createService([
      recipeRecord({ status: "validated", definition: {
        ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
        estado: "validada",
      } }),
    ]);

    await expect(
      service.updateDraftRecipe("receta-base", 10, { lineName: "L25" })
    ).rejects.toMatchObject({ code: "RECETA_VALIDADA_BLOQUEADA" });
  });

  it("crear una nueva version conserva la anterior", async () => {
    const original = recipeRecord({
      status: "validated",
      definition: {
        ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
        estado: "validada",
      },
    });
    const { service, recipes } = createService([original]);

    const version = await service.createRecipeVersion("receta-base", {
      organizationId: 10,
      status: "review_required",
    });

    expect(version.version).toBe(2);
    expect(version.parentRecipeId).toBe("receta-base");
    expect(version.status).toBe("review_required");
    expect(recipes.find((recipe) => recipe.id === "receta-base")?.version).toBe(1);
    expect(recipes.find((recipe) => recipe.id === "receta-base")?.status).toBe(
      "validated"
    );
  });

  it("una receta no se valida si un test falla", async () => {
    const { service } = createService([recipeRecord()]);
    const input = baseInput();
    const expected = calcularCubicacionYPauta(
      RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
      input
    );

    await service.createRecipeTest({
      recipeId: "receta-base",
      organizationId: 10,
      name: "Caso con salida incorrecta",
      input,
      expectedOutput: { ...expected, totalLinealMm: expected.totalLinealMm + 1 },
    });

    await expect(service.validateRecipe("receta-base", 10)).rejects.toMatchObject({
      code: "VALIDACION_CON_FALLOS",
    });
  });

  it("una receta se valida cuando todos los tests pasan", async () => {
    const { service } = createService([recipeRecord()]);
    const input = baseInput({ anchoTotalMm: 1500, altoTotalMm: 1100, cantidad: 2 });
    const expected = calcularCubicacionYPauta(
      RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
      input
    );

    await service.createRecipeTest({
      recipeId: "receta-base",
      organizationId: 10,
      name: "Corredera 2 hojas 1500x1100 x2",
      input,
      expectedOutput: expected,
    });

    const validated = await service.validateRecipe("receta-base", 10, "user-1");

    expect(validated.status).toBe("validated");
    expect(validated.validatedAt).toBe(NOW);
    expect(validated.validatedBy).toBe("user-1");
    expect(validated.definition.estado).toBe("validada");
  });

  it("ignora un caso opcional fallido si todos los obligatorios pasan", async () => {
    const { service } = createService([recipeRecord()]);
    const input = baseInput();
    const expected = calcularCubicacionYPauta(
      RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
      input
    );

    await service.createRecipeTest({
      recipeId: "receta-base",
      organizationId: 10,
      name: "Caso obligatorio",
      input,
      expectedOutput: expected,
      isRequired: true,
    });
    await service.createRecipeTest({
      recipeId: "receta-base",
      organizationId: 10,
      name: "Caso opcional con diferencia",
      input,
      expectedOutput: { ...expected, totalLinealMm: expected.totalLinealMm + 1 },
      isRequired: false,
    });

    await expect(service.validateRecipe("receta-base", 10)).resolves.toMatchObject({
      status: "validated",
    });
  });

  it("impide validar cuando falta el codigo de un perfil obligatorio", async () => {
    const incomplete = recipeRecord({
      definition: {
        ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
        perfiles: RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.perfiles.map(
          (profile, index) =>
            index === 0 ? { ...profile, codigoPerfil: "" } : profile
        ),
      },
    });
    const { service } = createService([incomplete]);

    await expect(service.validateRecipe("receta-base", 10)).rejects.toMatchObject({
      code: "VALIDACION_COMPONENTES_INCOMPLETOS",
    });
  });

  it("soft delete archiva la receta y la excluye del listado", async () => {
    const { service } = createService([recipeRecord()]);

    const archived = await service.archiveRecipe("receta-base", 10);

    expect(archived.status).toBe("archived");
    await expect(service.listRecipes({ organizationId: 10 })).resolves.toEqual([]);
  });

  it("duplicar una receta Ventora crea una receta privada independiente", async () => {
    const ventoraRecipe = recipeRecord({
      id: "receta-ventora",
      organizationId: null,
      scope: "ventora",
      status: "validated",
      definition: {
        ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
        estado: "validada",
      },
    });
    const { service } = createService([ventoraRecipe]);

    const copy = await service.duplicateRecipe("receta-ventora", 77);

    expect(copy.scope).toBe("organization");
    expect(copy.organizationId).toBe(77);
    expect(copy.sourceType).toBe("copied");
    expect(copy.sourceReference).toBe("receta-ventora");
    expect(copy.parentRecipeId).toBeNull();
    expect(copy.definition.identidad.recetaId).toBe("receta-copia-estable");
    expect(copy.status).toBe("draft");
  });
});
