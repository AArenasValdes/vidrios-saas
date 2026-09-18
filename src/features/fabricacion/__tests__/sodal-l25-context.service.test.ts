import {
  applySodalL25VidrioToForm,
  resolveSodalL25QuoteConfig,
} from "@/features/fabricacion/services/sodal-l25-context.service";

describe("sodal-l25-context.service", () => {
  it("prioriza el vidrio elegido sobre un glazing L25 stale", () => {
    const config = resolveSodalL25QuoteConfig({
      catalogKey: "ventora:l25",
      presentation: {
        fabricacionGlazing: "monolithic",
        fabricacionLeg: "open",
        fabricacionReinforcement: "reinforced",
        fabricacionVariante: "monolithic_open_reinforced",
        fabricacionHojas: 3,
        sheetScheme: "3 hojas",
      },
      vidrio: "DVH 4+12+4",
      fabricacionHojas: 3,
      sheetScheme: "3 hojas",
    });

    expect(config).toMatchObject({
      glazing: "dvh",
      leg: "open",
      reinforcement: "reinforced",
      variantSlug: "dvh_open_reinforced",
      hojas: 3,
      complete: true,
    });
  });

  it("sincroniza glazing y variante al cambiar el vidrio en el formulario", () => {
    const next = applySodalL25VidrioToForm(
      {
        catalogLineKey: "ventora:l25",
        referencia: "L25",
        fabricacionGlazing: "monolithic",
        fabricacionLeg: "open",
        fabricacionReinforcement: "normal",
        fabricacionVariante: "monolithic_open_normal",
      },
      "DVH 4+12+4"
    );

    expect(next.vidrio).toBe("DVH 4+12+4");
    expect(next.fabricacionGlazing).toBe("dvh");
    expect(next.fabricacionVariante).toBe("dvh_open_normal");
  });
});
