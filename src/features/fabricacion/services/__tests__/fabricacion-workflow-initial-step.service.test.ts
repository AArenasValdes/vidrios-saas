import { resolveInitialFabricationStepForTemplate } from "@/features/fabricacion/services/fabricacion-workflow-initial-step.service";
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
});
