import { generateComponentSVG } from "@/utils/window-drawings";

function getPrimaryFrameSize(svg: string) {
  const match = svg.match(
    /<rect data-window-frame="outer" x="[^"]+" y="[^"]+" width="([^"]+)" height="([^"]+)" fill="none" stroke="[^"]+" stroke-width="[^"]+" rx="0"/
  );

  return {
    width: match ? Number(match[1]) : 0,
    height: match ? Number(match[2]) : 0,
  };
}

function getSvgHeight(svg: string) {
  const match = svg.match(/viewBox="0 0 [^"]+ ([^"]+)"/);

  return match ? Number(match[1]) : 0;
}

function getFirstFixedPanelY(svg: string) {
  const match = svg.match(
    /<g data-window-fixed-panel="true"><rect data-window-glass="true"[^>]* y="([^"]+)"/
  );

  return match ? Number(match[1]) : 0;
}

function getOuterAndFirstSashX(svg: string) {
  const outer = svg.match(/<rect data-window-frame="outer" x="([^"]+)"/);
  const sash = svg.match(/<rect data-window-sash="true"[^>]* x="([^"]+)"/);

  return {
    outerX: outer ? Number(outer[1]) : 0,
    sashX: sash ? Number(sash[1]) : 0,
  };
}

function getBowFrontWidths(svg: string) {
  return [...svg.matchAll(/data-bow-front-width="([^"]+)"/g)].map((match) => Number(match[1]));
}

