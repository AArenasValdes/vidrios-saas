import {
  getFabricacionVisualStatus,
  getMobileWizardStepIndex,
  mapMobileWizardToWorkflowStep,
  mapWorkflowStepToMobileWizard,
  MOBILE_WIZARD_STEPS,
} from "@/features/fabricacion/services/fabricacion-line-workflow.utils";

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
    expect(getFabricacionVisualStatus("testing").label).toBe("Validada");
    expect(getFabricacionVisualStatus("validated").label).toBe("Activa");
    expect(getFabricacionVisualStatus("quote_only").label).toBe("Sin configurar");
  });
});
