import { crearRecetaFabricacionVacia } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { resolveUniqueRecipeGlassRecommendation } from "@/features/fabricacion/services/fabricacion-line-glass-recommendation.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function buildRecipe(
  id: string,
  glassName: string
): FabricationRecipeRecord {
  const definition = crearRecetaFabricacionVacia({
    recipeIdentityId: `identity-${id}`,
    lineName: "Línea de prueba",
  });
  definition.vidrios = [{
    id: `glass-${id}`,
    nombre: glassName,
    reglaAncho: { base: "ancho_total", ajusteMm: 0, multiplicador: 1 },
    reglaAlto: { base: "alto_total", ajusteMm: 0, multiplicador: 1 },
    reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1 },
    requerido: true,
  }];

  return {
    id,
    organizationId: 1,
    lineTemplateId: 100,
    scope: "organization",
    providerName: "Proveedor",
    lineName: "Línea de prueba",
    typology: "corredera",
    leavesCount: 2,
    variant: null,
    version: 1,
    status: "draft",
    sourceType: "copied",
    sourceReference: "test",
    definition,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    validatedAt: null,
  };
}

describe("resolveUniqueRecipeGlassRecommendation", () => {
  it("recomienda el vidrio configurado cuando las variantes coinciden", () => {
    const saved = buildRecipe("selected", "  Incoloro monolítico 5mm ").definition;
    expect(
      resolveUniqueRecipeGlassRecommendation(
        [buildRecipe("other", "incoloro monolitico 5mm")],
        "selected",
        saved
      )
    ).toBe("Incoloro monolítico 5mm");
  });

  it("ignora nombres genéricos sin tipo definido", () => {
    expect(
      resolveUniqueRecipeGlassRecommendation(
        [],
        "selected",
        buildRecipe("selected", "Vidrio principal").definition
      )
    ).toBeNull();
  });

  it("no elige un recomendado global si dos variantes usan vidrios distintos", () => {
    expect(
      resolveUniqueRecipeGlassRecommendation(
        [buildRecipe("other", "DVH 4+10+5")],
        "selected",
        buildRecipe("selected", "Monolítico 5mm").definition
      )
    ).toBeNull();
  });
});
