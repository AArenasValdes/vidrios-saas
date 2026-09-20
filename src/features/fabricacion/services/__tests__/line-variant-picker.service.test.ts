import { crearRecetaL20AlumetricaVariant } from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
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
  it("marca L20 y L25 como líneas con picker de variaciones", () => {
    expect(lineUsesVariantProductPicker("ventora:l20")).toBe(true);
    expect(lineUsesVariantProductPicker("ventora:l20-fijos")).toBe(true);
    expect(lineUsesVariantProductPicker("ventora:l25")).toBe(true);
    expect(lineUsesVariantProductPicker("ventora:l5000")).toBe(false);
  });

  it("expone apertura y construcción para Serie 20", () => {
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

    expect(model?.axes.map((axis) => axis.id)).toEqual(["apertura", "construccion"]);
    expect(model?.selection.apertura).toBe("corredera");
    expect(model?.axes.find((axis) => axis.id === "apertura")?.options.map((option) => option.label)).toEqual([
      "Corredera",
      "Fijos",
    ]);
  });

  it("resume 1 corredera y 4 fijos", () => {
    const coverage = describeLineVariantCoverage({
      catalogKey: "ventora:l20",
      recipes: [],
    });
    expect(coverage?.totalCount).toBe(5);
    expect(coverage?.subtitle).toBe("1 corredera y 4 fijos");
  });
});