function getUniqueNumbers(values: number[]) {
  return [...new Set(values.map((value) => Math.round(value * 10) / 10))];
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
      maxH: 260,
    });

    expect(svg).toContain("1200 mm");
    expect(svg).toContain("1500 mm");
    expect(svg).not.toMatch(/<text x="[0-9]" y="/);
    expect(svg).not.toMatch(/rotate\(-90 3 /);
    expect(svg).toContain('paint-order="stroke fill"');
  });

  it("dibuja cubierta de mesa circular con un circulo y cota de diametro", () => {
    const svg = generateComponentSVG({
      tipo: "Cubierta de mesa",
      sistema: "Circular",
      ancho: 900,
      alto: 900,
      variant: "pdf",
      maxW: 470,
      maxH: 260,
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
      maxH: 260,
    });

    const glass = svg.match(
      /<rect x="(\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)" width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)" fill="rgba\(220,234,247,0\.86\)"/
    );
    const dimV = svg.match(
      /x1="32" y1="(\d+(?:\.\d+)?)" x2="32" y2="(\d+(?:\.\d+)?)" stroke="#999999"/
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

  it("usa gris aluminio natural como paleta visual default de ventanas", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
      colorHex: "#a8a8a8",
    });

    expect(svg).toContain("#6B7280");
    expect(svg).toContain("#5F6670");
    expect(svg).toContain('fill="#DCEAF7"');
    expect(svg).not.toContain("#343A40");
    expect(svg).not.toContain("#A8A8A8");
  });

  it("respeta colores seleccionados en ventanas sin limitarse al negro", () => {
    const blanco = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
      colorHex: "#ffffff",
    });
    const titanio = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
      colorHex: "#7d8791",
    });
    const madera = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
      colorHex: "#8b5e3c",
    });

    expect(blanco).toContain("#FFFFFF");
    expect(titanio).toContain("#7D8791");
    expect(madera).toContain("#8B5E3C");
  });

  it("muestra perfiles negros solo cuando la ventana recibe negro explicito", () => {
    const defaultWindow = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
    });
    const blackWindow = generateComponentSVG({
      tipo: "Ventana",
      ancho: 1200,
      alto: 1000,
      colorHex: "#2a2a2a",
    });

    expect(defaultWindow).toContain("#6B7280");
    expect(defaultWindow).not.toContain("#2A2A2A");
    expect(blackWindow).toContain("#2A2A2A");
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

    expect(corredera).toContain('data-window-sliding-sash="true"');
    expect(corredera).toContain('data-window-meeting-profile="true"');
    expect(corredera).not.toContain('stroke-dasharray="5,3"');
    expect(abatible).toContain('data-window-swing-arc="true"');
    expect(abatible).toContain('data-window-hinge="true"');
    expect(oscilobatiente).toContain('data-window-tilt-indicator="true"');
    expect(oscilobatiente).not.toEqual(abatible);
    expect(oscilobatiente).not.toEqual(corredera);
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
    expect((dosHojas.match(/data-window-glass="true"/g) ?? []).length).toBe(2);
    expect((unaHoja.match(/data-window-glass="true"/g) ?? []).length).toBe(1);
  });

  it("dibuja shower door con perfiles rectos y composiciones diferenciadas", () => {
    const corredera = generateComponentSVG({
      tipo: "Shower door",
      sistema: "Corredera",
      configuracion: "Frontal",
      sheetScheme: "2 hojas correderas",
      ancho: 1400,
      alto: 1900,
    });
    const batiente = generateComponentSVG({
      tipo: "Shower door",
      sistema: "Batiente",
      configuracion: "Esquinero",
      sheetScheme: "2 puertas al vértice",
      ancho: 1400,
      alto: 1900,
    });
    const walkIn = generateComponentSVG({
      tipo: "Shower door",
      sistema: "Fijo / Walk-in",
      configuracion: "Frontal",
      sheetScheme: "1 paño fijo",
      ancho: 900,
      alto: 1900,
    });
    const showerGroup = corredera.match(/<g data-shower-door="true"[\s\S]*?<\/g>/)?.[0] ?? "";

    expect(corredera).toContain('data-shower-system="corredera"');
    expect(corredera).toContain('data-shower-config="frontal"');
    expect(corredera).toContain('data-shower-composition="2 hojas correderas"');
    expect(batiente).toContain('data-shower-system="batiente"');
    expect(walkIn).toContain('data-shower-system="fijo walk in"');
    expect(corredera).not.toEqual(batiente);
    expect(corredera).not.toEqual(walkIn);
    expect(batiente).not.toEqual(walkIn);
    expect(showerGroup).not.toContain('stroke-linecap="round"');
    expect(showerGroup).not.toMatch(/rx="(?!0")/);
    expect(showerGroup).toMatch(/data-shower-frame="outer"[^>]*stroke-width="5(?:\.\d+)?"/);
  });

  it("usa bordes tipo shower en todos los sistemas de cierre terraza", () => {
    const sistemas = ["Corredera", "Plegable", "Fijo"];

    sistemas.forEach((sistema) => {
      const svg = generateComponentSVG({
        tipo: "Cierre terraza/logia",
        sistema,
        ancho: 2500,
        alto: 1400,
        variant: "pdf",
      });
      const cierreGroup = svg.match(/data-cierre-frame="outer"[\s\S]*?(?:data-cierre-profile|<\/g>|<\/svg>)/)?.[0] ?? "";

      expect(svg).toContain('data-cierre-frame="outer"');
      expect(svg).toContain('rx="0"');
      expect(svg).toContain('stroke-linejoin="miter"');
      expect(svg).not.toContain('data-cierre-frame="outer" rx="0.5"');
      expect(cierreGroup).toMatch(/stroke-width="6\.8"/);
    });
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

    expect((ventanaDosHojas.match(/data-window-glass="true"/g) ?? []).length).toBe(2);
    expect((ventanaUnaHoja.match(/data-window-glass="true"/g) ?? []).length).toBe(1);
  });

  it("estandariza ventanas con marco robusto recto, canal interior y vidrio tecnico", () => {
    const sistemas = [
      "Corredera",
      "Fija",
      "Proyectante",
      "Abatible",
      "Oscilobatiente",
      "Guillotina",
      "Celosía",
      "Bow Window",
    ];

    sistemas.forEach((sistema) => {
      const svg = generateComponentSVG({
        tipo: "Ventana",
        sistema,
        ancho: 1200,
        alto: 1100,
      });

      expect(svg).toContain("#6B7280");
      expect(svg).toContain("#DCEAF7");
      if (sistema !== "Bow Window") {
        expect(svg).toContain('rx="0"');
      }
      expect(svg).not.toMatch(/data-window-(?:glass|sash|frame)[^>]*rx="(?!0")/);
      expect(svg).not.toMatch(/data-window-frame="outer"[^>]*stroke-linecap="round"/);
    });
  });

  it("mantiene las hojas cercanas al marco exterior para evitar caja interna separada", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Corredera",
      sheetScheme: "2 hojas",
      ancho: 1200,
      alto: 1000,
    });
    const { outerX, sashX } = getOuterAndFirstSashX(svg);

    expect(sashX - outerX).toBeLessThanOrEqual(5);
    expect((svg.match(/data-window-meeting-profile="true"/g) ?? []).length).toBe(2);
  });

  it("renderiza correderas de 4 hojas desde metadata comercial del esquema", () => {
    const cuatroHojas = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Corredera",
      sheetScheme: "4 hojas",
      sheetVariant: "2 móviles + 2 fijas",
      ancho: 2400,
      alto: 1200,
      variant: "pdf",
    });

    expect((cuatroHojas.match(/data-window-glass="true"/g) ?? []).length).toBe(4);
    expect((cuatroHojas.match(/data-window-fixed-panel="true"/g) ?? []).length).toBe(2);
    expect((cuatroHojas.match(/data-window-sliding-sash="true"/g) ?? []).length).toBe(2);
  });

  it("diferencia composiciones de corredera de 3 hojas en el preview", () => {
    const base = {
      tipo: "Ventana",
      sistema: "Corredera",
      sheetScheme: "3 hojas",
      ancho: 1800,
      alto: 1200,
    };

    const fijaCentral = generateComponentSVG({
      ...base,
      sheetVariant: "2 móviles + 1 fija",
    });
    const fijasLaterales = generateComponentSVG({
      ...base,
      sheetVariant: "1 móvil + 2 fijas",
    });
    const todasMoviles = generateComponentSVG({
      ...base,
      sheetVariant: "3 móviles",
    });

    expect((fijaCentral.match(/data-window-fixed-panel="true"/g) ?? []).length).toBe(1);
    expect((fijasLaterales.match(/data-window-fixed-panel="true"/g) ?? []).length).toBe(2);
    expect((todasMoviles.match(/data-window-fixed-panel="true"/g) ?? []).length).toBe(0);
    expect(fijaCentral).not.toEqual(fijasLaterales);
  });

  it("dibuja proyectante con fijo como dos paños verticales y no como dos proyectantes", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Proyectante",
      hojasBase: 2,
      sheetScheme: "Proyectante + fijo",
      ancho: 780,
      alto: 1020,
      variant: "pdf",
    });

    expect((svg.match(/data-window-fixed-panel="true"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-window-projection-indicator="true"/g) ?? []).length).toBe(3);
    expect(getFirstFixedPanelY(svg)).toBeGreaterThan(getSvgHeight(svg) / 2);
  });

  it("permite invertir proyectante con fijo superior", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Proyectante",
      hojasBase: 2,
      sheetScheme: "Proyectante abajo + fijo arriba",
      ancho: 780,
      alto: 1020,
      variant: "pdf",
    });

    expect((svg.match(/data-window-fixed-panel="true"/g) ?? []).length).toBe(1);
    expect(getFirstFixedPanelY(svg)).toBeLessThan(getSvgHeight(svg) / 2);
  });

  it("dibuja Bow Window como paños en arco desde metadata comercial", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Bow Window",
      configuracion: "Fija",
      sheetScheme: "5 paños fijos",
      ancho: 2200,
      alto: 1300,
      variant: "pdf",
    });

    expect((svg.match(/data-bow-pane="true"/g) ?? []).length).toBe(5);
    expect(svg).not.toContain(">FIJO</text>");
    expect(svg).not.toContain("angulo");
    expect(svg).not.toContain("perfil");
  });

  it("dibuja Bow Window con fijos laterales y corredera central de 2 hojas como 4 paños", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Bow Window",
      configuracion: "Corredera",
      sheetScheme: "Fijos laterales + corredera central 2 hojas",
      ancho: 1200,
      alto: 2000,
      variant: "pdf",
    });

    expect((svg.match(/data-bow-pane="true"/g) ?? []).length).toBe(4);
    expect((svg.match(/data-bow-role="fixed"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-bow-role="sliding-left"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-bow-role="sliding-right"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-bow-zone="side-left"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-bow-zone="side-right"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-bow-zone="front"/g) ?? []).length).toBe(2);
    expect(getUniqueNumbers(getBowFrontWidths(svg))).toHaveLength(1);
  });

  it("dibuja Bow Window corredera con fijo lateral derecho o izquierdo", () => {
    const derecho = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Bow Window",
      configuracion: "Corredera",
      sheetScheme: "Corredera + fijo derecho",
      ancho: 1600,
      alto: 1200,
      variant: "pdf",
    });
    const izquierdo = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Bow Window",
      configuracion: "Corredera",
      sheetScheme: "Corredera + fijo izquierdo",
      ancho: 1600,
      alto: 1200,
      variant: "pdf",
    });

    expect((derecho.match(/data-bow-pane="true"/g) ?? []).length).toBe(3);
    expect((izquierdo.match(/data-bow-pane="true"/g) ?? []).length).toBe(3);
    expect((derecho.match(/data-bow-role="fixed"/g) ?? []).length).toBe(1);
    expect((izquierdo.match(/data-bow-role="fixed"/g) ?? []).length).toBe(1);
    expect((derecho.match(/data-bow-zone="side-right"/g) ?? []).length).toBe(1);
    expect((derecho.match(/data-bow-zone="side-left"/g) ?? []).length).toBe(0);
    expect((izquierdo.match(/data-bow-zone="side-left"/g) ?? []).length).toBe(1);
    expect((izquierdo.match(/data-bow-zone="side-right"/g) ?? []).length).toBe(0);
    expect((derecho.match(/data-bow-zone="front"/g) ?? []).length).toBe(2);
    expect((izquierdo.match(/data-bow-zone="front"/g) ?? []).length).toBe(2);
    expect(getUniqueNumbers(getBowFrontWidths(derecho))).toHaveLength(1);
    expect(getUniqueNumbers(getBowFrontWidths(izquierdo))).toHaveLength(1);
  });

  it("dibuja Bow Window proyectante con fijo central y proyectantes laterales distinto a proyectante central", () => {
    const fijoCentral = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Bow Window",
      configuracion: "Proyectante",
      sheetScheme: "Fijo central + proyectantes laterales",
      ancho: 1600,
      alto: 1200,
      variant: "pdf",
    });
    const proyectanteCentral = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Bow Window",
      configuracion: "Proyectante",
      sheetScheme: "Fijos laterales + proyectante central",
      ancho: 1600,
      alto: 1200,
      variant: "pdf",
    });

    expect(fijoCentral).not.toEqual(proyectanteCentral);
    expect((fijoCentral.match(/data-bow-role="projected"/g) ?? []).length).toBe(2);
    expect((fijoCentral.match(/data-bow-role="fixed"/g) ?? []).length).toBe(1);
    expect((proyectanteCentral.match(/data-bow-role="projected"/g) ?? []).length).toBe(1);
    expect((proyectanteCentral.match(/data-bow-role="fixed"/g) ?? []).length).toBe(2);
    expect((proyectanteCentral.match(/data-bow-zone="side-left"/g) ?? []).length).toBe(1);
    expect((proyectanteCentral.match(/data-bow-zone="side-right"/g) ?? []).length).toBe(1);
  });

  it("dibuja Bow Window con corredera central y panos fijos sin agrandar hojas frontales", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Bow Window",
      configuracion: "Corredera",
      sheetScheme: "Corredera central + panos fijos",
      ancho: 2200,
      alto: 1200,
      variant: "pdf",
    });

    expect((svg.match(/data-bow-pane="true"/g) ?? []).length).toBe(5);
    expect((svg.match(/data-bow-zone="side-left"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-bow-zone="side-right"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-bow-zone="front"/g) ?? []).length).toBe(3);
    expect((svg.match(/data-bow-role="fixed"/g) ?? []).length).toBe(3);
    expect((svg.match(/data-bow-role="sliding-left"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-bow-role="sliding-right"/g) ?? []).length).toBe(1);
    expect(getUniqueNumbers(getBowFrontWidths(svg))).toHaveLength(1);
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

    expect((personalizada.match(/data-window-glass="true"/g) ?? []).length).toBe(3);
  });

  it("dibuja guillotina como dos hojas apiladas sin division vertical", () => {
    const svg = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Guillotina",
      sheetScheme: "Guillotina doble",
      ancho: 900,
      alto: 1600,
      variant: "pdf",
    });

    expect((svg.match(/data-window-glass="true"/g) ?? []).length).toBe(2);
    expect(svg).toContain('data-guillotina-divider="horizontal"');
    expect(svg).not.toContain('data-guillotina-divider="vertical"');
  });

  it("dibuja celosia con lamas horizontales y paño fijo inferior opcional", () => {
    const completa = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Celosía",
      sheetScheme: "Celosía completa",
      ancho: 900,
      alto: 1200,
      variant: "pdf",
    });
    const conFijo = generateComponentSVG({
      tipo: "Ventana",
      sistema: "Celosía",
      sheetScheme: "Celosía con paño fijo inferior",
      ancho: 900,
      alto: 1200,
      variant: "pdf",
    });

    expect((completa.match(/data-celosia-lama="true"/g) ?? []).length).toBe(6);
    expect((conFijo.match(/data-celosia-lama="true"/g) ?? []).length).toBe(4);
    expect((conFijo.match(/fill="#DCEAF7"/g) ?? []).length).toBe(5);
    expect(completa).not.toContain('data-bow-pane="true"');
  });

  it("dibuja puerta abatible desde una base visual comun", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Abatible",
      configuracion: "1 hoja",
      ancho: 900,
      alto: 2100,
      variant: "pdf",
    });

    expect(svg).toContain('data-door-abatible-base="true"');
    expect(svg).toContain('data-door-frame="outer"');
    expect(svg).toContain('data-door-swing-leaf="true"');
    expect(svg).toContain('data-door-handle="true"');
    expect(svg).toContain('data-door-open-projection="true"');
    expect(svg).toContain('data-door-opening-arrow="true"');
    expect(svg).toContain('data-door-aluminum-fill="true"');
    expect(svg).toContain('data-door-swing-aluminum-fill="true"');
    expect(svg).toContain('stroke="#1E88FF"');
    expect(svg).toContain('fill="#DCEAF7"');
    expect(svg).toContain('rx="0"');
  });

  it("dibuja palillo horizontal y mantiene negro solido en todo el perfil de puerta", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Abatible",
      configuracion: "1 hoja",
      ancho: 750,
      alto: 2100,
      colorHex: "#2a2a2a",
      palilloEnabled: true,
      palilloType: "1 horizontal",
      variant: "pdf",
    });

    expect(svg).toMatch(
      /data-door-palillo="true"[^>]*stroke="#2a2a2a"[^>]*stroke-width="2\.2"/
    );
    expect(svg).toContain('data-door-palillo-ratio="0.6"');
    expect(svg).toContain('data-door-handle-clearance="true"');
    expect(svg).toContain('data-door-aluminum-fill="true"');
    expect(svg).not.toMatch(/data-door-(?:aluminum|swing)[^>]*opacity=/);
    expect(svg).not.toContain('stroke="#262626"');
  });

  it("aplica la base comun a todas las variantes abatibles de puerta", () => {
    const configuraciones = [
      "1 hoja",
      "2 hojas / puerta doble",
      "2 hojas + fijo superior",
      "4 hojas abatibles",
      "1 hoja + fijo lateral",
      "2 hojas + fijo lateral",
      "2 hojas + 2 fijos laterales",
      "Con fijo superior",
      "Con fijo lateral + fijo superior",
    ];

    configuraciones.forEach((configuracion) => {
      const svg = generateComponentSVG({
        tipo: "Puerta",
        sistema: "Abatible",
        configuracion,
        ancho: 1400,
        alto: 2100,
        variant: "pdf",
      });

      expect(svg).toContain('data-door-abatible-base="true"');
      expect(svg).toContain('data-door-frame="outer"');
      expect(svg).toContain('data-door-swing-leaf="true"');
      expect(svg).toContain('data-door-handle="true"');
      expect(svg).toContain('data-door-opening-arrow="true"');
    });
  });

  it("mantiene panos fijos de puerta abatible sin manilla ni flecha propia", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Abatible",
      configuracion: "Con fijo lateral + fijo superior",
      ancho: 1400,
      alto: 2100,
      variant: "pdf",
    });

    expect((svg.match(/data-door-fixed-panel="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-handle="true"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-door-opening-arrow="true"/g) ?? []).length).toBe(1);
  });

  it("usa la base abatible aunque no venga configuracion de puerta", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Abatible",
      ancho: 900,
      alto: 2100,
      variant: "pdf",
    });

    expect(svg).toContain('data-door-abatible-base="true"');
    expect(svg).toContain('data-door-config="1_hoja"');
  });

  it("mantiene puerta abatible de 4 hojas legible y sin exceso de manillas", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Abatible",
      configuracion: "4 hojas abatibles",
      ancho: 900,
      alto: 2100,
      variant: "pdf",
    });
    const frameWidth = Number(svg.match(/data-door-frame="outer"[^>]*\swidth="([^"]+)"/)?.[1] ?? 0);

    expect(frameWidth).toBeGreaterThanOrEqual(112);
    expect((svg.match(/data-door-swing-leaf="true"/g) ?? []).length).toBe(4);
    expect((svg.match(/data-door-handle="true"/g) ?? []).length).toBe(4);
    expect((svg.match(/data-door-opening-arrow="true"/g) ?? []).length).toBe(4);
    expect((svg.match(/data-door-open-projection="true"/g) ?? []).length).toBe(0);
  });

  it("dibuja 2 hojas abatibles con 2 fijos laterales como composicion propia", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Abatible",
      configuracion: "2 hojas + 2 fijos laterales",
      ancho: 1600,
      alto: 2100,
      colorHex: "#8B5E3C",
      variant: "pdf",
    });

    expect(svg).toContain('data-door-config="2_hojas_2_fijos_laterales"');
    expect(svg).toContain("#8B5E3C");
    expect((svg.match(/data-door-fixed-panel="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-swing-leaf="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-handle="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-opening-arrow="true"/g) ?? []).length).toBe(2);
  });

  it("dibuja puerta abatible de 2 hojas con fijo superior", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Abatible",
      configuracion: "2 hojas + fijo superior",
      ancho: 1600,
      alto: 2100,
      colorHex: "#8B5E3C",
      variant: "pdf",
    });

    expect(svg).toContain('data-door-config="2_hojas_fijo_superior"');
    expect(svg).toContain("#8B5E3C");
    expect((svg.match(/data-door-fixed-panel="true"/g) ?? []).length).toBe(1);
    expect((svg.match(/data-door-swing-leaf="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-handle="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-opening-arrow="true"/g) ?? []).length).toBe(2);
  });

  it("dibuja puerta corredera de 2 hojas desde base comun sin hueco entre vidrio y aluminio", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Corredera",
      configuracion: "2 hojas moviles / encuentro central",
      ancho: 1600,
      alto: 2100,
      colorHex: "#8B5E3C",
      variant: "pdf",
    });
    const sashX = Number(svg.match(/data-door-sliding-sash="true"[^>]*\sx="([^"]+)"/)?.[1] ?? 0);
    const glassX = Number(svg.match(/data-door-glass="true"[^>]*\sx="([^"]+)"/)?.[1] ?? 0);

    expect(svg).toContain('data-door-sliding-base="true"');
    expect(svg).toContain('data-door-config="2_hojas_moviles_encuentro_central"');
    expect(svg).toContain("#8B5E3C");
    expect((svg.match(/data-door-sliding-leaf="sliding"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-sliding-handle="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-sliding-arrow="true"/g) ?? []).length).toBe(2);
    expect(glassX - sashX).toBeLessThanOrEqual(3.5);
    expect((svg.match(/data-door-sliding-aluminum-band=/g) ?? []).length).toBe(4);
    expect(svg).toContain('data-door-sliding-aluminum-fill="true"');
  });

  it("aplica base comun a todas las configuraciones correderas de puerta", () => {
    const configuraciones = [
      "1 hoja movil",
      "2 hojas: 1 fija + 1 movil",
      "2 hojas moviles / encuentro central",
      "4 hojas: 2 fijas + 2 moviles",
      "4 hojas moviles",
      "3 hojas",
      "Doble riel",
      "Triple riel",
      "Elevadora corredera / HS",
    ];

    configuraciones.forEach((configuracion) => {
      const svg = generateComponentSVG({
        tipo: "Puerta",
        sistema: "Corredera",
        configuracion,
        ancho: 1800,
        alto: 2100,
        variant: "pdf",
      });

      expect(svg).toContain('data-door-sliding-base="true"');
      expect(svg).toContain('data-door-frame="outer"');
      expect(svg).toContain('data-door-sliding-sash="true"');
      expect(svg).toContain('data-door-sliding-track="top"');
    });
  });

  it("mantiene panos fijos de puerta corredera sin manillas ni flechas", () => {
    const svg = generateComponentSVG({
      tipo: "Puerta",
      sistema: "Corredera",
      configuracion: "4 hojas: 2 fijas + 2 moviles",
      ancho: 2200,
      alto: 2100,
      variant: "pdf",
    });

    expect((svg.match(/data-door-sliding-leaf="fixed"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-sliding-leaf="sliding"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-sliding-handle="true"/g) ?? []).length).toBe(2);
    expect((svg.match(/data-door-sliding-arrow="true"/g) ?? []).length).toBe(2);
  });

  it("aplica la misma regla de marco a pivotante plegable vaiven templado colgante y automatica", () => {
    const configuraciones = [
      "1 hoja pivotante",
      "Pivotante + fijo lateral",
      "Pivotante doble",
      "2 hojas plegables",
      "3 hojas plegables",
      "4 hojas plegables",
      "1 hoja vaiven",
      "2 hojas vaiven",
      "Vidrio templado vaiven",
      "1 hoja vidrio templado",
      "Doble hoja vidrio templado",
      "Con quicio / pivote",
      "Con tirador",
      "1 hoja colgante",
      "2 hojas colgantes",
      "Vidrio templado colgante",
      "1 hoja automatica",
      "2 hojas automaticas",
      "Corredera automatica",
    ];

    configuraciones.forEach((configuracion) => {
      const svg = generateComponentSVG({
        tipo: "Puerta",
        sistema: configuracion,
        configuracion,
        ancho: 1400,
        alto: 2100,
        colorHex: "#ffffff",
        variant: "pdf",
      });

      expect(svg).toContain('data-door-unified-base="true"');
      expect(svg).toContain('data-door-frame="outer"');
      expect(svg).toContain('data-door-aluminum-fill="true"');
      expect(svg).toContain('data-door-general-aluminum-fill="true"');
      expect((svg.match(/data-door-aluminum-band=/g) ?? []).length).toBe(4);
      expect(svg).toContain("#ffffff");
    });
  });
});
