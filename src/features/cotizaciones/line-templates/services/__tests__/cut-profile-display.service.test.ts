import {
  isUnassignedProfileLabel,
  resolveCutProfileCode,
  resolveCutProfileDisplayCode,
  resolveCutProfileName,
} from "@/features/cotizaciones/line-templates/services/cut-profile-display.service";

describe("cut-profile-display.service", () => {
  it("resuelve código explícito y evita confundir nombre con código", () => {
    expect(
      resolveCutProfileCode({
        profileCode: "5001",
        label: "5001",
        profileName: "Riel superior",
        functionLabel: "Riel superior",
      })
    ).toBe("5001");

    expect(
      resolveCutProfileCode({
        profileCode: "",
        label: "Riel superior",
        profileName: "Riel superior",
        functionLabel: "Riel superior",
      })
    ).toBe("");
  });

  it("usa label legacy cuando parece código comercial", () => {
    expect(
      resolveCutProfileCode({
        profileCode: "",
        label: "RS01",
        profileName: "Riel superior propio",
        functionLabel: "Riel superior",
      })
    ).toBe("RS01");
  });

  it("expone nombre de perfil y fallback Por asignar", () => {
    expect(
      resolveCutProfileName({
        profileCode: "",
        label: "Por asignar",
        profileName: "Riel superior propio",
        functionLabel: "Riel superior",
      })
    ).toBe("Riel superior propio");

    expect(
      resolveCutProfileDisplayCode({
        profileCode: "",
        label: "Por asignar",
        profileName: "",
        functionLabel: "Jamba",
      })
    ).toBe("Por asignar");
  });

  it("reconoce etiquetas sin código", () => {
    expect(isUnassignedProfileLabel("Por asignar")).toBe(true);
    expect(isUnassignedProfileLabel("Perfil sin código")).toBe(true);
    expect(isUnassignedProfileLabel("5001")).toBe(false);
  });
});
