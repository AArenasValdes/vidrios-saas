import {
  applyUniqueDeclaredCatalogComposition,
  resolveInitialFabricationStepForTemplate,
  resolveUniqueDeclaredCatalogComposition,
  resolveMobileVariantTreeEntryStep,
} from "@/features/fabricacion/services/fabricacion-workflow-initial-step.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { crearRecetaFabricacionVacia } from "@/features/fabricacion/services/fabricacion-receta-editor.service";

function buildRecipe(overrides?: Partial<FabricationRecipeRecord>): FabricationRecipeRecord {
  return {
    id: "recipe-1",
    organizationId: 1,
    lineTemplateId: 10,
    scope: "organization",
    providerName: "WinHouse",
    lineName: "WinHouse Andes Monorriel",
    typology: "corredera",
    leavesCount: 2,
    variant: null,
    version: 1,
    status: "draft",
    sourceType: "copied",
    sourceReference: "ventora-arquetipo:pvc_corredera_2h",
    definition: crearRecetaFabricacionVacia({
      recipeIdentityId: "identity-1",
      lineName: "WinHouse Andes Monorriel",
    }),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    validatedAt: null,
    ...overrides,
  };
}

describe("resolveInitialFabricationStepForTemplate", () => {
  it("abre en componentes para líneas Ventora con piezas estructurales", () => {
    const recipe = buildRecipe({
      definition: {
        ...buildRecipe().definition,
        perfiles: [
          {
            id: "p1",
            funcion: "Marco PVC superior",
            nombrePerfil: "",
            codigoPerfil: "",
            requerido: true,
            reglaMedida: { base: "ancho_hoja", ajusteMm: 0 },
            reglaCantidad: { tipo: "fijo", cantidad: 1 },
            largoComercialMm: null,
            tallerPerfilId: null,
          },
        ],
      },
    });

    expect(
      resolveInitialFabricationStepForTemplate(
        { catalogKey: "ventora:winhouse-andes-monorriel" },
        recipe
      )
    ).toBe("components");
  });

  it("mantiene base para líneas privadas sin catálogo Ventora", () => {
    const recipe = buildRecipe({
      sourceReference: "blank-start",
      definition: {
        ...buildRecipe().definition,
        perfiles: [
          {
            id: "p1",
            funcion: "Marco",
            nombrePerfil: "",
            codigoPerfil: "",
            requerido: true,
            reglaMedida: { base: "ancho_hoja", ajusteMm: 0 },
            reglaCantidad: { tipo: "fijo", cantidad: 1 },
            largoComercialMm: null,
            tallerPerfilId: null,
          },
        ],
      },
    });

    expect(
      resolveInitialFabricationStepForTemplate({ catalogKey: null }, recipe)
    ).toBe("base");
  });

  it("mantiene base si la línea Ventora aún no tiene perfiles", () => {
    const recipe = buildRecipe();

    expect(
      resolveInitialFabricationStepForTemplate(
        { catalogKey: "ventora:l5000" },
        recipe
      )
    ).toBe("base");
  });

  it("abre directo en componentes cuando la línea ya representa una configuración completa del catálogo", () => {
    const recipe = buildRecipe();
    expect(
      resolveInitialFabricationStepForTemplate(
        { catalogKey: "ventora:kompen-form-line-800:configuration:ventana-monoriel" },
        recipe
      )
    ).toBe("components");

    const resolved = resolveUniqueDeclaredCatalogComposition(
      "ventora:kompen-form-line-800:configuration:ventana-monoriel"
    );
    expect(resolved).toMatchObject({
      configuration: { id: "ventana-monoriel", typology: "corredera" },
      compositionId: "fijo-1-movil",
      leavesCount: 2,
    });
  });

  it.each([
    ["ventora:kompen-form-line-800", "2-moviles"],
    ["ventora:kompen-form-line-800:configuration:ventana-triple-riel", "3-moviles"],
  ])("resuelve la composición declarada para %s", (catalogKey, compositionId) => {
    expect(resolveUniqueDeclaredCatalogComposition(catalogKey)?.compositionId).toBe(
      compositionId
    );
  });

  it("mantiene el paso de producto para seleccionar la única construcción L20 respaldada", () => {
    expect(
      resolveInitialFabricationStepForTemplate(
        { catalogKey: "ventora:l20" },
        buildRecipe({ definition: { ...buildRecipe().definition, perfiles: [{
          id: "p1",
          funcion: "Riel superior",
          nombrePerfil: "2001",
          codigoPerfil: "2001",
          requerido: true,
          reglaMedida: { base: "ancho_total", ajusteMm: -12 },
          reglaCantidad: { tipo: "fijo", cantidad: 1 },
          largoComercialMm: 6000,
          tallerPerfilId: null,
        }] } })
      )
    ).toBe("base");
  });

  it("no salta a componentes si la entrada del catálogo no declara hojas", () => {
    expect(
      resolveInitialFabricationStepForTemplate(
        { catalogKey: "ventora:kompen-prime-line-700" },
        buildRecipe()
      )
    ).toBe("base");
  });

  it("prepara identidad exacta de catálogo en memoria sin alterar reglas de corte", () => {
    const recipe = buildRecipe().definition;
    const catalogKey = "ventora:kompen-form-line-800:configuration:ventana-monoriel";
    const prepared = applyUniqueDeclaredCatalogComposition(recipe, catalogKey);
    expect(prepared.identidad).toMatchObject({
      configurationId: "ventana-monoriel",
      compositionId: "fijo-1-movil",
      configurationRevision: 1,
      tipologia: "corredera",
      variante: "ventana-monoriel",
    });
    expect(prepared.perfiles).toEqual(recipe.perfiles);
    expect(
      applyUniqueDeclaredCatalogComposition(prepared, catalogKey)
    ).toBe(prepared);
  });

  it("abre en producto cuando la línea tiene variaciones", () => {
    const recipe = buildRecipe({
      definition: {
        ...buildRecipe().definition,
        perfiles: [
          {
            id: "p1",
            funcion: "Riel superior",
            nombrePerfil: "2001",
            codigoPerfil: "2001",
            requerido: true,
            reglaMedida: { base: "ancho_total", ajusteMm: -12 },
            reglaCantidad: { tipo: "fijo", cantidad: 1 },
            largoComercialMm: 6000,
            tallerPerfilId: null,
          },
        ],
      },
    });

    expect(
      resolveInitialFabricationStepForTemplate({ catalogKey: "ventora:l20" }, recipe)
    ).toBe("base");
    expect(
      resolveInitialFabricationStepForTemplate({ catalogKey: "ventora:l25" }, recipe)
    ).toBe("base");
  });
});

describe("resolveMobileVariantTreeEntryStep", () => {
  it("abre en producto al tocar una variante de línea con construcciones", () => {
    const recipe = buildRecipe({
      status: "validated",
      definition: {
        ...buildRecipe().definition,
        perfiles: [
          {
            id: "p1",
            funcion: "Riel superior",
            nombrePerfil: "2001",
            codigoPerfil: "2001",
            requerido: true,
            reglaMedida: { base: "ancho_total", ajusteMm: -12 },
            reglaCantidad: { tipo: "fijo", cantidad: 1 },
            largoComercialMm: 6000,
            tallerPerfilId: null,
          },
        ],
      },
    });

    expect(
      resolveMobileVariantTreeEntryStep({ catalogKey: "ventora:l20" }, recipe)
    ).toBe("base");
  });
});
