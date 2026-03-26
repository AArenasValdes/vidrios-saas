import {
  getComponentSuggestion,
  getSuggestedReferenceByProvider,
  normalizePreferredProvider,
} from "../component-suggestions.service";

describe("component-suggestions.service", () => {
  it("debe sugerir valores base para una ventana", () => {
    const suggestion = getComponentSuggestion({
      tipo: "Ventana",
      provider: "",
    });

    expect(suggestion).toMatchObject({
      tipo: "Ventana",
      material: "Aluminio",
      vidrio: "Incoloro monolítico 5mm",
      margenPct: 80,
      referencia: "",
    });
  });

  it("debe sugerir la linea segun proveedor cuando existe", () => {
    expect(getSuggestedReferenceByProvider("Puerta", "Indalum")).toBe("Serie 35");
    expect(getSuggestedReferenceByProvider("Ventana", "TecnoPerfiles")).toBe("TP 4000");
  });

  it("debe normalizar proveedor desconocido y usar fallback para tipos no mapeados", () => {
    expect(normalizePreferredProvider("Proveedor X")).toBe("");

    const suggestion = getComponentSuggestion({
      tipo: "Mampara especial",
      provider: "Proveedor X",
    });

    expect(suggestion).toMatchObject({
      tipo: "Mampara especial",
      material: "Aluminio",
      margenPct: 70,
      referencia: "",
    });
  });
});
