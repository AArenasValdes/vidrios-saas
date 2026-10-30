import { crearRecetaL20AlumetricaVariant } from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
import { getLineVariantSlots, getLineVariantSlotsForFabricationTree, shouldShowFabricationVariantGallery } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import {
  buildLineVariantPickerModel,
  describeLineVariantCoverage,
  lineUsesVariantProductPicker,
} from "@/features/fabricacion/services/line-variant-picker.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function recipeFromDefinition(
  definition: ReturnType<typeof crearRecetaL20AlumetricaVariant>,
  id: string
): FabricationRecipeRecord {
  return {
    id,
    organizationId: 1,
    lineTemplateId: 10,
    scope: "organization",
    providerName: "",
    lineName: "Serie 20",
    typology: definition.identidad.tipologia,
    leavesCount: definition.identidad.hojas,
    variant: definition.identidad.variante,
    version: 1,
    status: "draft",
    definition,
    sourceType: "workshop",
    sourceReference: null,
    sourceName: null,
    sourceRevision: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("line-variant-picker.service", () => {
  it("solo expone un picker cuando hay varias construcciones respaldadas", () => {
    expect(lineUsesVariantProductPicker("ventora:l20")).toBe(true);
    expect(lineUsesVariantProductPicker("ventora:l20-fijos")).toBe(false);
    expect(lineUsesVariantProductPicker("ventora:l25")).toBe(true);
    expect(lineUsesVariantProductPicker("ventora:l5000")).toBe(false);
  });

  it("mantiene la galería para la corredera documentada sin mostrar una opción Fijos", () => {
    const corredera = recipeFromDefinition(
      crearRecetaL20AlumetricaVariant({
        variant: "pierna_abierta_jamba_2009",
        lineName: "Serie 20",
      }),
      "c1"
    );
    const model = buildLineVariantPickerModel({
      catalogKey: "ventora:l20",
      recipes: [corredera],
      recipe: corredera.definition,
    });

    expect(model).toBeNull();
    expect(shouldShowFabricationVariantGallery("ventora:l20")).toBe(true);
    expect(shouldShowFabricationVariantGallery("ventora:l20-fijos")).toBe(false);
  });

  it("retira Fijos del árbol seleccionable y conserva sus referencias históricas", () => {
    expect(getLineVariantSlotsForFabricationTree("ventora:l20").map((slot) => slot.apertura)).toEqual(["corredera"]);
    expect(getLineVariantSlotsForFabricationTree("ventora:l20-fijos")).toEqual([]);
    expect(getLineVariantSlots("ventora:l20-fijos")).toHaveLength(4);
    expect(buildLineVariantPickerModel({ catalogKey: "ventora:l20-fijos", recipes: [], recipe: null })).toBeNull();
    expect(describeLineVariantCoverage({ catalogKey: "ventora:l20-fijos", recipes: [] })).toBeNull();
    expect(describeLineVariantCoverage({ catalogKey: "ventora:l20", recipes: [] })).toBeNull();
    expect(describeLineVariantCoverage({ catalogKey: "ventora:l20-fijos", recipes: [] })).toBeNull();
  });
});
