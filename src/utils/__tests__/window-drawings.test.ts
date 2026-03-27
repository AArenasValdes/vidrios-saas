import { generateComponentSVG } from "@/utils/window-drawings";

describe("generateComponentSVG", () => {
  it("retorna un string SVG valido", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
    });

    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("genera un SVG para cada tipo sin lanzar error", () => {
    const tipos = [
      "Ventana",
      "Puerta",
      "Paño Fijo",
      "Shower door",
      "Cierre (Logia/Balcón)",
      "Baranda",
      "Espejo",
      "Tapa de mesa",
      "Otro",
    ];

    tipos.forEach((tipo) => {
      expect(() =>
        generateComponentSVG({
          tipo,
          ancho: 1200,
          alto: 1000,
        })
      ).not.toThrow();
    });
  });

  it("muestra las cotas reales cuando vienen ancho y alto", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
    });

    expect(svg).toContain("1200 mm");
    expect(svg).toContain("1000 mm");
  });

  it("muestra cotas vacias cuando no hay medidas", () => {
    const svg = generateComponentSVG({
      tipo: "Otro",
      ancho: null,
      alto: null,
    });

    expect(svg).toContain("— mm");
  });

  it("no contiene variables de color de marca ni CSS dinamico", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
    });

    expect(svg).not.toContain("var(--brand");
    expect(svg).not.toContain("--brand");
  });

  it("aplica el color del producto cuando se entrega colorHex", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
      colorHex: "#b87333",
    });

    expect(svg).toContain("#975e2a");
    expect(svg).toContain("rgba(184,115,51,0.38)");
  });

  it("usa una variante pdf sin label interno y con cotas compactas", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 2869,
      alto: 2100,
      variant: "pdf",
    });

    expect(svg).toContain('width="5"');
    expect(svg).toContain('font-size="7"');
    expect(svg).not.toContain("Ventana corredera");
    expect(svg).not.toContain("VISTA INTERIOR REFERENCIAL");
  });
});
