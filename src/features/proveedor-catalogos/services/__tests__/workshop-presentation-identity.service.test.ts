import {
  buildQuickWorkshopPresentationKey,
  hasQuickWorkshopPresentationDuplicate,
  isGeneratedWorkshopPresentationKey,
} from "../workshop-presentation-identity.service";

const identity = {
  organizationId: 3,
  familyKey: "universal:aluminio:l42",
  configurationKey: "ventora:l42-normal",
  technicalCode: " 4201 ",
  finishName: "Alumínio Maté",
};

describe("identidad de costos rápidos del taller", () => {
  it("genera una clave estable por empresa, familia, configuración, código y acabado", () => {
    const key = buildQuickWorkshopPresentationKey(identity);
    expect(key).toBe(buildQuickWorkshopPresentationKey({ ...identity, technicalCode: "4201", finishName: "aluminio mate" }));
    expect(isGeneratedWorkshopPresentationKey(key)).toBe(true);
    expect(key).not.toContain("4201");
    expect(buildQuickWorkshopPresentationKey({ ...identity, organizationId: 4 })).not.toBe(key);
    expect(buildQuickWorkshopPresentationKey({ ...identity, familyKey: "universal:pvc:7400" })).not.toBe(key);
    expect(buildQuickWorkshopPresentationKey({ ...identity, configurationKey: "ventora:l42-sin-camara" })).not.toBe(key);
    expect(buildQuickWorkshopPresentationKey({ ...identity, technicalCode: "4209" })).not.toBe(key);
    expect(buildQuickWorkshopPresentationKey({ ...identity, finishName: "Blanco" })).not.toBe(key);
  });

  it("detecta duplicados de la misma identidad física y separa acabado o configuración", () => {
    const rows = [{ configuration_key: identity.configurationKey, codigo_tecnico: "4201", acabado_nombre: "Aluminio Mate" }];
    expect(hasQuickWorkshopPresentationDuplicate(rows, { ...identity, technicalCode: " 4201 ", finishName: "aluminio mate" })).toBe(true);
    expect(hasQuickWorkshopPresentationDuplicate(rows, { ...identity, finishName: "Blanco" })).toBe(false);
    expect(hasQuickWorkshopPresentationDuplicate(rows, { ...identity, configurationKey: "otra-config" })).toBe(false);
  });
});
