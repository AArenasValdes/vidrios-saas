import { crearRecetaPlantillaVentoraCorredera2H } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { deriveLineOperationalStatus } from "@/features/fabricacion/services/line-operational-status.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const recipeDefinition = crearRecetaPlantillaVentoraCorredera2H("L5000");

function makeTemplate(overrides: { price?: number; active?: boolean } = {}) {
  return {
    isActive: overrides.active ?? true,
    precioM2Sugerido: overrides.price ?? 0,
  };
}

function makeValidatedRecipe(): FabricationRecipeRecord {
  return {
    id: "recipe-validated",
    organizationId: 7,
    lineTemplateId: 312,
    scope: "organization",
    providerName: "SODAL",
    lineName: "L5000",
    typology: "corredera",
    leavesCount: 2,
    variant: "L5000",
    version: 1,
    status: "validated",
    definition: recipeDefinition,
    sourceType: "manual",
    sourceReference: "base-ventora:corredera:2",
    parentRecipeId: null,
    validatedAt: "2026-09-14T12:00:00.000Z",
    validatedBy: "user-1",
    createdAt: "2026-09-14T12:00:00.000Z",
    updatedAt: "2026-09-14T12:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("line-operational-status.service", () => {
  it("separa receta calculable, evidencia documentada y precio pendiente", () => {
    const status = deriveLineOperationalStatus({
      template: makeTemplate(),
      referenceRecipe: recipeDefinition,
      referenceSource: {
        sourceType: "ventora_reference",
        sourceReference: "ventora:l5000",
        sourceName: "Referencia Ventora",
      },
    });

    expect(status).toMatchObject({
      technicalStatus: "calculable",
      validationStatus: "documented",
      pricingStatus: "missing",
      quotable: false,
      label: "Precio pendiente",
    });
  });

  it("habilita cotizar solo con línea activa y precio comercial válido", () => {
    expect(
      deriveLineOperationalStatus({
        template: makeTemplate({ price: 80000 }),
        referenceRecipe: recipeDefinition,
        referenceSource: { sourceType: "ventora_reference" },
      })
    ).toMatchObject({
      pricingStatus: "configured",
      quotable: true,
      label: "Pauta documentada",
    });

    expect(
      deriveLineOperationalStatus({
        template: makeTemplate({ price: 80000, active: false }),
        referenceRecipe: recipeDefinition,
        referenceSource: { sourceType: "ventora_reference" },
      }).quotable
    ).toBe(false);
  });

  it("no trata una receta validada como validada en taller sin evidencia explícita", () => {
    const status = deriveLineOperationalStatus({
      template: makeTemplate({ price: 80000 }),
      recipes: [makeValidatedRecipe()],
    });

    expect(status).toMatchObject({
      technicalStatus: "calculable",
      validationStatus: "unverified",
      pricingStatus: "configured",
      quotable: true,
      label: "Lista para probar",
    });
  });

  it("solo marca taller con sourceType workshop y referencia explícita", () => {
    const status = deriveLineOperationalStatus({
      template: makeTemplate({ price: 80000 }),
      recipes: [
        {
          ...makeValidatedRecipe(),
          sourceType: "workshop",
          sourceName: "Pauta firmada taller Ventora",
          sourceReference: "taller:orden-2026-09",
        },
      ],
    });

    expect(status).toMatchObject({
      validationStatus: "workshop_validated",
      label: "Validada en taller",
    });
  });
});
