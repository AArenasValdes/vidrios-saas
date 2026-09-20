import {
  getFabricacionVisualStatus,
  getMobileWizardStepIndex,
  mapMobileWizardToWorkflowStep,
  mapWorkflowStepToMobileWizard,
  MOBILE_WIZARD_STEPS,
  resolveFabricacionRecipeHistory,
} from "@/features/fabricacion/services/fabricacion-line-workflow.utils";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

describe("fabricacion-line-workflow.utils mobile", () => {
  it("expone exactamente 4 pasos del wizard", () => {
    expect(MOBILE_WIZARD_STEPS.map((step) => step.id)).toEqual([
      "product",
      "profiles",
      "glass",
      "validate",
    ]);
    expect(getMobileWizardStepIndex("validate")).toBe(3);
  });

  it("mapea el workflow interno a los 4 pasos mobile", () => {
    expect(mapWorkflowStepToMobileWizard("base")).toBe("product");
    expect(mapWorkflowStepToMobileWizard("components")).toBe("profiles");
    expect(mapWorkflowStepToMobileWizard("test")).toBe("validate");
    expect(mapMobileWizardToWorkflowStep("product")).toBe("base");
    expect(mapMobileWizardToWorkflowStep("validate")).toBe("test");
  });

  it("resume estados persistidos a Borrador / Validada / Activa", () => {
    expect(getFabricacionVisualStatus("draft").label).toBe("Borrador");
    expect(getFabricacionVisualStatus("review_required").label).toBe("Borrador");
    expect(getFabricacionVisualStatus("testing").label).toBe("En prueba");
    expect(getFabricacionVisualStatus("testing").tone).toBe("testing");
    expect(getFabricacionVisualStatus("validated").label).toBe("Activa");
    expect(getFabricacionVisualStatus("archived").label).toBe("Archivada");
    expect(getFabricacionVisualStatus("quote_only").label).toBe("Sin configurar");
  });
});

function makeHistoryRecipe(input: {
  id: string;
  variant?: string;
  status?: FabricationRecipeRecord["status"];
}): FabricationRecipeRecord {
  return {
    id: input.id,
    organizationId: 1,
    scope: "organization",
    lineTemplateId: 12,
    providerName: "Sodal",
    lineName: "Serie 20 — Fijos",
    typology: "corredera",
    leavesCount: 2,
    variant: input.variant ?? "pierna_abierta",
    version: 1,
    status: input.status ?? "draft",
    definition: {
      identidad: {
        recetaId: input.id,
        codigo: input.id,
        nombre: `Serie 20 · ${input.variant ?? "pierna_abierta"}`,
        tipologia: "corredera",
        hojas: 2,
        modulos: 2,
        variante: input.variant ?? "pierna_abierta",
        apertura: "fija",
        herraje: null,
      },
      schemaVersion: 1,
      version: 1,
      perfiles: [],
      vidrios: [],
      accesorios: [],
    },
    sourceType: "manual",
    sourceReference: null,
    sourceName: null,
    sourceRevision: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("resolveFabricacionRecipeHistory", () => {
  it("no trata variantes hermanas como historial cuando hay galería", () => {
    const recipes = [
      makeHistoryRecipe({ id: "a", variant: "pierna_abierta" }),
      makeHistoryRecipe({ id: "b", variant: "pierna_cerrada" }),
      makeHistoryRecipe({ id: "c", variant: "tp_15mm" }),
    ];

    expect(
      resolveFabricacionRecipeHistory({
        recipes,
        showVariantGallery: true,
        focusRecipeId: "a",
      })
    ).toHaveLength(0);
  });

  it("incluye solo recetas archivadas en líneas multi-variante", () => {
    const recipes = [
      makeHistoryRecipe({ id: "a", variant: "pierna_abierta" }),
      makeHistoryRecipe({ id: "old", variant: "pierna_abierta", status: "archived" }),
    ];

    expect(
      resolveFabricacionRecipeHistory({
        recipes,
        showVariantGallery: true,
        focusRecipeId: "a",
      }).map((recipe) => recipe.id)
    ).toEqual(["old"]);
  });
});
