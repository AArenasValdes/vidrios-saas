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
      "Cubierta de mesa",
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

  it("muestra ancho y alto completos en cubierta de mesa sin recortar cotas", () => {
    const svg = generateComponentSVG({
      tipo: "Cubierta de mesa",
      ancho: 1200,
      alto: 1500,
      variant: "pdf",
      maxW: 470,
      maxH: 210,
    });

    expect(svg).toContain("1200 mm");
    expect(svg).toContain("1500 mm");
    expect(svg).not.toMatch(/<text x="[0-9]" y="/);
    expect(svg).not.toMatch(/rotate\(-90 3 /);
  });

  it("dibuja cubierta de mesa circular con un circulo y cota de diametro", () => {
    const svg = generateComponentSVG({
      tipo: "Cubierta de mesa",
      sistema: "Circular",
      ancho: 900,
      alto: 900,
      variant: "pdf",
      maxW: 470,
      maxH: 210,
    });

    expect(svg).toContain("<circle");
    expect(svg).toContain("900 mm");
    expect(svg).not.toContain('x1="30" y1=');
  });

  it("dibuja cubierta de mesa con proporción acorde a ancho y alto", () => {
    const svg = generateComponentSVG({
      tipo: "Cubierta de mesa",
      ancho: 700,
      alto: 1900,
      variant: "pdf",
      maxW: 470,
      maxH: 210,
    });

    const glass = svg.match(
      /<rect x="(\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)" width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)" fill="rgba\(220,234,247,0\.86\)"/
    );
    const dimV = svg.match(
      /x1="30" y1="(\d+(?:\.\d+)?)" x2="30" y2="(\d+(?:\.\d+)?)" stroke="#999999"/
    );

    expect(glass).not.toBeNull();
    expect(dimV).not.toBeNull();

    const glassY = Number(glass?.[2]);
    const glassW = Number(glass?.[3]);
    const glassH = Number(glass?.[4]);
    const dimSpan = Number(dimV?.[2]) - Number(dimV?.[1]);

    expect(glassH).toBeGreaterThan(glassW);
    expect(glassY).toBe(Number(dimV?.[1]));
    expect(glassH).toBeCloseTo(dimSpan, 0);
    expect(glassW / glassH).toBeCloseTo(700 / 1900, 1);
  });

  it("muestra cotas vacías cuando no llegan dimensiones", () => {
    const svg = generateComponentSVG({
      tipo: "Otro",
      ancho: null,
      alto: null,
    });

    expect(svg).toContain("— mm");
  });

  it("dibuja espejo dividido vertical sin crear items separados", () => {
    const svg = generateComponentSVG({
      tipo: "Espejo",
      sistema: "Muro",
      ancho: 3000,
      alto: 870,
      mirrorFormat: "divided",
      mirrorPaneCount: 6,
      mirrorPaneDirection: "vertical",
      mirrorInteriorLine: "fine",
    });

    expect((svg.match(/data-mirror-pane-divider="true"/g) ?? []).length).toBe(5);
    expect(svg).toContain('data-mirror-pane-divider="true"');
    expect(svg).toMatch(/data-mirror-pane-divider="true"[^>]*stroke-dasharray="/);
    expect(svg).toMatch(/data-mirror-pane-divider="true"[^>]*stroke-linecap="round"/);
    expect(svg).toContain("3000 mm");
    expect(svg).toContain("870 mm");
  });

  it("dibuja espejo dividido horizontal con junta marcada", () => {
    const svg = generateComponentSVG({
      tipo: "Espejo",
      sistema: "Muro",
      ancho: 900,
      alto: 1800,
      mirrorFormat: "divided",
      mirrorPaneCount: 3,
      mirrorPaneDirection: "horizontal",
      mirrorInteriorLine: "marked",
    });

    expect((svg.match(/data-mirror-pane-divider="true"/g) ?? []).length).toBe(2);
    expect(svg).toMatch(/data-mirror-pane-divider="true"[^>]*stroke-dasharray="12,7"/);
    expect(svg).toContain('opacity="0.82"');
  });

  it("usa trazo discontinuo mas visible en espejo dividido para PDF", () => {
    const svg = generateComponentSVG({
      tipo: "Espejo",
      sistema: "Muro",
      ancho: 1200,
      alto: 1500,
      variant: "pdf",
      mirrorFormat: "divided",
      mirrorPaneCount: 2,
      mirrorPaneDirection: "vertical",
      mirrorInteriorLine: "fine",
    });

    expect(svg).toMatch(/data-mirror-pane-divider="true"[^>]*stroke-dasharray="11,9"/);
    expect(svg).toMatch(/data-mirror-pane-divider="true"[^>]*stroke-width="2\.4"/);
  });

  it("mantiene espejo normal sin divisiones interiores", () => {
    const svg = generateComponentSVG({
      tipo: "Espejo",
      sistema: "Muro",
      ancho: 900,
      alto: 1800,
    });

    expect(svg).not.toContain('data-mirror-pane-divider="true"');
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
    expect(svg).toContain('font-size="12"');
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
  it("diferencia ventana de 2 hojas y ventana de 1 hoja para el mismo sistema", () => {
    const dosHojas = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Oscilobatiente",
      hojasBase: 2,
      ancho: 1980,
      alto: 1900,
    });

    const unaHoja = generateComponentSVG({
      tipo: "Ventana 1 hoja",
      sistema: "Oscilobatiente",
      hojasBase: 1,
      ancho: 800,
      alto: 1800,
    });

    expect(dosHojas).not.toEqual(unaHoja);
    expect((dosHojas.match(/fill="rgba\(220,234,247,0.86\)"/g) ?? []).length).toBe(2);
    expect((unaHoja.match(/fill="rgba\(220,234,247,0.86\)"/g) ?? []).length).toBe(1);
  });

  it("usa la semantica del tipo para mostrar la tarjeta base correcta en paso 2", () => {
    const ventanaDosHojas = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1500,
    });
    const ventanaUnaHoja = generateComponentSVG({
      tipo: "Ventana 1 hoja",
      ancho: 800,
      alto: 1500,
    });

    expect((ventanaDosHojas.match(/fill="rgba\(220,234,247,0.86\)"/g) ?? []).length).toBe(2);
    expect((ventanaUnaHoja.match(/fill="rgba\(220,234,247,0.86\)"/g) ?? []).length).toBe(1);
  });

  it("renderiza correderas de 4 hojas desde metadata comercial del esquema", () => {
    const cuatroHojas = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Corredera",
      sheetScheme: "4 hojas",
      sheetVariant: "Laterales fijas + centrales moviles",
      ancho: 2400,
      alto: 1200,
      variant: "pdf",
    });

    expect((cuatroHojas.match(/fill="rgba\(220,234,247,0.86\)"/g) ?? []).length).toBe(4);
    expect((cuatroHojas.match(/opacity="0.58"/g) ?? []).length).toBe(4);
  });

  it("usa la descripcion personalizada para inferir cantidad de hojas cuando corresponde", () => {
    const personalizada = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Corredera",
      sheetScheme: "Personalizado",
      customSchemeDescription: "3 hojas, la del medio fija",
      isCustomScheme: true,
      ancho: 2100,
      alto: 1200,
      variant: "pdf",
    });

    expect((personalizada.match(/fill="rgba\(220,234,247,0.86\)"/g) ?? []).length).toBe(3);
  });
});
