import {
  getGlassRecommendations,
  isRecommendedGlass,
} from "../glass-recommendations.service";

describe("glass-recommendations service", () => {
  const catalogo = [
    "Espejo 3mm",
    "Espejo 4mm",
    "Espejo 5mm",
    "Espejo 6mm",
    "Incoloro monolitico 5mm",
    "Incoloro monolitico 6mm",
    "DVH 4+12+4",
    "DVH 3+3 / 12 / 3+3.",
    "Laminado 3+3",
    "Laminado 4+4",
    "Laminado 5+5",
    "Templado 8mm",
    "Templado 10mm",
    "Templado 12mm",
    "Reflectivo Gris 6mm",
  ] as const;

  it("debe recomendar DVH y monoliticos para ventana corredera", () => {
    const result = getGlassRecommendations(
      { subtipo: "Ventana", sistema: "Corredera" },
      catalogo
    );

    expect(result.recommendedOptions).toEqual([
      "DVH 4+12+4",
      "DVH 3+3 / 12 / 3+3.",
      "Incoloro monolitico 5mm",
      "Incoloro monolitico 6mm",
    ]);
  });

  it("debe recomendar templados para shower door sin bloquear el resto", () => {
    const result = getGlassRecommendations(
      { subtipo: "Shower door", sistema: "Batiente" },
      catalogo
    );

    expect(result.recommendedOptions).toEqual(["Templado 8mm", "Templado 10mm"]);
    expect(isRecommendedGlass("Reflectivo Gris 6mm", result.recommendedOptions)).toBe(
      false
    );
  });

  it("debe recomendar laminados y templados para barandas", () => {
    const result = getGlassRecommendations(
      { subtipo: "Baranda", sistema: "Postes" },
      catalogo
    );

    expect(result.recommendedOptions).toEqual([
      "Laminado 4+4",
      "Laminado 5+5",
      "Templado 10mm",
      "Templado 12mm",
    ]);
  });

  it("debe recomendar templado y laminado para cierres exteriores", () => {
    const result = getGlassRecommendations(
      { subtipo: "Cierre terraza/logia", sistema: "Plegable" },
      catalogo
    );

    expect(result.recommendedOptions).toEqual([
      "Templado 8mm",
      "Templado 10mm",
      "Laminado 4+4",
    ]);
    expect(isRecommendedGlass("Incoloro monolitico 5mm", result.recommendedOptions)).toBe(
      false
    );
  });

  it("debe recomendar espesores de espejo para componentes Espejo", () => {
    const result = getGlassRecommendations(
      { subtipo: "Espejo", sistema: "Muro" },
      catalogo
    );

    expect(result.recommendedOptions).toEqual([
      "Espejo 3mm",
      "Espejo 4mm",
      "Espejo 5mm",
      "Espejo 6mm",
    ]);
    expect(result.reason).toContain("espejos");
  });

  it("debe poner primero el vidrio recomendado por la linea sin bloquear el resto", () => {
    const result = getGlassRecommendations(
      {
        subtipo: "Ventana",
        sistema: "Corredera",
        lineTemplateRecommendedGlass: "Templado 10mm",
      },
      catalogo
    );

    expect(result.lineTemplateRecommendedOption).toBe("Templado 10mm");
    expect(result.recommendedOptions[0]).toBe("Templado 10mm");
    expect(result.recommendedOptions).toContain("DVH 4+12+4");
    expect(result.reason).toBe("Sugerido por tu línea");
  });
});
