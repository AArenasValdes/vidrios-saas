import { generateComponentSVG } from "@/utils/window-drawings";

function getPrimaryFrameSize(svg: string) {
  const match = svg.match(
    /<rect x="[^"]+" y="[^"]+" width="([^"]+)" height="([^"]+)" fill="none" stroke="[^"]+" stroke-width="[^"]+" rx="0.5"/
  );

  return {
    width: match ? Number(match[1]) : 0,
    height: match ? Number(match[2]) : 0,
  };
}

describe("generateComponentSVG", () => {
  it("retorna un string SVG válido", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
    });

    expect(svg.trimStart().startsWith("<svg")).toBe(true);
  });

  it("genera un SVG para cada tipo sin lanzar error", () => {
    const tipos = [
      "Ventana",
      "Puerta",
      "Paño Fijo",
      "Shower door",
      "Cierre (Logia/Balcón)",
      "Cierre terraza/logia",
      "Baranda",
      "Espejo",
      "Tapa de mesa",
      "Fachada vidriada",
      "Muro cortina",
      "Vitrina",
      "Lucarna o techo vidriado",
      "Proyecto a medida",
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

  it("muestra cotas vacías cuando no llegan dimensiones", () => {
    const svg = generateComponentSVG({
      tipo: "Otro",
      ancho: null,
      alto: null,
    });

    expect(svg).toContain("— mm");
  });

  it("usa más área útil para que el componente sea legible en pantalla", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: null,
      alto: null,
    });
    const frame = getPrimaryFrameSize(svg);

    expect(frame.width).toBeGreaterThanOrEqual(200);
    expect(frame.height).toBeGreaterThanOrEqual(180);
  });

  it("no contiene variables de color de marca ni CSS dinámico", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
    });

    expect(svg).not.toContain("var(--brand");
    expect(svg).not.toContain("--brand");
  });

  it("aplica la paleta derivada cuando se entrega colorHex", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
      colorHex: "#b87333",
    });

    expect(svg).toContain("#a6682e");
    expect(svg).toContain("#6e451f");
    expect(svg).toContain('fill="rgba(220,234,247,0.86)"');
  });

  it("usa una variante pdf sin encabezado decorativo y con cotas reforzadas", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 2869,
      alto: 2100,
      variant: "pdf",
    });

    expect(svg).not.toContain("SISTEMA ESTÁNDAR");
    expect(svg).not.toContain("VISTA INTERIOR REFERENCIAL");
    expect(svg).toContain('font-size="9.8"');
  });

  it("resuelve el sistema desde referencia cuando no viene sistema explícito", () => {
    const corredera = generateComponentSVG({
      tipo: "Ventana",
      referencia: "Corredera",
      ancho: 800,
      alto: 1500,
    });

    const abatible = generateComponentSVG({
      tipo: "Ventana",
      referencia: "Abatible",
      ancho: 800,
      alto: 1800,
    });

    const oscilobatiente = generateComponentSVG({
      tipo: "Ventana",
      referencia: "Oscilobatiente",
      ancho: 800,
      alto: 1800,
    });

    expect(corredera).toContain('stroke-linecap="round"');
    expect(corredera).not.toContain('stroke-dasharray="5,3"');
    expect(abatible).toContain('stroke-dasharray="5,3"');
    expect(oscilobatiente).not.toEqual(abatible);
    expect(oscilobatiente).not.toEqual(corredera);
    expect((oscilobatiente.match(/stroke-dasharray="5,3"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
